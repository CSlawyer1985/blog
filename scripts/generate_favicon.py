"""生成站点 favicon（assets/favicon.ico + assets/apple-touch-icon.png）。

透明底 + 朱红圆点：16px 标签页尺寸下字形标（陈）糊成一团，
单色圆点在小尺寸下识别度最高；朱红取自 --accent，无底色随标签页明暗自适应。
一次性生成，产物入库；配色变更时重跑本脚本。
"""

import os

from PIL import Image, ImageDraw

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ACCENT = (192, 57, 43, 255)    # --accent #C0392B
MASTER = 256                    # 主画布尺寸，向下缩放抗锯齿
DOT_RATIO = 0.33                # 圆点半径占比（直径 66%，小尺寸下保持醒目）


def build_master() -> Image.Image:
    img = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = MASTER * DOT_RATIO
    draw.ellipse([MASTER / 2 - r, MASTER / 2 - r,
                  MASTER / 2 + r, MASTER / 2 + r], fill=ACCENT)
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
