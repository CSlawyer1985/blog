/* learn.chenshi.ai 课件共享引擎 · lesson-engine.js
   版式：land（1920×1080，桌面/投影/横屏） / port（宽 1080，高随屏幕，手机竖屏，真实重排）
   提供：缓动与关键帧、文字（富文本/换行/发光贴图缓存）、卡片阴影贴图、纸带、背景、提示语与进度、
         键盘/点按/滑动/拖动交互、?step= 深链、window.HL 截图接口、共享字体加载。 */
(function(){
'use strict';
const LE=window.LE={};
const FONT='"HSerif","Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC","SimSun",serif';
const C=LE.C={IVORY:'#F4EDDF',GOLD:'#E2AA42',GOLD_HI:'#FFD062',PALE:'#FFE9B8',DIM:'rgba(244,237,223,0.64)',DIM2:'rgba(244,237,223,0.40)',
  RED:'#F07A62',GREEN:'#5BD6A0',ICE:'#8FD8FF',BLUE:'#7FB2FF',PURPLE:'#C3A0FF',INK:'#030303'};
const GLOWC={[C.ICE]:'rgba(120,200,255,0.6)',[C.RED]:'rgba(240,110,80,0.6)',[C.GREEN]:'rgba(80,210,150,0.55)',[C.BLUE]:'rgba(110,160,255,0.6)',[C.PURPLE]:'rgba(180,140,255,0.6)'};

/* ---------------- 数学与缓动 ---------------- */
const clamp=LE.clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=LE.lerp=(a,b,t)=>a+(b-a)*t;
const ease=LE.ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
LE.easeCam=t=>t<.5?16*t**5:1-Math.pow(-2*t+2,5)/2;
LE.easeOut=t=>1-Math.pow(1-t,3);
LE.easeBack=t=>{const c1=1.4,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};
const seg=LE.seg=(G,a,b)=>ease(clamp((G-a)/(b-a)));
LE.lin=(G,a,b)=>clamp((G-a)/(b-a));
LE.kf=function(G,pts,fn=ease){if(G<=pts[0][0])return pts[0][1];for(let i=0;i<pts.length-1;i++){if(G<=pts[i+1][0]){const a=pts[i],b=pts[i+1];return lerp(a[1],b[1],fn((G-a[0])/(b[0]-a[0])));}}return pts[pts.length-1][1];};
LE.bump=(G,c,w)=>clamp(1-Math.abs(G-c)/w);
LE.damp=(cur,tgt,dt,k=12)=>cur+(tgt-cur)*(1-Math.exp(-dt*k));
LE.mulberry=function(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
LE.qbez=(p0,p1,p2,t)=>({x:(1-t)*(1-t)*p0.x+2*(1-t)*t*p1.x+t*t*p2.x,y:(1-t)*(1-t)*p0.y+2*(1-t)*t*p1.y+t*t*p2.y});

/* ---------------- 画布与版式 ---------------- */
const cv=document.getElementById('c'),ctx=cv.getContext('2d',{alpha:false});LE.cv=cv;LE.ctx=ctx;
const LY=LE.LY={mode:'land',W:1920,H:1080,k:1,port:false};
const view=LE.view={s:1,ox:0,oy:0,dpr:1};
let resizeHooks=[];LE.onResize=f=>resizeHooks.push(f);
function resize(){const w=innerWidth,h=innerHeight,asp=w/h;
  if(asp<0.85){LY.mode='port';LY.W=1080;LY.H=Math.round(clamp(1080/asp,1560,2400));LY.k=1;}
  else{LY.mode='land';LY.W=1920;LY.H=1080;LY.k=(h<560)?1.25:(h<760?1.1:1);}
  LY.port=LY.mode==='port';
  const dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.width=w+'px';cv.style.height=h+'px';
  const s=Math.min(w/LY.W,h/LY.H);Object.assign(view,{s,ox:(w-LY.W*s)/2,oy:(h-LY.H*s)/2,dpr});
  bgCache=null;resizeHooks.forEach(f=>f());}

/* ---------------- 文字 ---------------- */
const mcache=new Map();
const font=LE.font=(size,weight)=>`${weight||400} ${size}px ${FONT}`;
const measure=LE.measure=function(t,size,weight){const k=t+'|'+(weight||400);let v=mcache.get(k);if(v===undefined){ctx.font=font(100,weight);v=ctx.measureText(t).width/100;mcache.set(k,v);}return v*size;};
const text=LE.text=function(str,x,y,size,color,alpha=1,weight=400,align='center'){if(alpha<=0.003||str===''||str==null)return;const pa=ctx.globalAlpha;ctx.globalAlpha=pa*Math.min(1,alpha);ctx.font=font(size,weight);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(str,x,y);ctx.globalAlpha=pa;};
// 发光文字：预渲染成贴图缓存（按屏幕缩放分档），不再每帧 shadowBlur
const gcache=new Map();
const glowText=LE.glowText=function(str,x,y,size,color,alpha=1,weight=700,blur=0.45,align='center',sc){
  if(alpha<=0.003||!str)return;sc=sc||GLOWC[color]||'rgba(255,186,60,0.6)';
  const m=ctx.getTransform();const scale=Math.hypot(m.a,m.b)||1;const q=Math.pow(2,Math.round(Math.log2(scale)*6)/6);
  const key=str+'|'+size+'|'+weight+'|'+color+'|'+blur+'|'+sc+'|'+q;let sp=gcache.get(key);
  if(!sp){const w=measure(str,size,weight),pad=size*blur*1.25+4,cw=Math.ceil((w+2*pad)*q),ch=Math.ceil((size*1.5+2*pad)*q);
    const c=document.createElement('canvas');c.width=Math.max(1,cw);c.height=Math.max(1,ch);const g=c.getContext('2d');g.scale(q,q);
    g.font=font(size,weight);g.textAlign='left';g.textBaseline='middle';g.shadowColor=sc;g.shadowBlur=size*blur*q;g.fillStyle=color;g.fillText(str,pad,ch/q/2);
    g.shadowBlur=0;g.fillText(str,pad,ch/q/2);
    sp={c,w,pad,h:ch/q,ww:cw/q};if(gcache.size>700){let n=0;for(const k of gcache.keys()){gcache.delete(k);if(++n>250)break;}}gcache.set(key,sp);}
  const x0=align==='center'?x-sp.w/2:(align==='right'?x-sp.w:x);
  const pa=ctx.globalAlpha;ctx.globalAlpha=pa*Math.min(1,alpha);ctx.drawImage(sp.c,x0-sp.pad,y-sp.h/2,sp.ww,sp.h);ctx.globalAlpha=pa;};
function parseRich(str){const parts=[];str.split(/(\{[^}]*\})/).forEach(s=>{if(!s)return;if(s[0]==='{')parts.push([s.slice(1,-1),1]);else parts.push([s,0]);});return parts;}
// 富文本：{高亮}；opt.maxW 自动换行（中文按字，优先在标点后断），opt.align/valign/color/weight/lh/hl
const rich=LE.rich=function(str,x,y,size,alpha=1,opt={}){if(alpha<=0.003||!str)return 0;const bw=opt.weight||400,maxW=opt.maxW||0,lh=opt.lh||size*1.42,hl=opt.hl||C.GOLD_HI;
  const chars=[];parseRich(str).forEach(([t,h])=>{for(const c of t)chars.push([c,h]);});const lines=[[]];let cw=0;
  if(maxW){let lb=-1;for(let i=0;i<chars.length;i++){const [c,h]=chars[i];const w=measure(c,size,h?700:bw);const ln=lines[lines.length-1];
      if(cw+w>maxW&&ln.length&&!'，。、：；？！」）》”’%'.includes(c)){let cut=lb>=0&&ln.length-lb<9?lb+1:ln.length;if(/[A-Za-z0-9]/.test(c)){let j=ln.length;while(j>0&&/[A-Za-z0-9._\-]/.test(ln[j-1][0]))j--;if(j>0&&ln.length-j<14)cut=j;}
        const carry=ln.splice(cut);lines.push(carry);cw=carry.reduce((s,[c2,h2])=>s+measure(c2,size,h2?700:bw),0);lb=-1;}
      if(!(lines[lines.length-1].length===0&&c===' ')){lines[lines.length-1].push([c,h]);cw+=w;}if('，、：；。？！ ）·—'.includes(c))lb=lines[lines.length-1].length-1;}}
  else chars.forEach(c=>lines[0].push(c));
  const n=lines.length,y0=opt.valign==='top'?y:(opt.valign==='bottom'?y-(n-1)*lh:y-(n-1)*lh/2);
  lines.forEach((ln,li)=>{const runs=[];ln.forEach(([c,h])=>{if(runs.length&&runs[runs.length-1][1]===h)runs[runs.length-1][0]+=c;else runs.push([c,h]);});
    let tw=0;runs.forEach(r=>{r[2]=measure(r[0],size,r[1]?700:bw);tw+=r[2];});let x0=opt.align==='left'?x:(opt.align==='right'?x-tw:x-tw/2);const yy=y0+li*lh;
    runs.forEach(r=>{if(r[1])glowText(r[0],x0,yy,size,hl,alpha,700,0.42,'left');else text(r[0],x0,yy,size,opt.color||C.IVORY,alpha,bw,'left');x0+=r[2];});});return n;};
LE.richLines=function(str,size,maxW,weight){/* 估算行数 */let n=1,cw=0;for(const c of str.replace(/[{}]/g,'')){const w=measure(c,size,weight);if(cw+w>maxW){n++;cw=w;}else cw+=w;}return n;};
LE.fitText=function(str,x,y,size,maxW,color,alpha,weight,align){const w=measure(str,size,weight);if(w>maxW)size*=maxW/w;text(str,x,y,size,color,alpha,weight,align);return size;};
LE.brandMark=function(x,y,size,alpha){if(alpha<=0.003)return;const a='陈石律师',d='  ·  ',b='chenshi.ai';
  const wa=measure(a,size*0.8),wd=measure(d,size*0.8),wb=measure(b,size,700),tw=wa+wd+wb;let x0=x-tw/2;
  text(a,x0,y,size*0.8,C.IVORY,alpha*0.78,400,'left');x0+=wa;text(d,x0,y,size*0.8,C.GOLD,alpha*0.8,400,'left');x0+=wd;glowText(b,x0,y,size,C.GOLD_HI,alpha,700,0.3,'left');
  const L1=size*2.2,gap=size*0.9;const pa=ctx.globalAlpha;ctx.globalAlpha=pa*alpha*0.7;
  [[x-tw/2-gap-L1,x-tw/2-gap,0],[x+tw/2+gap,x+tw/2+gap+L1,1]].forEach(([u,v,dir])=>{const g=ctx.createLinearGradient(u,0,v,0);g.addColorStop(dir?1:0,'rgba(226,170,66,0)');g.addColorStop(dir?0:1,'rgba(226,170,66,0.9)');ctx.fillStyle=g;ctx.fillRect(u,y-0.75,v-u,1.5);});ctx.globalAlpha=pa;};

/* ---------------- 形状与贴图 ---------------- */
const rr=LE.rr=function(x,y,w,h,r){r=Math.max(0,Math.min(r,h/2,w/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();};
function mkSprite(stops){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const gr=g.createRadialGradient(64,64,0,64,64,64);stops.forEach(s=>gr.addColorStop(s[0],s[1]));g.fillStyle=gr;g.fillRect(0,0,128,128);return c;}
LE.mkSprite=mkSprite;
const SPR=LE.SPR={
  HALO:mkSprite([[0,'rgba(255,228,170,0.9)'],[0.12,'rgba(255,196,96,0.55)'],[0.4,'rgba(226,150,46,0.16)'],[1,'rgba(200,120,30,0)']]),
  CORE:mkSprite([[0,'rgba(255,250,235,1)'],[0.25,'rgba(255,226,160,0.9)'],[0.6,'rgba(255,190,80,0.25)'],[1,'rgba(255,170,60,0)']]),
  RED:mkSprite([[0,'rgba(255,200,180,0.95)'],[0.2,'rgba(240,110,80,0.5)'],[1,'rgba(200,60,40,0)']]),
  ICE:mkSprite([[0,'rgba(220,245,255,0.95)'],[0.2,'rgba(120,200,255,0.5)'],[1,'rgba(40,120,200,0)']]),
  GREEN:mkSprite([[0,'rgba(200,255,225,0.95)'],[0.2,'rgba(80,210,150,0.5)'],[1,'rgba(20,120,80,0)']]),
  PURPLE:mkSprite([[0,'rgba(235,220,255,0.95)'],[0.2,'rgba(180,140,255,0.5)'],[1,'rgba(90,50,180,0)']]),
  SOFT:mkSprite([[0,'rgba(150,100,30,0.30)'],[0.55,'rgba(60,38,10,0.08)'],[1,'rgba(0,0,0,0)']])};
const glow=LE.glow=function(x,y,r,a=1,spr=SPR.HALO){if(a<=0.003||r<=0.2)return;const pa=ctx.globalAlpha;ctx.globalAlpha=pa*Math.min(1,a);ctx.drawImage(spr,x-r,y-r,2*r,2*r);ctx.globalAlpha=pa;};
LE.glowAdd=function(x,y,r,a,spr){const o=ctx.globalCompositeOperation;ctx.globalCompositeOperation='lighter';glow(x,y,r,a,spr);ctx.globalCompositeOperation=o;};
// 卡片投影：按尺寸缓存一张模糊贴图（低分辨率），每帧只 drawImage
const scache=new Map();
function shadowSprite(w,h,r,blur){const qw=Math.max(8,Math.round(w/16)*16),qh=Math.max(8,Math.round(h/16)*16);const key=qw+'x'+qh+'r'+r+'b'+blur;let s=scache.get(key);
  if(!s){const k=0.5,pad=blur*2;const c=document.createElement('canvas');c.width=Math.ceil((qw+2*pad)*k);c.height=Math.ceil((qh+2*pad)*k);const g=c.getContext('2d');g.scale(k,k);
    g.shadowColor='rgba(0,0,0,0.85)';g.shadowBlur=blur*k;g.shadowOffsetX=(qw+2*pad)*4*k;g.fillStyle='#000';
    g.beginPath();const x=pad-(qw+2*pad)*4,y=pad;const rr2=Math.min(r,qw/2,qh/2);g.moveTo(x+rr2,y);g.arcTo(x+qw,y,x+qw,y+qh,rr2);g.arcTo(x+qw,y+qh,x,y+qh,rr2);g.arcTo(x,y+qh,x,y,rr2);g.arcTo(x,y,x+qw,y,rr2);g.closePath();g.fill();
    s={c,pad,qw,qh};if(scache.size>300)scache.clear();scache.set(key,s);}return s;}
LE.shadow=function(x,y,w,h,r=12,blur=30,dy=12,a=1){if(a<=0.01)return;const s=shadowSprite(w,h,r,blur);const sx=w/s.qw,sy=h/s.qh;const pa=ctx.globalAlpha;ctx.globalAlpha=pa*a;
  ctx.drawImage(s.c,x-s.pad*sx,y+dy-s.pad*sy,(s.qw+2*s.pad)*sx,(s.qh+2*s.pad)*sy);ctx.globalAlpha=pa;};
// 卡片：fill 可为颜色或 [上,下] 渐变；stroke 描边色
LE.card=function(x,y,w,h,o={}){const a=o.a==null?1:o.a;if(a<=0.003||w<=0||h<=0)return;const r=o.r==null?12:o.r;const pa=ctx.globalAlpha;
  if(o.shadow!==false)LE.shadow(x,y,w,h,r,o.blur||28,o.dy==null?10:o.dy,a*(o.shadowA||0.9));
  ctx.globalAlpha=pa*a;rr(x,y,w,h,r);
  const f=o.fill||['rgba(40,30,14,0.92)','rgba(16,12,6,0.94)'];if(Array.isArray(f)){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,f[0]);g.addColorStop(1,f[1]);ctx.fillStyle=g;}else ctx.fillStyle=f;ctx.fill();
  if(o.stroke!==null){ctx.strokeStyle=o.stroke||'rgba(226,170,66,0.75)';ctx.lineWidth=o.lw||1.5;ctx.stroke();}
  ctx.globalAlpha=pa;};
LE.arrowHead=function(x,y,ang,sz,col,a=1){const pa=ctx.globalAlpha;ctx.globalAlpha=pa*a;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-sz*Math.cos(ang-0.45),y-sz*Math.sin(ang-0.45));ctx.lineTo(x-sz*Math.cos(ang+0.45),y-sz*Math.sin(ang+0.45));ctx.closePath();ctx.fill();ctx.globalAlpha=pa;};
LE.line=function(x1,y1,x2,y2,col,lw=1.5,a=1,dash){if(a<=0.003)return;const pa=ctx.globalAlpha;ctx.globalAlpha=pa*a;ctx.strokeStyle=col;ctx.lineWidth=lw;if(dash)ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();if(dash)ctx.setLineDash([]);ctx.globalAlpha=pa;};

/* ---------------- 纸带（全站统一的核心意象） ---------------- */
const FIBER=(()=>{const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d'),r=LE.mulberry(7);
  for(let i=0;i<900;i++){const x=r()*512,y=r()*128,l=6+r()*40;g.strokeStyle=`rgba(255,215,150,${0.015+r()*0.04})`;g.lineWidth=0.6+r()*0.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+l,y+(r()-0.5)*3);g.stroke();}return c;})();
let FIBER_PAT=null;
// 横向纸带（x0..x1，中心线 y，厚 th）。vert=true 时为竖向（y0..y1，中心线 x）
LE.tape=function(a0,a1,c,th,o={}){const a=o.a==null?1:o.a;if(a<=0.003||a1<=a0)return;const pa=ctx.globalAlpha;ctx.save();
  if(o.vert){ctx.translate(c,0);ctx.rotate(Math.PI/2);ctx.translate(0,0);c=0;}
  const x=a0,w=a1-a0,y=c-th/2;
  LE.shadow(x,y,w,th,4,30,14,a*0.9);
  ctx.globalAlpha=pa*a;const g=ctx.createLinearGradient(0,y,0,y+th);g.addColorStop(0,'rgba(82,58,20,0.78)');g.addColorStop(0.5,'rgba(26,18,8,0.86)');g.addColorStop(1,'rgba(82,58,20,0.78)');
  ctx.fillStyle=g;ctx.fillRect(x,y,w,th);if(!FIBER_PAT)FIBER_PAT=ctx.createPattern(FIBER,'repeat');ctx.fillStyle=FIBER_PAT;ctx.fillRect(x,y,w,th);
  ctx.fillStyle='rgba(236,184,78,0.9)';ctx.fillRect(x,y-1,w,1.8);ctx.fillRect(x,y+th-0.8,w,1.8);
  const step=o.holeStep||34,off=((o.scroll||0)%step+step)%step;ctx.fillStyle='rgba(3,3,3,0.95)';
  if(o.holes!==false)for(let hx=x+off+8;hx<x+w-6;hx+=step){ctx.fillRect(hx-2,y+7,4,4);ctx.fillRect(hx-2,y+th-11,4,4);}
  ctx.restore();ctx.globalAlpha=pa;};
// 纸带上的词块
LE.block=function(x,y,w,h,o={}){const a=o.a==null?1:o.a;if(a<=0.003||w<=1)return;const pa=ctx.globalAlpha;ctx.globalAlpha=pa*a;rr(x,y,w,h,o.r==null?8:o.r);
  const st=o.style||'gold';const P={gold:['rgba(226,170,66,0.18)','rgba(226,170,66,0.06)','rgba(226,170,66,0.8)'],hot:['rgba(255,208,98,0.30)','rgba(255,186,66,0.12)',C.GOLD_HI],
    ice:['rgba(143,216,255,0.24)','rgba(143,216,255,0.08)',C.ICE],red:['rgba(240,122,98,0.24)','rgba(240,122,98,0.08)',C.RED],green:['rgba(91,214,160,0.22)','rgba(91,214,160,0.07)',C.GREEN],
    dim:['rgba(244,237,223,0.07)','rgba(244,237,223,0.03)','rgba(244,237,223,0.28)'],think:['rgba(195,160,255,0.16)','rgba(195,160,255,0.05)','rgba(195,160,255,0.65)'],amber:['rgba(255,190,80,0.42)','rgba(200,120,30,0.22)','#FFC860']}[st]||st;
  const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,P[0]);g.addColorStop(1,P[1]);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=P[2];ctx.lineWidth=o.lw||1.4;if(o.dash)ctx.setLineDash(o.dash);ctx.stroke();if(o.dash)ctx.setLineDash([]);ctx.globalAlpha=pa;};

