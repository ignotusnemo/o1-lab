import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import { artDiagrams } from "./art.mjs";
import { defaultLocale, locales, localesFor, pathFor, ui } from "./i18n.mjs";
import { sourceLinks } from "./source-links.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = "https://lab.parano1d.org";
const versionOf = (contents) => createHash("sha256").update(contents).digest("hex").slice(0, 12);
const [siteCssVersion, siteJsVersion, sourceCssVersion, themeJsVersion] = await Promise.all([
  readFile(join(root, "assets/site.css")).then(versionOf),
  readFile(join(root, "assets/site.js")).then(versionOf),
  readFile(join(root, "assets/source-dialog.css")).then(versionOf),
  readFile(join(root, "assets/theme.js")).then(versionOf)
]);
const baseData = JSON.parse(sourceLinks(await readFile(join(root, "content/research.json"), "utf8")));
for (const item of baseData) {
  if (item.locales && (!Array.isArray(item.locales) || !item.locales.includes(defaultLocale.code)
    || new Set(item.locales).size !== item.locales.length
    || item.locales.some((code) => !locales.some((locale) => locale.code === code)))) {
    throw new Error(`Invalid article locales: ${item.slug}`);
  }
}

async function loadArticles(locale) {
  const available = baseData.filter((item) => localesFor(item).includes(locale));
  const overlays = locale.code === defaultLocale.code
    ? null
    : JSON.parse(await readFile(join(root, `content/i18n/${locale.code}/research.json`), "utf8"));

  if (overlays) {
    const missing = available.map((item) => item.slug).filter((slug) => !overlays[slug]);
    const unknown = Object.keys(overlays).filter((slug) => !available.some((item) => item.slug === slug));
    if (missing.length || unknown.length) {
      throw new Error(`Invalid ${locale.code} research metadata: missing=[${missing.join(", ")}], unknown=[${unknown.join(", ")}]`);
    }
  }

  const articles = await Promise.all(available.map(async (base) => {
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
    const sourceExtension = base.format === "markdown" ? "md" : "html";
    const sourcePath = locale.code === defaultLocale.code
      ? `content/research/${base.slug}.${sourceExtension}`
      : `content/i18n/${locale.code}/research/${base.slug}.${sourceExtension}`;
    const source = sourceLinks(await readFile(join(root, sourcePath), "utf8"));
    const body = base.format === "markdown"
      ? renderFlagshipMarkdown(source, item, sourcePath)
      : source;
    return { ...item, schemaType: base.kind === "Paper" ? "ScholarlyArticle" : "TechArticle", body: renderMath(body, sourcePath) };
  }));

  return articles.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.date.localeCompare(a.date));
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

