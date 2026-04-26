const { Builder, Browser } = require('selenium-webdriver');

async function main() {
  const driver = await new Builder()
    .usingServer('http://127.0.0.1:4445')
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get('http://localhost:1420/');
    await driver.sleep(3000);

    // Push settings view
    await driver.executeScript(`
      window.__PUBLIC_CORE__.mainWindow.pushView({ path: '/settings' });
    `);
    await driver.sleep(1000);

    // Get all text
    const text = await driver.executeScript(() => {
      const elements = document.querySelectorAll('*');
      const texts = [];
      for (const el of elements) {
        if (el.children.length === 0 && el.textContent.trim()) {
          const txt = el.textContent.trim();
          if (txt.length < 50) {
            texts.push(el.tagName + ': ' + txt);
          }
        }
      }
      return [...new Set(texts)].slice(0, 50);
    });

    console.log('Page text elements:');
    text.forEach(t => console.log(t));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await driver.quit();
  }
}

main().catch(console.error);
