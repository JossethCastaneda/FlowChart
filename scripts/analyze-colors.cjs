const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{app,components,lib}/**/*.{ts,tsx}');
const colorCounts = {};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  // Match things like color: '#fff', background: '#0b0d12', fill="#9aa4b2", etc.
  const regex = /(?:color|background|backgroundColor|fill|stroke)[:=]\s*['"](#[0-9a-fA-F]{3,8})['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const color = match[1].toLowerCase();
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  }
});

console.log("Hardcoded Hex Colors Summary:");
Object.entries(colorCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([color, count]) => {
    console.log(`${color}: ${count} occurrences`);
  });
