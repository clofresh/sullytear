#!/usr/bin/env node
// Compiles art/*.model.toml source files into public/models/<name>.glb.
//
// This is the "Claude-authored" side of the content pipeline; the artist
// side authors .blend files and exports .glb directly. Both paths produce
// the same artifact and are checked by scripts/validate-gltf.mjs.
//
// Contract: each TOML file declares a skeleton, primitive parts, and the
// four required animations (idle/attack/hit/death). The compiler emits a
// skinned glTF 2.0 binary with:
//   - one bone joint per declared bone (inverse bind = identity for now)
//   - one primitive per part, all weighted 100% to their declared bone
//   - one animation per entry, with samplers targeting joint nodes
//
// Deliberately narrow: only `sphere` and `box` shapes, single-bone skinning
// (vertices belong wholly to one joint). Sufficient for porting the existing
// procedural characters; we can widen later if real art needs more.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parse as parseToml } from 'smol-toml';
import { z } from 'zod';
import { Document, NodeIO } from '@gltf-transform/core';

// ---------- schema ----------------------------------------------------------

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);

const Bone = z.object({
  name: z.string().min(1),
  parent: z.string().optional(),
  head: Vec3,
});

const PartBase = {
  pos: Vec3,
  rot: Vec3.optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  bone: z.string().min(1),
};

const SpherePart = z.object({
  shape: z.literal('sphere'),
  radius: z.number().positive(),
  scale: Vec3.optional(),
  ...PartBase,
});

const BoxPart = z.object({
  shape: z.literal('box'),
  size: Vec3,
  ...PartBase,
});

const CylinderPart = z.object({
  shape: z.literal('cylinder'),
  radius: z.number().positive(),
  height: z.number().positive(),
  ...PartBase,
});

const ConePart = z.object({
  shape: z.literal('cone'),
  radius: z.number().positive(),
  height: z.number().positive(),
  ...PartBase,
});

const CapsulePart = z.object({
  shape: z.literal('capsule'),
  radius: z.number().positive(),
  height: z.number().positive(),
  ...PartBase,
});

const TorusPart = z.object({
  shape: z.literal('torus'),
  radius: z.number().positive(),
  thickness: z.number().positive(),
  ...PartBase,
});

const PlanePart = z.object({
  shape: z.literal('plane'),
  size: z.tuple([z.number().positive(), z.number().positive()]),
  ...PartBase,
});

const Part = z.discriminatedUnion('shape', [
  SpherePart,
  BoxPart,
  CylinderPart,
  ConePart,
  CapsulePart,
  TorusPart,
  PlanePart,
]);

const Track = z.object({
  bone: z.string().min(1),
  path: z.enum(['translation', 'rotation', 'scale']),
  times: z.array(z.number().nonnegative()).min(1),
  values: z.array(z.array(z.number())).min(1),
});

const Animation = z.object({
  loop: z.boolean(),
  duration: z.number().positive(),
  tracks: z.array(Track).default([]),
});

const REQUIRED_ANIMS = ['idle', 'attack', 'hit', 'death'];

const Model = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  bones: z.array(Bone).min(1),
  parts: z.array(Part).min(1),
  animations: z.object({
    idle: Animation,
    attack: Animation,
    hit: Animation,
    death: Animation,
  }),
});

// ---------- geometry --------------------------------------------------------
//
// All generators produce geometry centred on the origin and Y-up where
// applicable, matching Three.js's default geometry orientations. The uniform
// transform step (transformGeometry) then applies the part's optional `rot`
// (Euler XYZ — Three.js default order) followed by translation by `pos`.

// UV sphere centered at the origin.
function sphereGeometry(radius, scale = [1, 1, 1], widthSeg = 16, heightSeg = 12) {
  const [sx, sy, sz] = scale;
  const positions = [];
  const normals = [];
  const indices = [];
  for (let iy = 0; iy <= heightSeg; iy++) {
    const v = iy / heightSeg;
    const phi = v * Math.PI;
    for (let ix = 0; ix <= widthSeg; ix++) {
      const u = ix / widthSeg;
      const theta = u * Math.PI * 2;
      const nx = -Math.cos(theta) * Math.sin(phi);
      const ny = Math.cos(phi);
      const nz = Math.sin(theta) * Math.sin(phi);
      normals.push(nx, ny, nz);
      positions.push(nx * radius * sx, ny * radius * sy, nz * radius * sz);
    }
  }
  const stride = widthSeg + 1;
  for (let iy = 0; iy < heightSeg; iy++) {
    for (let ix = 0; ix < widthSeg; ix++) {
      const a = iy * stride + ix + 1;
      const b = iy * stride + ix;
      const c = (iy + 1) * stride + ix;
      const d = (iy + 1) * stride + ix + 1;
      if (iy !== 0) indices.push(a, b, d);
      if (iy !== heightSeg - 1) indices.push(b, c, d);
    }
  }
  return packGeometry(positions, normals, indices);
}

