import * as THREE from 'three';
import './style.css';
import {
  asphaltTexture, sidewalkTexture, facadeTexture, wallTexture, sandbagTexture,
  woodTexture, metalTexture, dirtTexture, signTexture, graffitiTexture, posterTexture,
  muzzleTexture, smokeTexture, ps1ify, lambert, basic,
} from './textures.js';

// Checkpoint Berlin — single-player arcade FPS, fictional 1979 scenario.

const $ = (id) => document.getElementById(id);
const ui = {
  boot: $('boot'), menu: $('menu'), briefing: $('briefing'), hud: $('hud'), pause: $('pause'), result: $('result'),
  enemyCount: $('enemy-count'), health: $('health-num'), healthBar: $('health-bar'), armor: $('armor-num'), armorBar: $('armor-bar'),
  wave: $('wave-num'), objective: $('objective-text'), ammo: $('ammo-mag'), reserve: $('ammo-reserve'), weapon: $('weapon-name'),
  fireMode: $('fire-mode'), ammoLabel: $('ammo-label'), grenades: $('grenade-count'), clock: $('hud-clock'),
};
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = false;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#7b8582');
scene.fog = new THREE.FogExp2('#7b8582', 0.012);
const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 180);
camera.rotation.order = 'YXZ';
scene.add(camera);

const hemi = new THREE.HemisphereLight('#d2d3c8', '#292925', 1.65);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#e2d5b6', 1.2);
sun.position.set(-12, 24, -10);
scene.add(sun);

const mat = (color, extra = {}) => lambert({ color, ...extra });
const world = new THREE.Group(); scene.add(world);
const enemies = [];
const effects = [];
const colliders = [];
const clock = new THREE.Timer();
clock.connect(document);
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const muzzleTex = muzzleTexture();
const smokeTex = smokeTexture();
let side = 'NATO';
let running = false;
let paused = false;
let pointerLocked = false;
let firstPersonGun;
let weaponSlot = 1;
let weaponStocks = {};
let gunKick = 0;
let bobTime = 0;
let isMoving = false;
let health = 100;
let armor = 50;
let ammo = 20;
let reserveAmmo = 120;
let grenades = 2;
let wave = 0;
let kills = 0;
let shots = 0;
let hits = 0;
let score = 0;
let startTime = 0;
let waveDelay = 0;
let fireCooldown = 0;
let reloadTimer = 0;
let damageTimer = 0;
let toastTimer = 0;
let gameTime = 0;
let yaw = 0;
let pitch = 0;
const keys = Object.create(null);
const touch = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, firing: false, stickId: null, lookId: null, lastX: 0, lastY: 0 };
const player = { x: 0, y: 1.68, z: 5, vx: 0, vz: 0, crouch: false };
const enemySide = () => side === 'NATO' ? 'Pacto de Varsovia' : 'OTAN';
const weaponInfo = () => side === 'NATO'
  ? { primary: 'M16A1', ammo: 'AUTO · 5.56', label: 'CARGADOR STANAG', mag: 20, damage: 38, interval: 0.16 }
  : { primary: 'AKM', ammo: 'AUTO · 7.62', label: 'CARGADOR CURVO', mag: 30, damage: 45, interval: 0.19 };

function resize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  const scale = Math.min(1, 520 / w, 320 / h);
  const rw = Math.max(280, Math.floor(w * scale));
  const rh = Math.max(180, Math.floor(h * scale));
  renderer.setSize(rw, rh, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function box(parent, name, size, position, material, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, name, rTop, rBottom, height, position, material, segments = 7) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, segments), material);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}
function addCollider(mesh) { colliders.push(mesh); return mesh; }

