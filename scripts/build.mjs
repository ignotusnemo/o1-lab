import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import { artDiagrams } from "./art.mjs";
import { defaultLocale, locales, pathFor, ui } from "./i18n.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = "https://lab.parano1d.org";
const versionOf = (contents) => createHash("sha256").update(contents).digest("hex").slice(0, 12);
const [siteCssVersion, siteJsVersion] = await Promise.all([
  readFile(join(root, "assets/site.css")).then(versionOf),
  readFile(join(root, "assets/site.js")).then(versionOf)
]);
const baseData = JSON.parse(await readFile(join(root, "content/research.json"), "utf8"));

async function loadArticles(locale) {
  const overlays = locale.code === defaultLocale.code
    ? null
    : JSON.parse(await readFile(join(root, `content/i18n/${locale.code}/research.json`), "utf8"));

  if (overlays) {
    const missing = baseData.map((item) => item.slug).filter((slug) => !overlays[slug]);
    const unknown = Object.keys(overlays).filter((slug) => !baseData.some((item) => item.slug === slug));
    if (missing.length || unknown.length) {
      throw new Error(`Invalid ${locale.code} research metadata: missing=[${missing.join(", ")}], unknown=[${unknown.join(", ")}]`);
    }
  }

  const articles = await Promise.all(baseData.map(async (base) => {
    const overlay = overlays?.[base.slug];
    if (overlay?.evidence?.length !== undefined && overlay.evidence.length !== base.evidence.length) {
      throw new Error(`${locale.code}/${base.slug}: evidence translation count does not match source`);
    }
    const item = overlay
      ? {
          ...base,
          ...overlay,
          evidence: base.evidence.map((entry, index) => ({ ...entry, label: overlay.evidence[index] }))
        }
      : base;
    const sourcePath = locale.code === defaultLocale.code
      ? `content/research/${base.slug}.html`
      : `content/i18n/${locale.code}/research/${base.slug}.html`;
    const source = await readFile(join(root, sourcePath), "utf8");
    return { ...item, schemaType: base.kind === "Paper" ? "ScholarlyArticle" : "TechArticle", body: renderMath(source, sourcePath) };
  }));

  return articles.sort((a, b) => b.date.localeCompare(a.date));
}

const articleSets = new Map(await Promise.all(
  locales.map(async (locale) => [locale.code, await loadArticles(locale)])
));

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function githubIcon(className = "button-icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 .7C5.7.7.9 5.5.9 11.8c0 5 3.2 9.2 7.7 10.7.6.1.8-.3.8-.6v-2.2c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.7 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.6 0-1.2.4-2.3 1.1-3.1-.1-.3-.5-1.5.1-3 0 0 .9-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.7.1 3 .7.8 1.1 1.8 1.1 3.1 0 4.3-2.6 5.3-5.1 5.6.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.5-1.5 7.7-5.7 7.7-10.7C23.1 5.5 18.3.7 12 .7Z"/></svg>`;
}

function linkIcon(className = "share-icon share-icon--link") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
}

function checkIcon(className = "share-icon share-icon--check") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12.5 4.2 4.2L19 7"/></svg>`;
}

function xIcon(className = "share-icon share-icon--x") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
}

function isGithubUrl(href) {
  try {
    return new URL(href).hostname === "github.com";
  } catch {
    return false;
  }
}

function buttonContent(href, label) {
  return `${isGithubUrl(href) ? githubIcon() : ""}<span>${esc(label)}</span>`;
}

