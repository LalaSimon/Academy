import { test as setup } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as path from 'path';

setup('seed database', async () => {
  execFileSync('node', [path.resolve(__dirname, 'helpers/seed.js')], {
    cwd: path.resolve(__dirname, '../apps/api'),
    env: { ...process.env },
    stdio: 'inherit',
  });
});
