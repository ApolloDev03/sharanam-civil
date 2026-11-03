(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = $('#header');
  const loader = $('#loader');
  let loaderFinished = false;
  function dismissLoader(){ if(loaderFinished)return;loaderFinished=true;if(!loader)return;loader.classList.add('exit');setTimeout(()=>{loader.classList.add('ready');loader.setAttribute('aria-hidden','true')},reduced?10:1100); }
  window.addEventListener('load',()=>setTimeout(dismissLoader,reduced?0:600),{once:true});
  setTimeout(dismissLoader,3500);
  const updateHeader=()=>header?.classList.toggle('shrink',window.scrollY>20);
  window.addEventListener('scroll',updateHeader,{passive:true});updateHeader();
  const mobile=$('#mobileToggle'),navigation=$('#navigation'),drop=$('#projectsDropdown'),dropButton=$('#projectsTrigger');
  function mobileOpen(open){navigation?.classList.toggle('open',open);mobile?.setAttribute('aria-expanded',String(open));document.body.classList.toggle('nav-open',open);if(!open)dropOpen(false)}
  function dropOpen(open){drop?.classList.toggle('open',open);dropButton?.setAttribute('aria-expanded',String(open))}
  mobile?.addEventListener('click',()=>mobileOpen(!navigation.classList.contains('open')));
  dropButton?.addEventListener('click',e=>{e.preventDefault();dropOpen(!drop.classList.contains('open'))});
  $$('.navigation a').forEach(a=>a.addEventListener('click',()=>mobileOpen(false)));
  document.addEventListener('click',e=>{if(drop&&!drop.contains(e.target))dropOpen(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){dropOpen(false);mobileOpen(false)}});
  window.addEventListener('resize',()=>{if(innerWidth>1120)mobileOpen(false)});
  const slides=$$('.hero-slide'),dots=$$('#slideTrack button'),current=$('#slideCurrent'),hero=$('#home');
  let index=0,lockUntil=0,scrollAcc=0,touchY=null;
  function goSlide(n){if(n<0||n>=slides.length||n===index)return false;index=n;slides.forEach((s,i)=>{const active=i===n;s.classList.toggle('is-active',active);s.setAttribute('aria-hidden',String(!active));s.querySelectorAll('a').forEach(a=>{a.tabIndex=active?0:-1})});if(current)current.textContent=String(n+1).padStart(2,'0');lockUntil=Date.now()+(reduced?250:1100);return true}
  $('#prevSlide')?.addEventListener('click',()=>goSlide((index-1+slides.length)%slides.length));
  $('#nextSlide')?.addEventListener('click',()=>goSlide((index+1)%slides.length));
  dots.forEach(d=>d.addEventListener('click',()=>goSlide(Number(d.dataset.go))));
  // Scroll is intercepted only while the hero substantially occupies the viewport.
  // Once a visitor has reached the last/first slide, native scrolling is allowed.
  function heroInView(){const r=hero.getBoundingClientRect();return r.top<=135&&r.bottom>=innerHeight*.65}
  window.addEventListener('wheel',e=>{
    if(reduced||!heroInView()||e.ctrlKey||Math.abs(e.deltaY)<2)return;
    const dir=Math.sign(e.deltaY);
    if((dir>0&&index===slides.length-1)||(dir<0&&index===0))return;
    if(Date.now()<lockUntil){e.preventDefault();return}
    scrollAcc+=e.deltaY;
    if(Math.abs(scrollAcc)<35){e.preventDefault();return}
    e.preventDefault();goSlide(index+Math.sign(scrollAcc));scrollAcc=0;
  },{passive:false});
  hero?.addEventListener('touchstart',e=>{touchY=e.changedTouches[0]?.clientY??null},{passive:true});
  hero?.addEventListener('touchend',e=>{if(touchY===null)return;const diff=touchY-(e.changedTouches[0]?.clientY??touchY);touchY=null;if(Math.abs(diff)>55)goSlide(index+Math.sign(diff))},{passive:true});
  // Reveal-on-scroll; no heavy scroll plugin required.
  if('IntersectionObserver' in window&&!reduced){const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target)}}),{threshold:.1,rootMargin:'0px 0px -30px 0px'});$$('.reveal').forEach(el=>io.observe(el))}else{$$('.reveal').forEach(el=>el.classList.add('visible'))}
  const serviceItems=$$('.service-item');serviceItems.forEach(item=>{function activate(){const n=item.dataset.image;serviceItems.forEach(x=>x.classList.toggle('selected',x===item));$$('.service-image').forEach(x=>x.classList.toggle('active',x.dataset.photo===n))}item.addEventListener('mouseenter',activate);item.addEventListener('focus',activate)});

  // Only one FAQ open at once.
  $$('.faq-list details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)$$('.faq-list details').filter(x=>x!==d).forEach(x=>x.open=false)}));
  $('#year').textContent=String(new Date().getFullYear());
  $('#contactForm')?.addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;const data=new FormData(f);const subject=encodeURIComponent('Project Enquiry — '+data.get('type'));const body=encodeURIComponent(`Name: ${data.get('name')}\nEmail: ${data.get('email')}\nPhone: ${data.get('phone')}\nProject type: ${data.get('type')}\n\n${data.get('message')}`);window.location.href=`mailto:info@sharanamconsultants.com?subject=${subject}&body=${body}`});
})();


