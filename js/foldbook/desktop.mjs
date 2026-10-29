import {dock} from './dock.mjs';
import {keyboard} from './keyboard.mjs?v=20261026-hardware';
import {trackpad} from './trackpad.mjs';
const storage={get(key,fallback){try{return JSON.parse(sessionStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}}};
const icon=(kind)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">${kind==='browser'?'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>':kind==='search'?'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>':'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>'}</svg>`;
export async function mount(regions, exit) {
  if(!document.querySelector('#foldbook-style'))await new Promise((resolve,reject)=>{const link=document.createElement('link');link.id='foldbook-style';link.rel='stylesheet';link.href='/css/foldbook.css?v=20261029-fs';link.onload=resolve;link.onerror=()=>{link.remove();reject(new Error('Foldbook stylesheet failed'));};document.head.append(link);});
  const abort=new AbortController(), {signal}=abort;
  const root=document.createElement('section');root.id='foldbook';root.setAttribute('aria-label','折叠屏桌面');
  root.innerHTML=`<!-- 视觉表达方案：K 交互模拟 + L 阅读；L3 原生 JS/CSS/SVG；构图家族 workspace；布局原语 split；阅读路径 桌面→博客→键盘；主轴 vertical，焦点真实博客；上下分区对应屏幕和操作面；响应式 segment-driven；参考 macOS 窗口惯例，不复制品牌资产；不用框架与 iframe；拖拽/输入/点击；开机与按键动效；普通模式零布局改动；系统 CJK 字体，毛玻璃按用户要求。 -->
  <div class="fb-screen"><header class="fb-menubar"><b>CS</b><strong>博客</strong><button data-open="search">搜索</button><button data-open="notes">便签</button><button class="fb-fs">全屏</button><time></time><button class="fb-exit">返回普通博客</button></header><div class="fb-wallmark">CHEN SHI<span>法与 AI · 一个可以探索的桌面</span></div><nav class="fb-dock" aria-label="程序坞">${[['browser','博客'],['search','搜索'],['notes','便签']].map(([id,label])=>`<button data-open="${id}" aria-label="${label}" title="${label}">${icon(id)}<span>${label}</span></button>`).join('')}</nav><div class="fb-cursor"><svg viewBox="0 0 20 26"><path d="M2 1v21l5-5 4 8 4-2-4-8h7Z" fill="#fafafa" stroke="#172124" stroke-width="1.5"/></svg></div></div>
  <div class="fb-base"><div class="fb-candidates" aria-live="polite"></div><div class="fb-keys" aria-label="屏幕键盘"></div><div class="fb-palm"><span aria-hidden="true"></span><div class="fb-trackpad" aria-label="触控板：单指移动、轻点点击、双指滚动、双指轻点右键" role="application" tabindex="0"></div><span aria-hidden="true"></span></div></div>`;
  const screen=root.querySelector('.fb-screen');
  const originalY=scrollY;
  const content=document.createElement('div');content.className='fb-content';
  const original=[...document.body.childNodes].filter(n=>n.nodeType!==1||!['SCRIPT','NOSCRIPT'].includes(n.tagName));
  const slots=original.map(node=>{const slot=document.createComment('foldbook-original');node.before(slot);content.append(node);return {node,slot};});
  try {
  const saved=storage.get('foldbook-windows',{}), windows=new Map();let z=10,activeDrag=null,destroyed=false;
  function make(id,title,body){const win=document.createElement('section');win.className=`fb-window fb-${id}`;win.dataset.app=id;win.setAttribute('aria-label',title);win.innerHTML=`<header class="fb-title"><div class="fb-traffic"><button data-action="close" aria-label="关闭 ${title}"></button><button data-action="min" aria-label="最小化 ${title}"></button><button data-action="max" aria-label="最大化 ${title}"></button></div><strong>${title}</strong></header>`;win.append(body);screen.append(win);windows.set(id,win);win.style.left=(saved[id]?.x??regions[0].width*(id==='browser'?.03:.15))+'px';win.style.top=(saved[id]?.y??(id==='browser'?44:56))+'px';if(saved[id]?.hidden)win.hidden=true;if(saved[id]?.max){win.classList.add('fb-max');win.dataset.restoreX=saved[id].restoreX??20;win.dataset.restoreY=saved[id].restoreY??44;}if(saved[id]?.x!=null){win.style.left=(saved[id].max?0:saved[id].x)+'px';win.style.top=(saved[id].max?32:saved[id].y)+'px';}return win;}
  const browser=make('browser','陈石 · 法与 AI',content);
  /* 模拟浏览器：站内链接在窗口内以 iframe 打开，避免整页跳转闪现普通模式 */
  const browserTitle=browser.querySelector('.fb-title strong');
  browser.querySelector('.fb-title').insertAdjacentHTML('beforeend','<button class="fb-home" aria-label="回到首页视图">首页</button>');
  const frameWrap=document.createElement('div');frameWrap.className='fb-frame-wrap';frameWrap.hidden=true;
  const frame=document.createElement('iframe');frame.className='fb-frame';frame.title='博客内容';
  frameWrap.append(frame);browser.append(frameWrap);
  function openInFrame(url){frame.src=url;frameWrap.hidden=false;frameWrap.classList.add('fb-loading');content.hidden=true;front(browser);}
  function backToContent(){frameWrap.hidden=true;frame.src='about:blank';frameWrap.classList.remove('fb-loading');content.hidden=false;browserTitle.textContent='陈石 · 法与 AI';save();}
  browser.querySelector('.fb-home').addEventListener('click',backToContent,{signal});
  frame.addEventListener('load',()=>{frameWrap.classList.remove('fb-loading');try{const t=frame.contentDocument?.title;if(t)browserTitle.textContent=t;}catch{}},{signal});
  content.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a)return;
    if(a.target==='_blank')return;
    let url;try{url=new URL(a.href,location.href);}catch{return;}
    if(url.origin!==location.origin)return;
    /* 同页锚点始终原生滚动（含带 query 的 preview 场景）；跨页锚点进 iframe */
    if(url.hash&&url.pathname===location.pathname)return;
    e.preventDefault();openInFrame(url.href);
  },{signal});
  const searchBody=document.createElement('div');searchBody.className='fb-appbody';searchBody.innerHTML='<label>搜索文章<input type="search" placeholder="标题、关键词…" aria-label="搜索文章" inputmode="none"></label><div class="fb-results" aria-live="polite">正在读取文章索引…</div>';
  const search=make('search','文章搜索',searchBody);if(!saved.search)search.hidden=true;
  const notesBody=document.createElement('div');notesBody.className='fb-appbody';notesBody.innerHTML='<label>随手记<textarea aria-label="便签内容" inputmode="none" placeholder="写下此刻的想法…"></textarea></label><small class="fb-note-status">自动保存在本机</small>';
  const notes=make('notes','便签',notesBody);if(!saved.notes)notes.hidden=true;
  const textarea=notesBody.querySelector('textarea');try{textarea.value=localStorage.getItem('foldbook-note')||'';}catch{}
  textarea.addEventListener('input',()=>{try{localStorage.setItem('foldbook-note',textarea.value);}catch{notesBody.querySelector('small').textContent='无法保存，请复制保留';}},{signal});
  let articles=[];
  const results=searchBody.querySelector('.fb-results'), query=searchBody.querySelector('input');
  function renderResults(){results.replaceChildren();const needle=query.value.trim().toLowerCase();const found=articles.filter(a=>(a.title+' '+a.excerpt).toLowerCase().includes(needle)).slice(0,40);if(!found.length){results.textContent='没有找到相关文章';return;}for(const a of found){const link=document.createElement('a');link.href='/articles/'+encodeURIComponent(a.slug)+'/';link.textContent=a.title;const meta=document.createElement('small');meta.textContent=a.date+' · '+a.category_label;link.append(meta);results.append(link);}}
  query.addEventListener('input',renderResults,{signal});
  fetch('/data/articles.json',{signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{articles=data.articles;renderResults();}).catch(e=>{if(e.name!=='AbortError')results.textContent='文章索引暂时不可用，请稍后重新进入桌面';});
  content.addEventListener('scroll',()=>{const fill=content.querySelector('.progress-bar-fill');if(fill)fill.style.width=(content.scrollTop/Math.max(1,content.scrollHeight-content.clientHeight)*100)+'%';},{signal,passive:true});
  function front(win){win.style.zIndex=String(++z);for(const w of windows.values())w.classList.toggle('fb-front',w===win);}
  function open(id){const win=windows.get(id);if(!win)return;win.hidden=false;front(win);save();}
  function save(){const state={};for(const [id,w]of windows){state[id]={hidden:w.hidden,max:w.classList.contains('fb-max'),x:parseFloat(w.style.left),y:parseFloat(w.style.top),restoreX:Number(w.dataset.restoreX)||20,restoreY:Number(w.dataset.restoreY)||44};}storage.set('foldbook-windows',state);const reading=storage.get('foldbook-read',{});reading[location.pathname]=content.scrollTop;storage.set('foldbook-read',reading);}
  function clamp(win){if(win.hidden||win.classList.contains('fb-max'))return;const r=screen.getBoundingClientRect();win.style.left=Math.max(0,Math.min(win.offsetLeft,r.width-Math.min(win.offsetWidth,160)))+'px';win.style.top=Math.max(32,Math.min(win.offsetTop,r.height-90))+'px';}
  function dragWindow(action,win,dx=0,dy=0){if(action==='start'&&win&&!win.classList.contains('fb-max')){activeDrag=win;front(win);}if(action==='move'&&activeDrag){activeDrag.style.left=activeDrag.offsetLeft+dx+'px';activeDrag.style.top=activeDrag.offsetTop+dy+'px';clamp(activeDrag);}if(action==='end'){activeDrag=null;save();}}
  screen.addEventListener('click',e=>{const launch=e.target.closest('[data-open]');if(launch)open(launch.dataset.open);const action=e.target.closest('[data-action]');if(action){const win=action.closest('.fb-window');if(action.dataset.action==='max'){if(win.classList.contains('fb-max')){win.classList.remove('fb-max');win.style.left=win.dataset.restoreX+'px';win.style.top=win.dataset.restoreY+'px';clamp(win);}else{win.dataset.restoreX=win.offsetLeft;win.dataset.restoreY=win.offsetTop;win.style.left='0px';win.style.top='32px';win.classList.add('fb-max');}}else win.hidden=true;save();}},{signal});
  let pointer=null;
  screen.addEventListener('pointerdown',e=>{const win=e.target.closest('.fb-window');if(win)front(win);if(e.target.closest('.fb-title')&&!e.target.closest('button')){pointer={id:e.pointerId,x:e.clientX,y:e.clientY};e.target.setPointerCapture?.(e.pointerId);dragWindow('start',win);}},{signal});
  screen.addEventListener('pointermove',e=>{if(pointer?.id!==e.pointerId)return;dragWindow('move',null,e.clientX-pointer.x,e.clientY-pointer.y);pointer.x=e.clientX;pointer.y=e.clientY;},{signal});
  for(const event of ['pointerup','pointercancel'])screen.addEventListener(event,()=>{pointer=null;dragWindow('end');},{signal});
  root.querySelector('.fb-exit').addEventListener('click',exit,{signal});
  const fsBtn=root.querySelector('.fb-fs');
  function syncFsLabel(){const on=!!(document.fullscreenElement||document.webkitFullscreenElement);if(fsBtn)fsBtn.textContent=on?'退出全屏':'全屏';}
  fsBtn?.addEventListener('click',()=>{const d=document;const on=!!(d.fullscreenElement||d.webkitFullscreenElement);try{if(on){(d.exitFullscreen||d.webkitExitFullscreen)?.call(d);}else{const el=d.documentElement;const fn=el.requestFullscreen||el.webkitRequestFullscreen;const r=fn?.call(el);r?.catch?.(()=>{});}}catch{}},{signal});
  for(const ev of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(ev,syncFsLabel,{signal});
  document.body.append(root);document.documentElement.classList.add('fb-active');
  function layout(rs){for(const [i,el]of [screen,root.querySelector('.fb-base')].entries()){const r=rs[i];for(const k of ['left','top','width','height'])el.style[k]=r[k]+'px';}for(const w of windows.values())clamp(w);}
  function destroy(){if(destroyed)return;destroyed=true;const restoreY=content.scrollTop;save();abort.abort();for(const {node,slot}of slots){slot.replaceWith(node);}root.remove();document.documentElement.classList.remove('fb-active');window.scrollTo(0,restoreY);storage.set('foldbook-boot',false);}
  try{layout(regions);dock(root,signal);keyboard(root,signal);trackpad(root,signal,dragWindow);front(browser);const read=storage.get('foldbook-read',null);content.scrollTop=read?.[location.pathname]??originalY;
    const time=root.querySelector('time');const tick=()=>{time.textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});};tick();const timer=setInterval(tick,30000);signal.addEventListener('abort',()=>clearInterval(timer),{once:true});
    if(!storage.get('foldbook-boot',false)&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const boot=document.createElement('div');boot.className='fb-boot';boot.innerHTML='<b>CS</b><span>法与 AI</span><i></i>';screen.append(boot);boot.addEventListener('animationend',()=>boot.remove(),{once:true});}storage.set('foldbook-boot',true);
  }catch(e){destroy();throw e;}
  return {layout,destroy,save};
  } catch(error) {
    const y=content.scrollTop||originalY;abort.abort();
    for(const {node,slot} of slots)if(slot.isConnected)slot.replaceWith(node);
    root.remove();document.documentElement.classList.remove('fb-active');window.scrollTo(0,y);throw error;
  }
}
