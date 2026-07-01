import { chromium } from 'playwright';

async function testQRUI() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🔄 Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '/tmp/01-login.png' });
    console.log('✅ Screenshot: 01-login.png');

    console.log('🔄 Entering credentials...');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.screenshot({ path: '/tmp/02-login-filled.png' });
    console.log('✅ Screenshot: 02-login-filled.png');

    console.log('🔄 Clicking login button...');
    await page.click('button:has-text("Ingresar")');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
    await page.screenshot({ path: '/tmp/03-after-login.png' });
    console.log('✅ Screenshot: 03-after-login.png');

    console.log('🔄 Navigating to QR page...');
    await page.goto('http://localhost:5173/qr', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '/tmp/04-qr-page.png' });
    console.log('✅ Screenshot: 04-qr-page.png (QR page loaded)');

    console.log('🔄 Checking for QR form elements...');
    const urlInput = await page.$('input[placeholder*="https"]');
    const genBtn = await page.locator('button:has-text("Generar")').count();

    if (urlInput && genBtn > 0) {
      console.log('✅ QR form elements found (URL input, buttons)');
    } else {
      console.log('❌ Some form elements missing');
    }

    console.log('🔄 Filling QR form...');
    await page.fill('input[placeholder*="https"]', 'https://example.com/test');
    await page.screenshot({ path: '/tmp/05-qr-form-filled.png' });
    console.log('✅ Screenshot: 05-qr-form-filled.png');

    console.log('🔄 Clicking Generar Preview...');
    const genButtons = await page.locator('button:has-text("Generar")').all();
    if (genButtons.length > 0) {
      await genButtons[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/tmp/06-qr-preview.png' });
      console.log('✅ Screenshot: 06-qr-preview.png (QR preview should appear)');
    }

    console.log('🔄 Checking tabs...');
    const misQRs = await page.locator('text=Mis QRs').count();
    const galeria = await page.locator('text=Galería').count();
    console.log(`✅ Found tabs: Mis QRs (${misQRs}), Galería (${galeria})`);

    console.log('\n✅ Frontend verification complete!');
    console.log('\nScreenshots saved to /tmp/');

  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await page.screenshot({ path: '/tmp/error.png' });
    } catch (e) {
      // ignore
    }
  } finally {
    await browser.close();
  }
}

testQRUI();