/* Unified gallery + editorial testimonial controls */
(() => {
  const gallery = [...document.querySelectorAll('.about-gallery-image')];
  const thumbs = [...document.querySelectorAll('.about-thumb')];
  let photo = 0, photoTimer;
  function showPhoto(i) {
    if (!gallery.length) return;
    photo=(i+gallery.length)%gallery.length;
    gallery.forEach((img,n)=>img.classList.toggle('is-active',n===photo));
    thumbs.forEach((b,n)=>{b.classList.toggle('is-active',n===photo);b.setAttribute('aria-pressed',String(n===photo))});
  }
  const nextPhoto=()=>showPhoto(photo+1);
  const prevPhoto=()=>showPhoto(photo-1);
  document.getElementById('aboutNext')?.addEventListener('click',()=>{nextPhoto();restart()});
  document.getElementById('aboutPrev')?.addEventListener('click',()=>{prevPhoto();restart()});
  thumbs.forEach((b,i)=>b.addEventListener('click',()=>{showPhoto(i);restart()}));
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function restart(){clearInterval(photoTimer);if(!reduced)photoTimer=setInterval(nextPhoto,6500)}
  const galleryArea=document.querySelector('.about-visual');
  galleryArea?.addEventListener('mouseenter',()=>clearInterval(photoTimer));
  galleryArea?.addEventListener('mouseleave',restart);
  showPhoto(0);restart();
})();


document.addEventListener("DOMContentLoaded", () => {
    const slider = document.querySelector("#aboutSlider");

    if (!slider) return;

    const slides = [...slider.querySelectorAll(".about-slide")];
    const dots = [...slider.querySelectorAll(".about-dot")];

    if (!slides.length || slides.length !== dots.length) return;

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let current = 0;
    let timer = null;
    let isVisible = true;

    const INTERVAL = 4500;

    function showSlide(index) {
        current = (index + slides.length) % slides.length;

        slides.forEach((slide, i) => {
            const active = i === current;

            slide.classList.toggle("is-active", active);
            slide.setAttribute("aria-hidden", String(!active));
        });

        dots.forEach((dot, i) => {
            const active = i === current;

            dot.classList.toggle("is-active", active);
            dot.setAttribute("aria-pressed", String(active));
        });
    }

    function stopAutoPlay() {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    }

    function startAutoPlay() {
        stopAutoPlay();

        if (
            reduceMotion.matches ||
            document.hidden ||
            !isVisible ||
            slider.matches(":hover") ||
            slider.contains(document.activeElement)
        ) {
            return;
        }

        timer = setInterval(() => {
            showSlide(current + 1);
        }, INTERVAL);
    }

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
            showSlide(i);
            startAutoPlay();
        });
    });

    slider.addEventListener("mouseenter", stopAutoPlay);
    slider.addEventListener("mouseleave", startAutoPlay);

    slider.addEventListener("focusin", stopAutoPlay);
    slider.addEventListener("focusout", () => {
        requestAnimationFrame(startAutoPlay);
    });

    document.addEventListener("visibilitychange", startAutoPlay);

    const observer = new IntersectionObserver(
        entries => {
            isVisible = entries[0].isIntersecting;

            if (isVisible) startAutoPlay();
            else stopAutoPlay();
        },
        { threshold: 0.2 }
    );

    observer.observe(slider);

    if (reduceMotion.addEventListener) {
        reduceMotion.addEventListener("change", startAutoPlay);
    }

    showSlide(0);
    startAutoPlay();
});