function createWorld() {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(22, 190), new THREE.MeshLambertMaterial({ map: asphaltTexture(4, 18), color: '#b0b0a4' }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, -0.035, -35); world.add(road);
  const pavementMat = new THREE.MeshLambertMaterial({ map: sidewalkTexture(4, 12), color: '#b0b0a4' });
  for (const x of [-13.5, 13.5]) {
    const pavement = new THREE.Mesh(new THREE.PlaneGeometry(5, 190), pavementMat);
    pavement.rotation.x = -Math.PI / 2; pavement.position.set(x, 0, -35); world.add(pavement);
  }
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(100, 210), new THREE.MeshLambertMaterial({ map: dirtTexture(), color: '#aaa99a' }));
  lot.rotation.x = -Math.PI / 2; lot.position.set(0, -0.09, -35); world.add(lot);
  // Cracked lane markings and tram rails.
  for (const x of [-1.25, 1.25]) {
    const rail = box(world, 'tram rail', [0.09, 0.05, 170], [x, 0.015, -35], mat('#77796f'));
    rail.rotation.y = 0;
  }
  for (let z = -90; z < 22; z += 13) {
    box(world, 'lane dash', [0.12, 0.012, 3.2], [0, 0.006, z], mat('#908d76'));
  }
  // Divided Berlin street: block façades with repetitive low-resolution windows.
  for (const sign of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const z = -83 + i * 15 + (i % 2) * 3;
      const height = 11 + (i % 3) * 2.3;
      const width = 8.5 + (i % 2) * 2;
      const building = box(world, 'facade', [width, height, 12], [sign * (17.8 + width / 2), height / 2 - 0.05, z],
        new THREE.MeshLambertMaterial({ map: facadeTexture((i + (sign > 0 ? 1 : 0)) % 4, 1.4, 1), color: '#aaa99c', flatShading: true }));
      building.rotation.y = sign < 0 ? Math.PI : 0;
      addCollider(building);
      // Roofline and occasional fire escapes / drain pipes.
      box(world, 'roof ledge', [width + 0.35, 0.38, 12.35], [sign * (17.8 + width / 2), height + 0.1, z], mat('#484944'));
      const pipeX = sign * (17.8 + (sign > 0 ? 0.35 : width - 0.35));
      cylinder(world, 'drainpipe', 0.09, 0.09, height, [pipeX, height / 2, z - 5.4], mat('#343936'), 5);
      if (i % 2 === 0) {
        const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.45), new THREE.MeshBasicMaterial({ map: posterTexture(sign < 0 ? 1 : 0), side: THREE.DoubleSide }));
        poster.position.set(sign * 13.32, 1.8, z + 4.5); poster.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2; world.add(poster);
      }
    }
  }
  // Concrete anti-vehicle blocks, sandbags, and a torn-up checkpoint.
  const bagMat = new THREE.MeshLambertMaterial({ map: sandbagTexture(), color: '#b2a488' });
  const woodMat = new THREE.MeshLambertMaterial({ map: woodTexture(), color: '#a3977e' });
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 1.15;
    const bag = box(world, 'sandbag', [1.12, 0.42, 0.52], [x, 0.25, -10.8], bagMat, [0, (i % 2) * 0.04, 0]);
    if (i !== 2) addCollider(bag);
    if (i < 4) box(world, 'sandbag upper', [1.08, 0.4, 0.5], [x + 0.16, 0.64, -10.85], bagMat);
  }
  // Passable center lane between the improvised cover.
  for (const x of [-8, 8]) {
    const barrier = box(world, 'dragon teeth', [1.1, 1.35, 1.1], [x, 0.65, -18], mat('#77786d'), [0, Math.PI / 4, 0]);
    addCollider(barrier);
    box(world, 'wood brace', [3.8, 0.12, 0.14], [x, 1.05, -18.1], woodMat, [0, 0.2, 0]);
  }
  const wall = box(world, 'Berlin Wall', [34, 5.5, 0.65], [0, 2.75, -74], new THREE.MeshLambertMaterial({ map: wallTexture(), color: '#b3b0a3' }));
  addCollider(wall);
  for (let x = -17; x <= 17; x += 2.4) {
    box(world, 'wall cap', [2.4, 0.28, 0.83], [x, 5.55, -74], mat('#74766e'));
    if (x % 4.8 === 0) cylinder(world, 'razor post', 0.045, 0.045, 1.3, [x, 6.18, -74], mat('#56584f'), 5);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.55), new THREE.MeshBasicMaterial({ map: signTexture('SEKTOR CHARLIE', { sub: 'GRENZÜBERGANG · 1979', bg: '#d1c7a6', accent: '#9e3b30' }), side: THREE.DoubleSide }));
  sign.position.set(0, 4.25, -73.62); world.add(sign);
  // Street lights and a smoky, cold horizon.
  for (const x of [-10.2, 10.2]) for (let z = -65; z < -2; z += 25) {
    cylinder(world, 'street lamp', 0.09, 0.13, 6.1, [x, 3.05, z], mat('#3d413e'), 6);
    box(world, 'lamp arm', [1.3, 0.09, 0.1], [x + (x < 0 ? 0.45 : -0.45), 5.95, z], mat('#3d413e'));
    box(world, 'lamp shade', [0.38, 0.16, 0.42], [x + (x < 0 ? 0.96 : -0.96), 5.85, z], mat('#aaa48a'));
  }
  for (let i = 0; i < 8; i++) {
    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.2, depthWrite: false }));
    smoke.position.set((i - 4) * 5, 5 + (i % 3) * 1.5, -45 - (i % 4) * 7);
    smoke.scale.set(12 + (i % 3) * 3, 6 + (i % 2) * 2, 1); world.add(smoke);
    effects.push({ sprite: smoke, life: Infinity, drift: 0.06 + (i % 4) * 0.02 });
  }
  // Close roadside details give the player visual reference and cover.
  for (const x of [-5.4, 5.4]) {
    const crate = box(world, 'crate', [1.1, 0.8, 0.95], [x, 0.4, 1], woodMat, [0, x < 0 ? 0.08 : -0.08, 0]);
    addCollider(crate);
    box(world, 'crate lid', [1.12, 0.08, 0.98], [x, 0.83, 1], woodMat);
  }
}

