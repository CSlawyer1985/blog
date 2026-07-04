/* ═══════════════════════════════════════════
   陈石 · 法与AI — Main JS
   GSAP animations + Scroll spy + i18n + terminal
   GSAP loaded async — page works immediately without it
   ═══════════════════════════════════════════ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  // Show content immediately — no dependency on GSAP
  document.body.classList.add('is-ready');

  /* ── ① Language Toggle ── */
  initLanguageToggle();

  /* ── ② Scroll Spy ── */
  initScrollSpy();

  /* ── ③ Speak section dark theme ── */
  initSpeakTheme();

  /* ── ④ Smooth scroll ── */
  initSmoothScroll();

  /* ── ⑤ Terminal type effect ── */
  initTerminal();

  /* ── ⑥ Writing list ── */
  initWritingList();

  /* ── ⑦ Mobile nav ── */
  initMobileNav();

  /* ── ⑧ GSAP: wait for async load, fallback immediately ── */
  waitForGSAP(() => {
    if (typeof gsap !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      if (!reduceMotion) initGSAPAnimations();
    }
  });
});

/* ─── Wait for async GSAP with timeout ─── */
function waitForGSAP(cb) {
  if (typeof gsap !== 'undefined') { cb(); return; }
  let attempts = 0;
  const maxAttempts = 30; // 3 seconds max wait
  const check = setInterval(() => {
    attempts++;
    if (typeof gsap !== 'undefined') {
      clearInterval(check);
      cb();
    } else if (attempts >= maxAttempts) {
      clearInterval(check);
      // GSAP didn't load — page works fine without animations
    }
  }, 100);
}

/* ─── Language Toggle ─── */
function initLanguageToggle() {
  const buttons = document.querySelectorAll('.nav__lang[data-lang]');
  const html = document.documentElement;

  // Restore saved language
  const saved = localStorage.getItem('blog-lang') || 'zh';
  setLanguage(saved);

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
      localStorage.setItem('blog-lang', lang);
    });
  });

  function setLanguage(lang) {
    html.setAttribute('data-lang', lang);
    buttons.forEach(b => {
      b.classList.toggle('is-active', b.dataset.lang === lang);
    });
  }
}

/* ─── GSAP Animations ─── */
function initGSAPAnimations() {
  // Hero entrance
  const heroItems = gsap.utils.toArray('#hero [data-reveal]');
  gsap.set(heroItems, { opacity: 0, y: 20 });
  gsap.to(heroItems, {
    opacity: 1, y: 0, duration: 1, ease: 'power3.out',
    stagger: 0.14, delay: 0.25,
  });

  // Section reveals on scroll
  ['#about', '#writing', '#speak', '#build', '#contact'].forEach((sel) => {
    const section = document.querySelector(sel);
    const items = gsap.utils.toArray(sel + ' [data-reveal]');
    if (!section || !items.length) return;
    gsap.set(items, { opacity: 0, y: 30 });
    gsap.to(items, {
      opacity: 1, y: 0, duration: 1.4, ease: 'power3.out', stagger: 0.2,
      scrollTrigger: { trigger: section, start: 'top 76%' },
    });
  });

  // Build terminal progress animation
  const buildSection = document.querySelector('#build');
  if (buildSection) {
    const bar = buildSection.querySelector('[data-progress-bar]');
    const num = buildSection.querySelector('[data-progress-num]');
    const label = buildSection.querySelector('[data-compile-label]');
    if (bar && num) {
      gsap.to({ val: 0 }, {
        val: 100, duration: 3, ease: 'power2.inOut',
        scrollTrigger: { trigger: buildSection, start: 'top 60%' },
        onUpdate: function() {
          const v = Math.round(this.targets()[0].val);
          bar.style.width = v + '%';
          num.textContent = v + '%';
          if (label) {
            if (v < 30) label.textContent = 'booting...';
            else if (v < 60) label.textContent = 'compiling...';
            else if (v < 90) label.textContent = 'building...';
            else label.textContent = 'ready';
          }
        }
      });
    }
  }
}

