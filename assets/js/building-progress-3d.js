/* Scroll-linked 3D building for Sharanam's During Construction section.
   Local Three.js runtime; section-only observer; reduced-motion fallback. */
(() => {
  const canvas = document.getElementById('v25BuildingCanvas');
  const steps = [...document.querySelectorAll('.v24-execution-step[data-building-stage]')];
  if (!canvas || !steps.length) return;
  const labels = steps.map(step => step.querySelector('h3')?.textContent?.trim() || 'Construction');
  const status = document.getElementById('v25BuildingStage');
  const track = document.getElementById('v25BuildingTrack');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let setModelStage = () => {};
  const activate = index => {
    current = Math.max(0, Math.min(steps.length - 1, index));
    steps.forEach((el, i) => el.classList.toggle('is-building-active', i === current));
    if (status) status.textContent = labels[current];
    if (track) track.style.width = `${((current + 1) / steps.length) * 100}%`;
    setModelStage(current);
  };
  // Use viewport proximity to select a milestone, including reverse scroll.
  let scrollTick = false;
  const updateFromScroll = () => {
    scrollTick = false;
    const line = window.innerHeight * 0.54;
    let best = 0, distance = Infinity;
    steps.forEach((step, index) => {
      const rect = step.getBoundingClientRect();
      const d = Math.abs((rect.top + rect.height * 0.5) - line);
      if (d < distance) { distance = d; best = index; }
    });
    activate(best);
  };
  window.addEventListener('scroll', () => {
    if (!scrollTick) { scrollTick = true; requestAnimationFrame(updateFromScroll); }
  }, { passive: true });
  window.addEventListener('resize', updateFromScroll);
  activate(0);
  const THREE = window.THREE;
  if (!THREE || !window.WebGLRenderingContext) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (error) { return; }
  canvas.dataset.ready = '1';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(10, 8.7, 13.7);
  camera.lookAt(0, 3.2, 0);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x53524b, 2.1);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffd6a1, 3.2);
  key.position.set(8, 15, 5);
  scene.add(key);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x77988f, transparent: true, opacity: 0.78, metalness: 0.2, roughness: 0.22, side: THREE.DoubleSide });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xe4d3b9, roughness: .8, metalness: .05 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xce7932, roughness: .42, metalness: .2 });
  const base = new THREE.MeshStandardMaterial({ color: 0x81958d, roughness: .95 });
  const makeBox = (w,h,d, mat, x,y,z, group) => {const obj=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);obj.position.set(x,y,z);group.add(obj);return obj;};
  const model = new THREE.Group();scene.add(model);
  makeBox(7.7,.22,6.3,base,0,-.35,0,model);
  makeBox(6.7,.35,5.4,concrete,0,-.15,0,model);
  const floors=[];
  for(let floor=0;floor<5;floor++){
    const g=new THREE.Group();const y=floor*1.34;
    makeBox(6.2,.23,4.9,concrete,0,y,0,g);
    for(const x of [-2.9,2.9]) for(const z of [-2.24,2.24]) makeBox(.21,1.25,.21,steel,x,y+.67,z,g);
    makeBox(6.2,.13,4.9,steel,0,y+1.31,0,g);
    for(const x of [-1.9,-.65,.65,1.9]){
      makeBox(1.12,1.04,.07,glass,x,y+.72,2.49,g);
      makeBox(.07,1.04,4.5,glass,x+.55,y+.72,0,g);
    }
    floors.push(g);model.add(g);
  }
  const cap=new THREE.Group(); makeBox(6.65,.28,5.3,concrete,0,6.82,0,cap);model.add(cap);
  const crane=new THREE.Group();
  makeBox(.12,5.5,.12,steel,-4.2,3.8,-2.6,crane);
  makeBox(6,.12,.12,steel,-1.7,6.4,-2.6,crane);
  makeBox(.055,1.6,.055,steel,.5,5.58,-2.6,crane);
  scene.add(crane);
  let progress = 0, target = 0;
  const visibility = () => {
    const p=progress;
    floors.forEach((floor,i)=>{ const local=Math.max(0,Math.min(1,(p-i*.9)/.8));floor.visible=local>.02;floor.scale.y=Math.max(.01,local);floor.position.y= i*1.34*(1-local); });
    cap.visible=p>4.6;cap.position.y=(Math.max(.01,Math.min(1,(p-4.6)*3))-1)*.5;
    crane.visible=p<4.85;
    model.rotation.y = -.32 + progress*.065;
  };
  setModelStage = index => {target=index;};
  activate(current);
  let observerVisible=true;
  const observer=new IntersectionObserver(entries=>{observerVisible=entries[0].isIntersecting;},{rootMargin:'180px'});
  observer.observe(canvas);
  let running=true;
  const size = () => {
    const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  };
  window.addEventListener('resize',size,{passive:true});size();
  const draw=()=>{
    if(!running)return;
    if(observerVisible){progress += (target-progress)*(prefersReduced?1:.085);visibility();renderer.render(scene,camera);}
    requestAnimationFrame(draw);
  };
  draw();
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden)size(); });
  updateFromScroll();
})();