function createPlayerWeapon() {
  const group = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: '#343a35', flatShading: true });
  const metal = new THREE.MeshLambertMaterial({ map: metalTexture(1, 1, '#353a37'), color: '#c4c0ac', flatShading: true });
  const wood = new THREE.MeshLambertMaterial({ map: woodTexture(), color: side === 'NATO' ? '#423c2c' : '#694b2d', flatShading: true });
  box(group, 'receiver', [0.16, 0.16, 0.62], [0, 0, -0.29], dark);
  box(group, 'handguard', [0.13, 0.13, 0.38], [0, -0.015, -0.68], side === 'NATO' ? dark : wood);
  box(group, 'stock', [0.12, 0.14, 0.34], [0, -0.005, 0.12], side === 'NATO' ? dark : wood);
  const barrel = cylinder(group, 'barrel', 0.022, 0.028, 0.58, [0, 0.035, -0.96], metal, 6);
  barrel.rotation.x = Math.PI / 2;
  box(group, 'magazine', [0.105, 0.3, 0.14], [0, -0.2, -0.32], side === 'NATO' ? dark : wood, [0.18, 0, 0]);
  box(group, 'rear sight', [0.08, 0.08, 0.07], [0, 0.1, -0.12], metal);
  box(group, 'front sight', [0.04, 0.1, 0.05], [0, 0.095, -0.98], metal);
  // Sleeves and gloved hands, framing the weapon in first person.
  const sleeveColor = side === 'NATO' ? '#555b43' : '#66634e';
  const sleeve = mat(sleeveColor);
  const glove = mat('#45443a');
  for (const sign of [-1, 1]) {
    const arm = box(group, 'sleeve', [0.22, 0.25, 0.48], [sign * 0.24, -0.25, -0.25], sleeve, [0, sign * 0.2, sign * -0.16]);
    arm.material = sleeve;
    box(group, 'glove', [0.19, 0.16, 0.21], [sign * 0.15, -0.19, -0.52], glove, [0, sign * 0.15, 0]);
  }
  group.position.set(0.38, -0.36, -0.42);
  camera.add(group);
  firstPersonGun = group;
}

const hitMeshes = [];
function createEnemy(x, z, index) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.userData = { health: 100 + wave * 12, maxHealth: 100 + wave * 12, cooldown: 1.1 + Math.random() * 1.6, speed: 0.55 + Math.random() * 0.22, phase: Math.random() * 6.28, alive: true };
  const wp = side === 'NATO';
  const uniform = mat(wp ? '#555c48' : '#6b694e');
  const pants = mat(wp ? '#494d3d' : '#575744');
  const helmet = mat(wp ? '#464c3a' : '#51523f');
  const skin = mat('#9c8268');
  const gear = mat(wp ? '#343b32' : '#454438');
  box(root, 'torso', [0.55, 0.72, 0.32], [0, 1.23, 0], uniform);
  box(root, 'webbing', [0.58, 0.18, 0.34], [0, 1.27, -0.018], gear);
  box(root, 'belt', [0.56, 0.11, 0.34], [0, 0.9, 0], gear);
  for (const s of [-1, 1]) {
    box(root, 'leg', [0.22, 0.57, 0.26], [s * 0.15, 0.56, 0], pants, [s * 0.04, 0, s * 0.025]);
    box(root, 'boot', [0.24, 0.14, 0.34], [s * 0.15, 0.16, -0.035], gear);
    box(root, 'arm', [0.19, 0.57, 0.22], [s * 0.36, 1.26, -0.05], uniform, [s * -0.18, 0, s * -0.14]);
  }
  const head = box(root, 'head', [0.27, 0.31, 0.27], [0, 1.78, 0], skin);
  const hat = wp
    ? cylinder(root, 'M1 helmet', 0.2, 0.23, 0.15, [0, 1.97, 0], helmet, 8)
    : cylinder(root, 'SSh-68 helmet', 0.17, 0.21, 0.28, [0, 1.97, 0], helmet, 7);
  box(root, 'rifle', [0.1, 0.11, 0.78], [0.08, 1.2, -0.44], mat('#343831'), [0.06, 0, 0.08]);
  const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.05, 0.62), new THREE.MeshBasicMaterial({ visible: false }));
  hitbox.position.y = 1.04;
  hitbox.userData.enemyRoot = root;
  root.add(hitbox);
  hitMeshes.push(hitbox);
  root.traverse((object) => { if (object.isMesh && object !== hitbox) object.userData.enemyRoot = root; });
  world.add(root);
  enemies.push(root);
  return root;
}

