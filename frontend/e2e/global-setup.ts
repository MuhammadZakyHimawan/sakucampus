import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

import { getE2eEnv } from './env';

const backendDir = resolve(process.cwd(), '..', 'backend');

export default function globalSetup(): void {
  const env = { ...process.env, ...getE2eEnv() };

  execFileSync('uv', ['run', 'python', '-m', 'app.scripts.reset_test_database'], {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });
  execFileSync('uv', ['run', 'python', '-m', 'alembic', 'upgrade', 'head'], {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });
}
