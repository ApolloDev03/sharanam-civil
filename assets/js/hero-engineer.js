/* ==========================================================================
   Sharanam project manager — rigged character for the final hero scene.

   window.SharanamEngineer.create(THREE, options) returns
     { root, update(state) }
   state = { walk: 0..1 (along entrance path), fold: 0..1, face: radians,
             time: seconds, reduced: bool }

   Built as a jointed rig (hips → spine → chest → neck → head, shoulders →
   elbows → wrists, hips → knees → ankles) so every movement is a joint
   rotation, like a skeleton. If a licensed rigged GLB is configured with
   window.SHARANAM_PM_MODEL, hero-3d.js loads it and drives its clips with the
   same state instead (see README).
   ========================================================================== */
(function () {
  'use strict';

  function create(THREE, opt) {
    opt = opt || {};
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    var ease = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

    function std(c, r, m) { return new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.7 : r, metalness: m || 0 }); }
    var MAT = {
      skin: std('#8b5a3c', 0.55),
      skinShade: std('#6f4630', 0.6),
      hair: std('#1d1816', 0.8),
      shirt: std('#dfe6ec', 0.75),
      cuff: std('#cfd8df', 0.75),
      trousers: std('#2c3038', 0.8),
      belt: std('#1f1d1b', 0.5, 0.2),
      vest: std('#f28c28', 0.6),
      reflect: std('#e9edf0', 0.25, 0.85),
      boot: std('#3b2a1f', 0.55, 0.1),
      sole: std('#161616', 0.9),
      helmet: std('#fbfbf8', 0.32, 0.05),
      eye: std('#1a1412', 0.3),
      watch: std('#2a2a2a', 0.35, 0.6)
    };

    function m(geo, mat) { var x = new THREE.Mesh(geo, mat); x.castShadow = true; x.receiveShadow = true; return x; }
    function cap(r, l) { return new THREE.CapsuleGeometry(r, l, 6, 14); }
    function joint(parent, x, y, z) { var j = new THREE.Group(); j.position.set(x || 0, y || 0, z || 0); j.rotation.order = 'ZXY'; parent.add(j); return j; }

    /* ------------------------------------------------------------ rig */
    var root = new THREE.Group();
    var hips = joint(root, 0, 0.95, 0);
    var spine = joint(hips, 0, 0.06, 0);
    var chest = joint(spine, 0, 0.22, 0);
    var neck = joint(chest, 0, 0.27, 0.005);
    var head = joint(neck, 0, 0.1, 0.01);

    /* ------------------------------------------------------------ lower body */
    var pelvis = m(new THREE.SphereGeometry(0.16, 20, 14), MAT.trousers); pelvis.scale.set(1.02, 0.72, 0.72); pelvis.position.y = -0.02; hips.add(pelvis);
    var belt = m(new THREE.CylinderGeometry(0.156, 0.156, 0.045, 24, 1, true), MAT.belt); belt.scale.set(1.04, 1, 0.72); belt.position.y = 0.065; hips.add(belt);
    var buckle = m(new THREE.BoxGeometry(0.05, 0.035, 0.01), MAT.reflect); buckle.position.set(0, 0.065, 0.118); hips.add(buckle);

    function leg(side) {
      var thigh = joint(hips, side * 0.092, -0.02, 0);
      var tm = m(cap(0.074, 0.34), MAT.trousers); tm.position.y = -0.22; tm.scale.set(1, 1, 1.05); thigh.add(tm);
      var knee = joint(thigh, 0, -0.45, 0);
      var sm = m(cap(0.058, 0.34), MAT.trousers); sm.position.y = -0.2; knee.add(sm);
      var ankle = joint(knee, 0, -0.43, 0);
      var boot = m(new THREE.CapsuleGeometry(0.058, 0.15, 6, 12), MAT.boot); boot.rotation.x = Math.PI / 2; boot.scale.set(1.1, 1, 0.82); boot.position.set(0, -0.035, 0.05); ankle.add(boot);
      var collar = m(new THREE.CylinderGeometry(0.066, 0.07, 0.09, 14), MAT.boot); collar.position.y = 0.0; ankle.add(collar);
      var sole = m(new THREE.BoxGeometry(0.115, 0.03, 0.3), MAT.sole); sole.position.set(0, -0.075, 0.05); ankle.add(sole);
      return { thigh: thigh, knee: knee, ankle: ankle };
    }
    var L = { leg: leg(-1) }, R = { leg: leg(1) };

    /* ------------------------------------------------------------ torso */
    var abdomen = m(cap(0.135, 0.14), MAT.shirt); abdomen.scale.set(1.12, 1, 0.78); abdomen.position.y = 0.08; spine.add(abdomen);
    var torso = m(cap(0.146, 0.24), MAT.shirt); torso.scale.set(1.28, 1, 0.72); torso.position.y = 0.07; chest.add(torso);
    // hi-vis vest: slightly larger shell over the shirt, open at the neck
    var vest = m(cap(0.152, 0.27), MAT.vest); vest.scale.set(1.3, 1, 0.74); vest.position.y = 0.02; chest.add(vest);
    [-0.06, 0.07].forEach(function (y) {
      var band = m(new THREE.CylinderGeometry(0.159, 0.159, 0.028, 28, 1, true), MAT.reflect);
      band.scale.set(1.31, 1, 0.78); band.position.y = y; chest.add(band);
    });
    // shirt collar visible in the vest opening
    var collarL = m(new THREE.BoxGeometry(0.06, 0.05, 0.012), MAT.shirt); collarL.position.set(-0.035, 0.235, 0.085); collarL.rotation.set(-0.35, 0, 0.5); chest.add(collarL);
    var collarR = collarL.clone(); collarR.position.x = 0.035; collarR.rotation.z = -0.5; chest.add(collarR);
    // shoulders (deltoids) so the arms read as part of the body
    var deltL = m(new THREE.SphereGeometry(0.07, 16, 12), MAT.shirt); deltL.position.set(-0.19, 0.2, 0); chest.add(deltL);
    var deltR = deltL.clone(); deltR.position.x = 0.19; chest.add(deltR);

    /* ------------------------------------------------------------ head */
    var neckM = m(new THREE.CylinderGeometry(0.047, 0.054, 0.11, 16), MAT.skin); neckM.position.y = 0.02; neck.add(neckM);
    var skull = m(new THREE.SphereGeometry(0.1, 28, 20), MAT.skin); skull.scale.set(0.9, 1.1, 1.0); skull.position.y = 0.08; head.add(skull);
    var jaw = m(new THREE.SphereGeometry(0.08, 20, 14), MAT.skin); jaw.scale.set(0.95, 0.75, 0.95); jaw.position.set(0, 0.025, 0.018); head.add(jaw);
    var hair = m(new THREE.SphereGeometry(0.103, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), MAT.hair); hair.scale.set(0.93, 1.08, 1.04); hair.position.set(0, 0.09, -0.012); hair.rotation.x = 0.55; head.add(hair);
    [-1, 1].forEach(function (s) {
      var ear = m(new THREE.SphereGeometry(0.02, 10, 8), MAT.skinShade); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * 0.09, 0.075, 0); head.add(ear);
      var eye = m(new THREE.SphereGeometry(0.0105, 10, 8), MAT.eye); eye.scale.set(1.3, 0.75, 0.6); eye.position.set(s * 0.034, 0.093, 0.091); head.add(eye);
      var brow = m(new THREE.BoxGeometry(0.03, 0.006, 0.01), MAT.hair); brow.position.set(s * 0.034, 0.112, 0.092); brow.rotation.z = s * -0.08; head.add(brow);
    });
    var nose = m(new THREE.ConeGeometry(0.011, 0.03, 10), MAT.skin); nose.rotation.x = Math.PI / 2 + 0.25; nose.position.set(0, 0.07, 0.103); head.add(nose);
    var mustache = m(new THREE.CapsuleGeometry(0.0055, 0.03, 4, 8), MAT.hair); mustache.rotation.z = Math.PI / 2; mustache.scale.set(1, 1, 0.6); mustache.position.set(0, 0.047, 0.097); head.add(mustache);
    var mouth = m(new THREE.BoxGeometry(0.026, 0.004, 0.005), MAT.skinShade); mouth.position.set(0, 0.031, 0.094); head.add(mouth);

    /* ------------------------------------------------------------ helmet with Sharanam logo */
    var helmet = new THREE.Group(); helmet.position.set(0, 0.12, -0.004); head.add(helmet);
    var shell = m(new THREE.SphereGeometry(0.126, 30, 18, 0, Math.PI * 2, 0, Math.PI / 2), MAT.helmet); shell.scale.set(0.98, 0.92, 1.12); helmet.add(shell);
    var brim = m(new THREE.CylinderGeometry(0.135, 0.14, 0.012, 32), MAT.helmet); brim.scale.set(1, 1, 1.16); brim.position.set(0, 0.0, 0.012); helmet.add(brim);
    var peak = m(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 24, 1, false, -Math.PI / 2, Math.PI), MAT.helmet); peak.position.set(0, 0.002, 0.11); peak.scale.set(1, 1, 0.55); helmet.add(peak);
    var ridge = m(new THREE.BoxGeometry(0.03, 0.02, 0.26), MAT.helmet); ridge.position.y = 0.112; ridge.scale.set(1, 1, 1); helmet.add(ridge);

    /* ------------------------------------------------------------ arms */
    function arm(side) {
      var shoulder = joint(chest, side * 0.205, 0.19, 0);
      var um = m(cap(0.05, 0.22), MAT.shirt); um.position.y = -0.15; shoulder.add(um);
      var elbow = joint(shoulder, 0, -0.3, 0);
      var fm = m(cap(0.043, 0.2), MAT.shirt); fm.position.y = -0.125; elbow.add(fm);
      var cuff = m(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14), MAT.cuff); cuff.position.y = -0.24; elbow.add(cuff);
      var wrist = joint(elbow, 0, -0.27, 0);
      var palm = m(new THREE.CapsuleGeometry(0.034, 0.045, 4, 10), MAT.skin); palm.scale.set(1, 1, 0.55); palm.position.y = -0.05; wrist.add(palm);
      var fingers = m(new THREE.CapsuleGeometry(0.03, 0.035, 4, 10), MAT.skin); fingers.scale.set(1, 1, 0.5); fingers.position.set(0, -0.1, 0.008); fingers.rotation.x = 0.25; wrist.add(fingers);
      var thumb = m(new THREE.CapsuleGeometry(0.012, 0.035, 4, 8), MAT.skin); thumb.position.set(side * -0.03, -0.045, 0.02); thumb.rotation.set(0.3, 0, side * 0.6); wrist.add(thumb);
      if (side < 0) { var watch = m(new THREE.CylinderGeometry(0.046, 0.046, 0.022, 16), MAT.watch); watch.position.y = -0.255; elbow.add(watch); }
      return { shoulder: shoulder, elbow: elbow, wrist: wrist };
    }
    L.arm = arm(-1); R.arm = arm(1);

    /* ------------------------------------------------------------ logo decals (original asset) */
    function decal(src, w, h, parent, pos, rot) {
      var tex = new THREE.Texture();
      var img = new Image();
      img.onload = function () { tex.image = img; tex.needsUpdate = true; };
      img.src = src;
      tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
      var mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      var p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      p.position.copy(pos); if (rot) p.rotation.copy(rot); p.renderOrder = 2; parent.add(p); return p;
    }
    if (opt.brand && opt.brand.icon) {
      // helmet front: the Sharanam symbol
      decal(opt.brand.icon, 0.032, 0.058, helmet, new THREE.Vector3(0, 0.05, 0.133), new THREE.Euler(-0.32, 0, 0));
    }
    if (opt.brand && opt.brand.logo) {
      // vest chest (left side of the wearer): full logo on a white patch
      var patch = m(new THREE.PlaneGeometry(0.135, 0.05), std('#ffffff', 0.6)); patch.position.set(0.075, 0.15, 0.1245); patch.rotation.set(-0.12, 0.42, 0); chest.add(patch);
      decal(opt.brand.logo, 0.126, 0.042, chest, new THREE.Vector3(0.0756, 0.15, 0.1255), new THREE.Euler(-0.12, 0.42, 0));
    }

    /* ------------------------------------------------------------ poses */
    // arms folded across the chest: right forearm over left, hands tucked
    var FOLD = {
      L: { sz: -0.2, sx: -0.62, sy: 1.42, ex: -2.0, wz: 0.55, wx: 0.0 },
      R: { sz: 0.2, sx: -0.78, sy: -1.4, ex: -1.92, wz: -0.55, wx: 0.0 }
    };
    var REST = {
      L: { sz: -0.07, sx: 0.02, sy: 0.1, ex: -0.12, wz: 0, wx: 0 },
      R: { sz: 0.07, sx: 0.02, sy: -0.1, ex: -0.12, wz: 0, wx: 0 }
    };

    function setArm(a, from, to, t, swing) {
      a.shoulder.rotation.z = lerp(from.sz, to.sz, t);
      a.shoulder.rotation.x = lerp(from.sx, to.sx, t) + swing * (1 - t);
      a.shoulder.rotation.y = lerp(from.sy, to.sy, t);
      a.elbow.rotation.x = lerp(from.ex, to.ex, t) - Math.max(0, -swing) * 0.3 * (1 - t);
      a.wrist.rotation.z = lerp(from.wz, to.wz, t);
      a.wrist.rotation.x = lerp(from.wx, to.wx, t);
    }

    var path = opt.path || { from: [6, 0], to: [0, 0] };
    var walkDist = Math.hypot(path.to[0] - path.from[0], path.to[1] - path.from[1]);

    function update(s) {
      var walk = clamp(s.walk, 0, 1), fold = ease(s.fold), time = s.time || 0, calm = s.reduced ? 0 : 1;
      // position along the entrance path
      root.position.set(lerp(path.from[0], path.to[0], walk), 0, lerp(path.from[1], path.to[1], walk));
      var heading = Math.atan2(path.to[0] - path.from[0], path.to[1] - path.from[1]);
      var moving = walk > 0.001 && walk < 0.999;
      var turn = ease(s.turn || 0);
      root.rotation.y = lerp(heading, s.face, turn);

      // walk cycle (phase follows distance → perfectly scroll-synced)
      var amt = moving ? 1 : 0;
      var ph = walk * walkDist * 2.6;
      var sw = Math.sin(ph) * 0.42 * amt;
      L.leg.thigh.rotation.x = sw; R.leg.thigh.rotation.x = -sw;
      L.leg.knee.rotation.x = Math.max(0, -Math.sin(ph)) * 0.75 * amt; R.leg.knee.rotation.x = Math.max(0, Math.sin(ph)) * 0.75 * amt;
      L.leg.ankle.rotation.x = -Math.max(0, Math.sin(ph)) * 0.25 * amt; R.leg.ankle.rotation.x = -Math.max(0, -Math.sin(ph)) * 0.25 * amt;
      hips.position.y = 0.95 + Math.abs(Math.cos(ph)) * 0.022 * amt;
      hips.rotation.y = Math.sin(ph) * 0.07 * amt;
      chest.rotation.y = -Math.sin(ph) * 0.09 * amt;

      // standing: weight settles, slight contrapposto and breathing once arms are folded
      var stand = 1 - amt;
      var breath = Math.sin(time * 1.5) * 0.004 * calm;
      L.leg.thigh.rotation.z = -0.035 * stand; R.leg.thigh.rotation.z = 0.035 * stand;
      hips.rotation.z = 0.018 * stand * fold;
      chest.rotation.x = -0.035 * fold + breath * 2;
      chest.position.y = 0.22 + breath;
      spine.rotation.x = 0.02 * fold;
      // head: looks along the path, then to camera, chin up slightly when proud
      neck.rotation.x = -0.05 * fold;
      head.rotation.y = Math.sin(time * 0.35) * 0.04 * calm * fold;
      head.rotation.x = -0.04 * fold;

      setArm(L.arm, REST.L, FOLD.L, fold, -sw * 0.85);
      setArm(R.arm, REST.R, FOLD.R, fold, sw * 0.85);
    }

    root.traverse(function (o) { if (o.isMesh) o.frustumCulled = false; });
    return { root: root, update: update, height: 1.76 };
  }

  window.SharanamEngineer = { create: create };
})();
