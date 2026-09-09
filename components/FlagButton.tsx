import {ButtonHTMLAttributes, CSSProperties, ReactNode, useLayoutEffect, useRef, useState} from "react";
import {flagPath} from "@/lib/flagPath";
import styles from "./FlagButton.module.css";

type FlagButtonProps = {
  pointLeft?: boolean;
  variant?: "wide" | "tag";
  ghost?: boolean;
  dense?: boolean;
  children: ReactNode;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled" | "className" | "aria-label">;

// Rounded-cap-left / single-rounded-point-right button, built from 4 stacked clip-path layers
// (outer border color, bright rim highlight, main gradient fill, inner top-shine sliver) - see
// lib/flagPath.ts for why this needs the button's own measured pixel size rather than a CSS-only
// shape. `pointLeft` mirrors it for the "back" button; the point itself IS the back cue, no
// separate chevron icon needed.
export function FlagButton({pointLeft, variant = "wide", ghost, dense, children, className, ...rest}: FlagButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const {width, height} = entry.contentRect;
      setSize({w: width, h: height});
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layerStyle = (inset: number): CSSProperties | undefined => {
    if (!size) return undefined;
    const w = size.w - inset * 2;
    const h = size.h - inset * 2;
    return {
      left: inset, top: inset, width: w, height: h,
      clipPath: `path("${flagPath(w, h, !!pointLeft)}")`,
    };
  };

  return (
    <button
      ref={ref}
      className={`${styles.btn} ${variant === "tag" ? styles.tag : styles.wide} ${ghost ? styles.ghost : ""} ${dense ? styles.dense : ""} ${className ?? ""}`}
      {...rest}
    >
      {size ? (
        <>
          <span className={styles.outer} style={layerStyle(0)}/>
          <span className={styles.rim} style={layerStyle(2)}/>
          <span className={styles.fill} style={layerStyle(4)}/>
          <span className={styles.shine} style={layerStyle(8)}/>
        </>
      ) : null}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
