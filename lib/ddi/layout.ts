/** Tactical (B-scope) region inside the DDI screen, as fractions of the screen edge. */
export const REGION = { x0: 0.15, y0: 0.15, x1: 0.85, y1: 0.85 };

/** Pushbutton positions along each screen edge, as fractions of the edge. */
export const PB_T = [0.2, 0.35, 0.5, 0.65, 0.8];

export type Edge = 'left' | 'top' | 'right' | 'bottom';

/** PB1-5 left (bottom->top), PB6-10 top (left->right), PB11-15 right (top->bottom), PB16-20 bottom (right->left). */
export function pbPlace(n: number): { side: Edge; t: number } {
  if (n <= 5) return { side: 'left', t: PB_T[5 - n] };
  if (n <= 10) return { side: 'top', t: PB_T[n - 6] };
  if (n <= 15) return { side: 'right', t: PB_T[n - 11] };
  return { side: 'bottom', t: PB_T[20 - n] };
}
