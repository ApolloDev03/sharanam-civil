/* Sharanam — shared inner page interactions; no external runtime required. */
(() => {
  'use strict';
  const $ = (q, el=document) => el.querySelector(q);
  const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Global WhatsApp control. The business phone number is supplied by the site's footer.
  if (!$('#shWhatsApp')) {
    const wa = document.createElement('a');
    wa.id='shWhatsApp'; wa.className='sh-whatsapp';
    wa.href='https://wa.me/918460065272?text='+encodeURIComponent('Hello Sharanam Civil Consultancy, I would like to discuss a project.');
    wa.target='_blank'; wa.rel='noopener noreferrer';
    wa.setAttribute('aria-label','Chat with Sharanam on WhatsApp');
    wa.innerHTML='<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" fill="none"><path d="M16 4A12 12 0 0 0 5.75 22.25L4 28l5.9-1.65A12 12 0 1 0 16 4Z" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M11 10c-.7-.2-1.6.7-1.6 2.3 0 3.3 4.4 7.8 8 8.7 1.9.5 3.4-.8 3.7-1.5.2-.4-.4-.7-1.1-1.1l-2.4-1.2c-.4-.2-.7-.2-1 .3l-.8 1c-.3.4-.5.5-1 .2-1.4-.7-2.6-1.8-3.4-3.1-.3-.4 0-.7.3-1l.6-.7c.2-.3.3-.5.2-.8L12 11c-.2-.6-.5-.9-1-1Z" fill="currentColor"/></svg>';
    document.body.appendChild(wa);
  }

  // Mobile nav and active page are handled by the existing main.js header component.
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('.navigation > a').forEach(a => {
    if ((a.getAttribute('href')||'').split('?')[0]===path) a.setAttribute('aria-current','page');
  });
  if (['projects.html','project-detail.html'].includes(path)) $('#projectsTrigger')?.classList.add('is-current');

  // Use lazy IntersectionObserver for inner page reveals.
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{
      if (entry.isIntersecting){ entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold:.08,rootMargin:'0px 0px -25px 0px'});
    $$('.inner-page .reveal').forEach(el=>observer.observe(el));
  } else $$('.inner-page .reveal').forEach(el=>el.classList.add('visible'));

  // Portfolio listing (three illustrative/demo entries)
  const projects = window.SHARANAM_PROJECTS || [];
  const projectCard = p => `<a class="portfolio-card reveal visible" href="project-detail.html?project=${encodeURIComponent(p.id)}" data-category="${p.cat}"><div class="portfolio-card__photo"><img src="${p.image}" loading="lazy" alt="Illustrative architecture photography for ${p.name}"></div><div class="portfolio-card__info"><div><span>${p.category}</span><h3>${p.name}</h3></div><b aria-hidden="true">↗</b></div></a>`;
  const projectGrid = $('#projectGrid');
  const projectFilterButtons = $$('[data-filter]');
  if(projectGrid){
    const params = new URLSearchParams(location.search);
    const initial='all';
    function render(filter){
      const matches=projects.filter(p=>filter==='all'||p.cat===filter);
      projectGrid.innerHTML=matches.map(projectCard).join('') || '<p class="empty-state">No demo projects in this category yet.</p>';
      projectFilterButtons.forEach(b=>{let active=b.dataset.filter===filter;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});
    }
    projectFilterButtons.forEach(b=>b.addEventListener('click',()=>{
      render(b.dataset.filter); history.replaceState(null,'',b.dataset.filter==='all'?'projects.html':'projects.html?category='+encodeURIComponent(b.dataset.filter));
    }));
    render('all');
  }

  // Project gallery and fullscreen lightbox, without a separate gallery listing.
  const detail = $('#projectMainImage');
  let currentPhotos=[],activePhoto=0,returnFocus=null;
  const lightbox=$('#galleryLightbox');
  const fullImg=$('.lightbox__image');
  const fullCaption=$('.lightbox__caption');
  function showImage(n){
    if(!currentPhotos.length) return;
    activePhoto=(n+currentPhotos.length)%currentPhotos.length;
    if(detail) detail.src=currentPhotos[activePhoto];
    if(detail) detail.alt='Project sample image '+(activePhoto+1);
    if($('#projectSlideCount')) $('#projectSlideCount').textContent=(activePhoto+1)+' / '+currentPhotos.length;
    $$('#projectThumbs button').forEach((b,i)=>{b.classList.toggle('is-active',i===activePhoto);b.setAttribute('aria-pressed',String(i===activePhoto));});
    if(lightbox && !lightbox.hidden){fullImg.src=currentPhotos[activePhoto];fullCaption.textContent='Sample photograph '+(activePhoto+1)+' of '+currentPhotos.length+' · Illustrative only';}
  }
  function openGallery(){
    if(!lightbox||!currentPhotos.length)return;
    returnFocus=document.activeElement;
    lightbox.hidden=false;document.body.classList.add('gallery-open');
    fullImg.src=currentPhotos[activePhoto];
    fullCaption.textContent='Sample photograph '+(activePhoto+1)+' of '+currentPhotos.length+' · Illustrative only';
    $('.lightbox__close')?.focus();
  }
  function closeGallery(){if(!lightbox)return;lightbox.hidden=true;document.body.classList.remove('gallery-open');returnFocus?.focus();}
  if(detail && projects.length){
    const params=new URLSearchParams(location.search);
    const p=projects.find(x=>x.id===params.get('project'))||projects[0];
    const index=projects.indexOf(p);
    document.title=p.name+' | Sharanam Civil Consultancy';
    $('#detailTitle').textContent=p.name;
    $('#detailCategory').textContent=p.category.toUpperCase()+' · PROJECT OVERVIEW';
    $('#detailDescription').textContent=p.desc;
    const facts=$('#detailFacts');
    facts.innerHTML=Object.entries(p.info).map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
    currentPhotos=p.gallery||[p.image];
    $('#projectThumbs').innerHTML=currentPhotos.map((src,i)=>`<button type="button" aria-label="Show image ${i+1}" aria-pressed="false"><img src="${src}" alt="" loading="lazy"></button>`).join('');
    $$('#projectThumbs button').forEach((b,i)=>b.addEventListener('click',()=>showImage(i)));
    $('.project-slider__prev')?.addEventListener('click',()=>showImage(activePhoto-1));
    $('.project-slider__next')?.addEventListener('click',()=>showImage(activePhoto+1));
    $('.project-slider__image')?.addEventListener('click',openGallery);
    showImage(0);
    $('#relatedProjects').innerHTML=projects.filter(x=>x.id!==p.id).map(projectCard).join('');
    const prev=projects[(index-1+projects.length)%projects.length];const next=projects[(index+1)%projects.length];
    $('#previousProject').href='project-detail.html?project='+encodeURIComponent(prev.id);
    $('#previousProject').textContent='← '+prev.name;
    $('#nextProject').href='project-detail.html?project='+encodeURIComponent(next.id);
    $('#nextProject').textContent=next.name+' →';
    const h=$('.inner-hero h1');if(h)h.innerHTML=p.name.replace(' — Demo',' <em>— Demo</em>');
    const bg=$('.inner-hero__image');if(bg)bg.style.backgroundImage=`url('${p.image}')`;
    const notice=$('#detailNotice');if(notice)notice.textContent=p.id==='skypark'?'Project information adapted from the provided reference; please verify details before publishing. Photographs are illustrative.':'Demonstration project — name, location, description and photographs must be replaced with verified project data.';
  }
  $('.lightbox__close')?.addEventListener('click',closeGallery);
  $('.lightbox__prev')?.addEventListener('click',()=>showImage(activePhoto-1));
  $('.lightbox__next')?.addEventListener('click',()=>showImage(activePhoto+1));
  lightbox?.addEventListener('click',e=>{if(e.target===lightbox)closeGallery()});
  document.addEventListener('keydown',e=>{
    if(!lightbox||lightbox.hidden)return;
    if(e.key==='Escape')closeGallery();
    if(e.key==='ArrowRight')showImage(activePhoto+1);
    if(e.key==='ArrowLeft')showImage(activePhoto-1);
    if(e.key==='Tab'){
      const buttons=$$('button',lightbox).filter(b=>!b.disabled);
      if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}
      else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}
    }
  });
  let touchX=0;
  lightbox?.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX},{passive:true});
  lightbox?.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>45)showImage(activePhoto+(dx<0?1:-1));},{passive:true});

  // Certificate filters: official files were not supplied, so no fabricated documents.
  $$('[data-cert]').forEach(b=>b.addEventListener('click',()=>{
    $$('[data-cert]').forEach(x=>x.classList.toggle('is-active',x===b));
    $$('.certificate-card').forEach(card=>card.hidden=b.dataset.cert!=='all'&&card.dataset.certcategory!==b.dataset.cert);
  }));

  // Shared blog cards on Home, Blogs and Related Articles.
  const blogs=window.SHARANAM_BLOGS||[];
  const safeText=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const renderBlogCard=(b,index=0)=>`<article class="inner-blog-card modern-blog-card v18-journal-card ${index===0?'v18-journal-card--featured':''}"><a class="modern-blog-card__image" href="blog-Detail.html?post=${encodeURIComponent(b.slug)}"><img src="${safeText(b.image)}" alt="${safeText(b.title)}" loading="lazy"><span class="v18-image-label">${index===0?'FEATURED STORY':'FIELD NOTES / '+String(index+1).padStart(2,'0')}</span><span class="modern-blog-card__image-arrow" aria-hidden="true">↗</span></a><div class="modern-blog-card__content"><div class="modern-blog-card__meta"><span>${safeText(b.category)}</span><time datetime="${safeText(b.date)}">${new Date(b.date+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</time></div><h3><a href="blog-Detail.html?post=${encodeURIComponent(b.slug)}">${safeText(b.title)}</a></h3><p>${safeText(b.briefDescription||b.summary)}</p><a class="modern-blog-card__link" href="blog-Detail.html?post=${encodeURIComponent(b.slug)}">Explore article <span aria-hidden="true">↗</span></a></div></article>`;
  const renderBlogSet=(el,items)=>{if(el)el.innerHTML=items.map((b,i)=>renderBlogCard(b,i)).join('');};
  renderBlogSet($('#homeBlogGrid'),blogs.slice(0,3));
  const blogGrid=$('#blogGrid');
  if(blogGrid) renderBlogSet(blogGrid,blogs); // no category tabs; show every article immediately
  if($('#articleTitle')&&blogs.length){
    const slug=new URLSearchParams(location.search).get('post');const article=blogs.find(b=>b.slug===slug)||blogs[0];
    $('#articleTitle').textContent=article.title;
    $('#articleSummary').textContent=article.summary;
    $('#articleBrief').textContent=article.briefDescription||article.summary;
    $('#articleCategory').textContent=article.category.toUpperCase();
    $('#articleBreadcrumb').textContent=article.title;
    $('#articlePhoto').src=article.image;$('#articlePhoto').alt=article.title;
    const dateEl=$('#articleDate');dateEl.textContent=new Date(article.date+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});dateEl.dateTime=article.date;
    const description=$('#articleDescription');
    description.innerHTML=(article.description||[]).map(p=>`<p>${safeText(p)}</p>`).join('');
    const related=blogs.filter(b=>b.slug!==article.slug).sort((a,b)=>(a.category===article.category?-1:0)-(b.category===article.category?-1:0)).slice(0,3);
    const relatedHost=$('#relatedBlogs');
    if(relatedHost) relatedHost.innerHTML=related.map(b=>`<a class="v25-related-item" href="blog-Detail.html?post=${encodeURIComponent(b.slug)}"><img src="${safeText(b.image)}" alt="${safeText(b.title)}" loading="lazy"><div><h3>${safeText(b.title)}</h3><time datetime="${safeText(b.date)}">${new Date(b.date+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</time></div></a>`).join('');
    document.title=article.title+' | Sharanam Civil Consultancy';
  }

  // Contact form: visual arithmetic CAPTCHA, 10-digit phone validation, honeypot.
  // A client-only arithmetic challenge is NOT security-grade; use server verification for production.
  const form=$('#contactForm');
  let captchaResult=0;
  function newCaptcha(){
    const a=2+Math.floor(Math.random()*8); const b=1+Math.floor(Math.random()*8);
    captchaResult=a+b;
    if($('#captchaQuestion')) $('#captchaQuestion').textContent=`${a} + ${b} = ?`;
    if($('#captchaAnswer')) $('#captchaAnswer').value='';
  }
  if(form){
    newCaptcha();
    $('#captchaRefresh')?.addEventListener('click',newCaptcha);
    const phone=$('input[name="phone"]',form);
    phone?.addEventListener('input',()=>{phone.value=phone.value.replace(/\D/g,'').slice(0,10)});
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const message=$('#formMessage');
      message.textContent='';message.className='form-message';
      if(!form.reportValidity()) return;
      if($('input[name="website"]',form)?.value){message.textContent='Unable to process this enquiry.';return;}
      if(Number($('#captchaAnswer').value)!==captchaResult){
        message.textContent='Verification answer is incorrect. Please try again.';
        message.classList.add('form-message--error');newCaptcha();$('#captchaAnswer').focus();return;
      }
      const data=new FormData(form);
      const endpoint=window.SHARANAM_FORM_ENDPOINT;
      const btn=$('button[type="submit"]',form);
      if(endpoint && /^https:\/\//.test(endpoint)){
        // Configure a real HTTPS endpoint which performs validation, CAPTCHA verification and email delivery.
        btn.disabled=true;message.textContent='Sending your enquiry…';
        try{
          const response=await fetch(endpoint,{method:'POST',body:data,headers:{'Accept':'application/json'}});
          if(!response.ok) throw new Error('Submission was not accepted');
          sessionStorage.setItem('sharanamSubmissionStatus','sent');
          location.href='thank-you.html?status=sent';return;
        }catch(err){message.textContent='Submission failed. Please try again or use email.';message.classList.add('form-message--error');}
        finally{btn.disabled=false;newCaptcha();}
        return;
      }
      const subject=encodeURIComponent('New Project Enquiry — '+data.get('type'));
      const body=encodeURIComponent(`Name: ${data.get('name')}\nEmail: ${data.get('email')}\nPhone: ${data.get('phone')}\nProject: ${data.get('type')}\n\n${data.get('message')}`);
      sessionStorage.setItem('sharanamSubmissionStatus','draft');
      message.classList.add('form-message--info');
      message.innerHTML='Your email application will open. <strong>Please send the email manually.</strong> After sending, <a href="thank-you.html?status=draft">continue to the thank-you page</a>.';
      window.location.href=`mailto:info@sharanamconsultants.com?subject=${subject}&body=${body}`;
    });
  }
  if($('#thanksText')){
    const status=new URLSearchParams(location.search).get('status');
    const saved=sessionStorage.getItem('sharanamSubmissionStatus');
    if(status==='sent'&&saved==='sent') $('#thanksText').textContent='Your enquiry was accepted by the configured form endpoint. Our team will review your message.';
    else $('#thanksText').textContent='Your email draft has been prepared. If your email application opened, please click Send there to complete the enquiry.';
  }
})();


