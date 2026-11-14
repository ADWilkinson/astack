import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const runner = fileURLToPath(new URL('../../../skills/modern-web-guidance/scripts/modern-web.mjs', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'astack-web-contract-'));
try {
  const project = join(scratch, 'project'), bin = join(scratch, 'bin'), capture = join(scratch, 'capture.json');
  mkdirSync(project); mkdirSync(bin); mkdirSync(join(project, 'src'));
  writeFileSync(join(project, 'src', 'dialog.html'), '<dialog><button>Cancel</button></dialog>');
  const shim = join(bin, 'npx');
  writeFileSync(shim, `#!/usr/bin/env node
import {writeFileSync} from 'node:fs';
writeFileSync(process.env.ASTACK_CONTRACT_CAPTURE,JSON.stringify({args:process.argv.slice(2),telemetry:process.env.DISABLE_TELEMETRY}));
process.exit(Number(process.env.ASTACK_CONTRACT_EXIT ?? 0));
`);
  chmodSync(shim, 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, ASTACK_CONTRACT_CAPTURE: capture, DISABLE_TELEMETRY: '0' };
  const run = (args, extra = {}) => spawnSync(process.execPath, [runner, ...args], { cwd: project, env: { ...env, ...extra }, encoding: 'utf8' });
  assert.equal(run(['--help']).status, 0);
  for (const args of [['search', 'confirmation modal dialog'], ['retrieve', 'dialog,accessibility'], ['list'], ['legacy-scan', 'src', '--json']]) {
    assert.equal(run(args).status, 0);
    const actual = JSON.parse(readFileSync(capture, 'utf8'));
    assert.equal(actual.telemetry, '1');
    assert.deepEqual(actual.args.slice(0, 6), ['--yes', '--ignore-scripts', '--package=modern-web-guidance@1.0.0', '--', 'modern-web-guidance', args[0]]);
    if (args[0] === 'legacy-scan') assert.equal(actual.args[6], resolve(project, 'src'));
    else assert.deepEqual(actual.args.slice(6), args.slice(1));
  }
  assert.equal(run(['search', 'dialog'], { ASTACK_CONTRACT_EXIT: '7' }).status, 7);
  for (const args of [['install'], ['update'], ['set-allow-origin-trials'], ['search', '--help'], ['retrieve', 'dialog;echo'], ['list', '--help'], ['legacy-scan', '..', '--json'], ['legacy-scan', 'src', '--fix'], ['legacy-scan', 'missing', '--json']]) {
    assert.equal(run(args).status, 2, JSON.stringify(args));
  }
  symlinkSync(bin, join(project, 'outside'));
  assert.equal(run(['legacy-scan', 'outside', '--json']).status, 2);
  console.log('Modern Web Guidance consumer contract: four read commands, pinned package, telemetry override, exit propagation and rejected mutation/path escapes pass.');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
