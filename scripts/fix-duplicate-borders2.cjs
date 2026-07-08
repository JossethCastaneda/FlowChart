const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('{app,components}/**/*.tsx');
let changedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  const originalContent = content;

  content = content.replace(/border:\s*"1px solid var\(--hairline\)",\s*border:\s*"1px solid var\(--hairline\)"/g, 'border: "1px solid var(--hairline)"');
  
  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf-8');
    console.log(`Fixed duplicates in ` + f);
    changedCount++;
  }
});
console.log(`Done! Fixed ` + changedCount + ` files.`);
