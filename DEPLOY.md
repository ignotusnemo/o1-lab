# Deployment

The deploy target is the repository root. No application server, database or
environment variables are required.

1. Run `npm run build && npm run check`.
2. Publish the repository root at `research.parano1d.org`.
3. Keep `papers/FROST_GKR.pdf` at its generated public URL.

## FROST site migration

After the new domain is live, configure permanent redirects at the existing
`frost.noid.network` host:

```text
https://frost.noid.network/              301 -> https://research.parano1d.org/research/frost-gkr-global-trace-protocol/
https://frost.noid.network/FROST_GKR.pdf 301 -> https://research.parano1d.org/papers/FROST_GKR.pdf
```

Use host-level redirects rather than a JavaScript or meta-refresh page. Keep
the old hostname active long enough for search engines and existing citations
to follow the permanent redirect.
