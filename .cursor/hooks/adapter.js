#!/usr/bin/env node
'use strict';

const MAX_STDIN = 1024 * 1024;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      if (data.length < MAX_STDIN) {
        data += chunk.substring(0, MAX_STDIN - data.length);
      }
    });
    process.stdin.on('end', () => resolve(data));
  });
}

module.exports = { readStdin, MAX_STDIN };
