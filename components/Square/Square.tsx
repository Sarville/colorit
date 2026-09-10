import {useColorScheme} from "@/theme/ColorSchemeContext";
import {Color, getColorHex, Modifier, SquareProps} from "./squareTypes";
import styles from "./Square.module.css";

export * from "./squareTypes";

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
