/* Original production portrait IIFE copied from js/main.js.
   Adaptations: responsive selector, sampling density, image registration and scale.
   Preserve the original palette, opacity, animation timing, compositing and hover. */
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
    var fig = document.querySelector(".portrait[data-portrait-responsive]");
    if (!fig) return;
    var img = fig.querySelector(".portrait__img");
    if (!img) return;
    if (!img.complete || !img.naturalWidth) {
      img.addEventListener("load", init, { once: true });
      return;
    }

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
    var particleScale = 1;
    var particles = [];
    // Use the original desktop sampler; 900px is the responsive portrait maximum.
    var TARGET = 18000;
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
      // Keep the original regular sampling grid, increasing spacing as the
      // portrait shrinks. At its 900px design maximum this is exactly original.
      step *= Math.pow(Math.max(1, 900 / boxW), 1.3);

      particles = [];
      for (var y = 0; y < sh; y += step) {
        for (var x = 0; x < sw; x += step) {
          var idx = (Math.floor(y) * sw + Math.floor(x)) * 4;
          if (isBg(data[idx], data[idx+1], data[idx+2], data[idx+3])) continue;
          var c = colorFor(data[idx], data[idx+1], data[idx+2]);
          // Anchor to the center of the exact source pixel used for its color.
          var nx = (Math.floor(x) + 0.5) / sw, ny = (Math.floor(y) + 0.5) / sh;
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
      var r = img.getBoundingClientRect();
      var origin = fig.getBoundingClientRect();
      boxW = r.width; boxH = r.height;
      particleScale = boxW / 900;
      extPx = boxW * EXT;
      // The entrance extension is outside the image, not an image offset.
      canvas.style.left = (r.left - origin.left - extPx) + "px";
      canvas.style.top = (r.top - origin.top) + "px";
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
          px = p.tx + Math.sin(time + p.phase) * 0.3 * particleScale;
          py = p.ty + Math.cos(time * 0.7 + p.phase) * 0.4 * particleScale;
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
        var sz = p.size * (1 + hb * 0.6) * particleScale;
        ctx.globalAlpha = a * 0.08;
        ctx.fillRect(px - 0.2 * particleScale, py - 0.2 * particleScale, sz + 0.4 * particleScale, sz + 0.4 * particleScale);
        ctx.globalAlpha = a;
        ctx.fillRect(px, py, sz, sz);
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    var raf, resizeId, scrollId;
    window.addEventListener("resize", function () {
      clearTimeout(resizeId);
      resizeId = setTimeout(function () { measure(); sample(); }, 200);
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
