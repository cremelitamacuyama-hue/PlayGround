import * as THREE from 'three';

/** Shared PS1 vertex-snap resolution. Updated when the low-res buffer changes. */
export const snapResolution = new THREE.Vector2(420, 236);

const textureCache = new Map();

function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function tex(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 1;
  return t;
}

function noiseFill(ctx, w, h, colorFn, count = 500) {
  const r = rng(7341);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colorFn(r);
    ctx.fillRect((r() * w) | 0, (r() * h) | 0, 1 + ((r() * 3) | 0), 1 + ((r() * 2) | 0));
  }
}

export function concreteTexture(repeatX = 2, repeatY = 2, seed = 1, base = '#565954') {
  const key = `concrete${seed}${base}${repeatX}${repeatY}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(64, 64);
  const r = rng(seed * 91 + 7);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 64);
  noiseFill(ctx, 64, 64, (rand) => {
    const v = 64 + ((rand() * 32) | 0);
    return `rgba(${v},${v + 2},${v - 1},${0.13 + rand() * 0.24})`;
  }, 900);
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `rgba(28,30,27,${0.25 + r() * 0.3})`;
    ctx.lineWidth = r() > 0.7 ? 2 : 1;
    ctx.beginPath();
    let x = r() * 64;
    let y = r() * 64;
    ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      x += (r() - 0.5) * 22;
      y += (r() - 0.3) * 16;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = 'rgba(22,24,22,0.20)';
    ctx.fillRect(r() * 64, r() * 64, 2 + r() * 10, 1 + r() * 3);
  }
  const t = tex(c, repeatX, repeatY);
  textureCache.set(key, t);
  return t;
}

export function asphaltTexture(repeatX = 4, repeatY = 3) {
  const key = `asphalt${repeatX}${repeatY}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(64, 64);
  ctx.fillStyle = '#292d2d';
  ctx.fillRect(0, 0, 64, 64);
  const r = rng(190);
  noiseFill(ctx, 64, 64, (rand) => {
    const v = 32 + ((rand() * 28) | 0);
    return `rgba(${v},${v + 2},${v + 1},${0.3 + rand() * 0.3})`;
  }, 1500);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = 'rgba(12,14,14,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let x = r() * 64;
    let y = r() * 64;
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (r() - 0.4) * 18;
      y += (r() - 0.5) * 25;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const t = tex(c, repeatX, repeatY);
  textureCache.set(key, t);
  return t;
}

export function sidewalkTexture(repeatX = 4, repeatY = 2) {
  const key = `sidewalk${repeatX}${repeatY}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(64, 64);
  ctx.fillStyle = '#4c4e48';
  ctx.fillRect(0, 0, 64, 64);
  const r = rng(511);
  noiseFill(ctx, 64, 64, (rand) => {
    const v = 58 + ((rand() * 26) | 0);
    return `rgba(${v},${v + 1},${v - 2},${0.2 + rand() * 0.2})`;
  }, 500);
  ctx.strokeStyle = 'rgba(24,25,23,0.42)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 64; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 64); ctx.stroke();
  }
  for (let y = 0; y <= 64; y += 16) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
  }
  const t = tex(c, repeatX, repeatY);
  textureCache.set(key, t);
  return t;
}

export function brickTexture(repeatX = 3, repeatY = 2) {
  const key = `brick${repeatX}${repeatY}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(64, 64);
  ctx.fillStyle = '#51433a';
  ctx.fillRect(0, 0, 64, 64);
  const r = rng(902);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 5; col++) {
      const x = col * 13 + (row % 2 ? 6 : 0) - 6;
      const y = row * 8;
      const v = 68 + ((r() * 30) | 0);
      ctx.fillStyle = `rgb(${v + 18},${v - 2},${v - 12})`;
      ctx.fillRect(x + 1, y + 1, 11, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(x + 1, y + 1, 11, 1);
    }
  }
  ctx.fillStyle = 'rgba(28,25,23,0.35)';
  for (let y = 0; y < 64; y += 8) ctx.fillRect(0, y, 64, 1);
  const t = tex(c, repeatX, repeatY);
  textureCache.set(key, t);
  return t;
}

