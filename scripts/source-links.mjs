// These experimental commits are intentionally kept on GitHub, not republished.
const preservedCommits = new Set([
  'https://github.com/ignotusnemo/parano1d/commit/93bb9d32',
  'https://github.com/ignotusnemo/parano1d/commit/4bc81249',
  'https://github.com/ignotusnemo/parano1d/commit/63949ac1'
]);

// Rewrite owned source links when publishing; keep article source records intact.
export function sourceLinks(text) {
  return text
    .replace(/https:\/\/github\.com\/ignotusnemo(?=[/#?\s)"'<>]|$)[^\s)"'<>]*/g, (url) => {
      if (preservedCommits.has(url.split(/[?#]/)[0])) return url;
      return url
        .replace(/\/([\w.-]+)\/(?:blob|tree)\/([\w.-]+)(?=[/#?]|$)/,
          (_, repo, ref) => `/${repo}/src/${/^[a-f0-9]{7,40}$/i.test(ref) ? 'commit' : /^v\d/.test(ref) ? 'tag' : 'branch'}/${ref}`)
        .replace('https://github.com/ignotusnemo', 'https://git.parano1d.org/ignotusnemo');
    })
    .replace(/(\[[^\]\n]*)GitHub(?=[^\]\n]*\]\(https:\/\/git\.parano1d\.org\/)/g, '$1Forgejo');
}
