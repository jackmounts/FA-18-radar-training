/** Match a canvas' backing store to its CSS width × devicePixelRatio (height = width × ratio). Returns the width in device px. */
export function fitCanvas(canvas: HTMLCanvasElement, ratio = 1) {
  const w = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
  const h = Math.round(w * ratio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return w;
}
