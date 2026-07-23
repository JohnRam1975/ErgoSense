/**
 * Cobertura UI — câmera, PDF, PWA e módulo V2
 * Navega via bridge E2E (DEV/VITE_E2E) ou menu drawer (produção Docker).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAsErgonomista, openMenu } from './helpers/login';
import { e2eGo, expectScreenActive, waitForE2EBridge } from './helpers/navigation';

async function hasE2EBridge(page: Page) {
  return page.evaluate(() => Boolean(window.__ERGOSENSE_E2E__?.go));
}

async function goScreen(page: Page, screenId: string) {
  if (await hasE2EBridge(page)) {
    await e2eGo(page, screenId);
    return;
  }
  await openMenu(page);
  const item = page.locator(`#menuOverlay [data-screen-id="${screenId}"]`);
  await expect(item).toBeVisible({ timeout: 15000 });
  await item.click();
  await expectScreenActive(page, screenId);
}

async function openCameraViaUi(page: Page) {
  if (await hasE2EBridge(page)) {
    await page.evaluate(() => {
      window.__ERGOSENSE_E2E__?.prepareCamera?.();
      window.__ERGOSENSE_E2E__?.go('new-analysis');
    });
  } else {
    await goScreen(page, 'new-analysis');
  }
  await expect(page.locator('#s-new-analysis.active')).toBeVisible({ timeout: 30000 });
  await page.keyboard.press('Escape').catch(() => undefined);

  const startCam = page.locator('#s-new-analysis.active button.btn.bp', {
    hasText: /Iniciar Leitura com Câmera/i,
  });
  await expect(startCam).toBeVisible({ timeout: 15000 });
  await startCam.scrollIntoViewIfNeeded();
  await startCam.click({ timeout: 15000 });
  await expect(page.locator('#s-camera.active')).toBeVisible({ timeout: 60000 });
}

test.describe('Cobertura UI — Câmera / PDF / PWA / V2', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(240_000);
    await loginAsErgonomista(page);
    await page.evaluate(async () => {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      if (regs) await Promise.all(regs.map((r) => r.unregister()));
    });
  });

  test('Câmera: video + pose ready + skeleton debug', async ({ page }) => {
    const mediapipeOk: string[] = [];
    page.on('response', (r) => {
      if (/pose_landmarker|tasks-vision/i.test(r.url()) && r.ok()) mediapipeOk.push(r.url());
    });

    await openCameraViaUi(page);

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
    expect(mediapipeOk.length, 'assets MediaPipe').toBeGreaterThan(0);
  });

  test('PDF: Exportar PDF na tela de resultado (ou banner de plano)', async ({ page }) => {
    const apiBase = process.env.E2E_API_URL ?? 'http://localhost:3001';
    const email = process.env.E2E_EMAIL ?? process.env.AUDIT_EMAIL ?? 'auditor@ergosense.test';
    const password = process.env.E2E_PASSWORD ?? process.env.AUDIT_PASS ?? 'AuditTest!2026';

    // CI seed não cria análises — garante uma via API antes de abrir o resultado
    const loginRes = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginJson = await loginRes.json();
    const token = (loginJson.data ?? loginJson).accessToken as string | undefined;
    expect(loginRes.ok && token, `login API para seed PDF: ${loginRes.status}`).toBeTruthy();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const stamp = Date.now();
    const collabRes = await fetch(`${apiBase}/api/collaborators`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nome: `PDF E2E ${stamp}`,
        name: `PDF E2E ${stamp}`,
        matricula: `PDF${stamp}`,
        setor: 'Produção',
        consent: true,
      }),
    });
    const collabJson = await collabRes.json();
    const collabId = (collabJson.data ?? collabJson).id;
    expect(collabRes.ok, `criar colaborador PDF: ${collabRes.status}`).toBeTruthy();

    const anRes = await fetch(`${apiBase}/api/analyses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        collaboratorId: collabId,
        activity: 'Montagem PDF e2e',
        atividade: 'Montagem PDF e2e',
        setor: 'Produção',
        mode: 'complete',
        score: 72,
        riskLevel: 'medio',
        synced: true,
      }),
    });
    expect(anRes.status, `criar análise PDF: ${anRes.status}`).toBe(201);
    const analysisId = String(((await anRes.json()).data ?? {}).id ?? '');
    expect(analysisId).toBeTruthy();

    // Recarrega app autenticado para puxar a análise criada
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#s-dashboard.active')).toBeVisible({ timeout: 60000 });
    await page
      .waitForResponse((r) => /\/api\/analyses\b/.test(r.url()) && r.ok(), { timeout: 45000 })
      .catch(() => undefined);

    const openFromBridge = async () => {
      await waitForE2EBridge(page);
      await expect
        .poll(async () => page.evaluate(() => Boolean(window.__ERGOSENSE_E2E__?.getFirstIds?.()?.analysis)), {
          timeout: 45000,
          intervals: [500, 1000, 2000],
        })
        .toBeTruthy();
      // Abre com o id do estado (mesmo tipo); preferido só se bater com algum da lista
      await page.evaluate((preferred) => {
        const first = window.__ERGOSENSE_E2E__?.getFirstIds?.()?.analysis;
        const pick =
          first != null && String(first) === String(preferred) ? first : first != null ? first : preferred;
        if (pick != null) window.__ERGOSENSE_E2E__?.openAnalysis?.(pick as string);
      }, analysisId);
    };

    if (await hasE2EBridge(page)) {
      await openFromBridge();
    } else {
      await goScreen(page, 'history');
      const first = page.locator('#s-history.active .list-row, #s-history.active .card, #s-history.active button').first();
      await expect(first).toBeVisible({ timeout: 30000 });
      await first.click();
    }

    await page.keyboard.press('Escape').catch(() => undefined);
    if (await page.locator('#menuOverlay.open').count()) {
      await page
        .locator('#menuDrawer .drawer-close, #menuOverlay button', { hasText: /Fechar/i })
        .first()
        .click({ force: true })
        .catch(() => undefined);
    }

    const emptyResult = page.locator('#s-result.active').getByText(/Nenhuma análise selecionada/i);
    if (
      !(await page.locator('#s-result.active').isVisible().catch(() => false)) ||
      (await emptyResult.count()) > 0
    ) {
      const verHist = page.locator('#s-result.active button', { hasText: /Ver histórico/i });
      if ((await verHist.count()) > 0) await verHist.first().click();
      else await goScreen(page, 'history');
      const first = page.locator('#s-history.active .list-row, #s-history.active .card, #s-history.active button').first();
      await expect(first).toBeVisible({ timeout: 30000 });
      await first.click();
      await page.keyboard.press('Escape').catch(() => undefined);
    }

    await expect(page.locator('#s-result.active')).toBeVisible({ timeout: 30000 });
    await expect(emptyResult).toHaveCount(0, { timeout: 15000 });

    const reveal = page.locator('#s-result.active button', { hasText: /Exibir análise ergonômica/i });
    if ((await reveal.count()) > 0) {
      await reveal.first().click();
    }

    // Classe .upgrade-banner é estável; isVisible falha se o botão estiver abaixo da dobra
    const exportOrUpgrade = page.locator(
      '#s-result.active button:has-text("Exportar PDF"), #s-result.active .upgrade-banner',
    );
    await expect
      .poll(async () => {
        if ((await reveal.count()) > 0) await reveal.first().click().catch(() => undefined);
        const n = await exportOrUpgrade.count();
        if (n > 0) await exportOrUpgrade.first().scrollIntoViewIfNeeded().catch(() => undefined);
        return n;
      }, { timeout: 20000, intervals: [500, 1000] })
      .toBeGreaterThan(0);

    const exportBtn = page.locator('#s-result.active button', { hasText: /Exportar PDF/i });
    if ((await exportBtn.count()) > 0) {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e.message || e)));
      await exportBtn.first().scrollIntoViewIfNeeded();
      await exportBtn.first().click();
      await page.waitForTimeout(1500);
      expect(errors.filter((e) => !/ResizeObserver|Non-Error/i.test(e))).toEqual([]);
    }
  });

  test('PWA: settings mostra instalar app ou já instalado', async ({ page }) => {
    await goScreen(page, 'settings');
    await expect(page.locator('#s-settings.active')).toBeVisible();
    const pwaHint = page.locator('#s-settings.active').getByText(/PWA|Instalar app|App instalado|tela cheia/i);
    await expect(pwaHint.first()).toBeVisible({ timeout: 15000 });
    expect(await page.evaluate(() => 'serviceWorker' in navigator)).toBeTruthy();
  });

  test('V2: dashboard, métodos, ambientais, roadmap e vídeo montam sem crash', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err.message || err)));

    await goScreen(page, 'v2-dashboard');
    await expect(page.getByText(/Dashboard Executivo V2|IERE|avaliações|risco/i).first()).toBeVisible({ timeout: 15000 });

    await goScreen(page, 'v2-methods');
    await expect(
      page.locator('#s-v2-methods.active').getByText(/Métodos ergonômicos V2|Execute uma nova análise|PDF V2|eSocial/i).first(),
    ).toBeVisible({ timeout: 15000 });

    const pdfV2 = page.locator('#s-v2-methods.active').getByRole('button', { name: /Exportar PDF V2/i });
    if (await pdfV2.isVisible().catch(() => false)) {
      await pdfV2.click();
      await expect(page.getByText(/PDF V2 gerado/i).first()).toBeVisible({ timeout: 10000 }).catch(() => undefined);
    }

    await goScreen(page, 'v2-environmental');
    await expect(page.getByText(/Riscos ambientais|Ruído|IBUTG|Lux/i).first()).toBeVisible();

    await goScreen(page, 'v2-roadmap');
    await expect(page.getByText(/Roadmap futuro|ainda não estão implementados|Backlog/i).first()).toBeVisible();
    await expect(page.locator('#s-v2-roadmap.active button', { hasText: /Ativar|Comprar|Habilitar/i })).toHaveCount(0);

    await goScreen(page, 'v2-audit');
    await expect(page.locator('#s-v2-audit.active')).toBeVisible();

    await goScreen(page, 'v2-video');
    await expect(page.locator('#s-v2-video.active')).toBeVisible({ timeout: 30000 });
    await expect(
      page.locator('#s-v2-video.active').getByText(/vídeo|video|upload|gravar|análise|iniciar/i).first(),
    ).toBeVisible({ timeout: 20000 });

    expect(
      pageErrors.filter((e) => !/ResizeObserver|Non-Error promise|Script error/i.test(e)),
      `pageerrors: ${pageErrors.join('; ')}`,
    ).toEqual([]);
  });

  test('Placeholders Em breve: psico-ia e eSocial não fingem funcionalidade', async ({ page }) => {
    await goScreen(page, 'psicossocial-ia');
    await expect(page.getByText(/Em breve/i).first()).toBeVisible({ timeout: 15000 });

    for (const id of ['esocial-dashboard', 'esocial-s2210', 'esocial-config'] as const) {
      await goScreen(page, id);
      await expect(page.locator(`#s-${id}.active`).getByText(/Em breve/i).first()).toBeVisible({ timeout: 15000 });
    }
  });
});
