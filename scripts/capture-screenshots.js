import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve(process.cwd(), 'docs/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('Launching Chrome to capture real application screens...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  // Step 1: Open admin and trigger official talk demo on stage-1
  console.log('Triggering authentic demo talk on stage-1...');
  const initPage = await browser.newPage();
  await initPage.goto('https://localhost:3000/?view=admin', { waitUntil: 'networkidle2', timeout: 15000 });
  await initPage.evaluate(async () => {
    try {
      await fetch('/api/stages/stage-1/demo/talk-es-pelado', { method: 'POST' });
    } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 3500));
  await initPage.close();

  const views = [
    {
      name: '01_control_room_admin.png',
      url: 'https://localhost:3000/?view=admin',
      width: 1440,
      height: 900
    },
    {
      name: '02_stage_kiosk_subtitles.png',
      url: 'https://localhost:3000/?view=kiosk&lang=en',
      width: 1440,
      height: 900
    },
    {
      name: '03_audience_mobile.png',
      url: 'https://localhost:3000/?view=audience&lang=es',
      width: 412,
      height: 892,
      isMobile: true
    },
    {
      name: '04_emergency_mobile_mic.png',
      url: 'https://localhost:3000/?view=mic',
      width: 412,
      height: 892,
      isMobile: true
    }
  ];

  for (const v of views) {
    console.log(`Capturing ${v.name}...`);
    const page = await browser.newPage();
    await page.setViewport({
      width: v.width,
      height: v.height,
      isMobile: !!v.isMobile,
      deviceScaleFactor: 2
    });

    try {
      await page.goto(v.url, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));
      const targetPath = path.join(outDir, v.name);
      await page.screenshot({ path: targetPath, fullPage: false });
      console.log(`Saved: ${targetPath}`);
    } catch (e) {
      console.error(`Failed ${v.name}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('All screens captured successfully!');
}

run().catch(console.error);
