import fs from "fs";
import {Color, Modifier, type SquareProps} from "@/components/Square/squareTypes";
import type {Level} from "@/lib/gameEngine";

// Same mapping as levels/convert-levels.ts (kept separate rather than imported from there -
// convert-levels.ts is a build-time codegen script with its own XMLParser-based pipeline, this is
// a lighter read-only decoder for dev tools/tests that just need a handful of levels as data).
const colorMapping: Record<string, Color> = {
  r: Color.red, g: Color.green, b: Color.blue, o: Color.yellow, d: Color.indigo, "0": Color.none, X: Color.none,
};
const modifierMapping: Record<string, Modifier> = {
  "0": Modifier.none, U: Modifier.up, R: Modifier.right, D: Modifier.down, L: Modifier.left,
  w: Modifier.rotateUp, x: Modifier.rotateRight, s: Modifier.rotateDown, a: Modifier.rotateLeft,
  F: Modifier.circle, B: Modifier.bomb,
};

export function decodeXmlLevel(xmlPath: string, index: number): {level: Level; solutionMoves: number | null} {
  const xml = fs.readFileSync(xmlPath, "utf-8");
  const entry = xml.match(/<level[\s\S]*?\/>/g)![index];
  const colorAttr = /color="([^"]*)"/.exec(entry)![1];
  const modifierAttr = /modifier="([^"]*)"/.exec(entry)![1];
  const solution = /solution="([^"]*)"/.exec(entry)?.[1];
  const colorRows = colorAttr.split("\n").map((l) => l.trim()).filter((l) => l.length);
  const modifierRows = modifierAttr.split("\n").map((l) => l.trim()).filter((l) => l.length);

  // A modifier-grid character that isn't a recognized modifier code (most commonly a plain color
  // letter, occasionally 'X') doesn't just mean "no modifier" - per levels/convert-levels.ts, it
  // ALSO sets that cell's *starting* color via colorMapping on that same character, independent of
  // the target-color grid. This is how several real levels place cells that begin pre-filled
  // (sometimes already matching their target, sometimes not) without being clickable themselves -
  // missing this produced a level with extra cells wrongly starting blank, which is a different
  // (and not necessarily even solvable) puzzle from the real one.
  const level: Level = colorRows.map((row, x) =>
    Array.from(row).map((ch, y): SquareProps => {
      const modChar = modifierRows[x][y];
      const modifier = modifierMapping[modChar] ?? Modifier.none;
      const targetColor = colorMapping[ch] ?? Color.none;
      const startColor = colorMapping[modChar] ?? Color.none;
      const color = modifier !== Modifier.none ? targetColor : startColor;
      return {color, targetColor, modifier};
    })
  );
  const solutionMoves = solution ? solution.split(",").filter((m) => m.trim()).length : null;
  return {level, solutionMoves};
}
