import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else {
      callback(dirPath);
    }
  }
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.css') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // We are replacing background rgba which contain an opacity < 1 with a solid color.
  content = content.replace(/bg-\[rgba\([^)]+\)\]/g, 'bg-[var(--surface)]');
  content = content.replace(/background:\s*["']rgba\([^)]+,\s*0\.\d+[^)]*\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\([^)]+,\s*\.\d+[^)]*\)["']/g, 'background: "var(--surface)"');

  // Also catch tailwind bg-opacity classes if any
  content = content.replace(/bg-black\/\d+/g, 'bg-[var(--surface)]');
  content = content.replace(/bg-white\/\d+/g, 'bg-[var(--surface)]');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Modified rgba in', filePath);
  }
}

walk('./components', processFile);
walk('./app', processFile);