/* ---------------- 背景 ---------------- */
let bgCache=null;const DUST=[];{const r=LE.mulberry(9);for(let i=0;i<150;i++)DUST.push({x:r(),y:r(),s:0.6+r()*1.7,a:0.05+r()*0.22,ph:r()*6.28,d:0.3+r()*0.7});}
function buildBg(){const c=document.createElement('canvas');const W=LY.W,H=LY.H,k=view.s*view.dpr;c.width=Math.round(W*k);c.height=Math.round(H*k);const g=c.getContext('2d',{alpha:false});g.scale(k,k);
  g.fillStyle=C.INK;g.fillRect(0,0,W,H);const gr=LY.port?1100:960;g.drawImage(SPR.SOFT,W/2-gr,H/2-gr,2*gr,2*gr);
  const vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*0.36,W/2,H/2,Math.max(W,H)*0.68);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.6)');g.fillStyle=vg;g.fillRect(0,0,W,H);bgCache=c;}
// 背景：近黑底 + 暖光 + 视差金尘（px,py 为镜头位移，金尘按景深反向漂移，配合镜头产生空间感）
// 底色+暖光+暗角预渲染为一张图，每帧只画一次（软件渲染下全屏填充是主要开销）
LE.bg=function(amb,px=0,py=0){const W=LY.W,H=LY.H;if(!bgCache)buildBg();ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bgCache,Math.round(view.ox*view.dpr),Math.round(view.oy*view.dpr));ctx.restore();
  ctx.fillStyle='#FFDCA0';for(const d of DUST){const x=(((d.x*W-px*d.d*0.25+amb*6*d.d)%W)+W)%W,y=(((d.y*H-py*d.d*0.25-amb*9*d.d)%H)+H)%H;ctx.globalAlpha=d.a*(0.55+0.45*Math.sin(amb*1.3+d.ph));ctx.fillRect(x,y,d.s,d.s);}ctx.globalAlpha=1;};