function markdownInline(source) {
  const tokens = [];
  const stash = (html) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  };

  let text = source
    .replace(/`([^`]+)`/g, (_, code) => stash(`<code>${esc(code)}</code>`))
    .replace(/\\\((.+?)\\\)/g, (_, tex) => stash(`<math-inline>${esc(tex)}</math-inline>`))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, href) =>
      stash(`<a href="${esc(href)}">${esc(label)}</a>`)
    );

  text = esc(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
}

function flagshipDiagramInline(source) {
  return esc(source)
    .replace(/([SπB])_\(h-1\)/g, "$1<sub>h−1</sub>")
    .replace(/([SπB])_h/g, "$1<sub>h</sub>")
    .replace(/Delta_P2b\^C1/g, "Δ<sub>P2b</sub><sup>C1</sup>")
    .replace(/2\^([0-9.]+)/g, "2<sup>$1</sup>");
}

function flagshipDiagramNode(label, className = "") {
  return `<div class="diagram-node${className ? ` ${className}` : ""}">${flagshipDiagramInline(label)}</div>`;
}

function flagshipDiagramArrow() {
  return '<span class="diagram-arrow" aria-hidden="true"></span>';
}

function flagshipDiagramSteps(source) {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "|" && line !== "v" && line !== "+");
}

function renderFlagshipDiagram(index, source) {
  const steps = flagshipDiagramSteps(source);
  const aria = esc(source.replace(/\s+/g, " ").trim());
  const figure = (type, body) => `<figure class="flagship-diagram flagship-diagram--${type}" aria-label="${aria}">${body}</figure>`;
  const flow = (items, modifier = "") => figure(
    `flow${modifier ? ` ${modifier}` : ""}`,
    `<div class="diagram-flow">${items.map((item, itemIndex) => `${flagshipDiagramNode(item)}${itemIndex < items.length - 1 ? flagshipDiagramArrow() : ""}`).join("")}</div>`
  );

  if (index === 0) {
    const obligations = source.split(/\n\s*\n/).map((entry) => entry.replace(/^\s*\d+\.\s*/, "").replace(/\s+/g, " ").trim());
    return figure("obligations", `<ol class="diagram-obligations">${obligations.map((item) => `<li><span>${flagshipDiagramInline(item)}</span></li>`).join("")}</ol>`);
  }

  if (index === 1) return flow(steps, "flagship-diagram--transition");

  if (index === 2) {
    const rows = source.split(/\n\s*\n/).map((line, rowIndex) => {
      const match = line.trim().match(/^(.*?)\s+-{4,}>$/);
      const label = match?.[1] ?? line.trim();
      return `<div class="diagram-track-row"><span class="diagram-track-label">${flagshipDiagramInline(label)}</span><span class="diagram-track"><span style="--track-fill:${rowIndex === 0 ? "100%" : "72%"}"></span></span><span class="diagram-track-tip" aria-hidden="true"></span></div>`;
    });
    return figure("tracks", `<div class="diagram-tracks">${rows.join("")}</div>`);
  }

  if (index === 3) {
    const [result, expression = ""] = source.split("=").map((part) => part.trim());
    const parts = expression.split("+").map((part) => part.trim());
    return figure("equation", `<div class="diagram-equation">${flagshipDiagramNode(result, "diagram-node--result")}<span class="diagram-equation-symbol">=</span><div class="diagram-equation-pair">${parts.map((part, partIndex) => `${flagshipDiagramNode(part)}${partIndex < parts.length - 1 ? '<span class="diagram-equation-symbol">+</span>' : ""}`).join("")}</div></div>`);
  }

  if (index === 4) {
    return figure("questions", `<div class="diagram-questions">${steps.map((item, itemIndex) => `<div class="diagram-question"><span>${String(itemIndex + 1).padStart(2, "0")}</span><strong>${flagshipDiagramInline(item)}</strong></div>`).join("")}</div>`);
  }

  if (index === 5 || index === 6) {
    return figure("assertion", `<div class="diagram-assertion"><span class="diagram-assertion-mark" aria-hidden="true"></span><strong>${flagshipDiagramInline(steps[0])}</strong></div>`);
  }

  if (index === 7) return flow(steps, "flagship-diagram--receipt");

  if (index === 8) {
    const rows = steps.map((line) => line.split("->").map((part) => part.trim()));
    return figure("responsibilities", `<div class="diagram-responsibilities">${rows.map(([sourceLabel, question]) => `<div class="diagram-responsibility">${flagshipDiagramNode(sourceLabel, "diagram-node--key")}${flagshipDiagramArrow()}<div class="diagram-responsibility-copy">${flagshipDiagramInline(question)}</div></div>`).join("")}</div>`);
  }

  if (index === 9) return flow(steps, "flagship-diagram--production-short");

  if (index === 10) {
    return figure("requirements", `<ol class="diagram-requirements">${steps.map((item) => `<li><span>${flagshipDiagramInline(item)}</span></li>`).join("")}</ol>`);
  }

  if (index === 11) {
    const values = source.trim().replace(/^\{|\}$/g, "").split(",").map((item) => item.trim());
    return figure("atomic", `<div class="diagram-atomic"><span class="diagram-brace" aria-hidden="true">{</span>${values.map((item, itemIndex) => `${flagshipDiagramNode(item)}${itemIndex < values.length - 1 ? '<span class="diagram-atomic-link" aria-hidden="true">+</span>' : ""}`).join("")}<span class="diagram-brace" aria-hidden="true">}</span></div>`);
  }

  if (index === 12) {
    const inputs = steps.slice(0, 3);
    const pipeline = steps.slice(3);
    return figure("production", `<div class="diagram-input-cluster">${inputs.map((item, itemIndex) => `${flagshipDiagramNode(item)}${itemIndex < inputs.length - 1 ? '<span aria-hidden="true">+</span>' : ""}`).join("")}</div>${flagshipDiagramArrow()}<ol class="diagram-timeline">${pipeline.map((item) => `<li><span class="diagram-timeline-index" aria-hidden="true"></span><strong>${flagshipDiagramInline(item)}</strong></li>`).join("")}</ol>`);
  }

  if (index === 13) {
    const axes = source.split("×").map((item) => item.trim());
    return figure("axes", `<div class="diagram-axes">${axes.map((item, itemIndex) => `${flagshipDiagramNode(item)}${itemIndex < axes.length - 1 ? '<span class="diagram-axis-symbol" aria-hidden="true">×</span>' : ""}`).join("")}</div>`);
  }

  if (index === 14) {
    return figure("coverage", `<ol class="diagram-coverage">${steps.map((item) => `<li><span>${flagshipDiagramInline(item)}</span></li>`).join("")}</ol>`);
  }

  if (index === 15) {
    return figure("security-pair", `<div class="diagram-security-pair">${steps.map((item) => {
      const match = item.match(/^(\d+)\s+(.+)$/);
      return `<div class="diagram-security-metric"><strong>${esc(match?.[1] ?? item)}</strong>${match ? `<span>${esc(match[2])}</span>` : ""}</div>`;
    }).join("")}</div>`);
  }

  if (index >= 16) {
    return figure(`bound diagram-bound--${index}`, `<div class="diagram-bound-value">${flagshipDiagramInline(source.trim())}</div><div class="diagram-bound-rule" aria-hidden="true"><span></span></div>`);
  }

  return flow(steps);
}

function renderFlagshipMarkdown(source, item, sourcePath) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const sectionIds = item.sectionIds ?? [];
  const output = [`<div class="flagship-lede"><p class="flagship-opening-question">${esc(item.dek)}</p>`];
  let paragraph = [];
  let sectionIndex = -1;
  let sectionOpen = false;
  let ledeOpen = true;
  let codeIndex = 0;
  let tableIndex = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const raw = paragraph.join(" ").trim();
    paragraph = [];
    if (!raw) return;
    const strongOnly = raw.match(/^\*\*(.+)\*\*$/s);
    const linkOnly = raw.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (strongOnly && ledeOpen) {
      output.push(`<p>${markdownInline(strongOnly[1])}</p>`);
    } else if (strongOnly) {
      output.push(`<p class="flagship-claim"><strong>${markdownInline(strongOnly[1])}</strong></p>`);
    } else if (linkOnly && sectionIndex === sectionIds.length - 1) {
      output.push(`<p class="flagship-destination"><a href="${esc(linkOnly[2])}">${esc(linkOnly[1])}<span aria-hidden="true">↗</span></a></p>`);
    } else {
      output.push(`<p>${markdownInline(raw)}</p>`);
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (index === 0 && /^#\s+/.test(line)) continue;
    if (index === 2 && /^###\s+/.test(line)) continue;

    if (line.startsWith("```")) {
      flushParagraph();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      const value = code.join("\n").replace(/\s+$/, "");
      output.push(renderFlagshipDiagram(codeIndex, value));
      codeIndex += 1;
      continue;
    }

    if (/^\|/.test(line)) {
      flushParagraph();
      const rows = [];
      while (index < lines.length && /^\|/.test(lines[index])) {
        rows.push(lines[index].split("|").slice(1, -1).map((cell) => cell.trim()));
        index += 1;
      }
      index -= 1;
      if (rows.length < 2 || !rows[1].every((cell) => /^:?-{3,}:?$/.test(cell))) {
        throw new Error(`Invalid Markdown table in ${sourcePath}`);
      }
      const header = rows[0];
      const body = rows.slice(2);
      const plainHeader = header.map((cell) => cell.replaceAll("`", "").replaceAll("*", ""));
      const tableRole = plainHeader.includes("Terminal")
        ? " flagship-table--performance"
        : ["Parameter", "Параметр", "参数"].includes(plainHeader[0])
          ? " flagship-table--profile"
          : "";
      const tableRows = body.map((row) => {
        const isSubheading = /^\*\*[^*]+\*\*$/.test(row[0]) && row.slice(1).every((cell) => !cell);
        if (isSubheading) {
          return `<tr class="flagship-table-subheading"><th colspan="${header.length}" scope="rowgroup">${markdownInline(row[0])}</th></tr>`;
        }
        return `<tr>${row.map((cell, cellIndex) => `<td data-label="${esc(plainHeader[cellIndex])}">${markdownInline(cell)}</td>`).join("")}</tr>`;
      }).join("");
      output.push(`<div class="table-wrap flagship-table flagship-table--${tableIndex}${tableRole}"><table><thead><tr>${header.map((cell) => `<th>${markdownInline(cell)}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></div>`);
      tableIndex += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, "").trim());
        index += 1;
      }
      index -= 1;
      output.push(`<ol class="flagship-scope-list">${items.map((entry) => `<li>${markdownInline(entry)}</li>`).join("")}</ol>`);
      continue;
    }

    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flushParagraph();
      if (ledeOpen) {
        output.push("</div>");
        ledeOpen = false;
      }
      if (sectionOpen) output.push("</section>");
      sectionIndex += 1;
      const id = sectionIds[sectionIndex];
      if (!id) throw new Error(`${sourcePath}: missing section id ${sectionIndex + 1}`);
      const finalClass = sectionIndex === sectionIds.length - 1 ? " flagship-section--final" : "";
      const sectionNumber = String(sectionIndex + 1).padStart(2, "0");
      output.push(`<section class="flagship-section${finalClass}" data-section="${sectionNumber}"><h2 id="${esc(id)}" data-section="${sectionNumber}">${markdownInline(heading[1])}</h2>`);
      sectionOpen = true;
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  if (ledeOpen) output.push("</div>");
  if (sectionOpen) output.push("</section>");
  if (sectionIndex + 1 !== sectionIds.length) {
    throw new Error(`${sourcePath}: expected ${sectionIds.length} sections, found ${sectionIndex + 1}`);
  }
  return output.join("\n");
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
  return `${sourceIcon(href)}<span>${esc(label)}</span>`;
}

function sourceIcon(href, className = "button-icon") {
  if (isGithubUrl(href)) return githubIcon(className);
  if (!href.startsWith("https://git.parano1d.org/")) return "";
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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

function articleArtMarkup(item, compact = false) {
  if (!item.heroImage) return artMarkup(item.art, compact);
  return `<div class="research-image${compact ? " research-image--compact" : ""}${item.heroImageFit === "contain" ? " research-image--contain" : ""}" aria-hidden="true"><img src="${esc(item.heroImage)}" alt="" loading="${compact ? "lazy" : "eager"}" decoding="async"></div>`;
}

function languageSwitcher(locale, basePath) {
  const t = ui[locale.code];
  const article = baseData.find((item) => basePath === `/research/${item.slug}/`);
  return `<details class="language-switcher"><summary aria-label="${esc(t.languageMenu)}"><span>${esc(locale.shortLabel)}</span><span class="language-chevron" aria-hidden="true">⌄</span></summary><div class="language-menu" aria-label="${esc(t.language)}">${locales.map((target) => {
    const available = localesFor(article).includes(target);
    const href = pathFor(target, available ? basePath : "/research/");
    const label = available ? target.label : `${target.label} · ${ui[target.code].footerArchive}`;
    return `<a href="${href}" lang="${target.htmlLang}" hreflang="${target.hreflang}"${target.code === locale.code ? ' aria-current="true"' : ""}><span>${esc(target.shortLabel)}</span><strong>${esc(label)}</strong></a>`;
  }).join("")}</div></details>`;
}

function icon(name) {
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moon: '<path d="M20.5 13.4A8.6 8.6 0 0 1 10.6 3.5a8.7 8.7 0 1 0 9.9 9.9Z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function header(active, locale, basePath) {
  const t = ui[locale.code];
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="${pathFor(locale, "/")}" aria-label="${esc(t.brandHome)}">Parano1d<span class="brand-tag">LAB</span></a>
    <nav class="site-nav" id="site-navigation" aria-label="${esc(t.navLabel)}">
      <a href="${pathFor(locale, "/")}"${active === "latest" ? ' aria-current="page"' : ""}>${esc(t.journal)}</a>
      <a href="${pathFor(locale, "/research/")}"${active === "research" ? ' aria-current="page"' : ""}>${esc(t.archiveNav)}</a>
      <a href="https://docs.parano1d.org">${esc(t.navDocs)} <span aria-hidden="true">↗</span></a>
      <button type="button" data-source-open aria-haspopup="dialog" aria-controls="source-dialog">${esc(t.navSource)}</button>
    </nav>
    <div class="header-controls">
      <button class="icon-button search-toggle" type="button" data-search-open aria-label="${esc(t.search)}" title="${esc(t.search)} (/)">${icon("search")}</button>
      <button class="icon-button theme-toggle" type="button" data-theme-toggle data-light-label="${esc(t.lightMode)}" data-dark-label="${esc(t.darkMode)}" aria-label="${esc(t.darkMode)}" aria-pressed="false"><span class="theme-sun">${icon("sun")}</span><span class="theme-moon">${icon("moon")}</span></button>
      ${languageSwitcher(locale, basePath)}
      <button class="icon-button nav-toggle" type="button" aria-label="${esc(t.menu)}" aria-expanded="false" aria-controls="site-navigation">${icon("menu")}</button>
    </div>
  </div></header>`;
}

function searchDialog(locale) {
  const t = ui[locale.code];
  const records = articleSets.get(locale.code).map(item => ({title:item.title,topic:item.topic,kind:item.kind,dek:item.dek,date:item.date,keywords:item.keywords ?? [],href:pathFor(locale,`/research/${item.slug}/`)}));
  return `<dialog class="search-dialog" id="research-search" aria-labelledby="search-heading">
    <div class="search-dialog-header"><h2 id="search-heading">${esc(t.search)}</h2><button class="icon-button" type="button" data-search-close aria-label="${esc(t.close)}">${icon("close")}</button></div>
    <label class="search-field" for="global-search">${icon("search")}<input id="global-search" type="search" placeholder="${esc(t.searchPlaceholder)}" autocomplete="off" spellcheck="false"></label>
    <p class="search-status" data-search-status aria-live="polite"></p><ol class="search-results" data-search-results></ol>
    <p class="search-help">${esc(t.searchHelp)}</p>
    <script type="application/json" id="research-search-data">${JSON.stringify(records).replaceAll("<", "\\u003c")}</script>
    <span hidden data-search-empty>${esc(t.filterEmpty)}</span><span hidden data-search-count>${esc(t.articleCount)}</span>
  </dialog>`;
}

function footer(locale) {
  const t = ui[locale.code];
  return `<footer class="site-footer"><span>© 2026 Parano1d Lab</span><div class="footer-links" role="navigation" aria-label="${esc(t.navLabel)}"><a href="${pathFor(locale, "/")}#latest">${esc(t.navLatest)}</a><a href="${pathFor(locale, "/research/")}">${esc(t.footerArchive)}</a><a href="${pathFor(locale, "/feed.xml")}">${esc(t.footerFeed)}</a><a href="https://parano1d.org">Parano1d</a><a href="https://docs.parano1d.org">${esc(t.footerDocumentation)}</a><button type="button" data-source-open aria-haspopup="dialog" aria-controls="source-dialog">${esc(t.navSource)}</button></div></footer>`;
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
  keywords,
  basePath,
  body,
  active = "",
  type = "website",
  schema,
  article,
  imagePath = "/assets/og-lab-hero.png",
  imageAlt = title,
  imageWidth = 1200,
  imageHeight = 630,
  indexable = true
}) {
  const t = ui[locale.code];
  const keywordContent = Array.isArray(keywords) && keywords.length
    ? [...new Set([...keywords, "Parano1d", "Parano1d Lab"])].join(", ")
    : t.keywords;
  const pagePath = pathFor(locale, basePath);
  const canonical = absolute(pagePath);
  const fullTitle = title === "Parano1d Lab" ? t.siteTitle : `${title} · Parano1d Lab`;
  const image = absolute(imagePath);
  const availableLocales = localesFor(article);
  const alternates = availableLocales.map((target) => `<link rel="alternate" hreflang="${target.hreflang}" href="${absolute(pathFor(target, basePath))}">`).join("\n  ");
  const ogAlternates = availableLocales.filter((target) => target.code !== locale.code).map((target) => `<meta property="og:locale:alternate" content="${target.ogLocale}">`).join("\n  ");
  const articleMeta = indexable && article
    ? `<meta property="article:published_time" content="${esc(article.date)}T00:00:00Z">${article.updated ? `\n  <meta property="article:modified_time" content="${esc(article.updated)}T00:00:00Z">` : ""}
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
  <meta property="og:image:width" content="${imageWidth}">
  <meta property="og:image:height" content="${imageHeight}">
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
  <meta name="theme-color" content="#ffffff">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="Parano1d Lab">
  <meta name="keywords" content="${esc(keywordContent)}">
  ${discoveryMeta}
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
  <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
  ${socialMeta}
  ${articleMeta}
  <title>${esc(fullTitle)}</title>
  <script src="/assets/theme.js?v=${themeJsVersion}"></script>
  <link rel="stylesheet" href="/assets/site.css?v=${siteCssVersion}">
  <link rel="stylesheet" href="/assets/source-dialog.css?v=${sourceCssVersion}">
  <link rel="stylesheet" href="/assets/katex.min.css">
  ${structuredData}
</head>
<body class="locale-${locale.code}">
  <a class="skip-link" href="#content">${esc(t.skip)}</a>
  ${header(active, locale, basePath)}
  ${type === "article" ? '<div class="reading-progress" aria-hidden="true"><span></span></div>' : ""}
  <div class="page-shell">
    ${body}
    ${footer(locale)}
  </div>
  ${searchDialog(locale)}
  <script src="/assets/site.js?v=${siteJsVersion}" defer></script>
</body>
</html>`;
  return externalLinksInNewTabs(document.replace(/^[ \t]+$/gm, ""));
}

