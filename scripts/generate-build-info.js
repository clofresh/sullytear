import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';

const hash = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync('src/generated', { recursive: true });
writeFileSync(
  'src/generated/buildInfo.ts',
  `export const COMMIT_HASH = ${JSON.stringify(hash)};\n`
);
