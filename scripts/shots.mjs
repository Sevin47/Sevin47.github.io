#!/usr/bin/env node
// Recaptures the card screenshots by driving a real Chrome against the live
// builds. Run it when a game has changed enough that its shot is stale:
//
//   npm install && npm run shots
//
// Each game needs its own nudging to reach a frame worth showing, which is what
// the `drive` function on each target does. Pass a name to do just one:
//
//   npm run shots -- orebound

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots');
const W = 1280, H = 720;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const clickText = (page, re) => page.evaluate(src => {
  const el = [...document.querySelectorAll('button,[role=button]')]
    .find(e => new RegExp(src, 'i').test(e.textContent || ''));
  if (el) el.click();
  return !!el;
}, re.source);

const TARGETS = [
  {
    name: 'orebound',
    url: 'https://sevin47.github.io/orebound/',
    // The start menu ignores synthetic clicks on NEW GAME. Enter dismisses it.
    async drive(page) {
      await sleep(3500);
      await page.keyboard.press('Enter');
      await sleep(2500);
      await page.mouse.click(640, 360);
      await sleep(1000);
      await page.keyboard.press('KeyA');   // auto-fire
      await sleep(40000);                  // let it dig a real cavern
    },
  },
  {
    name: 'dumb-clanker',
    url: 'https://sevin47.github.io/dumb-clanker/',
    async drive(page) { await sleep(5000); },
  },
  {
    name: 'plot-twist',
    url: 'https://sevin47.github.io/Plot-Twist-World/',
    // Title screen only. Play now claims a real tile on the live map.
    async drive(page) { await sleep(7000); },
  },
  {
    name: 'ember-line',
    url: 'https://sevin47.github.io/ember-line/',
    async drive(page) {
      await sleep(4500);
      await page.mouse.click(640, 274);            // first incident in the list
      await sleep(2500);
      await clickText(page, /assume command/);
      await sleep(5000);
      await page.mouse.click(640, 360);
      await page.keyboard.press('KeyF');           // drop the fuel overlay
      await sleep(800);
      await clickText(page, /^8/);                 // 8x speed
      await sleep(75000);                          // burn long enough to see
    },
  },
  {
    name: 'roadworks',
    url: 'https://sevin47.github.io/roadworks/',
    // Hide the signup modal rather than signing up, which would put a fake
    // manager on the live leaderboard.
    async drive(page) {
      await sleep(9000);
      await page.evaluate(() => { const b = document.querySelector('#boot'); if (b) b.style.display = 'none'; });
      await sleep(4000);
    },
  },
  {
    name: 'orrery',
    url: 'https://sevin47.github.io/orrery/',
    // Renders an empty galaxy with no data, so seed a demo one. This only ever
    // touches this throwaway browser profile, never real Orrery data.
    async seed(page) {
      const worlds = [
        ['Route Survey', 11, 3], ['Bridge Inspections', 8, 2], ['Corridor Study', 5, 4],
        ['Drainage Inventory', 14, 1], ['Signal Retiming', 3, 5], ['Culvert Mapping', 9, 2],
        ['Pavement Condition', 6, 3], ['Sign Inventory', 2, 4],
      ];
      await page.evaluateOnNewDocument(ws => {
        const uid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
        });
        const now = Date.now(), DAY = 86400000;
        const projects = ws.map(([name, done, open], i) => {
          const tasks = [];
          for (let k = 0; k < done; k++) tasks.push({ id: uid(), title: `Task ${k + 1}`, notes: '', due: null,
            important: false, done: true, discipline: null, createdAt: now - (60 - k) * DAY, completedAt: now - (40 - k) * DAY });
          for (let k = 0; k < open; k++) tasks.push({ id: uid(), title: `Open item ${k + 1}`, notes: '', due: null,
            important: k === 0, done: false, discipline: null, createdAt: now - (10 - k) * DAY, completedAt: null });
          return { id: uid(), name, desc: '', origin: null, createdAt: now - (70 - i) * DAY, tasks };
        });
        localStorage.setItem('orrery_galaxy_v1', JSON.stringify({ projects, originOptions: [], disciplineOptions: [] }));
      }, worlds);
    },
    async drive(page) { await sleep(9000); },
  },
];

const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
const wanted = only.length ? TARGETS.filter(t => only.includes(t.name)) : TARGETS;
if (!wanted.length) {
  console.error(`No target matched. Known: ${TARGETS.map(t => t.name).join(', ')}`);
  process.exit(1);
}

let executablePath = null;
for (const c of CHROME_CANDIDATES) {
  try { await fs.access(c); executablePath = c; break; } catch {}
}
if (!executablePath) {
  console.error('No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: [`--window-size=${W},${H}`, '--hide-scrollbars', '--no-sandbox',
         '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

let failed = 0;
for (const t of wanted) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  try {
    if (t.seed) await t.seed(page);
    await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await t.drive(page);
    await page.screenshot({ path: path.join(OUT, `${t.name}.png`) });
    console.log(`  ok    ${t.name}`);
  } catch (e) {
    console.error(`  FAIL  ${t.name}: ${e.message.slice(0, 120)}`);
    failed++;
  }
  await page.close();
}

await browser.close();
console.log(failed ? `${failed} failed. Check the images before committing.` : 'All shots captured. Check them before committing.');
process.exit(failed ? 1 : 0);