function articleCard(item, locale) {
  const t = ui[locale.code];
  const href = pathFor(locale, `/research/${item.slug}/`);
  return `<article class="research-card" data-topic="${esc(item.topic)}">
    <div class="card-meta"><time datetime="${item.date}">${formatDate(item.date, locale)}</time><a class="topic-link" href="${pathFor(locale, "/research/")}?topic=${encodeURIComponent(item.topic)}">${esc(item.topic)}</a></div>
    <h3><a href="${href}">${esc(item.title)}</a></h3>
    <p>${esc(compactDescription(item.dek, locale))}</p>
    <div class="card-foot"><span>${esc(item.kind)} · ${readingTime(item.body, locale)} ${esc(t.minutesRead)}</span><a href="${href}" aria-label="${esc(t.read)}: ${esc(item.title)}">${esc(t.read)} <span aria-hidden="true">→</span></a></div>
  </article>`;
}

function topicMenu(locale, articles) {
  const t = ui[locale.code];
  const topics = [...new Set(articles.map(item => item.topic))].sort((a,b)=>a.localeCompare(b,locale.dateLocale));
  return `<details class="topic-menu"><summary>${esc(t.browseTopics)} <span aria-hidden="true">+</span></summary><nav class="topic-menu-list" aria-label="${esc(t.browseTopics)}">${topics.map(topic=>`<a href="${pathFor(locale,"/research/")}?topic=${encodeURIComponent(topic)}"><span>${esc(topic)}</span><span>${articles.filter(item=>item.topic===topic).length}</span></a>`).join("")}</nav></details>`;
}

