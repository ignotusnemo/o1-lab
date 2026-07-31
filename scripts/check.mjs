import { readFile, readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

function targetFor(href) {
  const clean = href.split(/[?#]/)[0];
  if (!clean || !clean.startsWith("/") || clean.startsWith("//")) return null;
  if (clean.endsWith("/")) return join(root, clean, "index.html");
  return join(root, clean);
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!title) errors.push(`${file}: missing title`);
  if (!canonical?.startsWith("https://research.parano1d.org/")) errors.push(`${file}: invalid canonical`);
  if (title) {
    if (titles.has(title)) errors.push(`${file}: duplicate title with ${titles.get(title)}`);
    titles.set(title, file);
  }
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const target = targetFor(match[1]);
    if (!target) continue;
    try { await stat(target); } catch { errors.push(`${file}: broken internal link ${match[1]}`); }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML pages and ${files.length} static files`);

