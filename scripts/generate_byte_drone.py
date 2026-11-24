from PIL import Image, ImageDraw
import os

root = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sprites', 'byte_drone')
os.makedirs(root, exist_ok=True)
size = 128

body = (58, 204, 255)
core = (44, 125, 255)
accent = (255, 255, 255)
flash = (255, 105, 110)


def save_frame(name, draw_fn):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    draw.ellipse([16, 16, 112, 112], fill=(12, 22, 28, 192))
    draw.ellipse([24, 24, 104, 104], outline=(60, 190, 255, 60), width=2)
    draw_fn(draw)
    im.save(os.path.join(root, name))


for i, offset in enumerate([-6, 0, 6], start=1):
    def make_draw(draw, offset=offset):
        draw.ellipse([34, 30 + offset, 94, 90 + offset], fill=body)
        draw.ellipse([46, 40 + offset, 86, 80 + offset], fill=core)
        draw.polygon([(38, 52 + offset), (14, 42 + offset), (14, 70 + offset)], fill=(32, 78, 111))
        draw.polygon([(90, 52 + offset), (114, 42 + offset), (114, 70 + offset)], fill=(32, 78, 111))
        draw.line([(24, 56 + offset), (42, 56 + offset)], fill=accent, width=2)
        draw.line([(84, 56 + offset), (104, 56 + offset)], fill=accent, width=2)
        draw.ellipse([56, 46 + offset, 70, 60 + offset], fill=(236, 248, 255))
        draw.ellipse([54, 44 + offset, 72, 62 + offset], outline=(220, 240, 255), width=2)
    save_frame(f'idle_0{i}.png', make_draw)


def attack_draw(draw):
    draw.ellipse([32, 36, 96, 96], fill=body)
    draw.ellipse([36, 42, 92, 88], fill=core)
    draw.polygon([(24, 58), (10, 42), (10, 74)], fill=(24, 64, 88))
    draw.polygon([(104, 50), (122, 44), (122, 72)], fill=(255, 60, 60))
    draw.line([(26, 56), (42, 56)], fill=accent, width=2)
    draw.ellipse([56, 42, 72, 58], fill=(255, 255, 255))
    draw.line([(72, 46), (104, 46)], fill=flash, width=4)
    draw.line([(74, 52), (108, 52)], fill=flash, width=2)

save_frame('attack_01.png', attack_draw)


def hit_draw(draw):
    draw.ellipse([34, 30, 94, 90], fill=body)
    draw.ellipse([44, 42, 84, 82], fill=core)
    draw.polygon([(38, 56), (18, 44), (18, 70)], fill=(32, 78, 111))
    draw.polygon([(90, 56), (110, 44), (110, 70)], fill=(32, 78, 111))
    draw.ellipse([54, 40, 74, 60], fill=(255, 180, 190))
    draw.line([(46, 32), (82, 68)], fill=flash, width=5)
    draw.line([(82, 32), (46, 68)], fill=flash, width=5)
    draw.line([(51, 38), (78, 65)], fill=(255, 255, 255), width=2)

save_frame('hit_01.png', hit_draw)


def death_draw(draw):
    draw.ellipse([34, 30, 94, 90], fill=(48, 102, 154))
    draw.chord([34, 30, 94, 90], start=180, end=360, fill=(18, 35, 68))
    draw.line([(48, 44), (80, 76)], fill=flash, width=6)
    draw.line([(80, 44), (48, 76)], fill=flash, width=6)
    draw.ellipse([56, 54, 72, 70], fill=(255, 255, 255, 180))
    draw.line([(60, 40), (68, 60)], fill=(255, 255, 255, 180), width=3)
    draw.ellipse([20, 90, 44, 112], fill=(12, 22, 28))
    draw.ellipse([84, 90, 108, 112], fill=(12, 22, 28))

save_frame('death_01.png', death_draw)

print('created frames in', root)