function externalLinksInNewTabs(html) {
  return html.replace(
    /<a\b([^>]*\bhref="https?:\/\/[^\"]+"[^>]*)>/gi,
    (_tag, attributes) => {
      const normalized = attributes
        .replace(/\s+target=("[^"]*"|'[^']*')/gi, "")
        .replace(/\s+rel=("[^"]*"|'[^']*')/gi, "");
      return `<a${normalized} target="_blank" rel="noopener noreferrer">`;
    }
  );
}

function renderMath(source, sourcePath) {
  const render = (tex, displayMode) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode,
        output: "htmlAndMathml",
        throwOnError: true,
        strict: "error",
        trust: false,
        macros: {
          "\\State": "\\mathsf{State}",
          "\\HistoryStep": "\\mathsf{HistoryStep}",
          "\\Parano": "\\mathsf{Parano1d}"
        }
      });
    } catch (error) {
      throw new Error(`Invalid TeX in ${sourcePath}: ${error.message}`, { cause: error });
    }
  };

  return source
    .replace(/<math-block>([\s\S]*?)<\/math-block>/g, (_, tex) =>
      `<div class="math-display">${render(tex, true)}</div>`
    )
    .replace(/<math-inline>([\s\S]*?)<\/math-inline>/g, (_, tex) =>
      `<span class="math-inline">${render(tex, false)}</span>`
    );
}

async function installKatexAssets() {
  const katexDist = join(root, "node_modules/katex/dist");
  const sourceFonts = join(katexDist, "fonts");
  const targetFonts = join(root, "assets/fonts");
  const targetCss = join(root, "assets/katex.min.css");

  const css = await readFile(join(katexDist, "katex.min.css"), "utf8");
  const woff2Only = css
    .replace(/,url\(fonts\/[^)]*\.woff\) format\("woff"\)/g, "")
    .replace(/,url\(fonts\/[^)]*\.ttf\) format\("truetype"\)/g, "");
  await writeFile(targetCss, woff2Only);

  await mkdir(targetFonts, { recursive: true });
  const existing = await readdir(targetFonts);
  await Promise.all(
    existing
      .filter((name) => name.startsWith("KaTeX_"))
      .map((name) => rm(join(targetFonts, name)))
  );

  const fonts = await readdir(sourceFonts);
  await Promise.all(
    fonts
      .filter((name) => name.endsWith(".woff2"))
      .map((name) => cp(join(sourceFonts, name), join(targetFonts, name)))
  );
}

function absolute(path) {
  return `${siteUrl}${path}`;
}

