// 夜校 GP 无头冒烟测试：真实 Three.js + DOM 桩，驱动游戏循环与比赛状态机。
// 运行：node scratch/gp-smoke.js
'use strict';
const fs = require('fs');
const vm = require('vm');
const os = require('os');
const path = require('path');

const THREE = require(path.join(os.tmpdir(), 'three.min.js'));
class FakeRenderer {
  constructor() { this.domElement = fakeEl(); this.shadowMap = {}; }
  setPixelRatio() {} setSize() {} render() {}
}
THREE.WebGLRenderer = FakeRenderer;
global.THREE = THREE;

function fakeEl() {
  const el = {
    style: {}, dataset: {}, children: [], hidden: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    append(...c) { this.children.push(...c); },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {}, click() {},
    setAttribute() {}, getAttribute() { return null; },
  };
  let _text = '', _html = '';
  Object.defineProperty(el, 'textContent', { get: () => _text, set(v) { _text = String(v); } });
  Object.defineProperty(el, 'innerHTML', { get: () => _html, set(v) { _html = String(v); } });
  return el;
}
const els = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = fakeEl()); },
  createElement() { return fakeEl(); },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  fullscreenElement: null,
  documentElement: { requestFullscreen: () => Promise.resolve(), exitFullscreen: () => Promise.resolve() },
  body: fakeEl(),
};
global.window = global;
global.innerWidth = 1280; global.innerHeight = 720; global.devicePixelRatio = 1;
const keyHandlers = [];
global.addEventListener = (type, fn) => { if (type === 'keydown' || type === 'keyup') keyHandlers.push(fn); };
let rafCb = null;
global.requestAnimationFrame = cb => { rafCb = cb; };
let nowMs = 0;
global.performance = { now: () => nowMs };
class FakeAudioContext {
  createOscillator() { return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }; }
  createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} }; }
  get currentTime() { return 0; }
  get destination() { return {}; }
}
global.AudioContext = FakeAudioContext;

const html = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'games', 'night-school-gp.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
vm.runInThisContext(scripts[0], { filename: 'three-embed.js' }); // 与 require 同源，重复定义无害
vm.runInThisContext(scripts[2], { filename: 'game.js' });

function press(key) { keyHandlers.forEach(f => f({ key, preventDefault() {} })); }
function frames(n, step = 16) { for (let i = 0; i < n; i++) { nowMs += step; const cb = rafCb; rafCb = null; if (cb) cb(nowMs); } }

console.log('[1] 标题页渲染无异常');
frames(30);
console.log('[2] 发车');
vm.runInThisContext('startRace()');
press('ArrowUp'); // 油门
frames(240); // ~4 秒
const lapNow = () => Number(els['lap'].textContent.split('/')[0]);
console.log('    lap=', lapNow(), 'pos=', els['pos'].textContent, 'speed=', els['speed'].textContent);
console.log('[3] 拾取道具并使用');
vm.runInThisContext('giveItem(ALL()[0]); useItem();');
frames(120);
console.log('[4] 连续跨圈触发圈数与结算逻辑');
for (let round = 0; round < 4; round++) {
  vm.runInThisContext('player.s = LEN - 1; player.v = 40;');
  frames(400);
}
console.log('    lap=', lapNow(), 'rank html=', els['frank'] ? els['frank'].innerHTML : '(finishRace 未运行)');
console.log('    诊断: lap=', vm.runInThisContext('player.lap'), 's=', Math.round(vm.runInThisContext('player.s')), 'LEN=', Math.round(vm.runInThisContext('LEN')), 'raceOn=', vm.runInThisContext('RACE.on'), 'v=', Math.round(vm.runInThisContext('player.v')));
console.log('    fin title=', els['ftitle'].textContent);
console.log('[5] 再来一局');
vm.runInThisContext('startRace()');
frames(120);
console.log('    lap=', lapNow(), 'pos=', els['pos'].textContent);
console.log('SMOKE_OK');
