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

    // 1. Signup/login screen
    console.log('Taking login screen screenshot...');
    await page.goto('http://localhost:4173#/login', { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(outDir, '01_login_screen.png') });

    // Do login
    console.log('Logging in...');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.type('#email', 'NGENYABRAHAM57@GMAIL.COM');
    await page.type('#password', 'ngeny@92A');
    await page.click('#loginBtn');
    
    // Wait for redirect to happen
    await delay(4000);
    
    // 2. Business workspace onboarding
    // Navigate explicitly to onboarding to show the screen
    console.log('Checking onboarding...');
    await page.goto('http://localhost:4173#/onboarding', { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(outDir, '02_onboarding.png') });
    
    try {
       // Attempt to fill onboarding if the user has no business yet
       await page.type('#businessName', 'Abraham Plumbing Co');
       await page.click('#onboardingBtn');
       await delay(3000);
    } catch (e) {
       console.log('Onboarding skipped or already completed.');
    }

    // 3. Production dashboard
    console.log('Taking production dashboard screenshot...');
    await page.goto('http://localhost:4173#/dashboard', { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(outDir, '03_production_dashboard.png') });

    // 4. Empty production views (Jobs)
    console.log('Taking empty production views screenshot...');
    await page.goto('http://localhost:4173#/jobs', { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(outDir, '04_empty_production_jobs.png') });

    // 5. Settings showing Production Mode
    console.log('Taking settings production mode screenshot...');
    await page.goto('http://localhost:4173#/settings', { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(outDir, '05_settings_production_mode.png') });

    // 6. Demo mode still working logged out
    console.log('Logging out...');
    await page.evaluate(() => {
        if (window.handleLogout) {
            window.handleLogout();
        } else {
            // fallback if function isn't bound for some reason
            localStorage.clear();
            sessionStorage.clear();
        }
    });
    await delay(3000);
    
    console.log('Taking demo mode dashboard screenshot...');
    await page.goto('http://localhost:4173#/dashboard', { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(outDir, '06_demo_mode_dashboard.png') });

    await browser.close();
    console.log('Done.');
}

run().catch(console.error);
