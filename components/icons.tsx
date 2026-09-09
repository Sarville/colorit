// Shared UI icons (redesign). Inline SVG with currentColor so a single icon works on any
// button background (white circle, blue pill, accent circle) - unlike the pre-redesign
// approach of baked-color bitmaps behind CSS background-image classes.

export function PlayIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  );
}

export function GearIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.4 13a7.6 7.6 0 0 0 .06-1 7.6 7.6 0 0 0-.06-1l2.03-1.58a.5.5 0 0 0 .12-.65l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.4.96a7.5 7.5 0 0 0-1.73-1L14.5 2.6a.5.5 0 0 0-.5-.4h-3.84a.5.5 0 0 0-.5.4l-.4 2.6a7.5 7.5 0 0 0-1.73 1l-2.4-.96a.5.5 0 0 0-.6.22L2.6 8.77a.5.5 0 0 0 .12.65L4.75 11a7.6 7.6 0 0 0 0 2l-2.03 1.58a.5.5 0 0 0-.12.65l1.92 3.32c.13.22.4.31.6.22l2.4-.96c.53.43 1.1.77 1.73 1l.4 2.6c.05.24.26.4.5.4h3.84c.24 0 .45-.16.5-.4l.4-2.6a7.5 7.5 0 0 0 1.73-1l2.4.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.65zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7"/>
    </svg>
  );
}

export function HomeIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5z"/>
    </svg>
  );
}

export function ResetIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M20 8A8 8 0 1 0 21 13"/>
      <path d="M20 3v5h-5" strokeLinejoin="round"/>
    </svg>
  );
}

export function ChevronLeftIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7"/>
    </svg>
  );
}

export function ChevronRightIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7"/>
    </svg>
  );
}

// Solid (not outlined) triangles - used for the level prev/next arrows, which read as
// noticeably "softer" than the rest of the UI when drawn as thin chevron strokes.
export function TriangleLeftIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 4v16L6 12z"/>
    </svg>
  );
}

export function TriangleRightIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 4v16l10-8z"/>
    </svg>
  );
}
