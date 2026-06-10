const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Enable request interception to log redirects cleanly
  await page.setRequestInterception(true);
  page.on('request', request => {
    request.continue();
  });
  
  page.on('response', response => {
    if ([301, 302, 307, 308].includes(response.status())) {
      console.log(`REDIRECT: ${response.url()} -> ${response.headers().location}`);
    } else if (response.url().includes('/api/auth/')) {
      console.log(`AUTH RESP: ${response.status()} ${response.url()}`);
    }
  });

  console.log("Navigating to login...");
  await page.goto('http://localhost:3000/login');
  
  console.log("Typing credentials...");
  await page.type('input[name="email"]', 'josseth@example.com');
  await page.type('input[name="password"]', 'password123');
  
  console.log("Clicking submit...");
  // Try to catch the redirect or wait for idle
  const navPromise = page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await page.click('button[type="submit"]');
  
  await navPromise;
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Final URL:", page.url());
  
  const cookies = await page.cookies();
  console.log("Cookies:", cookies.map(c => `${c.name}=${c.value.substring(0,10)}...`));
  
  await browser.close();
})();
