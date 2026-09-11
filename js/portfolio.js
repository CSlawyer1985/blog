/* Visibility and reduced-motion playback for the approved project gallery. */
(() => {
  const gallery = document.querySelector('.project-gallery');
  if (!gallery) return;
  const items = [...gallery.querySelectorAll('.project-item')];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();

  function render() {
    const stopped = media.matches || document.hidden;
    items.forEach(item => item.classList.toggle('is-playing', !stopped && visible.has(item)));
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target,isIntersecting,intersectionRatio}) => {
      if (isIntersecting && intersectionRatio > .15) visible.add(target);
      else visible.delete(target);
    });
    render();
  }, { threshold: [0,.15,.3,.5,.7,.9,1], rootMargin: '-80px 0px 0px' });
  items.forEach(item => observer.observe(item));
  media.addEventListener('change', render);
  document.addEventListener('visibilitychange', render);
  render();

})();