// Axis-aligned box centred on the origin, with per-face duplicated vertices
// (flat normals).
function boxGeometry(size) {
  const [sw, sh, sd] = size.map((s) => s / 2);
  const faces = [
    { n: [1, 0, 0],  v: [[ sw, -sh,  sd], [ sw, -sh, -sd], [ sw,  sh, -sd], [ sw,  sh,  sd]] },
    { n: [-1, 0, 0], v: [[-sw, -sh, -sd], [-sw, -sh,  sd], [-sw,  sh,  sd], [-sw,  sh, -sd]] },
    { n: [0, 1, 0],  v: [[-sw,  sh,  sd], [ sw,  sh,  sd], [ sw,  sh, -sd], [-sw,  sh, -sd]] },
    { n: [0, -1, 0], v: [[-sw, -sh, -sd], [ sw, -sh, -sd], [ sw, -sh,  sd], [-sw, -sh,  sd]] },
    { n: [0, 0, 1],  v: [[-sw, -sh,  sd], [ sw, -sh,  sd], [ sw,  sh,  sd], [-sw,  sh,  sd]] },
    { n: [0, 0, -1], v: [[ sw, -sh, -sd], [-sw, -sh, -sd], [-sw,  sh, -sd], [ sw,  sh, -sd]] },
  ];
  const positions = [];
  const normals = [];
  const indices = [];
  faces.forEach((f, fi) => {
    const base = fi * 4;
    for (const v of f.v) positions.push(...v);
    for (let i = 0; i < 4; i++) normals.push(...f.n);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return packGeometry(positions, normals, indices);
}

// Tube generator shared by cylinder and cone (radiusTop=0). Y-axis aligned,
// height runs from -h/2 to +h/2, capped at both ends. Side normals use the
// slope so cones light correctly.
function tubeGeometry(radiusTop, radiusBottom, height, radialSeg = 16) {
  const positions = [];
  const normals = [];
  const indices = [];
  const halfH = height / 2;
  const slope = (radiusBottom - radiusTop) / height;
  // Side wall: ring at -h/2 then ring at +h/2.
  for (let i = 0; i <= radialSeg; i++) {
    const theta = (i / radialSeg) * Math.PI * 2;
    const cx = Math.cos(theta);
    const cz = Math.sin(theta);
    // Inclined side normal (unit length).
    const nLen = Math.hypot(1, slope);
    const nx = cx / nLen;
    const ny = slope / nLen;
    const nz = cz / nLen;
    positions.push(cx * radiusBottom, -halfH, cz * radiusBottom);
    normals.push(nx, ny, nz);
    positions.push(cx * radiusTop, halfH, cz * radiusTop);
    normals.push(nx, ny, nz);
  }
  for (let i = 0; i < radialSeg; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = i * 2 + 2;
    const d = i * 2 + 3;
    indices.push(a, c, b, b, c, d);
  }
  // Top cap (skip if radiusTop is 0 — that's the cone tip).
  if (radiusTop > 0) {
    const center = positions.length / 3;
    positions.push(0, halfH, 0);
    normals.push(0, 1, 0);
    for (let i = 0; i <= radialSeg; i++) {
      const theta = (i / radialSeg) * Math.PI * 2;
      positions.push(Math.cos(theta) * radiusTop, halfH, Math.sin(theta) * radiusTop);
      normals.push(0, 1, 0);
    }
    for (let i = 0; i < radialSeg; i++) {
      indices.push(center, center + i + 1, center + i + 2);
    }
  }
  // Bottom cap.
  {
    const center = positions.length / 3;
    positions.push(0, -halfH, 0);
    normals.push(0, -1, 0);
    for (let i = 0; i <= radialSeg; i++) {
      const theta = (i / radialSeg) * Math.PI * 2;
      positions.push(Math.cos(theta) * radiusBottom, -halfH, Math.sin(theta) * radiusBottom);
      normals.push(0, -1, 0);
    }
    for (let i = 0; i < radialSeg; i++) {
      indices.push(center, center + i + 2, center + i + 1);
    }
  }
  return packGeometry(positions, normals, indices);
}

function cylinderGeometry(radius, height) {
  return tubeGeometry(radius, radius, height);
}

function coneGeometry(radius, height) {
  return tubeGeometry(0, radius, height);
}

// Capsule: a Y-axis cylinder of `height` capped by two hemispheres of
// `radius`. Total height = height + 2*radius (Three.js convention).
function capsuleGeometry(radius, height, radialSeg = 16, capSeg = 6) {
  const positions = [];
  const normals = [];
  const indices = [];
  const halfH = height / 2;

  // Top hemisphere: phi in [0, PI/2], y from radius down to 0.
  // Bottom hemisphere: phi in [PI/2, PI], y from 0 down to -radius.
  // We weld both hemispheres to the cylinder by sharing the equator rings.
  // For simplicity we don't share — a small amount of vertex duplication is
  // fine and the validator only cares about totals.
  const buildHemisphere = (yOffset, sign) => {
    // sign = +1 for top (phi 0..PI/2), -1 for bottom (phi PI/2..PI)
    const startPhi = sign === 1 ? 0 : Math.PI / 2;
    const endPhi = sign === 1 ? Math.PI / 2 : Math.PI;
    const baseIndex = positions.length / 3;
    for (let iy = 0; iy <= capSeg; iy++) {
      const v = iy / capSeg;
      const phi = startPhi + v * (endPhi - startPhi);
      for (let ix = 0; ix <= radialSeg; ix++) {
        const theta = (ix / radialSeg) * Math.PI * 2;
        const nx = -Math.cos(theta) * Math.sin(phi);
        const ny = Math.cos(phi);
        const nz = Math.sin(theta) * Math.sin(phi);
        normals.push(nx, ny, nz);
        positions.push(nx * radius, ny * radius + yOffset, nz * radius);
      }
    }
    const stride = radialSeg + 1;
    for (let iy = 0; iy < capSeg; iy++) {
      for (let ix = 0; ix < radialSeg; ix++) {
        const a = baseIndex + iy * stride + ix + 1;
        const b = baseIndex + iy * stride + ix;
        const c = baseIndex + (iy + 1) * stride + ix;
        const d = baseIndex + (iy + 1) * stride + ix + 1;
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
  };
  buildHemisphere(halfH, 1);
  buildHemisphere(-halfH, -1);

  // Cylindrical body between -halfH and +halfH.
  const baseIndex = positions.length / 3;
  for (let i = 0; i <= radialSeg; i++) {
    const theta = (i / radialSeg) * Math.PI * 2;
    const cx = Math.cos(theta);
    const cz = Math.sin(theta);
    positions.push(cx * radius, -halfH, cz * radius);
    normals.push(cx, 0, cz);
    positions.push(cx * radius, halfH, cz * radius);
    normals.push(cx, 0, cz);
  }
  for (let i = 0; i < radialSeg; i++) {
    const a = baseIndex + i * 2;
    const b = baseIndex + i * 2 + 1;
    const c = baseIndex + i * 2 + 2;
    const d = baseIndex + i * 2 + 3;
    indices.push(a, c, b, b, c, d);
  }
  return packGeometry(positions, normals, indices);
}

// Torus in the XY plane (Three.js TorusGeometry default), facing +Z.
// `radius` is the ring radius (centre to tube centre), `tube` is the tube
// (cross-section) radius.
function torusGeometry(radius, tube, radialSeg = 16, tubularSeg = 24) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let j = 0; j <= radialSeg; j++) {
    for (let i = 0; i <= tubularSeg; i++) {
      const u = (i / tubularSeg) * Math.PI * 2;
      const v = (j / radialSeg) * Math.PI * 2;
      const cx = (radius + tube * Math.cos(v)) * Math.cos(u);
      const cy = (radius + tube * Math.cos(v)) * Math.sin(u);
      const cz = tube * Math.sin(v);
      positions.push(cx, cy, cz);
      const ringX = radius * Math.cos(u);
      const ringY = radius * Math.sin(u);
      const nx = cx - ringX;
      const ny = cy - ringY;
      const nz = cz;
      const len = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
    }
  }
  for (let j = 1; j <= radialSeg; j++) {
    for (let i = 1; i <= tubularSeg; i++) {
      const a = (tubularSeg + 1) * j + i - 1;
      const b = (tubularSeg + 1) * (j - 1) + i - 1;
      const c = (tubularSeg + 1) * (j - 1) + i;
      const d = (tubularSeg + 1) * j + i;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }
  return packGeometry(positions, normals, indices);
}

// Plane in the XY plane facing +Z (Three.js PlaneGeometry default).
function planeGeometry(size) {
  const [w, h] = size;
  const hw = w / 2;
  const hh = h / 2;
  const positions = [
    -hw, -hh, 0,
     hw, -hh, 0,
     hw,  hh, 0,
    -hw,  hh, 0,
  ];
  const normals = [
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ];
  const indices = [0, 1, 2, 0, 2, 3];
  return packGeometry(positions, normals, indices);
}

function packGeometry(positions, normals, indices) {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
  };
}

// Apply Euler XYZ rotation (matching Three.js's default `<mesh rotation={[x,y,z]}>`)
// then translate by `pos`. Geometry is mutated in place. Sequential rotations
// are applied in order Z, Y, X so that the composed transform equals
// Rx * Ry * Rz, which matches THREE.Matrix4.makeRotationFromEuler('XYZ').
function rotateAxis(arr, axis, angle) {
  if (angle === 0) return;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i];
    const y = arr[i + 1];
    const z = arr[i + 2];
    if (axis === 'x') {
      arr[i + 1] = y * c - z * s;
      arr[i + 2] = y * s + z * c;
    } else if (axis === 'y') {
      arr[i] = x * c + z * s;
      arr[i + 2] = -x * s + z * c;
    } else {
      arr[i] = x * c - y * s;
      arr[i + 1] = x * s + y * c;
    }
  }
}

