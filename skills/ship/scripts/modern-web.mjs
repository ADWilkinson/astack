#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const usage = `Usage: node modern-web.mjs <command>

  search "capability query"       Find matching guides
  retrieve "guide-id,guide-id"    Read matching guides
  list                           List guide descriptions
  legacy-scan <local-path> --json Scan a file/directory inside this checkout

Uses modern-web-guidance@1.0.0 with DISABLE_TELEMETRY=1. Node 22+ and npm
are required; the first command may download the pinned package. No install,
update, experimental opt-in or production operation is exposed.
`;

function invalid(message) {
  console.error(message);
  console.error(usage);
  process.exit(2);
}

const [command, ...args] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h') {
  console.log(usage);
  process.exit(0);
}
if (Number(process.versions.node.split('.')[0]) < 22) invalid('Node 22+ is required.');
if (command === 'search') {
  if (args.length !== 1 || !args[0].trim() || args[0].startsWith('-')) invalid('Supply one capability query.');
} else if (command === 'retrieve') {
  if (args.length !== 1 || !/^[a-z0-9-]+(?:,[a-z0-9-]+)*$/.test(args[0])) invalid('Supply comma-separated guide IDs.');
} else if (command === 'list') {
  if (args.length) invalid('list takes no arguments.');
} else if (command === 'legacy-scan') {
  if (args.length !== 2 || args[1] !== '--json' || !args[0] || args[0].startsWith('-')) invalid('Supply a local path followed by --json.');
  let root, target;
  try {
    root = realpathSync(process.cwd());
    target = realpathSync(resolve(args[0]));
  } catch {
    invalid('The scan path must exist.');
  }
  const path = relative(root, target);
  if (isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) invalid('The scan path must stay inside the current checkout.');
  args[0] = target;
} else invalid('Supported commands: search, retrieve, list, legacy-scan.');

const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  '--yes', '--ignore-scripts', '--package=modern-web-guidance@1.0.0', '--',
  'modern-web-guidance', command, ...args,
], { stdio: 'inherit', env: { ...process.env, DISABLE_TELEMETRY: '1' }, shell: false });
if (result.error) {
  console.error('Could not run pinned Modern Web Guidance through npm. Check local Node/npm availability.');
  process.exit(1);
}
process.exit(result.status ?? 1);
