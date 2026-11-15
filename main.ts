// "Aurora Leviathan" — ai-excited-01 entry (Node 22, standard library only).
// The image is the entry.png beside this file; the program copies it to
// /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png when set).
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sha256 = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'entry.png');
const outDir = (process.env.MAKEFUN_OUTPUT_DIR ?? '').trim() || '/output';
const dest = join(outDir, 'entry.png');

// Validate the entry before copying: the grader runs with no network and a
// missing or oversized image must fail loudly here, not as a cryptic ENOENT
// or a rejected submission downstream.
let sourceStat;
try {
  sourceStat = statSync(source);
} catch {
  throw new Error(`entry.png not found next to main.ts: ${source}`);
}
if (!sourceStat.isFile()) {
  throw new Error(`entry.png is not a regular file: ${source}`);
}
if (sourceStat.size > 1_048_576) {
  throw new Error(
    `entry.png is ${sourceStat.size} bytes, over the 1 MiB cap`,
  );
}
// PNG header check: 8-byte signature + IHDR width/height (bytes 16-23).
const header = readFileSync(source, { flag: 'r' });
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
if (!header.subarray(0, 8).equals(pngSignature)) {
  throw new Error('entry.png is not a valid PNG file');
}
const width = header.readUInt32BE(16);
const height = header.readUInt32BE(20);
if (width !== 1024 || height !== 1024) {
  throw new Error(`entry.png is ${width}x${height}, expected 1024x1024`);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(source, dest);

// Verify the copy is byte-identical to the source: a corrupted or partial
// copy must fail loudly instead of silently shipping a broken image.
const sourceHash = sha256(source);
const destHash = sha256(dest);
const destSize = statSync(dest).size;
if (destSize !== sourceStat.size) {
  throw new Error(
    `entry.png copy size mismatch: output ${destSize} bytes != source ${sourceStat.size} bytes`,
  );
}
if (sourceHash !== destHash) {
  throw new Error(
    `entry.png copy failed SHA-256 check: source ${sourceHash} != output ${destHash}`,
  );
}
console.log(
  `entry.png copied to ${dest} (${sourceStat.size} bytes, sha256 ${destHash})`,
);
