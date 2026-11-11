# 《四明山法师AI夜校卡丁车大赛》封面：三张真实赛道画面 + 夜校标题带。
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
BAND = 170
img = Image.new('RGB', (W, H), '#0c1126')
d = ImageDraw.Draw(img)

F = '/System/Library/Fonts/Hiragino Sans GB.ttc'
def font(size):
    return ImageFont.truetype(F, size, index=0)

# 标题带
for y in range(BAND):
    t = y / BAND
    d.line([(0, y), (W, y)], fill=(int(12 + 16 * (1 - t)), int(17 + 19 * (1 - t)), int(38 + 31 * (1 - t))))
d.text((46, 26), '夜校 GP', font=font(58), fill='#f6efdd')
d.text((46 + 210, 40), '·', font=font(48), fill='#e8b04b')
d.text((46 + 250, 34), '四明山法师AI夜校卡丁车大赛', font=font(44), fill='#e8b04b')
d.text((52, 118), '培养业务与技术的双语者 · 一个寻找快乐、制造正向飞轮的地方 · legalagi.cn', font=font(20), fill='#8fa0c8')

# 三张真实赛道画面
thumbs = [
    ('/tmp/claude-501/thumbs/beach.jpg',   '先导课 · 灯火湾'),
    ('/tmp/claude-501/thumbs/jungle.jpg',  '第 2-3 课 · Harness 丛林'),
    ('/tmp/claude-501/thumbs/volcano.jpg', '第 5 课 · 算力火山'),
]
cw = W // 3
y0 = BAND + 10
ch = H - y0 - 64
for i, (p, label) in enumerate(thumbs):
    t = Image.open(p)
    tw, th = t.size
    scale = max(cw / tw, ch / th)
    t = t.resize((round(tw * scale), round(th * scale)), Image.LANCZOS)
    left = (t.width - cw) // 2
    top = (t.height - ch) // 2
    img.paste(t.crop((left, top, left + cw, top + y0 + ch - y0 - 0)), (i * cw, y0))
    d.rectangle([i * cw, y0, (i + 1) * cw - 4, y0 + ch], outline='#0c1126', width=2)
    # 标签条
    d.rectangle([i * cw, y0 + ch - 46, (i + 1) * cw - 4, y0 + ch], fill='#0c1126d9')
    d.text((i * cw + 16, y0 + ch - 38), label, font=font(24), fill='#ffe9ad')

# 底部
d.rectangle([0, H - 54, W, H], fill='#090d1d')
d.text((46, H - 44), '四明山法师AI夜校 · 原作 Turbo Tails © Peter Yang · legalagi.cn', font=font(20), fill='#5d6890')

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'desktop', 'games', 'cover-night-school-gp.jpg')
img.save(out, quality=88, optimize=True)
print('cover:', out, round(os.path.getsize(out) / 1024), 'KB')
