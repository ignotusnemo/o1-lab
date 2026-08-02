import { readFile, readdir, stat } from "node:fs/promises";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { locales } from "./i18n.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ignored = new Set([".git", "content", "scripts", "node_modules"]);
const files = [];

async function walk(dir) {
  for (const name of await readdir(dir)) {
    if (ignored.has(name)) continue;
    const path = join(dir, name);
    const info = await stat(path);
    if (info.isDirectory()) await walk(path);
    else files.push(path);
  }
}

await walk(root);
const htmlFiles = files.filter((path) => path.endsWith(".html"));
const titles = new Map();
const errors = [];
const siteUrl = "https://lab.parano1d.org";
const expectedHreflangs = new Set([...locales.map((locale) => locale.hreflang), "x-default"]);

function pageIdentity(file) {
  const parts = relative(root, file).split(sep);
  const locale = locales.find((entry) => entry.code !== "en" && entry.code === parts[0]) ?? locales[0];
  if (locale.code !== "en") parts.shift();
  const tail = parts.join("/");
  const basePath = tail === "index.html"
    ? "/"
    : tail.endsWith("/index.html")
      ? `/${tail.slice(0, -"index.html".length)}`
      : `/${tail}`;
  const path = locale.code === "en" ? basePath : `/${locale.code}${basePath}`;
  return { locale, path };
}

function targetFor(href) {
  const clean = href.split(/[?#]/)[0];
  if (!clean || !clean.startsWith("/") || clean.startsWith("//")) return null;
  if (clean.endsWith("/")) return join(root, clean, "index.html");
  return join(root, clean);
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const { locale, path } = pageIdentity(file);
  const isNotFound = path.endsWith("/404.html") || path === "/404.html";
  const lang = html.match(/<html lang="([^"]+)"/)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const alternateLinks = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
  const alternateLanguages = new Set(alternateLinks.map((match) => match[1]));
  if (lang !== locale.htmlLang) errors.push(`${file}: expected html lang ${locale.htmlLang}, found ${lang ?? "none"}`);
  if (!title) errors.push(`${file}: missing title`);
  if (isNotFound) {
    if (!/<meta name="robots" content="noindex,follow">/.test(html)) errors.push(`${file}: missing noindex directive`);
    if (canonical) errors.push(`${file}: 404 page must not declare a canonical URL`);
    if (alternateLinks.length) errors.push(`${file}: 404 page must not declare language alternates`);
    if (/<meta property="og:|<meta name="twitter:|application\/ld\+json/.test(html)) errors.push(`${file}: 404 page exposes indexable social or structured metadata`);
  } else {
    if (canonical !== `${siteUrl}${path}`) errors.push(`${file}: invalid canonical ${canonical ?? "none"}`);
    for (const hreflang of expectedHreflangs) {
      if (!alternateLanguages.has(hreflang)) errors.push(`${file}: missing ${hreflang} alternate`);
    }
    if (alternateLanguages.size !== expectedHreflangs.size) errors.push(`${file}: unexpected language alternate`);
    const twitterCards = html.match(/<meta name="twitter:card"/g)?.length ?? 0;
    if (twitterCards !== 1) errors.push(`${file}: expected one twitter:card, found ${twitterCards}`);
    if (!/<meta property="og:image:alt" content="[^"]+">/.test(html)) errors.push(`${file}: missing Open Graph image alt text`);
    if (path.includes("/research/") && path !== "/research/" && !path.endsWith("/research/")) {
      const slug = path.split("/").filter(Boolean).at(-1);
      const expectedImage = `${siteUrl}/assets/og/${slug}.png`;
      if (!html.includes(`<meta property="og:image" content="${expectedImage}">`)) errors.push(`${file}: missing article-specific Open Graph image`);
      try { await stat(join(root, "assets", "og", `${slug}.png`)); } catch { errors.push(`${file}: missing article Open Graph asset assets/og/${slug}.png`); }
    }
  }
  if (title) {
    const titleKey = `${locale.code}:${title}`;
    if (titles.has(titleKey)) errors.push(`${file}: duplicate ${locale.code} title with ${titles.get(titleKey)}`);
    titles.set(titleKey, file);
  }
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const target = targetFor(match[1]);
    if (!target) continue;
    try { await stat(target); } catch { errors.push(`${file}: broken internal link ${match[1]}`); }
  }
}

const pagesPerLocale = new Map(locales.map((locale) => [locale.code, 0]));
for (const file of htmlFiles) {
  const { locale } = pageIdentity(file);
  pagesPerLocale.set(locale.code, pagesPerLocale.get(locale.code) + 1);
}
if (new Set(pagesPerLocale.values()).size !== 1) {
  errors.push(`localized page counts differ: ${[...pagesPerLocale].map(([code, count]) => `${code}=${count}`).join(", ")}`);
}

const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
if (/<changefreq>|<priority>/.test(sitemap)) {
  errors.push("sitemap.xml: obsolete changefreq or priority field present");
}
const indexablePageCount = htmlFiles.length - locales.length;
const lastmodCount = sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)?.length ?? 0;
if (lastmodCount !== indexablePageCount) {
  errors.push(`sitemap.xml: expected ${indexablePageCount} lastmod values, found ${lastmodCount}`);
}
if (/404\.html/.test(sitemap)) errors.push("sitemap.xml: 404 page must not be listed");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML pages and ${files.length} static files`);
