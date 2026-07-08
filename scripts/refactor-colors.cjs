const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{app,components,lib}/**/*.{ts,tsx}');
let changedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  const originalContent = content;

  // Replace Tailwind classes
  content = content.replace(/\bbg-white\b/g, 'bg-[var(--surface)]');
  content = content.replace(/\btext-white\b/g, 'text-[var(--foreground)]');
  content = content.replace(/\btext-black\b/g, 'text-[var(--foreground)]');
  content = content.replace(/\btext-slate-800\b/g, 'text-[var(--foreground)]');
  content = content.replace(/\bbg-slate-800\b/g, 'bg-[var(--surface-hover)]');
  
  // Replace inline properties (JSON object style)
  content = content.replace(/color:\s*['"]#(fff|ffffff|0b0d12|000|000000|12151c)['"]/gi, (match, hex) => {
    const h = hex.toLowerCase();
    if (h === 'fff' || h === 'ffffff') return 'color: "var(--foreground)"';
    if (h === '0b0d12' || h === '000' || h === '000000') return 'color: "var(--background)"';
    if (h === '12151c') return 'color: "var(--bg-raised)"';
    return match;
  });

  content = content.replace(/background:\s*['"]#(fff|ffffff|0b0d12|000|000000|12151c)['"]/gi, (match, hex) => {
    const h = hex.toLowerCase();
    if (h === 'fff' || h === 'ffffff') return 'background: "var(--surface)"';
    if (h === '0b0d12' || h === '000' || h === '000000') return 'background: "var(--background)"';
    if (h === '12151c') return 'background: "var(--bg-raised)"';
    return match;
  });

  content = content.replace(/backgroundColor:\s*['"]#(fff|ffffff|0b0d12|000|000000|12151c)['"]/gi, (match, hex) => {
    const h = hex.toLowerCase();
    if (h === 'fff' || h === 'ffffff') return 'backgroundColor: "var(--surface)"';
    if (h === '0b0d12' || h === '000' || h === '000000') return 'backgroundColor: "var(--background)"';
    if (h === '12151c') return 'backgroundColor: "var(--bg-raised)"';
    return match;
  });

  content = content.replace(/stroke:\s*['"]#(fff|ffffff|0b0d12|000|000000|12151c)['"]/gi, (match, hex) => {
    const h = hex.toLowerCase();
    if (h === 'fff' || h === 'ffffff') return 'stroke: "var(--foreground)"';
    if (h === '0b0d12' || h === '000' || h === '000000') return 'stroke: "var(--background)"';
    if (h === '12151c') return 'stroke: "var(--bg-raised)"';
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf-8');
    console.log(`Updated ` + f);
    changedCount++;
  }
});
console.log(`Done! Modified ` + changedCount + ` files.`);