LE.vignette=function(){};
// 镜头：把世界坐标 (cx,cy) 放到画面中心，缩放 z
LE.camera=function(cx,cy,z,ox,oy){ctx.translate(ox==null?LY.W/2:ox,oy==null?LY.H/2:oy);ctx.scale(z,z);ctx.translate(-cx,-cy);};

/* ---------------- 标题 / 收束 / 提示语 / 进度 ---------------- */
LE.title=function(title,sub,intro,out,o={}){const W=LY.W,H=LY.H,P=LY.port;if(out>=1)return;const lines=P&&o.portLines?o.portLines:[title];
  let fs=P?(o.portSize||118):(o.size||104);{const mw=Math.max(...lines.map(l=>measure(l,fs,700)));const lim=P?960:1640;if(mw>lim)fs*=lim/mw;}const lh=P?fs*1.32:0,y0=P?0.36*H:(o.y||440);
  glow(W/2,y0+(lines.length-1)*lh/2,P?620:760,0.9*intro*(1-out),SPR.SOFT);
  const r=LE.mulberry(8);let ci=0;
  lines.forEach((ln,li)=>{const tw=measure(ln,fs,700);let x=W/2-tw/2;for(const ch of ln){const cw=measure(ch,fs,700),ca=seg(intro,0.06+ci*0.035,0.36+ci*0.035);
    const dx=(r()-0.5)*200*out,dy=-(30+r()*120)*out;glowText(ch,x+cw/2+dx,y0+li*lh+(1-ca)*22+dy,fs,C.PALE,ca*(1-out),700,0.3);x+=cw;ci++;}});
  const ly=y0+(lines.length-1)*lh+(P?100:86),lw=(P?720:800)*seg(intro,0.3,0.85)*(1-out);
  const pa=ctx.globalAlpha;ctx.globalAlpha=pa*(1-out);const lg=ctx.createLinearGradient(W/2-lw/2,0,W/2+lw/2,0);lg.addColorStop(0,'rgba(255,200,90,0)');lg.addColorStop(0.5,'rgba(255,214,120,0.95)');lg.addColorStop(1,'rgba(255,200,90,0)');ctx.fillStyle=lg;ctx.fillRect(W/2-lw/2,ly,lw,2);ctx.globalAlpha=pa;
  rich(sub,W/2,ly+(P?84:62),P?44:32,seg(intro,0.5,1)*(1-out),{maxW:P?940:0,color:C.DIM,valign:P?'top':undefined});
  LE.brandMark(W/2,P?0.8*H:Math.min(H-150,ly+250),P?40:30*LY.k,seg(intro,0.7,1)*(1-out));};
