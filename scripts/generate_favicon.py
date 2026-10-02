"""生成站点 favicon（assets/favicon.ico + assets/apple-touch-icon.png）。

纸墨配色 + 「陈」字标：32px 下头像照片糊，字形标更清晰且与站点视觉一致。
一次性生成，产物入库；头像/配色变更时重跑本脚本。
"""

import os

from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAPER = (243, 237, 227, 255)   # --paper #F3EDE3
INK = (26, 23, 20, 255)        # --ink   #1A1714
MASTER = 256                    # 主画布尺寸，向下缩放抗锯齿

FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
]


def _load_font(size: int):
    for path in FONT_CANDIDATES:
        if os.path.isfile(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    raise RuntimeError("未找到可用的 CJK 字体，请安装或调整 FONT_CANDIDATES")


def build_master() -> Image.Image:
    img = Image.new("RGBA", (MASTER, MASTER), PAPER)
    draw = ImageDraw.Draw(img)
    font = _load_font(int(MASTER * 0.62))
    # 居中偏上一点点，视觉重心更稳
    bbox = draw.textbbox((0, 0), "陈", font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (MASTER - w) / 2 - bbox[0]
    y = (MASTER - h) / 2 - bbox[1] - MASTER * 0.02
    draw.text((x, y), "陈", font=font, fill=INK)
    return img


def main():
    master = build_master()
    out_dir = os.path.join(PROJECT_ROOT, "assets")

    ico_path = os.path.join(out_dir, "favicon.ico")
    master.resize((32, 32), Image.LANCZOS).save(
        ico_path, format="ICO", sizes=[(16, 16), (32, 32)])
    print(f"  → {ico_path}")

    touch_path = os.path.join(out_dir, "apple-touch-icon.png")
    master.resize((180, 180), Image.LANCZOS).save(touch_path, format="PNG")
    print(f"  → {touch_path}")


if __name__ == "__main__":
    main()
