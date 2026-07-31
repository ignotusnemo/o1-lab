import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = "https://research.parano1d.org";
const sourceUrl = "https://github.com/ignotusnemo/o1-lab";
const data = JSON.parse(await readFile(join(root, "content/research.json"), "utf8"));

const articles = await Promise.all(
  data.map(async (item) => ({
    ...item,
    body: await readFile(join(root, `content/research/${item.slug}.html`), "utf8")
  }))
);

const newestFirst = [...articles].sort((a, b) => b.date.localeCompare(a.date));

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absolute(path) {
  return `${siteUrl}${path}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

function readingTime(html) {
  const words = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function artMarkup(kind, compact = false) {
  return `<div class="research-art art--${esc(kind)}${compact ? " research-art--compact" : ""}" aria-hidden="true">
    <span class="art-grid"></span>
    <span class="art-orbit art-orbit--a"></span>
    <span class="art-orbit art-orbit--b"></span>
    <span class="art-axis"></span>
    <span class="art-node art-node--a"></span>
    <span class="art-node art-node--b"></span>
    <span class="art-node art-node--c"></span>
    <span class="art-code">①</span>
  </div>`;
}

function header(active = "") {
  return `<header class="site-header">
    <a class="brand" href="/" aria-label="O(1) Lab home">
      <span class="brand-mark" aria-hidden="true">①</span>
      <span class="brand-copy"><strong>O(1) Lab</strong><small>Research</small></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span></span><span></span></button>
    <nav class="site-nav" id="site-nav" aria-label="Primary navigation">
      <a${active === "latest" ? ' aria-current="page"' : ""} href="/#latest">Latest</a>
      <a${active === "research" ? ' aria-current="page"' : ""} href="/research/">All research</a>
      <a${active === "about" ? ' aria-current="page"' : ""} href="/about/">About</a>
      <span class="nav-rule" aria-hidden="true"></span>
      <a href="https://docs.parano1d.org">Docs <span aria-hidden="true">↗</span></a>
      <a href="https://parano1d.org">ParanO(1)d <span aria-hidden="true">↗</span></a>
    </nav>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="footer-brand">
      <span class="brand-mark" aria-hidden="true">①</span>
      <div><strong>O(1) Lab</strong><p>Protocol research behind ParanO(1)d.</p></div>
    </div>
    <div class="footer-links">
      <div><strong>Research</strong><a href="/research/">Archive</a><a href="/feed.xml">RSS feed</a><a href="/papers/FROST_GKR.pdf">FROST-GKR paper</a></div>
      <div><strong>Project</strong><a href="https://parano1d.org">Website</a><a href="https://docs.parano1d.org">Documentation</a><a href="https://github.com/ignotusnemo/parano1d">Source</a></div>
    </div>
    <div class="footer-bottom"><span>© 2026 O(1) Lab</span><span>research.parano1d.org</span></div>
  </footer>`;
}

function jsonLd(value) {
  return `<script type="application/ld+json">${JSON.stringify(value).replaceAll("<", "\\u003c")}</script>`;
}

function shell({ title, description, path, body, active = "", type = "website", schema, article }) {
  const canonical = absolute(path);
  const fullTitle = title === "O(1) Lab" ? "O(1) Lab Research" : `${title} · O(1) Lab`;
  const image = absolute("/assets/og-research.png");
  const articleMeta = article
    ? `<meta property="article:published_time" content="${esc(article.date)}T00:00:00Z">
  <meta property="article:section" content="${esc(article.topic)}">
  ${article.authors.map((author) => `<meta property="article:author" content="${esc(author)}">`).join("\n  ")}`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f3f2ed">
  <meta name="color-scheme" content="light">
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="O(1) Lab">
  <meta name="keywords" content="Parano1d, ParanO(1)d, O(1) Lab, zero-knowledge proofs, proof systems, cryptography, recursive proofs, binary fields, polynomial commitments">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" type="application/rss+xml" title="O(1) Lab Research" href="${absolute("/feed.xml")}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="O(1) Lab Research">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(fullTitle)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${image}">
  ${articleMeta}
  <title>${esc(fullTitle)}</title>
  <link rel="stylesheet" href="/assets/site.css">
  ${jsonLd(schema ?? {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "O(1) Lab Research",
    url: siteUrl,
    description
  })}
</head>
<body>
  <a class="skip-link" href="#content">Skip to content</a>
  <div class="page-shell">
    ${header(active)}
    ${body}
    ${footer()}
  </div>
  <script src="/assets/site.js" defer></script>
</body>
</html>`;
}

