const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = 'C:\\Users\\ngeny\\.gemini\\antigravity\\brain\\e18c511a-d7fc-4b18-834c-ce8374f77a6a';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Taking homepage screenshot...');
    await page.goto('https://etalehub.com', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(outDir, 'homepage.png') });

    console.log('Taking dashboard screenshot...');
    await page.goto('https://app.etalehub.com#/dashboard', { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: path.join(outDir, 'dashboard.png') });

    console.log('Taking command centre before screenshot...');
    await page.goto('https://app.etalehub.com#/command', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#chatInput', { timeout: 10000 });
    await delay(1000);
    await page.screenshot({ path: path.join(outDir, 'command_centre_before.png') });

    console.log('Running Mrs Smith workflow...');
    await page.type('#chatInput', 'I finished Mrs Smith’s boiler service. She paid £180 by card. Book her annual service.');
    await page.click('#chatSubmitBtn');
    
    // Wait for AI to finish (assuming it takes a few seconds)
    await delay(3000);
    console.log('Taking command centre after screenshot...');
    await page.screenshot({ path: path.join(outDir, 'command_centre_after.png') });

    console.log('Taking jobs view screenshot...');
    await page.goto('https://app.etalehub.com#/jobs', { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: path.join(outDir, 'jobs_view.png') });

    console.log('Taking customers view screenshot...');
    await page.goto('https://app.etalehub.com#/customers', { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: path.join(outDir, 'customers_view.png') });

    console.log('Taking money view screenshot...');
    await page.goto('https://app.etalehub.com#/money', { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: path.join(outDir, 'money_view.png') });

    console.log('Taking calendar view screenshot...');
    await page.goto('https://app.etalehub.com#/calendar', { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: path.join(outDir, 'calendar_view.png') });

    console.log('Taking settings view screenshot...');
    await page.goto('https://app.etalehub.com#/settings', { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: path.join(outDir, 'settings_view.png') });

    await browser.close();
    console.log('Done.');
}

run().catch(console.error);