/* ========================================================================
   v9: Services scrollytelling panels
   ======================================================================== */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const groups = [...document.querySelectorAll('.phase-scrolly')];
  if (!groups.length) return;

  groups.forEach(group => {
    const panel = group.querySelector('.phase-panel');
    const count = panel?.querySelector('.phase-panel__count');
    const title = panel?.querySelector('h3');
    const desc = panel?.querySelector('p');
    const progress = panel?.querySelector('.phase-progress span');
    const steps = [...group.querySelectorAll('.phase-step')];
    if (!panel || !steps.length) return;

    const activate = index => {
      const step = steps[index] || steps[0];
      steps.forEach((item, i) => item.classList.toggle('is-active', i === index));
      if (count) count.textContent = String(index + 1).padStart(2, '0');
      if (title) title.textContent = step.dataset.title || step.querySelector('h4')?.textContent || '';
      if (desc) desc.textContent = step.dataset.description || step.querySelector('p')?.textContent || '';
      if (progress) progress.style.width = `${((index + 1) / steps.length) * 100}%`;
    };

    steps.forEach((step, index) => {
      step.addEventListener('mouseenter', () => activate(index));
      step.addEventListener('focusin', () => activate(index));
      step.addEventListener('click', () => activate(index));
    });

    if ('IntersectionObserver' in window && !reduced) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = steps.indexOf(entry.target);
            if (idx > -1) activate(idx);
          }
        });
      }, { threshold: .55, rootMargin: '-8% 0px -25% 0px' });
      steps.forEach(step => observer.observe(step));
    }

    activate(0);
  });
})();

