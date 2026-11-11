# 生成《夜校 GP》货架封面：夜色靛蓝底 + 灯火金 + 朱红点缀，全系统字体。
# 运行：python3 -I scratch/gp-cover.py
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
img = Image.new('RGB', (W, H), '#0c1126')
d = ImageDraw.Draw(img)
# 夜空垂直渐变
for y in range(H):
    t = y / H
    r = int(12 + 14 * (1 - t)); g = int(17 + 20 * (1 - t)); b = int(38 + 33 * (1 - t))
    d.line([(0, y), (W, y)], fill=(r, g, b))
# 月
d.ellipse([1020, 60, 1090, 130], fill='#f3ecd8')
d.ellipse([1008, 66, 1024, 82], fill='#1c2547')
# 远山剪影
d.polygon([(0, 560), (180, 430), (360, 560)], fill='#141d3d')
d.polygon([(300, 580), (520, 420), (760, 580)], fill='#121a37')
d.polygon([(700, 560), (940, 440), (1180, 560), (1280, 560), (700, 560)], fill='#16203f')
# 盘山道弧线示意
curve_pts = [(60, 660), (240, 600), (420, 640), (620, 700), (860, 660), (1080, 600), (1280, 640)]
d.line(curve_pts, fill='#3a4266', width=26)
# 灯火（大小光点）
import random
random.seed(20261111)
for _ in range(60):
    x, y = random.randint(0, W), random.randint(320, 700)
    r = random.choice([2, 2, 3, 4])
    d.ellipse([x - r, y - r, x + r, y + r], fill='#ffd98a')
# 赛道灯柱光点
for x, y in curve_pts:
    d.ellipse([x - 5, y - 26, x + 5, y - 16], fill='#ffca6e')

F = '/System/Library/Fonts/Hiragino Sans GB.ttc'
def font(size, index=0):
    return ImageFont.truetype(F, size, index=index)

# 主标题
d.text((90, 150), '夜校', font=font(150), fill='#f6efdd')
w_gp = d.textlength('GP', font=font(150))
d.text((90 + d.textlength('夜校', font=font(150)) + 30, 150), 'GP', font=font(150), fill='#e8b04b')
d.text((96, 330), '四明山法师卡丁 · 法律人 AI 实操夜校', font=font(30), fill='#cfc4a8')
# 金句
d.text((96, 430), '「夜色落下，灯火升起，我们相聚在四明山下。」', font=font(28), fill='#ffd98a')
d.text((96, 480), '道具是 Skill、MCP、Agent；对手是幻觉、焦虑、高墙。', font=font(24), fill='#9fb0d8')
# 底部
d.rectangle([0, H - 64, W, H], fill='#090d1d')
d.text((90, H - 50), '培养业务与技术的双语者 · 一个寻找快乐、制造正向飞轮的地方 · legalagi.cn', font=font(20), fill='#5d6890')

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'desktop', 'games', 'cover-night-school-gp.jpg')
img.save(out, quality=88, optimize=True)
print('cover:', out, round(os.path.getsize(out) / 1024), 'KB')
