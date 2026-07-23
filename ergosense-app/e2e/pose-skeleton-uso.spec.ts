/**
 * Uso real — Pose / Skeleton via fluxo de Nova Análise
 */
import { test, expect } from '@playwright/test';
import { loginAsErgonomista } from './helpers/login';

test.describe('Uso — Pose Estimation / Skeleton', () => {
  test('Nova Análise → câmera: IA fica ready e reabre ok', async ({ page }) => {
    test.setTimeout(240_000);

    const pageErrors: string[] = [];
    const mediapipeOk: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err.message || err)));
    page.on('response', (r) => {
      const u = r.url();
      if (/pose_landmarker|tasks-vision@0\.10\.35\/wasm/i.test(u) && r.ok()) {
        mediapipeOk.push(u.split('/').slice(-2).join('/'));
      }
    });

    await loginAsErgonomista(page);
    await page.waitForFunction(() => Boolean(window.__ERGOSENSE_E2E__?.go), undefined, { timeout: 30000 });

    await page.evaluate(async () => {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      if (regs) await Promise.all(regs.map((r) => r.unregister()));
    });

    // Espera o bundle pós-login assentar (evita corrida com loadTenantData)
    await page.waitForTimeout(1500);

    const openCameraViaUi = async () => {
      await page.evaluate(() => {
        window.__ERGOSENSE_E2E__?.prepareCamera?.();
        window.__ERGOSENSE_E2E__?.go('new-analysis');
      });
      await expect(page.locator('#s-new-analysis.active')).toBeVisible({ timeout: 30000 });
      await page.keyboard.press('Escape').catch(() => undefined);

      const startCam = page.locator('#s-new-analysis.active button.btn.bp', {
        hasText: /Iniciar Leitura com Câmera/i,
      });
      await expect(startCam).toBeVisible({ timeout: 15000 });
      await startCam.scrollIntoViewIfNeeded();
      await startCam.click({ timeout: 15000 });

      await expect(page.locator('#s-camera.active')).toBeVisible({ timeout: 60000 });
    };

    await openCameraViaUi();

    await page.waitForFunction(
      () => {
        const v = document.querySelector('#s-camera.active video.cam-video') as HTMLVideoElement | null;
        return Boolean(v && v.videoWidth > 0);
      },
      undefined,
      { timeout: 60000 },
    );

    const debug = page.locator('#s-camera.active [data-testid="pose-debug"]');
    await expect(debug).toBeAttached({ timeout: 20000 });

    await expect
      .poll(async () => (await debug.getAttribute('data-pose-status')) || 'missing', {
        timeout: 120_000,
        intervals: [500, 1000, 2000],
      })
      .toBe('ready');

    expect(await debug.getAttribute('data-pose-error')).toBeFalsy();
    expect(mediapipeOk.length, 'assets MediaPipe baixados').toBeGreaterThan(0);

    // Sair → voltar (refcount / landmarker compartilhado)
    await openCameraViaUi();
    await expect
      .poll(
        async () =>
          (await page.locator('#s-camera.active [data-testid="pose-debug"]').getAttribute('data-pose-status')) ||
          'missing',
        { timeout: 120_000, intervals: [500, 1000, 2000] },
      )
      .toBe('ready');

    const critical = pageErrors.filter((m) => !/ResizeObserver|Script error|OpenGL error checking/i.test(m));
    expect(critical, critical.join(' | ')).toEqual([]);
  });
});
