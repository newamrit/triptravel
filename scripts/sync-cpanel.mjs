import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const cpanelDir = path.resolve('cpanel_public_html');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(distDir)) {
  // Completely clean cpanel_public_html so only required hosting files remain
  if (fs.existsSync(cpanelDir)) {
    fs.rmSync(cpanelDir, { recursive: true, force: true });
  }
  fs.mkdirSync(cpanelDir, { recursive: true });
  copyRecursiveSync(distDir, cpanelDir);
  console.log('[Build Sync] Prepared clean cpanel_public_html/ with only required hosting files (index.html, .htaccess, debug.php, sw.js, and api/*.php)');
}
