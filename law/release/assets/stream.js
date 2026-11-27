(() => {
 const stream=document.querySelector('.stream');
 if(!stream)return;
 const apps=document.querySelector('#appointment-home');
 const end=document.querySelector('.desk-end');
 const mobileLimit=Number(apps?.dataset.mobileLimit||10);
 const wide=matchMedia('(min-width: 731px)');let raf;
 const cards=()=>[...stream.querySelectorAll('.tile')];
 function fillDesk(hasNews){
   if(!apps)return;
   const rows=[...apps.querySelectorAll('.appointment')];
   let limit=Math.min(rows.length,mobileLimit);
   if(wide.matches&&hasNews&&rows.length){
     // Layout first, then measure the actual text wrapping at this viewport.
     rows.forEach(row=>{row.hidden=false});
     const bottom=stream.getBoundingClientRect().bottom;
     limit=rows.findIndex(row=>row.getBoundingClientRect().bottom>bottom-30);
     if(limit<0)limit=rows.length;
     limit=Math.max(1,limit);
   }
   rows.forEach((row,i)=>{row.hidden=i>=limit});
   if(end)end.hidden=limit<=mobileLimit;
 }
 function layout(){
   cancelAnimationFrame(raf);
   raf=requestAnimationFrame(()=>{
     const entries=cards();
     stream.classList.toggle('masonry',wide.matches);
     if(wide.matches)entries.forEach(el=>el.style.setProperty('--span',Math.ceil(el.getBoundingClientRect().height/4)));
     fillDesk(entries.length>0);
   });
 }
 const ro=window.ResizeObserver?new ResizeObserver(layout):null;
 const observe=()=>{ro?.disconnect();cards().forEach(el=>ro?.observe(el));layout()};
 wide.addEventListener('change',layout);
 window.addEventListener('resize',layout);
 document.addEventListener('law-layout',observe);observe();
})();