/* v11: During Construction — horizontal journey with natural vertical scrolling
   and mobile snap/swipe. Pre Construction keeps the existing scrollytelling. */
(() => {
  const journey = document.querySelector('[data-execution-journey]');
  if (!journey) return;
  const viewport = journey.querySelector('.execution-viewport');
  const track = journey.querySelector('.execution-track');
  const cards = [...journey.querySelectorAll('.execution-card')];
  const current = journey.querySelector('[data-execution-current]');
  const progress = journey.querySelector('[data-execution-progress]');
  const prev = journey.querySelector('[data-execution-prev]');
  const next = journey.querySelector('[data-execution-next]');
  const compact = window.matchMedia('(max-width: 991px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let ticking = false;
  const select = index => {
    active = Math.min(cards.length - 1, Math.max(0, index));
    cards.forEach((card, i) => card.classList.toggle('is-current', i === active));
    if (current) current.textContent = String(active + 1).padStart(2, '0');
    if (progress) progress.style.width = `${(active + 1) / cards.length * 100}%`;
    if (prev) prev.disabled = active === 0;
    if (next) next.disabled = active === cards.length - 1;
  };
  const maxShift = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  const scrollProgress = () => {
    const rect = journey.getBoundingClientRect();
    const usable = Math.max(1, journey.offsetHeight - window.innerHeight);
    return Math.min(1, Math.max(0, -rect.top / usable));
  };
  const update = () => {
    ticking = false;
    if (compact.matches) {
      const center = viewport.scrollLeft + viewport.clientWidth * .5;
      let nearest = 0, distance = Infinity;
      cards.forEach((card, index) => {
        const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
        if (d < distance) { distance = d; nearest = index; }
      });
      select(nearest);
    } else {
      const p = scrollProgress();
      track.style.transform = `translate3d(${-maxShift() * p}px,0,0)`;
      select(Math.round(p * (cards.length - 1)));
    }
  };
  const requestUpdate = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  const goTo = (index) => {
    index = Math.max(0, Math.min(cards.length - 1, index));
    if (compact.matches) {
      viewport.scrollTo({left: cards[index].offsetLeft - cards[0].offsetLeft, behavior: reduced.matches ? 'instant' : 'smooth'});
    } else {
      const usable = Math.max(0, journey.offsetHeight - window.innerHeight);
      window.scrollTo({top: window.scrollY + journey.getBoundingClientRect().top + usable * (index / Math.max(1, cards.length - 1)), behavior: reduced.matches ? 'instant' : 'smooth'});
    }
    select(index);
  };
  prev?.addEventListener('click', () => goTo(active - 1));
  next?.addEventListener('click', () => goTo(active + 1));
  window.addEventListener('scroll', requestUpdate, {passive: true});
  window.addEventListener('resize', requestUpdate, {passive: true});
  viewport.addEventListener('scroll', requestUpdate, {passive: true});
  if (compact.addEventListener) compact.addEventListener('change', requestUpdate);
  update();
})();

/* v11: Post Construction — accessible single-open accordion. */
(() => {
  const root = document.querySelector('[data-handover-accordion]');
  if (!root) return;
  const items = [...root.querySelectorAll('.handover-item')];
  const open = chosen => {
    items.forEach((item, index) => {
      const isOpen = index === chosen;
      const trigger = item.querySelector('.handover-item__trigger');
      const panel = item.querySelector('.handover-item__panel');
      item.classList.toggle('is-open', isOpen);
      if (trigger) trigger.setAttribute('aria-expanded', String(isOpen));
      if (panel) panel.hidden = !isOpen;
    });
  };
  items.forEach((item, index) => {
    item.querySelector('.handover-item__trigger')?.addEventListener('click', () => {
      open(item.classList.contains('is-open') ? -1 : index);
    });
  });
  open(0);
})();