function formatDate(date, locale) {
  return new Intl.DateTimeFormat(locale.dateLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

function readingTime(html, locale) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").trim();
  if (locale.code === "zh") {
    const han = text.match(/[\p{Script=Han}]/gu)?.length ?? 0;
    const latinWords = text.match(/[A-Za-z0-9][A-Za-z0-9_.+′'/-]*/g)?.length ?? 0;
    return Math.max(1, Math.ceil((han + latinWords * 2) / 420));
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}


function artMarkup(kind, compact = false) {
  const diagram = artDiagrams[kind] ?? artDiagrams.frost;
  return `<div class="research-art art--${esc(kind)}${compact ? " research-art--compact" : ""}" aria-hidden="true">${diagram}</div>`;
}

function languageSwitcher(locale, basePath) {
  const t = ui[locale.code];
  return `<details class="language-switcher"><summary aria-label="${esc(t.languageMenu)}"><span>${esc(locale.shortLabel)}</span><span class="language-chevron" aria-hidden="true">⌄</span></summary><div class="language-menu" aria-label="${esc(t.language)}">${locales.map((target) => `<a href="${pathFor(target, basePath)}" lang="${target.htmlLang}" hreflang="${target.hreflang}"${target.code === locale.code ? ' aria-current="true"' : ""}><span>${esc(target.shortLabel)}</span><strong>${esc(target.label)}</strong></a>`).join("")}</div></details>`;
}

function header(active, locale, basePath) {
  const t = ui[locale.code];
  return `<header class="site-header">
    <a class="brand" href="${pathFor(locale, "/")}" aria-label="${esc(t.brandHome)}">
      <span class="brand-mark" aria-hidden="true">①</span>
      <span class="brand-copy"><strong>ParanO(1)d Lab</strong><small>${esc(t.brandSection)}</small></span>
    </a>
    <div class="header-controls">
      ${languageSwitcher(locale, basePath)}
      <nav class="site-nav" id="site-nav" aria-label="${esc(t.navLabel)}">
        <a${active === "latest" ? ' aria-current="page"' : ""} href="${pathFor(locale, "/")}#latest">${esc(t.navLatest)}</a>
        <a${active === "research" ? ' aria-current="page"' : ""} href="${pathFor(locale, "/research/")}">${esc(t.navResearch)}</a>
        <span class="nav-rule" aria-hidden="true"></span>
        <a href="https://docs.parano1d.org">${esc(t.navDocs)} <span aria-hidden="true">↗</span></a>
        <a href="https://parano1d.org">Parano1d <span aria-hidden="true">↗</span></a>
        <a class="nav-github" href="https://github.com/ignotusnemo/parano1d" aria-label="${esc(t.githubAria)}">${githubIcon("nav-github-icon")}<span>GitHub</span></a>
      </nav>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span></span><span></span></button>
    </div>
  </header>`;
}

function footer(locale) {
  const t = ui[locale.code];
  return `<footer class="site-footer">
    <div class="footer-brand">
      <span class="brand-mark" aria-hidden="true">①</span>
      <div><strong>ParanO(1)d Lab</strong><p>${esc(t.footerDescription)}</p></div>
    </div>
    <div class="footer-links">
      <div><strong>${esc(t.footerResearch)}</strong><a href="${pathFor(locale, "/research/")}">${esc(t.footerArchive)}</a><a href="${pathFor(locale, "/feed.xml")}">${esc(t.footerFeed)}</a></div>
      <div><strong>${esc(t.footerProject)}</strong><a href="https://parano1d.org">${esc(t.footerWebsite)}</a><a href="https://docs.parano1d.org">${esc(t.footerDocumentation)}</a><a href="https://github.com/ignotusnemo/parano1d">${esc(t.footerSource)}</a></div>
    </div>
    <div class="footer-bottom"><span>© 2026 ParanO(1)d Lab</span><span>lab.parano1d.org</span></div>
  </footer>`;
}

function jsonLd(value) {
  return `<script type="application/ld+json">${JSON.stringify(value).replaceAll("<", "\\u003c")}</script>`;
}

function compactDescription(value, locale) {
  const limit = locale.code === "zh" ? 82 : 160;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;

  const candidate = normalized.slice(0, limit + 1);
  const sentenceBoundary = Math.max(
    candidate.lastIndexOf("。"),
    candidate.lastIndexOf("！"),
    candidate.lastIndexOf("？"),
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf("! "),
    candidate.lastIndexOf("? ")
  );
  const minimumSentence = locale.code === "zh" ? 40 : 96;
  if (sentenceBoundary >= minimumSentence) {
    return candidate.slice(0, sentenceBoundary + 1).trim();
  }

  if (locale.code === "zh") return `${normalized.slice(0, limit - 1).trim()}…`;
  const wordBoundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, wordBoundary > 96 ? wordBoundary : limit - 1).trim()}…`;
}

function articleSeoTitle(item, locale) {
  const suffixLength = " · Parano1d Lab".length;
  const limit = locale.code === "zh" ? 42 : 65;
  return item.title.length + suffixLength <= limit ? item.title : item.shortTitle;
}

function shell({
  locale,
  title,
  description,
  basePath,
  body,
  active = "",
  type = "website",
  schema,
  article,
  imagePath = "/assets/og-lab-hero.png",
  imageAlt = title,
  indexable = true
}) {
  const t = ui[locale.code];
  const pagePath = pathFor(locale, basePath);
  const canonical = absolute(pagePath);
  const fullTitle = title === "Parano1d Lab" ? t.siteTitle : `${title} · Parano1d Lab`;
  const image = absolute(imagePath);
  const alternates = locales.map((target) => `<link rel="alternate" hreflang="${target.hreflang}" href="${absolute(pathFor(target, basePath))}">`).join("\n  ");
  const ogAlternates = locales.filter((target) => target.code !== locale.code).map((target) => `<meta property="og:locale:alternate" content="${target.ogLocale}">`).join("\n  ");
  const articleMeta = indexable && article
    ? `<meta property="article:published_time" content="${esc(article.date)}T00:00:00Z">
  <meta property="article:section" content="${esc(article.topic)}">
  ${article.authors.map((author) => `<meta property="article:author" content="${esc(author)}">`).join("\n  ")}`
    : "";
  const discoveryMeta = indexable
    ? `<link rel="canonical" href="${canonical}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${absolute(pathFor(defaultLocale, basePath))}">
  <link rel="alternate" type="application/rss+xml" title="${esc(t.siteTitle)}" href="${absolute(pathFor(locale, "/feed.xml"))}">`
    : `<meta name="robots" content="noindex,follow">`;
  const socialMeta = indexable
    ? `<meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${esc(t.siteTitle)}">
  <meta property="og:locale" content="${locale.ogLocale}">
  ${ogAlternates}
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(fullTitle)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="${esc(imageAlt)}">`
    : "";
  const structuredData = indexable
    ? jsonLd(schema ?? {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: t.siteTitle,
        url: canonical,
        description,
        inLanguage: locale.htmlLang
      })
    : "";
  const document = `<!doctype html>
<html lang="${locale.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f3f2ed">
  <meta name="color-scheme" content="light">
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="Parano1d Lab">
  <meta name="keywords" content="${esc(t.keywords)}">
  ${discoveryMeta}
  <link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png">
  <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  ${socialMeta}
  ${articleMeta}
  <title>${esc(fullTitle)}</title>
  <link rel="stylesheet" href="/assets/site.css?v=${siteCssVersion}">
  <link rel="stylesheet" href="/assets/katex.min.css">
  ${structuredData}
</head>
<body class="locale-${locale.code}">
  <a class="skip-link" href="#content">${esc(t.skip)}</a>
  <div class="page-shell">
    ${header(active, locale, basePath)}
    ${body}
    ${footer(locale)}
  </div>
  <script src="/assets/site.js?v=${siteJsVersion}" defer></script>
</body>
</html>`;
  return externalLinksInNewTabs(document.replace(/^[ \t]+$/gm, ""));
}

function articleCard(item, locale, { large = false } = {}) {
  const t = ui[locale.code];
  const href = pathFor(locale, `/research/${item.slug}/`);
  return `<article class="research-card${large ? " research-card--large" : ""}" data-topic="${esc(item.topic)}">
    <a class="card-art-link" href="${href}" tabindex="-1" aria-hidden="true">${artMarkup(item.art, true)}</a>
    <div class="card-body">
      <div class="card-meta"><span>${esc(item.kind)}</span><time datetime="${item.date}">${formatDate(item.date, locale)}</time></div>
      <h3><a href="${href}">${esc(item.title)}</a></h3>
      <p>${esc(item.dek)}</p>
      <div class="card-foot"><span>${readingTime(item.body, locale)} ${esc(t.minutesRead)}</span><a class="text-link" href="${href}">${esc(t.read)} <span aria-hidden="true">↗</span></a></div>
    </div>
  </article>`;
}

function homePage(locale, newestFirst) {
  const t = ui[locale.code];
  const latest = newestFirst[0];
  const remaining = newestFirst.slice(1, 7);
  const featured = newestFirst.filter((item) => item.featured).slice(0, 4);
  const body = `<main id="content">
    <section class="home-hero">
      <div class="hero-copy">
        <p class="eyebrow">${esc(t.homeEyebrow)}</p>
        <h1>${esc(t.homeTitle)}</h1>
        <p class="hero-lead">${esc(t.homeLead)}</p>
        <div class="hero-actions"><a class="button button--primary" href="#latest">${esc(t.latestResearch)}</a><a class="button button--quiet" href="${pathFor(locale, "/research/")}">${esc(t.openArchive)}</a></div>
      </div>
      <div class="hero-field" aria-hidden="true">
        <div class="field-label field-label--a">${esc(t.fieldCommit)}</div><div class="field-label field-label--b">${esc(t.fieldReduce)}</div><div class="field-label field-label--c">${esc(t.fieldVerify)}</div>
        <div class="field-plane field-plane--a"></div><div class="field-plane field-plane--b"></div><div class="field-plane field-plane--c"></div>
        <div class="field-mark">①</div>
      </div>
    </section>

    <section class="latest-section section" id="latest">
      <div class="section-heading"><div><p class="section-index">01 · ${esc(t.sectionLatest)}</p><h2>${esc(t.latestResearch)}</h2></div><a class="text-link" href="${pathFor(locale, "/research/")}">${esc(t.allResearch)} <span aria-hidden="true">↗</span></a></div>
      <article class="lead-story">
        <div class="lead-story-art">${artMarkup(latest.art)}</div>
        <div class="lead-story-copy">
          <div class="story-meta"><span>${esc(latest.kind)}</span><time datetime="${latest.date}">${formatDate(latest.date, locale)}</time></div>
          <h3><a href="${pathFor(locale, `/research/${latest.slug}/`)}">${esc(latest.title)}</a></h3>
          <p>${esc(latest.abstract)}</p>
          <div class="story-actions"><a class="button button--primary" href="${pathFor(locale, `/research/${latest.slug}/`)}">${esc(t.readResearch)}</a>${latest.evidence[0] ? `<a class="button button--quiet" href="${esc(latest.evidence[0].href)}">${buttonContent(latest.evidence[0].href, latest.evidence[0].label)}</a>` : ""}</div>
        </div>
      </article>
      <div class="research-grid">${remaining.map((item) => articleCard(item, locale)).join("\n")}</div>
    </section>

    <section class="focus-section section">
      <div class="section-heading"><div><p class="section-index">02 · ${esc(t.selectedWork)}</p><h2>${esc(t.currentRecord)}</h2></div></div>
      <div class="focus-list">${featured.map((item, index) => `<a href="${pathFor(locale, `/research/${item.slug}/`)}"><span class="focus-number">0${index + 1}</span><span><small>${esc(item.topic)}</small><strong>${esc(item.shortTitle)}</strong></span><span class="focus-arrow">↗</span></a>`).join("\n")}</div>
    </section>

  </main>`;
  return shell({
    title: "Parano1d Lab",
    locale,
    description: t.siteDescription,
    basePath: "/",
    body,
    active: "latest",
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "Parano1d Lab", url: siteUrl, parentOrganization: { "@type": "Organization", name: "Parano1d", url: "https://parano1d.org" } },
        { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: t.siteTitle, url: absolute(pathFor(locale, "/")), inLanguage: locale.htmlLang, publisher: { "@id": `${siteUrl}/#organization` } }
      ]
    }
  });
}

