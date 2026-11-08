# Parano1d Lab Research

Source for [lab.parano1d.org](https://lab.parano1d.org), the static research journal of Parano1d Lab. The v2 series covers capacity and consensus, tokenomics, and proof-native contracts, with independently written English, Russian and Chinese editions.

## Build

```sh
npm run build
npm run check
```

The generated site is written directly into the repository root. Serve it
locally with:

```sh
npm run serve
```

Then open <http://localhost:4173>.

## Content model

- `content/research.json` contains article metadata and evidence links.
- `content/research/*.html` contains article bodies.
- `scripts/build.mjs` creates the home page, archive, article pages, RSS feed,
  sitemap and structured metadata.
- `assets/site.css` defines the technical journal, reading layout and print styles.
- `assets/theme.js` restores the selected theme before the page paints.
- `assets/site.js` implements search, navigation, filters, contents and print actions.
- `assets/fonts/` contains self-hosted IBM Plex fonts and their OFL licenses.
- `papers/` contains publication files linked by the journal.

The journal uses high-contrast light and dark themes, IBM Plex Mono headings
and IBM Plex Sans reading text. The selected theme persists across pages.
A compact header provides the journal, complete archive, documentation,
source selector, language switcher and search. Search works from any page
and supports keyboard navigation. The archive combines text search, topic
filtering and chronological sorting through shareable URLs.

Article text uses a centered reading column. Contents stay in the right
margin on wide screens and collapse above the text on smaller screens.
The localized Print / Save PDF action opens the browser print dialog.
A4 styles retain the text, mathematics, scientific figures and evidence.
Original publication PDFs remain separate downloads. Scientific article
bodies, citations, translations and publication files are preserved.

To add a publication, add its metadata and HTML fragment, then rebuild. Keep
benchmark conditions next to benchmark numbers and distinguish production
results from preserved experiments.

Articles use all three editions by default. Set `locales: ["en"]` in an
article's metadata when its published text is available in English only.
Its article, search, feed and sitemap entries use the available edition.
The article language menu links to the localized archive when that edition
has no translation. Existing translated articles retain their direct links.

When an article moves, its `aliases` list creates a localized `noindex` redirect
for each previous slug. Only the current address appears in RSS and the sitemap.
Article social cards use `assets/og/SLUG.png`; ONETHICS uses the article's
illustration without text overlays.

The build maps owned GitHub URLs to Forgejo, including commit-pinned source files, clone commands and evidence links. Article source records and external research citations remain unchanged. The header Source selector lists GitHub (`ignotusnemo`) first, followed by canonical Forgejo and the GitLab and GitHub (`proof-native`) mirrors.
The three historical AuthStream experiment commits explicitly listed in
`scripts/source-links.mjs` retain their GitHub URLs at the maintainer's request.

## Mathematical notation

Article sources use TeX inside explicit math elements:

```html
<math-inline>Q^2\varepsilon</math-inline>

<math-block>
\varepsilon_{\mathrm{FS}}(Q)
\le Q^2\varepsilon_{\mathrm{IOP}} + \frac{Q^3}{2^\lambda}
</math-block>
```

The build renders these elements to static KaTeX HTML and MathML and fails on
invalid TeX. No browser-side math renderer or external CDN is required.
