/* ==========================================================================
   Sharanam Civil Consultancy — Scroll-driven 3D construction story
   Three.js (r149, UMD) + GSAP ScrollTrigger. No external models: the whole
   site is built procedurally so it loads fast and stays on-brand.

   Story progress P (0 → 1) is driven by scroll inside .story, with six
   resting points (every 0.2):
     0.0  Scene 1  Incomplete building, unmanaged site
     0.2  Scene 2  Work on hold, crew waiting in the rest area
     0.4  Scene 3  Sharanam supervision: engineers + planning overlay
     0.6  Scene 4  Progressive construction (structure → slabs → walls →
                   windows → finishes → landscaping) continues to 0.8
     0.8  Scene 5  Completed building, camera pulls back, warmer light
     1.0  Scene 6  Sharanam project manager walks in, folds his arms;
                   final headline
   The construction timeline runs on B = P / 0.8; the finale on P 0.8 → 1.
   No counters or progress UI: the scene itself shows the progression.
   ========================================================================== */
(function () {
  'use strict';

  var story = document.querySelector('.story');
  if (!story) return;

  var canvas = story.querySelector('.story__canvas');
  var chapters = Array.prototype.slice.call(story.querySelectorAll('.story__chapter'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 820px)').matches;

  var STOPS = 5;                         // six resting points: 0, 0.2 … 1
  var SCENE_TEXT = [0, 1, 2, 3, -1, 4];  // scene → chapter copy (-1: let the building speak)

  /* ---------------------------------------------------------------- helpers */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function band(x, a, b, c, d) { return smooth(a, b, x) * (1 - smooth(c, d, x)); } // rise a→b, fall c→d

  /* ------------------------------------------------------ text + progress UI */
  var activeScene = -1;
  function setScene(i) {
    if (i === activeScene) return;
    activeScene = i;
    var c = SCENE_TEXT[i];
    chapters.forEach(function (el, n) {
      el.classList.toggle('is-active', n === c);
      el.setAttribute('aria-hidden', String(n !== c));
      Array.prototype.forEach.call(el.querySelectorAll('a'), function (a) { a.tabIndex = n === c ? 0 : -1; });
    });
    story.classList.toggle('story--moved', i > 0);
    story.classList.toggle('story--finale', i === STOPS);
  }

  /* ----------------------------------------------------------- WebGL check */
  var webgl = false;
  try { var t = document.createElement('canvas'); webgl = !!(window.WebGLRenderingContext && (t.getContext('webgl2') || t.getContext('webgl'))); } catch (e) { webgl = false; }
  if (!webgl || typeof THREE === 'undefined') {
    story.classList.add('story--static');
    initScroll(null);
    return;
  }

  /* ====================================================================== */
  /*  RENDERER, SCENE, CAMERA                                                */
  /* ====================================================================== */
  THREE.ColorManagement.legacyMode = false;
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(isMobile ? 46 : 36, 1, 0.5, 900);

  /* ---------------------------------------------------------------- sky */
  var skyUniforms = {
    topColor: { value: new THREE.Color('#bcd3e2') },
    horizonColor: { value: new THREE.Color('#f4eee6') }
  };
  var sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
      vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }',
      fragmentShader: 'uniform vec3 topColor; uniform vec3 horizonColor; varying vec3 vP; void main(){ float h = normalize(vP).y; float t = pow(clamp(h*1.6,0.0,1.0),0.7); gl_FragColor = vec4(mix(horizonColor, topColor, t),1.0); }'
    })
  );
  scene.add(sky);
  scene.fog = new THREE.Fog('#f1ece4', 120, 420);

  // Environment for reflective glass, generated once from the sky
  var pmrem = new THREE.PMREMGenerator(renderer);
  var envScene = new THREE.Scene();
  envScene.add(sky.clone());
  var envGround = new THREE.Mesh(new THREE.CircleGeometry(500, 24), new THREE.MeshBasicMaterial({ color: '#cfc7ba' }));
  envGround.rotation.x = -Math.PI / 2; envGround.position.y = -2; envScene.add(envGround);
  var envMap = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = envMap;

  /* ---------------------------------------------------------------- lights */
  var hemi = new THREE.HemisphereLight('#eef4fa', '#b9ab95', 0.75);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight('#fff4e4', 2.4);
  sun.position.set(38, 52, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  var sc = sun.shadow.camera; sc.left = -42; sc.right = 42; sc.top = 42; sc.bottom = -42; sc.near = 10; sc.far = 140;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun);
  var fill = new THREE.DirectionalLight('#dfe8f2', 0.35);
  fill.position.set(-30, 20, -20);
  scene.add(fill);

  /* ---------------------------------------------------------------- materials */
  function std(color, rough, metal, extra) {
    var m = new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.85 : rough, metalness: metal || 0 });
    if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; });
    return m;
  }
  function canvasTex(w, h, draw, repeatX, repeatY) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var tx = new THREE.CanvasTexture(c);
    tx.encoding = THREE.sRGBEncoding;
    tx.anisotropy = 4;
    if (repeatX) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeatX, repeatY || repeatX); }
    return tx;
  }
  // subtle board-formed concrete
  var concreteTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#b9b5ae'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 2200; i++) { var v = 160 + Math.random() * 40 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 6) + ',.18)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = 'rgba(120,116,110,.22)'; g.lineWidth = 1;
    for (var y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, 1, 1);
  var blockTex = canvasTex(256, 128, function (g, w, h) {
    g.fillStyle = '#d2c8bb'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,138,124,.55)'; g.lineWidth = 2;
    for (var r = 0; r < 4; r++) {
      var y = r * 32; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      for (var x = (r % 2) * 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
    }
  }, 1, 1);
  var soilTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#c4b49a'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 4000; i++) { var v = 150 + Math.random() * 60 | 0; g.fillStyle = 'rgba(' + v + ',' + (v - 14) + ',' + (v - 34) + ',.35)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, 18, 18);

  var M = {
    concrete: std('#c9c5be', 0.92, 0, { map: concreteTex }),
    concreteDark: std('#a9a59e', 0.95),
    rebar: std('#6b4a35', 0.6, 0.4),
    steel: std('#8d949a', 0.45, 0.7),
    scaffold: std('#9aa1a6', 0.5, 0.6),
    plank: std('#b88a55', 0.9),
    orange: std('#f28c28', 0.55, 0.1),
    charcoal: std('#292929', 0.6, 0.2),
    white: std('#f6f4ef', 0.7),
    offwhite: std('#ebe6dd', 0.85),
    glassFrame: std('#2f3236', 0.5, 0.6),
    tarp: std('#efe9df', 0.9, 0, { side: THREE.DoubleSide }),
    wood: std('#a87c4f', 0.85),
    brick: std('#b86a45', 0.9),
    cement: std('#d9d3c7', 0.95),
    sand: std('#d8c39c', 1),
    tyre: std('#2b2b2b', 0.9),
    leaf: std('#6f8f4e', 0.9, 0, { flatShading: true }),
    leafDark: std('#55753d', 0.9, 0, { flatShading: true }),
    trunk: std('#7b5b3e', 0.9),
    paving: std('#ddd8cf', 0.9),
    asphalt: std('#9b9894', 0.95),
    skin: std('#b07a56', 0.7),
    skin2: std('#8d5f42', 0.7),
    cloth: std('#3d4a5c', 0.85),
    cloth2: std('#5b5348', 0.85),
    shirt: std('#f1efe9', 0.8),
    vest: std('#f28c28', 0.6),
    hatYellow: std('#f2c230', 0.45),
    hatWhite: std('#f7f7f4', 0.4)
  };
  var glassMat = new THREE.MeshStandardMaterial({ color: '#7f99a8', roughness: 0.06, metalness: 0.95, envMapIntensity: 1.25, transparent: true, opacity: 0.0, side: THREE.DoubleSide });

  function mesh(geo, mat, cast, receive) {
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = cast !== false; m.receiveShadow = receive !== false;
    return m;
  }
  function box(w, h, d, mat, x, y, z, cast) {
    var m = mesh(new THREE.BoxGeometry(w, h, d), mat, cast);
    m.position.set(x || 0, y || 0, z || 0); return m;
  }
  // geometry whose origin sits at its base — handy for "growing" elements
  function baseBox(w, h, d) { var g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return g; }

  /* ====================================================================== */
  /*  STAGED ELEMENTS: each grows during its window of build progress b      */
  /* ====================================================================== */
  var staged = [];
  // mode: 'grow' (scale y from base), 'slide' (scale x from one side), 'pop' (uniform), 'fade'
  function stage(obj, t0, t1, mode) {
    staged.push({ o: obj, t0: t0, t1: t1, mode: mode || 'grow', base: obj.scale.clone() });
    return obj;
  }
  function applyStages(b) {
    for (var i = 0; i < staged.length; i++) {
      var s = staged[i];
      var u = s.t1 <= s.t0 ? (b >= s.t0 ? 1 : 0) : clamp((b - s.t0) / (s.t1 - s.t0), 0, 1);
      if (s.t0 < 0) u = 1;
      var e = 1 - Math.pow(1 - u, 3);
      s.o.visible = u > 0.001;
      if (!s.o.visible) continue;
      if (s.mode === 'grow') s.o.scale.set(s.base.x, s.base.y * Math.max(e, 0.001), s.base.z);
      else if (s.mode === 'slide') s.o.scale.set(s.base.x * Math.max(e, 0.001), s.base.y, s.base.z);
      else if (s.mode === 'pop') s.o.scale.setScalar(Math.max(e, 0.001) * s.base.x);
    }
  }

  /* ====================================================================== */
  /*  GROUND & SITE                                                          */
  /* ====================================================================== */
  var world = new THREE.Group(); scene.add(world);

  var land = mesh(new THREE.PlaneGeometry(900, 900), std('#c9c2ae', 1), false, true);
  land.rotation.x = -Math.PI / 2; land.position.y = -0.02; world.add(land);

  var siteSoil = mesh(new THREE.PlaneGeometry(48, 34), std('#c4b49a', 1, 0, { map: soilTex }), false, true);
  siteSoil.rotation.x = -Math.PI / 2; siteSoil.position.set(0, 0.01, 2); world.add(siteSoil);

  // road in front of the plot
  var road = mesh(new THREE.PlaneGeometry(900, 11), M.asphalt, false, true);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.0, 47); world.add(road);
  var kerb = box(900, 0.18, 0.4, M.paving, 0, 0.09, 41.3, false); world.add(kerb);

  // final landscaping layers (appear in the last stage)
  var lawn = mesh(new THREE.PlaneGeometry(48, 34), std('#8aa765', 0.95, 0, { transparent: true }), false, true);
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, 0.02, 2); world.add(lawn);
  var plaza = mesh(new THREE.PlaneGeometry(26, 6), M.paving, false, true);
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.03, 10); world.add(plaza);
  var path = mesh(new THREE.PlaneGeometry(5, 8), M.paving, false, true);
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.03, 16.5); world.add(path);
  var forecourt = mesh(new THREE.PlaneGeometry(9, 22), M.paving, false, true);
  forecourt.rotation.x = -Math.PI / 2; forecourt.position.set(0, 0.04, 30); world.add(forecourt);
  var frontLawn = mesh(new THREE.PlaneGeometry(60, 22), std('#8aa765', 0.95, 0, { transparent: true }), false, true);
  frontLawn.rotation.x = -Math.PI / 2; frontLawn.position.set(0, 0.03, 30); world.add(frontLawn);
  var drive = mesh(new THREE.PlaneGeometry(6, 34), M.paving, false, true);
  drive.rotation.x = -Math.PI / 2; drive.position.set(-19, 0.03, 2); world.add(drive);

  /* ====================================================================== */
  /*  BUILDING (G+5) — 3 × 2 bays of 6 m, floor height 3.4 m                 */
  /* ====================================================================== */
  var building = new THREE.Group(); world.add(building);
  var FH = 3.4, FLOORS = 6;
  var XS = [-9, -3, 3, 9], ZS = [-6, 0, 6];

  // plinth
  building.add(box(19.4, 0.45, 13.4, M.concreteDark, 0, 0.22, 0));

  // existing at start: floors 0–2 fully framed, floor 3 partly
  // build windows (b = 0..1 within Scene 4)
  function floorWindow(f) {
    // structure for floors 3..5 rises between b 0.00 and 0.30
    var k = f - 3; return { c0: 0.0 + k * 0.08, c1: 0.06 + k * 0.08, s0: 0.05 + k * 0.08, s1: 0.11 + k * 0.08 };
  }
  var colGeo = baseBox(0.62, FH, 0.62);
  var startedCols = { '-9,6': 1, '-3,6': 1, '-9,0': 1, '-9,-6': 1, '-3,0': 1 }; // floor 3 columns already cast

  for (var f = 0; f < FLOORS; f++) {
    var y0 = 0.45 + f * FH;
    // columns
    XS.forEach(function (x) {
      ZS.forEach(function (z) {
        var c = mesh(colGeo, M.concrete); c.position.set(x, y0, z); building.add(c);
        if (f <= 2) return;
        if (f === 3 && startedCols[x + ',' + z]) return;
        var w = floorWindow(f); stage(c, w.c0, w.c1, 'grow');
      });
    });
    // slab + beams at the top of this floor
    var topY = y0 + FH;
    var slab = mesh(baseBox(18.9, 0.24, 12.9), M.concrete); slab.position.set(0, topY - 0.24, 0);
    var slabPivot = new THREE.Group(); slabPivot.position.set(-9.45, 0, 0); slab.position.x = 9.45; slabPivot.add(slab); building.add(slabPivot);
    var beams = new THREE.Group();
    ZS.forEach(function (z) { var bm = box(18.6, 0.55, 0.42, M.concrete, 0, topY - 0.5, z); beams.add(bm); });
    XS.forEach(function (x) { var bm = box(0.42, 0.55, 12.6, M.concrete, x, topY - 0.5, 0); beams.add(bm); });
    building.add(beams);
    if (f >= 3) {
      var w2 = floorWindow(f);
      stage(slabPivot, w2.s0, w2.s1, 'slide');
      stage(beams, w2.c1 - 0.02, w2.s0 + 0.02, 'fade');
    }
  }

  // exposed rebar stubs on the incomplete level (removed as floors rise)
  var rebarGroup = new THREE.Group(); building.add(rebarGroup);
  var rebarGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.3, 5); rebarGeo.translate(0, 0.65, 0);
  XS.forEach(function (x) {
    ZS.forEach(function (z) {
      var started = startedCols[x + ',' + z];
      var y = 0.45 + (started ? 4 : 3) * FH;
      for (var i = 0; i < 4; i++) {
        var r = mesh(rebarGeo, M.rebar, true, false);
        r.position.set(x + (i % 2 ? 0.2 : -0.2), y, z + (i < 2 ? 0.2 : -0.2));
        rebarGroup.add(r);
      }
    });
  });

  /* ----- infill walls, windows and finishes (all six floors) ----- */
  var wallMats = [], finishFins = new THREE.Group(); building.add(finishFins);
  var spandrelGeo = baseBox(1, 1, 0.24), lintelGeo = baseBox(1, 0.55, 0.24);
  var glassGeo = new THREE.PlaneGeometry(1, 1);
  for (var fl = 0; fl < FLOORS; fl++) {
    var wm = std('#d2c8bb', 0.92, 0, { map: blockTex }); wallMats.push(wm);
    var y1 = 0.45 + fl * FH;
    var wallT0 = 0.30 + fl * 0.035, wallT1 = wallT0 + 0.07;
    var winT0 = 0.45 + fl * 0.035, winT1 = winT0 + 0.06;
    var bays = [];
    // front & back (z = ±6), 3 bays each; sides (x = ±9), 2 bays each
    [6, -6].forEach(function (z) { for (var i = 0; i < 3; i++) bays.push({ cx: (XS[i] + XS[i + 1]) / 2, cz: z, len: 5.38, rot: 0, out: z > 0 ? 1 : -1 }); });
    [9, -9].forEach(function (x) { for (var i = 0; i < 2; i++) bays.push({ cx: x, cz: (ZS[i] + ZS[i + 1]) / 2, len: 5.38, rot: Math.PI / 2, out: x > 0 ? 1 : -1 }); });
    bays.forEach(function (bay) {
      var g = new THREE.Group(); g.position.set(bay.cx, y1, bay.cz); g.rotation.y = bay.rot; building.add(g);
      var entrance = fl === 0 && bay.cz === 6 && bay.cx === 0;
      if (!entrance) {
        var sp = mesh(spandrelGeo, wm); sp.scale.set(bay.len, 1.0, 1); g.add(sp); stage(sp, wallT0, wallT1, 'grow');
      }
      var li = mesh(lintelGeo, wm); li.scale.set(bay.len, 1, 1); li.position.y = FH - 0.55 - 0.3; g.add(li); stage(li, wallT0 + 0.03, wallT1 + 0.02, 'grow');
      // glass + frame
      var gh = entrance ? FH - 0.85 : FH - 1.0 - 0.85;
      var gy = entrance ? gh / 2 : 1.0 + gh / 2;
      var gl = new THREE.Mesh(glassGeo, glassMat); gl.scale.set(bay.len - 0.1, gh, 1); gl.position.set(0, gy, 0.03 * (bay.rot ? 1 : bay.out)); if (bay.out < 0 && !bay.rot) gl.rotation.y = Math.PI; if (bay.rot && bay.out < 0) gl.rotation.y = Math.PI;
      g.add(gl);
      var mull = new THREE.Group();
      [-bay.len / 4, 0, bay.len / 4].forEach(function (mx) { mull.add(box(0.07, gh, 0.1, M.glassFrame, mx, gy, 0, false)); });
      mull.add(box(bay.len, 0.08, 0.1, M.glassFrame, 0, gy + gh / 2, 0, false));
      mull.add(box(bay.len, 0.08, 0.1, M.glassFrame, 0, gy - gh / 2, 0, false));
      g.add(mull); stage(mull, winT0, winT1, 'grow');
    });
  }
  // glass fades in with the window stage (one shared material)
  // vertical fins on the front façade + parapet + entrance canopy (finishing stage)
  XS.forEach(function (x, i) {
    var fin = mesh(baseBox(0.36, FH * FLOORS + 1.2, 0.9), i === 0 || i === 3 ? M.charcoal : M.white);
    fin.position.set(x, 0.45, 6.55); finishFins.add(fin); stage(fin, 0.66 + i * 0.02, 0.76 + i * 0.02, 'grow');
  });
  var roofY = 0.45 + FLOORS * FH;
  var parapet = new THREE.Group();
  parapet.add(box(19.2, 1.0, 0.3, M.white, 0, roofY + 0.5, 6.35));
  parapet.add(box(19.2, 1.0, 0.3, M.white, 0, roofY + 0.5, -6.35));
  parapet.add(box(0.3, 1.0, 12.9, M.white, 9.45, roofY + 0.5, 0));
  parapet.add(box(0.3, 1.0, 12.9, M.white, -9.45, roofY + 0.5, 0));
  parapet.add(box(19.3, 0.16, 0.36, M.orange, 0, roofY + 1.05, 6.38, false));
  parapet.add(box(5.5, 2.2, 4, M.offwhite, -4, roofY + 1.1, -2)); // stair/lift core
  building.add(parapet); stage(parapet, 0.72, 0.8, 'grow');
  var canopy = new THREE.Group();
  canopy.add(box(7.4, 0.3, 3.2, M.charcoal, 0, 3.6, 7.7));
  canopy.add(box(7.4, 0.06, 0.06, M.orange, 0, 3.42, 9.3, false));
  canopy.add(box(0.16, 3.4, 0.16, M.charcoal, -3.4, 1.9, 9.1));
  canopy.add(box(0.16, 3.4, 0.16, M.charcoal, 3.4, 1.9, 9.1));
  building.add(canopy); stage(canopy, 0.86, 0.93, 'pop');
  // name sign on the plaza
  var signTex = canvasTex(1024, 160, function (g, w, h) {
    g.fillStyle = '#292929'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f28c28'; g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#ffffff'; g.font = '700 74px Manrope, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('SHARANAM', 40, h / 2 - 4);
    g.fillStyle = '#c9c4bd'; g.font = '500 34px Manrope, Arial, sans-serif'; g.fillText('Delivered with PMC by Sharanam Civil Consultancy', 440, h / 2 - 2);
  });
  var sign = new THREE.Group();
  var signBoard = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.1), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }));
  signBoard.position.set(0, 0.85, 0.01); sign.add(signBoard);
  sign.add(box(7.1, 1.2, 0.18, M.charcoal, 0, 0.85, -0.1));
  sign.position.set(-8, 0, 15.5); world.add(sign); stage(sign, 0.86, 0.94, 'pop');

  /* ====================================================================== */
  /*  ORANGE PLANNING OVERLAY (Scene 3): ghost frame of the future floors    */
  /* ====================================================================== */
  var ghost = new THREE.Group(); world.add(ghost);
  var ghostMat = new THREE.LineDashedMaterial({ color: '#f28c28', dashSize: 0.6, gapSize: 0.35, transparent: true, opacity: 0, depthWrite: false });
  var gPts = [];
  for (var gf = 3; gf <= FLOORS; gf++) {
    var gy2 = 0.45 + gf * FH;
    // slab outline
    gPts.push(-9.45, gy2, -6.45, 9.45, gy2, -6.45, 9.45, gy2, -6.45, 9.45, gy2, 6.45, 9.45, gy2, 6.45, -9.45, gy2, 6.45, -9.45, gy2, 6.45, -9.45, gy2, -6.45);
    if (gf < FLOORS) XS.forEach(function (x) { ZS.forEach(function (z) { gPts.push(x, gy2, z, x, gy2 + FH, z); }); });
  }
  var ghostGeo = new THREE.BufferGeometry(); ghostGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPts, 3));
  var ghostLines = new THREE.LineSegments(ghostGeo, ghostMat); ghostLines.computeLineDistances(); ghost.add(ghostLines);
  // setting-out lines on the ground: grid axes with bubble markers
  var setOutMat = new THREE.LineBasicMaterial({ color: '#f28c28', transparent: true, opacity: 0, depthWrite: false });
  var sPts = [];
  XS.forEach(function (x) { sPts.push(x, 0.05, -10, x, 0.05, 10); });
  ZS.forEach(function (z) { sPts.push(-13, 0.05, z, 13, 0.05, z); });
  var sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPts, 3));
  ghost.add(new THREE.LineSegments(sGeo, setOutMat));
  var bubbleMat = new THREE.MeshBasicMaterial({ color: '#f28c28', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  var bubbleGeo = new THREE.RingGeometry(0.42, 0.55, 24);
  XS.forEach(function (x) { var b1 = new THREE.Mesh(bubbleGeo, bubbleMat); b1.rotation.x = -Math.PI / 2; b1.position.set(x, 0.06, 10.6); ghost.add(b1); });
  ZS.forEach(function (z) { var b2 = new THREE.Mesh(bubbleGeo, bubbleMat); b2.rotation.x = -Math.PI / 2; b2.position.set(13.6, 0.06, z); ghost.add(b2); });
  // construction "level line": a thin orange ring that rides up with the work
  var levelRing = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.06, 13.6), new THREE.MeshBasicMaterial({ color: '#f28c28', transparent: true, opacity: 0, depthWrite: false, wireframe: true }));
  world.add(levelRing);

  /* ====================================================================== */
  /*  SCAFFOLDING (instanced): grows with the frame, removed top-down        */
  /* ====================================================================== */
  var SC_LIFT = 2, SC_LEVELS = 11;
  var tubeV = new THREE.CylinderGeometry(0.05, 0.05, SC_LIFT, 6); tubeV.translate(0, SC_LIFT / 2, 0);
  var tubeH = new THREE.CylinderGeometry(0.045, 0.045, 1, 6); tubeH.rotateZ(Math.PI / 2);
  var boardG = new THREE.BoxGeometry(1, 0.06, 1.1);
  var scaffoldSpecs = [];
  // front run along x at z ≈ 7.2 / 8.3 ; side run along z at x ≈ 10.2 / 11.3
  for (var lv = 0; lv < SC_LEVELS; lv++) {
    for (var sx = -10; sx <= 10; sx += 2.5) { scaffoldSpecs.push({ t: 'v', l: lv, x: sx, z: 7.2 }); scaffoldSpecs.push({ t: 'v', l: lv, x: sx, z: 8.3 }); }
    scaffoldSpecs.push({ t: 'hx', l: lv, x: 0, z: 7.2, len: 20 }); scaffoldSpecs.push({ t: 'hx', l: lv, x: 0, z: 8.3, len: 20 });
    if (lv % 2 === 1) scaffoldSpecs.push({ t: 'bx', l: lv, x: 0, z: 7.75, len: 20 });
  }
  function countType(t) { return scaffoldSpecs.filter(function (s) { return s.t === t; }).length; }
  var instV = new THREE.InstancedMesh(tubeV, M.scaffold, countType('v'));
  var instH = new THREE.InstancedMesh(tubeH, M.scaffold, countType('hx') + countType('hz'));
  var instB = new THREE.InstancedMesh(boardG, M.plank, countType('bx') + countType('bz'));
  [instV, instH, instB].forEach(function (im) { im.castShadow = true; im.receiveShadow = true; world.add(im); });
  var dummy = new THREE.Object3D();
  var lastScaffoldTop = -1;
  function updateScaffold(topLevels) {
    var tl = Math.round(topLevels * 100) / 100;
    if (tl === lastScaffoldTop) return; lastScaffoldTop = tl;
    var iv = 0, ih = 0, ib = 0;
    scaffoldSpecs.forEach(function (s) {
      var vis = clamp(tl - s.l, 0, 1);         // partial for the level being added/removed
      var y = 0.05 + s.l * SC_LIFT;
      dummy.rotation.set(0, 0, 0);
      if (s.t === 'v') {
        dummy.position.set(s.x, y, s.z); if (vis > 0) dummy.scale.set(1, vis, 1); else dummy.scale.setScalar(0.0001);
        dummy.updateMatrix(); instV.setMatrixAt(iv++, dummy.matrix);
      } else if (s.t === 'hx' || s.t === 'hz') {
        dummy.position.set(s.x, y + SC_LIFT, s.z);
        if (s.t === 'hz') dummy.rotation.y = Math.PI / 2;
        if (vis >= 1) dummy.scale.set(s.len, 1, 1); else dummy.scale.setScalar(0.0001);
        dummy.updateMatrix(); instH.setMatrixAt(ih++, dummy.matrix);
      } else {
        dummy.position.set(s.x, y + SC_LIFT + 0.08, s.z);
        if (s.t === 'bz') dummy.rotation.y = Math.PI / 2;
        if (vis >= 1) dummy.scale.set(s.len, 1, 1); else dummy.scale.setScalar(0.0001);
        dummy.updateMatrix(); instB.setMatrixAt(ib++, dummy.matrix);
      }
    });
    instV.instanceMatrix.needsUpdate = instH.instanceMatrix.needsUpdate = instB.instanceMatrix.needsUpdate = true;
  }

  /* ====================================================================== */
  /*  TOWER CRANE (Sharanam orange)                                          */
  /* ====================================================================== */
  var latticeTex = canvasTex(64, 64, function (g, w, h) {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(3, 3); g.lineTo(w - 3, h - 3); g.stroke();
  });
  latticeTex.wrapS = latticeTex.wrapT = THREE.RepeatWrapping;
  function latticeMat(rx, ry) { var tx = latticeTex.clone(); tx.needsUpdate = true; tx.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ color: '#f28c28', map: tx, alphaMap: tx, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.2 }); }
  var crane = new THREE.Group(); crane.position.set(-17, 0, -9); world.add(crane);
  var craneBody = new THREE.Group(); crane.add(craneBody);
  var MAST_H = 34;
  var mast = mesh(baseBox(1.7, MAST_H, 1.7), latticeMat(1, MAST_H / 1.7)); craneBody.add(mast);
  craneBody.add(box(4, 1, 4, M.concreteDark, 0, 0.5, 0));
  var slew = new THREE.Group(); slew.position.y = MAST_H; craneBody.add(slew);
  slew.add(box(2.2, 1.6, 2.2, M.orange, 0, 0.8, 0));
  slew.add(box(1.4, 1.3, 1.6, M.white, 1.6, 0.6, 0.9)); // cab
  var jib = mesh(new THREE.BoxGeometry(34, 1.3, 1.3), latticeMat(26, 1)); jib.position.set(17, 1.9, 0); slew.add(jib);
  var cjib = mesh(new THREE.BoxGeometry(10, 1.1, 1.3), latticeMat(8, 1)); cjib.position.set(-5, 1.9, 0); slew.add(cjib);
  slew.add(box(3, 2, 1.8, M.concreteDark, -8.5, 0.8, 0)); // counterweights
  var apex = mesh(baseBox(1.2, 6, 1.2), latticeMat(1, 5)); apex.position.y = 1.6; slew.add(apex);
  var trolley = new THREE.Group(); trolley.position.set(22, 1.1, 0); slew.add(trolley);
  trolley.add(box(1.2, 0.4, 1.4, M.charcoal, 0, 0, 0));
  var cableGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 4); cableGeo.translate(0, -0.5, 0);
  var cable = new THREE.Mesh(cableGeo, M.charcoal); trolley.add(cable);
  var hook = new THREE.Group(); trolley.add(hook);
  hook.add(box(0.7, 0.8, 0.5, M.orange, 0, 0, 0));
  var load = new THREE.Group(); hook.add(load);
  for (var lb = 0; lb < 5; lb++) { var bar = mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), M.steel); bar.rotation.z = Math.PI / 2; bar.position.set(0, -1.4, (lb - 2) * 0.26); load.add(bar); }
  [-1.6, 1.6].forEach(function (lx) { var sl = box(0.03, 1.1, 0.03, M.charcoal, lx * 0.5, -0.85, 0, false); sl.rotation.z = lx > 0 ? -0.6 : 0.6; load.add(sl); });

  /* ====================================================================== */
  /*  SITE OFFICE, REST SHELTER, HOARDING, MATERIALS, PLANT                  */
  /* ====================================================================== */
  var siteKit = new THREE.Group(); world.add(siteKit);
  // site office container
  var office = new THREE.Group(); office.position.set(-17, 0, 4); office.rotation.y = Math.PI / 2; siteKit.add(office);
  office.add(box(9, 2.8, 3, M.white, 0, 1.6, 0));
  office.add(box(9.05, 0.35, 3.05, M.orange, 0, 2.6, 0));
  office.add(box(1.6, 1, 0.05, M.glassFrame, -2, 1.7, 1.52, false));
  office.add(box(1.6, 1, 0.05, M.glassFrame, 1.5, 1.7, 1.52, false));
  office.add(box(0.9, 2, 0.05, M.charcoal, 3.4, 1.2, 1.52, false));
  // rest shelter with benches (Scene 2)
  var shelter = new THREE.Group(); shelter.position.set(13.5, 0, 12.5); siteKit.add(shelter);
  [[-3, -1.6], [3, -1.6], [-3, 1.6], [3, 1.6]].forEach(function (p) { shelter.add(box(0.12, 2.9, 0.12, M.steel, p[0], 1.45, p[1])); });
  var roofTarp = mesh(new THREE.PlaneGeometry(6.6, 3.8, 8, 4), M.tarp); roofTarp.rotation.x = -Math.PI / 2 + 0.06; roofTarp.position.y = 2.95; shelter.add(roofTarp);
  shelter.add(box(5, 0.08, 0.5, M.wood, 0, 0.5, -0.9)); shelter.add(box(5, 0.08, 0.5, M.wood, 0, 0.5, 0.9));
  [-2.2, 2.2].forEach(function (bx) { shelter.add(box(0.08, 0.5, 0.45, M.wood, bx, 0.25, -0.9)); shelter.add(box(0.08, 0.5, 0.45, M.wood, bx, 0.25, 0.9)); });
  shelter.add(box(1.2, 0.8, 0.8, M.offwhite, 0, 0.4, 0)); // water cooler crate
  // blueprint table near the office (Scene 3)
  var bpTex = canvasTex(1024, 640, function (g, w, h) {
    g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(41,41,41,.18)'; g.lineWidth = 1;
    for (var x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (var y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = '#292929'; g.lineWidth = 6; g.strokeRect(120, 110, 620, 400);
    g.lineWidth = 3; [326, 533].forEach(function (x) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, 510); g.stroke(); });
    g.beginPath(); g.moveTo(120, 310); g.lineTo(740, 310); g.stroke();
    g.strokeStyle = '#f28c28'; g.lineWidth = 5; g.setLineDash([16, 10]); g.strokeRect(90, 80, 680, 460); g.setLineDash([]);
    g.fillStyle = '#f28c28'; [120, 326, 533, 740].forEach(function (x) { g.beginPath(); g.arc(x, 60, 16, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#292929'; g.font = '700 30px Arial'; g.fillText('SHARANAM PMC  •  LEVEL 4–6 PLAN', 120, 590);
    g.fillRect(800, 110, 180, 400); g.fillStyle = '#f28c28'; g.fillRect(800, 110, 180, 40);
  });
  var bpTable = new THREE.Group(); bpTable.position.set(-12, 0, 9); siteKit.add(bpTable);
  bpTable.add(box(3, 0.08, 1.8, M.wood, 0, 1.0, 0));
  [[-1.35, -0.8], [1.35, -0.8], [-1.35, 0.8], [1.35, 0.8]].forEach(function (p) { bpTable.add(box(0.08, 1, 0.08, M.steel, p[0], 0.5, p[1])); });
  var bpSheet = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshStandardMaterial({ map: bpTex, roughness: 0.8 }));
  bpSheet.rotation.x = -Math.PI / 2; bpSheet.position.y = 1.05; bpSheet.receiveShadow = true;
  var bpPivot = new THREE.Group(); bpPivot.position.set(-1.3, 0, 0); bpSheet.position.x = 1.3; bpPivot.add(bpSheet); bpTable.add(bpPivot);

  // hoarding fence with Sharanam branding
  var hoardTex = canvasTex(1024, 128, function (g, w, h) {
    g.fillStyle = '#f6f4ef'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f28c28'; g.fillRect(0, h - 22, w, 22);
    g.fillStyle = '#292929'; g.font = '800 34px Manrope, Arial, sans-serif'; g.textBaseline = 'middle';
    g.fillText('SHARANAM', 40, 52);
    g.fillStyle = '#8a857e'; g.font = '600 22px Arial'; g.fillText('CIVIL CONSULTANCY  |  PMC', 250, 54);
  }, 1, 1);
  var hoardMat = new THREE.MeshStandardMaterial({ map: hoardTex, roughness: 0.8 });
  var fence = new THREE.Group(); world.add(fence);
  function fenceRun(x1, z1, x2, z2) {
    var len = Math.hypot(x2 - x1, z2 - z1), segs = Math.round(len / 8);
    for (var i = 0; i < segs; i++) {
      var t0 = i / segs, t1 = (i + 1) / segs;
      var p = mesh(new THREE.BoxGeometry(len / segs - 0.05, 1.7, 0.08), [M.white, M.white, M.white, M.white, hoardMat, hoardMat]);
      p.position.set(lerp(x1, x2, (t0 + t1) / 2), 0.85, lerp(z1, z2, (t0 + t1) / 2));
      p.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      fence.add(p);
    }
  }
  fenceRun(-24, -15, 24, -15); fenceRun(24, -15, 24, 19); fenceRun(-24, 19, -24, -15);
  // the road side stays open so the site reads clearly from the street

  // materials laid around the site
  var materials = new THREE.Group(); world.add(materials);
  function pallet(x, z, rows, mat, sizeX, sizeZ) {
    var g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(box(sizeX + 0.2, 0.15, sizeZ + 0.2, M.wood, 0, 0.075, 0));
    var stack = mesh(baseBox(sizeX, rows * 0.24, sizeZ), mat); stack.position.y = 0.15; g.add(stack);
    g.userData.stack = stack; materials.add(g); return g;
  }
  var mats = [
    pallet(-7, 11.5, 5, M.brick, 1.6, 1.2), pallet(-4.6, 11.5, 4, M.brick, 1.6, 1.2), pallet(-7, 14, 3, M.brick, 1.6, 1.2),
    pallet(4.5, 12.5, 5, M.cement, 1.5, 1.1), pallet(6.8, 12.5, 3, M.cement, 1.5, 1.1)
  ];
  var rebarBundle = new THREE.Group(); rebarBundle.position.set(-1.5, 0.2, 14.5); materials.add(rebarBundle);
  for (var rb = 0; rb < 14; rb++) { var rr = mesh(new THREE.CylinderGeometry(0.05, 0.05, 9, 5), M.rebar); rr.rotation.z = Math.PI / 2; rr.position.set(0, (rb % 3) * 0.1, (rb / 3 | 0) * 0.12); rebarBundle.add(rr); }
  rebarBundle.add(box(0.3, 0.2, 1, M.wood, -3.5, -0.1, 0.25)); rebarBundle.add(box(0.3, 0.2, 1, M.wood, 3.5, -0.1, 0.25));
  var sandPile = mesh(new THREE.ConeGeometry(2.4, 1.8, 18), M.sand); sandPile.position.set(17, 0.9, -2); sandPile.scale.y = 0.8; materials.add(sandPile);
  var timber = new THREE.Group(); timber.position.set(15.5, 0, 4.5); materials.add(timber);
  for (var tb = 0; tb < 6; tb++) timber.add(box(5, 0.12, 0.25, M.plank, 0, 0.1 + (tb / 3 | 0) * 0.13, (tb % 3) * 0.3));
  materials.children.forEach(function (m) { m.userData.base = m.scale.clone(); });

  // concrete mixer truck
  var truck = new THREE.Group(); truck.position.set(13, 0, -10.5); world.add(truck);
  truck.add(box(2.4, 2.1, 2.3, M.white, 3.2, 1.65, 0));
  truck.add(box(2.42, 0.4, 2.32, M.orange, 3.2, 1.0, 0));
  truck.add(box(1.4, 0.8, 2.2, M.glassFrame, 3.9, 2.25, 0, false));
  truck.add(box(6.6, 0.5, 2.2, M.charcoal, 0.4, 0.95, 0));
  var drum = new THREE.Group(); drum.position.set(-0.4, 2.45, 0); drum.rotation.z = 0.2; truck.add(drum);
  var drumMesh = mesh(new THREE.CylinderGeometry(1.05, 1.25, 4.2, 18), M.steel); drumMesh.rotation.z = Math.PI / 2; drum.add(drumMesh);
  var drumStripe = mesh(new THREE.TorusGeometry(1.16, 0.07, 6, 24), M.orange); drumStripe.rotation.y = Math.PI / 2; drum.add(drumStripe);
  [-2, 0.2, 3.3].forEach(function (wx) { [-1.05, 1.05].forEach(function (wz) { var wh = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 14), M.tyre); wh.rotation.x = Math.PI / 2; wh.position.set(wx, 0.55, wz); truck.add(wh); }); });

  /* ====================================================================== */
  /*  TREES & SHRUBS (grow in the final stage)                               */
  /* ====================================================================== */
  var trees = new THREE.Group(); world.add(trees);
  var canopyGeo = new THREE.IcosahedronGeometry(1.6, 1), trunkGeo = new THREE.CylinderGeometry(0.16, 0.22, 2.4, 6); trunkGeo.translate(0, 1.2, 0);
  var treeSpots = [[-14, 15], [-10.5, 17.2], [10.5, 17.2], [15, 13], [19, 8], [19, -2], [-23.5, 13], [19, -11], [-12, -12], [0, -12.5], [11, -12]];
  treeSpots.forEach(function (p, i) {
    var t = new THREE.Group(); t.position.set(p[0], 0, p[1]);
    t.add(mesh(trunkGeo, M.trunk));
    var c1 = mesh(canopyGeo, i % 2 ? M.leaf : M.leafDark); c1.position.y = 3.3; c1.scale.set(1, 1.15, 1); t.add(c1);
    var c2 = mesh(canopyGeo, M.leaf); c2.position.set(0.6, 2.8, 0.3); c2.scale.setScalar(0.7); t.add(c2);
    t.scale.setScalar(0.85 + (i % 3) * 0.15); trees.add(t);
    stage(t, 0.8 + (i % 5) * 0.025, 0.9 + (i % 5) * 0.025, 'pop');
  });
  var shrubGeo = new THREE.IcosahedronGeometry(0.6, 0);
  for (var sh = 0; sh < 18; sh++) {
    var s = mesh(shrubGeo, sh % 2 ? M.leaf : M.leafDark); s.scale.set(1.3, 0.8, 1.1);
    var side = sh < 9 ? -1 : 1, k2 = sh % 9;
    s.position.set(side * (4.2 + k2 * 0.9), 0.4, 13.2 + (k2 % 2) * 0.4);
    world.add(s); stage(s, 0.84 + k2 * 0.01, 0.92 + k2 * 0.01, 'pop');
  }
  // street lamps along the front
  [-11.5, 11.5].forEach(function (lx) {
    var lamp = new THREE.Group(); lamp.position.set(lx, 0, 33.5);
    lamp.add(mesh(baseBox(0.14, 4.5, 0.14), M.charcoal)); lamp.add(box(1.1, 0.14, 0.3, M.charcoal, 0.45, 4.5, 0)); lamp.add(box(0.5, 0.08, 0.26, M.orange, 0.8, 4.42, 0, false));
    world.add(lamp); stage(lamp, 0.86, 0.94, 'grow');
  });

  /* ====================================================================== */
  /*  PEOPLE — simple, respectful figures in PPE                             */
  /* ====================================================================== */
  var capsule = function (r, l) { return new THREE.CapsuleGeometry(r, l, 4, 8); };
  var G = {
    torso: capsule(0.23, 0.45), head: new THREE.SphereGeometry(0.15, 14, 10),
    hat: new THREE.SphereGeometry(0.175, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), brim: new THREE.CylinderGeometry(0.22, 0.22, 0.025, 14),
    thigh: capsule(0.085, 0.36), shin: capsule(0.075, 0.36), arm: capsule(0.065, 0.42),
    vest: capsule(0.245, 0.34), roll: new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), boxCarry: new THREE.BoxGeometry(0.5, 0.3, 0.35)
  };
  G.thigh.translate(0, -0.27, 0); G.shin.translate(0, -0.27, 0); G.arm.translate(0, -0.27, 0);
  function person(opts) {
    var p = new THREE.Group();
    var body = new THREE.Group(); body.position.y = 0.98; p.add(body); // hips height
    var torso = mesh(G.torso, opts.shirt); torso.position.y = 0.38; body.add(torso);
    var vest = mesh(G.vest, opts.vest || M.vest); vest.position.y = 0.42; vest.scale.set(1, 1, 0.92); body.add(vest);
    var head = mesh(G.head, opts.skin); head.position.y = 0.86; body.add(head);
    var hat = mesh(G.hat, opts.hat); hat.position.y = 0.9; body.add(hat);
    var brim = mesh(G.brim, opts.hat); brim.position.y = 0.9; body.add(brim);
    function limb(geo, mat, x, y) { var piv = new THREE.Group(); piv.position.set(x, y, 0); var m = mesh(geo, mat); piv.add(m); return piv; }
    var hipL = limb(G.thigh, opts.pants, -0.11, 0), hipR = limb(G.thigh, opts.pants, 0.11, 0);
    var kneeL = limb(G.shin, opts.pants, 0, -0.54), kneeR = limb(G.shin, opts.pants, 0, -0.54);
    hipL.add(kneeL); hipR.add(kneeR); body.add(hipL); body.add(hipR);
    var shL = limb(G.arm, opts.shirt, -0.3, 0.62), shR = limb(G.arm, opts.shirt, 0.3, 0.62);
    body.add(shL); body.add(shR);
    p.userData = { body: body, hipL: hipL, hipR: hipR, kneeL: kneeL, kneeR: kneeR, shL: shL, shR: shR };
    if (opts.roll) { var roll = mesh(G.roll, M.white); roll.rotation.z = Math.PI / 2; roll.position.set(0, -0.5, 0.12); shR.add(roll); }
    if (opts.carry) { var bx = mesh(G.boxCarry, M.brick); bx.position.set(0, 0.42, 0.3); body.add(bx); p.userData.carry = bx; }
    return p;
  }
  // pose: sit 0..1, walk phase (radians) with amount, work (arm swing), point (right arm raised)
  function pose(p, o) {
    var u = p.userData, sit = o.sit || 0, wa = o.walkAmt || 0, ph = o.phase || 0;
    var swing = Math.sin(ph) * 0.55 * wa;
    u.body.position.y = lerp(0.98, 0.56, sit) + Math.abs(Math.cos(ph)) * 0.03 * wa + (o.breath || 0);
    u.hipL.rotation.x = lerp(swing, -1.45, sit); u.hipR.rotation.x = lerp(-swing, -1.45, sit);
    u.kneeL.rotation.x = lerp(Math.max(0, -swing) * 0.9, 1.5, sit); u.kneeR.rotation.x = lerp(Math.max(0, swing) * 0.9, 1.5, sit);
    var work = o.work || 0;
    u.shL.rotation.x = lerp(-swing * 0.8, -0.5, sit) - work * (0.9 + Math.sin(o.t * 5) * 0.35);
    u.shR.rotation.x = lerp(swing * 0.8, -0.35, sit) - work * (0.9 + Math.sin(o.t * 5 + 1.2) * 0.35) - (o.point || 0) * 1.6;
    u.shR.rotation.z = -(o.point || 0) * 0.25;
    if (u.carry) { u.shL.rotation.x = -1.1 * (o.carryAmt || 0) + u.shL.rotation.x * (1 - (o.carryAmt || 0)); u.shR.rotation.x = -1.1 * (o.carryAmt || 0) + u.shR.rotation.x * (1 - (o.carryAmt || 0)); u.carry.visible = (o.carryAmt || 0) > 0.5; }
  }

  var crew = new THREE.Group(); world.add(crew);
  var skins = [M.skin, M.skin2];
  var GATE = new THREE.Vector3(-17, 0, 22);
  // each worker: seat (Scene 2) and work spot (Scene 3–4)
  var crewSpec = [
    { seat: [11.6, 11.6], work: [-5.5, 9.4], face: Math.PI, carry: false },
    { seat: [12.8, 11.6], work: [-1.0, 9.4], face: Math.PI, carry: false },
    { seat: [14.2, 11.6], work: [9.6, 9.2], face: Math.PI, carry: false },
    { seat: [12.2, 13.4], work: [-7, 10.1], face: 0, carry: true },
    { seat: [13.6, 13.4], work: [11.8, -4.5], face: 0, carry: false },
    { seat: [15.0, 13.4], work: [4.8, 10.8], face: 0, carry: true }
  ];
  var workers = crewSpec.map(function (s, i) {
    var w = person({ shirt: i % 2 ? M.cloth : M.cloth2, pants: M.cloth, skin: skins[i % 2], hat: M.hatYellow, carry: s.carry });
    w.userData.spec = s; crew.add(w); return w;
  });
  // Sharanam supervision team
  var team = [
    person({ shirt: M.shirt, pants: M.cloth, skin: M.skin, hat: M.hatWhite, vest: M.vest, roll: true }),
    person({ shirt: M.shirt, pants: M.charcoal, skin: M.skin2, hat: M.hatWhite, vest: M.vest }),
    person({ shirt: M.cloth2, pants: M.cloth, skin: M.skin, hat: M.hatWhite, vest: M.vest })
  ];
  var teamSpots = [[-12, 7.5, 0.0], [-13.8, 9.3, Math.PI / 2 + 0.2], [-10.2, 9.6, -Math.PI / 2 - 0.2]];
  team.forEach(function (m) { crew.add(m); });

  /* ====================================================================== */
  /*  SHARANAM PROJECT MANAGER — finale character (assets/js/hero-engineer.js)*/
  /* ====================================================================== */
  var PM_SPOT = isMobile ? [1.6, 40] : [2.2, 32.8];
  var PM_FROM = isMobile ? [8, 41] : [13, 33.6];
  var engineer = window.SharanamEngineer ? window.SharanamEngineer.create(THREE, { brand: window.SHARANAM_BRAND, path: { from: PM_FROM, to: PM_SPOT } }) : null;
  var pmModel = null; // optional rigged GLB (see loadPMModel)
  if (engineer) { engineer.root.visible = false; world.add(engineer.root); }

  /* Optional: a licensed, rigged GLB of the project manager.
     Set window.SHARANAM_PM_MODEL = 'assets/models/sharanam-pm.glb' before this script.
     Clips are matched by name: /walk/i for the entrance, /fold|cross|arms/i for the
     arm-fold (scrubbed by scroll), /idle/i optional. The procedural rig is used until
     the model has loaded, and stays as the fallback if loading fails. */
  function loadPMModel(url) {
    if (!url || !THREE.GLTFLoader) return;
    new THREE.GLTFLoader().load(url, function (gltf) {
      var model = gltf.scene, holder = new THREE.Group();
      model.traverse(function (o) { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
      var box3 = new THREE.Box3().setFromObject(model), size = box3.getSize(new THREE.Vector3());
      var sc = 1.76 / (size.y || 1.76); model.scale.setScalar(sc);
      model.position.y = -box3.min.y * sc;
      holder.add(model); world.add(holder);
      var mixer = new THREE.AnimationMixer(model);
      function clip(re) { var c = gltf.animations.filter(function (a) { return re.test(a.name); })[0]; return c ? mixer.clipAction(c) : null; }
      var walkA = clip(/walk/i), foldA = clip(/fold|cross|arms/i), idleA = clip(/idle/i);
      [walkA, foldA, idleA].forEach(function (a) { if (a) { a.play(); a.paused = true; a.setEffectiveWeight(0); } });
      var dist = Math.hypot(PM_SPOT[0] - PM_FROM[0], PM_SPOT[1] - PM_FROM[1]);
      pmModel = {
        root: holder,
        update: function (st) {
          holder.position.set(lerp(PM_FROM[0], PM_SPOT[0], st.walk), 0, lerp(PM_FROM[1], PM_SPOT[1], st.walk));
          var heading = Math.atan2(PM_SPOT[0] - PM_FROM[0], PM_SPOT[1] - PM_FROM[1]);
          holder.rotation.y = lerp(heading, st.face, smooth(0, 1, st.turn));
          var moving = st.walk > 0.001 && st.walk < 0.999;
          if (walkA) { walkA.setEffectiveWeight(moving ? 1 : 0); walkA.time = (st.walk * dist / 1.4) % walkA.getClip().duration; }
          if (foldA) { foldA.setEffectiveWeight(moving ? 0 : 1); foldA.time = st.fold * foldA.getClip().duration * 0.999; }
          if (idleA && !foldA) { idleA.setEffectiveWeight(moving ? 0 : 1); idleA.time = st.time % idleA.getClip().duration; }
          mixer.update(0);
        }
      };
      holder.visible = false;
    }, undefined, function () { pmModel = null; /* keep the built-in character */ });
  }
  loadPMModel(window.SHARANAM_PM_MODEL);

  function placeWalker(p, from, to, u, faceEnd, t) {
    // u: 0..1 along the path; leg phase follows distance so the walk is scroll-synced
    var x = lerp(from[0], to[0], u), z = lerp(from[1], to[1], u);
    var dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    var moving = u > 0.001 && u < 0.999;
    p.position.set(x, 0, z);
    var heading = Math.atan2(to[0] - from[0], to[1] - from[1]);
    p.rotation.y = moving ? heading : (u >= 0.999 ? faceEnd : heading);
    return { walkAmt: moving ? 1 : 0, phase: u * dist * 2.2 };
  }

  /* ====================================================================== */
  /*  CAMERA PATH (spherical keyframes, Catmull-Rom between them)            */
  /* ====================================================================== */
  var KEYS = [
    { th: 0.78, r: 54, h: 16, tx: 0, ty: 8, tz: 1 },       // Scene 1
    { th: 0.5, r: 32, h: 9, tx: 8, ty: 3.2, tz: 7 },       // Scene 2 – rest area
    { th: -0.2, r: 34, h: 10, tx: -7, ty: 4.2, tz: 5 },    // Scene 3 – supervision
    { th: 0.5, r: 66, h: 19, tx: 0, ty: 10, tz: 0 },       // Scene 4 – whole building rising
    { th: -0.6, r: 64, h: 11, tx: 0, ty: 10, tz: 2 },      // Scene 5 – completed, pulled back
    { th: -0.105, r: 44, h: -1.75, tx: 1, ty: 11, tz: 1 } // Scene 6 – low street-level hero angle with the project manager
  ];
  if (isMobile) {
    KEYS.forEach(function (k, i) { if (i < 5) { k.r *= 1.42; k.h *= 1.1; } });
    KEYS[5] = { th: 0.0, r: 52, h: -0.9, tx: 0.6, ty: 8.5, tz: 1 };
  }
  function cr(p0, p1, p2, p3, t) { var t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
  var camT = new THREE.Vector3();
  function cameraAt(P, time, mx, my) {
    var seg = clamp(P * STOPS, 0, STOPS - 0.0001), i = Math.floor(seg), t = seg - i;
    t = t * t * (3 - 2 * t); // ease each chapter move
    var k0 = KEYS[Math.max(i - 1, 0)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(i + 2, STOPS)];
    function f(n) { return cr(k0[n], k1[n], k2[n], k3[n], t); }
    var th = f('th'), r = f('r'), h = f('h');
    var drift = reduced ? 0 : 1 - smooth(0.85, 1, P) * 0.7; // calmer once the final frame settles
    th += (Math.sin(time * 0.12) * 0.025 + mx * 0.03) * drift;
    h += (Math.sin(time * 0.17) * 0.25 - my * 0.6) * drift;
    camT.set(f('tx'), f('ty'), f('tz'));
    camera.position.set(camT.x + Math.sin(th) * r, h + camT.y * 0.35, camT.z + Math.cos(th) * r);
    camera.lookAt(camT);
    var fin = smooth(0.8, 1, P);
    var fov = baseFov + fin * 8;
    var off = lerp(1, isMobile ? 0 : 0.2, fin);
    if (Math.abs(fov - camera.fov) > 0.01 || Math.abs(off - viewShift) > 0.001) { camera.fov = fov; viewShift = off; applyView(); }
  }

  /* ====================================================================== */
  /*  ATMOSPHERE PER CHAPTER                                                  */
  /* ====================================================================== */
  var cA = new THREE.Color(), cB = new THREE.Color();
  var ATM = [
    { top: '#bcd3e2', hor: '#f4eee6', sun: '#fff4e4', si: 2.4, hi: 0.75, exp: 1.02 },
    { top: '#c6ccd0', hor: '#ebe8e3', sun: '#eef0f2', si: 1.25, hi: 0.95, exp: 0.98 },
    { top: '#b6d0e2', hor: '#f6f0e7', sun: '#fff3e0', si: 2.6, hi: 0.75, exp: 1.04 },
    { top: '#b3cfe3', hor: '#f7f1e8', sun: '#fff1dc', si: 2.7, hi: 0.72, exp: 1.04 },
    { top: '#b9d3e6', hor: '#fbe9d4', sun: '#ffd9aa', si: 2.6, hi: 0.7, exp: 1.06 },
    { top: '#bcd2e2', hor: '#fbe0c2', sun: '#ffcb8f', si: 2.75, hi: 0.66, exp: 1.09 }
  ];
  function atmosphere(P) {
    var seg = clamp(P * STOPS, 0, STOPS - 0.0001), i = Math.floor(seg), t = smooth(0, 1, seg - i);
    var a = ATM[i], b = ATM[i + 1];
    skyUniforms.topColor.value.copy(cA.set(a.top)).lerp(cB.set(b.top), t);
    skyUniforms.horizonColor.value.copy(cA.set(a.hor)).lerp(cB.set(b.hor), t);
    scene.fog.color.copy(skyUniforms.horizonColor.value);
    sun.color.copy(cA.set(a.sun)).lerp(cB.set(b.sun), t);
    sun.intensity = lerp(a.si, b.si, t); hemi.intensity = lerp(a.hi, b.hi, t);
    renderer.toneMappingExposure = lerp(a.exp, b.exp, t);
    // golden hour: sun swings lower in the final reveal
    var g = smooth(0.64, 1, P);
    sun.position.set(lerp(38, 48, g), lerp(52, 26, g), lerp(30, 44, g));
  }

  /* ====================================================================== */
  /*  UPDATE — everything is a pure function of P (+ time for idle motion)   */
  /* ====================================================================== */
  var blockColor = new THREE.Color('#d2c8bb'), finishColor = new THREE.Color('#f3f0ea');
  function update(P, time) {
    var b = smooth(0.52, 0.985, P);                   // construction progress (Scene 4 → 5)
    var activity = smooth(0.38, 0.5, P) * (1 - smooth(0.88, 0.97, P)); // site is working
    var hold = band(P, 0.1, 0.22, 0.34, 0.46);       // crew waiting
    applyStages(b);

    // rebar stubs disappear once the next floor is cast
    rebarGroup.visible = b < 0.05;

    // glass fades in through the window stage
    glassMat.opacity = smooth(0.45, 0.68, b) * 0.92;
    glassMat.visible = glassMat.opacity > 0.01;

    // wall finishes: block → painted white, top floor first
    for (var f = 0; f < FLOORS; f++) {
      var u = smooth(0.62 + (FLOORS - 1 - f) * 0.02, 0.72 + (FLOORS - 1 - f) * 0.02, b);
      wallMats[f].color.copy(blockColor).lerp(finishColor, u);
      wallMats[f].map = u > 0.6 ? null : blockTex; wallMats[f].needsUpdate = (u > 0.6) !== !!wallMats[f].userData.finished;
      wallMats[f].userData.finished = u > 0.6;
    }
    M.concrete.color.set('#c9c5be').lerp(finishColor, smooth(0.66, 0.8, b) * 0.6);

    // scaffolding: rises with the frame, comes down top-first at the end
    var grow = lerp(6, SC_LEVELS, smooth(0.0, 0.3, b));
    var remove = lerp(SC_LEVELS, 0, smooth(0.76, 0.9, b));
    updateScaffold(Math.min(grow, remove));

    // planning overlay (Scene 3), fading as the real structure replaces it
    var ov = smooth(0.4, 0.5, P) * (1 - smooth(0.06, 0.3, b));
    ghostMat.opacity = ov * 0.95; setOutMat.opacity = ov * 0.9; bubbleMat.opacity = ov * 0.9;
    ghost.visible = ov > 0.01;
    // level line rides with the work
    var lvl = 0.45 + lerp(3, 6.2, smooth(0, 0.3, b)) * FH;
    levelRing.position.set(0, lvl, 0);
    levelRing.material.opacity = smooth(0.0, 0.05, b) * (1 - smooth(0.32, 0.4, b)) * 0.9;
    levelRing.visible = levelRing.material.opacity > 0.01;

    // crane: idle until supervision starts, then slews and lifts; dismantled at the end
    var slewBase = -0.55;
    var act = activity;
    slew.rotation.y = slewBase + (reduced ? 0 : Math.sin(time * 0.25) * 0.55 * act) + b * 0.9;
    trolley.position.x = 14 + 8 * (0.5 + 0.5 * Math.sin(time * 0.3 + 1)) * act + (1 - act) * 8;
    var drop = 10 + lerp(0, 14, act * (0.5 + 0.5 * Math.sin(time * 0.35)));
    var hookY = -drop + (reduced ? 0 : Math.sin(time * 0.9) * 0.08);
    cable.scale.y = drop - 0.4; hook.position.y = hookY; load.visible = act > 0.2;
    var dismantle = smooth(0.86, 0.97, P);
    craneBody.scale.y = Math.max(1 - dismantle, 0.001); crane.visible = dismantle < 0.999;

    // truck: drum turns while working, drives out before the reveal
    drum.rotation.x = time * 1.4 * act;
    var leave = smooth(0.88, 0.97, P);
    truck.position.x = lerp(13, 80, leave); truck.visible = leave < 0.999;

    // materials get used up, site kit packed away
    materials.children.forEach(function (m, i) {
      var used = smooth(0.15 + (i % 4) * 0.08, 0.6 + (i % 4) * 0.06, b);
      var gone = smooth(0.74, 0.82, b);
      var s = Math.max((1 - used * 0.75) * (1 - gone), 0.001);
      if (m.userData.stack) m.userData.stack.scale.y = s; else m.scale.set(m.userData.base.x, m.userData.base.y * s, m.userData.base.z);
      m.visible = gone < 0.999;
    });
    var pack = smooth(0.8, 0.9, b);
    siteKit.scale.y = Math.max(1 - pack, 0.001); siteKit.visible = pack < 0.999;
    var fenceDown = smooth(0.84, 0.95, b);
    fence.scale.y = Math.max(1 - fenceDown, 0.001); fence.visible = fenceDown < 0.999;
    var green = smooth(0.84, 1, b);
    lawn.visible = green > 0.01; lawn.material.opacity = green; lawn.scale.setScalar(0.9 + green * 0.1);
    plaza.visible = path.visible = drive.visible = forecourt.visible = frontLawn.visible = green > 0.01;
    forecourt.scale.set(1, green, 1); frontLawn.material.opacity = green;
    plaza.scale.set(green, 1, 1); path.scale.set(1, green, 1); drive.scale.set(1, green, 1);

    // blueprint unrolls when the team arrives
    bpPivot.scale.x = Math.max(smooth(0.42, 0.48, P), 0.001);

    // ---- crew ----
    var arrive = smooth(0.06, 0.2, P);   // walk in from the gate to the shelter
    var standUp = smooth(0.36, 0.42, P); // stand up when supervision starts
    var toWork = smooth(0.42, 0.5, P);   // walk to work spots
    var exit = smooth(0.86, 0.95, P);    // leave the site before handover
    workers.forEach(function (w, i) {
      var s = w.userData.spec, o = { t: time + i, breath: reduced ? 0 : Math.sin(time * 1.6 + i) * 0.006 };
      var r;
      if (toWork <= 0) {
        r = placeWalker(w, [GATE.x + i * 0.6, GATE.z], s.seat, arrive, i < 3 ? 0 : Math.PI, time);
        o.walkAmt = r.walkAmt; o.phase = r.phase;
        o.sit = arrive >= 0.999 ? hold > 0.02 ? (1 - standUp) : 0 : 0;
        if (arrive >= 0.999) o.sit = 1 - standUp;
      } else if (exit <= 0) {
        r = placeWalker(w, s.seat, s.work, toWork, s.face, time);
        o.walkAmt = r.walkAmt; o.phase = r.phase;
        o.work = toWork >= 0.999 ? activity * (s.carry ? 0 : 1) : 0;
        o.carryAmt = s.carry ? toWork : 0;
      } else {
        r = placeWalker(w, s.work, [GATE.x + i * 0.6, GATE.z], exit, Math.PI, time);
        o.walkAmt = r.walkAmt; o.phase = r.phase;
      }
      pose(w, o);
      w.visible = arrive > 0.001 && exit < 0.999;
    });
    // supervision team: walk from gate to the blueprint table
    var teamIn = smooth(0.32, 0.46, P), teamOut = smooth(0.9, 0.97, P);
    team.forEach(function (m, i) {
      var spot = teamSpots[i], o = { t: time, breath: reduced ? 0 : Math.sin(time * 1.4 + i * 2) * 0.006 };
      var r = teamOut > 0 ? placeWalker(m, [spot[0], spot[1]], [GATE.x - 1 + i, GATE.z], teamOut, Math.PI, time)
                          : placeWalker(m, [GATE.x - 1 + i, GATE.z], [spot[0], spot[1]], teamIn, spot[2], time);
      o.walkAmt = r.walkAmt; o.phase = r.phase;
      // project manager points at the building while explaining the plan
      if (i === 0 && teamIn >= 0.999 && teamOut <= 0) { o.point = smooth(0.46, 0.5, P) * (0.75 + (reduced ? 0 : Math.sin(time * 0.8) * 0.15)); m.rotation.y = -0.4; }
      pose(m, o);
      m.visible = teamIn > 0.001 && teamOut < 0.999;
    });

    // tarp ripple on the shelter
    if (!reduced) roofTarp.rotation.z = Math.sin(time * 1.3) * 0.01;

  }

  /* finale: the project manager walks in, turns to camera, folds his arms */
  var faceAngle = 0;
  function updateFinale(P, time) {
    if (!engineer) return;
    var walk = smooth(0.8, 0.9, P), turn = smooth(0.885, 0.935, P), fold = smooth(0.925, 0.985, P);
    var on = P > 0.8005;
    var who = pmModel || engineer;
    engineer.root.visible = on && !pmModel;
    if (pmModel) pmModel.root.visible = on;
    if (!on) return;
    // face the final camera, turned a touch toward the building side
    var k = KEYS[STOPS];
    var cx = k.tx + Math.sin(k.th) * k.r, cz = k.tz + Math.cos(k.th) * k.r;
    faceAngle = Math.atan2(cx - PM_SPOT[0], cz - PM_SPOT[1]) - 0.22;
    who.update({ walk: walk, turn: turn, fold: fold, face: faceAngle, time: time, reduced: reduced });
  }

  /* ====================================================================== */
  /*  SIZE, LOOP, VISIBILITY                                                 */
  /* ====================================================================== */
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', function (e) {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2; mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  var baseFov = camera.fov, viewShift = 1, vw = 1, vh = 1;
  function applyView() {
    // push the subject to the right on desktop so the copy has room on the left
    if (vw > 820) camera.setViewOffset(vw, vh, -vw * 0.14 * viewShift, 0, vw, vh);
    else camera.setViewOffset(vw, vh, 0, vh * lerp(0.1, 0.24, viewShift), vw, vh);
    camera.updateProjectionMatrix();
  }
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; vw = w; vh = h;
    applyView();
  }
  window.addEventListener('resize', resize);

  var state = { target: 0, current: 0 };
  var running = false, inView = true, clock = new THREE.Clock(), elapsed = 0;
  function frame() {
    if (!running) return;
    var dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
    // smoothing gives trackpads and mouse wheels the same calm response
    var k = reduced ? 1 : 1 - Math.pow(0.0025, dt);
    state.current += (state.target - state.current) * k;
    if (Math.abs(state.target - state.current) < 0.00005) state.current = state.target;
    mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
    var P = state.current;
    renderStory(P, elapsed, mouse.x, mouse.y);
    requestAnimationFrame(frame);
  }
  function renderStory(P, time, mx, my) {
    update(clamp(P / 0.8, 0, 1), time);
    updateFinale(P, time);
    atmosphere(P);
    cameraAt(P, time, mx, my);
    renderer.render(scene, camera);
    setScene(clamp(Math.round(P * STOPS), 0, STOPS));
  }
  function start() { if (running) return; running = true; clock.getDelta(); requestAnimationFrame(frame); }
  function stop() { running = false; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; if (inView && !document.hidden) start(); else stop(); }, { threshold: 0 }).observe(story);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (inView) start(); });

  resize();
  renderStory(0, 0, 0, 0);
  story.classList.add('story--ready');
  start();
  initScroll(state);

  // debug/QA hook: window.__story.set(0.5)
  window.__story = { set: function (p) { state.target = state.current = clamp(p, 0, 1); }, info: function () { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries }; }, stop: function () { stop(); }, renderOnce: function (p) { var t0 = performance.now(); renderStory(p, 4, 0, 0); return performance.now() - t0; } };

  /* ====================================================================== */
  /*  SCROLL — GSAP ScrollTrigger with chapter snapping                      */
  /* ====================================================================== */
  function initScroll(st) {
    var fallbackUpdate = function (p) {
      if (st) st.target = p;
      else setScene(clamp(Math.round(p * STOPS), 0, STOPS));
    };
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      var settled = 0, restTimer = null;
      // only a progress value resting exactly on a chapter can become the anchor
      var remember = function (p) { var c = Math.round(p * STOPS); if (Math.abs(p * STOPS - c) < 0.02) settled = clamp(c, 0, STOPS); };
      ScrollTrigger.create({
        // the story ends half a screen before the section does, so the finished
        // frame (building + project manager) stays pinned a little longer
        trigger: story, start: 'top top', end: function () { return '+=' + Math.max(1, story.offsetHeight - window.innerHeight * 1.5); }, invalidateOnRefresh: true,
        onUpdate: function (self) {
          fallbackUpdate(self.progress);
          // once scrolling has rested for a moment, that chapter becomes the anchor
          clearTimeout(restTimer); restTimer = setTimeout(function () { remember(self.progress); }, 450);
        },
        onEnter: function () { settled = 0; },
        onEnterBack: function () { settled = STOPS; },
        snap: {
          // land on a chapter; never jump more than one chapter per gesture
          snapTo: function (v) {
            // any deliberate move (> 3% of the story) advances exactly one chapter in that direction
            var from = settled / STOPS, c = settled;
            if (v > from + 0.025) c = settled + 1;
            else if (v < from - 0.025) c = settled - 1;
            return clamp(c, 0, STOPS) / STOPS;
          },
          duration: reduced ? { min: 0.05, max: 0.15 } : { min: 0.35, max: 0.9 },
          delay: 0.12, ease: 'power2.inOut', inertia: false,
          onComplete: function (self) { remember(self.progress); }
        }
      });
    } else {
      window.addEventListener('scroll', function () {
        var r = story.getBoundingClientRect(), len = story.offsetHeight - window.innerHeight * 1.5;
        fallbackUpdate(clamp(-r.top / len, 0, 1));
      }, { passive: true });
    }
  }
})();