export function facadeTexture(variant = 0, repeatX = 1, repeatY = 1) {
  const key = `facade${variant}${repeatX}${repeatY}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(128, 128);
  const r = rng(440 + variant * 51);
  const bases = ['#6c6b60', '#615d52', '#747085', '#5a605a'];
  ctx.fillStyle = bases[variant % bases.length];
  ctx.fillRect(0, 0, 128, 128);
  noiseFill(ctx, 128, 128, (rand) => {
    const v = 70 + ((rand() * 32) | 0);
    return `rgba(${v},${v},${v - 4},${0.06 + rand() * 0.12})`;
  }, 1400);
  // concrete bands
  ctx.fillStyle = 'rgba(40,40,36,0.25)';
  for (let y = 32; y < 128; y += 32) ctx.fillRect(0, y, 128, 2);
  // rows of windows
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 9 + col * 31;
      const y = 10 + row * 40;
      const lit = r() > 0.72;
      ctx.fillStyle = 'rgba(23,27,28,0.92)';
      ctx.fillRect(x, y, 18, 22);
      ctx.fillStyle = lit ? (r() > 0.5 ? '#b8924f' : '#7b7149') : '#161d1e';
      ctx.fillRect(x + 2, y + 2, 14, 18);
      if (lit) {
        ctx.fillStyle = 'rgba(255,224,148,0.17)';
        ctx.fillRect(x + 2, y + 2, 5, 18);
      }
      ctx.fillStyle = 'rgba(20,20,20,0.7)';
      ctx.fillRect(x + 9, y + 2, 1, 18);
      ctx.fillRect(x + 2, y + 10, 14, 1);
      // sill
      ctx.fillStyle = 'rgba(44,43,39,0.8)';
      ctx.fillRect(x - 1, y + 22, 20, 2);
    }
  }
  // grime
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(30,30,28,${0.03 + r() * 0.09})`;
    ctx.fillRect(r() * 128, r() * 128, 2 + r() * 8, 4 + r() * 20);
  }
  const t = tex(c, repeatX, repeatY);
  textureCache.set(key, t);
  return t;
}

export function wallTexture() {
  const key = 'wall';
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(128, 96);
  const r = rng(1199);
  ctx.fillStyle = '#6d6e65';
  ctx.fillRect(0, 0, 128, 96);
  noiseFill(ctx, 128, 96, (rand) => {
    const v = 78 + ((rand() * 30) | 0);
    return `rgba(${v},${v + 1},${v - 2},${0.12 + rand() * 0.2})`;
  }, 1000);
  // panel seams and horizontal pipe shadow
  ctx.fillStyle = 'rgba(30,31,29,0.48)';
  ctx.fillRect(42, 0, 2, 96);
  ctx.fillRect(86, 0, 2, 96);
  ctx.fillRect(0, 16, 128, 1);
  ctx.fillRect(0, 75, 128, 2);
  ctx.fillStyle = 'rgba(28,29,27,0.65)';
  for (let i = 0; i < 12; i++) {
    const x = 5 + r() * 118;
    const y = 5 + r() * 55;
    ctx.fillRect(x, y, 3 + r() * 8, 1 + r() * 3);
  }
  // faded stencil
  ctx.save();
  ctx.translate(103, 53);
  ctx.rotate(-0.03);
  ctx.fillStyle = 'rgba(38,39,35,0.35)';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('DDR', 0, 0);
  ctx.restore();
  const t = tex(c, 1, 1);
  textureCache.set(key, t);
  return t;
}

export function sandbagTexture() {
  const key = 'sandbag';
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(64, 64);
  ctx.fillStyle = '#8a7b5d';
  ctx.fillRect(0, 0, 64, 64);
  const r = rng(31);
  noiseFill(ctx, 64, 64, (rand) => {
    const v = 105 + ((rand() * 42) | 0);
    return `rgba(${v},${v - 10},${v - 32},${0.2 + rand() * 0.3})`;
  }, 900);
  ctx.strokeStyle = 'rgba(51,45,32,0.55)';
  ctx.lineWidth = 2;
  for (let y = 10; y < 64; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(20, y - 3, 42, y + 3, 64, y);
    ctx.stroke();
  }
  const t = tex(c, 1, 1);
  textureCache.set(key, t);
  return t;
}