function homePage(locale, newestFirst) {
  const t = ui[locale.code];
  const featured = newestFirst.find(item=>item.pinned) ?? newestFirst[0];
  const latest = newestFirst.filter(item=>item.slug!==featured.slug).sort((a,b)=>b.date.localeCompare(a.date));
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(latest.length / pageSize));
  const body = `<main id="content" class="journal-page">
    <header class="journal-intro"><div><p class="eyebrow">PARANO1D LAB / ${esc(t.footerResearch)}</p><h1>${esc(t.journalTitle)}</h1></div><p class="subtitle">${esc(t.homeLead)}</p></header>
    <section class="featured-section" aria-labelledby="featured-title">
      <div class="section-heading"><h2 id="featured-title">${esc(t.selectedWork)}</h2><span class="section-label">${esc(featured.kind)}</span></div>
      <article class="feature-story"><div class="feature-copy"><div class="card-meta"><time datetime="${featured.date}">${formatDate(featured.date,locale)}</time><span>${esc(featured.topic)}</span></div><h2><a href="${pathFor(locale,`/research/${featured.slug}/`)}">${esc(featured.title)}</a></h2><p>${esc(featured.dek)}</p><a class="text-link" href="${pathFor(locale,`/research/${featured.slug}/`)}">${esc(t.readResearch)} <span aria-hidden="true">→</span></a></div><div class="feature-record"><span class="eyebrow">${esc(t.researchRecord)}</span><strong>${featured.authors.map(esc).join(" · ")}</strong><span>${esc(featured.status)}</span><span>${readingTime(featured.body,locale)} ${esc(t.minutesRead)}</span><a href="${pathFor(locale,`/research/${featured.slug}/`)}#evidence-title">${esc(t.evidenceTitle)} ↗</a></div></article>
    </section>
    <section id="latest" class="research-index">
      <div class="section-heading"><h2>${esc(t.latestResearch)}</h2><div class="section-controls">${topicMenu(locale,newestFirst)}<a class="index-link" href="${pathFor(locale,"/research/")}">${esc(t.allResearch)} <span>${newestFirst.length}</span> →</a></div></div>
      <div class="research-grid" data-home-research-grid data-page-size="${pageSize}">${latest.map(item=>articleCard(item,locale)).join("\n")}</div>
      <div class="research-list-footer"><div class="research-pager-shell" data-home-research-pager hidden>
        <span class="research-page-counter" aria-live="polite">${esc(t.pageLabel)} <span data-home-research-current>01</span> / <span data-home-research-total>${String(pageCount).padStart(2,"0")}</span></span>
        <nav class="research-pagination" aria-label="${esc(t.researchPagination)}"><button type="button" data-home-research-action="previous" aria-label="${esc(t.previousPage)}">←</button><div class="research-page-numbers">${Array.from({length:pageCount},(_,index)=>`<button type="button" data-home-research-page="${index+1}" aria-label="${esc(t.pageLabel)} ${index+1}">${index+1}</button>`).join("")}</div><button type="button" data-home-research-action="next" aria-label="${esc(t.nextPage)}">→</button></nav>
      </div></div>
    </section>
  </main>`;
  return shell({locale,title:"Parano1d Lab",description:t.siteDescription,basePath:"/",body,active:"latest",
    schema:{"@context":"https://schema.org","@graph":[
      {"@type":"Organization","@id":`${siteUrl}/#organization`,name:"Parano1d Lab",url:siteUrl,parentOrganization:{"@type":"Organization",name:"Parano1d",url:"https://parano1d.org"}},
      {"@type":"WebSite","@id":`${siteUrl}/#website`,name:t.siteTitle,url:absolute(pathFor(locale,"/")),inLanguage:locale.htmlLang,publisher:{"@id":`${siteUrl}/#organization`}}
    ]}});
}

