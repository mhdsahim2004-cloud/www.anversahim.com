/* Cinematic intro — modular. Plays once per session; replay via #replay-intro. Never blocks the site. */
(() => {
  const root = document.documentElement, el = document.getElementById('intro');
  if (!el) return;
  const $ = s => el.querySelector(s);
  const VIDEO = ['intro/intro-presenter.webm', 'intro/intro-presenter.mp4']; // replace with your finished video
  const CUES = [[0, 'Hello, and welcome to my portfolio!'], [3, "I'm Anver Sahim, a passionate Web Developer."],
    [6, 'I create modern, responsive, and interactive websites with beautiful user experiences.'], [10.5, "Explore my work and let's build something amazing together!"]];
  const END = 14.5, SCALE = 0.7; // SCALE shortens the no-video timeline
  const video = $('video'), frame = $('.i-frame'), sub = $('.i-sub'), pct = $('.i-pct'), track = $('.i-track'), cv = $('canvas'), ctx = cv.getContext('2d');
  const soundBtn = $('#intro-sound'), skipBtn = $('#intro-skip');
  const saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
  let running = false, leaving = false, hasVideo = false, videoGaveUp = false, loadDone = document.readyState === 'complete';
  let t0, p = 0, raf = 0, cue = -1, sound = false, W, H, paths = [], pts = [], prevFocus, failsafe;
  addEventListener('load', () => { loadDone = true; });

  const welcome = $('.i-welcome');
  welcome.innerHTML = [...'WELCOME TO MY WORLD'].map((c, i) => `<span style="--k:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  const setInert = on => [...document.body.children].forEach(c => { if (c !== el) c.toggleAttribute('inert', on); });

  /* ---- canvas: particle trails + animated circuits ---- */
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2); W = el.clientWidth; H = el.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = 40; paths = Array.from({ length: Math.round(W / 70) }, () => {
      let x = Math.round(Math.random() * W / g) * g, y = Math.round(Math.random() * H / g) * g; const pl = [[x, y]]; let h = Math.random() < .5;
      for (let i = 0; i < 6; i++) { const s = (Math.random() < .5 ? -1 : 1) * g * (1 + Math.floor(Math.random() * 2)); h ? x += s : y += s; pl.push([x, y]); h = !h; }
      return { pl, t: Math.random(), s: .003 + Math.random() * .004 };
    });
    pts = Array.from({ length: Math.min(70, Math.round(W / 18)) }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .8, vy: -Math.random() * .9 - .1, c: ['76,141,255', '53,214,214', '124,92,252'][Math.floor(Math.random() * 3)] }));
  };
  const along = (pl, t) => { const n = pl.length - 1, f = t * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return [pl[i][0] + (pl[i + 1][0] - pl[i][0]) * k, pl[i][1] + (pl[i + 1][1] - pl[i][1]) * k]; };
  const paint = () => {
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1; paths.forEach(o => {
      ctx.strokeStyle = 'rgba(53,214,214,.07)'; ctx.beginPath(); o.pl.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      o.t = (o.t + o.s) % 1; const [x, y] = along(o.pl, o.t); ctx.fillStyle = 'rgba(120,230,255,.85)'; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    });
    pts.forEach(q => { q.x += q.vx; q.y += q.vy; if (q.y < -5) { q.y = H + 5; q.x = Math.random() * W; } if (q.x < 0 || q.x > W) q.vx *= -1; ctx.fillStyle = `rgba(${q.c},.9)`; ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, 6.283); ctx.fill(); });
  };

  /* ---- video (real talking-presenter file) with graceful fallback ---- */
  const initVideo = () => {
    hasVideo = false; videoGaveUp = !!saveData; frame.classList.remove('hasvideo'); video.classList.remove('on');
    if (videoGaveUp) return;
    video.innerHTML = ''; video.muted = true;
    VIDEO.forEach(src => { const s = document.createElement('source'); s.src = src; s.type = src.endsWith('webm') ? 'video/webm' : 'video/mp4'; video.appendChild(s); });
    video.lastChild.addEventListener('error', () => { videoGaveUp = true; });
    video.preload = 'auto'; video.load();
    video.addEventListener('loadeddata', onVideo, { once: true });
    setTimeout(() => { if (!hasVideo) { videoGaveUp = true; video.pause(); } }, 2500);
  };
  const onVideo = () => {
    if (videoGaveUp || !running) return;
    video.currentTime = 0;
    video.play().then(() => { hasVideo = true; t0 = performance.now(); cue = -1; frame.classList.add('hasvideo'); video.classList.add('on'); if (sound) video.muted = false; }).catch(() => { videoGaveUp = true; });
  };
  video.addEventListener('ended', () => exit(false));

  /* ---- main loop ---- */
  const loop = () => {
    if (!running) return;
    const now = performance.now(), elapsed = now - t0;
    const clock = hasVideo ? video.currentTime : elapsed / 1000 / SCALE;
    const ready = loadDone || now - bootT > 4000, target = ready ? 100 : 92;
    p += (target - p) * .07; if (target === 100 && p > 99.4) p = 100;
    pct.textContent = Math.floor(p) + '%'; track.style.setProperty('--p', p / 100);
    if (p === 100 && !el.classList.contains('ready')) el.classList.add('ready');
    let c = -1; CUES.forEach(([t], i) => { if (clock >= t) c = i; });
    if (c !== cue) { cue = c; sub.textContent = c >= 0 ? CUES[c][1] : ''; }
    if (!hasVideo && clock > END && el.classList.contains('ready')) return exit(false);
    paint(); raf = requestAnimationFrame(loop);
  };
  let bootT;
  const speak = on => {
    if (!('speechSynthesis' in window) || hasVideo) return;
    speechSynthesis.cancel(); if (!on) return;
    const u = new SpeechSynthesisUtterance(CUES.map(c => c[1]).join(' ')); u.lang = 'en-US'; u.rate = 1.05; speechSynthesis.speak(u);
  };
  soundBtn.addEventListener('click', () => {
    sound = !sound; soundBtn.setAttribute('aria-pressed', sound); soundBtn.textContent = sound ? 'Sound: On' : 'Sound: Off';
    if (hasVideo) { video.muted = !sound; video.play().catch(() => {}); } else speak(sound);
  });

  function run(replay) {
    if (running) return; running = leaving = true; leaving = false; sound = false; cue = -1; p = 0;
    if (replay) root.classList.add('intro-replay');
    el.classList.remove('ready', 'leaving'); sub.textContent = ''; soundBtn.setAttribute('aria-pressed', 'false'); soundBtn.textContent = 'Sound: Off';
    soundBtn.hidden = saveData && !('speechSynthesis' in window);
    prevFocus = document.activeElement; root.style.overflow = 'hidden'; setInert(true); el.setAttribute('aria-hidden', 'false');
    size(); initVideo(); t0 = bootT = performance.now(); raf = requestAnimationFrame(loop); skipBtn.focus({ preventScroll: true });
    failsafe = setTimeout(() => exit(true), 25000);
  }
  function exit(fast) {
    if (!running || leaving) return; leaving = true; window.speechSynthesis && speechSynthesis.cancel();
    el.classList.add('leaving'); clearTimeout(failsafe);
    setTimeout(() => {
      running = false; cancelAnimationFrame(raf); video.pause(); el.classList.remove('leaving'); el.setAttribute('aria-hidden', 'true'); setInert(false);
      root.classList.remove('intro-active', 'intro-replay'); root.style.overflow = '';
      try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
      dispatchEvent(new Event('introdone')); if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    }, fast ? 450 : 1200);
  }
  skipBtn.addEventListener('click', () => exit(true));
  addEventListener('keydown', e => { if (e.key === 'Escape' && running) exit(true); });
  addEventListener('resize', () => running && size());
  document.getElementById('replay-intro')?.addEventListener('click', () => run(true));
  if (root.classList.contains('intro-active')) run(false);
})();
