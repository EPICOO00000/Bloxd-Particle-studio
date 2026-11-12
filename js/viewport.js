// The 3D view: code block, grid, particles (camera-facing pixel-art squares like
// in the game), the move/rotate/resize gizmo and click-to-select.

import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { TransformControls } from '../vendor/TransformControls.js';
import { toView, toBloxd, HIDDEN_TEXELS } from './scene.js';

const CELL = 64; // atlas cell in pixels
const GRID = 4; // 4 x 4 cells: room for the 13 textures
const DEG = 180 / Math.PI;

const VERTEX = `
attribute vec3 iCenter;
attribute float iSize;
attribute vec4 iColor;
attribute vec4 iUv;
varying vec2 vUv;
varying vec4 vColor;
varying vec4 vRect;
void main() {
  vec4 mv = modelViewMatrix * vec4(iCenter, 1.0);
  mv.xy += position.xy * iSize;          // always face the camera
  gl_Position = projectionMatrix * mv;
  vUv = iUv.xy + uv * iUv.zw;
  vRect = vec4(iUv.xy, iUv.xy + iUv.zw);
  vColor = iColor;
}`;

// Keeps a sample inside its own atlas cell (antialiasing can ask for a point
// just outside the square, which would show a sliver of the next texture).
const SAMPLE = `
uniform sampler2D map; varying vec2 vUv; varying vec4 vColor; varying vec4 vRect;
vec4 texel() { return texture2D(map, clamp(vUv, vRect.xy, vRect.zw)); }`;

// The fragment shaders follow the game's particle shader (Babylon.js): the texel
// is multiplied by the particle colour with no colour space conversion, and
// each layer blends the way one of the game's blend modes does.
const FRAGMENT = {
  // 1 Standard: alpha blending. The textures only have fully see-through or fully
  // solid texels, so see-through ones are simply dropped.
  normal: `${SAMPLE}
void main() {
  vec4 t = texel();
  if (t.a < 0.5) discard;
  gl_FragColor = vec4(t.rgb * vColor.rgb, vColor.a);
}`,
  // 2 Add: colour * alpha is added. 0 OneOne: colour is added and alpha is ignored
  // (those particles arrive with a negative alpha as the marker).
  add: `${SAMPLE}
void main() {
  vec4 t = texel();
  float a = vColor.a < 0.0 ? 1.0 : t.a * vColor.a;
  gl_FragColor = vec4(t.rgb * vColor.rgb * a, 1.0);
}`,
  // 3 Multiply: the background is multiplied by the colour (white where see-through).
  multiply: `${SAMPLE}
void main() {
  vec4 t = texel();
  gl_FragColor = vec4(mix(vec3(1.0), t.rgb * vColor.rgb, t.a * vColor.a), 1.0);
}`,
};

// 4 MultiplyAdd is drawn twice by the game: once as Multiply, then once as Add.
const LAYERS_OF_BLEND = { 0: ['add'], 1: ['normal'], 2: ['add'], 3: ['multiply'], 4: ['multiply', 'add'] };

const THEMES = {
  dark: { bg: 0x161b29, grid1: 0x66769c, grid2: 0x343f5a },
  sky: { bg: 0x84c9ee, grid1: 0x3f7fa8, grid2: 0x6aaed6 },
};

/**
 * All textures in one picture so every particle can be drawn in one go. It is
 * filled texel by texel (enlarged by a whole number), which keeps the pixel art
 * crisp and lets the hidden colours of HIDDEN_TEXELS through.
 */