function clearEnemies() {
  for (const enemy of enemies) world.remove(enemy);
  enemies.length = 0;
  hitMeshes.length = 0;
}
function spawnWave() {
  wave += 1;
  const count = 3 + wave * 2;
  for (let i = 0; i < count; i++) {
    const lane = [-8.7, -5.7, -2.8, 0, 2.8, 5.7, 8.7][Math.floor(Math.random() * 7)];
    createEnemy(lane + (Math.random() - 0.5) * 1.25, -44 - Math.random() * 24 - (i % 3) * 2, i);
  }
  ui.wave.textContent = wave;
  ui.objective.textContent = `ELIMINA LA OLEADA ${wave}`;
  ui.enemyCount.textContent = enemies.length;
  const banner = $('wave-banner');
  $('wave-banner-num').textContent = String(wave).padStart(2, '0');
  $('wave-banner-sub').textContent = wave === 5 ? 'OLEADA FINAL · NO CEDAS TERRENO' : 'MANTÉN LA POSICIÓN';
  banner.classList.remove('show');
  void banner.offsetWidth;
  banner.classList.add('show');
  addFeed(`OLEADA ${wave}`, `${count} HOSTILES`);
}

function addFeed(title, detail = '') {
  const feed = $('feed');
  const row = document.createElement('span');
  row.innerHTML = `<b>${title}</b>${detail ? ` · ${detail}` : ''}`;
  feed.prepend(row);
  while (feed.children.length > 4) feed.lastElementChild.remove();
  setTimeout(() => row.remove(), 4800);
}
function showToast(text) {
  const toast = $('center-toast');
  toast.textContent = text;
  toast.classList.add('on');
  toastTimer = 1.5;
}
function updateHud() {
  ui.health.textContent = Math.ceil(health);
  ui.healthBar.style.width = `${Math.max(0, health)}%`;
  ui.armor.textContent = Math.ceil(armor);
  ui.armorBar.style.width = `${Math.max(0, armor)}%`;
  ui.ammo.textContent = ammo;
  ui.reserve.textContent = reserveAmmo;
  ui.grenades.textContent = grenades;
  ui.enemyCount.textContent = enemies.filter((e) => e.userData.alive).length;
  const total = Math.max(0, Math.floor(gameTime));
  ui.clock.textContent = `06:${String((40 + total) % 60).padStart(2, '0')}`;
}
function setWeaponInfo() {
  const info = weaponInfo();
  ui.weapon.textContent = weaponSlot === 1 ? info.primary : side === 'NATO' ? 'M1911A1' : 'PISTOLA PM';
  ui.fireMode.textContent = weaponSlot === 1 ? info.ammo : side === 'NATO' ? 'SEMIAUTO · .45' : 'SEMIAUTO · 9×18';
  ui.ammoLabel.textContent = weaponSlot === 1 ? info.label : 'CARGADOR DE PISTOLA';
  ui.ammo.textContent = ammo;
}