/* ==========================================================================
   Redesigned sections: Our Services, Testimonials, FAQ
   ========================================================================== */
(() => {
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Our Services: hover / focus / tap swaps the photo and caption ---- */
  const svxItems = $$('.svx-item');
  const svxPhotos = $$('.svx-photo');
  const svxCaption = document.getElementById('svxCaption');
  const svxNum = document.getElementById('svxNum');
  let svxActive = 0;
  function setService(i) {
    if (i === svxActive || !svxPhotos[i]) return;
    svxPhotos.forEach(p => p.classList.remove('was-active'));
    svxPhotos[svxActive].classList.remove('is-active');
    svxPhotos[svxActive].classList.add('was-active');
    void svxPhotos[i].offsetWidth;
    svxPhotos[i].classList.add('is-active');
    svxItems.forEach((it, n) => it.classList.toggle('is-active', n === i));
    if (svxCaption) svxCaption.textContent = svxItems[i].querySelector('.svx-item__name').textContent;
    if (svxNum) svxNum.textContent = String(i + 1).padStart(2, '0');
    svxActive = i;
  }
  svxItems.forEach((item, i) => {
    item.addEventListener('mouseenter', () => setService(i));
    item.addEventListener('focus', () => setService(i));
    item.addEventListener('click', e => {
      if (!item.classList.contains('is-active')) { e.preventDefault(); setService(i); }
    });
  });

  /* ---- FAQ: one open at a time, arrow-key navigation ---- */
  const items = $$('.fq-item');
  const qs = items.map(it => it.querySelector('.fq-q'));
  qs.forEach((q, i) => {
    q.addEventListener('click', () => {
      const open = !items[i].classList.contains('is-open');
      items.forEach((it, n) => { it.classList.remove('is-open'); qs[n].setAttribute('aria-expanded', 'false'); });
      items[i].classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); qs[(i + 1) % qs.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); qs[(i - 1 + qs.length) % qs.length].focus(); }
    });
  });
})();


/* ==========================================================================
   v5: Testimonials — stacked sheets
   ========================================================================== */
(() => {
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ---- Testimonials: stacked sheets ---- */
  const cards = $$('.ts4-card');
  const cur = document.getElementById('ts4Cur');
  const stack = document.getElementById('ts4Stack');
  let front = 0, busy = false, timer = null;
  function layout() {
    cards.forEach((c, i) => {
      const pos = (i - front + cards.length) % cards.length;
      c.dataset.pos = String(pos);
      c.setAttribute('aria-hidden', String(pos !== 0));
    });
    if (cur) cur.textContent = String(front + 1).padStart(2, '0');
  }
  function go(dir) {
    if (busy || cards.length < 2) return;
    if (dir > 0 && !reduced) {
      busy = true;
      const leaving = cards[front];
      leaving.classList.add('is-leaving');
      front = (front + 1) % cards.length;
      setTimeout(() => { leaving.classList.remove('is-leaving'); layout(); busy = false; }, 420);
      // reveal the next card immediately underneath
      cards.forEach((c, i) => { if (c !== leaving) c.dataset.pos = String((i - front + cards.length) % cards.length); });
      cards[front].setAttribute('aria-hidden', 'false');
      if (cur) cur.textContent = String(front + 1).padStart(2, '0');
    } else {
      front = (front + dir + cards.length) % cards.length;
      layout();
    }
  }
  const stop = () => { clearInterval(timer); timer = null; };
  const play = () => { stop(); if (!reduced) timer = setInterval(() => go(1), 7000); };
  document.getElementById('ts4Prev')?.addEventListener('click', () => { go(-1); play(); });
  document.getElementById('ts4Next')?.addEventListener('click', () => { go(1); play(); });
  stack?.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); play(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); play(); }
  });
  let sx = null;
  stack?.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; }, { passive: true });
  stack?.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 45) { go(dx < 0 ? 1 : -1); play(); }
  }, { passive: true });
  const section = document.getElementById('testimonials');
  section?.addEventListener('mouseenter', stop);
  section?.addEventListener('mouseleave', play);
  section?.addEventListener('focusin', stop);
  layout(); play();

})();
