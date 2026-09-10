import {Color, Modifier, SquareProps} from "@/components/Square/squareTypes";
import type {Level} from "@/lib/gameEngine";

// Compact on-disk encoding for a generated level - two single-char-per-cell strings (target
// colors + modifiers), the same scheme Levels/*.xml already uses for hand-authored packs (see
// levels/convert-levels.ts's colorMapping/modifierMapping). A cell's *current* color never needs
// storing: every non-modifier cell always starts blank and a modifier cell always starts pre-
// filled with its own target color, so both are fully derived from (target, modifier) alone.
// Needed because VK's per-key storage caps out at 4096 bytes (see pages/index.tsx's
// progressKeyForPack comment) - 5 daily levels as verbose {color,targetColor,modifier} JSON
// objects could get close to that; as two short strings each, they comfortably don't.

const COLOR_TO_CHAR: Record<Color, string> = {
  [Color.red]: "r", [Color.green]: "g", [Color.blue]: "b",
  [Color.yellow]: "o", [Color.indigo]: "d", [Color.none]: "0",
};
const CHAR_TO_COLOR: Record<string, Color> = Object.fromEntries(
  Object.entries(COLOR_TO_CHAR).map(([color, ch]) => [ch, color as Color])
);

const MODIFIER_TO_CHAR: Record<Modifier, string> = {
  [Modifier.none]: "0", [Modifier.up]: "U", [Modifier.right]: "R",
  [Modifier.down]: "D", [Modifier.left]: "L", [Modifier.circle]: "F",
  [Modifier.bomb]: "B", [Modifier.rotateUp]: "w", [Modifier.rotateRight]: "x",
  [Modifier.rotateDown]: "s", [Modifier.rotateLeft]: "a",
};
const CHAR_TO_MODIFIER: Record<string, Modifier> = Object.fromEntries(
  Object.entries(MODIFIER_TO_CHAR).map(([mod, ch]) => [ch, mod as Modifier])
);

export type CompactLevel = {
  rows: number;
  cols: number;
  targets: string;
  modifiers: string;
};

export function encodeLevel(level: Level): CompactLevel {
  const rows = level.length;
  const cols = level[0]?.length ?? 0;
  let targets = "";
  let modifiers = "";
  for (const row of level) {
    for (const sq of row) {
      targets += COLOR_TO_CHAR[sq.targetColor];
      modifiers += MODIFIER_TO_CHAR[sq.modifier];
    }
  }
  return {rows, cols, targets, modifiers};
}

export function decodeLevel(compact: CompactLevel): Level {
  const level: Level = [];
  for (let x = 0; x < compact.rows; x++) {
    const row: Array<SquareProps> = [];
    for (let y = 0; y < compact.cols; y++) {
      const i = x * compact.cols + y;
      const modifier = CHAR_TO_MODIFIER[compact.modifiers[i]] ?? Modifier.none;
      const targetColor = CHAR_TO_COLOR[compact.targets[i]] ?? Color.none;
      const color = modifier !== Modifier.none ? targetColor : Color.none;
      row.push({color, targetColor, modifier});
    }
    level.push(row);
  }
  return level;
}
