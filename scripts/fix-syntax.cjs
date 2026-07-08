const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('{app,components}/**/*.tsx');
let changedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  const originalContent = content;

  // Fix the syntax errors left by the previous bad regex
  content = content.replace(/background:\s*"var\(--surface-hover\)"\)"/g, 'background: "var(--surface-hover)"');
  content = content.replace(/background:\s*"var\(--surface-hover\)"\)/g, 'background: "var(--surface-hover)"');
  
  content = content.replace(/background:\s*'var\(--surface-hover\)'\)'/g, "background: 'var(--surface-hover)'");
  content = content.replace(/background:\s*'var\(--surface-hover\)'\)/g, "background: 'var(--surface-hover)'");

  content = content.replace(/background:\s*"var\(--surface\)"\)"/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*"var\(--surface\)"\)/g, 'background: "var(--surface)"');

  // Also some were `background: "var(--surface-hover)"` but had `)"` after it, so matching `background: "var(--surface-hover)")"`
  
  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf-8');
    console.log(`Fixed ` + f);
    changedCount++;
  }
});

console.log(`Done! Fixed ` + changedCount + ` files.`);
