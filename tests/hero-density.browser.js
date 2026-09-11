async (page) => {
  const context = await page.context().browser().newContext();
  page = await context.newPage();
  try {
  await page.addInitScript(() => {
    if (window.particleProbeInstalled) return;
    window.particleProbeInstalled = true;
    const proto = CanvasRenderingContext2D.prototype;
    const clear = proto.clearRect, fill = proto.fillRect;
    proto.clearRect = function (...args) {
      if (this.canvas.classList.contains('portrait__particles')) window.particleFrame = { count: 0, maxAlpha: 0, opaque: 0, coreMin: Infinity, coreMax: 0 };
      return clear.apply(this, args);
    };
    proto.fillRect = function (...args) {
      if (this.canvas.classList.contains('portrait__particles') && window.particleFrame) {
        const f = window.particleFrame;
        f.count++;
        f.maxAlpha = Math.max(f.maxAlpha, this.globalAlpha);
        if (this.globalAlpha >= .99) {
          f.opaque++;
          f.coreMin = Math.min(f.coreMin, args[2]);
          f.coreMax = Math.max(f.coreMax, args[2]);
        }
      }
      return fill.apply(this, args);
    };
  });
  await page.bringToFront();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:8765/index.html?density-test=' + Date.now());
  await page.waitForTimeout(2400);
  const results = [];
  for (const width of [1920, 1440, 1100, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1300);
    results.push(await page.evaluate(() => {
      const img = document.querySelector('.portrait__img');
      const r = img.getBoundingClientRect();
      return { viewport: innerWidth, width: r.width, area: r.width * r.height,
        baseOpacity: +getComputedStyle(img).opacity, ...window.particleFrame };
    }));
  }
  const checks = {
    fullStrengthAtEverySize: results.every(r => r.maxAlpha === 1 && r.opaque > 0),
    originalUnderlayAtEverySize: results.every(r => r.baseOpacity === .42),
    fullDesktopTexture: results[0].opaque > 20000,
    proportionalParticleSize: results.every(r => r.coreMin / r.width >= .65 / 900 - .00001 && r.coreMax / r.width <= 1.5 / 900 + .00001 && r.coreMax / r.width >= 1.45 / 900),
    fewerParticlesAsImageShrinks: results.every((r, i) => !i || r.opaque < results[i - 1].opaque),
    lowerDensityAsImageShrinks: results.every((r, i) => !i || r.opaque / r.area < results[i - 1].opaque / results[i - 1].area)
  };
  return { checks, results, passed: Object.values(checks).filter(Boolean).length, failed: Object.values(checks).filter(v => !v).length };
  } finally {
    await context.close();
  }
}
