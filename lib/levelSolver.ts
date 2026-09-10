import {Modifier} from "@/components/Square/squareTypes";
import {checkGameIsWon, loadLevel, updateGame, type Coordinate, type Level} from "@/lib/gameEngine";

export type SolveResult = {
  moves: number;
  path: Array<Coordinate>;
};

// targetColor never changes during play (only color and, for rotating arrows, modifier do), so
// it's left out of the state key - two states with the same color+modifier grid are the same
// game state regardless of the (fixed) targets.
function encodeState(level: Level): string {
  return level.map((row) => row.map((sq) => sq.color[0] + sq.modifier).join(",")).join(";");
}

// Breadth-first search over reachable board states (not over move sequences), so the first time
// a won state is reached is guaranteed to be via the minimum number of clicks - exactly what
// "optimal moves" needs. Levels here are small (a handful of clickable modifier squares, boards
// under ~30 cells), so the reachable-state graph stays small enough for plain BFS with a
// visited-set to finish in well under a second.
// ponytail: no A*/heuristic pruning - add one (e.g. count of not-yet-matched cells) if generated
// levels ever need to grow past what plain BFS handles within maxStates.
export function solveLevel(initial: Level, opts: {maxDepth?: number; maxStates?: number; maxTimeMs?: number} = {}): SolveResult | null {
  const maxDepth = opts.maxDepth ?? 14;
  const maxStates = opts.maxStates ?? 200000;
  // Undefined by default (no wall-clock cap) - callers doing a lot of these (the daily-pool
  // generator) pass one to bound how long a single stubborn candidate can run for.
  const maxTimeMs = opts.maxTimeMs;
  const startedAt = Date.now();

  const start = loadLevel(initial);
  if (checkGameIsWon(start)) {
    return {moves: 0, path: []};
  }

  const clickable: Array<Coordinate> = [];
  start.forEach((row, x) => row.forEach((sq, y) => {
    if (sq.modifier !== Modifier.none) {
      clickable.push({x, y});
    }
  }));
  if (clickable.length === 0) {
    return null;
  }

  const visited = new Set<string>([encodeState(start)]);
  let frontier: Array<{state: Level; path: Array<Coordinate>}> = [{state: start, path: []}];

  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: typeof frontier = [];
    for (const {state, path} of frontier) {
      for (const {x, y} of clickable) {
        const nextState = updateGame(x, y, state);
        const key = encodeState(nextState);
        if (visited.has(key)) {
          continue;
        }
        visited.add(key);
        const nextPath = [...path, {x, y}];
        if (checkGameIsWon(nextState)) {
          return {moves: depth, path: nextPath};
        }
        if (visited.size > maxStates) {
          return null;
        }
        if (maxTimeMs !== undefined && visited.size % 2000 === 0 && Date.now() - startedAt > maxTimeMs) {
          return null;
        }
        next.push({state: nextState, path: nextPath});
      }
    }
    if (next.length === 0) {
      return null;
    }
    frontier = next;
  }
  return null;
}
