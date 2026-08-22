#!/usr/bin/env node
'use strict';

/**
 * Portable launcher for RTK Cursor hook.
 * Tries rtk on PATH, then common Windows scoop shim locations.
 * Fails open if RTK is not installed.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { readStdin } = require('./adapter');

function resolveRtk() {
  const candidates = [
    'rtk',
    process.env.RTK_PATH,
    process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, 'scoop', 'shims', 'rtk.exe')
      : null,
    process.env.HOME
      ? path.join(process.env.HOME, 'scoop', 'shims', 'rtk.exe')
      : null,
    'C:/Users/NCPC/scoop/shims/rtk.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'rtk') {
      const which = spawnSync('where', ['rtk'], { encoding: 'utf8', shell: true });
      if (which.status === 0 && which.stdout.trim()) {
        return which.stdout.trim().split(/\r?\n/)[0];
      }
      const whichUnix = spawnSync('which', ['rtk'], { encoding: 'utf8' });
      if (whichUnix.status === 0 && whichUnix.stdout.trim()) {
        return whichUnix.stdout.trim();
      }
      continue;
    }
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

readStdin()
  .then((stdin) => {
    const rtk = resolveRtk();
    if (!rtk) {
      console.error(
        '[hooks] RTK not found — shell output will not be summarized. Install rtk or set RTK_PATH.',
      );
      process.exit(0);
    }

    const result = spawnSync(rtk, ['hook', 'cursor'], {
      input: stdin,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      shell: os.platform() === 'win32',
    });

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 0);
  })
  .catch(() => process.exit(0));
