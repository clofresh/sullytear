#!/usr/bin/env node
// Validates .glb files under public/models/ against the art pipeline contract.
// Zero dependencies: parses the GLB container and JSON chunk directly.
//
// Exit codes:
//   0 = all files valid (or none present)
//   1 = one or more validation failures
//
// Contract (see art/README.md):
//   - Valid GLB v2
//   - File size <= MAX_FILE_SIZE_MB
//   - Skinned mesh present (armature exported)
//   - Animations named exactly: idle, attack, hit, death
//   - POSITION accessors expose min/max (needed for bounds)
//   - Total mesh height in [MIN_HEIGHT, MAX_HEIGHT]
//   - Feet at origin: |minY| <= FEET_TOLERANCE

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const REQUIRED_ANIMATIONS = ['idle', 'attack', 'hit', 'death'];
const MAX_FILE_SIZE_MB = 5;
const MIN_HEIGHT = 0.3;
const MAX_HEIGHT = 4.0;
const FEET_TOLERANCE = 0.1;

const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a; // 'JSON'

export function parseGlb(buf) {
  if (buf.length < 12) throw new Error('file too small to be a GLB');
  const magic = buf.readUInt32LE(0);
  if (magic !== GLB_MAGIC) throw new Error('not a GLB (bad magic)');
  const version = buf.readUInt32LE(4);
  if (version !== 2) throw new Error(`unsupported glTF version ${version} (expected 2)`);
  const total = buf.readUInt32LE(8);
  if (total !== buf.length) {
    throw new Error(`declared length ${total} != file size ${buf.length}`);
  }
  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  if (jsonType !== CHUNK_JSON) throw new Error('first chunk is not JSON');
  const jsonBytes = buf.subarray(20, 20 + jsonLen);
  return JSON.parse(jsonBytes.toString('utf8'));
}

export function validateGltf(gltf, sizeBytes) {
  const errors = [];
  const sizeMb = sizeBytes / 1024 / 1024;
  if (sizeMb > MAX_FILE_SIZE_MB) {
    errors.push(`file size ${sizeMb.toFixed(2)} MB exceeds limit of ${MAX_FILE_SIZE_MB} MB`);
  }

  const skins = gltf.skins || [];
  if (skins.length === 0) {
    errors.push('no skinned mesh found — export with an Armature and skin weights');
  }

  const animNames = (gltf.animations || []).map((a) => a.name).filter(Boolean);
  const missing = REQUIRED_ANIMATIONS.filter((n) => !animNames.includes(n));
  if (missing.length > 0) {
    const found = animNames.length ? animNames.join(', ') : '(none)';
    errors.push(
      `missing required animation(s) [${missing.join(', ')}]; found: ${found}. ` +
        `Animation names must match exactly (case-sensitive).`,
    );
  }

  // Bounding box from POSITION accessor min/max.
  const accessors = gltf.accessors || [];
  const meshes = gltf.meshes || [];
  let minY = Infinity;
  let maxY = -Infinity;
  let sawPosition = false;
  let missingMinMax = false;
  for (const mesh of meshes) {
    for (const prim of mesh.primitives || []) {
      const posIdx = prim.attributes && prim.attributes.POSITION;
      if (posIdx == null) continue;
      const acc = accessors[posIdx];
      if (!acc) continue;
      sawPosition = true;
      if (!acc.min || !acc.max || acc.min.length < 3 || acc.max.length < 3) {
        missingMinMax = true;
        continue;
      }
      if (acc.min[1] < minY) minY = acc.min[1];
      if (acc.max[1] > maxY) maxY = acc.max[1];
    }
  }

  if (!sawPosition) {
    errors.push('no mesh POSITION attribute found');
  } else if (missingMinMax) {
    errors.push(
      'POSITION accessor missing min/max — re-export with default Blender glTF settings ' +
        '(do not disable "Include > Attributes > POSITION min/max")',
    );
  } else {
    const height = maxY - minY;
    if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
      errors.push(
        `mesh height ${height.toFixed(2)} outside allowed range [${MIN_HEIGHT}, ${MAX_HEIGHT}]`,
      );
    }
    if (Math.abs(minY) > FEET_TOLERANCE) {
      errors.push(
        `feet not at origin: minY=${minY.toFixed(3)} (expected |minY| <= ${FEET_TOLERANCE}). ` +
          'Move the armature/mesh so the feet sit at Z=0 before export.',
      );
    }
  }

  return errors;
}

function validateFile(file) {
  const stat = fs.statSync(file);
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (e) {
    return [`could not read file: ${e.message}`];
  }
  let gltf;
  try {
    gltf = parseGlb(buf);
  } catch (e) {
    return [e.message];
  }
  return validateGltf(gltf, stat.size);
}

function main() {
  const dir = path.resolve(process.cwd(), 'public/models');
  if (!fs.existsSync(dir)) {
    console.log(`validate-gltf: ${path.relative(process.cwd(), dir)} does not exist — nothing to validate`);
    return 0;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.glb'))
    .sort();
  if (files.length === 0) {
    console.log('validate-gltf: no .glb files to validate');
    return 0;
  }

  let failed = 0;
  for (const name of files) {
    const full = path.join(dir, name);
    const errs = validateFile(full);
    if (errs.length === 0) {
      console.log(`  OK   ${name}`);
    } else {
      failed++;
      console.error(`  FAIL ${name}`);
      for (const e of errs) console.error(`       - ${e}`);
    }
  }

  if (failed > 0) {
    console.error(`\nvalidate-gltf: ${failed} file(s) failed validation`);
    return 1;
  }
  console.log(`\nvalidate-gltf: ${files.length} file(s) OK`);
  return 0;
}

const isMain =
  import.meta.url === url.pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  process.exit(main());
}
