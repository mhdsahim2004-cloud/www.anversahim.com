/* Cinematic AI-avatar intro — modular. Auto-plays once per session; replay via #replay-intro. Never blocks the site. */
(() => {
  const root = document.documentElement, el = document.getElementById('intro');
  if (!el) return;
  const $ = s => el.querySelector(s);
  const MODE = 'video'; // 'video' = intro-video.mp4 (falls back to image) | 'image' = ai-presenter.webp | 'avatar' = 3D Three.js character
  const saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
  const TEXT = "Hello! Welcome to my portfolio. I am Anver Sahim, a Web Developer. I create modern, responsive, and creative websites. Thank you for visiting my portfolio. Let's explore my work!";

  /* ---- speech timeline: every character gets a time slot (drives lip-sync + subtitles) ---- */
  const TL = []; let tt = .7;
  for (const c of TEXT) { const d = /[.!]/.test(c) ? .42 : c === ',' ? .22 : c === ' ' ? .04 : .056; TL.push({ c: c.toLowerCase(), a: tt, b: tt + d }); tt += d; }
  const END = tt + .8;
  const SENT = []; { let s = 0; for (let i = 0; i < TEXT.length; i++) if (/[.!]/.test(TEXT[i]) || i === TEXT.length - 1) { SENT.push([s, i]); s = i + 2; } }
  const VIS = { a: [.8, 1], e: [.5, 1.2], i: [.38, 1.25], o: [.7, .6], u: [.5, .55], m: [0, .9], b: [0, .9], p: [0, .9], f: [.12, 1], v: [.12, 1], w: [.35, .55], r: [.3, .8] };
  const mouthAt = t => {
    if (t < TL[0].a || t > END - .6) return [0, 1];
    let i = TL.findIndex(x => t < x.b); if (i < 0) return [0, 1];
    const x = TL[i], v = VIS[x.c] || (/[a-z]/.test(x.c) ? [.28, 1] : [0, 1]), k = (t - x.a) / (x.b - x.a);
    return [v[0] * (.75 + .25 * Math.sin(k * Math.PI)), v[1]];
  };
  const idxAt = t => { const i = TL.findIndex(x => t < x.b); return i < 0 ? TEXT.length - 1 : i; };

  const fx = $('#intro-fx'), ctx = fx.getContext('2d'), av = $('#intro-avatar'), sub = $('.i-sub'), pct = $('.i-pct'), track = $('.i-track');
  const video = $('.i-video'), pres = $('.i-presenter'), presImg = $('.i-presenter img'), wave = $('.i-wave');
  wave.innerHTML = '<span></span>'.repeat(28); const bars = [...wave.children];
  const soundBtn = $('#intro-sound'), skipBtn = $('#intro-skip');
  let running = false, leaving = false, raf = 0, last = 0, tl = 0, bootT = 0, p = 0, sound = false, speaking = false, burst = false;
  let avatar = null, avatarState = 0 /*0 loading,1 ok,2 failed*/, fontsOk = false, loadOk = document.readyState === 'complete';
  let W, H, paths = [], pts = [], px = 0, py = 0, subSent = -1, wordEls = [], prevFocus, failsafe;
  addEventListener('load', () => { loadOk = true; });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { fontsOk = true; });

  const welcome = $('.i-welcome');
  welcome.innerHTML = [...'WELCOME TO MY WORLD'].map((c, i) => `<span style="--k:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  const setInert = on => [...document.body.children].forEach(c => { if (c !== el) c.toggleAttribute('inert', on); });

  /* ---- intro video: tries sound first; browsers usually force muted autoplay, so any tap enables sound ---- */
  const startVideo = done => {
    const fail = () => { el.classList.remove('vid-on'); video.removeAttribute('src'); try { video.load(); } catch (e) {} done(); };
    video.onerror = fail; video.oncanplay = done; video.onended = () => { video.pause(); setTimeout(() => exit(false), 700); }; // intro ends shortly after the video does
    video.preload = 'auto'; video.src = 'intro-video.mp4?v=2'; video.currentTime = 0; video.volume = .85; video.muted = false;
    setTimeout(done, 3000);
    video.play().then(() => { el.classList.add('vid-on'); setSound(true); })
      .catch(() => { video.muted = true; video.play().then(() => el.classList.add('vid-on')).catch(fail); });
  };

  /* ---- lazy-load the Three.js avatar bundle; any failure falls back to the photo ---- */
  const loadAvatar = () => {
    if (MODE !== 'avatar') {
      el.classList.add('img-mode'); const done = () => { if (avatarState === 0) avatarState = 1; };
      if (MODE === 'video' && !saveData) startVideo(done);
      else { presImg.complete ? done() : (presImg.onload = done, presImg.onerror = () => { done(); pres.style.display = 'none'; }); }
      return;
    }
    if (avatar || avatarState === 2) { avatarState = avatar ? 1 : 2; return; }
    const s = document.createElement('script'); s.src = 'avatar.bundle.js';
    s.onload = () => { try { avatar = window.IntroAvatar.create(av); avatar.resize(el.clientWidth, el.clientHeight); av.classList.add('on'); avatarState = 1; } catch (e) { fail(); } };
    s.onerror = fail; document.head.appendChild(s);
    function fail() { avatarState = 2; el.classList.add('nogl'); }
  };

  /* ---- background canvas: particle trails, circuits, exit burst ---- */
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2); W = el.clientWidth; H = el.clientHeight; fx.width = W * dpr; fx.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (avatar) avatar.resize(W, H);
    const g = 40; paths = Array.from({ length: Math.round(W / 80) }, () => {
      let x = Math.round(Math.random() * W / g) * g, y = Math.round(Math.random() * H / g) * g; const pl = [[x, y]]; let h = Math.random() < .5;
      for (let i = 0; i < 6; i++) { const s = (Math.random() < .5 ? -1 : 1) * g * (1 + Math.floor(Math.random() * 2)); h ? x += s : y += s; pl.push([x, y]); h = !h; }
      return { pl, t: Math.random(), s: .003 + Math.random() * .004 };
    });
    pts = Array.from({ length: Math.min(80, Math.round(W / 16)) }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .8, vy: -Math.random() * .9 - .1, c: ['76,141,255', '53,214,214', '124,92,252'][Math.floor(Math.random() * 3)] }));
  };
  const along = (pl, t) => { const n = pl.length - 1, f = t * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return [pl[i][0] + (pl[i + 1][0] - pl[i][0]) * k, pl[i][1] + (pl[i + 1][1] - pl[i][1]) * k]; };
  const paint = () => {
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = `rgba(0,0,0,${burst ? .12 : .22})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    paths.forEach(o => { ctx.strokeStyle = 'rgba(53,214,214,.07)'; ctx.beginPath(); o.pl.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); o.t = (o.t + o.s) % 1; const [x, y] = along(o.pl, o.t); ctx.fillStyle = 'rgba(120,230,255,.85)'; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); });
    pts.forEach(q => {
      q.x += q.vx; q.y += q.vy; if (burst) { q.vx *= 1.05; q.vy *= 1.05; } else { if (q.y < -5) { q.y = H + 5; q.x = Math.random() * W; } if (q.x < 0 || q.x > W) q.vx *= -1; }
      ctx.fillStyle = `rgba(${q.c},.9)`; ctx.beginPath(); ctx.arc(q.x, q.y, burst ? 2.4 : 1.6, 0, 6.283); ctx.fill();
    });
  };

  /* ---- subtitles: sentence shown with words lighting up in sync ---- */
  const showSub = t => {
    let s = SENT.findIndex(([a, b]) => t >= TL[a].a - .1 && t <= TL[b].b + .5);
    if (s !== subSent) {
      subSent = s; wordEls = []; sub.textContent = '';
      if (s >= 0) { const [a, b] = SENT[s]; let i = a; TEXT.slice(a, b + 1).split(' ').forEach(w => { const sp = document.createElement('span'); sp.textContent = w + ' '; sp.dataset.t = TL[i].a; i += w.length + 1; sub.appendChild(sp); wordEls.push(sp); }); }
    }
    wordEls.forEach(w => w.classList.toggle('on', t >= +w.dataset.t));
  };

  /* ---- real-readiness progress ---- */
  const readiness = now => (now - bootT > 6000) ? 100 : 10 + 25 * fontsOk + 30 * (avatarState !== 0) + 35 * loadOk;

  const loop = now => {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; tl += dt;
    const target = readiness(now); p += (target - p) * .08; if (target === 100 && p > 99.4) p = 100;
    pct.textContent = Math.floor(p) + '%'; track.style.setProperty('--p', p / 100); el.setAttribute('data-p', Math.floor(p));
    if (p === 100 && !el.classList.contains('ready')) el.classList.add('ready');
    showSub(tl);
    if (!avatar) { const [o] = mouthAt(tl); pres.style.setProperty('--v', o.toFixed(2)); bars.forEach((b, i) => { b.style.transform = `scaleY(${(.12 + o * (.35 + .65 * Math.abs(Math.sin(now / 85 + i * .75)))).toFixed(2)})`; }); }
    if (avatar) { const [o, w] = mouthAt(tl); try { avatar.update(now / 1000 - bootT / 1000, dt, o, w, px, py); } catch (e) { avatar = null; avatarState = 2; el.classList.add('nogl'); av.classList.remove('on'); } }
    if (tl > END && !speaking && p === 100 && !leaving) { exit(false); }
    paint(); raf = requestAnimationFrame(loop);
  };

  /* ---- optional narration (browsers block auto-speech, so this starts on the Sound button) ---- */
  const speak = on => {
    const ss = window.speechSynthesis; if (!ss) return;
    ss.cancel(); speaking = false; if (!on || el.classList.contains('vid-on')) return; // the video carries its own voice-over
    const from = tl > TL[0].a ? idxAt(tl) : 0, u = new SpeechSynthesisUtterance(TEXT.slice(from)); u.lang = 'en-US'; u.rate = 1; u.pitch = .9;
    const vs = ss.getVoices().filter(v => /^en/i.test(v.lang)); u.voice = vs.find(v => /google us|david|daniel|guy|alex|mark/i.test(v.name)) || vs[0] || null;
    u.onboundary = e => { tl = TL[Math.min(TL.length - 1, from + e.charIndex)].a; };
    u.onend = u.onerror = () => { speaking = false; tl = Math.max(tl, END); };
    speaking = true; ss.speak(u);
  };
  const setSound = on => {
    sound = on; soundBtn.setAttribute('aria-pressed', on); soundBtn.textContent = on ? 'Sound: On' : 'Sound: Off'; soundBtn.classList.remove('hint');
    if (MODE === 'video' && el.classList.contains('vid-on') && !video.ended) { video.muted = !on; if (on && video.paused) video.play().catch(() => {}); }
    speak(on);
  };
  soundBtn.addEventListener('click', () => setSound(!sound));
  el.addEventListener('pointerdown', e => { if (!sound && !e.target.closest('.i-ctrl')) setSound(true); });
  el.addEventListener('pointermove', e => { px = (e.clientX / innerWidth - .5) * 2; py = (e.clientY / innerHeight - .5) * 2; }, { passive: true });

  function run(replay) {
    if (running) return; running = true; leaving = burst = false; sound = speaking = false; tl = 0; p = 0; subSent = -1;
    if (replay) root.classList.add('intro-replay');
    el.classList.remove('ready', 'leaving'); sub.textContent = ''; soundBtn.setAttribute('aria-pressed', 'false'); soundBtn.textContent = 'Tap for sound';
    soundBtn.hidden = !window.speechSynthesis && MODE !== 'video'; soundBtn.classList.add('hint');
    prevFocus = document.activeElement; root.style.overflow = 'hidden'; setInert(true); el.setAttribute('aria-hidden', 'false');
    size(); loadAvatar(); bootT = last = performance.now(); raf = requestAnimationFrame(loop); skipBtn.focus({ preventScroll: true });
    failsafe = setTimeout(() => exit(true), 30000);
  }
  function exit(fast) {
    if (!running || leaving) return; leaving = true; window.speechSynthesis && speechSynthesis.cancel(); try { video.pause(); } catch (e) {}
    pts.forEach(q => { const a = Math.atan2(q.y - H / 2, q.x - W / 2), s = 3 + Math.random() * 5; q.vx = Math.cos(a) * s; q.vy = Math.sin(a) * s; }); burst = true;
    el.classList.add('leaving'); clearTimeout(failsafe);
    setTimeout(() => {
      running = false; cancelAnimationFrame(raf); el.classList.remove('vid-on'); el.classList.remove('leaving'); el.setAttribute('aria-hidden', 'true'); setInert(false);
      root.classList.remove('intro-active', 'intro-replay'); root.style.overflow = '';
      try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
      dispatchEvent(new Event('introdone')); if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    }, fast ? 450 : 1300);
  }
  skipBtn.addEventListener('click', () => exit(true));
  addEventListener('keydown', e => { if (e.key === 'Escape' && running) exit(true); });
  addEventListener('resize', () => running && size());
  document.getElementById('replay-intro')?.addEventListener('click', () => run(true));
  if (root.classList.contains('intro-active')) run(false);
})();