function transformGeometry(geo, rot, pos) {
  if (rot && (rot[0] !== 0 || rot[1] !== 0 || rot[2] !== 0)) {
    rotateAxis(geo.positions, 'z', rot[2]);
    rotateAxis(geo.positions, 'y', rot[1]);
    rotateAxis(geo.positions, 'x', rot[0]);
    rotateAxis(geo.normals, 'z', rot[2]);
    rotateAxis(geo.normals, 'y', rot[1]);
    rotateAxis(geo.normals, 'x', rot[0]);
  }
  const [px, py, pz] = pos;
  for (let i = 0; i < geo.positions.length; i += 3) {
    geo.positions[i] += px;
    geo.positions[i + 1] += py;
    geo.positions[i + 2] += pz;
  }
}

function buildPartGeometry(part) {
  let geo;
  switch (part.shape) {
    case 'sphere':
      geo = sphereGeometry(part.radius, part.scale ?? [1, 1, 1]);
      break;
    case 'box':
      geo = boxGeometry(part.size);
      break;
    case 'cylinder':
      geo = cylinderGeometry(part.radius, part.height);
      break;
    case 'cone':
      geo = coneGeometry(part.radius, part.height);
      break;
    case 'capsule':
      geo = capsuleGeometry(part.radius, part.height);
      break;
    case 'torus':
      geo = torusGeometry(part.radius, part.thickness);
      break;
    case 'plane':
      geo = planeGeometry(part.size);
      break;
    default:
      throw new Error(`unhandled shape "${part.shape}"`);
  }
  transformGeometry(geo, part.rot, part.pos);
  return geo;
}