function archivePage(locale, newestFirst) {
  const t = ui[locale.code];
  const items = [...newestFirst].sort((a,b)=>b.date.localeCompare(a.date));
  const topics = [...new Set(items.map(item=>item.topic))].sort((a,b)=>a.localeCompare(b,locale.dateLocale));
  const body = `<main id="content" class="archive-page">
    <header class="journal-intro"><div><p class="eyebrow">PARANO1D LAB / ${esc(t.archiveNav)}</p><h1>${esc(t.allResearch)}</h1></div><p class="subtitle">${esc(t.archiveLead)}</p></header>
    <form class="archive-controls" role="search" data-archive-controls>
      <label class="archive-search"><span>${esc(t.search)}</span><span class="search-field">${icon("search")}<input type="search" name="q" placeholder="${esc(t.searchPlaceholder)}" autocomplete="off" data-archive-search></span></label>
      <label><span>${esc(t.browseTopics)}</span><select name="topic" data-topic-select><option value="all">${esc(t.allTopics)}</option>${topics.map(topic=>`<option value="${esc(topic)}">${esc(topic)}</option>`).join("")}</select></label>
      <label><span>${esc(t.sortBy)}</span><select name="sort" data-sort-select><option value="newest">${esc(t.newestFirst)}</option><option value="oldest">${esc(t.oldestFirst)}</option></select></label>
    </form>
    <section id="research-results" class="archive-section">
      <div class="section-heading"><h2 data-active-topic data-all-topics="${esc(t.allTopics)}">${esc(t.allTopics)}</h2><span class="result-count" aria-live="polite">${esc(t.articleCount)}: <span data-results-count>${items.length}</span></span></div>
      <div class="archive-list">${items.map((item,index)=>`<article class="archive-row" data-topic="${esc(item.topic)}" data-date="${item.date}" data-search="${esc([item.title,item.dek,item.topic,item.kind,...(item.keywords??[])].join(" "))}">
        <div class="archive-date"><time datetime="${item.date}">${formatDate(item.date,locale)}</time><span>${esc(item.kind)}</span></div>
        <div class="archive-copy"><h2><a href="${pathFor(locale,`/research/${item.slug}/`)}">${esc(item.title)}</a></h2><p>${esc(compactDescription(item.dek,locale))}</p><div class="archive-tags"><a href="?topic=${encodeURIComponent(item.topic)}" data-filter="${esc(item.topic)}">${esc(item.topic)}</a><span>${readingTime(item.body,locale)} ${esc(t.minutesRead)}</span></div></div>
        <a class="archive-arrow" href="${pathFor(locale,`/research/${item.slug}/`)}" aria-label="${esc(t.readArticle)}: ${esc(item.title)}">→</a></article>`).join("\n")}</div>
      <div class="filter-empty" hidden><h3>${esc(t.filterEmpty)}</h3><button type="button" class="button" data-reset-filters>${esc(t.resetFilters)}</button></div>
    </section>
  </main>`;
  return shell({locale,title:t.allResearch,description:t.archiveDescription,basePath:"/research/",body,active:"research"});
}

