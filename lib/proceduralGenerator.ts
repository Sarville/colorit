import {Color, Modifier, SquareProps} from "@/components/Square/squareTypes";
import type {Level} from "@/lib/gameEngine";
import {solveLevel} from "@/lib/levelSolver";
import type {ScoredPack} from "@/lib/scoring";

export type PoolDifficulty = ScoredPack;

const PALETTE: Array<Color> = [Color.red, Color.green, Color.blue, Color.yellow, Color.indigo];
const ARROW_TYPES: Array<Modifier> = [Modifier.up, Modifier.right, Modifier.down, Modifier.left];

// Real (not template-recolored) procedural generation: random grid, random modifier placement
// (arrows/circles), random target colors biased toward cells a modifier can actually reach - but
// crucially NO forced walls between different modifiers' territory, unlike the first version of
// this generator (independent vertical "paint strips" - rejected as "not really a puzzle", no
// interaction between regions). Without walls, two modifiers' reachable cells can overlap, and a
// solvable candidate found by generate-and-test may genuinely require a specific click order
// (fill the smaller region before the bigger one would have swallowed the shared cells, etc.) -
// that's what makes an accepted candidate a real puzzle instead of a checklist. Most random
// candidates are NOT solvable at all (a circle can flood straight through what was meant to be a
// neighbour's territory) - solveLevel() is the actual filter, not the construction.
// Calibrated empirically (see levels/build-daily-pool.ts's dev notes): pushing grid/modifier
// count further to chase longer hand-pack-like solutions (15-40 moves) made the hit rate collapse
// (most random layouts becomes unsolvable at all past a certain size) without reliably producing
// longer solutions anyway - a handful of overlapping regions tops out around 8-12 moves regardless
// of board size. So difficulty here is NOT gated to a gated a fixed move-count band per tier the
// way the hand-authored Easy/Medium/Hard packs are; buildDailyPool.ts classifies every generated
// (and every re-verified Community) level into a pool tier by its OWN measured optimal instead -
// genuinely long/complex pool entries come from Community levels, not generation.
const CONFIG: Record<PoolDifficulty, {
  rows: [number, number]; cols: [number, number]; modifiers: [number, number]; circleRadius: number;
}> = {
  Easy: {rows: [4, 5], cols: [4, 5], modifiers: [2, 3], circleRadius: 4},
  Medium: {rows: [5, 6], cols: [5, 6], modifiers: [3, 4], circleRadius: 5},
  Hard: {rows: [5, 6], cols: [6, 7], modifiers: [4, 5], circleRadius: 5},
};

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function pick<T>(arr: Array<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type ModPlacement = {x: number; y: number; type: Modifier; color: Color};

function buildCandidate(difficulty: PoolDifficulty): Level {
  const cfg = CONFIG[difficulty];
  const rows = randInt(...cfg.rows);
  const cols = randInt(...cfg.cols);
  const modCount = randInt(...cfg.modifiers);

  const placements: Array<ModPlacement> = [];
  while (placements.length < modCount) {
    const x = randInt(0, rows - 1);
    const y = randInt(0, cols - 1);
    if (placements.some((p) => p.x === x && p.y === y)) continue;
    const type = Math.random() < 0.4 ? Modifier.circle : pick(ARROW_TYPES);
    placements.push({x, y, type, color: pick(PALETTE)});
  }

  const grid: Level = Array.from({length: rows}, () =>
    Array.from({length: cols}, (): SquareProps => ({color: Color.none, targetColor: Color.none, modifier: Modifier.none}))
  );
  placements.forEach((p) => { grid[p.x][p.y] = {color: p.color, targetColor: p.color, modifier: p.type}; });

  for (let x = 0; x < rows; x++) {
    for (let y = 0; y < cols; y++) {
      if (placements.some((p) => p.x === x && p.y === y)) continue;
      const compatible = placements.filter((p) => {
        if (p.type === Modifier.circle) return Math.abs(p.x - x) + Math.abs(p.y - y) <= cfg.circleRadius;
        if (p.type === Modifier.right) return p.x === x && y > p.y;
        if (p.type === Modifier.left) return p.x === x && y < p.y;
        if (p.type === Modifier.down) return p.y === y && x > p.x;
        if (p.type === Modifier.up) return p.y === y && x < p.x;
        return false;
      });
      if (compatible.length === 0) continue; // stays a blank/wall cell - nothing can reach it
      grid[x][y] = {color: Color.none, targetColor: pick(compatible).color, modifier: Modifier.none};
    }
  }

  return grid;
}

export type SolveBudget = {maxDepth?: number; maxStates?: number; maxTimeMs?: number};

// Uses `profile` (which grid/modifier-count preset to build from) purely to bias the *attempt*
// toward more or less complexity - the actual difficulty of what comes back is whatever the
// solver measures, see the CONFIG comment above. `minMoves` (default 2, i.e. "anything solvable")
// keeps retrying until a candidate reaches at least that many moves - without it, generation
// almost always accepts the very first (usually low-move) solvable candidate, since the search
// doesn't otherwise prefer harder outcomes. Callers that want a specific difficulty tier should
// still classify the result themselves - `minMoves` only biases the search, it isn't a guarantee.
// `solveBudget` is per-candidate (not per generateLevel() call) - a generous maxTimeMs here lets
// the search dig for a genuinely long solution on any one candidate instead of giving up after a
// fixed, possibly-too-small state count.
export function generateLevel(
  profile: PoolDifficulty, maxAttempts = 400, minMoves = 2, solveBudget: SolveBudget = {}
): {level: Level; optimal: number} | null {
  const opts = {maxDepth: 20, maxStates: 40000, ...solveBudget};
  for (let i = 0; i < maxAttempts; i++) {
    const level = buildCandidate(profile);
    const result = solveLevel(level, opts);
    if (result && result.moves >= minMoves) {
      return {level, optimal: result.moves};
    }
  }
  return null;
}
