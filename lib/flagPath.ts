// Parametric version of the hand-tuned 300x74 reference button path (rounded-cap left, single
// rounded point right - or mirrored for "back" buttons). The reference used fixed pixel
// coordinates, which can't stretch to fit different button widths (word-fit tag buttons vs.
// full-width primary buttons) without either JS-side recomputation or visible distortion -
// clip-path: path() has no var()/calc()/percentage support, unlike polygon(). Every offset
// below is read off the reference path and expressed as a ratio of its own height (74px), so
// the cap/point geometry stays proportionally identical at any actual size; only the straight
// run in the middle changes with width.
export function flagPath(w: number, h: number, pointLeft: boolean): string {
  if (w <= 0 || h <= 0) return "";
  const s = h / 74;
  const capX = 36 * s;
  // Depth of the point from the shape's own right edge - a fraction of height, not width, so
  // it doesn't balloon on wide buttons.
  const shoulderX = w - 43 * s;

  const points = [
    ["M", capX, 0],
    ["H", shoulderX],
    ["Q", shoulderX + 7 * s, 0, shoulderX + 12 * s, 5 * s],
    ["L", shoulderX + 40 * s, 31 * s],
    ["Q", shoulderX + 44 * s, 35 * s, shoulderX + 40 * s, 40 * s],
    ["L", shoulderX + 12 * s, 69 * s],
    ["Q", shoulderX + 8 * s, h, shoulderX, h],
    ["H", capX],
    ["C", 16 * s, h, 0, 57 * s, 0, 37 * s],
    ["C", 0, 17 * s, 16 * s, 0, capX, 0],
    ["Z"],
  ] as const;

  const mirrorX = (x: number) => w - x;
  const toStr = (cmd: readonly (string | number)[]) => {
    const [op, ...nums] = cmd;
    if (op === "Z") return "Z";
    const xs = pointLeft
      ? (nums as number[]).map((n, i) => (i % 2 === 0 ? mirrorX(n) : n))
      : (nums as number[]);
    return `${op} ${xs.map((n) => n.toFixed(2)).join(" ")}`;
  };
  return points.map(toStr).join(" ");
}
