const form = document.getElementById('library-search');
const query = document.getElementById('q');
const clear = document.getElementById('library-clear');
const status = document.getElementById('library-status');
const directory = document.getElementById('directory');
const categoryNav = document.querySelector('.library-jumps');

function normalize(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[‐‑‒–—−]/g, '-').trim();
}

const groups = Array.from(categoryNav.querySelectorAll('a'), link => {
  const section = document.getElementById(link.hash.slice(1));
  return {
    link,
    section,
    counts: [link.querySelector('[data-count]'), section.querySelector('[data-count]')],
    topics: Array.from(section.querySelectorAll('.index-token'), topic => ({
      element: topic,
      text: normalize(topic.textContent)
    }))
  };
});

function updateIndex() {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  let total = 0;

  for (const group of groups) {
    let count = 0;
    for (const topic of group.topics) {
      const match = terms.every(term => topic.text.includes(term));
      topic.element.hidden = !match;
      count += Number(match);
    }
    group.link.hidden = group.section.hidden = count === 0;
    for (const element of group.counts) element.textContent = count;
    total += count;
  }

  directory.classList.toggle('is-searching', searching);
  categoryNav.hidden = total === 0;
  clear.hidden = query.value.length === 0;
  status.textContent = searching ? (total ? `找到 ${total} 个专题` : '没有匹配的专题') : '';
}

query.addEventListener('input', updateIndex);
clear.addEventListener('click', () => {
  query.value = '';
  query.focus();
  updateIndex();
});
form.addEventListener('submit', event => event.preventDefault());
form.hidden = false;
updateIndex();