function archivePage(locale, newestFirst) {
  const t = ui[locale.code];
  const topics = [...new Set(newestFirst.map((item) => item.topic))].sort();
  const body = `<main id="content" class="archive-page">
    <section class="archive-hero"><p class="eyebrow">${esc(t.archiveEyebrow)}</p><h1>${esc(t.allResearch)}</h1><p>${esc(t.archiveLead)}</p></section>
    <section class="archive-section">
      <div class="filter-bar" role="group" aria-label="${esc(t.filterByTopic)}"><button class="filter-chip is-active" type="button" data-filter="all">${esc(t.filterAll)} <span>${newestFirst.length}</span></button>${topics.map((topic) => `<button class="filter-chip" type="button" data-filter="${esc(topic)}">${esc(topic)}</button>`).join("")}</div>
      <div class="archive-list">${newestFirst.map((item, index) => `<article class="archive-row" data-topic="${esc(item.topic)}">
        <a class="archive-index" href="${pathFor(locale, `/research/${item.slug}/`)}">${String(index + 1).padStart(2, "0")}</a>
        <div class="archive-copy"><div class="card-meta"><span>${esc(item.kind)}</span><time datetime="${item.date}">${formatDate(item.date, locale)}</time></div><h2><a href="${pathFor(locale, `/research/${item.slug}/`)}">${esc(item.title)}</a></h2><p>${esc(item.dek)}</p><div class="archive-tags"><span>${esc(item.topic)}</span><span>${esc(item.status)}</span><span>${readingTime(item.body, locale)} ${esc(t.minutesShort)}</span></div></div>
        <a class="archive-arrow" href="${pathFor(locale, `/research/${item.slug}/`)}" aria-label="${esc(t.readArticle)}: ${esc(item.title)}">↗</a>
      </article>`).join("\n")}</div>
      <p class="filter-empty" hidden>${esc(t.filterEmpty)}</p>
    </section>
  </main>`;
  return shell({
    locale,
    title: t.allResearch,
    description: t.archiveDescription,
    basePath: "/research/",
    body,
    active: "research"
  });
}

