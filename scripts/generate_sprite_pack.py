"""Build the Unit Hunter generated sprite pack.

The pack uses the available generated key art when present and deterministic
pixel-art silhouettes for the remaining units. Each key art image is expanded
into the runtime's idle/attack/hit/death frame layout.
"""

from __future__ import annotations

import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "source-art"
OUTPUT_DIR = ROOT / "assets" / "sprites_generated"
CANVAS = 256


UNITS = {
    "glitch": {"color": "#00e5c4", "accent": "#47f3ff", "kind": "glitch", "source": "glitch"},
    "fragment": {"color": "#ff6b35", "accent": "#ffd166", "kind": "shard"},
    "corruptor": {"color": "#7c4dff", "accent": "#d6b4ff", "kind": "beast"},
    "nullptr": {"color": "#ff3355", "accent": "#ff9bb0", "kind": "mask", "source": "nullptr"},
    "byte_drone": {"color": "#3accff", "accent": "#b7f4ff", "kind": "drone", "source": "byte_drone"},
    "overflow": {"color": "#ffaa00", "accent": "#ffe08a", "kind": "golem", "source": "overflow"},
    "signal_wraith": {"color": "#7ce7da", "accent": "#d9b4ff", "kind": "wraith", "source": "signal_wraith"},
    "packet_mimic": {"color": "#3c91ff", "accent": "#ffcf6e", "kind": "mimic"},
    "checksum_beast": {"color": "#e96bff", "accent": "#8df7ff", "kind": "beast"},
    "firewall_hound": {"color": "#ff7043", "accent": "#ffd166", "kind": "hound"},
    "quantum_sentry": {"color": "#00e5c4", "accent": "#eaffff", "kind": "boss_sentry"},
    "entropy_lord": {"color": "#ff6b35", "accent": "#ffd166", "kind": "boss_entropy"},
    "void_architect": {"color": "#7c4dff", "accent": "#d9b4ff", "kind": "boss_void"},
    "protocol_colossus": {"color": "#3c91ff", "accent": "#a9f7ff", "kind": "boss_colossus"},
    "singularity_core": {"color": "#ff3864", "accent": "#ffe082", "kind": "boss_core"},
}


def rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def rgba(color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    return (*rgb(color), alpha)


def draw_glow(draw: ImageDraw.ImageDraw, center: tuple[int, int], radius: int, color: str) -> None:
    r, g, b = rgb(color)
    for step in range(radius, 0, -4):
        alpha = int(10 + 48 * (1 - step / radius))
        draw.ellipse(
            (center[0] - step, center[1] - step, center[0] + step, center[1] + step),
            fill=(r, g, b, alpha),
        )


def fallback_art(unit_id: str, spec: dict) -> Image.Image:
    """Create a compact low-resolution silhouette and upscale it cleanly."""
    size = 128
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    primary = rgba(spec["color"])
    accent = rgba(spec["accent"])
    dark = (8, 12, 26, 255)
    shadow = (0, 0, 0, 110)
    kind = spec["kind"]

    draw.ellipse((18, 103, 111, 119), fill=shadow)
    draw_glow(draw, (64, 62), 40, spec["color"])

    # The four redesigned units use readable techno-creature silhouettes instead
    # of the old card/box shapes. They stay deliberately compact so every frame
    # still fits the existing 256px transparent sprite contract.
    if unit_id == "packet_mimic":
        draw.polygon([(15, 72), (22, 45), (43, 29), (73, 25), (101, 39), (111, 65), (99, 88), (75, 96), (53, 91), (30, 106), (18, 91)], fill=dark, outline=primary)
        draw.polygon([(23, 68), (30, 48), (47, 37), (70, 34), (94, 45), (102, 66), (90, 79), (70, 85), (52, 78), (33, 94), (26, 84)], fill=primary)
        draw.polygon([(41, 48), (89, 45), (96, 63), (84, 70), (47, 68), (36, 60)], fill=dark, outline=accent)
        draw.ellipse((57, 49, 72, 64), fill=accent, outline=primary, width=2)
        draw.ellipse((62, 53, 68, 60), fill=dark)
        draw.polygon([(48, 72), (84, 72), (73, 82), (58, 81)], fill=dark, outline=accent)
        draw.line((28, 43, 18, 24), fill=accent, width=3)
        draw.ellipse((14, 18, 22, 26), fill=primary)
        draw.line((90, 43, 107, 25), fill=accent, width=3)
        draw.ellipse((103, 19, 111, 27), fill=primary)
    elif unit_id == "firewall_hound":
        draw.polygon([(15, 80), (23, 59), (39, 48), (59, 45), (77, 50), (95, 39), (108, 48), (103, 68), (114, 84), (95, 91), (76, 82), (55, 91), (36, 88)], fill=dark, outline=primary)
        draw.polygon([(26, 72), (32, 59), (46, 54), (64, 56), (79, 63), (94, 51), (99, 59), (94, 73), (103, 81), (88, 82), (74, 75), (54, 83), (37, 81)], fill=primary)
        draw.polygon([(83, 52), (92, 31), (101, 48)], fill=accent, outline=primary)
        draw.polygon([(98, 51), (111, 38), (108, 59)], fill=accent, outline=primary)
        draw.rounded_rectangle((52, 57, 83, 68), 4, fill=dark, outline=accent, width=2)
        draw.rectangle((59, 60, 64, 64), fill=accent)
        draw.rectangle((73, 60, 78, 64), fill=accent)
        for x, y in ((37, 79), (55, 82), (82, 77), (98, 78)):
            draw.line((x, y, x - 4, 111), fill=accent, width=5)
        draw.line((27, 61, 13, 47), fill=accent, width=3)
        draw.line((13, 47, 9, 37), fill=primary, width=4)
    elif unit_id == "quantum_sentry":
        draw.ellipse((19, 18, 109, 110), fill=dark, outline=primary, width=4)
        draw.ellipse((29, 28, 99, 100), outline=accent, width=3)
        draw.polygon([(18, 55), (4, 65), (20, 76), (29, 67)], fill=primary, outline=accent)
        draw.polygon([(110, 55), (124, 65), (108, 76), (99, 67)], fill=primary, outline=accent)
        draw.ellipse((42, 41, 86, 85), fill=primary, outline=accent, width=3)
        draw.ellipse((53, 52, 75, 74), fill=dark, outline=accent, width=2)
        draw.ellipse((61, 58, 68, 67), fill=accent)
        for x, y, dx, dy in ((39, 24, -8, -13), (64, 17, 0, -17), (89, 24, 8, -13)):
            draw.line((x, y, x + dx, y + dy), fill=accent, width=3)
            draw.ellipse((x + dx - 4, y + dy - 4, x + dx + 4, y + dy + 4), fill=primary)
    elif unit_id == "protocol_colossus":
        draw.polygon([(38, 26), (53, 17), (76, 17), (91, 27), (87, 45), (101, 53), (96, 74), (86, 75), (91, 103), (77, 114), (63, 102), (49, 114), (35, 103), (40, 75), (28, 73), (24, 53), (38, 45)], fill=dark, outline=primary)
        draw.polygon([(45, 29), (55, 23), (73, 23), (82, 30), (79, 43), (48, 43)], fill=primary, outline=accent)
        draw.rounded_rectangle((51, 31, 77, 40), 3, fill=dark, outline=accent, width=2)
        draw.rectangle((57, 34, 62, 37), fill=accent)
        draw.rectangle((68, 34, 73, 37), fill=accent)
        draw.polygon([(42, 49), (84, 49), (78, 73), (48, 73)], fill=primary, outline=accent)
        draw.line((52, 54, 73, 54), fill=accent, width=2)
        draw.line((29, 54, 13, 69), fill=accent, width=7)
        draw.line((96, 54, 112, 69), fill=accent, width=7)
        draw.ellipse((9, 67, 21, 79), fill=primary, outline=accent)
        draw.ellipse((107, 67, 119, 79), fill=primary, outline=accent)
        draw.polygon([(46, 76), (60, 78), (57, 104), (45, 115), (37, 106)], fill=primary, outline=accent)
        draw.polygon([(68, 78), (82, 76), (91, 106), (83, 115), (71, 104)], fill=primary, outline=accent)
    elif kind in {"drone", "boss_sentry"}:
        body = (34, 38, 98, 94) if kind == "drone" else (20, 28, 108, 108)
        draw.rounded_rectangle(body, 14, fill=dark, outline=primary, width=4)
        draw.polygon([(22, 48), (5, 58), (22, 67)], fill=primary, outline=accent)
        draw.polygon([(106, 48), (123, 58), (106, 67)], fill=primary, outline=accent)
        draw.ellipse((47, 49, 81, 83), fill=accent, outline=primary, width=3)
        draw.ellipse((56, 58, 72, 74), fill=primary)
        for x in (43, 52, 76, 85):
            draw.line((x, 34, x - 3, 20), fill=accent, width=3)
            draw.ellipse((x - 5, 14, x + 2, 21), fill=primary)
    elif kind in {"shard", "mask"}:
        draw.polygon([(65, 12), (110, 42), (99, 103), (52, 113), (20, 71), (33, 28)], fill=dark, outline=primary)
        draw.polygon([(65, 22), (95, 45), (85, 90), (53, 96), (34, 67), (43, 38)], fill=primary)
        draw.polygon([(58, 42), (91, 51), (72, 80), (43, 66)], fill=dark, outline=accent)
        draw.rectangle((56, 57, 62, 64), fill=accent)
        draw.rectangle((76, 57, 82, 64), fill=accent)
        if kind == "mask":
            draw.polygon([(53, 76), (75, 82), (62, 91)], fill=rgba(spec["accent"]))
    elif kind in {"beast", "hound"}:
        draw.polygon([(18, 78), (27, 45), (51, 32), (75, 38), (96, 29), (113, 49), (104, 72), (116, 94), (89, 102), (68, 92), (40, 104)], fill=dark, outline=primary)
        draw.polygon([(27, 70), (35, 50), (55, 42), (76, 49), (91, 42), (103, 54), (94, 74), (103, 89), (83, 91), (66, 82), (43, 93)], fill=primary)
        draw.polygon([(88, 39), (106, 18), (112, 50)], fill=accent, outline=primary)
        draw.rectangle((66, 55, 77, 66), fill=accent)
        draw.rectangle((83, 55, 94, 66), fill=accent)
        draw.line((36, 95, 29, 111), fill=accent, width=5)
        draw.line((89, 91, 97, 110), fill=accent, width=5)
    elif kind in {"golem", "boss_colossus"}:
        body = (26, 28, 104, 110) if kind == "golem" else (12, 18, 116, 116)
        draw.rounded_rectangle(body, 12, fill=dark, outline=primary, width=4)
        for y in range(32, 87, 17):
            draw.rounded_rectangle((35, y, 92, y + 16), 5, fill=primary, outline=accent, width=2)
        draw.ellipse((48, 47, 80, 79), fill=accent, outline=primary, width=3)
        draw.rectangle((57, 57, 71, 69), fill=dark)
        draw.line((40, 101, 32, 116), fill=accent, width=6)
        draw.line((88, 101, 96, 116), fill=accent, width=6)
    elif kind == "wraith":
        draw.polygon([(64, 12), (91, 31), (104, 60), (93, 94), (64, 111), (35, 94), (24, 59), (39, 31)], fill=dark, outline=primary)
        draw.line((22, 52, 106, 31), fill=accent, width=4)
        draw.line((15, 73, 116, 55), fill=primary, width=4)
        draw.line((28, 91, 106, 78), fill=accent, width=3)
        draw.ellipse((50, 49, 78, 79), fill=primary, outline=accent, width=3)
        draw.ellipse((59, 58, 69, 68), fill=dark)
    elif kind == "mimic":
        draw.rounded_rectangle((20, 42, 108, 100), 9, fill=dark, outline=primary, width=4)
        draw.polygon([(17, 47), (30, 18), (48, 35), (64, 14), (80, 35), (103, 18), (111, 47)], fill=primary, outline=accent)
        draw.rectangle((35, 57, 93, 76), fill=accent, outline=primary, width=2)
        draw.rectangle((48, 63, 58, 70), fill=dark)
        draw.rectangle((70, 63, 80, 70), fill=dark)
        draw.line((34, 98, 26, 115), fill=accent, width=6)
        draw.line((94, 98, 102, 115), fill=accent, width=6)
    elif kind in {"boss_entropy", "boss_void", "boss_core"}:
        draw.ellipse((13, 13, 115, 115), fill=dark, outline=primary, width=4)
        draw.ellipse((28, 28, 100, 100), outline=accent, width=4)
        draw.polygon([(64, 22), (81, 50), (108, 64), (81, 80), (64, 108), (47, 80), (20, 64), (47, 50)], fill=primary, outline=accent)
        draw.ellipse((51, 51, 77, 77), fill=dark, outline=accent, width=3)
        for angle in range(0, 360, 45):
            import math

            x1 = 64 + int(math.cos(math.radians(angle)) * 46)
            y1 = 64 + int(math.sin(math.radians(angle)) * 46)
            x2 = 64 + int(math.cos(math.radians(angle)) * 62)
            y2 = 64 + int(math.sin(math.radians(angle)) * 62)
            draw.line((x1, y1, x2, y2), fill=accent, width=3)
    else:
        draw.ellipse((24, 24, 104, 104), fill=primary, outline=accent, width=4)

    # Crisp highlight pixels establish a shared sprite language.
    for index in range(8):
        x = 22 + ((index * 29) + len(unit_id) * 7) % 84
        y = 18 + ((index * 17) + len(unit_id) * 3) % 88
        draw.rectangle((x, y, x + 2, y + 2), fill=accent)

    return image.resize((CANVAS, CANVAS), Image.Resampling.NEAREST)


def remove_checker_background(image: Image.Image) -> Image.Image:
    """Remove grayscale/checkerboard backgrounds from generated key art."""
    image = image.convert("RGB")
    array = np.asarray(image).astype(np.int16)
    spread = array.max(axis=2) - array.min(axis=2)
    # Generated checkerboards are low-chroma while the character is neon.
    mask = (spread > 34).astype(np.uint8) * 255
    mask_image = Image.fromarray(mask, "L").filter(ImageFilter.MaxFilter(17))
    # Keep the generated subject centered and avoid isolated scanline noise.
    mask_image = ImageChops.multiply(mask_image, Image.new("L", image.size, 255))
    rgba_image = image.convert("RGBA")
    rgba_image.putalpha(mask_image)
    bbox = mask_image.getbbox()
    if not bbox:
        return rgba_image
    left, top, right, bottom = bbox
    width, height = right - left, bottom - top
    padding = max(24, int(max(width, height) * 0.08))
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return rgba_image.crop((left, top, right, bottom))


def load_key_art(unit_id: str, spec: dict) -> Image.Image:
    source = SOURCE_DIR / f"{spec.get('source', unit_id)}.png"
    if source.exists():
        image = remove_checker_background(Image.open(source))
        image.thumbnail((224, 224), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.alpha_composite(image, ((CANVAS - image.width) // 2, (CANVAS - image.height) // 2))
        return canvas
    return fallback_art(unit_id, spec)


def tint_overlay(image: Image.Image, color: tuple[int, int, int, int], strength: int) -> Image.Image:
    overlay = Image.new("RGBA", image.size, (*color[:3], 0))
    overlay.putalpha(image.getchannel("A").point(lambda value: value * strength // 255))
    return Image.alpha_composite(image, overlay)


def frame_for(base: Image.Image, unit_id: str, state: str, frame: int, total: int) -> Image.Image:
    ratio = frame / max(1, total - 1)
    if state == "idle":
        scale = 1.0 + (0.025 if frame == 1 else 0)
        offset = (0, [-2, 1, -1][frame])
        image = base.resize((int(CANVAS * scale), int(CANVAS * scale)), Image.Resampling.NEAREST)
    elif state == "attack":
        scale = [0.96, 1.01, 1.08, 1.0][frame]
        offset = [(-3, 0), (2, -1), (9, 0), (3, 1)][frame]
        image = base.resize((int(CANVAS * scale), int(CANVAS * scale)), Image.Resampling.NEAREST)
    elif state == "hit":
        offset = [(-4, 0), (4, -1)][frame]
        image = base.copy()
    else:
        scale = [1.0, 0.98, 0.94, 0.86, 0.76][frame]
        offset = [(0, 0), (1, 2), (2, 6), (3, 11), (4, 18)][frame]
        image = base.resize((int(CANVAS * scale), int(CANVAS * scale)), Image.Resampling.NEAREST)
        image.putalpha(image.getchannel("A").point(lambda value: int(value * (1 - ratio * 0.82))))

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((CANVAS - image.width) // 2 + offset[0], (CANVAS - image.height) // 2 + offset[1]))

    if state == "attack":
        draw = ImageDraw.Draw(canvas, "RGBA")
        color = rgb(UNITS[unit_id]["accent"])
        slash_alpha = int(70 + ratio * 160)
        draw.line((144, 86, 235, 28), fill=(*color, slash_alpha), width=5)
        draw.line((156, 108, 244, 52), fill=(*color, slash_alpha // 2), width=3)
    elif state == "hit":
        canvas = tint_overlay(canvas, (255, 65, 85, 255), 125)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw.ellipse((66, 68, 190, 192), outline=(255, 230, 230, 220), width=4)
    elif state == "death":
        draw = ImageDraw.Draw(canvas, "RGBA")
        rng = random.Random(f"{unit_id}:death:{frame}")
        color = rgb(UNITS[unit_id]["accent"])
        for _ in range(14 - frame * 2):
            x = rng.randint(52, 205)
            y = rng.randint(42, 212)
            size = rng.randint(2, 7)
            draw.rectangle((x, y, x + size, y + size), fill=(*color, max(20, 180 - frame * 28)) )

    return canvas


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for unit_id, spec in UNITS.items():
        base = load_key_art(unit_id, spec)
        states = {"idle": 3, "attack": 4, "hit": 2, "death": 5}
        unit_dir = OUTPUT_DIR / unit_id
        unit_dir.mkdir(parents=True, exist_ok=True)
        for state, total in states.items():
            for frame in range(total):
                output = unit_dir / f"{state}_{frame + 1:02d}.png"
                frame_for(base, unit_id, state, frame, total).save(output, "PNG", optimize=True)
    print(f"Generated {len(UNITS)} units x 14 frames in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
