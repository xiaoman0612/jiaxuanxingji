import { createRequire } from 'node:module';
const require = createRequire('C:/Users/31957/.dsh/profiles/web/package.json');
const { chromium } = require('playwright');
import path from 'node:path';

const FILE = 'file:///D:/ds%20workpart/%E7%A8%BC%E8%BD%A9%E8%A1%8C%E8%BF%B9/index.html';
const OUT = path.resolve('_build/qa');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

await page.goto(FILE, { waitUntil: 'load' });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, 'file-splash.png') });
console.log('TITLE', await page.title());
console.log('SPLASH_HIDDEN', await page.locator('#splash').evaluate((el) => el.hidden));
console.log('MAP_NODES', await page.locator('.loc').count());

await page.locator('#btn-enter').click();
await page.waitForTimeout(1300);
await page.screenshot({ path: path.join(OUT, 'file-map.png') });
console.log('MAP_PATH_COUNT', await page.locator('#map path').count());

await page.locator('.loc[data-id="eshan"] .loc-dot').click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: '先读原词', exact: true }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, 'file-poem.png') });
await page.locator('#modal-poem .modal-close').click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: '进入互动叙事', exact: true }).click();
await page.waitForTimeout(2600);
await page.screenshot({ path: path.join(OUT, 'file-rpg.png') });
console.log('RPG_VISIBLE', await page.locator('#rpg').isVisible());
console.log('ERRORS', errors.length ? errors.join(' || ') : 'none');
await browser.close();
