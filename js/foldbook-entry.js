/* Foldbook: capability detection only. Desktop resources are loaded on demand. */
(() => {
  /* 桌面模拟窗口内的 iframe 页面不挂载桌面（sessionStorage 同源共享，否则形成嵌套桌面） */
  if (window.top !== window.self) return;
  let instance, busy = false, dismissed = false, pending = false, pill = null;
  const params = new URLSearchParams(location.search);
  const preview = params.get('foldbook') === 'preview';
  const folded = matchMedia('(device-posture: folded)');
  const vertical = matchMedia('(vertical-viewport-segments: 2)');
  /* 手动入口的设备特征：触屏 + 粗指针 + 中大屏（≥621px，含 iPad 各姿态与折叠屏展开态）。
     仅决定是否显示入口按钮，不自动进入——展平/半折在无铰链 API 的浏览器中不可区分。
     手机竖屏（宽 <621）与手机横屏（高 <480）不显示；电脑指针精细不显示。 */
  const manualSig = matchMedia('(min-width: 621px) and (min-height: 480px) and (pointer: coarse) and (hover: none)');
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
  function manualMode() {
    try { return sessionStorage.getItem('foldbook-manual') === '1'; } catch { return false; }
  }
  function showPill() {
    if (pill || !document.body) return;
    pill = document.createElement('button');
    pill.type = 'button';
    pill.id = 'foldbook-pill';
    pill.setAttribute('aria-label', '进入桌面模式');
    pill.textContent = '桌面模式';
    pill.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483000;min-height:44px;padding:0 18px;border:1px solid rgba(23,33,36,.15);border-radius:22px;background:rgba(244,244,236,.85);color:#172124;font:600 13px/1.2 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;letter-spacing:.06em;box-shadow:0 2px 10px rgba(20,38,45,.15);backdrop-filter:blur(8px);cursor:pointer;';
    pill.addEventListener('click', () => {
      try { sessionStorage.setItem('foldbook-manual', '1'); } catch {}
      dismissed = false; hidePill();
      /* 全屏必须与点击同一手势：原位挂载，不跳转 URL */
      const el = document.documentElement;
      const fn = el.requestFullscreen || el.webkitRequestFullscreen;
      try { const r = fn?.call(el); r?.catch?.(() => {}); } catch {}
      update();
    });
    document.body.append(pill);
  }
  function hidePill() { pill?.remove(); pill = null; }
  async function update() {
    if (!document.body) return;
    if (busy) { pending = true; return; }
    busy = true;
    try {
      const posture = navigator.devicePosture?.type || (folded.matches ? 'folded' : 'continuous');
      const manual = manualMode();
      const sim = preview || manual;
      if (posture !== 'folded' && !sim) dismissed = false;
      const raw = sim ? [{left:0,top:0,width:innerWidth,height:Math.floor(innerHeight*.53)}, {left:0,top:Math.floor(innerHeight*.53)+8,width:innerWidth,height:innerHeight-Math.floor(innerHeight*.53)-8}] : (window.viewport?.segments || cssSegments());
      const {laptopSegments} = await import('./foldbook/geometry.mjs');
      const regions = (sim || posture === 'folded') ? laptopSegments(sim ? 'folded' : posture, raw) : null;
      if (!instance && manualSig.matches && navigator.maxTouchPoints > 0) showPill();
      else if (!instance) hidePill();
      if (!regions || dismissed) { instance?.destroy(); instance = null; return; }
      if (instance) instance.layout(regions);
      else {
        hidePill();
        const {mount} = await import('./foldbook/desktop.mjs?v=20261029-fs');
        instance = await mount(regions, () => {
          dismissed = true;
          try { sessionStorage.removeItem('foldbook-manual'); } catch {}
          try { const d = document; if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen)?.call(d); } catch {}
          instance?.destroy(); instance = null; update();
        });
      }
    } catch (error) {
      instance?.destroy(); instance = null;
      console.warn('Foldbook unavailable; normal blog restored.', error);
    } finally { busy = false; if (pending) { pending = false; update(); } }
  }
  folded.addEventListener('change', update);
  vertical.addEventListener('change', update);
  manualSig.addEventListener('change', update);
  navigator.devicePosture?.addEventListener('change', update);
  window.viewport?.addEventListener?.('change', update);
  addEventListener('resize', update);
  addEventListener('pageshow', update);
  addEventListener('pagehide', () => instance?.save());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update, {once:true}); else update();
})();
