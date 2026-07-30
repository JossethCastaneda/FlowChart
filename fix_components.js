const fs = require('fs');
let code = fs.readFileSync('components/ads-manager/AdsManagerTable.tsx', 'utf8');

// Replace component definitions
code = code.replace(/const SortIcon = \(\{ col \}: \{ col: (SortCol|string) \}\) => \{/g, 'const renderSortIcon = (col: ) => {');
code = code.replace(/const ResizeHandle = \(\{ col \}: \{ col: (SortCol|string) \}\) => \(/g, 'const renderResizeHandle = (col: ) => (');
code = code.replace(/const MetricTh = \(\{ col, label \}: \{ col: (SortCol|string); label: string \}\) => \(/g, 'const renderMetricTh = (col: , label: string) => (');

// Replace component usages
code = code.replace(/<SortIcon col="([^"]+)" \/>/g, '{renderSortIcon("")}');
code = code.replace(/<SortIcon col=\{col\} \/>/g, '{renderSortIcon(col)}');
code = code.replace(/<ResizeHandle col="([^"]+)" \/>/g, '{renderResizeHandle("")}');
code = code.replace(/<ResizeHandle col=\{col\} \/>/g, '{renderResizeHandle(col)}');
code = code.replace(/<MetricTh col="([^"]+)" label="([^"]+)" \/>/g, '{renderMetricTh("", "")}');

fs.writeFileSync('components/ads-manager/AdsManagerTable.tsx', code);
