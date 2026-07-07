const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('{app,components}/**/*.tsx');

let changedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  const originalContent = content;

  // 1. Inline styles with rgba (backgrounds)
  content = content.replace(/background:\s*["'`]rgba\(255,\s*255,\s*255,\s*0\.0[1-4]\)["'`]/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["'`]rgba\(255,\s*255,\s*255,\s*0\.0[5-9]\)["'`]/g, 'background: "var(--surface-hover)"');
  content = content.replace(/background:\s*["'`]rgba\(255,\s*255,\s*255,\s*0\.1["']?/g, 'background: "var(--surface-hover)"');
  content = content.replace(/background:\s*["'`]rgba\(255,\s*255,\s*255,\s*0\.1[0-9]["']?/g, 'background: "var(--surface-hover)"');

  // 2. Inline styles with rgba (borders)
  content = content.replace(/border(?:Bottom|Top|Left|Right)?:\s*["'`]1px solid rgba\(255,\s*255,\s*255,\s*0\.0[1-6]\)["'`]/g, 'border: "1px solid var(--hairline)"');
  content = content.replace(/border(?:Bottom|Top|Left|Right)?:\s*["'`]1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-1][0-9]?\)["'`]/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border(?:Bottom|Top|Left|Right)?:\s*["'`]1px solid rgba\(255,\s*255,\s*255,\s*0\.2\)["'`]/g, 'border: "1px solid var(--border-strong)"');

  // 3. Inline styles for specific accents
  content = content.replace(/background:\s*["'`]rgba\(59,\s*130,\s*246,\s*0\.[1-2]\)["'`]/g, 'background: "var(--cyan-dim)"');
  content = content.replace(/background:\s*["'`]rgba\(52,\s*183,\s*124,\s*0\.[1-2]\)["'`]/g, 'background: "var(--emerald-dim)"');
  content = content.replace(/background:\s*["'`]rgba\(229,\s*72,\s*77,\s*0\.[1-2]\)["'`]/g, 'background: "var(--red-dim)"');

  // 4. Modals and Overlays with dark glassmorphism
  content = content.replace(/background:\s*["'`]rgba\(0,\s*0,\s*0,\s*0\.[4-8]\)["'`]/g, 'background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(8px)"');
  content = content.replace(/background:\s*["'`]rgba\(15,\s*23,\s*42,\s*0\.[6-9]\)["'`]/g, 'background: "var(--surface)", backdropFilter: "blur(12px)"');

  // 5. Tailwind opacity classes (backgrounds)
  content = content.replace(/bg-white\/[1-4]\b/g, 'bg-[var(--surface)]');
  content = content.replace(/bg-white\/[5-9]\b/g, 'bg-[var(--surface-hover)]');
  content = content.replace(/bg-white\/10\b/g, 'bg-[var(--surface-hover)]');
  
  // 6. Tailwind opacity classes (borders)
  content = content.replace(/border-white\/[1-6]\b/g, 'border-[var(--hairline)]');
  content = content.replace(/border-white\/[7-9]\b/g, 'border-[var(--border)]');
  content = content.replace(/border-white\/1[0-9]\b/g, 'border-[var(--border)]');
  content = content.replace(/border-white\/20\b/g, 'border-[var(--border-strong)]');

  // 7. Tailwind overlays (bg-black/50 -> glassmorphism)
  content = content.replace(/bg-black\/[4-8]0\b/g, 'bg-black/60 backdrop-blur-sm');

  // 8. Tailwind blue/cyan/emerald dim colors
  content = content.replace(/bg-blue-500\/10/g, 'bg-[var(--cyan-dim)]');
  content = content.replace(/bg-blue-500\/20/g, 'bg-[var(--cyan-dim)]');
  content = content.replace(/bg-cyan-500\/10/g, 'bg-[var(--cyan-dim)]');
  content = content.replace(/bg-cyan-500\/20/g, 'bg-[var(--cyan-dim)]');
  
  // 9. Text color mappings
  content = content.replace(/text-slate-400/g, 'text-[var(--text-secondary)]');
  content = content.replace(/text-gray-400/g, 'text-[var(--text-secondary)]');
  content = content.replace(/text-white\/[5-8]0/g, 'text-[var(--text-secondary)]');

  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf-8');
    console.log(`Updated ${f}`);
    changedCount++;
  }
});

console.log(`Done! Modified ${changedCount} files.`);
