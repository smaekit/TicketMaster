import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const serverDir = path.resolve(__dirname, '../apps/server');

function loadEnvFile(filePath: string): Record<string, string> {
  return Object.fromEntries(
    readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim()];
      })
  );
}

const testEnv = {
  ...process.env,
  ...loadEnvFile(path.join(serverDir, '.env.test')),
};

export default async function globalSetup() {
  execSync('bunx prisma migrate reset --force', {
    cwd: serverDir,
    env: { ...testEnv, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes' },
    stdio: 'inherit',
  });

  execSync('bun src/lib/seed.ts', {
    cwd: serverDir,
    env: testEnv,
    stdio: 'inherit',
  });
}
