async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:740,height:900},hasTouch:true,reducedMotion:'reduce'});
  const p=await context.newPage();await p.goto('http://127.0.0.1:8765/?foldbook=preview',{waitUntil:'domcontentloaded'});await p.waitForSelector('#foldbook');
  const check=(name,ok)=>{if(!ok)throw Error(name);return {name,pass:true};},results=[];
  const cdp=await context.newCDPSession(p);
  const pad=await p.locator('.fb-trackpad').boundingBox();const px=Math.round(pad.x+40),py=Math.round(pad.y+40);
  const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  // Move cursor from 120,100 to 300,240 inside the browser page.
  await touch('touchStart',[{x:px,y:py,id:1}]);await touch('touchMove',[{x:px+120,y:py+93,id:1}]);await touch('touchEnd',[]);
  const before=await p.locator('.fb-content').evaluate(el=>el.scrollTop);
  await touch('touchStart',[{x:px,y:py,id:1},{x:px+30,y:py,id:2}]);
  await touch('touchMove',[{x:px,y:py-40,id:1},{x:px+30,y:py-40,id:2}]);await touch('touchEnd',[]);
  results.push(check('two-finger scroll',await p.locator('.fb-content').evaluate(el=>el.scrollTop)>before));
  await touch('touchStart',[{x:px,y:py,id:1},{x:px+30,y:py,id:2}]);await touch('touchEnd',[]);
  await p.waitForSelector('.fb-context');results.push(check('two-finger context menu',true));
  await p.getByRole('menuitem',{name:'回到顶部'}).click();results.push(check('context scroll to top',await p.locator('.fb-content').evaluate(el=>el.scrollTop)===0));
  async function moveCursor(tx,ty){
    const pos=await p.locator('.fb-cursor').evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return {x:m.m41,y:m.m42};});
    await touch('touchStart',[{x:px,y:py,id:1}]);await touch('touchMove',[{x:px+(tx-pos.x)/1.5,y:py+(ty-pos.y)/1.5,id:1}]);await touch('touchEnd',[]);
  }
  const dock=await p.locator('.fb-dock [data-open="notes"]').boundingBox();
  await moveCursor(dock.x+dock.width/2,dock.y+dock.height/2);
  await touch('touchStart',[{x:px,y:py,id:1}]);await touch('touchEnd',[]);
  results.push(check('trackpad tap launches dock app',await p.locator('.fb-notes').isVisible()));
  const title=await p.locator('.fb-notes .fb-title').boundingBox();
  await moveCursor(title.x+title.width/2,title.y+15);
  const oldX=await p.locator('.fb-notes').evaluate(el=>el.offsetLeft);
  await touch('touchStart',[{x:px,y:py,id:1}]);await p.waitForTimeout(400);await touch('touchMove',[{x:px+20,y:py,id:1}]);await touch('touchEnd',[]);
  results.push(check('trackpad hold drags window',await p.locator('.fb-notes').evaluate(el=>el.offsetLeft)>oldX));
  await p.locator('[data-open="notes"]').first().click();
  await p.locator('[aria-label="最大化 便签"]').click();
  const rect=await p.locator('.fb-notes').boundingBox();results.push(check('maximize geometry',rect.x===0&&rect.y===32&&rect.width===740));
  await p.locator('[aria-label="最大化 便签"]').click();
  const restored=await p.locator('.fb-notes').boundingBox();results.push(check('unmaximize restores position',restored.x>0&&restored.y>32));
  await p.setViewportSize({width:600,height:900});
  results.push(check('desktop navigation stays expanded',await p.locator('.nav__toggle').evaluate(el=>getComputedStyle(el).display)==='none'&&await p.locator('.nav__links').evaluate(el=>getComputedStyle(el).display)==='flex'));
  await context.close();return results;
}
