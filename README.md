# O(1) Lab Research

Source for [research.parano1d.org](https://research.parano1d.org), the static
research journal of O(1) Lab.

The site publishes papers, protocol notes, engineering studies and negative
results produced while building ParanO(1)d. Every article is a standalone
static page. There is no database, server-side runtime or client-side content
API.

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
  sitemap, manifest and structured metadata.
- `assets/site.css` and `assets/site.js` are the complete presentation layer.
- `papers/` contains publication files linked by the journal.

To add a publication, add its metadata and HTML fragment, then rebuild. Keep
benchmark conditions next to benchmark numbers and distinguish production
results from preserved experiments.