// 收束页：三行结论 + 注 + 署名（场景不黑屏，压暗到 0.25 作为底）
LE.finale=function(lines,fA,note,o={}){if(fA<=0.01)return;const W=LY.W,H=LY.H,P=LY.port;
  const pa=ctx.globalAlpha;ctx.globalAlpha=pa*fA*0.78;ctx.fillStyle='#030303';ctx.fillRect(0,0,W,H);ctx.globalAlpha=pa;glow(W/2,P?0.42*H:H*0.42,P?700:820,0.8*fA,SPR.SOFT);
  const fs=P?48:40,lh=P?0:100,y=P?0.24*H:(o.y||290);let yy=y;
  lines.forEach((ln,i)=>{const a=fA*seg(fA,0.15+i*0.18,0.5+i*0.18);if(P){const n=rich(ln,W/2,yy,fs,a,{maxW:960,valign:'top',lh:fs*1.38});yy+=n*fs*1.38+70;}else{rich(ln,W/2,y+i*lh,fs,a);yy=y+i*lh+lh;}});
  if(note)rich(note,W/2,P?yy+30:yy+16,P?28:22,fA*seg(fA,0.6,1),{maxW:P?940:1500,color:C.DIM2,valign:'top',lh:P?42:34});
  LE.brandMark(W/2,P?H-210:H-150,P?38:26*LY.k,fA*seg(fA,0.6,1));};