function buildAtlas(images, names) {
  const total = CELL * GRID;
  const data = new Uint8Array(total * total * 4);
  const rects = {};
  const scratch = document.createElement('canvas');
  const ctx = scratch.getContext('2d', { willReadFrequently: true });
  names.forEach((name, i) => {
    const img = images[name];
    const w = Math.min(CELL, (img && (img.naturalWidth || img.width)) || 8);
    const h = Math.min(CELL, (img && (img.naturalHeight || img.height)) || 8);
    let pixels = null;
    if (img) {
      scratch.width = w;
      scratch.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      try { pixels = ctx.getImageData(0, 0, w, h).data; } catch { pixels = null; }
    }
    if (!pixels) pixels = new Uint8ClampedArray(w * h * 4).fill(255); // missing file: a plain square
    for (const [x, y, r, g, b] of HIDDEN_TEXELS[name] || []) {
      const at = (y * w + x) * 4;
      if (x < w && y < h && pixels[at + 3] === 0) pixels.set([r, g, b], at);
    }
    const k = Math.max(1, Math.floor(CELL / Math.max(w, h)));
    const x0 = (i % GRID) * CELL;
    const y0 = Math.floor(i / GRID) * CELL; // rows of the data run from the bottom of the picture up
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const from = (y * w + x) * 4;
        const texel = pixels.subarray(from, from + 4);
        for (let dy = 0; dy < k; dy++) {
          const row = y0 + (h - 1 - y) * k + dy;
          for (let dx = 0; dx < k; dx++) data.set(texel, (row * total + x0 + x * k + dx) * 4);
        }
      }
    }
    const e = 0.02; // keep samples inside the cell
    rects[name] = [(x0 + e) / total, (y0 + e) / total, (w * k - 2 * e) / total, (h * k - 2 * e) / total];
  });
  const texture = new THREE.DataTexture(data, total, total, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.magFilter = texture.minFilter = THREE.NearestFilter; // crisp pixels, as in the game
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return { texture, rects };
}

function makeLayer(kind, map) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.attributes.position);
  geometry.setAttribute('uv', quad.attributes.uv);
  geometry.instanceCount = 0;
  const material = new THREE.ShaderMaterial({
    uniforms: { map: { value: map } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT[kind],
    transparent: true,
    depthWrite: kind === 'normal',
    side: THREE.DoubleSide,
  });
  if (kind !== 'normal') {
    material.blending = THREE.CustomBlending;
    material.blendEquation = THREE.AddEquation;
    material.blendSrc = kind === 'add' ? THREE.OneFactor : THREE.DstColorFactor;
    material.blendDst = kind === 'add' ? THREE.OneFactor : THREE.ZeroFactor;
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = { normal: 1, multiply: 2, add: 3 }[kind];
  const layer = { mesh, geometry, capacity: 0, arrays: null };
  const grow = (n) => {
    layer.capacity = Math.max(256, 2 ** Math.ceil(Math.log2(n)));
    layer.arrays = {
      iCenter: new Float32Array(layer.capacity * 3),
      iSize: new Float32Array(layer.capacity),
      iColor: new Float32Array(layer.capacity * 4),
      iUv: new Float32Array(layer.capacity * 4),
    };
    for (const [name, array] of Object.entries(layer.arrays)) {
      const attr = new THREE.InstancedBufferAttribute(array, array.length / layer.capacity);
      attr.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, attr);
    }
  };
  grow(256);
  layer.fill = (list, rects) => {
    if (list.length > layer.capacity) grow(list.length);
    const a = layer.arrays;
    mesh.visible = list.length > 0;
    list.forEach((p, i) => {
      const v = toView(p.pos);
      a.iCenter.set(v, i * 3);
      a.iSize[i] = p.size;
      a.iColor.set([p.rgb[0] / 255, p.rgb[1] / 255, p.rgb[2] / 255, p.blend === 0 ? -1 : p.alpha], i * 4);
      a.iUv.set(rects[p.texture] || rects.square_particle, i * 4);
    });
    geometry.instanceCount = list.length;
    for (const name of Object.keys(a)) geometry.attributes[name].needsUpdate = true;
  };
  return layer;
}

function label(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 32, 34);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
  sprite.scale.setScalar(0.45);
  return sprite;
}

/**
 * canvas    : <canvas>
 * images    : { textureName: HTMLImageElement }, plus images.code_block
 * names     : texture names (atlas order)
 * callbacks : onPick(id | null), onTransform({ mode, pos, rot, scale }), onTransformEnd(), onFrame(seconds)
 *             (mode: 'translate', 'rotate' or 'scale' says which of the three the drag changes)
 */
