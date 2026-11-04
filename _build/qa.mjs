import { createRequire } from 'node:module';
const require = createRequire('C:/Users/31957/.dsh/profiles/web/package.json');
const { chromium } = require('playwright');
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.resolve('_build/qa');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:7801/?qa=' + Date.now();

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const log = [];
async function shot(name) {
  const p = path.join(OUT, name + '.png');
  await page.screenshot({ path: p });
  log.push(name);
  console.log('SHOT', name);
}
async function wait(ms) { await page.waitForTimeout(ms); }

await page.goto(URL, { waitUntil: 'networkidle' });
await wait(600);
await shot('01-splash');

await page.locator('#btn-enter').click();
await wait(1300);
await shot('02-map');

await page.locator('.loc[data-id="eshan"] .loc-dot').click();
await wait(900);
await shot('03-location');

// 词作弹窗
await page.getByRole('button', { name: '先读原词', exact: true }).click();
await wait(1300);
await shot('04-poem');
await page.locator('.poem-line[data-i="4"]').click();
await wait(700);
await shot('04b-poem-line');
await page.locator('#modal-poem .modal-close').click();
await wait(600);

// 进入 RPG
await page.getByRole('button', { name: '进入互动叙事', exact: true }).click();
await wait(500);
await shot('05-chapter-card');
await wait(2200);
await shot('06-node-s0');

// 对话推进若干次
for (let i = 0; i < 5; i++) { await page.locator('#rpg-dialog').click(); await wait(700); }
await shot('07-dialog-mid');

// 第一折：柴门，陈亮立绘（door）
await page.evaluate(() => window.XQJ.RPG.jump('s9'));
await wait(2600);
await shot('07c-door');

// 第二折：鹅湖，陈亮立绘
await page.evaluate(() => window.XQJ.RPG.jump('s13'));
await wait(2600);
await shot('07b-ehu');

// 跳章：第四折（连营）
await page.evaluate(() => window.XQJ.RPG.jump('s30'));
await wait(2600);
await shot('08-camp');

// 第五折（沙场）
await page.evaluate(() => window.XQJ.RPG.jump('s38'));
await wait(2600);
await shot('09-battle');

// 选项（s42 三选一）
await page.evaluate(() => window.XQJ.RPG.jump('s42'));
await wait(2600);
await shot('10-choices');

// 词卷：从第六折开头推进，确保背景/章回正确
await page.evaluate(() => window.XQJ.RPG.jump('s47'));
await wait(2600);
for (let i = 0; i < 14; i++) {
  if (await page.locator('#rpg-poem-panel:not([hidden])').count()) break;
  await page.locator('#rpg-dialog').click();
  await wait(450);
}
await wait(2600);
await shot('11-poem-scroll');
await page.locator('#rpg-poem-panel').click();
await wait(1200);
await shot('12-after-poem');

// 回顾（在结局前）
const histBtn = page.locator('[data-rpg="history"]');
if (await histBtn.count()) { await histBtn.first().click(); await wait(700); await shot('13-history'); await page.locator('[data-rpg="close-history"]').first().click(); await wait(500); }

// 结局
await page.evaluate(() => window.XQJ.RPG.jump('END'));
await wait(1400);
await shot('14-ending');

// 1920 投影视图
const page2 = await ctx.newPage();
await page2.setViewportSize({ width: 1920, height: 1080 });
await page2.goto(URL, { waitUntil: 'networkidle' });
await page2.waitForTimeout(500);
await page2.locator('#btn-enter').click();
await page2.waitForTimeout(1400);
await page2.screenshot({ path: path.join(OUT, '15-map-1920.png') });
console.log('SHOT 15-map-1920');

// 导览弹窗
await page.evaluate(() => window.XQJ.RPG.close());
await wait(600);
await page.getByRole('button', { name: '导览', exact: true }).click();
await wait(800);
await shot('16-guide');
await page.locator('#modal-guide .modal-close').click();
await wait(400);

// 带湖：多条事件
await page.locator('.loc[data-id="daifu"] .loc-dot').click();
await wait(800);
await shot('17-daifu');

console.log('DONE', log.length + 1);
await browser.close();