function startMission() {
  running = true; paused = false;
  ui.briefing.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.pause.classList.add('hidden'); ui.result.classList.add('hidden');
  health = 100; armor = 50; wave = 0; kills = 0; shots = 0; hits = 0; score = 0;
  weaponSlot = 1;
  ammo = weaponInfo().mag; reserveAmmo = 120;
  weaponStocks = { 1: { ammo, reserve: reserveAmmo }, 2: { ammo: 7, reserve: 35 } };
  grenades = 2;
  fireCooldown = 0; reloadTimer = 0; damageTimer = 0; toastTimer = 0;
  gameTime = 0; waveDelay = 1.25; startTime = performance.now();
  player.x = 0; player.z = 5; player.y = 1.68; player.vx = 0; player.vz = 0;
  yaw = 0; pitch = 0; camera.rotation.set(0, 0, 0); camera.position.set(0, player.y, 5);
  clearEnemies(); setWeaponInfo(); updateHud();
  if (firstPersonGun) camera.remove(firstPersonGun);
  createPlayerWeapon();
  if (!isTouchDevice()) canvas.requestPointerLock?.();
  showToast('SECTOR CHARLIE · DEFENSA ACTIVA');
}
function chooseFaction(faction) {
  side = faction === 'WP' ? 'WP' : 'NATO';
  const wp = side === 'WP';
  document.documentElement.style.setProperty('--nato', wp ? '#d45448' : '#78a7c8');
  $('brief-side').textContent = wp ? 'PACTO DE VARSOVIA' : 'OTAN';
  $('briefing').querySelector('.briefing-card').classList.toggle('wp', wp);
  $('brief-title').textContent = wp ? 'AVANZA AL PUESTO' : 'DEFIENDE EL PUESTO';
  $('brief-copy').textContent = wp
    ? 'La Berlin Brigade bloquea la avenida. Avanza con tu AKM y supera cinco oleadas para asegurar el corredor.'
    : 'Fuerzas del Pacto de Varsovia avanzan por la avenida. Mantén la posición y elimina cinco oleadas enemigas.';
  $('hud-faction').textContent = wp ? 'PACTO DE VARSOVIA' : 'OTAN';
  $('hud-unit-name').textContent = wp ? '6.ª BRIGADA MOTORIZADA' : 'BERLIN BRIGADE';
  $('hud-badge').textContent = wp ? '★' : '✦';
  $('hud-badge').style.color = wp ? 'var(--wp)' : 'var(--nato)';
  ui.menu.classList.add('hidden');
  ui.briefing.classList.remove('hidden');
  setWeaponInfo();
}

function isTouchDevice() { return matchMedia('(pointer: coarse)').matches; }
function setPaused(value) {
  if (!running && value) return;
  paused = value;
  ui.pause.classList.toggle('hidden', !paused);
  if (paused) {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  } else if (!isTouchDevice()) canvas.requestPointerLock?.();
}
function finishMission(win) {
  running = false; paused = false;
  ui.hud.classList.add('hidden'); ui.pause.classList.add('hidden');
  const card = ui.result.querySelector('.result-card');
  card.classList.toggle('win', win); card.classList.toggle('loss', !win);
  $('result-kicker').textContent = win ? 'INFORME DE COMBATE · SECTOR CHARLIE' : 'INFORME DE COMBATE · MISIÓN FALLIDA';
  $('result-title').innerHTML = win ? 'SECTOR<br>ASEGURADO' : 'POSICIÓN<br>PERDIDA';
  $('result-copy').textContent = win ? 'Has resistido las cinco oleadas. Berlín sigue dividida, pero respira.' : `La línea ha caído en la oleada ${Math.min(wave, 5)}. Reagrupa y vuelve al puesto.`;
  $('stat-kills').textContent = kills;
  $('stat-acc').textContent = `${shots ? Math.round(hits / shots * 100) : 0}%`;
  $('stat-score').textContent = score.toLocaleString('es-ES');
  const elapsed = Math.floor(gameTime);
  $('stat-time').textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  ui.result.classList.remove('hidden');
  if (document.pointerLockElement === canvas) document.exitPointerLock();
}

