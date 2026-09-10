// Template-based generation, solver-first: take a real hand-authored level's exact layout (grid
// shape, walls, modifier positions/types - arrows, bombs, rotating arrows, circles, any mix) and
// apply a random color relabeling to it. A pure color permutation is a graph isomorphism of the
// puzzle - it can't change which cells are reachable from which modifier, so solvability and the
// minimum move count are mathematically unchanged, just with different colors on screen. This is
// deliberately NOT the earlier "independent vertical strips" generator (that produced flat,
// interaction-free puzzles - rejected as "not really a puzzle"); every wall/reachability
// relationship from the original hand-designed level is preserved exactly.
//
// solveLevel() below re-solves each recolored level from scratch (not trusting the isomorphism
// claim) and is expected to reproduce the same move count as the original template - that match
// is the actual verification, not the relabeling logic alone.
//
//   npx ts-node -r tsconfig-paths/register -O '{"module":"commonjs"}' levels/generate-from-template.ts

import {Color, Modifier, type SquareProps} from "@/components/Square/squareTypes";
import type {Level} from "@/lib/gameEngine";
import {decodeXmlLevel} from "@/levels/xmlLevelDecoder";
import {solveLevel} from "@/lib/levelSolver";

const PALETTE = [Color.red, Color.green, Color.blue, Color.yellow, Color.indigo];

function randomColorPermutation(): Record<Color, Color> {
  const shuffled = [...PALETTE];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const map = {[Color.none]: Color.none} as Record<Color, Color>;
  PALETTE.forEach((c, i) => { map[c] = shuffled[i]; });
  return map;
}

function recolor(level: Level, map: Record<Color, Color>): Level {
  return level.map((row) => row.map((sq): SquareProps => ({
    ...sq,
    color: map[sq.color],
    targetColor: map[sq.targetColor],
  })));
}

const COLOR_GLYPH: Record<Color, string> = {
  [Color.red]: "R", [Color.green]: "G", [Color.blue]: "B",
  [Color.yellow]: "Y", [Color.indigo]: "I", [Color.none]: ".",
};
const MODIFIER_GLYPH: Partial<Record<Modifier, string>> = {
  [Modifier.up]: "^", [Modifier.right]: ">", [Modifier.down]: "v", [Modifier.left]: "<",
  [Modifier.rotateUp]: "W", [Modifier.rotateRight]: "X", [Modifier.rotateDown]: "S", [Modifier.rotateLeft]: "A",
  [Modifier.circle]: "O", [Modifier.bomb]: "*",
};
// Lowercase = plain cell that starts already pre-filled (color !== none at the initial state);
// uppercase = plain cell that starts blank and needs to be reached by some modifier's fill/flood.
function glyph(sq: SquareProps): string {
  if (MODIFIER_GLYPH[sq.modifier]) {
    return MODIFIER_GLYPH[sq.modifier]!;
  }
  const letter = COLOR_GLYPH[sq.targetColor];
  return sq.color !== Color.none ? letter.toLowerCase() : letter;
}
function printBoard(level: Level) {
  for (const row of level) {
    console.log("    " + row.map(glyph).join(" "));
  }
}

const TEMPLATES: Array<{file: string; index: number; label: string}> = [
  {file: "Levels/levelsEasy.xml", index: 0, label: "Easy #0 template (plain arrows only)"},
  {file: "Levels/levelsEasy.xml", index: 26, label: "Easy #26 template (bomb only)"},
  {file: "Levels/levelsEasy.xml", index: 33, label: "Easy #33 template (rotating arrows only)"},
  {file: "Levels/levelsEasy.xml", index: 32, label: "Easy #32 template (rotating arrows + circle)"},
  {file: "Levels/levelsMedium.xml", index: 17, label: "Medium #17 template (bomb + circle + arrows)"},
];

let allMatch = true;
for (const {file, index, label} of TEMPLATES) {
  const {level: original, solutionMoves: expected} = decodeXmlLevel(file, index);
  const colorMap = randomColorPermutation();
  const generated = recolor(original, colorMap);

  const startedAt = Date.now();
  const result = solveLevel(generated, {maxDepth: 20, maxStates: 500000});
  const elapsedMs = Date.now() - startedAt;
  const matches = result !== null && result.moves === expected;
  allMatch = allMatch && matches;

  console.log(`\n=== ${label} ===`);
  console.log(`  recolor: ${PALETTE.map((c) => `${c}->${colorMap[c]}`).join(", ")}`);
  printBoard(generated);
  console.log(
    `  [${matches ? "OK" : "MISMATCH"}] template optimal=${expected}, solver on generated=${result?.moves ?? "UNSOLVED"} `
    + `(solved in ${elapsedMs}ms)`
  );
}

console.log(`\n=== summary ===`);
console.log(allMatch ? "All 5 generated levels verified solvable with the same optimal move count as their template." : "Some levels did NOT match - investigate before trusting this generator.");