function evidenceList(item, locale) {
  const t = ui[locale.code];
  return `<aside class="evidence-panel" aria-labelledby="evidence-title"><div><p class="section-index">${esc(t.researchRecord)}</p><h2 id="evidence-title">${esc(t.evidenceTitle)}</h2><p>${esc(t.evidenceLead)}</p></div><div class="evidence-links">${item.evidence.map((entry) => `<a href="${esc(entry.href)}"><span class="evidence-entry">${sourceIcon(entry.href, "evidence-github-icon")}<span><small>${esc(t.evidenceTypes[entry.type] ?? entry.type)}</small><strong>${esc(entry.label)}</strong></span></span><span aria-hidden="true">↗</span></a>`).join("\n")}</div></aside>`;
}

function shareControls(item, locale, basePath) {
  const t = ui[locale.code];
  const canonical = absolute(pathFor(locale, basePath));
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(item.title)}&url=${encodeURIComponent(canonical)}`;
  return `<div class="article-share" aria-label="${esc(t.shareAria)}"><span class="article-share-label">${esc(t.share)}</span><button class="share-action share-action--icon" type="button" data-copy-link="${esc(canonical)}" data-copy-default="${esc(t.copyLink)}" data-copy-success="${esc(t.copied)}" data-copy-failure="${esc(t.copyFailed)}" aria-label="${esc(t.copyAria)}" title="${esc(t.copyLink)}">${linkIcon()}${checkIcon()}<span class="visually-hidden" data-copy-label aria-live="polite">${esc(t.copyLink)}</span></button><a class="share-action" href="${esc(shareUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t.shareXAria)}">${xIcon()}<span>${esc(t.shareX)}</span></a></div>`;
}

function tocFor(html, locale) {
  const t = ui[locale.code];
  const entries = [...html.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map(([,id,text])=>[id,text.replace(/<[^>]+>/g,"")]);
  if (entries.length < 2) return "";
  return `<aside class="article-aside"><details class="toc-panel"><summary>${esc(t.onThisPage)} <span aria-hidden="true">+</span></summary><nav class="article-toc" aria-label="${esc(t.onThisPage)}"><ol>${entries.map(([id,text])=>`<li><a href="#${esc(id)}">${text}</a></li>`).join("")}</ol><a class="toc-evidence" href="#evidence-title">${esc(t.evidenceTitle)} ↗</a></nav></details></aside>`;
}

function articlePage(item, index, locale, newestFirst) {
  const t = ui[locale.code];
  const chronological = [...newestFirst].sort((a,b)=>b.date.localeCompare(a.date));
  const position = chronological.findIndex(entry=>entry.slug===item.slug);
  const older = chronological[position + 1];
  const newer = chronological[position - 1];
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
    dateModified: item.updated ?? item.date,
    url: canonical,
    mainEntityOfPage: canonical,
    inLanguage: locale.htmlLang,
    isAccessibleForFree: true,
    ...(item.keywords?.length ? { keywords: item.keywords } : {}),
    ...(item.evidence.some((entry) => entry.type === "Paper")
      ? { citation: item.evidence.filter((entry) => entry.type === "Paper").map((entry) => entry.href) }
      : {}),
    author: item.authors.map((name) => ({ "@type": name === "Parano1d Lab" ? "Organization" : "Person", name })),
    publisher: { "@type": "Organization", name: "Parano1d Lab", url: siteUrl },
    image: absolute(imagePath),
    about: item.topic
  };
  const flagship = item.layout === "flagship";
  const pdf = item.evidence.find((entry) => /\.pdf(?:[?#]|$)/i.test(entry.href));
  const hero = `<header class="article-heading">
    <p class="article-breadcrumb"><a href="${pathFor(locale,"/research/")}">${esc(t.allResearch)}</a><span aria-hidden="true">/</span><a href="${pathFor(locale,"/research/")}?topic=${encodeURIComponent(item.topic)}">${esc(item.topic)}</a></p>
    <p class="article-kicker"><span class="type-label">${esc(item.kind)}</span><span>${esc(item.status)}</span></p>
    <h1>${esc(item.title)}</h1><p class="subtitle">${esc(item.dek)}</p>
    <div class="article-byline"><p><strong>${item.authors.map(esc).join(" · ")}</strong><time datetime="${item.date}">${formatDate(item.date,locale)}</time><span>${readingTime(item.body,locale)} ${esc(t.minutesRead)}</span></p><div class="article-tools">${pdf?`<a class="button" href="${esc(pdf.href)}">${esc(t.originalPdf)}</a>`:""}<button type="button" class="button" data-print>${esc(t.printPdf)}</button></div></div>
  </header>`;
  const body = `<main id="content" class="article-page">
    ${hero}
    <div class="article-layout">
      ${tocFor(item.body, locale)}
      <article class="article-body${flagship ? " article-body--flagship" : ""}">${flagship || item.showAbstract === false ? "" : `<div class="article-abstract"><span>${esc(t.abstract)}</span><p>${esc(item.abstract)}</p></div>`}${item.body}</article>
    </div>
    ${evidenceList(item, locale)}
    <div class="article-actions"><a href="${pathFor(locale, "/research/")}">← ${esc(t.backResearch)}</a>${pdf ? `<a class="paper-download" href="${esc(pdf.href)}">${esc(t.originalPdf)}</a>` : ""}${shareControls(item, locale, basePath)}</div>
    <div role="navigation" class="article-next" aria-label="${esc(t.adjacent)}">${older ? `<a href="${pathFor(locale, `/research/${older.slug}/`)}"><small>${esc(t.earlier)}</small><strong>${esc(older.shortTitle)}</strong></a>` : "<span></span>"}${newer ? `<a href="${pathFor(locale, `/research/${newer.slug}/`)}"><small>${esc(t.later)}</small><strong>${esc(newer.shortTitle)}</strong></a>` : "<span></span>"}</div>
  </main>`;
  return shell({
    title: seoTitle,
    description: seoDescription,
    keywords: item.keywords,
    locale,
    basePath,
    body,
    active: "research",
    type: "article",
    schema: articleSchema,
    article: item,
    imagePath,
    imageAlt: item.ogAlt ?? item.title,
    imageWidth: item.ogWidth ?? 1200,
    imageHeight: item.ogHeight ?? 630
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
  const pages = [{ basePath: "/", available: locales }, { basePath: "/research/", available: locales },
    ...baseData.map((item) => ({ basePath: `/research/${item.slug}/`, available: localesFor(item) }))];
  const newestDate = baseData.map((item) => item.updated ?? item.date).sort().at(-1);
  const dates = new Map(baseData.map((item) => [`/research/${item.slug}/`, item.updated ?? item.date]));
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${pages.flatMap(({ basePath, available }) => available.map((locale) => `<url><loc>${absolute(pathFor(locale, basePath))}</loc><lastmod>${dates.get(basePath) ?? newestDate}</lastmod>${available.map((alternate) => `<xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${absolute(pathFor(alternate, basePath))}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(pathFor(defaultLocale, basePath))}"/></url>`)).join("")}</urlset>`;
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

function articleRedirect(item, locale) {
  const target = absolute(pathFor(locale, `/research/${item.slug}/`));
  return `<!doctype html>