function fire() {
  if (!running || paused || reloadTimer > 0 || fireCooldown > 0) return;
  if (ammo <= 0) { showToast('SIN MUNICIÓN · PULSA R'); fireCooldown = 0.25; return; }
  const pistol = weaponSlot === 2;
  ammo--; shots++;
  fireCooldown = pistol ? 0.32 : weaponInfo().interval;
  gunKick = Math.min(0.16, gunKick + (pistol ? 0.09 : 0.055));
  raycaster.setFromCamera(center, camera);
  raycaster.far = 90;
  const active = enemies.filter((enemy) => enemy.userData.alive);
  const targets = active.flatMap((enemy) => enemy.children.filter((child) => child.isMesh));
  const hitscan = raycaster.intersectObjects([...targets, ...colliders], false);
  const first = hitscan[0];
  if (first && first.object.userData.enemyRoot) {
    const enemy = first.object.userData.enemyRoot;
    if (enemy.userData.alive) {
      const damage = pistol ? 52 : weaponInfo().damage;
      enemy.userData.health -= damage;
      hits++;
      score += 15;
      const marker = $('crosshair').querySelector('.hitmark');
      marker.classList.remove('on'); void marker.offsetWidth; marker.classList.add('on');
      if (enemy.userData.health <= 0) killEnemy(enemy);
    }
  }
  if (first?.point) spawnTracer(first.point);
  if (ammo === 0 && reserveAmmo > 0) showToast('CARGADOR VACÍO · R PARA RECARGAR');
  updateHud();
}
function killEnemy(enemy) {
  if (!enemy.userData.alive) return;
  enemy.userData.alive = false;
  kills++; score += 100 + wave * 25;
  const index = enemies.indexOf(enemy);
  if (index >= 0) enemies.splice(index, 1);
  const h = hitMeshes.findIndex((mesh) => mesh.userData.enemyRoot === enemy);
  if (h >= 0) hitMeshes.splice(h, 1);
  enemy.rotation.z = -0.8; enemy.position.y = -0.45;
  setTimeout(() => world.remove(enemy), 500);
  addFeed('HOSTIL NEUTRALIZADO', `+${100 + wave * 25} PTS`);
  if (enemies.length === 0 && wave < 5) waveDelay = 3.2;
  if (enemies.length === 0 && wave >= 5) setTimeout(() => running && finishMission(true), 450);
}
function throwGrenade() {
  if (!running || paused || grenades <= 0) return;
  grenades--;
  updateHud();
  const grenade = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), mat('#3c4538'));
  grenade.position.copy(camera.position);
  world.add(grenade);
  const direction = new THREE.Vector3(); camera.getWorldDirection(direction);
  effects.push({ grenade, direction, life: 0.65, isGrenade: true });
  showToast('GRANADA · ¡AL SUELO!');
}
function detonateGrenade(effect) {
  const point = effect.grenade.position;
  const blast = new THREE.Sprite(new THREE.SpriteMaterial({ map: muzzleTex, transparent: true, depthWrite: false, color: '#f0a94f' }));
  blast.position.copy(point); blast.scale.set(7, 7, 1); world.add(blast);
  effects.push({ sprite: blast, life: 0.42, startLife: 0.42, fade: true });
  for (const enemy of [...enemies]) {
    const distance = enemy.position.distanceTo(point);
    if (distance < 9) {
      enemy.userData.health -= Math.max(0, 160 * (1 - distance / 11));
      if (enemy.userData.health <= 0) killEnemy(enemy);
    }
  }
  world.remove(effect.grenade);
}
function spawnTracer(point) {
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: muzzleTex, transparent: true, depthWrite: false, color: '#f0c77b' }));
  flash.position.copy(camera.position).add(new THREE.Vector3(0, -0.08, 0));
  flash.position.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.85));
  flash.scale.set(0.42, 0.42, 1); camera.add(flash);
  effects.push({ sprite: flash, life: 0.07, cameraChild: true });
  if (point) {
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: muzzleTex, transparent: true, depthWrite: false, color: '#d9bc83' }));
    spark.position.copy(point); spark.scale.set(0.28, 0.28, 1); world.add(spark);
    effects.push({ sprite: spark, life: 0.12 });
  }
}

function switchWeapon(slot) {
  if (!running || paused || slot === weaponSlot) return;
  weaponStocks[weaponSlot] = { ammo, reserve: reserveAmmo };
  weaponSlot = slot;
  const stock = weaponStocks[weaponSlot];
  ammo = stock.ammo; reserveAmmo = stock.reserve;
  reloadTimer = 0;
  setWeaponInfo(); updateHud();
  showToast(`ARMA: ${ui.weapon.textContent}`);
}
function beginReload() {
  if (!running || paused || reloadTimer > 0) return;
  const capacity = weaponSlot === 1 ? weaponInfo().mag : 7;
  if (ammo >= capacity || reserveAmmo <= 0) return;
  reloadTimer = weaponSlot === 1 ? 1.65 : 1.15;
  showToast('RECARGANDO');
}
function completeReload() {
  const capacity = weaponSlot === 1 ? weaponInfo().mag : 7;
  const amount = Math.min(capacity - ammo, reserveAmmo);
  ammo += amount; reserveAmmo -= amount;
  weaponStocks[weaponSlot] = { ammo, reserve: reserveAmmo };
  updateHud();
  showToast('CARGADOR LISTO');
}
function reload() { beginReload(); }

