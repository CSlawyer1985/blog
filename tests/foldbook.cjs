const assert = require('node:assert/strict');
(async () => {
  const { laptopSegments } = await import('../js/foldbook/geometry.mjs');
  const top = {left:0,top:0,width:720,height:340}, bottom = {left:0,top:360,width:720,height:340};
  assert.equal(laptopSegments('continuous',[top,bottom]), null);
  assert.equal(laptopSegments('folded',[top]), null);
  assert.equal(laptopSegments('folded',[top,{...bottom,left:720,top:0}]), null);
  assert.deepEqual(laptopSegments('folded',[bottom,top]),[top,bottom]);
  assert.equal(laptopSegments('folded',[top,{...bottom,height:0}]),null);
  const { candidates } = await import('../js/foldbook/pinyin.mjs');
  assert(candidates('nihao').includes('你好'));
  assert(candidates('zhongguo').includes('中国'));
  assert.deepEqual(candidates('zzzz'),[]);
  console.log('PASS foldbook geometry and pinyin');
})();
(async()=>{
  const {dockScale}=await import('../js/foldbook/dock.mjs');
  assert.equal(dockScale(0),1.65);
  assert(dockScale(40)>dockScale(80));
  assert.equal(dockScale(120),1);
  assert.equal(dockScale(0,true),1);
  console.log('PASS Dock proximity and reduced motion');
})();
