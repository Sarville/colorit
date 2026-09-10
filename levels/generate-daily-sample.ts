// Standalone dev tool - prints a few random entries from each difficulty tier of the built daily
// pool (levels/DailyPool.ts, built by levels/build-daily-pool.ts), to eyeball what a real daily
// draw would look like.
//
//   npx ts-node --transpile-only -r ./levels/cssStub.js -r tsconfig-paths/register -O '{"module":"commonjs","jsx":"react"}' levels/generate-daily-sample.ts

import {Color, Modifier, type SquareProps} from "@/components/Square/squareTypes";
import type {Level} from "@/lib/gameEngine";
import {DailyPool} from "@/levels/DailyPool";
import type {ScoredPack} from "@/lib/scoring";

const COUNT_PER_DIFFICULTY = 5;

const COLOR_GLYPH: Record<Color, string> = {
  [Color.red]: "R", [Color.green]: "G", [Color.blue]: "B",
  [Color.yellow]: "Y", [Color.indigo]: "I", [Color.none]: ".",
};
const MODIFIER_GLYPH: Partial<Record<Modifier, string>> = {
  [Modifier.up]: "^", [Modifier.right]: ">", [Modifier.down]: "v", [Modifier.left]: "<",
  [Modifier.rotateUp]: "W", [Modifier.rotateRight]: "X", [Modifier.rotateDown]: "S", [Modifier.rotateLeft]: "A",
  [Modifier.circle]: "O", [Modifier.bomb]: "*",
};
function glyph(sq: SquareProps): string {
  if (MODIFIER_GLYPH[sq.modifier]) return MODIFIER_GLYPH[sq.modifier]!;
  const letter = COLOR_GLYPH[sq.targetColor];
  return sq.color !== Color.none ? letter.toLowerCase() : letter;
}
function printBoard(level: Level) {
  for (const row of level) console.log("    " + row.map(glyph).join(" "));
}

for (const difficulty of ["Easy", "Medium", "Hard"] as Array<ScoredPack>) {
  const pool = DailyPool.filter((e) => e.difficulty === difficulty);
  console.log(`\n=== ${difficulty} (${pool.length} in pool) ===`);
  const sample = [...pool].sort(() => Math.random() - 0.5).slice(0, COUNT_PER_DIFFICULTY);
  sample.forEach((entry, i) => {
    console.log(`  #${i + 1}: ${entry.level.length}x${entry.level[0].length} grid, optimal=${entry.optimal} moves`);
    printBoard(entry.level);
  });
}