LE.hintY=()=>LY.port?Math.round(0.082*LY.H):96;
function drawHint(G){const S=E.steps,LAST=S.length-1,lo=Math.floor(G),hi=Math.min(LAST,Math.ceil(G));const ta=S[lo].hint,tb=S[hi].hint,f=G-lo;
  const y=LE.hintY(),sz=LY.port?44:34*LY.k,op=LY.port?{maxW:960,valign:'top',lh:62}:{maxW:1700};
  if(ta===tb){rich(ta,LY.W/2,y,sz,0.95,op);return;}rich(ta,LY.W/2,y-(LY.port?0:clamp(f*3)*8),sz,0.95*(1-clamp(f*3)),op);rich(tb,LY.W/2,y+(LY.port?0:(1-clamp((f-0.45)*3))*8),sz,0.95*clamp((f-0.45)*3),op);}
function hintMask(){const P=LY.port,h=P?LE.hintY()+150:150;const g=ctx.createLinearGradient(0,0,0,h+70);g.addColorStop(0,P?'rgba(3,3,3,0.96)':'rgba(3,3,3,0.7)');g.addColorStop(h/(h+70),P?'rgba(3,3,3,0.85)':'rgba(3,3,3,0.35)');g.addColorStop(1,'rgba(3,3,3,0)');ctx.fillStyle=g;ctx.fillRect(0,0,LY.W,h+70);}
function drawProgress(G){const S=E.steps,LAST=S.length-1,i=Math.round(G),st=S[i],label=`${String(st.scene).padStart(2,'0')} · ${E.scenes[st.scene]}`;
  if(LY.port){const y=LY.H-64;text(label+'      '+(i+1)+' / '+S.length,540,y,28,'rgba(244,237,223,0.5)');ctx.fillStyle='rgba(244,237,223,0.15)';ctx.fillRect(240,y+28,600,2);ctx.fillStyle=C.GOLD;ctx.fillRect(240,y+28,600*G/LAST,2);return;}
  text(label,1860,1040,18,'rgba(244,237,223,0.55)',1,400,'right');const x0=1660,x1=1860,y=1058;ctx.fillStyle='rgba(244,237,223,0.15)';ctx.fillRect(x0,y,x1-x0,2);ctx.fillStyle=C.GOLD;ctx.fillRect(x0,y,(x1-x0)*G/LAST,2);
  text(`${i+1} / ${S.length}`,x0-14-measure(label,18),1040,18,'rgba(244,237,223,0.4)',1,400,'right');}
