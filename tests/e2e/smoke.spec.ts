import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing: elegir al autor del video lleva a su reto de 7 días', async ({ page }) => {
  await page.goto('/?de=neville');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ya viste el video');
  const first = page.locator('#elige a[href^="/login"]').first();
  await expect(first).toContainText('El de tu video');
  await expect(first).toHaveAttribute('href', `/login?next=${encodeURIComponent('/m/reto_neville_7/play')}`);
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
