import { createRequire } from 'node:module';
const require = createRequire('C:/Users/31957/.dsh/profiles/web/package.json');
const { chromium } = require('playwright');
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.resolve('_build/qa');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:7801/?play=' + Date.now();

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.locator('#btn-enter').click();
await page.waitForTimeout(1200);
await page.locator('.loc[data-id="eshan"] .loc-dot').click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: '进入互动叙事', exact: true }).click();
await page.waitForTimeout(2600);

const seen = [];
const chapters = new Set();
let steps = 0;
let ended = false;

for (let i = 0; i < 500; i++) {
  if (await page.locator('#rpg-ending:not([hidden])').count()) { ended = true; break; }

  const poemVisible = await page.locator('#rpg-poem-panel:not([hidden])').count();
  if (poemVisible) {
    await page.waitForTimeout(2400);
    await page.locator('#rpg-poem-panel').click();
    await page.waitForTimeout(500);
    continue;
  }

  const choices = page.locator('#rpg-choices:not([hidden]) .choice-btn');
  const n = await choices.count();
  if (n > 0) {
    await choices.first().click();
    await page.waitForTimeout(500);
    steps++;
    continue;
  }

  const txt = (await page.locator('#rpg-text').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 24);
  const flag = (await page.locator('.rpg-chapter-flag').innerText().catch(() => '')).replace(/\s+/g, '');
  if (flag) chapters.add(flag);
  if (txt && seen[seen.length - 1] !== txt) seen.push(txt);

  await page.locator('#rpg-dialog').click();
  await page.waitForTimeout(260);
  steps++;
  if (steps > 420) break;
}

await page.screenshot({ path: path.join(OUT, 'play-end.png') });
console.log('STEPS', steps, 'ENDED', ended);
console.log('CHAPTERS', Array.from(chapters).join(' | '));
console.log('LINES', seen.length);
console.log(seen.slice(0, 12).join('\n'));
console.log('...');
console.log(seen.slice(-6).join('\n'));
await browser.close();