/* ─── Scroll Spy ─── */
function initScrollSpy() {
  const navMap = {
    hero: null, about: 'ABOUT', writing: 'WRITING',
    speak: 'SPEAK', build: 'BUILD', contact: 'CONTACT'
  };
  const links = [...document.querySelectorAll('.nav__links a')];

  const setActive = (label) => {
    links.forEach(a => {
      a.classList.toggle('is-active', !!label && a.textContent.trim() === label);
    });
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(navMap[e.target.id]);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    ['hero', 'about', 'writing', 'speak', 'build', 'contact'].forEach(id => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
}

/* ─── Speak Dark Theme ─── */
function initSpeakTheme() {
  const speakEl = document.getElementById('speak');
  if (!speakEl) return;

  const NAV_LINE = 36;
  let raf = 0;

  const syncDark = () => {
    raf = 0;
    const r = speakEl.getBoundingClientRect();
    const overDark = r.top <= NAV_LINE && r.bottom >= NAV_LINE;
    document.body.classList.toggle('theme-speak', overDark);
  };

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(syncDark); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  syncDark();
}

/* ─── Smooth Scroll ─── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  });
}

/* ─── Terminal Type Effect ─── */
function initTerminal() {
  const pre = document.querySelector('[data-typed]');
  if (!pre) return;

  const fullText = pre.textContent || '';
  pre.textContent = '';

  let i = 0;
  let timer;

  const type = () => {
    if (i < fullText.length) {
      pre.textContent += fullText.charAt(i);
      i++;
      timer = setTimeout(type, 15 + Math.random() * 25);
    }
  };

  // Start typing when Build section is visible
  const buildSection = document.getElementById('build');
  if (buildSection && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        type();
        io.unobserve(buildSection);
      }
    }, { threshold: 0.3 });
    io.observe(buildSection);
  } else {
    // Fallback: start typing after a delay
    timer = setTimeout(type, 1500);
  }
}

/* ─── Writing List + Feature Card ─── */
function initWritingList() {
  var list = document.getElementById('writing-list');
  var feat = document.getElementById('feat-article');
  if (!list && !feat) return;

  fetch('data/articles.json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var articles = Array.isArray(data) ? data : (data.articles || []);
      if (articles.length === 0) return;
      // Feature card: always shows latest article (index 0)
      if (feat) updateFeatureCard(articles[0]);
      // Writing list: articles 1-3
      if (list) renderWritingList(list, articles);
    })
    .catch(function() {
      if (feat) updateFeatureCard({slug:'2026-07-02-高权限-Agent-上线前-先写三张清单',title:'高权限 Agent 上线前，先写三张清单',category_label:'AI+法律',date:'2026-07-02',read_time:6,excerpt:''});
      if (list) renderWritingList(list, getFallbackArticles());
    });
}

function updateFeatureCard(a) {
  var feat = document.getElementById('feat-article');
  if (!feat) return;
  feat.href = 'articles/' + a.slug + '/';

  var img = feat.querySelector('.feat__img');
  if (img) {
    img.src = 'articles/' + a.slug + '/cover.png';
    img.onerror = function() {
      if (img.parentElement) img.parentElement.style.background = 'linear-gradient(135deg,#2c3e50,#8b2500)';
      img.style.display = 'none';
    };
  }

  var titleEl = document.getElementById('feat-title');
  var dekEl = document.getElementById('feat-dek');
  var tagEl = document.getElementById('feat-tag');
  var dateEl = document.getElementById('feat-date');
  var readtimeEl = document.getElementById('feat-readtime');

  if (titleEl) titleEl.innerHTML = escapeHTML(a.title);
  if (dekEl) dekEl.textContent = a.excerpt || '';
  if (tagEl) tagEl.textContent = a.category_label || '';
  if (dateEl) dateEl.textContent = (a.date || '').replace(/-/g, '.');
  if (readtimeEl) readtimeEl.textContent = (a.read_time || '5') + ' 分钟阅读';
}

function renderWritingList(list, articles) {
  var listArticles = articles.slice(1, 4);
  if (listArticles.length === 0) return;

  list.innerHTML = listArticles.map(function(a, i) {
    var idx = String(i + 2).padStart(2, '0');
    var thumb = a.has_cover
      ? '<span class="wpost__thumb"><img src="articles/' + a.slug + '/cover.png" alt="" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></span>'
      : '';
    return '<a class="wpost" href="articles/' + a.slug + '/">' +
      '<span class="wpost__idx">' + idx + '</span>' +
      '<div class="wpost__body">' +
        '<h3 class="wpost__title">' + escapeHTML(a.title) + '</h3>' +
        '<div class="wpost__meta">' +
          '<span class="wpost__tag">' + (a.category_label || '') + '</span>' +
          '<span class="dotsep"></span>' +
          '<span>' + (a.date || '') + '</span>' +
          '<span class="wpost__views">' +
            '<svg class="viewico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>' +
            (a.read_time || '5') + ' 分钟阅读' +
          '</span>' +
        '</div>' +
      '</div>' +
      thumb +
    '</a>';
  }).join('');
}

