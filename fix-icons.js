const fs = require('fs');
const file = 'D:/Proyectos/FlowChart/components/ui/BrandIcons.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/g;
content = content.replace(regex, (match, b64) => {
  let svg = Buffer.from(b64, 'base64').toString('utf8');
  
  // Extract color from style='color:#XXXXXX'
  const colorMatch = svg.match(/style="color:(#[A-Fa-f0-9]+)"/);
  if (colorMatch && colorMatch[1]) {
    const color = colorMatch[1];
    svg = svg.replace(/fill="currentColor"/g, 'fill="' + color + '"');
  }

  const newB64 = Buffer.from(svg, 'utf8').toString('base64');
  return 'data:image/svg+xml;base64,' + newB64;
});

fs.writeFileSync(file, content);
console.log('Replaced currentColor in SVGs');