function articleCard(item, { large = false } = {}) {
  return `<article class="research-card${large ? " research-card--large" : ""}" data-topic="${esc(item.topic)}">
    <a class="card-art-link" href="/research/${item.slug}/" tabindex="-1" aria-hidden="true">${artMarkup(item.art, true)}</a>
    <div class="card-body">
      <div class="card-meta"><span>${esc(item.kind)}</span><time datetime="${item.date}">${formatDate(item.date)}</time></div>
      <h3><a href="/research/${item.slug}/">${esc(item.title)}</a></h3>
      <p>${esc(item.dek)}</p>
      <div class="card-foot"><span>${readingTime(item.body)} min read</span><a class="text-link" href="/research/${item.slug}/">Read <span aria-hidden="true">↗</span></a></div>
    </div>
  </article>`;
}

function homePage() {
  const latest = newestFirst[0];
  const remaining = newestFirst.slice(1, 7);
  const featured = newestFirst.filter((item) => item.featured).slice(0, 4);
  const body = `<main id="content">
    <section class="home-hero">
      <div class="hero-copy">
        <p class="eyebrow">O(1) Lab · Technical research</p>
        <h1>Research for proof-native systems.</h1>
        <p class="hero-lead">Papers, protocol work, implementation studies and negative results produced while building ParanO(1)d.</p>
        <div class="hero-actions"><a class="button button--primary" href="#latest">Latest research</a><a class="button button--quiet" href="/research/">Open the archive</a></div>
      </div>
      <div class="hero-field" aria-hidden="true">
        <div class="field-label field-label--a">commit</div><div class="field-label field-label--b">reduce</div><div class="field-label field-label--c">verify</div>
        <div class="field-plane field-plane--a"></div><div class="field-plane field-plane--b"></div><div class="field-plane field-plane--c"></div>
        <div class="field-mark">①</div>
      </div>
    </section>

    <section class="latest-section section" id="latest">
      <div class="section-heading"><div><p class="section-index">01 · Latest</p><h2>Latest research</h2></div><a class="text-link" href="/research/">All research <span aria-hidden="true">↗</span></a></div>
      <article class="lead-story">
        <div class="lead-story-art">${artMarkup(latest.art)}</div>
        <div class="lead-story-copy">
          <div class="story-meta"><span>${esc(latest.kind)}</span><time datetime="${latest.date}">${formatDate(latest.date)}</time></div>
          <h3><a href="/research/${latest.slug}/">${esc(latest.title)}</a></h3>
          <p>${esc(latest.abstract)}</p>
          <div class="story-actions"><a class="button button--primary" href="/research/${latest.slug}/">Read the research</a>${latest.evidence[0] ? `<a class="button button--quiet" href="${esc(latest.evidence[0].href)}">${esc(latest.evidence[0].label)}</a>` : ""}</div>
        </div>
      </article>
      <div class="research-grid">${remaining.map((item) => articleCard(item)).join("\n")}</div>
    </section>

    <section class="focus-section section">
      <div class="section-heading"><div><p class="section-index">02 · Selected work</p><h2>Current research record</h2></div></div>
      <div class="focus-list">${featured.map((item, index) => `<a href="/research/${item.slug}/"><span class="focus-number">0${index + 1}</span><span><small>${esc(item.topic)}</small><strong>${esc(item.shortTitle)}</strong></span><span class="focus-arrow">↗</span></a>`).join("\n")}</div>
    </section>

    <section class="method-section section">
      <div><p class="section-index">03 · Method</p><h2>Evidence before narrative.</h2></div>
      <div class="method-copy"><p>O(1) Lab publishes completed constructions, reproducible engineering studies and useful failures. A benchmark is paired with its machine and workload. A protocol claim is paired with the code, test or derivation that supports it.</p><a class="text-link" href="/about/">How the journal is maintained <span aria-hidden="true">↗</span></a></div>
    </section>
  </main>`;
  return shell({
    title: "O(1) Lab",
    description: "Papers, protocol work, engineering studies and negative results from O(1) Lab, the research group behind ParanO(1)d.",
    path: "/",
    body,
    active: "latest",
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "O(1) Lab", url: siteUrl, parentOrganization: { "@type": "Organization", name: "ParanO(1)d", url: "https://parano1d.org" } },
        { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: "O(1) Lab Research", url: siteUrl, publisher: { "@id": `${siteUrl}/#organization` } }
      ]
    }
  });
}

