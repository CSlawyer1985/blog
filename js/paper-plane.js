/* 折纸飞机：全页滚动飞行（参考 rahulm.me 的连续航迹方案，纸墨朱红化改编）。
   scrollY → 路标点分段三次贝塞尔采样，机头恒沿切线方向；
   路标一左一右拉满页宽、屏幕内纵移 ≤0.25H，坡度天然平缓（约 ±12°），呈缓 S 型；
   叙事：纸飞机停在 hero 人像持麦的手中，滚动时向右掷出、右缘折返，一路下穿/掠过各板块，
   最终落在 contact「聊聊」字标上。飞机与尾迹固定在 body 层 z-index:1（低于 main）。
   降级：prefers-reduced-motion / Save-Data / 缺少锚点时不动；移动端不展示飞机（CSS 隐藏）。 */
(() => {
  'use strict';

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMQ = matchMedia('(max-width: 620px)');
  const home = document.querySelector('.plane-home');
  const needs = ['#about', '#writing', '#speak', '#build', '#project-gallery', '#contact']
    .map(sel => document.querySelector(sel));
  if (!home || needs.some(el => !el)) return;               // 非首页或结构不完整
  // 移动端不飞行（CSS 已整体隐藏飞机），桌面端才构建飞行系统
  if (preference.matches || mobileMQ.matches || navigator.connection?.saveData === true) return;

  /* ── DOM：克隆静态飞机为 fixed 飞行体，追加全屏尾迹 SVG（先尾迹后飞机，飞机在上）── */
  const plane = document.createElement('div');
  plane.className = 'travelling-plane';
  plane.setAttribute('aria-hidden', 'true');
  plane.append(home.querySelector('img').cloneNode());
  document.body.append(plane);

  const ns = 'http://www.w3.org/2000/svg';
  const trail = document.createElementNS(ns, 'svg');
  trail.classList.add('plane-trail');
  trail.setAttribute('aria-hidden', 'true');
  const trace = document.createElementNS(ns, 'path');
  trail.append(trace);
  document.body.append(trail);

  document.body.classList.add('flight-on');

  /* ── 穿帮防护：肖像图就绪前不亮出飞机（否则图未加载时飞机裸露在纸面上）── */
  const stageImg = document.querySelector('.portrait__img');
  let stageReady = !stageImg || (stageImg.complete && stageImg.naturalWidth > 0);
  if (stageImg && !stageReady) {
    const onStage = () => { stageReady = true; measure(); };
    stageImg.addEventListener('load', onStage, { once: true });
    stageImg.addEventListener('error', onStage, { once: true });   // 加载失败也放行，不永久阻塞
  }

  /* ── 路径数学：共享切线速度的分段三次贝塞尔（位置与朝向 C1 连续）──
     素材机头朝正右，NOSE_ANGLE = 0，切线角即机体角。 */
  const NOSE_ANGLE = 0;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const cubic = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
  const slope = (a, b, c, d, t) => 3 * (1 - t) ** 2 * (b - a) + 6 * (1 - t) * t * (c - b) + 3 * t * t * (d - c);

  function makeFlightPath(points, width, height) {
    const velocity = points.map((p, i) => {
      const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
      const v = {};
      for (const [axis, max] of [['x', width], ['y', height]]) {
        const m = p.velocity?.[axis] ?? (next[axis] - prev[axis]) / (next.at - prev.at);
        const before = p.at - prev.at, after = next.at - p.at;
        const low = p[axis] - 15, high = max - 15 - p[axis];
        const cap = m >= 0
          ? Math.min(i ? 3 * low / before : Infinity, i < points.length - 1 ? 3 * high / after : Infinity)
          : Math.min(i ? 3 * high / before : Infinity, i < points.length - 1 ? 3 * low / after : Infinity);
        v[axis] = Math.sign(m) * Math.min(Math.abs(m), Math.max(0, cap));
      }
      return v;
    });
    return points.slice(0, -1).map((a, i) => {
      const b = points[i + 1], third = (b.at - a.at) / 3;
      return { a, b,
        c1: { x: a.x + velocity[i].x * third, y: a.y + velocity[i].y * third },
        c2: { x: b.x - velocity[i + 1].x * third, y: b.y - velocity[i + 1].y * third } };
    });
  }

  function sampleFlightPath(segments, scroll) {
    const s = segments.find(s => scroll <= s.b.at) || segments[segments.length - 1];
    const t = clamp((scroll - s.a.at) / (s.b.at - s.a.at));
    const dx = slope(s.a.x, s.c1.x, s.c2.x, s.b.x, t);
    const dy = slope(s.a.y, s.c1.y, s.c2.y, s.b.y, t);
    return { x: cubic(s.a.x, s.c1.x, s.c2.x, s.b.x, t),
             y: cubic(s.a.y, s.c1.y, s.c2.y, s.b.y, t),
             angle: Math.atan2(dy, dx) * 180 / Math.PI - NOSE_ANGLE };
  }

  /* ── 路标测量（屏幕空间锚点法）：
     路标一左一右交替拉满页宽，view 即到达该锚点时飞机所在的屏幕高度百分比；
     相邻锚点横向满幅、纵向 ≤0.25H，切线坡度天然 ≤ ±12°，无垂直俯冲。
     起点 = hero 人像身后（被遮住，下拉时从人像后滑出），落点 = contact「聊聊」字标。 */
  let frame = 0, route = [], segments = [];
  let planeWidth = 0, planeHeight = 0, currentY = null, lastTime = 0;

  const box = el => {
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollY, bottom: r.bottom + scrollY,
             left: r.left, width: r.width, height: r.height };
  };

  function measure() {
    const W = document.documentElement.clientWidth, H = innerHeight, mobile = W <= 620;
    const [about, writing, speak, build, gallery] = needs.map(box);
    const zhTalk = document.querySelector('.contact__title a[lang="zh"]');
    const ruler = document.querySelector('.build__ruler');
    planeWidth = parseFloat(getComputedStyle(plane).width);
    planeHeight = planeWidth * 2 / 3;

    const edge = mobile ? W - 48 : W - 118;  // 右缘走廊（让出半机宽，机头不出画）
    const left = mobile ? 30 : 96;           // 左缘走廊（rail 发丝线 48px 在飞机上层，作前景线）
    const talk = zhTalk ? zhTalk.getBoundingClientRect() : null;
    const r = ruler ? ruler.getBoundingClientRect() : null;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - H);

    // 起始停机位 = 静态锚点（.portrait 内 40%/73%，即持麦手的位置）
    const h = box(home);
    const startYDoc = h.top + h.height / 2;

    route = [
      // 0 · 手中停机位（滚动时从手中向右掷出——手扔纸飞机的叙事）
      { x: h.left + h.width / 2, y: startYDoc, view: .45 },
      { x: edge, y: startYDoc + 250, view: startYDoc / H, at: 250 },    // 1 · 向右等高掷出
      // 2-8 · 满幅缓 S 折返：左→右→左→右…纵移每段 ≤0.25H
      { x: left, y: about.top + 140, view: .58 },                       // about 上带
      { x: edge, y: writing.top - 60, view: .34 },                      // writing 上缘
      { x: left, y: writing.top + writing.height * .55, view: .6 },     // writing 下带
      { x: edge, y: speak.top - 30, view: .26 },                        // speak 暗块上缘（随后下穿暗区）
      r ? { x: left, y: r.top + scrollY + 10, view: .52 }               // build：横穿比例尺（从终端后下穿）
        : { x: left, y: build.top + build.height * .4, view: .5 },
      { x: edge, y: gallery.top + gallery.height * .16, view: .28 },    // gallery 上带右缘
      { x: left, y: gallery.top + gallery.height * .58, view: .56 },    // gallery 卡列间下穿
      // 9 · 落点：contact「聊聊」字标（滚动到底时停驻）
      talk ? { x: talk.left + talk.width * .72, y: talk.top + scrollY + talk.height * .6, view: .42 }
           : { x: W * .5, y: needs[5].top + 300, view: .4 },
    ];
    route = route.map((q, i) => ({
      x: q.x,
      y: i === 0 ? q.y : q.view * H,                    // i0 为文档坐标：scrollY=0 时恰在手中，
      at: i === 0 ? 0 : (q.at ?? q.y - q.view * H),     // 随首个滚动段自然过渡到屏幕空间
    }));
    route[route.length - 1].y = clamp(route[route.length - 1].y, H * .18, H * .8);
    route[route.length - 1].at = maxScroll;
    route.forEach((q, i) => { if (i) q.at = Math.max(q.at, route[i - 1].at + 120); });

    segments = makeFlightPath(route, W, H);
    requestDraw();
  }

  /* ── 绘制循环：scrollY 指数平滑（惯性滑行）+ 尾迹回采样 ── */
  function draw(time) {
    frame = 0;
    if (preference.matches || mobileMQ.matches || document.hidden || !segments.length) return;
    if (!stageReady) {                                  // 肖像未就绪：保持隐藏，不画尾迹
      plane.style.opacity = '0';
      trace.setAttribute('d', '');
      return;
    }
    const target = clamp(scrollY, 0, route[route.length - 1].at);
    const dt = Math.min(50, Math.max(1, time - lastTime));
    lastTime = time;
    currentY = currentY === null ? target : mix(currentY, target, 1 - Math.exp(-dt / 85));
    const p = sampleFlightPath(segments, currentY);
    const mobile = innerWidth <= 620;

    plane.style.opacity = String(clamp(scrollY / 140)); // 从手里掷出：起手隐藏，滚动淡入；滚回顶部则收回手中
    const scale = mix(1, mobile ? .56 : .72, clamp(currentY / (route[route.length - 1].at || 1)) * .3);
    // 连续镜像：内层 img scaleY=cos(angle)。0°正常，|90°|侧立（转弯压坡度观感），180°镜像且
    // 正面朝上——左右向切换无翻面跳变；镜像放内层，外层投影方向保持朝下
    const sy = Math.cos(p.angle * Math.PI / 180).toFixed(3);
    plane.style.setProperty('--plane-sy', sy);
    plane.style.transform =
      `translate3d(${p.x - planeWidth / 2}px,${p.y - planeHeight / 2}px,0) rotate(${p.angle}deg) scale(${scale})`;

    // 尾迹：向回采样最近约 120px 弧长的历史位置，点线只标方向不连版块
    const marks = [];
    let distance = 0, previous = p;
    for (let yy = currentY - 3; yy >= 0 && yy > currentY - 320 && distance < 120; yy -= 3) {
      const q = sampleFlightPath(segments, yy);
      distance += Math.hypot(q.x - previous.x, q.y - previous.y);
      previous = q;
      if (distance > planeWidth * scale * .34) marks.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`);
    }
    trace.setAttribute('d', marks.length ? 'M' + marks.join(' L') : '');

    if (Math.abs(currentY - target) > .15) frame = requestAnimationFrame(draw);
  }

  function requestDraw() {
    if (!frame) { lastTime = performance.now(); frame = requestAnimationFrame(draw); }
  }

  /* ── 事件：滚动 / 视口 / 可见性 / 降级偏好 ── */
  addEventListener('scroll', requestDraw, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('hashchange', () => { currentY = null; requestDraw(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestDraw(); });
  preference.addEventListener('change', () => {
    if (preference.matches) {                        // 转向减少动效：收起飞行，还原静态飞机
      cancelAnimationFrame(frame); frame = 0;
      document.body.classList.remove('flight-on');
    } else if (!mobileMQ.matches) {                  // 切回：恢复飞行
      document.body.classList.add('flight-on');
      currentY = null;
      measure();
    }
  });
  mobileMQ.addEventListener('change', e => {         // 窗口跨断点：移动收起、桌面恢复
    if (e.matches) {
      cancelAnimationFrame(frame); frame = 0;
      document.body.classList.remove('flight-on');
    } else {
      document.body.classList.add('flight-on');
      currentY = null;
      measure();
    }
  });
  document.querySelectorAll('img').forEach(el => el.addEventListener('load', measure, { once: true }));
  if (document.fonts) document.fonts.ready.then(measure);

  measure();
})();
