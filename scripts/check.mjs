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
  const lang = html.match(/<html lang="([^"]+)"/)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const alternateLinks = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
  const alternateLanguages = new Set(alternateLinks.map((match) => match[1]));
  if (lang !== locale.htmlLang) errors.push(`${file}: expected html lang ${locale.htmlLang}, found ${lang ?? "none"}`);
  if (!title) errors.push(`${file}: missing title`);
  if (canonical !== `${siteUrl}${path}`) errors.push(`${file}: invalid canonical ${canonical ?? "none"}`);
  for (const hreflang of expectedHreflangs) {
    if (!alternateLanguages.has(hreflang)) errors.push(`${file}: missing ${hreflang} alternate`);
  }
  if (alternateLanguages.size !== expectedHreflangs.size) errors.push(`${file}: unexpected language alternate`);
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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML pages and ${files.length} static files`);
