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
- `assets/site.css` and `assets/site.js` are the complete presentation layer.
- `papers/` contains publication files linked by the journal.

To add a publication, add its metadata and HTML fragment, then rebuild. Keep
benchmark conditions next to benchmark numbers and distinguish production
results from preserved experiments.

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
