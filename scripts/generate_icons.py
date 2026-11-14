"""Generate the small FFB Lens Chrome extension icons."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
ROOT.mkdir(parents=True, exist_ok=True)


def icon(size: int) -> None:
    scale = 4
    side = size * scale
    image = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, side - 1, side - 1), radius=side * 0.24, fill="#D1FA67")
    center = side / 2
    radius = side * 0.28
    diamond = [
        (center, center - radius),
        (center + radius, center),
        (center, center + radius),
        (center - radius, center),
    ]
    draw.line(diamond + [diamond[0]], fill="#142015", width=max(2, round(side * 0.075)), joint="curve")
    dot = side * 0.055
    draw.ellipse((center - dot, center - dot, center + dot, center + dot), fill="#142015")
    image.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / f"icon-{size}.png")


for size in (16, 48, 128):
    icon(size)
