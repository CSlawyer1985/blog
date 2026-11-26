(() => {
  const dialog = document.getElementById('fm-share-dialog');
  if (!dialog) return;

  const title = dialog.querySelector('[data-share-title]');
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
    preview.src = poster.href;
    download.href = image.href = poster.href;
    download.download = filename;
    entry.href = route.href;
    entry.hidden = route.pathname === location.pathname;
    wechat.hidden = !/MicroMessenger/i.test(navigator.userAgent);
    native.hidden = typeof navigator.share !== 'function' ||
      (typeof navigator.canShare === 'function' && !navigator.canShare(share));
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  preview.addEventListener('error', () => {
    feedback.textContent = '海报预览加载失败，可用「打开大图」重试。';
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
})();
