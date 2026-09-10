import {MouseEventHandler} from "react";

// Pure types/data only, deliberately split out of Square.tsx (which pulls in a CSS module) - the
// game engine, solver and level generator (lib/gameEngine.ts and friends) need Color/Modifier but
// must stay importable from plain ts-node (no CSS/webpack loader available there), and previously
// couldn't be since importing Square.tsx for its enums also imported its .module.css.

// Values are identity tokens used for game-logic equality (loaded levels reference these
// enum members directly) - the actual hex rendered depends on the active colorScheme, see below.
export enum Color {
  red = "red",
  green = "green",
  blue = "blue",
  yellow = "yellow",
  indigo = "indigo",
  none = "none",
}

export type ColorScheme = 0 | 1;

// Originally lifted pixel-for-pixel from the original Android app's two texture atlases
// (texture_colorscheme_0.png / texture_colorscheme_1.png); scheme 0's blue/green/indigo were
// later retuned more saturated for the paint-splash redesign. Scheme 1 (colorblind-friendly)
// keeps its original values untouched.
export const colorSchemes: Record<ColorScheme, Record<Exclude<Color, Color.none>, string>> = {
  0: {[Color.red]: "#f51518", [Color.green]: "#4caf50", [Color.blue]: "#2f8ce0", [Color.yellow]: "#f6ca18", [Color.indigo]: "#795548"},
  1: {[Color.red]: "#bf4b00", [Color.green]: "#005585", [Color.blue]: "#59bbf2", [Color.yellow]: "#f6ca18", [Color.indigo]: "#9b9b9b"},
};

export function getColorHex(color: Color, scheme: ColorScheme): string {
  if (color === Color.none) {
    return "#00000000"; // rgba transparent
  }
  return colorSchemes[scheme][color];
}

export enum Modifier {
  none = "none",
  up = "up",
  right = "right",
  down = "down",
  left = "left",
  rotateUp = "rotateUp",
  rotateRight = "rotateRight",
  rotateDown = "rotateDown",
  rotateLeft = "rotateLeft",
  circle = "circle",
  bomb = "bomb"
}

export type SquareProps = {
  key?: string;
  color: Color;
  targetColor: Color;
  modifier: Modifier;
  x?: number;
  y?: number;
  onClick?: MouseEventHandler;
};
