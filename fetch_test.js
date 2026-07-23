const fs = require('fs');

async function go() {
  const res = await fetch("http://localhost:3000/api/test-meta");
  const json = await res.json();
  fs.writeFileSync("meta.json", JSON.stringify(json, null, 2));
  console.log("Done");
}
go();
