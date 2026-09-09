import { MouseEventHandler } from "react";
import {useColorScheme} from "@/theme/ColorSchemeContext";
import styles from "./Square.module.css";

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

// Lifted pixel-for-pixel from the original Android app's two texture atlases
// (texture_colorscheme_0.png / texture_colorscheme_1.png), scheme 1 being colorblind-friendly.
export const colorSchemes: Record<ColorScheme, Record<Exclude<Color, Color.none>, string>> = {
  0: {[Color.red]: "#f51518", [Color.green]: "#689f38", [Color.blue]: "#68a6e5", [Color.yellow]: "#f6ca18", [Color.indigo]: "#7d6a6c"},
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

export function Square(props: SquareProps) {
  const {scheme} = useColorScheme();
  // A cell with no target, no color and no modifier is unused grid padding - it must stay
  // invisible like the page background, not render as a white box.
  const isBlank = props.color === Color.none && props.targetColor === Color.none && props.modifier === Modifier.none;
  // Otherwise, empty cells render on white (not the enum's transparent "none") so they read
  // clearly. A modifier tile has no target color, so its border matches its own fill instead,
  // keeping it a flat block with no stray ring around it.
  const background = isBlank ? "transparent" : (props.color === Color.none ? "#FFFFFF" : getColorHex(props.color, scheme));
  const border = isBlank ? "transparent" : (props.targetColor === Color.none ? background : getColorHex(props.targetColor, scheme));
  return (
    <button
      className={`${styles.square} ${isBlank ? styles.blank : ""}`}
      style={{ backgroundColor: background, borderColor: border }}
      onClick={props.onClick}
    >
      <div className={`${styles.modifier} ${styles[props.modifier]}`}/>
    </button>
  );
}
