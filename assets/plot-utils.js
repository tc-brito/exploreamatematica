export function cmToPixels(cm, dpi = 96) {
  return Math.round((cm * dpi) / 2.54);
}
export function zoomWindow(
  view,
  factor,
  anchorX = (view.xmin + view.xmax) / 2,
  anchorY = (view.ymin + view.ymax) / 2,
) {
  const sx = view.xmax - view.xmin,
    sy = view.ymax - view.ymin;
  factor = Math.max(
    1e-4 / Math.min(sx, sy),
    Math.min(20000 / Math.max(sx, sy), factor),
  );
  const axis = (lo, hi, anchor) => {
    let a = anchor + (lo - anchor) * factor,
      b = anchor + (hi - anchor) * factor;
    if (a < -10000) {
      b += -10000 - a;
      a = -10000;
    }
    if (b > 10000) {
      a -= b - 10000;
      b = 10000;
    }
    return [a, b];
  };
  const [xmin, xmax] = axis(view.xmin, view.xmax, anchorX),
    [ymin, ymax] = axis(view.ymin, view.ymax, anchorY);
  return { xmin, xmax, ymin, ymax };
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// Browsers encode canvas PNGs at 96 dpi. Store physical resolution so office apps
// can preserve the teacher's requested size in centimetres at print quality.
export function pngWithDpi(bytes, dpi = 300) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (input.length < 33 || input[0] !== 137 || input[1] !== 80)
    throw Error("PNG inválido.");
  const chunk = new Uint8Array(21),
    v = new DataView(chunk.buffer);
  v.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  const ppm = Math.round(dpi / 0.0254);
  v.setUint32(8, ppm);
  v.setUint32(12, ppm);
  chunk[16] = 1;
  v.setUint32(17, crc32(chunk.slice(4, 17)));
  const parts = [input.slice(0, 33), chunk];
  let offset = 33;
  while (offset + 12 <= input.length) {
    const len = new DataView(
        input.buffer,
        input.byteOffset + offset,
        4,
      ).getUint32(0),
      end = offset + 12 + len;
    if (end > input.length) throw Error("PNG incompleto.");
    if (String.fromCharCode(...input.slice(offset + 4, offset + 8)) !== "pHYs")
      parts.push(input.slice(offset, end));
    offset = end;
  }
  const out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

export function panWindow(view, dx, dy) {
  dx = Math.max(-10000 - view.xmin, Math.min(10000 - view.xmax, dx));
  dy = Math.max(-10000 - view.ymin, Math.min(10000 - view.ymax, dy));
  return {
    xmin: view.xmin + dx,
    xmax: view.xmax + dx,
    ymin: view.ymin + dy,
    ymax: view.ymax + dy,
  };
}