// 交互提示：脉动的「拖动」标记
LE.dragHint=function(x,y,label,amb,a=1,o={}){if(a<=0.01)return;const pul=0.5+0.5*Math.sin(amb*4);LE.glowAdd(x,y,(o.r||26)+10*pul,0.6*a);
  ctx.globalAlpha=a;ctx.beginPath();ctx.arc(x,y,o.dot||11,0,Math.PI*2);ctx.fillStyle=C.PALE;ctx.fill();ctx.globalAlpha=1;
  if(label)text(label,x+(o.dx||0),y+(o.dy==null?(LY.port?64:52):o.dy),LY.port?30:22,C.GOLD_HI,a*(0.6+0.4*pul),700);};

/* ---------------- 播放与交互 ---------------- */
const E={steps:[],scenes:[],SI:{}};LE.E=E;
let G=0,target=0,anim=null,auto=false,frozenAmb=null,lastNow=0,dragging=null,pd=null;const t0=performance.now();
LE.isAt=id=>!anim&&Math.abs(G-E.SI[id])<1e-6;
LE.dragging=()=>dragging&&dragging.id;
function go(i){const LAST=E.steps.length-1;i=clamp(Math.round(i),0,LAST);if(i===target&&!anim)return;const from=G,fwd=i===Math.round(target)+1&&i>from;
  const dur=fwd?E.steps[i].dur:Math.min(950,380+Math.abs(i-from)*60);target=i;anim={from,to:i,start:performance.now(),dur,linear:fwd};E.onGo&&E.onGo(i);}
