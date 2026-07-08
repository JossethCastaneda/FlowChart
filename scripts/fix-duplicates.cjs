const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('{app,components}/**/*.tsx');
let changedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  const originalContent = content;

  content = content.replace(/backdropFilter:\s*"blur\([^\)]+\)",\s*backdropFilter:\s*"blur\([^\)]+\)"/g, 'backdropFilter: "blur(8px)"');
  
  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf-8');
    console.log(`Fixed duplicates in ` + f);
    changedCount++;
  }
});
console.log(`Done! Fixed ` + changedCount + ` files.`);
