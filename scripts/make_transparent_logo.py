"""
Create a transparent logo PNG from the current icon, which has a baked-in
checkerboard "transparency" background (no alpha channel).

Approach:
- Use corner samples as references for the checkerboard light/dark colors.
- Mark candidate pixels that are "close" to those reference colors.
- Compute connected components of candidate pixels.
- Clear only large components that touch the image edge (background), which
  avoids punching holes in small bright highlights inside the artwork.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "assets" / "icon.png"
DEFAULT_DST = ROOT / "assets" / "logo-transparent.png"


def corner_samples(img_rgb: Image.Image) -> list[tuple[int, int, int]]:
    w, h = img_rgb.size
    px = img_rgb.load()
    return [
        px[0, 0],
        px[w - 1, 0],
        px[0, h - 1],
        px[w - 1, h - 1],
    ]


def rgb_dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    # Manhattan distance is fast and good enough here.
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def make_background_mask_components(
    img_rgb: Image.Image,
    bg_refs: list[tuple[int, int, int]],
    tol: int = 36,
    min_component_size: int = 1500,
) -> list[list[bool]]:
    w, h = img_rgb.size
    px = img_rgb.load()

    def is_bg(rgb: tuple[int, int, int]) -> bool:
        return min(rgb_dist(rgb, ref) for ref in bg_refs) <= tol

    # Candidate mask: pixels close to either checkerboard reference color.
    candidate = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            candidate[y][x] = is_bg(px[x, y])

    visited = [[False] * w for _ in range(h)]
    clear = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def neighbors(x: int, y: int):
        if x > 0:
            yield x - 1, y
        if x + 1 < w:
            yield x + 1, y
        if y > 0:
            yield x, y - 1
        if y + 1 < h:
            yield x, y + 1

    for y0 in range(h):
        for x0 in range(w):
            if visited[y0][x0] or not candidate[y0][x0]:
                continue

            visited[y0][x0] = True
            q.clear()
            q.append((x0, y0))

            comp: list[tuple[int, int]] = []
            touches_edge = False

            while q:
                x, y = q.popleft()
                comp.append((x, y))
                if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                    touches_edge = True
                for nx, ny in neighbors(x, y):
                    if not visited[ny][nx] and candidate[ny][nx]:
                        visited[ny][nx] = True
                        q.append((nx, ny))

            # Background components are large and touch the edge.
            if touches_edge and len(comp) >= min_component_size:
                for x, y in comp:
                    clear[y][x] = True

    return clear


def main(src: Path = DEFAULT_SRC, dst: Path = DEFAULT_DST) -> None:
    if not src.exists():
        raise SystemExit(f"Source not found: {src}")

    img = Image.open(src).convert("RGBA")
    w, h = img.size

    img_rgb = img.convert("RGB")
    refs = corner_samples(img_rgb)
    mask = make_background_mask_components(img_rgb, refs, tol=42, min_component_size=2000)

    px = img.load()
    cleared = 0
    for y in range(h):
        row = mask[y]
        for x in range(w):
            if row[x]:
                r, g, b, _a = px[x, y]
                px[x, y] = (r, g, b, 0)
                cleared += 1

    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="PNG", optimize=True)

    print(f"Wrote: {dst}")
    print(f"Cleared pixels: {cleared} ({cleared/(w*h):.2%})")


if __name__ == "__main__":
    main()