LE.go=go;
function frame(now){const dt=lastNow?Math.min(0.05,(now-lastNow)/1000):0.016;lastNow=now;const LAST=E.steps.length-1;
  if(anim){const p=clamp((now-anim.start)/anim.dur);G=anim.linear?lerp(anim.from,anim.to,p):lerp(anim.from,anim.to,ease(p));if(p>=1){G=anim.to;anim=null;if(auto&&G<LAST)setTimeout(()=>auto&&go(target+1),900);}}
  paint(G,frozenAmb!==null?frozenAmb:(now-t0)/1000,dt);requestAnimationFrame(frame);}
function paint(g,amb,dt){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#000';{const d=view.dpr,ox=Math.ceil(view.ox*d)+1,oy=Math.ceil(view.oy*d)+1;if(ox>1){ctx.fillRect(0,0,ox,cv.height);ctx.fillRect(cv.width-ox,0,ox,cv.height);}if(oy>1){ctx.fillRect(0,0,cv.width,oy);ctx.fillRect(0,cv.height-oy,cv.width,oy);}}
  ctx.setTransform(view.s*view.dpr,0,0,view.s*view.dpr,view.ox*view.dpr,view.oy*view.dpr);ctx.save();ctx.beginPath();ctx.rect(0,0,LY.W,LY.H);ctx.clip();
  ctx.save();E.render(g,amb,dt);ctx.restore();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  LE.vignette();hintMask();if(!E.noHint)drawHint(g);drawProgress(g);ctx.restore();}