export function woodTexture(repeatX = 1, repeatY = 1) {
  const key = `wood${repeatX}${repeatY}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(64, 64);
  ctx.fillStyle = '#5b4832';
  ctx.fillRect(0, 0, 64, 64);
  const r = rng(771);
  for (let i = 0; i < 35; i++) {
    const v = 68 + r() * 40;
    ctx.strokeStyle = `rgba(${v},${v * 0.72},${v * 0.45},${0.14 + r() * 0.3})`;
    ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(0, r() * 64);
    ctx.bezierCurveTo(22, r() * 64, 42, r() * 64, 64, r() * 64);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(30,20,12,0.35)';
  for (let x = 0; x < 64; x += 16) ctx.fillRect(x, 0, 1, 64);
  const t = tex(c, repeatX, repeatY);
  textureCache.set(key, t);
  return t;
}

export function metalTexture(repeatX = 1, repeatY = 1, color = '#464a48') {
  const key = `metal${color}${repeatX}${repeatY}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(64, 64);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 64, 64);
  const r = rng(155);
  noiseFill(ctx, 64, 64, (rand) => {
    const v = 50 + ((rand() * 38) | 0);
    return `rgba(${v},${v + 2},${v},${0.1 + rand() * 0.18})`;
  }, 700);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(95,62,38,${0.08 + r() * 0.16})`;
    ctx.fillRect(r() * 64, r() * 64, 2 + r() * 12, 1 + r() * 4);
  }
  const t = tex(c, repeatX, repeatY);
  textureCache.set(key, t);
  return t;
}

export function dirtTexture() {
  const key = 'dirt';
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(64, 64);
  ctx.fillStyle = '#3b3830';
  ctx.fillRect(0, 0, 64, 64);
  const r = rng(66);
  noiseFill(ctx, 64, 64, (rand) => {
    const v = 42 + ((rand() * 35) | 0);
    return `rgba(${v + 8},${v + 3},${v - 4},${0.25 + rand() * 0.3})`;
  }, 1100);
  const t = tex(c, 3, 2);
  textureCache.set(key, t);
  return t;
}

export function signTexture(lines, opts = {}) {
  const {
    w = 256, h = 96, bg = '#d9d1b8', fg = '#20251f', border = '#20251f',
    sub = '', accent = '#a53c32', align = 'center',
  } = opts;
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const r = rng(8021);
  noiseFill(ctx, w, h, (rand) => `rgba(40,40,34,${0.02 + rand() * 0.08})`, 300);
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = fg;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.floor(h * 0.31)}px Arial Narrow, Arial`;
  const x = align === 'center' ? w / 2 : 13;
  ctx.fillText(lines, x, h * 0.44);
  if (sub) {
    ctx.fillStyle = accent;
    ctx.font = `700 ${Math.floor(h * 0.15)}px Arial Narrow, Arial`;
    ctx.fillText(sub, x, h * 0.76);
  }
  const t = tex(c, 1, 1);
  return t;
}

