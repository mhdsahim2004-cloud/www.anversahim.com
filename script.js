document.addEventListener('DOMContentLoaded', () => {
  const d = document, root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Hero headline: character-by-character ---------- */
  const h1 = $('h1.name');
  if (h1 && !reduce) {
    const txt = h1.textContent.trim(); let ci = 0;
    h1.innerHTML = `<span class="sr-only">${txt}</span><span aria-hidden="true">` +
      txt.split(' ').map(w => `<span class="word">${[...w].map(c => `<span class="char" style="--ci:${ci++}">${c}</span>`).join('')}</span>`).join(' ') + '</span>';
    h1.classList.add('split');
  }

  /* ---------- Typing (type → hold → delete → next) ---------- */
  const typingEl = $('.typing');
  const startTyping = () => {
    if (!typingEl || reduce) return;
    const roles = ['Website Developer', 'WordPress Specialist', 'UI/UX Developer'];
    let r = 0, c = 0, del = false;
    typingEl.textContent = '';
    const tick = () => {
      const word = roles[r];
      c += del ? -1 : 1;
      typingEl.textContent = word.slice(0, c);
      let wait = del ? 35 : 75;
      if (!del && c === word.length) { del = true; wait = 1900; }
      else if (del && c === 0) { del = false; r = (r + 1) % roles.length; wait = 350; }
      setTimeout(tick, wait);
    };
    setTimeout(tick, 400);
  };

  /* ---------- Page loader ---------- */
  const t0 = performance.now();
  const finish = () => {
    if (root.classList.contains('loaded')) return;
    root.classList.add('loaded'); root.classList.remove('loading');
    startTyping();
    setTimeout(() => $('#loader')?.remove(), 900);
  };
  const ready = () => setTimeout(finish, Math.max(0, (reduce ? 0 : 1100) - (performance.now() - t0)));
  d.readyState === 'complete' ? ready() : addEventListener('load', ready);
  setTimeout(finish, 3500);

  /* ---------- Navbar, progress, back-to-top (one rAF-throttled passive scroll handler) ---------- */
  const navbar = $('.navbar'), bar = $('#scroll-progress'), toTop = $('#to-top');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY, max = Math.max(1, root.scrollHeight - innerHeight), p = clamp(y / max, 0, 1);
    navbar.classList.toggle('scrolled', y > 30);
    bar.style.transform = `scaleX(${p})`;
    toTop.style.setProperty('--p', p.toFixed(3));
    toTop.classList.toggle('show', y > 600);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- Mobile menu ---------- */
  const menuToggle = $('.menu-toggle'), navLinks = $('.nav-links'), menuIcon = $('i', menuToggle);
  $$('li', navLinks).forEach((li, i) => li.style.setProperty('--n', i));
  const setMenu = open => {
    navLinks.classList.toggle('active', open);
    menuIcon.className = open ? 'fas fa-times' : 'fas fa-bars';
    menuToggle.setAttribute('aria-expanded', open);
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.style.overflow = open ? 'hidden' : '';
  };
  menuToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('active')));
  $$('a', navLinks).forEach(a => a.addEventListener('click', () => setMenu(false)));
  d.addEventListener('keydown', e => { if (e.key === 'Escape' && navLinks.classList.contains('active')) { setMenu(false); menuToggle.focus(); } });
  addEventListener('resize', () => { if (innerWidth > 700) setMenu(false); });

  /* ---------- Active nav link (IntersectionObserver) ---------- */
  const anchors = $$('.nav-links a');
  const secIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) anchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach(s => secIO.observe(s));

  /* ---------- FAQ accordion ---------- */
  const faqs = $$('.faq-item');
  faqs.forEach((item, i) => {
    const q = $('.faq-question', item), a = $('.faq-answer', item);
    a.id = `faq-a${i}`; q.setAttribute('aria-controls', a.id);
    q.addEventListener('click', () => {
      const was = item.classList.contains('open');
      faqs.forEach(o => { o.classList.remove('open'); $('.faq-question', o).setAttribute('aria-expanded', 'false'); });
      if (!was) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------- Scroll reveal (fade-up / slide / blur) with stagger, then cleanup ---------- */
  const groups = [['.section-header', 'blur'], ['.about-text', 'left'], ['.about-visual', 'right'], ['.stat', 'up'],
    ['.skill-card', 'up'], ['.service-card', 'up'], ['.project-card', 'up'], ['.testimonial-card', 'up'],
    ['.faq-item', 'up'], ['.contact-content', 'blur']];
  const revealEls = [];
  groups.forEach(([sel, kind]) => $$(sel).forEach(el => { el.classList.add('reveal'); el.dataset.reveal = kind; revealEls.push(el); }));
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, par = el.parentElement;
      const cols = getComputedStyle(par).gridTemplateColumns.split(' ').length || 1;
      const delay = (Array.prototype.indexOf.call(par.children, el) % cols) * 90;
      el.style.setProperty('--d', delay + 'ms');
      el.classList.add('in'); io.unobserve(el);
      setTimeout(() => { el.classList.remove('reveal'); el.style.removeProperty('--d'); }, 1100 + delay);
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else revealEls.forEach(el => { el.classList.remove('reveal'); el.classList.add('in'); });

  /* ---------- Animated counters (only real numbers: 50+, 100%) ---------- */
  $$('.stat h3').forEach(h => {
    const m = h.textContent.trim().match(/^(\d+)(\D*)$/);
    if (!m || reduce) return;
    const end = +m[1], suf = m[2];
    h.style.minWidth = h.offsetWidth + 'px'; h.setAttribute('aria-label', h.textContent.trim());
    h.textContent = '0' + suf;
    const cio = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; cio.disconnect();
      const s = performance.now(), dur = 1600;
      const step = t => { const k = clamp((t - s) / dur, 0, 1); h.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    cio.observe(h);
  });

  /* ---------- Hero particles (pauses off-screen / hidden tab) ---------- */
  const cv = $('#particles'), hero = $('.hero');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d'); let W, H, pts = [], run = false, vis = true, mx = -999, my = -999;
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2); W = hero.clientWidth; H = hero.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = Array.from({ length: Math.min(55, Math.round(W / 24)) }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 1.4 + .6 }));
    };
    const draw = () => {
      if (!run) return; ctx.clearRect(0, 0, W, H);
      pts.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
        const dx = p.x - mx, dy = p.y - my, dist = Math.hypot(dx, dy);
        if (dist < 120) { p.x += dx / dist * 1.2; p.y += dy / dist * 1.2; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fillStyle = 'rgba(160,190,255,.7)'; ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], l = Math.hypot(p.x - q.x, p.y - q.y);
          if (l < 120) { ctx.strokeStyle = `rgba(124,140,255,${.18 * (1 - l / 120)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        }
      });
      requestAnimationFrame(draw);
    };
    const sync = () => { const go = vis && !d.hidden; if (go && !run) { run = true; draw(); } else if (!go) run = false; };
    size(); addEventListener('resize', size);
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; sync(); }).observe(hero);
    d.addEventListener('visibilitychange', sync);
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
    hero.addEventListener('pointerleave', () => { mx = my = -999; });
  }

  /* ---------- Pointer effects (mouse only): hero tilt + parallax, card tilt/spotlight, magnetic buttons, cursor glow ---------- */
  if (fine && !reduce) {
    const stage = $('.avatar-stage'), bg = $('.hero-bg'), aboutFrame = $('.about-photo-frame');
    let raf = 0, ev = null;
    const heroMove = e => {
      const r = stage.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      const nx = clamp((e.clientX - (r.left + r.width / 2)) / (hr.width / 2), -1, 1), ny = clamp((e.clientY - (r.top + r.height / 2)) / (hr.height / 2), -1, 1);
      stage.style.setProperty('--rx', (-ny * 10).toFixed(2) + 'deg'); stage.style.setProperty('--ry', (nx * 12).toFixed(2) + 'deg');
      stage.style.setProperty('--gx', (50 + nx * 40) + '%'); stage.style.setProperty('--gy', (35 + ny * 40) + '%');
      bg.style.setProperty('--px', nx.toFixed(3)); bg.style.setProperty('--py', ny.toFixed(3));
      stage.classList.add('tilting');
    };
    const heroLeave = () => { ['--rx', '--ry'].forEach(v => stage.style.removeProperty(v)); stage.classList.remove('tilting'); bg.style.setProperty('--px', 0); bg.style.setProperty('--py', 0); };
    hero.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') heroMove(e); }, { passive: true });
    hero.addEventListener('pointerleave', heroLeave);

    const tiltEls = [...$$('.service-card'), aboutFrame].filter(Boolean);
    const spotEls = $$('.skill-card,.service-card,.project-card,.stat');
    d.addEventListener('pointermove', e => {
      ev = e; if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; const t = ev.target.closest ? ev.target : null;
        const glow = $('.cursor-glow'); glow.classList.add('on'); glow.style.transform = `translate(${ev.clientX}px,${ev.clientY}px)`;
        const sp = t && t.closest('.skill-card,.service-card,.project-card,.stat');
        if (sp) { const r = sp.getBoundingClientRect(); sp.style.setProperty('--sx', ev.clientX - r.left + 'px'); sp.style.setProperty('--sy', ev.clientY - r.top + 'px'); }
        const tl = t && t.closest('.service-card');
        if (tl) { const r = tl.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width - .5, py = (ev.clientY - r.top) / r.height - .5; tl.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg'); tl.style.setProperty('--rx', (-py * 12).toFixed(2) + 'deg'); }
        if (aboutFrame && t && t.closest('.about-visual')) { const r = aboutFrame.getBoundingClientRect(), px = clamp((ev.clientX - r.left) / r.width - .5, -1, 1), py = clamp((ev.clientY - r.top) / r.height - .5, -1, 1); aboutFrame.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg'); aboutFrame.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg'); }
        const mg = t && t.closest('.btn');
        $$('.btn').forEach(b => { if (b !== mg) { b.style.removeProperty('--mx'); b.style.removeProperty('--my'); } });
        if (mg) { const r = mg.getBoundingClientRect(); mg.style.setProperty('--mx', ((ev.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px'); mg.style.setProperty('--my', ((ev.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px'); }
      });
    }, { passive: true });
    tiltEls.forEach(el => el.addEventListener('pointerleave', () => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); }));
    d.addEventListener('pointerleave', () => $('.cursor-glow').classList.remove('on'));
  }

  /* ---------- Button click ripple ---------- */
  $$('.btn').forEach(b => b.addEventListener('pointerdown', e => {
    if (reduce) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), el = d.createElement('span');
    el.className = 'ripple'; el.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(el); setTimeout(() => el.remove(), 650);
  }));
});
