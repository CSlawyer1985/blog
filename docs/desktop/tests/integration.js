async (page) => {
  const root = 'http://127.0.0.1:8336', out = '/Users/CS/Documents/AI Builder/工作空间/网页制作/blog/docs/desktop';
  const results = [], errors = [], failedResources = [];
  const check = (name, condition) => { if (!condition) throw new Error(name); results.push({ name, status: 'passed' }); };
  const context = await page.context().browser().newContext({viewport:{width:1440,height:1000}});
  let mutate = false, failData = false;
  // Local http.server ignores _headers. Apply the configured SAMEORIGIN in this test.
  await context.route(root + '/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (failData && path === '/data/articles.json') return route.fulfill({status:503,body:'Unavailable'});
    const response = await route.fetch();
    let body;
    if (mutate && path === '/data/articles.json') {
      const data = await response.json(); data.articles[0].title = '共享文章更新验证'; body = JSON.stringify(data);
    }
    if (mutate && path === '/index.html') {
      body = (await response.text()).replace(/(<div class="project-caption">[\s\S]*?<h3[^>]*>\s*<span lang="zh">)[^<]+/, '$1共享作品更新验证')
        .replace(/(<p class="hero__slogan"[\s\S]*?<span lang="zh">)[^<]+/, '$1共享简介更新验证');
    }
    if (mutate && path === '/about.html') body = (await response.text()).replace('副主任、高级合伙人</span>', '共享职务更新验证</span>');
    await route.fulfill({response, ...(body === undefined ? {} : {body}), headers:{...response.headers(),'x-frame-options':'SAMEORIGIN'}});
  });
  const p = await context.newPage();
  p.on('pageerror', e => errors.push(e.message));
  p.on('response', response => { if (response.url().startsWith(root) && response.status() >= 400 && !failData) failedResources.push({url:response.url(),status:response.status()}); });
  try {
    await p.goto(root + '/', {waitUntil:'domcontentloaded'});
    check('Normal homepage remains the default URL', p.url() === root + '/' && await p.locator('#hero').count() === 1 && await p.locator('#desktop').count() === 0);
    check('Original 11 portfolio cards remain present', await p.locator('a.project-link').count() === 11);
    await p.screenshot({path:out+'/normal-after.png'});
    await p.locator('a.nav__desktop').click();
    await p.waitForFunction(()=>window.desktopStatus?.().projectCount === 11);
    check('Normal homepage entry opens /desktop', /^\/desktop\/?$/.test(new URL(p.url()).pathname));
    check('Shared 232 articles load', await p.evaluate(()=>desktopStatus().articleCount === 232));
    check('New visitors default to Sonoma', await p.locator('#wallpaper').evaluate(n=>n.style.backgroundImage.includes('sonoma.jpg')));
    check('Profile uses the current About page role', (await p.locator('.profile-positions').innerText()).includes('常务理事'));
    await p.locator('#dock [data-app="appearance"]').click();
    const appearance = p.locator('.window[data-app="appearance"]');
    check('Seven wallpaper choices are available', await appearance.locator('.wallpaper-option').count() === 7);
    for (const id of ['pink','green','orange','sky']) {
      await appearance.locator(`.wallpaper-option:has(img[src$="/${id}.jpg"])`).click();
      check(`Added ${id} wallpaper applies`, await p.locator('#wallpaper').evaluate((n,id)=>n.style.backgroundImage.includes(id+'.jpg'),id));
    }
    await p.screenshot({path:out+'/wallpapers.png'});
    await p.reload({waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.desktopStatus);
    check('New wallpaper persists across reload', await p.locator('#wallpaper').evaluate(n=>n.style.backgroundImage.includes('sky.jpg')));
    await p.locator('#dock [data-app="appearance"]').click();
    await p.locator('.window[data-app="appearance"] .wallpaper-option:has(img[src$="/sonoma.jpg"])').click();
    await p.locator('#dock [data-app="notes"]').click();
    await p.getByRole('button',{name:'完整介绍',exact:true}).click();
    const browser = p.locator('.window[data-app="browser"]');
    await browser.frameLocator('iframe').locator('.pos-item').first().waitFor();
    check('Same-origin headers allow About inside the browser', await browser.frameLocator('iframe').locator('.pos-item').count() > 0);
    await browser.frameLocator('iframe').locator('.crumbs a').click();
    await p.waitForFunction(()=>document.querySelector('.window[data-app="browser"] iframe').src.endsWith('/index.html'));
    check('About breadcrumb follows the shared ordinary homepage', await browser.frameLocator('iframe').locator('#hero').count() === 1);
    await browser.getByRole('button',{name:'后退',exact:true}).click();
    await browser.frameLocator('iframe').locator('.pos-item').first().waitFor();
    check('Browser back restores About history', await browser.getByRole('textbox').inputValue().then(x=>x.includes('/about.html')));
    mutate = true;
    await p.reload({waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.desktopStatus);
    await p.locator('#dock [data-app="notes"]').click();
    check('Updated shared article index appears without a desktop copy', await p.locator('.note-item[data-article-id]').first().innerText().then(x=>x.includes('共享文章更新验证')));
    check('Updated original homepage introduction appears', await p.locator('.profile-intro').first().innerText().then(x=>x.includes('共享简介更新验证')));
    check('Updated original About role appears', await p.locator('.profile-positions').innerText().then(x=>x.includes('共享职务更新验证')));
    await p.locator('#dock [data-app="finder"]').click();
    check('Updated original portfolio appears', await p.locator('.file-item').first().innerText().then(x=>x.includes('共享作品更新验证')));
    await p.locator('.file-item').first().dblclick();
    await browser.frameLocator('iframe').getByRole('heading',{name:'共享作品更新验证',exact:true}).waitFor();
    check('Project detail reads the same updated homepage source', true);
    check('Published sources have no newly missing resources', failedResources.length === 0);
    check('No uncaught app errors during integration flows', errors.length === 0);
    mutate = false; failData = true;
    await p.reload({waitUntil:'domcontentloaded'});
    await p.locator('#startup a').waitFor();
    check('Shared data failure offers the ordinary homepage', await p.locator('#startup a').getAttribute('href') === '/');
    failData = false;
    await p.locator('#startup a').click(); await p.locator('#hero').waitFor();
    await p.locator('a.nav__desktop').click(); await p.waitForFunction(()=>window.desktopStatus);
    await p.getByRole('button',{name:'苹果菜单',exact:true}).click();
    await p.getByRole('menuitem',{name:'返回普通主页',exact:true}).click();
    await p.locator('#hero').waitFor();
    check('Desktop menu returns to the default homepage', p.url() === root+'/');
    return {status:'passed',checks:results,pageErrors:errors,failedResources,headerScope:'SAMEORIGIN reproduced locally; production headers not yet deployed',mutationScope:'network fixtures only; no published content changed'};
  } finally { await context.close(); }
}