export function graffitiTexture(text, color = '#22252a') {
  const { c, ctx } = canvas2d(256, 128);
  ctx.clearRect(0, 0, 256, 128);
  ctx.save();
  ctx.translate(128, 70);
  ctx.rotate(-0.08);
  ctx.textAlign = 'center';
  ctx.font = '900 54px Arial Narrow, Impact, sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.font = '900 22px Arial Narrow, Impact, sans-serif';
  ctx.fillStyle = 'rgba(190,70,50,0.85)';
  ctx.fillText('FREIHEIT', 0, 28);
  ctx.restore();
  const t = tex(c, 1, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function posterTexture(kind = 0) {
  const { c, ctx } = canvas2d(96, 128);
  if (kind === 0) {
    ctx.fillStyle = '#b04738';
    ctx.fillRect(0, 0, 96, 128);
    ctx.fillStyle = '#e4d7b9';
    ctx.fillRect(8, 8, 80, 112);
    ctx.fillStyle = '#9e332b';
    ctx.font = '900 24px Arial Narrow, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DDR', 48, 43);
    ctx.fillStyle = '#27323a';
    ctx.font = '700 11px Arial Narrow, Arial';
    ctx.fillText('SOZIALISMUS', 48, 62);
    ctx.fillText('SIEGT', 48, 74);
    ctx.fillStyle = '#9e332b';
    ctx.fillRect(28, 84, 40, 17);
    ctx.fillStyle = '#e4d7b9';
    ctx.font = '700 7px monospace';
    ctx.fillText('1979', 48, 95);
  } else {
    ctx.fillStyle = '#243845';
    ctx.fillRect(0, 0, 96, 128);
    ctx.strokeStyle = '#cdbb8d';
    ctx.lineWidth = 3;
    ctx.strokeRect(7, 7, 82, 114);
    ctx.fillStyle = '#cdbb8d';
    ctx.textAlign = 'center';
    ctx.font = '900 22px Arial Narrow, Arial';
    ctx.fillText('US', 48, 48);
    ctx.font = '700 10px Arial Narrow, Arial';
    ctx.fillText('ARMY', 48, 61);
    ctx.fillStyle = '#b94a3e';
    ctx.fillRect(24, 72, 48, 2);
    ctx.fillStyle = '#d8cfb2';
    ctx.font = '7px monospace';
    ctx.fillText('BERLIN', 48, 87);
    ctx.fillText('BRIGADE', 48, 97);
  }
  const t = tex(c, 1, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function radialSprite(size, stops, seed = 1) {
  const { c, ctx } = canvas2d(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([p, color]) => g.addColorStop(p, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function muzzleTexture() {
  if (textureCache.has('muzzle')) return textureCache.get('muzzle');
  const { c, ctx } = canvas2d(64, 64);
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,250,214,1)');
  g.addColorStop(0.18, 'rgba(255,210,105,0.98)');
  g.addColorStop(0.45, 'rgba(246,124,33,0.72)');
  g.addColorStop(1, 'rgba(255,80,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(255,245,210,0.94)';
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rad = i % 2 ? 7 : 28;
    ctx.lineTo(32 + Math.cos(a) * rad, 32 + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('muzzle', t);
  return t;
}

export function smokeTexture() {
  if (textureCache.has('smoke')) return textureCache.get('smoke');
  const { c, ctx } = canvas2d(64, 64);
  const r = rng(909);
  for (let i = 0; i < 22; i++) {
    const x = 12 + r() * 40;
    const y = 12 + r() * 40;
    const rad = 5 + r() * 16;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(150,145,130,${0.12 + r() * 0.18})`);
    g.addColorStop(1, 'rgba(110,110,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('smoke', t);
  return t;
}

export function bloodTexture() {
  if (textureCache.has('blood')) return textureCache.get('blood');
  const t = radialSprite(32, [[0, 'rgba(120,12,8,0.9)'], [0.5, 'rgba(80,8,6,0.55)'], [1, 'rgba(60,6,4,0)']]);
  textureCache.set('blood', t);
  return t;
}

export function decalTexture() {
  if (textureCache.has('decal')) return textureCache.get('decal');
  const { c, ctx } = canvas2d(32, 32);
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
  g.addColorStop(0, 'rgba(7,8,7,0.9)');
  g.addColorStop(0.5, 'rgba(16,17,15,0.72)');
  g.addColorStop(1, 'rgba(20,20,18,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('decal', t);
  return t;
}

export function markerTexture(color = '#8fc0e4', type = 'chevron') {
  const key = `marker${color}${type}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const { c, ctx } = canvas2d(48, 32);
  ctx.clearRect(0, 0, 48, 32);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 2;
  if (type === 'chevron') {
    ctx.beginPath();
    ctx.moveTo(8, 12); ctx.lineTo(24, 26); ctx.lineTo(40, 12);
    ctx.lineTo(34, 8); ctx.lineTo(24, 18); ctx.lineTo(14, 8);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.arc(24, 16, 8, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, t);
  return t;
}

export function fireTexture() {
  if (textureCache.has('fire')) return textureCache.get('fire');
  const { c, ctx } = canvas2d(32, 64);
  const r = rng(441);
  for (let i = 0; i < 18; i++) {
    const x = 8 + r() * 16;
    const y = 10 + r() * 50;
    const rad = 3 + r() * 10;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, r() > 0.45 ? 'rgba(255,229,150,0.95)' : 'rgba(255,153,60,0.9)');
    g.addColorStop(0.55, 'rgba(230,88,24,0.55)');
    g.addColorStop(1, 'rgba(180,45,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('fire', t);
  return t;
}

export function flagTexture(side = 'NATO') {
  const { c, ctx } = canvas2d(96, 64);
  if (side === 'NATO') {
    ctx.fillStyle = '#173b55'; ctx.fillRect(0, 0, 96, 64);
    ctx.fillStyle = '#e7e2d2'; ctx.beginPath(); ctx.arc(48, 31, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#173b55'; ctx.beginPath(); ctx.arc(48, 31, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e7e2d2'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(48, 31); ctx.lineTo(48 + Math.cos(a) * 30, 31 + Math.sin(a) * 30); ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#8f1d1b'; ctx.fillRect(0, 0, 96, 64);
    ctx.fillStyle = '#d8b45d';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const rad = i % 2 ? 9 : 21;
      ctx.lineTo(48 + Math.cos(a) * rad, 32 + Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill();
  }
  const t = tex(c, 1, 1);
  return t;
}

/** Attach the wobbly vertex snap PS1 look to a material. */
export function ps1ify(material, enabled = true) {
  if (!enabled) return material;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = { value: snapResolution };
    shader.vertexShader = 'uniform vec2 uSnap;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
      vec2 snapNdc = gl_Position.xy / gl_Position.w;
      vec2 grid = uSnap * 0.5;
      snapNdc = floor(snapNdc * grid + 0.5) / grid;
      gl_Position.xy = snapNdc * gl_Position.w;
      `
    );
  };
  material.customProgramCacheKey = () => 'ps1snap';
  return material;
}

export function lambert(params = {}, snap = true) {
  const m = new THREE.MeshLambertMaterial({ flatShading: true, ...params });
  return ps1ify(m, snap);
}

export function basic(params = {}, snap = false) {
  const m = new THREE.MeshBasicMaterial({ ...params });
  return ps1ify(m, snap);
}