// ---------- color -----------------------------------------------------------

function hexToLinearRgba(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // sRGB -> linear. glTF baseColorFactor is linear.
  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [toLin(r), toLin(g), toLin(b), 1];
}

// ---------- compile ---------------------------------------------------------

function accessorMinMax(arr, components) {
  const min = new Array(components).fill(Infinity);
  const max = new Array(components).fill(-Infinity);
  for (let i = 0; i < arr.length; i += components) {
    for (let c = 0; c < components; c++) {
      const v = arr[i + c];
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }
  }
  return { min, max };
}

function compile(model) {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene(model.name);

  // Bones: one node per bone, parent links honored. All bones share a single
  // skin. Inverse bind matrix is identity (bones sit at origin in rest pose).
  const boneNodes = new Map();
  for (const b of model.bones) {
    const n = doc.createNode(b.name).setTranslation(b.head);
    boneNodes.set(b.name, n);
  }
  for (const b of model.bones) {
    if (b.parent) {
      const parent = boneNodes.get(b.parent);
      if (!parent) throw new Error(`bone "${b.name}" references unknown parent "${b.parent}"`);
      parent.addChild(boneNodes.get(b.name));
    }
  }
  const rootBones = model.bones.filter((b) => !b.parent);
  if (rootBones.length !== 1) {
    throw new Error(`expected exactly one root bone, found ${rootBones.length}`);
  }
  const skeletonRoot = boneNodes.get(rootBones[0].name);
  scene.addChild(skeletonRoot);

  // Inverse bind matrices (identity per joint, in joint order).
  const joints = model.bones.map((b) => boneNodes.get(b.name));
  const ibm = new Float32Array(joints.length * 16);
  for (let j = 0; j < joints.length; j++) {
    // column-major identity
    ibm[j * 16 + 0] = 1;
    ibm[j * 16 + 5] = 1;
    ibm[j * 16 + 10] = 1;
    ibm[j * 16 + 15] = 1;
  }
  const ibmAccessor = doc
    .createAccessor('ibm')
    .setType('MAT4')
    .setArray(ibm);

  const skin = doc.createSkin(`${model.name}-skin`).setInverseBindMatrices(ibmAccessor);
  for (const j of joints) skin.addJoint(j);
  skin.setSkeleton(skeletonRoot);

  // Mesh: one primitive per part.
  const mesh = doc.createMesh(model.name);
  const jointIndex = new Map(model.bones.map((b, i) => [b.name, i]));

  // Build every part's geometry up front so we can compute the global Y
  // bounds and auto-align the model so its lowest vertex sits at y=0. This
  // is the only "magic" the compiler performs: TOML authors place parts in
  // whatever local space matches the source they're porting from, and the
  // compiler shifts the result so the validator's feet-at-origin contract
  // is satisfied by construction. No per-model knob.
  const geos = model.parts.map((part) => {
    const ji = jointIndex.get(part.bone);
    if (ji == null) throw new Error(`part references unknown bone "${part.bone}"`);
    return { ji, geo: buildPartGeometry(part), part };
  });
  let globalMinY = Infinity;
  for (const { geo } of geos) {
    for (let i = 1; i < geo.positions.length; i += 3) {
      if (geo.positions[i] < globalMinY) globalMinY = geo.positions[i];
    }
  }
  if (Number.isFinite(globalMinY) && globalMinY !== 0) {
    const shift = -globalMinY;
    for (const { geo } of geos) {
      for (let i = 1; i < geo.positions.length; i += 3) {
        geo.positions[i] += shift;
      }
    }
  }

  for (let pi = 0; pi < geos.length; pi++) {
    const { ji, geo, part } = geos[pi];
    const vcount = geo.positions.length / 3;

    const positionAcc = doc
      .createAccessor(`pos-${pi}`)
      .setType('VEC3')
      .setArray(geo.positions);
    {
      const { min, max } = accessorMinMax(geo.positions, 3);
      // gltf-transform writes min/max from the array when explicitly set.
      // We use the public API `setMin`/`setMax` if available; otherwise the
      // NodeIO writer will recompute from the array for POSITION anyway.
      if (typeof positionAcc.setMin === 'function') positionAcc.setMin(min);
      if (typeof positionAcc.setMax === 'function') positionAcc.setMax(max);
    }

    const normalAcc = doc
      .createAccessor(`nrm-${pi}`)
      .setType('VEC3')
      .setArray(geo.normals);

    const indexAcc = doc
      .createAccessor(`idx-${pi}`)
      .setType('SCALAR')
      .setArray(geo.indices);

    // Skinning: every vertex weighted 100% to its part's bone.
    const joints0 = new Uint16Array(vcount * 4);
    const weights0 = new Float32Array(vcount * 4);
    for (let v = 0; v < vcount; v++) {
      joints0[v * 4] = ji;
      weights0[v * 4] = 1;
    }
    const jointsAcc = doc
      .createAccessor(`joints-${pi}`)
      .setType('VEC4')
      .setArray(joints0);
    const weightsAcc = doc
      .createAccessor(`weights-${pi}`)
      .setType('VEC4')
      .setArray(weights0);

    const material = doc
      .createMaterial(`mat-${pi}`)
      .setBaseColorFactor(hexToLinearRgba(part.color))
      .setRoughnessFactor(0.6)
      .setMetallicFactor(0.0);

    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', positionAcc)
      .setAttribute('NORMAL', normalAcc)
      .setAttribute('JOINTS_0', jointsAcc)
      .setAttribute('WEIGHTS_0', weightsAcc)
      .setIndices(indexAcc)
      .setMaterial(material);

    mesh.addPrimitive(prim);
  }

  const meshNode = doc.createNode(`${model.name}-mesh`).setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // Animations.
  for (const [animName, anim] of Object.entries(model.animations)) {
    const a = doc.createAnimation(animName);
    for (const track of anim.tracks) {
      const target = boneNodes.get(track.bone);
      if (!target) throw new Error(`animation ${animName}: unknown bone "${track.bone}"`);
      const components = track.path === 'rotation' ? 4 : 3;
      for (const v of track.values) {
        if (v.length !== components) {
          throw new Error(
            `animation ${animName} track on ${track.bone}.${track.path}: ` +
              `expected ${components}-component values, got length ${v.length}`,
          );
        }
      }
      if (track.values.length !== track.times.length) {
        throw new Error(
          `animation ${animName} track on ${track.bone}.${track.path}: ` +
            `${track.times.length} times vs ${track.values.length} values`,
        );
      }

      const input = doc
        .createAccessor(`${animName}-${track.bone}-${track.path}-in`)
        .setType('SCALAR')
        .setArray(new Float32Array(track.times));
      const flat = new Float32Array(track.values.length * components);
      for (let i = 0; i < track.values.length; i++) {
        for (let c = 0; c < components; c++) flat[i * components + c] = track.values[i][c];
      }
      const output = doc
        .createAccessor(`${animName}-${track.bone}-${track.path}-out`)
        .setType(components === 4 ? 'VEC4' : 'VEC3')
        .setArray(flat);

      const sampler = doc
        .createAnimationSampler()
        .setInput(input)
        .setOutput(output)
        .setInterpolation('LINEAR');
      a.addSampler(sampler);

      const channel = doc
        .createAnimationChannel()
        .setTargetNode(target)
        .setTargetPath(track.path)
        .setSampler(sampler);
      a.addChannel(channel);
    }
  }

  return doc;
}

