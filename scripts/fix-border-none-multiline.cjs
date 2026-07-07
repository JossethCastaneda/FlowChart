const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{app,components}/**/*.tsx');
let changedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  const originalContent = content;

  // Replace border: "1px solid var(--hairline)" followed by border: "none"
  content = content.replace(/border:\s*"1px solid var\(--hairline\)",\r?\n\s*background:\s*"none",\s*border:\s*"none"/g, 'border: "1px solid var(--hairline)",\n                background: "none"');
  
  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf-8');
    console.log(`Fixed duplicates in ` + f);
    changedCount++;
  }
});
console.log(`Done! Fixed ` + changedCount + ` files.`);