function evidenceList(item, locale) {
  const t = ui[locale.code];
  return `<aside class="evidence-panel" aria-labelledby="evidence-title"><div><p class="section-index">${esc(t.researchRecord)}</p><h2 id="evidence-title">${esc(t.evidenceTitle)}</h2><p>${esc(t.evidenceLead)}</p></div><div class="evidence-links">${item.evidence.map((entry) => `<a href="${esc(entry.href)}"><span class="evidence-entry">${isGithubUrl(entry.href) ? githubIcon("evidence-github-icon") : ""}<span><small>${esc(t.evidenceTypes[entry.type] ?? entry.type)}</small><strong>${esc(entry.label)}</strong></span></span><span aria-hidden="true">↗</span></a>`).join("\n")}</div></aside>`;
}

function shareControls(item, locale, basePath) {
  const t = ui[locale.code];
  const canonical = absolute(pathFor(locale, basePath));
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(item.title)}&url=${encodeURIComponent(canonical)}`;
  return `<div class="article-share" aria-label="${esc(t.shareAria)}"><span class="article-share-label">${esc(t.share)}</span><button class="share-action share-action--icon" type="button" data-copy-link="${esc(canonical)}" data-copy-default="${esc(t.copyLink)}" data-copy-success="${esc(t.copied)}" data-copy-failure="${esc(t.copyFailed)}" aria-label="${esc(t.copyAria)}" title="${esc(t.copyLink)}">${linkIcon()}${checkIcon()}<span class="visually-hidden" data-copy-label aria-live="polite">${esc(t.copyLink)}</span></button><a class="share-action" href="${esc(shareUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t.shareXAria)}">${xIcon()}<span>${esc(t.shareX)}</span></a></div>`;
}

function tocFor(html, locale) {
  const t = ui[locale.code];
  const entries = [...html.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  if (entries.length < 2) return "";
  return `<aside class="article-toc" aria-label="${esc(t.onThisPage)}"><strong>${esc(t.onThisPage)}</strong>${entries.map(([, id, text]) => `<a href="#${esc(id)}">${esc(text)}</a>`).join("")}</aside>`;
}

function articlePage(item, index, locale, newestFirst) {
  const t = ui[locale.code];
  const older = newestFirst[index + 1];
  const newer = newestFirst[index - 1];
  const basePath = `/research/${item.slug}/`;
  const canonical = absolute(pathFor(locale, basePath));
  const imagePath = `/assets/og/${item.slug}.png`;
  const seoTitle = articleSeoTitle(item, locale);
  const seoDescription = compactDescription(item.dek, locale);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": item.schemaType,
    headline: item.title,
    description: item.abstract,
    datePublished: item.date,
    dateModified: item.date,
    mainEntityOfPage: canonical,
    inLanguage: locale.htmlLang,
    author: item.authors.map((name) => ({ "@type": name === "Parano1d Lab" ? "Organization" : "Person", name })),
    publisher: { "@type": "Organization", name: "Parano1d Lab", url: siteUrl },
    image: absolute(imagePath),
    about: item.topic
  };
  const body = `<div class="reading-progress" aria-hidden="true"><span></span></div><main id="content" class="article-page">
    <header class="article-hero">
      <div class="article-hero-copy"><a class="back-link" href="${pathFor(locale, "/research/")}">← ${esc(t.backResearch)}</a><div class="article-meta"><span>${esc(item.kind)}</span><span>${esc(item.topic)}</span><time datetime="${item.date}">${formatDate(item.date, locale)}</time></div><h1>${esc(item.title)}</h1><p class="article-dek">${esc(item.dek)}</p><div class="article-byline"><span>${esc(t.by)} ${item.authors.map(esc).join(" · ")}</span><span>${readingTime(item.body, locale)} ${esc(t.minutesRead)}</span><span>${esc(item.status)}</span></div>${shareControls(item, locale, basePath)}</div>
      ${artMarkup(item.art)}
    </header>
    <div class="article-layout">
      ${tocFor(item.body, locale)}
      <article class="article-body"><div class="article-abstract"><span>${esc(t.abstract)}</span><p>${esc(item.abstract)}</p></div>${item.body}</article>
    </div>
    ${evidenceList(item, locale)}
    <nav class="article-next" aria-label="${esc(t.adjacent)}">${older ? `<a href="${pathFor(locale, `/research/${older.slug}/`)}"><small>${esc(t.earlier)}</small><strong>${esc(older.shortTitle)}</strong><span>←</span></a>` : "<span></span>"}${newer ? `<a href="${pathFor(locale, `/research/${newer.slug}/`)}"><small>${esc(t.later)}</small><strong>${esc(newer.shortTitle)}</strong><span>→</span></a>` : "<span></span>"}</nav>
  </main>`;
  return shell({
    title: seoTitle,
    description: seoDescription,
    locale,
    basePath,
    body,
    active: "research",
    type: "article",
    schema: articleSchema,
    article: item,
    imagePath,
    imageAlt: item.title
  });
}

function rss(locale, newestFirst) {
  const t = ui[locale.code];
  const items = newestFirst.map((item) => {
    const url = absolute(pathFor(locale, `/research/${item.slug}/`));
    return `<item><title>${esc(item.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(`${item.date}T12:00:00Z`).toUTCString()}</pubDate><category>${esc(item.topic)}</category><description>${esc(item.dek)}</description></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(t.siteTitle)}</title><link>${absolute(pathFor(locale, "/"))}</link><description>${esc(t.rssDescription)}</description><language>${locale.htmlLang}</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate><atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${absolute(pathFor(locale, "/feed.xml"))}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}