const collisionBox = new THREE.Box3();
const playerBox = new THREE.Box3();
function collidesAt(x, z) {
  playerBox.min.set(x - 0.34, 0.02, z - 0.34);
  playerBox.max.set(x + 0.34, 1.82, z + 0.34);
  for (const obstacle of colliders) {
    collisionBox.setFromObject(obstacle);
    if (playerBox.intersectsBox(collisionBox)) return true;
  }
  return false;
}
function movePlayer(dt) {
  const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - touch.moveY;
  const strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.moveX;
  const input = new THREE.Vector2(strafe, forward);
  if (input.lengthSq() > 1) input.normalize();
  const speed = player.crouch ? 2.45 : 5.2;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const dx = (input.x * cos - input.y * sin) * speed * dt;
  const dz = (-input.x * sin - input.y * cos) * speed * dt;
  const nx = THREE.MathUtils.clamp(player.x + dx, -11.9, 11.9);
  if (!collidesAt(nx, player.z)) player.x = nx;
  const nz = THREE.MathUtils.clamp(player.z + dz, -71, 13.8);
  if (!collidesAt(player.x, nz)) player.z = nz;
  isMoving = input.lengthSq() > 0.025;
  if (isMoving) bobTime += dt * (player.crouch ? 7 : 10);
  const bob = isMoving ? Math.sin(bobTime) * (player.crouch ? 0.018 : 0.035) : 0;
  player.y = THREE.MathUtils.damp(player.y, player.crouch ? 1.12 : 1.68, 12, dt);
  camera.position.set(player.x, player.y + bob, player.z);
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
}
function damagePlayer(amount) {
  const absorbed = Math.min(armor, amount * 0.62);
  armor -= absorbed;
  health -= amount - absorbed;
  damageTimer = 0.24;
  $('damage-flash').classList.add('on');
  updateHud();
  if (health <= 0) { health = 0; updateHud(); finishMission(false); }
}
function updateEnemies(dt) {
  for (const enemy of [...enemies]) {
    const data = enemy.userData;
    if (!data.alive) continue;
    const dx = player.x - enemy.position.x;
    const dz = player.z - enemy.position.z;
    const distance = Math.hypot(dx, dz);
    const goalZ = -13 + Math.min(4, wave * 0.45);
    if (enemy.position.z < goalZ) {
      enemy.position.x += THREE.MathUtils.clamp(dx, -1, 1) * data.speed * 0.42 * dt;
      enemy.position.z += Math.min(goalZ - enemy.position.z, data.speed * dt);
    }
    enemy.rotation.y = Math.atan2(dx, dz);
    data.phase += dt * 5;
    enemy.position.y = Math.abs(Math.sin(data.phase)) * 0.025;
    data.cooldown -= dt;
    if (distance < 48 && data.cooldown <= 0) {
      data.cooldown = 1.25 + Math.random() * 1.25;
      const chance = THREE.MathUtils.clamp(0.72 - distance / 95, 0.2, 0.62);
      if (Math.random() < chance) damagePlayer(5 + Math.random() * 8);
    }
  }
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    if (effect.life === Infinity) {
      if (effect.drift) effect.sprite.position.x += Math.sin(gameTime * 0.18 + i) * effect.drift * dt;
      continue;
    }
    effect.life -= dt;
    if (effect.isGrenade) {
      effect.grenade.position.addScaledVector(effect.direction, 12 * dt);
      effect.grenade.position.y = Math.max(0.16, effect.grenade.position.y - 2.1 * dt);
      if (effect.life <= 0) detonateGrenade(effect);
    } else if (effect.fade && effect.sprite.material) {
      effect.sprite.material.opacity = Math.max(0, effect.life / effect.startLife);
    }
    if (effect.life <= 0) {
      const object = effect.sprite || effect.grenade;
      if (object) {
        if (effect.cameraChild) camera.remove(object); else world.remove(object);
        object.material?.dispose?.();
      }
      effects.splice(i, 1);
    }
  }
}
function update(dt) {
  if (!running || paused) return;
  gameTime += dt;
  fireCooldown = Math.max(0, fireCooldown - dt);
  if (reloadTimer > 0) {
    reloadTimer -= dt;
    if (reloadTimer <= 0) completeReload();
  }
  if (toastTimer > 0 && (toastTimer -= dt) <= 0) $('center-toast').classList.remove('on');
  if (damageTimer > 0 && (damageTimer -= dt) <= 0) $('damage-flash').classList.remove('on');
  movePlayer(dt);
  if (touch.firing || (keys.Mouse0 && pointerLocked)) fire();
  updateEnemies(dt);
  updateEffects(dt);
  if (enemies.length === 0) {
    if (wave >= 5) { finishMission(true); return; }
    waveDelay -= dt;
    if (waveDelay <= 0) { waveDelay = Infinity; spawnWave(); }
  }
  firstPersonGun?.position.set(0.38, -0.36 + Math.sin(bobTime) * (isMoving ? 0.018 : 0), -0.42 + gunKick);
  gunKick = Math.max(0, gunKick - dt * 0.42);
  updateHud();
}
function animate() {
  requestAnimationFrame(animate);
  clock.update();
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
}