export function createViewport(canvas, images, names, callbacks) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 600);
  camera.position.set(4.6, 4.2, 6.4);
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0.5, 1.6, -0.5);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.12;
  orbit.minDistance = 0.4;
  orbit.maxDistance = 2500;
  orbit.update();

  scene.add(new THREE.AmbientLight(0xffffff, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(3, 8, 5);
  scene.add(sun);

  // ---- ground: one grid square is one block (lines only, so nothing is hidden)
  // Built from one-block pieces: some software renderers drop a long line
  // completely when one of its ends is behind the camera.
  const HALF = 32;
  const gridPoints = [];
  const gridMajor = []; // 1 = every 8th line
  for (let i = -HALF; i <= HALF; i++) {
    for (let j = -HALF; j < HALF; j++) {
      gridPoints.push(i, 0, j, i, 0, j + 1, j, 0, i, j + 1, 0, i);
      gridMajor.push(i % 8 === 0 ? 1 : 0, i % 8 === 0 ? 1 : 0);
    }
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
  gridGeometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(gridPoints.length), 3));
  const grid = new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false }));
  scene.add(grid);
  const setTheme = (name) => {
    const t = THEMES[name] || THEMES.dark;
    renderer.setClearColor(t.bg);
    const colors = gridGeometry.attributes.color;
    const c1 = new THREE.Color(t.grid1);
    const c2 = new THREE.Color(t.grid2);
    gridMajor.forEach((major, k) => {
      const c = major ? c1 : c2;
      colors.setXYZ(k * 2, c.r, c.g, c.b);
      colors.setXYZ(k * 2 + 1, c.r, c.g, c.b);
    });
    colors.needsUpdate = true;
  };
  setTheme('dark');

  // ---- the code block(s): Bloxd [0,1]^3, so view z runs from -1 to 0
  const blockTexture = new THREE.Texture(images.code_block);
  blockTexture.magFilter = blockTexture.minFilter = THREE.NearestFilter;
  blockTexture.generateMipmaps = false;
  blockTexture.colorSpace = THREE.SRGBColorSpace;
  blockTexture.needsUpdate = true;
  const blockMaterial = new THREE.MeshLambertMaterial({ map: blockTexture });
  const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
  const blocks = new THREE.Group();
  scene.add(blocks);
  const setBlocks = (n) => {
    while (blocks.children.length > n) blocks.remove(blocks.children[blocks.children.length - 1]);
    while (blocks.children.length < n) {
      const cube = new THREE.Mesh(blockGeometry, blockMaterial);
      cube.position.set(0.5, 0.5 + blocks.children.length, -0.5);
      blocks.add(cube);
    }
  };
  setBlocks(1);

  // ---- axes from the block's corner, the origin of every exported position
  const axes = new THREE.Group();
  [[[3, 0, 0], '#ff5d5d', 'X'], [[0, 3.6, 0], '#6fdc6f', 'Y'], [[0, 0, -3], '#5da2ff', 'Z']].forEach(([end, color, name]) => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(...end)]);
    axes.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color })));
    const s = label(name, color);
    s.position.set(...end.map((v) => v * 1.08));
    axes.add(s);
  });
  scene.add(axes);

  // ---- particles
  const atlas = buildAtlas(images, names);
  const layers = { normal: makeLayer('normal', atlas.texture), add: makeLayer('add', atlas.texture), multiply: makeLayer('multiply', atlas.texture) };
  for (const l of Object.values(layers)) scene.add(l.mesh);
  let particles = [];

  // ---- selection box + gizmo
  const box = new THREE.Box3Helper(new THREE.Box3(), 0xffe066);
  box.visible = false;
  box.material.depthTest = false;
  box.renderOrder = 5;
  scene.add(box);
  const proxy = new THREE.Object3D();
  scene.add(proxy);
  const gizmo = new TransformControls(camera, canvas);
  gizmo.setSize(0.9);
  scene.add(gizmo.getHelper());
  let selectedId = null;
  let canTransform = true;
  let mode = 'translate';
  const applyMode = () => gizmo.setMode(canTransform ? mode : 'translate');
  gizmo.addEventListener('dragging-changed', (e) => {
    orbit.enabled = !e.value;
    if (!e.value) callbacks.onTransformEnd();
  });
  const gizmoUnit = () => camera.position.distanceTo(proxy.position)
    * Math.min((1.9 * Math.tan((Math.PI * camera.fov) / 360)) / camera.zoom, 7) * (gizmo.size / 4);

  // The little handle in the middle always wins when the pointer is on it. (Without
  // this an arrow that points at the camera covers it and gets grabbed instead.)
  const hover = gizmo.pointerHover.bind(gizmo);
  const middleWins = (pointer) => {
    if (!pointer || gizmo.mode === 'rotate') return;
    const centre = new THREE.Vector3().copy(proxy.position).project(camera);
    if (centre.z < -1 || centre.z > 1) return;
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const unitPx = (gizmoUnit() / (2 * camera.position.distanceTo(proxy.position) * Math.tan((Math.PI * camera.fov) / 360))) * h;
    const reach = Math.max(9, unitPx * 0.085);
    if (Math.hypot(((pointer.x - centre.x) * w) / 2, ((pointer.y - centre.y) * h) / 2) <= reach) gizmo.axis = 'XYZ';
  };
  gizmo.pointerHover = (pointer) => {
    hover(pointer);
    if (gizmo.dragging || !gizmo.object) return;
    middleWins(pointer);
    // three.js only brings the handles and the plane a drag runs in up to date
    // when a frame is drawn. A press can come before that (a slow device, or the
    // object was just moved), and the drag then runs in the wrong plane.
    gizmo.getHelper().updateMatrixWorld(true);
  };

  // Resizing. three.js divides by the spot where the handle was grabbed, which
  // makes a shape explode when that spot is near its middle. This version only
  // looks at how far the pointer travelled: one handle length doubles the size.
  const SCALE_MIN = 0.05;
  const SCALE_MAX = 100;
  const scaleStart = new THREE.Vector3(1, 1, 1);
  let snapOn = false;
  gizmo.addEventListener('mouseDown', () => scaleStart.copy(proxy.scale));
  const steadyScale = () => {
    const axis = gizmo.axis || '';
    const handle = Math.max(1e-6, gizmoUnit() * 0.5);
    const travel = new THREE.Vector3().copy(gizmo.pointEnd).sub(gizmo.pointStart);
    const factor = [1, 1, 1];
    if (axis.includes('XYZ')) {
      // the middle cube: up or right is bigger, down or left is smaller
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      factor.fill(1 + (travel.dot(right) + travel.dot(up)) / (2 * handle));
    } else {
      const inverse = proxy.quaternion.clone().invert();
      const grabbed = new THREE.Vector3().copy(gizmo.pointStart).applyQuaternion(inverse).toArray();
      const moved = travel.applyQuaternion(inverse).toArray();
      ['X', 'Y', 'Z'].forEach((name, i) => {
        if (axis.includes(name)) factor[i] = 1 + ((grabbed[i] < 0 ? -1 : 1) * moved[i]) / handle; // away from the middle = bigger
      });
    }
    const start = scaleStart.toArray();
    proxy.scale.fromArray(start.map((s0, i) => {
      if (factor[i] === 1) return s0;
      let size = Math.max(Math.abs(s0), SCALE_MIN) * Math.max(factor[i], 0);
      if (snapOn) size = Math.round(size / 0.25) * 0.25;
      return (s0 < 0 ? -1 : 1) * Math.min(SCALE_MAX, Math.max(snapOn ? 0.25 : SCALE_MIN, size));
    }));
  };
  gizmo.addEventListener('objectChange', () => {
    if (gizmo.mode === 'scale') steadyScale();
    callbacks.onTransform({
      mode: gizmo.mode,
      pos: toBloxd(proxy.position.toArray()),
      rot: [proxy.rotation.x * DEG, proxy.rotation.y * DEG, proxy.rotation.z * DEG],
      scale: proxy.scale.toArray(),
    });
  });

  const updateBox = () => {
    const mine = selectedId ? particles.filter((p) => p.id === selectedId) : [];
    box.visible = mine.length > 0;
    if (!mine.length) return;
    box.box.makeEmpty();
    const v = new THREE.Vector3();
    for (const p of mine) {
      box.box.expandByPoint(v.fromArray(toView(p.pos)));
    }
    const pad = Math.max(...mine.map((p) => p.size)) / 2 + 0.04;
    box.box.expandByScalar(pad);
  };

  // ---- click to select
  const down = { x: 0, y: 0, ok: false };
  canvas.addEventListener('pointerdown', (e) => {
    down.x = e.clientX;
    down.y = e.clientY;
    down.ok = e.button === 0 && !gizmo.axis; // not when grabbing a gizmo handle
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down.ok || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    callbacks.onPick(pick(e.clientX, e.clientY));
  });
  const pick = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const c = new THREE.Vector3();
    const edge = new THREE.Vector3();
    let best = null;
    let bestDepth = Infinity;
    for (const p of particles) {
      c.fromArray(toView(p.pos));
      edge.copy(c).addScaledVector(right, p.size / 2).project(camera);
      c.project(camera);
      if (c.z < -1 || c.z > 1) continue;
      const sx = (c.x * 0.5 + 0.5) * rect.width;
      const sy = (-c.y * 0.5 + 0.5) * rect.height;
      const radius = Math.max(7, Math.abs((edge.x - c.x) * 0.5 * rect.width));
      if (Math.abs(mx - sx) <= radius && Math.abs(my - sy) <= radius && c.z < bestDepth) {
        bestDepth = c.z;
        best = p.id;
      }
    }
    return best;
  };

  // ---- size + render loop
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  };
  // Keep near and far planes in step with the zoom, so a scene that is far
  // away or very large is never cut off.
  const fitDepth = () => {
    const dist = camera.position.distanceTo(orbit.target);
    const near = Math.max(0.05, dist / 400);
    const far = Math.max(600, dist * 12);
    if (Math.abs(camera.near - near) > near * 0.05 || Math.abs(camera.far - far) > far * 0.05) {
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    }
  };
  let last = performance.now();
  let frames = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    resize();
    callbacks.onFrame(dt);
    orbit.update();
    fitDepth();
    renderer.render(scene, camera);
    frames++;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return {
    /** list from computeParticles() */
    setParticles(list) {
      particles = list;
      const byLayer = { normal: [], add: [], multiply: [] };
      for (const p of list) for (const k of LAYERS_OF_BLEND[p.blend] || ['normal']) byLayer[k].push(p);
      for (const k of Object.keys(layers)) layers[k].fill(byLayer[k], atlas.rects);
      updateBox();
    },
    /** obj: the selected scene object, or null */
    setSelection(obj, editable = true) {
      selectedId = obj ? obj.id : null;
      if (obj && editable) {
        canTransform = obj.shape !== 'point';
        if (!gizmo.dragging) {
          proxy.position.fromArray(toView(obj.pos));
          proxy.rotation.set(obj.rot[0] / DEG, obj.rot[1] / DEG, obj.rot[2] / DEG, 'XYZ');
          proxy.scale.fromArray(obj.scale);
        }
        if (gizmo.object !== proxy) gizmo.attach(proxy);
        applyMode();
      } else if (gizmo.object) gizmo.detach();
      updateBox();
    },
    setMode(m) {
      mode = m;
      applyMode();
    },
    setSnap(on) {
      snapOn = !!on;
      gizmo.setTranslationSnap(on ? 0.25 : null);
      gizmo.setRotationSnap(on ? Math.PI / 12 : null);
    },
    setTheme,
    setBlocks,
    /** Frame the camera on a list of Bloxd points (or the default view). */
    focus(points) {
      const b = new THREE.Box3();
      for (const p of points) b.expandByPoint(new THREE.Vector3(...toView(p)));
      b.expandByPoint(new THREE.Vector3(0, 0, -1)).expandByPoint(new THREE.Vector3(1, 1, 0));
      // an empty scene gets the opening view: the block with room above it
      const centre = points.length ? b.getCenter(new THREE.Vector3()) : new THREE.Vector3(0.5, 1.6, -0.5);
      const radius = points.length ? Math.max(2.2, b.getSize(new THREE.Vector3()).length() / 2) : 3.4;
      const dir = camera.position.clone().sub(orbit.target).normalize();
      orbit.target.copy(centre);
      camera.position.copy(centre).addScaledVector(dir, radius / Math.sin((camera.fov / 2) * (Math.PI / 180)) * 1.05);
      orbit.update();
    },
    /** PNG of the view as a data URL (for tests and screenshots). */
    snapshot() {
      resize();
      orbit.update();
      fitDepth();
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    },
    /** For tests. */
    debug: () => ({
      frames, particles: particles.length, selectedId, dragging: gizmo.dragging, mode: gizmo.mode,
      calls: renderer.info.render.calls, size: [canvas.width, canvas.height], blocks: blocks.children.length,
      camera: camera.position.toArray().map((v) => Math.round(v * 100) / 100),
    }),
    screenPoint(pos) {
      const v = new THREE.Vector3(...toView(pos)).project(camera);
      const rect = canvas.getBoundingClientRect();
      return [rect.left + (v.x * 0.5 + 0.5) * rect.width, rect.top + (-v.y * 0.5 + 0.5) * rect.height];
    },
  };
}
