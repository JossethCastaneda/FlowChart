const fs = require('fs');
let code = fs.readFileSync('components/projects/widgets/HeatmapWidget.tsx', 'utf8');

code = code.replace(
  /<div>\s*<div style=\{\{\s*display: "flex",\s*alignItems: "center",\s*justifyContent: "space-between",\s*flexWrap: "wrap",\s*gap: 8,\s*marginBottom: 12\s*\}\}>/,
  '<div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>\n      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12, flexShrink: 0 }}>'
);

code = code.replace(
  /\{\/\* Legend \*\/\}\s*<div style=\{\{\s*display: "flex",\s*alignItems: "center",\s*gap: 6,\s*marginTop: 10,\s*justifyContent: "flex-end"\s*\}\}>/,
  '{/* Legend */}\n      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "flex-end", flexShrink: 0 }}>'
);

fs.writeFileSync('components/projects/widgets/HeatmapWidget.tsx', code);
console.log("Replaced successfully!");
