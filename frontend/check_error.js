const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/insert-spk', { waitUntil: 'networkidle0' });

  // Upload SPK sequence to trigger the error!
  // Wait, the user said "setelah insert spk malah blank putih". 
  // It crashes *after* they insert the SPK. 
  // I might not need to automate the upload if it crashes on initial render due to my code. But let's check first.
  
  await browser.close();
})();
