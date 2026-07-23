const fs = require('fs');

async function go() {
  const res1 = await fetch("http://localhost:3000/api/projects");
  const json1 = await res1.json();
  const projects = json1?.data?.data || json1?.data || [];
  const summary = projects.map(p => ({
    id: p.id,
    alias: p.alias,
    channels: p.channels?.map(ch => ({ 
      goal: ch.config?.goal || ch.goal,
      adAccounts: ch.config?.adAccounts || []
    }))
  }));
  fs.writeFileSync("projects_summary.json", JSON.stringify(summary, null, 2));
  console.log("Done, wrote projects_summary.json");
}
go().catch(console.error);