function toDesign(e){return{x:(e.clientX-view.ox)/view.s,y:(e.clientY-view.oy)/view.s};}
function hitDrag(pt){if(anim||!E.drags)return null;const st=E.steps[target];if(!st.inter)return null;for(const d of E.drags){if(d.step!==st.id)continue;if(d.hit(pt))return d;}return null;}
LE.run=function(cfg){Object.assign(E,cfg);E.steps.forEach((s,i)=>E.SI[s.id]=i);
  addEventListener('keydown',e=>{if(e.target.id==='lesson-back')return;const k=e.key;
    if(k==='ArrowRight'||k===' '||k==='PageDown'||k==='Enter'||k==='ArrowDown'){e.preventDefault();go(target+1);}
    else if(k==='ArrowLeft'||k==='PageUp'||k==='Backspace'||k==='ArrowUp'){e.preventDefault();go(target-1);}
    else if(k==='Home')go(0);else if(k==='End')go(E.steps.length-1);else if(k==='f'||k==='F')toggleFS();else if(k==='a'||k==='A'){auto=!auto;if(auto)go(target+1);}});
  cv.addEventListener('pointerdown',e=>{const pt=toDesign(e);dragging=hitDrag(pt);if(dragging){cv.setPointerCapture(e.pointerId);dragging.move(pt,true);}pd={x:e.clientX,y:e.clientY,b:e.button};});
  cv.addEventListener('pointermove',e=>{if(dragging)dragging.move(toDesign(e));else if(e.pointerType==='mouse'){const h=hitDrag(toDesign(e));cv.style.cursor=h?(h.cursor||'grab'):'default';}});
  cv.addEventListener('pointerup',e=>{if(dragging){dragging.end&&dragging.end();dragging=null;pd=null;return;}if(!pd)return;const dx=e.clientX-pd.x,dy=e.clientY-pd.y,b=pd.b;pd=null;
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2){dx<0?go(target+1):go(target-1);return;}if(Math.abs(dx)<14&&Math.abs(dy)<14){if(b===2)return;e.shiftKey?go(target-1):go(target+1);}});
  cv.addEventListener('pointercancel',()=>{dragging=null;pd=null;});
  cv.addEventListener('contextmenu',e=>{e.preventDefault();go(target-1);});
  ['touchmove','gesturestart','dblclick'].forEach(ev=>document.addEventListener(ev,e=>{if(e.target.id==='fs'||e.target.id==='lesson-back')return;if(e.cancelable)e.preventDefault();},{passive:false}));
  const fsBtn=document.getElementById('fs');
  if(fsBtn){if(!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen))fsBtn.style.display='none';
    fsBtn.addEventListener('pointerup',e=>{e.stopPropagation();toggleFS();});fsBtn.addEventListener('pointerdown',e=>e.stopPropagation());}
  addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,200));resize();
  // 截图 / 调试接口：HL.seek(g, amb, state) 立即定格到任意进度（含小数，即动画中间帧）
  window.HL={STEPS:E.steps,SCENES:E.scenes,seek:(g,a,st)=>{anim=null;G=g;target=Math.round(g);if(a!==undefined)frozenAmb=a;E.onSeek&&E.onSeek(g,st||{});paint(G,frozenAmb??0,1);},
    go,get G(){return G;},get mode(){return LY.mode;},ready:false};
  const q=new URLSearchParams(location.search);
  const fontsReady=document.fonts?Promise.race([Promise.all([document.fonts.load(font(40,400),'陈石'),document.fonts.load(font(40,700),'陈石')]),new Promise(r=>setTimeout(r,2500))]):Promise.resolve();
  fontsReady.catch(()=>{}).then(()=>{mcache.clear();gcache.clear();const s=q.get('step');if(s!==null&&/^\d+$/.test(s)){G=target=clamp(+s,0,E.steps.length-1);E.onGo&&E.onGo(target);}
    if(q.get('t')!==null)frozenAmb=+q.get('t');window.HL.ready=true;requestAnimationFrame(frame);});};
function toggleFS(){const d=document,el=d.documentElement;try{if(!(d.fullscreenElement||d.webkitFullscreenElement))(el.requestFullscreen||el.webkitRequestFullscreen).call(el);else(d.exitFullscreen||d.webkitExitFullscreen).call(d);}catch(err){}}
LE.S=(id,scene,dur,hint,inter)=>({id,scene,dur,hint,inter});
})();