function sitemap() {
  const basePaths = ["/", "/research/", ...baseData.map((item) => `/research/${item.slug}/`)];
  const newestDate = baseData.map((item) => item.date).sort().at(-1);
  const dates = new Map(baseData.map((item) => [`/research/${item.slug}/`, item.date]));
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${basePaths.flatMap((basePath) => locales.map((locale) => `<url><loc>${absolute(pathFor(locale, basePath))}</loc><lastmod>${dates.get(basePath) ?? newestDate}</lastmod>${locales.map((alternate) => `<xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${absolute(pathFor(alternate, basePath))}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(pathFor(defaultLocale, basePath))}"/></url>`)).join("")}</urlset>`;
}

async function emit(path, contents) {
  const output = join(root, path);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, contents);
}

function outputPath(locale, basePath) {
  const pagePath = pathFor(locale, basePath).replace(/^\//, "");
  if (!pagePath) return "index.html";
  return pagePath.endsWith("/") ? `${pagePath}index.html` : pagePath;
}

await installKatexAssets();
for (const locale of locales) {
  const newestFirst = articleSets.get(locale.code);
  await emit(outputPath(locale, "/"), homePage(locale, newestFirst));
  await emit(outputPath(locale, "/research/"), archivePage(locale, newestFirst));
  for (const [index, item] of newestFirst.entries()) {
    await emit(outputPath(locale, `/research/${item.slug}/`), articlePage(item, index, locale, newestFirst));
  }
  await emit(outputPath(locale, "/feed.xml"), rss(locale, newestFirst));
  const t = ui[locale.code];
  await emit(outputPath(locale, "/404.html"), shell({ locale, title: t.notFoundTitle, description: t.notFoundText, basePath: "/404.html", body: `<main id="content" class="not-found"><span>404</span><h1>${esc(t.notFoundHeading)}</h1><p>${esc(t.notFoundText)}</p><a class="button button--primary" href="${pathFor(locale, "/")}">${esc(t.notFoundAction)}</a></main>`, indexable: false }));
}
await emit("sitemap.xml", sitemap());
await emit("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
await emit("manifest.webmanifest", JSON.stringify({ name: "Parano1d Lab Research", short_name: "Parano1d Lab", start_url: "/", display: "standalone", background_color: "#f3f2ed", theme_color: "#f3f2ed", icons: [{ src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png" }] }, null, 2));
console.log(`Built ${baseData.length} research articles in ${locales.length} languages for ${siteUrl}`);
