const fs = require('fs');
let code = fs.readFileSync('components/projects/widgets/GastoSpendTableInline.tsx', 'utf8');

// 1. Make the main panel flex column
code = code.replace(
  '<div style={panelStyle}>',
  '<div style={{ ...panelStyle, display: "flex", flexDirection: "column", height: "100%" }}>'
);

// 2. Add flexShrink to header
code = code.replace(
  '<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>',
  '<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>'
);

// 3. Make the table wrapper flex: 1
code = code.replace(
  '<div style={{ overflowX: "auto" }}>',
  '<div style={{ overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0 }}>'
);

// 4. Make export button wrapper flexShrink: 0
code = code.replace(
  '<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>',
  '<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, flexShrink: 0 }}>'
);

// 5. Make GastoCurvaWidget responsive
code = code.replace(
  '<div style={{ width: "100%", height: 280 }}>',
  '<div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>\n      <div style={{ flex: 1, width: "100%", minHeight: 0 }}>'
);

code = code.replace(
  '<ResponsiveContainer>',
  '<ResponsiveContainer width="100%" height="100%">'
);

code = code.replace(
  '</ComposedChart></ResponsiveContainer> : <NoData />}',
  '</ComposedChart></ResponsiveContainer> : <NoData />}\n      </div>'
);

fs.writeFileSync('components/projects/widgets/GastoSpendTableInline.tsx', code);
console.log("Replaced successfully!");
