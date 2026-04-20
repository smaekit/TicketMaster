import { test as setup } from '@playwright/test';
import { mkdirSync } from 'fs';
import path from 'path';
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_STORAGE_STATE } from './helpers/auth';

setup('authenticate as admin', async ({ page }) => {
  mkdirSync(path.dirname(ADMIN_STORAGE_STATE), { recursive: true });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('**/dashboard');

  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
