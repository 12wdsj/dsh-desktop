"""手动构造多尺寸 ICO 文件"""
import struct
from PIL import Image
import os

assets_dir = os.path.dirname(os.path.abspath(__file__))

sizes = [16, 24, 32, 48, 64, 128, 256]
png_datas = []

for s in sizes:
    path = os.path.join(assets_dir, f'icon_{s}x{s}.png')
    # 24 没有单独生成，用 32 缩放
    if not os.path.exists(path):
        img = Image.open(os.path.join(assets_dir, 'icon_32x32.png')).resize((s, s), Image.LANCZOS)
        img.save(path)
    with open(path, 'rb') as f:
        png_datas.append(f.read())

# ICO 头部
header = struct.pack('<HHH', 0, 1, len(sizes))  # reserved=0, type=1(ICO), count

# 目录条目 + 数据偏移计算
entries = b''
offset = 6 + 16 * len(sizes)  # 头部 6 字节 + 每个条目 16 字节

for i, (s, data) in enumerate(zip(sizes, png_datas)):
    # width/height 0 表示 256
    w = 0 if s == 256 else s
    h = 0 if s == 256 else s
    entry = struct.pack(
        '<BBBBHHII',
        w, h,          # 宽高
        0,             # 调色板
        0,             # 保留
        1,             # 颜色平面
        32,            # 位深
        len(data),     # 数据大小
        offset         # 数据偏移
    )
    entries += entry
    offset += len(data)

ico_data = header + entries + b''.join(png_datas)

ico_path = os.path.join(assets_dir, 'icon.ico')
with open(ico_path, 'wb') as f:
    f.write(ico_data)

print(f'Generated: icon.ico ({len(ico_data)} bytes, {len(sizes)} sizes)')

# 验证
img = Image.open(ico_path)
print(f'Verify: {img.size}, frames: {getattr(img, "n_frames", 1)}')
for i in range(getattr(img, 'n_frames', 1)):
    img.seek(i)
    print(f'  Frame {i}: {img.size}')
