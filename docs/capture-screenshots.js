const { chromium } = require('playwright');
const path = require('path');

const CHROME =
  process.env.CHROME ||
  '/tmp/cursor-sandbox-cache/a9ba1c8f1439f9025561ead42b38cae3/playwright/chromium-1228/chrome-linux64/chrome';
const OUT = path.join(__dirname, 'screenshots');

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });

  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(OUT, 'full-interface.png'), fullPage: false });

  const menu = await page.$('.menu');
  await menu.screenshot({ path: path.join(OUT, 'controls-panel.png') });

  const canvas = await page.$('#canvas1');
  await canvas.screenshot({ path: path.join(OUT, 'flock-canvas.png') });

  // Tight flock: high cohesion + alignment, low separation
  await page.evaluate(() => {
    const set = (id, value) => {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };
    set('cohesionSlider', 28);
    set('separationSlider', 8);
    set('alignmentSlider', 25);
    set('windSlider', 15);
    set('speedSlider', 80);
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, 'tight-flock.png'), fullPage: false });

  // Wind-heavy demo
  await page.evaluate(() => {
    const set = (id, value) => {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };
    set('cohesionSlider', 10);
    set('separationSlider', 20);
    set('alignmentSlider', 10);
    set('windSlider', 90);
    set('speedSlider', 180);
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'wind-heavy.png'), fullPage: false });

  await browser.close();
  console.log('screenshots saved to', OUT);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
