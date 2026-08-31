#!/usr/bin/env node
// Regenerates the project rows in index.html from data/projects.json plus live
// GitHub metadata. Only the block between the PROJECTS markers is touched, so
// everything else in index.html stays hand-edited.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const START = '<!-- PROJECTS:START -->';
const END = '<!-- PROJECTS:END -->';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ago = iso => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30.44);
  if (months < 12) return months === 1 ? 'last month' : `${months} months ago`;
  const years = Math.round(days / 365.25);
  return years === 1 ? 'last year' : `${years} years ago`;
};

async function repoMeta(owner, repo) {
  const headers = { 'accept': 'application/vnd.github+json', 'user-agent': 'sevin47-hub-build' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!r.ok) { console.warn(`  ! ${repo}: GitHub API ${r.status}`); return {}; }
    const j = await r.json();
    return { pushed: j.pushed_at, description: j.description };
  } catch (e) {
    console.warn(`  ! ${repo}: ${e.message}`);
    return {};
  }
}

// Only report a site as down after several consecutive failures. A single
// blip used to be enough to stamp a false "not responding" on a live game.
async function isLive(url, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 15000);
      // GET, not HEAD: some hosts answer HEAD differently or not at all.
      const r = await fetch(url, { redirect: 'follow', signal: ctl.signal,
        headers: { 'user-agent': 'sevin47-hub-build' } });
      clearTimeout(timer);
      if (r.ok) return true;
      console.warn(`  . ${url} attempt ${i}: HTTP ${r.status}`);
    } catch (e) {
      console.warn(`  . ${url} attempt ${i}: ${e.name === 'AbortError' ? 'timed out' : e.message}`);
    }
    if (i < attempts) await new Promise(r => setTimeout(r, 3000 * i));
  }
  return false;
}

function card(p, i, meta) {
  const n = String(i + 1).padStart(2, '0');
  const updated = ago(meta.pushed);
  const stamp = updated ? `\n        <p class="stamp">Updated ${esc(updated)}</p>` : '';
  const dead = meta.live === false
    ? `\n        <p class="stamp offline">The live build is not responding right now.</p>` : '';
  return `    <article class="project">
      <a class="shot" href="${esc(p.page)}"><img src="${esc(p.shot)}" alt="${esc(p.alt)}" width="1280" height="720" loading="lazy"></a>
      <div>
        <p class="num">${n}</p>
        <h2><a href="${esc(p.page)}">${esc(p.title)}</a></h2>
        <p class="blurb">${esc(p.blurb)}</p>
        <p class="kind">${esc(p.kind)}</p>${stamp}${dead}
        <div class="links">
          <a class="play" href="${esc(p.live)}">${esc(p.cta)}</a>
          <a class="quiet" href="${esc(p.page)}">Build notes</a>
          <a class="quiet" href="https://github.com/${esc(p.ownerRepo)}">Source</a>
        </div>
      </div>
    </article>`;
}

const data = JSON.parse(await fs.readFile(path.join(ROOT, 'data/projects.json'), 'utf8'));
const owner = data.owner;

console.log(`Building ${data.projects.length} project rows`);
const cards = [];
for (const [i, p] of data.projects.entries()) {
  const meta = await repoMeta(owner, p.repo);
  // Some destinations (the RuneLite plugin hub) answer 404 to a plain HTTP
  // client even when the page is fine, so they opt out of the check.
  meta.live = p.checkLive === false ? null : await isLive(p.live);
  p.ownerRepo = `${owner}/${p.repo}`;
  console.log(`  ${p.title.padEnd(24)} pushed ${ago(meta.pushed) ?? '?'}, live ${meta.live === null ? 'not checked' : meta.live ? 'yes' : 'NO'}`);
  cards.push(card(p, i, meta));
}

const indexPath = path.join(ROOT, 'index.html');
const html = await fs.readFile(indexPath, 'utf8');
const a = html.indexOf(START), b = html.indexOf(END);
if (a === -1 || b === -1) {
  console.error(`index.html is missing ${START} / ${END} markers`);
  process.exit(1);
}

const next = html.slice(0, a + START.length) + '\n\n' + cards.join('\n\n') + '\n\n' + html.slice(b);
if (next === html) {
  console.log('No change.');
} else {
  await fs.writeFile(indexPath, next);
  console.log('index.html updated.');
}
