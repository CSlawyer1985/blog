(() => {
 'use strict';
 const ink='#211d19', paper='#f5f0e5', red='#932a20', muted='#625950', rule='#c6b6a0';
 const W=1080, H=1440, serif='"Songti SC","Noto Serif CJK SC","SimSun",serif', sans='system-ui,sans-serif';
 let dialog, image, note, buttons, blob, object, filename, target, seq=0;
 const visible=(node,on)=>{node.hidden=!on};
 const truncate=(v,n)=>Array.from(v||'').length>n?Array.from(v).slice(0,n).join('')+'…':v||'';
 function split(ctx,str,max){
   const lines=[];let line='';
   for(const char of Array.from(str||'')){if(line&&ctx.measureText(line+char).width>max){lines.push(line);line=''}line+=char}
   if(line)lines.push(line);
   return lines;
 }
 function make(p){
   const url=new URL(p.url);
   if(url.origin!=='https://law.chenshi.ai')throw Error('不是法讯简报的正式链接');
   const cv=document.createElement('canvas');cv.width=W;cv.height=H;
   const c=cv.getContext('2d');c.textBaseline='top';
   const font=(weight,px,family=sans)=>{c.font=weight+' '+px+'px '+family};
   function txt(t,x,y,color=ink){c.fillStyle=color;c.fillText(t,x,y)}
   function centered(t,y,color=ink){txt(t,(W-c.measureText(t).width)/2,y,color)}
   function hr(y,color=rule,thick=2){c.fillStyle=color;c.fillRect(68,y,W-136,thick)}
   function paragraphs(str,x,y,wide,pace,limit,color=ink){
     const lines=split(c,str,wide);if(lines.length>limit){lines.length=limit;const ln=lines[limit-1];lines[limit-1]=ln.slice(0,-1)+'…'}
     lines.forEach((s,i)=>txt(s,x,y+i*pace,color));return y+lines.length*pace;
   }
   c.fillStyle=paper;c.fillRect(0,0,W,H);
   hr(56,ink,3);hr(65,ink);
   font(700,21);txt('公共法律资讯',70,90,muted);c.textAlign='right';txt('法规 · 裁判 · 监管 · 任免',1008,90,muted);c.textAlign='left';
   font(900,108,serif);centered('法讯简报',128);
   font(750,20);centered('T H E   L E G A L   B R I E F',263,red);
   hr(309,ink,4);hr(318,ink);
   const qr=window.qrcode(0,'M');qr.addData(url.href,'Byte');qr.make();
   const n=qr.getModuleCount(), px=Math.floor(400/(n+8)), size=px*(n+8), qrX=1008-size, qrY=H-size-68;
   const top=qrY-65;hr(top,ink,3);
   font(750,24);txt(p.kicker||'专题选刊',70,353,red);
   font(800,p.rows?58:66,serif);
   let y=paragraphs(p.title,70,413,935,p.rows?71:80,p.rows?2:3)+22;
   if(p.rows){
     font(600,24);y=paragraphs(p.meta,70,y,935,34,2,muted)+24;
     for(const row of p.rows){
       if(y+86>top-55)break;
       hr(y);
       font(750,20);txt(row.kind,70,y+14,red);
       font(750,34,serif);y=paragraphs(row.title,238,y+8,765,42,1)+21;
     }
     font(650,23);txt('海报节选 · 扫码打开完整筛选结果',70,top-38,muted);
   }else{
     font(650,25);y=paragraphs(p.meta,70,y,935,35,2,red)+18;
     hr(y);y+=24;
     font(500,36,serif);paragraphs(p.summary,70,y,935,54,Math.max(1,Math.floor((top-y-15)/54)),ink);
   }
   font(800,35,serif);txt('扫码读全文',70,top+38);
   font(550,23);txt('进入法讯简报查看来源与更多内容',70,top+100,muted);
   font(700,21);const manual=url.host+url.pathname+url.search+url.hash;
   const w=qrX-98, fits=manual.length<=95&&split(c,manual,w).length<=3;
   paragraphs(fits?manual:'网站入口：'+url.host,70,top+163,w,29,5,red);
   if(!fits){font(500,20);paragraphs('完整筛选地址请扫码',70,top+208,w,28,2,muted)}
   c.fillStyle='#fff';c.fillRect(qrX,qrY,size,size);
   c.fillStyle='#181511';
   for(let row=0;row<n;row++)for(let col=0;col<n;col++)if(qr.isDark(row,col))c.fillRect(qrX+(col+4)*px,qrY+(row+4)*px,px,px);
   hr(H-42,ink,2);
   return new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(Error('无法导出图片')),'image/png'));
 }
 function setup(){
   dialog=document.createElement('dialog');dialog.className='poster-dialog';
   dialog.innerHTML='<div class="poster-panel"><div class="poster-head"><h2>分享海报</h2><button type="button" data-close>关闭</button></div><p class="poster-note" role="status"></p><img alt="法讯简报分享海报"><div class="controls"><a data-download hidden>下载 PNG</a><button data-native type="button" hidden>分享图片</button><button data-copy type="button">复制链接</button><a data-target target="_blank" rel="noopener">打开链接 ↗</a></div></div>';
   dialog.setAttribute('aria-label','分享海报');
   document.body.append(dialog);
   image=dialog.querySelector('img');note=dialog.querySelector('.poster-note');buttons=dialog.querySelector('.controls');
   dialog.querySelector('[data-close]').onclick=()=>dialog.close();
   dialog.addEventListener('close',()=>{seq++; if(object){URL.revokeObjectURL(object);object=null}});
   buttons.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(target);note.textContent='链接已复制。'}catch{window.prompt('复制分享链接',target)}};
   buttons.querySelector('[data-native]').onclick=async()=>{try{await navigator.share({files:[new File([blob],filename,{type:'image/png'})]})}catch(e){if(e.name!=='AbortError')note.textContent='系统分享不可用，可下载 PNG 后转发。'}};
 }
 window.LawPoster=Object.freeze({open:async p=>{
   if(!dialog)setup();
   const ticket=++seq;target=p.url;filename=p.filename||'法讯简报.png';
   if(object){URL.revokeObjectURL(object);object=null}visible(image,false);
   const dl=buttons.querySelector('[data-download]'), native=buttons.querySelector('[data-native]');
   visible(dl,false);visible(native,false);buttons.querySelector('[data-target]').href=target;
   note.textContent='正在排版海报…';if(!dialog.open)dialog.showModal();
   try{
     await document.fonts?.ready;
     const result=await make(p);if(seq!==ticket)return;
     blob=result;object=URL.createObjectURL(blob);image.src=object;visible(image,true);
     dl.href=object;dl.download=filename;visible(dl,true);
     const file=new File([blob],filename,{type:'image/png'});
     visible(native,!!navigator.canShare?.({files:[file]}));
     note.textContent='扫码打开原网页。可下载图片保存或转发。';
   }catch{if(seq===ticket)note.textContent='无法生成这张海报。若选项太多，请缩小范围，或直接复制链接。'}
 }});
})();