function getFallbackArticles() {
  return [
    { slug: '2026-07-01-从防止国有资产流失到国有资本经营判断规则-国资监管制度演进的反向后果', title: '从防止国有资产流失到国有资本经营判断规则', category_label: '法律实务', date: '2026.07.01', read_time: '18', has_cover: false },
    { slug: '2026-07-01-读懂-DSpark-一个律师外行眼里的-DeepSeek-推理新论文', title: '读懂 DSpark：一个律师外行眼里的 DeepSeek 推理新论文', category_label: 'AI+法律', date: '2026.07.01', read_time: '10', has_cover: true },
    { slug: '2026-07-01-月入百万的AI中转站-钱到底从哪来', title: '月入百万的AI中转站，钱到底从哪来？', category_label: 'AI+法律', date: '2026.07.01', read_time: '7', has_cover: true },
  ];
}

function escapeHTML(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ─── Mobile Nav ─── */
function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.querySelector('.nav__links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.classList.toggle('is-active', isOpen);
  });

  // Close nav on link click (mobile)
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-active');
    });
  });
}

/* ─── Mobile nav styles injected dynamically ─── */
(function() {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 860px) {
      .nav__toggle { display: flex; }
      .nav__links:not(.is-open) { display: none; }
      .nav__links.is-open {
        display: flex; flex-direction: column;
        position: absolute; top: var(--nav-h); left: 0; right: 0;
        background: rgba(244,239,230,.95);
        backdrop-filter: blur(12px);
        padding: 24px var(--pad-x);
        border-bottom: 1px solid var(--line);
        gap: 18px;
        font-size: 14px;
      }
      .nav__links.is-open .nav__lang-group { margin-left: 0; margin-top: 8px; }
      .nav__toggle.is-active span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
      .nav__toggle.is-active span:nth-child(2) { transform: translateY(-6px) rotate(-45deg); }
    }
  `;
  document.head.appendChild(style);
})();

/* ═══════════════════════════════════════════
   Portrait Particle Effect
   Particles settle from left → form portrait → hover disturbs
   Uses the <img> bounding rect directly for perfect alignment
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  function isBg(r, g, b, a) {
    if (a < 120) return true;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return (mx + mn) / 2 > 210 && mx - mn < 45;
  }

  function colorFor(r, g, b) {
    var L = (Math.max(r,g,b) + Math.min(r,g,b)) / 2;
    var S = Math.max(r,g,b) - Math.min(r,g,b);
    if (S > 22 && r > 60) {
      var f = Math.max(0.8, Math.min(1.15, L / 130));
      return [(190 * f) | 0, (56 * f) | 0, (42 * f) | 0];
    }
    var f2 = Math.max(0.7, Math.min(1.15, L / 78));
    return [(20 * f2) | 0, (16 * f2) | 0, (14 * f2) | 0];
  }

  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  function init() {
    var fig = document.querySelector(".portrait[data-portrait]");
    if (!fig) return;
    var img = fig.querySelector(".portrait__img");
    if (!img) return;
    if (!img.complete || !img.naturalWidth) {
      img.addEventListener("load", init, { once: true });
      return;
    }

    var media = fig.querySelector(".portrait__media");
    var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var EXT = 0.62;

    var canvas = document.createElement("canvas");
    canvas.className = "portrait__particles";
    canvas.setAttribute("aria-hidden", "true");
    fig.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    img.style.opacity = "0";
    fig.classList.remove("is-base-visible");

    var boxW = 0, boxH = 0, extPx = 0, W = 0, H = 0;
    var particles = [];
    var TARGET = window.innerWidth < 760 ? 8000 : 18000;
    var t0 = 0, settleStart = 1400, baseRevealStart = 1700;
    var baseVisible = false;
    var mouse = { x: -9999, y: -9999, on: false };

    function sample() {
      // Sample from full image
      var sw = Math.min(500, img.naturalWidth);
      var scale = sw / img.naturalWidth;
      var sh = Math.round(img.naturalHeight * scale);
      var off = document.createElement("canvas");
      off.width = sw; off.height = sh;
      var octx = off.getContext("2d");
      octx.drawImage(img, 0, 0, sw, sh);
      var data = octx.getImageData(0, 0, sw, sh).data;

      var subj = 0;
      for (var i = 0; i < data.length; i += 4) {
        if (!isBg(data[i], data[i+1], data[i+2], data[i+3])) subj++;
      }
      var step = Math.max(2, Math.round(Math.sqrt(subj / TARGET)));

      particles = [];
      for (var y = 0; y < sh; y += step) {
        for (var x = 0; x < sw; x += step) {
          var idx = (y * sw + x) * 4;
          if (isBg(data[idx], data[idx+1], data[idx+2], data[idx+3])) continue;
          var c = colorFor(data[idx], data[idx+1], data[idx+2]);
          var nx = x / sw, ny = y / sh;
          particles.push({
            nx: nx, ny: ny,
            r: c[0], g: c[1], b: c[2],
            life: Math.random(),
            phase: Math.random() * 6.28,
            size: 0.65 + Math.random() * 0.85,
            delay: nx * 500 + Math.random() * 200,
            dur: 600 + Math.random() * 400,
            x: 0, y: 0, tx: 0, ty: 0, sx: 0, sy: 0,
          });
        }
      }
      layoutTargets(true);
    }

    function measure() {
      var r = media.getBoundingClientRect();
      boxW = r.width; boxH = r.height;
      extPx = boxW * EXT;
      // 粒子垂直偏移（正数=下移），以衬衫白色领子区域对齐为参照
      var Y_OFF = 18;
      canvas.style.left = (-extPx) + "px";
      canvas.style.top = Y_OFF + "px";
      canvas.style.width = (boxW + extPx) + "px";
      canvas.style.height = boxH + "px";
      canvas.style.position = "absolute";
      W = boxW + extPx; H = boxH;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function layoutTargets(first) {
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        p.tx = extPx + p.nx * boxW;
        p.ty = p.ny * boxH;
        if (first) {
          p.sx = extPx * (0.08 + Math.random() * 0.72);
          p.sy = p.ty + (Math.random() - 0.5) * 140;
          p.x = p.sx; p.y = p.sy;
        }
      }
    }

    function repositionCanvas() {
      measure();
      layoutTargets(false);
    }

    function frame(now) {
      var elapsed = now - t0;
      if (!baseVisible && (reduce || elapsed >= baseRevealStart)) {
        img.style.opacity = "0.42";
        img.style.filter = "saturate(1.22) contrast(1.18) brightness(0.82)";
        fig.classList.add("is-base-visible");
        baseVisible = true;
      }

      repositionCanvas();
      ctx.clearRect(0, 0, W, H);

      var time = now * 0.001;
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k], a, px, py, hb = 0;
        if (!reduce && elapsed < settleStart) {
          var lp = (elapsed - p.delay) / p.dur;
          var prog = lp <= 0 ? 0 : lp >= 1 ? 1 : easeOut(lp);
          px = p.sx + (p.tx - p.sx) * prog;
          py = p.sy + (p.ty - p.sy) * prog;
          a = Math.max(0, Math.min(1, lp + 0.1));
        } else {
          a = 1;
          p.life += 0.005;
          if (p.life > 1) p.life -= 1;
          px = p.tx + Math.sin(time + p.phase) * 0.3;
          py = p.ty + Math.cos(time * 0.7 + p.phase) * 0.4;
          if (mouse.on) {
            var dx = px - mouse.x, dy = py - mouse.y, d2 = dx*dx + dy*dy;
            var R = Math.max(100, Math.min(160, W * 0.2));
            if (d2 < R * R) {
              var d = Math.sqrt(d2) || 1;
              var hover = 1 - d / R;
              hb = hover;
              var f = hover * 18;
              px += dx / d * f + Math.sin(time * 7 + p.phase) * hover * 3;
              py += dy / d * f + Math.cos(time * 6 + p.phase) * hover * 3;
              a = Math.max(a, Math.pow(hover, 0.7) * 0.92);
            }
          }
        }
        if (a <= 0.01) continue;
        ctx.fillStyle = "rgb(" + p.r + "," + p.g + "," + p.b + ")";
        var sz = p.size * (1 + hb * 0.6);
        ctx.globalAlpha = a * 0.08;
        ctx.fillRect(px - 0.2, py - 0.2, sz + 0.4, sz + 0.4);
        ctx.globalAlpha = a;
        ctx.fillRect(px, py, sz, sz);
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    var raf, resizeId, scrollId;
    window.addEventListener("resize", function () {
      clearTimeout(resizeId);
      resizeId = setTimeout(function () { measure(); layoutTargets(false); }, 200);
    });
    window.addEventListener("scroll", function () {
      clearTimeout(scrollId);
      scrollId = setTimeout(repositionCanvas, 50);
    }, { passive: true });

    document.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.on = mouse.x >= 0 && mouse.x <= W && mouse.y >= 0 && mouse.y <= H;
    });
    fig.addEventListener("pointerleave", function () { mouse.on = false; });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { t0 = performance.now() - (settleStart + 100); raf = requestAnimationFrame(frame); }
    });

    measure();
    sample();
    fig.classList.add("is-particle-ready");
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();

/* ── Visitor Counter ── */
(function() {
  var el = document.getElementById('visitor-num');
  if (!el) return;
  fetch('https://api.countapi.xyz/hit/cslawyer-blog/visits')
    .then(function(r) { return r.json(); })
    .then(function(d) { el.textContent = d.value.toLocaleString(); })
    .catch(function() { el.textContent = ''; });
})();
