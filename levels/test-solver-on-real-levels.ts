// Solver-first sanity check, run BEFORE trusting the solver for generation: decode a handful of
// real hand-authored levels (Levels/*.xml) that deliberately cover different modifier mixes -
// plain arrows only, bomb only, rotating arrows, rotating+circle, a rotate+bomb+circle mix, and
// one that relies on cells starting pre-filled (see xmlLevelDecoder.ts) - and confirm
// solveLevel() actually finds each one's known-correct minimum move count (the XML's own
// `solution` attribute length). If this doesn't check out, nothing generated from the solver
// afterward can be trusted either.
//
//   npx ts-node -r tsconfig-paths/register -O '{"module":"commonjs"}' levels/test-solver-on-real-levels.ts

import {decodeXmlLevel} from "@/levels/xmlLevelDecoder";
import {solveLevel} from "@/lib/levelSolver";

const CASES: Array<{file: string; index: number; label: string}> = [
  {file: "Levels/levelsEasy.xml", index: 0, label: "Easy #0 - plain arrows only"},
  {file: "Levels/levelsEasy.xml", index: 26, label: "Easy #26 - bomb only"},
  {file: "Levels/levelsEasy.xml", index: 33, label: "Easy #33 - rotating arrows only"},
  {file: "Levels/levelsEasy.xml", index: 32, label: "Easy #32 - rotating arrows + circle"},
  {file: "Levels/levelsHard.xml", index: 4, label: "Hard #4 - rotate + bomb + circle"},
  {file: "Levels/levelsMedium.xml", index: 17, label: "Medium #17 - bomb + circle + arrows + pre-filled cells"},
];

let allPass = true;
for (const {file, index, label} of CASES) {
  const {level, solutionMoves} = decodeXmlLevel(file, index);
  const startedAt = Date.now();
  const result = solveLevel(level, {maxDepth: 20, maxStates: 500000});
  const elapsedMs = Date.now() - startedAt;
  const ok = result !== null && result.moves === solutionMoves;
  allPass = allPass && ok;
  console.log(
    `[${ok ? "OK" : "FAIL"}] ${label}: expected=${solutionMoves} moves, solver found=${result?.moves ?? "UNSOLVED"} `
    + `moves in ${elapsedMs}ms`
  );
}
process.exitCode = allPass ? 0 : 1;
