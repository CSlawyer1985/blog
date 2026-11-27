(() => {
  const dialog = document.getElementById('fm-share-dialog');
  if (!dialog) return;

  const title = dialog.querySelector('[data-share-title]');
  const frame = dialog.querySelector('[data-share-frame]');
  const preview = dialog.querySelector('[data-share-image]');
  const native = dialog.querySelector('[data-share-native]');
  const copy = dialog.querySelector('[data-share-copy]');
  const download = dialog.querySelector('[data-share-download]');
  const entry = dialog.querySelector('[data-share-entry]');
  const image = dialog.querySelector('[data-share-full]');
  const address = dialog.querySelector('[data-share-address]');
  const wechat = dialog.querySelector('[data-share-wechat]');
  const feedback = dialog.querySelector('[data-share-feedback]');
  let share;
  let requestToken = 0;
  let expectedHref = '';
  const preloaded = new Map();

  function sameUrl(a, b) {
    try {
      return new URL(a, location.href).href === new URL(b, location.href).href;
    } catch {
      return a === b;
    }
  }

  function setAspect(value) {
    if (!frame) return;
    const aspect = (value || '1080 / 1920').replace(/:/g, ' / ');
    frame.style.setProperty('--fm-poster-aspect', aspect);
    const parts = aspect.split('/').map((n) => Number(n.trim()));
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      frame.style.setProperty('--fm-poster-ratio', String(parts[0] / parts[1]));
    }
  }

  function clearPreview() {
    requestToken += 1;
    if (!preview) return requestToken;
    preview.classList.remove('is-ready');
    preview.hidden = true;
    preview.removeAttribute('src');
    preview.alt = '';
    expectedHref = '';
    if (frame) {
      frame.classList.add('is-loading');
      frame.classList.remove('is-error');
      frame.setAttribute('aria-busy', 'true');
    }
    return requestToken;
  }

  function reveal(token) {
    if (token !== requestToken || !preview || !dialog.open) return;
    const src = preview.getAttribute('src');
    if (!src) return;
    if (preview.naturalWidth) {
      setAspect(preview.naturalWidth + ' / ' + preview.naturalHeight);
    }
    preview.hidden = false;
    preview.classList.add('is-ready');
    if (frame) {
      frame.classList.remove('is-loading', 'is-error');
      frame.setAttribute('aria-busy', 'false');
    }
  }

  function fail(token) {
    if (token !== requestToken || !preview) return;
    preview.classList.remove('is-ready');
    preview.hidden = true;
    if (frame) {
      frame.classList.remove('is-loading');
      frame.classList.add('is-error');
      frame.setAttribute('aria-busy', 'false');
    }
    if (feedback) feedback.textContent = '海报预览加载失败，可用「打开大图」重试。';
  }

  function showPoster(href, alt, aspect) {
    const token = clearPreview();
    setAspect(aspect);
    preview.alt = alt || '';
    expectedHref = href;
    preview.src = href;
    if (preview.complete && preview.naturalWidth) reveal(token);
    return token;
  }

  preview.addEventListener('load', () => {
    const src = preview.getAttribute('src');
    if (!src || !sameUrl(preview.currentSrc || preview.src, expectedHref)) return;
    reveal(requestToken);
  });
  preview.addEventListener('error', () => {
    const src = preview.getAttribute('src');
    if (!src || (expectedHref && !sameUrl(src, expectedHref))) return;
    fail(requestToken);
  });

  function preloadFromTrigger(trigger) {
    const raw = trigger && trigger.dataset.fmShare;
    if (!raw) return;
    try {
      const href = new URL('poster.png', new URL(raw, location.href)).href;
      if (preloaded.has(href)) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = href;
      preloaded.set(href, img);
    } catch (e) { /* ignore invalid share routes */ }
  }

  document.addEventListener('pointerenter', (event) => {
    const trigger = event.target.closest && event.target.closest('[data-fm-share]');
    if (trigger) preloadFromTrigger(trigger);
  }, true);
  document.addEventListener('focusin', (event) => {
    const trigger = event.target.closest && event.target.closest('[data-fm-share]');
    if (trigger) preloadFromTrigger(trigger);
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-fm-share]');
    if (!trigger) return;

    const route = new URL(trigger.dataset.fmShare, location.href);
    if (typeof dialog.showModal !== 'function') {
      if (route.pathname !== location.pathname) location.assign(route);
      return;
    }
    const poster = new URL('poster.png', route);
    const filename = `echo-fm-${route.pathname.split('/').filter(Boolean).slice(-2).join('-')}.png`;
    share = { title: trigger.dataset.fmTitle, url: new URL(route.pathname, 'https://fm.chenshi.ai').href };

    title.textContent = share.title;
    address.value = share.url;
    address.hidden = true;
    feedback.textContent = '';
    download.href = image.href = poster.href;
    download.download = filename;
    entry.href = route.href;
    entry.hidden = route.pathname === location.pathname;
    wechat.hidden = !/MicroMessenger/i.test(navigator.userAgent);
    native.hidden = typeof navigator.share !== 'function' ||
      (typeof navigator.canShare === 'function' && !navigator.canShare(share));
    showPoster(
      poster.href,
      share.title ? ('分享海报：' + share.title) : '分享海报',
      trigger.dataset.fmAspect
    );
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('.fm-share-close')) {
      clearPreview();
      if (event.target === dialog) dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    clearPreview();
  });
  dialog.addEventListener('cancel', () => {
    clearPreview();
  });

  native.addEventListener('click', async () => {
    const current = share;
    try {
      await navigator.share(current);
    } catch (error) {
      if (dialog.open && current === share && error.name !== 'AbortError') {
        feedback.textContent = '系统分享暂不可用，可复制链接。';
      }
    }
  });

  copy.addEventListener('click', async () => {
    const current = share;
    try {
      await navigator.clipboard.writeText(current.url);
      if (dialog.open && current === share) feedback.textContent = '已复制链接。';
    } catch {
      if (!dialog.open || current !== share) return;
      address.hidden = false;
      address.focus();
      address.select();
      feedback.textContent = '链接已选中，可用系统复制。';
    }
  });

  /* test hook for preview verification */
  window.__fmShare = {
    token: () => requestToken,
    src: () => (preview && preview.getAttribute('src')) || '',
    ready: () => !!(preview && preview.classList.contains('is-ready') && !preview.hidden),
    loading: () => !!(frame && frame.classList.contains('is-loading')),
    error: () => !!(frame && frame.classList.contains('is-error')),
    visibleSrc: () => {
      if (!preview || preview.hidden || !preview.classList.contains('is-ready')) return '';
      return preview.currentSrc || preview.src || '';
    }
  };
})();