<html lang="${locale.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="${target}">
  <meta http-equiv="refresh" content="0;url=${target}">
  <title>${esc(item.title)}</title>
</head>
<body><p><a href="${target}">${esc(item.title)}</a></p></body>
</html>`;
}

await installKatexAssets();
for (const locale of locales) {
  const newestFirst = articleSets.get(locale.code);
  await emit(outputPath(locale, "/"), homePage(locale, newestFirst));
  await emit(outputPath(locale, "/research/"), archivePage(locale, newestFirst));
  for (const [index, item] of newestFirst.entries()) {
    await emit(outputPath(locale, `/research/${item.slug}/`), articlePage(item, index, locale, newestFirst));
    for (const alias of item.aliases ?? []) {
      if (!/^[a-z0-9-]+$/.test(alias) || baseData.some((article) => article.slug === alias)) {
        throw new Error(`Invalid article alias: ${alias}`);
      }
      await emit(outputPath(locale, `/research/${alias}/`), articleRedirect(item, locale));
    }
  }
  await emit(outputPath(locale, "/feed.xml"), rss(locale, newestFirst));
  const t = ui[locale.code];
  await emit(outputPath(locale, "/404.html"), shell({ locale, title: t.notFoundTitle, description: t.notFoundText, basePath: "/404.html", body: `<main id="content" class="not-found"><span>404</span><h1>${esc(t.notFoundHeading)}</h1><p>${esc(t.notFoundText)}</p><a class="button button--primary" href="${pathFor(locale, "/")}">${esc(t.notFoundAction)}</a></main>`, indexable: false }));
}
await emit("sitemap.xml", sitemap());
await emit("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
console.log(`Built ${baseData.length} research articles with their available language editions for ${siteUrl}`);
