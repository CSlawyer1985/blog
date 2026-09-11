// Guard against replacing the user's original particle renderer again.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const original = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
const adapted = fs.readFileSync(path.join(__dirname, '../js/hero-portrait.js'), 'utf8');
const blocks = [
  ['background sampling', '  function isBg(', '  function colorFor('],
  ['color mapping', '  function colorFor(', '  var easeOut'],
  ['entrance easing', '  var easeOut', '  function init()'],
  ['particle target and entrance layout', '    function layoutTargets(', '    function repositionCanvas()'],
  ['frame except approved geometric scaling', '    function frame(now)', '    var raf, resizeId, scrollId;']
];
for (const [name, start, end] of blocks) {
  const extract = source => {
    const from = source.indexOf(start), to = source.indexOf(end, from);
    assert(from >= 0 && to > from, name + ': source boundaries');
    return source.slice(from, to);
  };
  let expected = extract(original);
  if (start === '    function frame(now)') {
    expected = expected
      .replace('Math.sin(time + p.phase) * 0.3;', 'Math.sin(time + p.phase) * 0.3 * particleScale;')
      .replace('Math.cos(time * 0.7 + p.phase) * 0.4;', 'Math.cos(time * 0.7 + p.phase) * 0.4 * particleScale;')
      .replace('p.size * (1 + hb * 0.6);', 'p.size * (1 + hb * 0.6) * particleScale;')
      .replace('ctx.fillRect(px - 0.2, py - 0.2, sz + 0.4, sz + 0.4);', 'ctx.fillRect(px - 0.2 * particleScale, py - 0.2 * particleScale, sz + 0.4 * particleScale, sz + 0.4 * particleScale);');
  }
  assert.equal(extract(adapted), expected, name);
  console.log('PASS: ' + name);
}
