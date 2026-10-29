/** Joins class names, skipping falsy values. */
export function cn(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(' ');
}

/*
  Scrollbar standard (apply to any overflow-y-auto area)
  - Thin, with a transparent track
  - Pale thumb at rest, darker while the area is hovered
  - Uses the standard scrollbar-* properties (Chrome 121+, Firefox, Safari 18.2+)
*/
export const scrollArea =
  '[scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent] hover:[scrollbar-color:#a1a1aa_transparent]';