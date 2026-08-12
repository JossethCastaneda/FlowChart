const fs = require('fs'); 
const sql = fs.readFileSync('all_tables.sql', 'utf8'); 
const tables = ['AiPackage', 'AiPackageVersion', 'AiReservationLedger', 'BillingLedgerEntry', 'BillingNotification', 'BillingProfile', 'BillingRecoveryCase', 'BillingRecoveryPolicy', 'ExternalCostRate', 'FiscalDocument', 'Module', 'Plan', 'PlanModule', 'PlanPrice', 'PlanVersion', 'WorkspaceAiBudgetBalance']; 
let output = ''; 
const statements = sql.split(/(?=-- CreateTable|-- CreateIndex|-- AddForeignKey|-- CreateEnum)/); 
for (const stmt of statements) { 
  if (tables.some(t => stmt.includes('"' + t + '"') || stmt.includes('"' + t + '_'))) { 
    output += stmt; 
  } 
} 
fs.mkdirSync('prisma/migrations/20260812143323_finops_commercial_baseline', {recursive: true}); 
fs.writeFileSync('prisma/migrations/20260812143323_finops_commercial_baseline/migration.sql', output);
