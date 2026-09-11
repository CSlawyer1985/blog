async (page) => {
  const checks = [];
  const check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
  await page.bringToFront();
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:8765/index.html?release=' + Date.now());
  await page.waitForTimeout(3000);
  await page.getByRole('button', {name:'中文',exact:true}).click();
  check('new identity visible', await page.locator('.hero__kicker [lang="zh"]').innerText() === '商事律师 × AI Builder');
  check('production without preview controls', await page.locator('.preview-dock').count() === 0);
  await page.locator('.hero__cta a[href="#project-gallery"]').click();
  await page.waitForTimeout(2300);
  const top = await page.locator('#project-gallery').evaluate(e=>e.getBoundingClientRect().top);
  check('view projects anchor clears navigation', top >= 70 && top <= 130, top);
  for (const width of [1440,1024,768,375]) {
    await page.setViewportSize({width,height:1000});
    await page.locator('#project-gallery').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const result = await page.evaluate(()=>({
      columns:getComputedStyle(document.querySelector('.project-grid')).gridTemplateColumns.split(' ').length,
      overflow:document.documentElement.scrollWidth>innerWidth,
      count:document.querySelectorAll('.project-item').length
    }));
    check(width+': gallery columns/count/no overflow', result.columns===(width>=1024?3:width>=640?2:1)&&result.count===7&&!result.overflow,result);
  }
  await page.setViewportSize({width:1440,height:1000});
  for (const card of await page.locator('.project-item').all()) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    check('card loaded/playing: '+await card.getAttribute('class'),await card.evaluate(el=>{
      const image=el.querySelector('img');
      return image.complete&&image.naturalWidth>0&&el.classList.contains('is-playing');
    }));
  }
  const first=page.locator('.project-item').first();
  await first.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const before=await first.locator('.loop').first().evaluate(e=>getComputedStyle(e).strokeDashoffset);
  await page.waitForTimeout(1300);
  const after=await first.locator('.loop').first().evaluate(e=>getComputedStyle(e).strokeDashoffset);
  check('real animation changes',before!==after,{before,after});
  await first.locator('a').focus();
  await page.keyboard.press('Tab');
  check('keyboard focus outline',await page.evaluate(()=>document.activeElement.matches('.project-link')&&getComputedStyle(document.activeElement).outlineStyle==='solid'));
  await page.locator('#hero').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  check('offscreen cards paused',await page.locator('.project-item.is-playing').count()===0);
  await page.emulateMedia({reducedMotion:'reduce'});
  check('reduced-motion gallery hidden',await first.locator('.art-motion').evaluate(e=>getComputedStyle(e).display==='none'));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'English',exact:true}).click();
  for (const width of [1440,768,375]) {
    await page.setViewportSize({width,height:1000});
    check(width+': English no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'中文',exact:true}).click();
  await page.goto('http://127.0.0.1:8765/about.html?release='+Date.now()+'#open-source-projects');
  await page.waitForTimeout(1800);
  const entries=await page.locator('#open-source-projects .proj-item').evaluateAll(nodes=>nodes.map(n=>({name:n.querySelector('.proj-item__name').textContent,url:n.href})));
  check('about retains five and adds four',entries.length===9,entries);
  for (const width of [1440,768,375]) {
    await page.setViewportSize({width,height:1000});
    await page.locator('#open-source-projects').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    check(width+': about project names fit',await page.locator('#open-source-projects').evaluate(el=>{
      const r=el.getBoundingClientRect();
      return [...el.querySelectorAll('.proj-item__name')].every(n=>{const b=n.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;});
    }));
  }
  return {passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks};
}
