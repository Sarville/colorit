import {CSSProperties} from "react";

export type SplashSpec = {
  src: "splash1" | "splash2" | "splash3" | "splash4" | "splash5" | "splash6" | "splash7" | "splash8";
  style: CSSProperties;
};

// One shared layout, reused by every screen, framing the viewport the way the old baked-in
// background image used to (blue top-left, yellow top-right, green/teal right edge, pink
// bottom-left, purple/blue bottom-right) - now that the background itself (bg.svg) is a
// plain gradient with no splashes of its own.
// The peek-off-edge offset is a fixed px value (not a % of viewport width) tied to each
// item's own maxWidth - a %, resolved against the viewport for a position:fixed element,
// pushed these fully off-screen on wide viewports (e.g. -9% is -35px on a 390px phone,
// keeping most of the image on-screen, but -143px on a 1600px desktop - well past the
// image's own ~125px width, so nothing was left visible).
export const defaultSplashes: Array<SplashSpec> = [
  {src: "splash1", style: {top: "3%", left: "-35px", width: "27vw", maxWidth: 125, transform: "rotate(-14deg)"}},
  {src: "splash2", style: {top: "1%", right: "-39px", width: "29vw", maxWidth: 135, transform: "rotate(12deg)"}},
  {src: "splash7", style: {top: "38%", right: "-43px", width: "20vw", maxWidth: 95, transform: "rotate(-6deg)"}},
  {src: "splash3", style: {top: "42%", left: "-39px", width: "18vw", maxWidth: 85, transform: "rotate(10deg)"}},
  {src: "splash3", style: {bottom: "5%", left: "-43px", width: "26vw", maxWidth: 120, transform: "rotate(-18deg)"}},
  {src: "splash5", style: {bottom: "3%", right: "-35px", width: "27vw", maxWidth: 125, transform: "rotate(16deg)"}},
];

// Decorative paint-splash corner accents. Fixed to the viewport (not the scrolling content)
// so they behave like a vignette around every screen instead of adding to page scroll height,
// and so a handful of tiny images never becomes a layout/overflow concern on odd viewports.
export function Splashes({items}: { items: Array<SplashSpec> }) {
  return (
    <>
      {items.map((item, i) => (
        <img
          key={i}
          src={`./images/${item.src}.webp`}
          alt=""
          aria-hidden="true"
          className="col-splash"
          style={item.style}
        />
      ))}
    </>
  );
}
