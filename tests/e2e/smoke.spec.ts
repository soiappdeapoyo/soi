import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing muestra el principio SOI', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Diseña tu identidad');
  await expect(page.getByText('Pensamientos', { exact: true })).toBeVisible();
});

test('rutas protegidas redirigen a login', async ({ page }) => {
  await page.goto('/chat');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: /Continuar con Google/ })).toBeVisible();
});

test('landing y login sin violaciones a11y serias', async ({ page }) => {
  for (const path of ['/', '/login']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  }
});
