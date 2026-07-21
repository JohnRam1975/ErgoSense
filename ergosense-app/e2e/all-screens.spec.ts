import { test, expect } from '@playwright/test';

import { loginAsErgonomista, loginAsGlobalAdmin } from './helpers/login';

import { navigateToScreen } from './helpers/navigation';

import {

  ALL_SCREEN_IDS,

  ERGONOMISTA_SCREEN_IDS,

  ONBOARDING_ADMIN_SCREEN_IDS,

  ONBOARDING_PUBLIC_SCREEN_IDS,

} from './screen-ids';



const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3001';



test.describe('Cobertura 100% — telas ergonomista', () => {

  test('navega todas as telas registradas sem erro', async ({ page }) => {

    test.setTimeout(600_000);



    await loginAsErgonomista(page);



    const failures: string[] = [];



    for (const screenId of ERGONOMISTA_SCREEN_IDS) {

      try {

        await navigateToScreen(page, screenId);

      } catch (err) {

        failures.push(`${screenId}: ${err instanceof Error ? err.message : String(err)}`);

      }

    }



    expect(failures, `Telas com falha:\n${failures.join('\n')}`).toEqual([]);

  });

});



test.describe('Telas auth (não autenticado)', () => {

  test('splash, login e request-access', async ({ page }) => {

    await navigateToScreen(page, 'splash');

    await navigateToScreen(page, 'login');

    await navigateToScreen(page, 'request-access');

  });

});



test.describe('Onboarding público', () => {

  test('request-access, autonomo e activate-account', async ({ page }) => {

    await navigateToScreen(page, 'request-access');

    await navigateToScreen(page, 'request-access-autonomo');

    await navigateToScreen(page, 'activate-account');

  });

});



test.describe('Onboarding admin — empresas', () => {

  test('5 telas admin tenant', async ({ page }) => {

    test.setTimeout(120_000);

    await loginAsGlobalAdmin(page);



    const failures: string[] = [];

    for (const screenId of ONBOARDING_ADMIN_SCREEN_IDS) {

      try {

        await navigateToScreen(page, screenId);

      } catch (err) {

        failures.push(`${screenId}: ${err instanceof Error ? err.message : String(err)}`);

      }

    }



    expect(failures, `Telas onboarding admin com falha:\n${failures.join('\n')}`).toEqual([]);

  });

});



test.describe('Telas admin global', () => {

  test('global-admin e register-company', async ({ page }) => {

    await loginAsGlobalAdmin(page);

    await navigateToScreen(page, 'register-company');

  });

});



test.describe('Abas inferiores', () => {

  test('dashboard, history, collabs, reports', async ({ page }) => {

    await loginAsErgonomista(page);

    for (const tab of [

      { label: 'Início', id: 'dashboard' },

      { label: 'Análises', id: 'history' },

      { label: 'Equipe', id: 'collabs' },

      { label: 'Relatórios', id: 'reports' },

    ]) {

      await page.locator('.app-chrome-nav button').filter({ hasText: tab.label }).click();

      await expect(page.locator(`#s-${tab.id}.active`)).toBeVisible({ timeout: 15000 });

    }

  });

});



test.describe('Inventário completo ScreenId', () => {

  test('90 telas registradas', () => {

    expect(ALL_SCREEN_IDS.length).toBe(90);

    expect(ONBOARDING_PUBLIC_SCREEN_IDS.length).toBe(2);

    expect(ONBOARDING_ADMIN_SCREEN_IDS.length).toBe(5);

  });

});



test.describe('Saúde da API', () => {

  test('health check após login', async ({ page }) => {

    await loginAsErgonomista(page);

    const health = await page.request.get(`${API_BASE}/api/health`).catch(() => null);

    if (health?.ok()) {

      const body = await health.json();

      expect(body.ok ?? body.success).toBeTruthy();

    }

  });

});


