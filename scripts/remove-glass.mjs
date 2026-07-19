import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
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

  // CSS Properties
  content = content.replace(/backdrop-filter:\s*blur\([^)]+\);?/g, '');
  content = content.replace(/-webkit-backdrop-filter:\s*blur\([^)]+\);?/g, '');
  
  // React Inline Styles
  content = content.replace(/backdropFilter:\s*["']blur\([^)]+\)["'],?/g, '');
  content = content.replace(/WebkitBackdropFilter:\s*["']blur\([^)]+\)["'],?/g, '');
  
  // Tailwind Classes
  content = content.replace(/backdrop-blur-[\w]+/g, '');
  content = content.replace(/backdrop-blur/g, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Modified backdrop in', filePath);
  }
}

walk('./components', processFile);
walk('./app', processFile);

// Also modify globals.css for colors and shadows
const globalsPath = './app/globals.css';
let globals = fs.readFileSync(globalsPath, 'utf8');

// Replace panel-bg colors with solid colors
globals = globals.replace(/--panel-bg:\s*rgba\(15, 18, 25, 0\.65\);/g, '--panel-bg:       var(--surface);');
globals = globals.replace(/--topbar-bg:\s*rgba\(11, 13, 18, 0\.8\);/g, '--topbar-bg:      var(--surface);');

// Light mode
globals = globals.replace(/--panel-bg:\s*rgba\(255, 255, 255, 0\.85\);/g, '--panel-bg:       var(--surface);');
globals = globals.replace(/--topbar-bg:\s*rgba\(245, 247, 250, 0\.85\);/g, '--topbar-bg:      var(--surface);');

// Azul mode
globals = globals.replace(/--panel-bg:\s*rgba\(12, 18, 32, 0\.70\);/g, '--panel-bg:       var(--surface);');
globals = globals.replace(/--topbar-bg:\s*rgba\(10, 17, 40, 0\.85\);/g, '--topbar-bg:      var(--surface);');

// Make shadows stronger
globals = globals.replace(/--shadow-soft:\s*0 4px 20px rgba\(0, 0, 0, 0\.25\);/g, '--shadow-soft:    0 8px 30px rgba(0, 0, 0, 0.4);');
globals = globals.replace(/--shadow-hard:\s*0 12px 40px rgba\(0, 0, 0, 0\.5\);/g, '--shadow-hard:    0 16px 50px rgba(0, 0, 0, 0.7);');

fs.writeFileSync(globalsPath, globals);
console.log('Modified globals.css');