function archivePage() {
  const topics = [...new Set(newestFirst.map((item) => item.topic))].sort();
  const body = `<main id="content" class="archive-page">
    <section class="archive-hero"><p class="eyebrow">Research archive</p><h1>All research</h1><p>Papers, protocol notes, engineering studies and preserved negative results. Ordered by the date of the recorded research milestone.</p></section>
    <section class="archive-section">
      <div class="filter-bar" role="group" aria-label="Filter by topic"><button class="filter-chip is-active" type="button" data-filter="all">All <span>${newestFirst.length}</span></button>${topics.map((topic) => `<button class="filter-chip" type="button" data-filter="${esc(topic)}">${esc(topic)}</button>`).join("")}</div>
      <div class="archive-list">${newestFirst.map((item, index) => `<article class="archive-row" data-topic="${esc(item.topic)}">
        <a class="archive-index" href="/research/${item.slug}/">${String(index + 1).padStart(2, "0")}</a>
        <div class="archive-copy"><div class="card-meta"><span>${esc(item.kind)}</span><time datetime="${item.date}">${formatDate(item.date)}</time></div><h2><a href="/research/${item.slug}/">${esc(item.title)}</a></h2><p>${esc(item.dek)}</p><div class="archive-tags"><span>${esc(item.topic)}</span><span>${esc(item.status)}</span><span>${readingTime(item.body)} min</span></div></div>
        <a class="archive-arrow" href="/research/${item.slug}/" aria-label="Read ${esc(item.title)}">↗</a>
      </article>`).join("\n")}</div>
      <p class="filter-empty" hidden>No research matches this filter.</p>
    </section>
  </main>`;
  return shell({
    title: "All research",
    description: "The complete O(1) Lab archive: papers, protocol notes, engineering studies and negative results from the development of ParanO(1)d.",
    path: "/research/",
    body,
    active: "research"
  });
}

function evidenceList(item) {
  return `<aside class="evidence-panel" aria-labelledby="evidence-title"><div><p class="section-index">Research record</p><h2 id="evidence-title">Evidence and artifacts</h2><p>The links below preserve the implementation, measurement or derivation behind this article.</p></div><div class="evidence-links">${item.evidence.map((entry) => `<a href="${esc(entry.href)}"><span><small>${esc(entry.type)}</small><strong>${esc(entry.label)}</strong></span><span aria-hidden="true">↗</span></a>`).join("\n")}</div></aside>`;
}

