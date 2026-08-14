"""生成蓝色小鲸鱼图标"""
from PIL import Image, ImageDraw
import os

def create_whale_icon(size=256):
    """创建蓝色小鲸鱼图标"""
    # 创建透明背景
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 颜色定义
    body_color = (74, 144, 217)      # 主体蓝色
    belly_color = (123, 184, 224)    # 腹部浅蓝
    dark_blue = (46, 107, 176)       # 深蓝
    eye_white = (255, 255, 255)      # 眼白
    eye_pupil = (26, 26, 46)         # 瞳孔
    highlight = (135, 206, 235)      # 高光

    # 计算比例
    s = size / 256

    # 背景圆形（水波）
    bg_color = (59, 125, 216, 60)
    draw.ellipse([20*s, 20*s, 236*s, 236*s], fill=bg_color)

    # 鲸鱼身体主体
    body_bbox = [40*s, 100*s, 216*s, 190*s]
    draw.ellipse(body_bbox, fill=body_color)

    # 腹部
    belly_bbox = [60*s, 130*s, 196*s, 180*s]
    draw.ellipse(belly_bbox, fill=belly_color)

    # 尾巴
    tail_points = [
        (200*s, 140*s), (230*s, 100*s), (240*s, 90*s),
        (230*s, 85*s), (215*s, 95*s), (200*s, 120*s)
    ]
    draw.polygon(tail_points, fill=dark_blue)

    tail_points2 = [
        (200*s, 145*s), (230*s, 185*s), (240*s, 195*s),
        (230*s, 200*s), (215*s, 190*s), (200*s, 165*s)
    ]
    draw.polygon(tail_points2, fill=dark_blue)

    # 鳍
    fin_points = [
        (100*s, 120*s), (70*s, 90*s), (60*s, 100*s),
        (75*s, 125*s), (95*s, 135*s)
    ]
    draw.polygon(fin_points, fill=dark_blue)

    # 眼睛
    # 眼白
    draw.ellipse([75*s, 115*s, 105*s, 145*s], fill=eye_white)
    # 瞳孔
    draw.ellipse([82*s, 120*s, 98*s, 138*s], fill=eye_pupil)
    # 高光
    draw.ellipse([88*s, 118*s, 96*s, 126*s], fill=eye_white)

    # 嘴巴微笑
    draw.arc([65*s, 145*s, 115*s, 170*s], 0, 30, fill=dark_blue, width=int(3*s))

    # 喷水孔
    draw.ellipse([95*s, 100*s, 110*s, 110*s], fill=dark_blue)

    # 喷出的水柱
    draw.line([(102*s, 95*s), (98*s, 70*s), (100*s, 50*s)], fill=highlight, width=int(3*s))
    draw.line([(102*s, 95*s), (106*s, 70*s), (104*s, 50*s)], fill=highlight, width=int(2*s))

    # 水滴
    draw.ellipse([95*s, 45*s, 101*s, 51*s], fill=highlight)
    draw.ellipse([105*s, 40*s, 110*s, 45*s], fill=highlight)

    # 腹部纹理
    draw.arc([80*s, 145*s, 176*s, 160*s], 10, 170, fill=(91, 160, 208, 128), width=int(2*s))
    draw.arc([85*s, 155*s, 171*s, 168*s], 10, 170, fill=(91, 160, 208, 100), width=int(2*s))

    # 高光效果
    highlight_ellipse = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight_ellipse)
    highlight_draw.ellipse([80*s, 110*s, 110*s, 130*s], fill=(255, 255, 255, 40))
    img = Image.alpha_composite(img, highlight_ellipse)

    return img


def main():
    """生成各种尺寸的图标"""
    assets_dir = os.path.dirname(os.path.abspath(__file__))

    # 生成 PNG 图标
    sizes = [16, 32, 48, 64, 128, 256, 512]
    icons = {}

    for size in sizes:
        icon = create_whale_icon(size)
        icons[size] = icon
        png_path = os.path.join(assets_dir, f'icon_{size}x{size}.png')
        icon.save(png_path, 'PNG')
        print(f'Generated: icon_{size}x{size}.png')

    # 生成主图标 (256x256 PNG)
    main_icon = create_whale_icon(256)
    main_icon.save(os.path.join(assets_dir, 'icon.png'), 'PNG')
    print('Generated: icon.png')

    # 生成 ICO 文件 (Windows) - 每个尺寸单独保存再合并
    ico_sizes = [16, 24, 32, 48, 64, 128, 256]
    ico_images = [create_whale_icon(s) for s in ico_sizes]

    # 保存为 ICO，包含所有尺寸
    ico_path = os.path.join(assets_dir, 'icon.ico')
    ico_images[-1].save(
        ico_path,
        format='ICO',
        sizes=[(s, s) for s in ico_sizes],
        append_images=ico_images[:-1]
    )
    print('Generated: icon.ico')

    print('\n图标生成完成！')


if __name__ == '__main__':
    main()
