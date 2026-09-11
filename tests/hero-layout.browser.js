async (page) => {
  const checks = [];
  const check = (name, ok, details) => checks.push({ name, pass: !!ok, details });
  await page.bringToFront();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:8765/index.html?hero-check=' + Date.now() + '#hero');
  await page.waitForTimeout(2300);
  await page.getByRole('button', { name: '中文', exact: true }).click();
  for (const width of [1440, 1101, 1100, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const rect = selector => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
      };
      const image = document.querySelector('.portrait__img');
      const canvas = document.querySelector('.portrait__particles');
      return {
        image: rect('.portrait__img'), canvas: canvas ? rect('.portrait__particles') : null,
        portrait: rect('.portrait'), cta: rect('.hero__cta'), about: rect('#about'),
        shown: getComputedStyle(document.querySelector('.hero__right')).display !== 'none',
        opacity: Number(getComputedStyle(image).opacity),
        bodyFont: parseFloat(getComputedStyle(document.querySelector('.hero__slogan')).fontSize),
        buttons: [...document.querySelectorAll('.hero__cta .btn')].map(b => {
          const label = [...b.querySelectorAll('span[lang]')].find(s => getComputedStyle(s).display !== 'none');
          return { textHeight: label.getBoundingClientRect().height, fontSize: parseFloat(getComputedStyle(label).fontSize), height: b.getBoundingClientRect().height };
        }),
        overflow: document.documentElement.scrollWidth > innerWidth
      };
    });
    check(width + ': portrait remains visible', m.shown && m.image.width > 0, m.image);
    check(width + ': no page overflow', !m.overflow);
    check(width + ': single-line usable buttons', m.buttons.every(b => b.height >= 44 && b.textHeight < b.fontSize * 2), m.buttons);
    // Preserve the entrance extension, but map the portrait region onto the image.
    check(width + ': image-aligned particle coordinate mapping', m.canvas && Math.abs(m.image.height - m.canvas.height) < 1 && Math.abs(m.canvas.width - m.image.width * 1.62) < 1 && Math.abs(m.canvas.x + m.image.width * .62 - m.image.x) < 1 && Math.abs(m.canvas.y - m.image.y) < 1, { image: m.image, canvas: m.canvas });
    // Revised user requirement: keep the original .42 underlay and opaque grain.
    check(width + ': original hazy underlay', m.opacity === .42, m.opacity);
    if (width < 1100) {
      check(width + ': text then image then About', m.portrait.y >= m.cta.bottom + 20 && m.about.y >= m.portrait.bottom, { cta: m.cta, portrait: m.portrait, about: m.about });
      check(width + ': readable body copy', m.bodyFont >= 18, m.bodyFont);
    } else {
      check(width + ': shared lower baseline', Math.abs(m.portrait.bottom - m.cta.bottom) <= 30, { portraitBottom: m.portrait.bottom, ctaBottom: m.cta.bottom });
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check('reduced motion keeps image, hides particles', await page.evaluate(() => Number(getComputedStyle(document.querySelector('.portrait__img')).opacity) >= .7 && getComputedStyle(document.querySelector('.portrait__particles')).display === 'none'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return { passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks };
}