function tocFor(html) {
  const entries = [...html.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  if (entries.length < 2) return "";
  return `<aside class="article-toc" aria-label="On this page"><strong>On this page</strong>${entries.map(([, id, text]) => `<a href="#${esc(id)}">${esc(text)}</a>`).join("")}</aside>`;
}

function articlePage(item, index) {
  const older = newestFirst[index + 1];
  const newer = newestFirst[index - 1];
  const path = `/research/${item.slug}/`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": item.kind === "Paper" ? "ScholarlyArticle" : "TechArticle",
    headline: item.title,
    description: item.abstract,
    datePublished: item.date,
    dateModified: item.date,
    mainEntityOfPage: absolute(path),
    author: item.authors.map((name) => ({ "@type": name === "O(1) Lab" ? "Organization" : "Person", name })),
    publisher: { "@type": "Organization", name: "O(1) Lab", url: siteUrl },
    image: absolute("/assets/og-research.png"),
    about: item.topic
  };
  const body = `<div class="reading-progress" aria-hidden="true"><span></span></div><main id="content" class="article-page">
    <header class="article-hero">
      <div class="article-hero-copy"><a class="back-link" href="/research/">← All research</a><div class="article-meta"><span>${esc(item.kind)}</span><span>${esc(item.topic)}</span><time datetime="${item.date}">${formatDate(item.date)}</time></div><h1>${esc(item.title)}</h1><p class="article-dek">${esc(item.dek)}</p><div class="article-byline"><span>By ${item.authors.map(esc).join(" · ")}</span><span>${readingTime(item.body)} min read</span><span>${esc(item.status)}</span></div></div>
      ${artMarkup(item.art)}
    </header>
    <div class="article-layout">
      ${tocFor(item.body)}
      <article class="article-body"><div class="article-abstract"><span>Abstract</span><p>${esc(item.abstract)}</p></div>${item.body}</article>
    </div>
    ${evidenceList(item)}
    <nav class="article-next" aria-label="Adjacent research">${older ? `<a href="/research/${older.slug}/"><small>Earlier</small><strong>${esc(older.shortTitle)}</strong><span>←</span></a>` : "<span></span>"}${newer ? `<a href="/research/${newer.slug}/"><small>Later</small><strong>${esc(newer.shortTitle)}</strong><span>→</span></a>` : "<span></span>"}</nav>
  </main>`;
  return shell({
    title: item.title,
    description: item.dek,
    path,
    body,
    active: "research",
    type: "article",
    schema: articleSchema,
    article: item
  });
}

async function aboutPage() {
  const article = await readFile(join(root, "content/about.html"), "utf8");
  const body = `<main id="content" class="about-page"><section class="about-hero"><p class="eyebrow">About O(1) Lab</p><h1>Research that survives implementation.</h1><p>O(1) Lab is the protocol research group behind ParanO(1)d. The journal preserves both the finished work and the experiments that changed the design.</p></section><article class="about-body">${article}</article></main>`;
  return shell({
    title: "About",
    description: "About O(1) Lab, its research method and the evidence standards used by the O(1) Lab research journal.",
    path: "/about/",
    body,
    active: "about"
  });
}

function rss() {
  const items = newestFirst.map((item) => `<item><title>${esc(item.title)}</title><link>${absolute(`/research/${item.slug}/`)}</link><guid isPermaLink="true">${absolute(`/research/${item.slug}/`)}</guid><pubDate>${new Date(`${item.date}T12:00:00Z`).toUTCString()}</pubDate><category>${esc(item.topic)}</category><description>${esc(item.dek)}</description></item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>O(1) Lab Research</title><link>${siteUrl}</link><description>Papers, protocol work, engineering studies and negative results from O(1) Lab.</description><language>en</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate><atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}

function sitemap() {
  const paths = ["/", "/research/", "/about/", ...newestFirst.map((item) => `/research/${item.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${absolute(path)}</loc><changefreq>${path === "/" ? "weekly" : "monthly"}</changefreq><priority>${path === "/" ? "1.0" : path === "/research/" ? "0.9" : "0.7"}</priority></url>`).join("")}</urlset>`;
}

async function emit(path, contents) {
  const output = join(root, path);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, contents);
}

await emit("index.html", homePage());
await emit("research/index.html", archivePage());
await emit("about/index.html", await aboutPage());
for (const [index, item] of newestFirst.entries()) {
  await emit(`research/${item.slug}/index.html`, articlePage(item, index));
}
await emit("feed.xml", rss());
await emit("sitemap.xml", sitemap());
await emit("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
await emit("manifest.webmanifest", JSON.stringify({ name: "O(1) Lab Research", short_name: "O(1) Lab", start_url: "/", display: "standalone", background_color: "#f3f2ed", theme_color: "#f3f2ed", icons: [{ src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png" }] }, null, 2));
await emit("404.html", shell({ title: "Page not found", description: "The requested O(1) Lab research page was not found.", path: "/404.html", body: `<main id="content" class="not-found"><span>404</span><h1>This page is outside the trace.</h1><p>The research may have moved or the address may be incomplete.</p><a class="button button--primary" href="/">Return home</a></main>` }));

console.log(`Built ${newestFirst.length} research articles for ${siteUrl}`);