// ---------- driver ----------------------------------------------------------

function readModel(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const data = parseToml(raw);
  const parsed = Model.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(`${file}: schema errors:\n${issues}`);
  }
  // Sanity: all four required animations present (defensive — zod already enforced).
  for (const req of REQUIRED_ANIMS) {
    if (!(req in parsed.data.animations)) {
      throw new Error(`${file}: missing required animation "${req}"`);
    }
  }
  return parsed.data;
}

async function main() {
  const srcDir = path.resolve(process.cwd(), 'art');
  const outDir = path.resolve(process.cwd(), 'public/models');
  fs.mkdirSync(outDir, { recursive: true });

  if (!fs.existsSync(srcDir)) {
    console.log('compile-models: no art/ directory — nothing to compile');
    return 0;
  }
  const sources = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith('.model.toml'))
    .sort();
  if (sources.length === 0) {
    console.log('compile-models: no .model.toml sources');
    return 0;
  }

  const io = new NodeIO();
  let failed = 0;
  for (const src of sources) {
    const srcPath = path.join(srcDir, src);
    try {
      const model = readModel(srcPath);
      const doc = compile(model);
      const outPath = path.join(outDir, `${model.name}.glb`);
      await io.write(outPath, doc);
      const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
      console.log(`  OK   ${src} -> public/models/${model.name}.glb (${sizeKb} KB)`);
    } catch (e) {
      failed++;
      console.error(`  FAIL ${src}`);
      console.error(`       ${e.message.replace(/\n/g, '\n       ')}`);
    }
  }

  if (failed > 0) {
    console.error(`\ncompile-models: ${failed} file(s) failed`);
    return 1;
  }
  return 0;
}

const isMain = import.meta.url === url.pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  main().then((c) => process.exit(c));
}
