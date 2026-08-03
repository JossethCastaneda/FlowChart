import { test, expect } from '@playwright/test';
import { E2E_IDS } from '../prisma/seed.e2e';

test.describe('Tenant Isolation (Aislamiento de Agencias)', () => {
  // Config: Usamos el estado global del navegador o hacemos login en cada test.
  // Para asegurar aislamiento total, hacemos login en el beforeEach
  
  test.beforeEach(async ({ page }) => {
    // 1. Ir al login
    await page.goto('/login');
    
    // Logging console para depurar
    page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));

    // 2. Llenar formulario como Tenant A (Alfa)
    await page.fill('input[type="email"]', 'alfa@e2e.local');
    await page.fill('input[type="password"]', 'e2e-password');
    await page.click('.login-btn-primary');
    
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 35000 });
  });

  test('Tenant A no puede acceder a las páginas (UI) del Tenant B', async ({ page }) => {
    // Tenant B project
    const betaProjectId = E2E_IDS.beta.project;
    
    // Intentar navegar al proyecto del Tenant B
    await page.goto(`/dashboard/proyectos/${betaProjectId}`);
    
    // FlowChart SPA hace un fetch client-side y redirige al listado si no tiene acceso
    await expect(page).toHaveURL(/.*\/dashboard\/proyectos$/, { timeout: 35000 });
  });

  test('Tenant A no puede acceder a las APIs de datos del Tenant B', async ({ page }) => {
    const request = page.context().request;
    
    // 0. Intentar ver el proyecto Beta directamente
    const projResponse = await request.get(`/api/projects/${E2E_IDS.beta.project}`);
    expect(projResponse.status()).toBeGreaterThanOrEqual(403);

    // 1. Intentar ver miembros del workspace Beta
    const wsResponse = await request.get(`/api/workspace/${E2E_IDS.beta.workspace}/members`);
    expect(wsResponse.status()).toBeGreaterThanOrEqual(403); 

    // 2. Intentar acceder a la conversación de Beta
    const convResponse = await request.get(`/api/inbox/conversations/${E2E_IDS.beta.inboxConv}`);
    expect(convResponse.status()).toBeGreaterThanOrEqual(403); 

    // 3. Intentar usar la cuenta publicitaria Meta de Beta
    const adsResponse = await request.get(`/api/integrations/meta/ads/campaigns?accountId=${E2E_IDS.beta.metaSrc}`);
    expect(adsResponse.status()).toBeGreaterThanOrEqual(400); 
  });
});

test.describe('Tenant Isolation - Reverse (Tenant B)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    
    // Logging console para depurar
    page.on('console', msg => console.log(`[Browser Console B]: ${msg.text()}`));

    await page.fill('input[type="email"]', 'beta@e2e.local');
    await page.fill('input[type="password"]', 'e2e-password');
    await page.click('.login-btn-primary');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 35000 });
  });

  test('Tenant B no puede acceder a las páginas (UI) del Tenant A', async ({ page }) => {
    const alfaProjectId = E2E_IDS.alfa.project;
    await page.goto(`/dashboard/proyectos/${alfaProjectId}`);
    
    // FlowChart SPA hace un fetch client-side y redirige al listado si no tiene acceso
    await expect(page).toHaveURL(/.*\/dashboard\/proyectos$/, { timeout: 35000 });
  });
});
