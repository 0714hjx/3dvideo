// Usage: node scripts/check-changan-camera.cjs <existing Remotion bundle directory>
const fs = require('node:fs');
const path = require('node:path');
const {openBrowser, selectComposition, renderStill} = require('@remotion/renderer');

(async () => {
  const serveUrl = process.argv[2];
  if (!serveUrl) throw new Error('Pass a Remotion bundle directory');
  const root = path.resolve(__dirname, '..');
  const logs = [];
  const browser = await openBrowser('chrome', {browserExecutable: '/usr/lib/chromium/chromium', chromiumOptions: {gl: 'swangle'}});
  try {
    const composition = await selectComposition({serveUrl, id: 'ChanganGateTest', puppeteerInstance: browser});
    await renderStill({serveUrl, composition, frame: 239, output: path.join(root, 'out/gate-clearance-proof.png'), puppeteerInstance: browser, onBrowserLog: log => {
      if (log.text.includes('CAMERA CHECK')) {logs.push(log.text); console.log(log.text);}
    }});
    if (!logs.length) throw new Error('No camera-clearance evidence received from rendered scene');
    fs.writeFileSync(path.join(root, 'out/camera-clearance-proof.json'), JSON.stringify({frame: 239, renderSceneChecks: logs}, null, 2) + '\n');
  } finally {await browser.close({silent: true});}
})().catch(error => {console.error(error); process.exitCode = 1;});
