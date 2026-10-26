/* Foldbook: capability detection only. Desktop resources are loaded on demand. */
(() => {
  let instance, busy = false, dismissed = false, pending = false;
  const preview = new URLSearchParams(location.search).get('foldbook') === 'preview';
  const folded = matchMedia('(device-posture: folded)');
  const vertical = matchMedia('(vertical-viewport-segments: 2)');
  function cssSegments() {
    if (!vertical.matches) return null;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;';
    document.body.append(probe);
    const result = [0,1].map(row => {
      const rect = {};
      for (const key of ['left','top','width','height']) {
        probe.style.setProperty('--read', `env(viewport-segment-${key} 0 ${row}, -1px)`);
        probe.style.width = 'var(--read)';
        // Custom property values retain env(); read a computed length instead.
        probe.style.left = 'var(--read)';
        rect[key] = parseFloat(getComputedStyle(probe).left);
      }
      return rect;
    });
    probe.remove();
    return result;
  }
  async function update() {
    if (!document.body) return;
    if (busy) { pending = true; return; }
    busy = true;
    try {
      const posture = navigator.devicePosture?.type || (folded.matches ? 'folded' : 'continuous');
      if (posture !== 'folded' && !preview) dismissed = false;
      const raw = preview ? [{left:0,top:0,width:innerWidth,height:Math.floor(innerHeight*.53)}, {left:0,top:Math.floor(innerHeight*.53)+8,width:innerWidth,height:innerHeight-Math.floor(innerHeight*.53)-8}] : (window.viewport?.segments || cssSegments());
      if (!preview && (posture !== 'folded' || !raw || dismissed)) { instance?.destroy(); instance = null; return; }
      const {laptopSegments} = await import('./foldbook/geometry.mjs');
      const regions = laptopSegments(preview ? 'folded' : posture, raw);
      if (!regions || dismissed) { instance?.destroy(); instance = null; return; }
      if (instance) instance.layout(regions);
      else {
        const {mount} = await import('./foldbook/desktop.mjs?v=20261026-hardware');
        instance = await mount(regions, () => { dismissed = true; instance?.destroy(); instance = null; });
      }
    } catch (error) {
      instance?.destroy(); instance = null;
      console.warn('Foldbook unavailable; normal blog restored.', error);
    } finally { busy = false; if (pending) { pending = false; update(); } }
  }
  folded.addEventListener('change', update);
  vertical.addEventListener('change', update);
  navigator.devicePosture?.addEventListener('change', update);
  window.viewport?.addEventListener?.('change', update);
  addEventListener('resize', update);
  addEventListener('pageshow', update);
  addEventListener('pagehide', () => instance?.save());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update, {once:true}); else update();
})();
