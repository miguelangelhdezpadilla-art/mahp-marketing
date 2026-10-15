// Primer E2E real de la Fase 2. Cubre el flujo #3 de
// docs/QA/01-FLUJOS-REALES.md (Login) — camino feliz de renderizado
// + un caso borde (credenciales inválidas), tal como pide
// .claude/agents/mahp-qa-agent.md.
const { test, expect } = require('@playwright/test');

test.describe('Login', () => {
  test('renderiza el formulario de login', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#btnLogin')).toBeVisible();
  });

  test('caso borde: credenciales inválidas muestra un mensaje de error, no falla en silencio', async ({ page }) => {
    await page.goto('/login.html');
    await page.fill('#email', 'no-existe-qa@ejemplo-mahp.test');
    await page.fill('#password', 'contrasena-incorrecta-123');
    await page.click('#btnLogin');

    await expect(page.locator('#mensaje')).toContainText(/no se pudo iniciar sesión/i, { timeout: 10000 });
  });
});