function bindTouchStick() {
  const stick = $('touch-stick');
  const knob = stick.querySelector('i');
  const radius = 30;
  stick.addEventListener('pointerdown', (event) => {
    event.preventDefault(); stick.setPointerCapture(event.pointerId);
    touch.stickId = event.pointerId;
    updateStick(event);
  });
  stick.addEventListener('pointermove', (event) => { if (touch.stickId === event.pointerId) updateStick(event); });
  const end = (event) => {
    if (touch.stickId !== event.pointerId) return;
    touch.stickId = null; touch.moveX = 0; touch.moveY = 0; knob.style.transform = 'translate(0, 0)';
  };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  function updateStick(event) {
    const rect = stick.getBoundingClientRect();
    let x = event.clientX - (rect.left + rect.width / 2);
    let y = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(x, y);
    if (length > radius) { x *= radius / length; y *= radius / length; }
    knob.style.transform = `translate(${x}px, ${y}px)`;
    touch.moveX = x / radius; touch.moveY = -y / radius;
  }
}
function bindTouchLook() {
  const area = $('touch-look');
  area.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    touch.lookId = event.pointerId; touch.lastX = event.clientX; touch.lastY = event.clientY;
    area.setPointerCapture(event.pointerId);
  });
  area.addEventListener('pointermove', (event) => {
    if (touch.lookId !== event.pointerId) return;
    const dx = event.clientX - touch.lastX, dy = event.clientY - touch.lastY;
    touch.lastX = event.clientX; touch.lastY = event.clientY;
    yaw -= dx * 0.0042; pitch = THREE.MathUtils.clamp(pitch - dy * 0.0035, -1.15, 1.15);
  });
  const end = (event) => { if (touch.lookId === event.pointerId) touch.lookId = null; };
  area.addEventListener('pointerup', end); area.addEventListener('pointercancel', end);
  $('btn-fire').addEventListener('pointerdown', (event) => { event.preventDefault(); touch.firing = true; $('btn-fire').setPointerCapture(event.pointerId); fire(); });
  $('btn-fire').addEventListener('pointerup', () => { touch.firing = false; });
  $('btn-fire').addEventListener('pointercancel', () => { touch.firing = false; });
  $('btn-reload').addEventListener('click', reload);
  $('btn-grenade').addEventListener('click', throwGrenade);
  $('btn-switch').addEventListener('click', () => switchWeapon(weaponSlot === 1 ? 2 : 1));
}

for (const button of document.querySelectorAll('.faction-card')) button.addEventListener('click', () => chooseFaction(button.dataset.side));
$('brief-go').addEventListener('click', startMission);
$('resume-btn').addEventListener('click', () => setPaused(false));
$('quit-btn').addEventListener('click', () => { running = false; paused = false; ui.pause.classList.add('hidden'); ui.hud.classList.add('hidden'); ui.menu.classList.remove('hidden'); if (document.pointerLockElement === canvas) document.exitPointerLock(); });
$('again-btn').addEventListener('click', startMission);
$('menu-btn').addEventListener('click', () => { ui.result.classList.add('hidden'); ui.menu.classList.remove('hidden'); clearEnemies(); });
canvas.addEventListener('click', () => { if (running && !paused && !isTouchDevice()) { if (!pointerLocked) canvas.requestPointerLock?.(); else fire(); } });
document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === canvas; });
document.addEventListener('mousemove', (event) => {
  if (!pointerLocked || !running || paused) return;
  yaw -= event.movementX * 0.0024;
  pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0022, -1.15, 1.15);
});
document.addEventListener('mousedown', (event) => {
  if (!running || paused || !pointerLocked) return;
  if (event.button === 0) { keys.Mouse0 = true; fire(); }
  if (event.button === 2) { event.preventDefault(); yaw = yaw; pitch = THREE.MathUtils.clamp(pitch * 0.82, -1.15, 1.15); }
});
document.addEventListener('mouseup', (event) => { if (event.button === 0) keys.Mouse0 = false; });
document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('keydown', (event) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  keys[event.code] = true;
  if (event.repeat) return;
  if (event.code === 'Escape' && running) { event.preventDefault(); setPaused(!paused); }
  else if (event.code === 'KeyR') reload();
  else if (event.code === 'KeyG') throwGrenade();
  else if (event.code === 'KeyC') player.crouch = true;
  else if (event.code === 'Digit1') switchWeapon(1);
  else if (event.code === 'Digit2') switchWeapon(2);
  else if (event.code === 'Space') fire();
});
document.addEventListener('keyup', (event) => { keys[event.code] = false; if (event.code === 'KeyC') player.crouch = false; });
window.addEventListener('blur', () => { keys.Mouse0 = false; touch.firing = false; });
bindTouchStick(); bindTouchLook();

createWorld();
createPlayerWeapon();
setTimeout(() => { ui.boot.classList.add('hidden'); ui.menu.classList.remove('hidden'); }, 900);
animate();
