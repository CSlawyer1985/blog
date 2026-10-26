// Both native pointer movement and the virtual trackpad use the same proximity curve.
export function dockScale(distance, reduced = false) {
  return reduced ? 1 : 1 + .65 * Math.max(0, 1 - Math.abs(distance) / 100) ** 2;
}
export function dock(root, signal) {
  const shelf=root.querySelector('.fb-dock'), buttons=[...shelf.querySelectorAll('button')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function update(x,y) {
    const r=shelf.getBoundingClientRect(), near=y>=r.top-65&&y<=r.bottom+20;
    const center=r.left+r.width/2;
    buttons.forEach((b,i)=>{
      const distance=x-(center+(i-(buttons.length-1)/2)*56);
      const scale=near?dockScale(distance,reduced.matches):1;
      b.style.setProperty('--fb-magnify',scale);
      b.style.width=(44*scale)+'px';
      b.classList.toggle('fb-dock-near',near&&Math.abs(distance)<36);
    });
  }
  root.querySelector('.fb-screen').addEventListener('pointermove',e=>{if(e.pointerType!=='touch')update(e.clientX,e.clientY);},{signal});
  root.querySelector('.fb-screen').addEventListener('pointerleave',()=>update(-1000,-1000),{signal});
  root.addEventListener('foldbook-cursor',e=>update(e.detail.x,e.detail.y),{signal});
  reduced.addEventListener('change',()=>update(-1000,-1000),{signal});
}
