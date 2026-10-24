import { cmToPixels, pngWithDpi, zoomWindow } from "./plot-utils.js";
import { piLabel } from "./function-math.js";
export const xml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const decimal = (n, d = 3) =>
  Number.isFinite(n)
    ? Number(n.toFixed(d)).toLocaleString("pt-BR", {
        maximumFractionDigits: d,
        useGrouping: false,
      })
    : "indefinido";
function niceStep(span, space) {
  const raw = span / space,
    p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((x) => x * p).find((x) => x >= raw) || 10 * p;
}
export function graphGeometry(o) {
  const w = o.width || 900,
    h = o.height || 530,
    font = o.professional ? 14.6667 : 15,
    left = o.professional ? 44 : 52,
    right = o.professional ? 25 : 28,
    legendCount = o.legend
      ? o.curves.filter((c) => c.showEquation !== false).length
      : 0,
    legendStep = legendCount ? Math.min(20, (h * 0.4 - 20) / legendCount) : 20,
    top = legendCount ? Math.max(36, 20 + legendCount * legendStep) : 28,
    bottom = o.professional ? 34 : 38,
    W = w - left - right,
    H = h - top - bottom,
    X = (x) => left + ((x - o.xmin) / (o.xmax - o.xmin)) * W,
    Y = (y) => top + ((o.ymax - y) / (o.ymax - o.ymin)) * H;
  return {
    w,
    h,
    font,
    legendStep,
    left,
    right,
    top,
    bottom,
    W,
    H,
    X,
    Y,
    fromX: (v) => o.xmin + ((v - left) / W) * (o.xmax - o.xmin),
    fromY: (v) => o.ymax - ((v - top) / H) * (o.ymax - o.ymin),
  };
}
// Each discontinuity creates a new subpath. Adaptive midpoint refinement prevents
// chords across poles while keeping steep continuous curves drawable.
export function curvePath(fn, o, breaks = []) {
  const g = graphGeometry(o),
    { X, Y } = g,
    span = o.xmax - o.xmin,
    height = o.ymax - o.ymin;
  let d = "",
    last = null;
  const valid = (p) => Number.isFinite(p.y) && Math.abs(p.y) < 1e100,
    inside = (p) =>
      valid(p) &&
      p.y >= o.ymin - height * 0.25 &&
      p.y <= o.ymax + height * 0.25;
  const emit = (p, q) => {
    if (!valid(p) || !valid(q)) {
      last = null;
      return;
    }
    if (
      !inside(p) &&
      !inside(q) &&
      Math.sign(p.y - (o.ymax + o.ymin) / 2) ===
        Math.sign(q.y - (o.ymax + o.ymin) / 2)
    ) {
      last = null;
      return;
    }
    if (Math.abs(Y(p.y)) > 1e7 || Math.abs(Y(q.y)) > 1e7) {
      last = null;
      return;
    }
    if (
      !last ||
      Math.abs(last.x - p.x) > span * 1e-8 ||
      Math.abs(last.y - p.y) > height * 1e-8
    )
      d += `M${X(p.x).toFixed(2)},${Y(p.y).toFixed(2)}`;
    d += `L${X(q.x).toFixed(2)},${Y(q.y).toFixed(2)}`;
    last = q;
  };
  function segment(p, q, depth = 0) {
    const x = (p.x + q.x) / 2,
      m = { x, y: fn(x) },
      all = valid(p) && valid(q) && valid(m),
      curvature = all ? Math.abs(Y(m.y) - (Y(p.y) + Y(q.y)) / 2) : Infinity,
      range = all
        ? Math.max(
            Math.abs(p.y - q.y),
            Math.abs(p.y - m.y),
            Math.abs(q.y - m.y),
          )
        : Infinity;
    if (depth < 9 && (!all || curvature > 1.4 || range > height * 0.7)) {
      if (!valid(p) && !valid(q) && !valid(m)) {
        last = null;
        return;
      }
      segment(p, m, depth + 1);
      segment(m, q, depth + 1);
      return;
    }
    if (!all || curvature > 40 || range > height * 4) {
      last = null;
      return;
    }
    emit(p, q);
  }
  const cuts = [
    o.xmin,
    ...breaks.filter((x) => x > o.xmin && x < o.xmax),
    o.xmax,
  ];
  for (let k = 0; k < cuts.length - 1; k++) {
    last = null;
    const eps = span * 1e-8,
      lo = cuts[k] + (k ? eps : 0),
      hi = cuts[k + 1] - (k < cuts.length - 2 ? eps : 0),
      n = Math.max(4, Math.ceil((450 * (hi - lo)) / span));
    let p = { x: lo, y: fn(lo) };
    for (let i = 1; i <= n; i++) {
      let x = lo + ((hi - lo) * i) / n,
        q = { x, y: fn(x) };
      segment(p, q);
      p = q;
    }
  }
  return d;
}
export function buildGraph(o) {
  const g = graphGeometry(o),
    { w, h, left, right, top, bottom, W, H, X, Y, font } = g,
    ink = o.professional ? "#111111" : "#4f5d59",
    grid = o.professional ? "#dedede" : "#edf0ed",
    family = o.professional
      ? "Calibri,Arial,sans-serif"
      : "DM Sans,Arial,sans-serif",
    xAxis = Math.max(top, Math.min(h - bottom, Y(0))),
    yAxis = Math.max(left, Math.min(w - right, X(0)));
  let xstep;
  if (o.radians) {
    let steps = [
      Math.PI / 24,
      Math.PI / 12,
      Math.PI / 6,
      Math.PI / 4,
      Math.PI / 2,
      Math.PI,
      2 * Math.PI,
      4 * Math.PI,
      8 * Math.PI,
      16 * Math.PI,
      32 * Math.PI,
      64 * Math.PI,
      128 * Math.PI,
      256 * Math.PI,
      512 * Math.PI,
      1024 * Math.PI,
      2048 * Math.PI,
    ];
    xstep =
      steps.find((s) => s >= (o.xmax - o.xmin) / (W / 78)) || 4096 * Math.PI;
  } else xstep = niceStep(o.xmax - o.xmin, Math.max(3, W / 75));
  const ystep = niceStep(o.ymax - o.ymin, Math.max(3, H / 58)),
    id = "graph-clip";
  let html = `<defs><clipPath id="${id}"><rect x="${left}" y="${top}" width="${W}" height="${H}"/></clipPath><marker id="axis-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L7 3L0 6" fill="none" stroke="${ink}" stroke-width="1.05"/></marker></defs><g font-family="${family}" font-size="${font}" fill="${ink}">`;
  if (o.legend)
    o.curves
      .filter((c) => c.showEquation !== false)
      .forEach((c, i) => {
        html += `<line x1="${left}" x2="${left + 23}" y1="${19 + i * g.legendStep}" y2="${19 + i * g.legendStep}" stroke="${c.color}" stroke-width="1.6"/><text x="${left + 33}" y="${24 + i * g.legendStep}" font-size="${Math.min(font, g.legendStep - 2)}">${xml(c.label)}</text>`;
      });
  for (
    let i = Math.ceil(o.xmin / xstep);
    i <= Math.floor(o.xmax / xstep) && i - Math.ceil(o.xmin / xstep) < 80;
    i++
  ) {
    const x = i * xstep,
      u = X(x);
    if (o.grid)
      html += `<path d="M${u} ${top}V${h - bottom}" stroke="${grid}" stroke-width=".8"/>`;
    html += `<path d="M${u} ${xAxis - 4}v8" stroke="${ink}"/>`;
    if (Math.abs(x) > xstep * 1e-6)
      html += `<text x="${u}" y="${xAxis + font + 7 > h - 8 ? xAxis - 9 : xAxis + font + 7}" text-anchor="middle">${xml(o.radians ? piLabel(x) : decimal(x, 4))}</text>`;
  }
  for (
    let i = Math.ceil(o.ymin / ystep);
    i <= Math.floor(o.ymax / ystep) && i - Math.ceil(o.ymin / ystep) < 80;
    i++
  ) {
    const y = i * ystep,
      v = Y(y);
    if (o.grid)
      html += `<path d="M${left} ${v}H${w - right}" stroke="${grid}" stroke-width=".8"/>`;
    html += `<path d="M${yAxis - 4} ${v}h8" stroke="${ink}"/>`;
    if (Math.abs(y) > ystep * 1e-6)
      html += `<text x="${yAxis - 10}" y="${v + font * 0.32}" text-anchor="end">${xml(decimal(y, 4))}</text>`;
  }
  html += `<path d="M${left} ${xAxis}H${w - right + 8}" stroke="${ink}" stroke-width="1.05" marker-end="url(#axis-arrow)"/><path d="M${yAxis} ${h - bottom}V${top - 8}" stroke="${ink}" stroke-width="1.05" marker-end="url(#axis-arrow)"/>`;
  if (o.xmin <= 0 && o.xmax >= 0 && o.ymin <= 0 && o.ymax >= 0)
    html += `<text x="${yAxis - 10}" y="${xAxis + font + 7}" text-anchor="end">0</text>`;
  html += `<text x="${w - right + 9}" y="${xAxis - 12}" text-anchor="end" font-style="normal" font-weight="${o.axesBold ? 700 : 400}">${xml(o.xlabel || "")}</text><text x="${yAxis + 13}" y="${top - 9}" font-style="normal" font-weight="${o.axesBold ? 700 : 400}">${xml(o.ylabel || "")}</text><g clip-path="url(#${id})">`;
  for (const guide of o.guides || []) {
    if (guide.axis === "x" && guide.value >= o.xmin && guide.value <= o.xmax) {
      let x = X(guide.value);
      html += `<path d="M${x} ${top}V${h - bottom}" stroke="${guide.color || "#857294"}" stroke-dasharray="7 6" stroke-width="1.2"/>`;
    } else if (
      guide.axis === "y" &&
      guide.value >= o.ymin &&
      guide.value <= o.ymax
    ) {
      let y = Y(guide.value);
      html += `<path d="M${left} ${y}H${w - right}" stroke="${guide.color || "#857294"}" stroke-dasharray="7 6" stroke-width="1.2"/><text x="${w - right - 7}" y="${y - 7}" text-anchor="end" font-size="13">${xml(guide.label || decimal(guide.value))}</text>`;
    }
  }
  for (const c of o.curves)
    if (c.fn)
      html += `<path d="${curvePath(c.fn, o, c.breaks || [])}" fill="none" stroke="${c.color}" stroke-width="${o.professional ? 1.35 : 1.8}" stroke-linejoin="round" stroke-linecap="round"><title>${xml(c.label)}</title></path>`;
  for (const p of o.points || []) {
    if (p.x < o.xmin || p.x > o.xmax || p.y < o.ymin || p.y > o.ymax) continue;
    const x = X(p.x),
      y = Y(p.y);
    if (p.project)
      html += `<path d="M${yAxis} ${y}H${x}V${xAxis}" fill="none" stroke="${ink}" stroke-dasharray="5 4" stroke-width="1"/>`;
    html += `<circle cx="${x}" cy="${y}" r="3" fill="${ink}"/><text x="${Math.min(w - right - 6, Math.max(left + 6, x + 10))}" y="${Math.max(top + font, y - 12)}" text-anchor="${x > w - right - 120 ? "end" : "start"}">${xml(p.label || `(${o.radians ? piLabel(p.x) : decimal(p.x)}; ${decimal(p.y)})`)}</text>`;
  }
  html += '</g><g id="graph-trace" aria-hidden="true"></g></g>';
  return {
    inner: html,
    geometry: g,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${o.widthCm ? o.widthCm + "cm" : w}" height="${o.heightCm ? o.heightCm + "cm" : h}" viewBox="0 0 ${w} ${h}">${html.replace('<g id="graph-trace" aria-hidden="true"></g>', "")}</svg>`,
  };
}
export function drawGraph(element, o) {
  const result = buildGraph(o);
  element.setAttribute(
    "viewBox",
    `0 0 ${result.geometry.w} ${result.geometry.h}`,
  );
  element.setAttribute("width", result.geometry.w);
  element.setAttribute("height", result.geometry.h);
  element.innerHTML = result.inner;
  return result;
}
export function attachTrace(element, getOptions, onRead) {
  const show = (x, mouseY = null) => {
    let o = getOptions(),
      g = graphGeometry(o);
    if (x < o.xmin || x > o.xmax) return;
    let candidates = o.curves
      .map((c) => ({ ...c, value: c.fn?.(x) }))
      .filter(
        (c) =>
          Number.isFinite(c.value) && c.value >= o.ymin && c.value <= o.ymax,
      );
    if (!candidates.length) {
      element.querySelector("#graph-trace").innerHTML = "";
      onRead?.("Nenhuma curva definida nesta coordenada.");
      return;
    }
    if (mouseY !== null)
      candidates.sort(
        (a, b) =>
          Math.abs(g.Y(a.value) - mouseY) - Math.abs(g.Y(b.value) - mouseY),
      );
    let c = candidates[0],
      px = g.X(x),
      py = g.Y(c.value),
      label = `${c.name || "f"}: (${o.radians ? piLabel(x) : decimal(x)}; ${decimal(c.value)})`,
      tx = Math.max(g.left + 4, Math.min(g.w - g.right - 220, px + 14)),
      ty = Math.max(g.top + 24, Math.min(g.h - g.bottom - 12, py - 15));
    element.querySelector("#graph-trace").innerHTML =
      `<path d="M${px} ${g.top}V${g.h - g.bottom}" stroke="#708472" stroke-width="1" stroke-dasharray="4 5"/><circle cx="${px}" cy="${py}" r="5" fill="${c.color}" stroke="white" stroke-width="2"/><rect x="${tx}" y="${ty - 22}" width="216" height="29" rx="5" fill="#fff" stroke="#bdcdbb"/><text x="${tx + 9}" y="${ty - 3}" font-family="Arial,sans-serif" font-size="15" fill="#243d2e">${xml(label)}</text>`;
    onRead?.(label);
  };
  element.onpointermove = (e) => {
    const matrix = element.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        matrix.inverse(),
      ),
      o = getOptions(),
      g = graphGeometry(o);
    if (
      p.x < g.left ||
      p.x > g.w - g.right ||
      p.y < g.top ||
      p.y > g.h - g.bottom
    )
      return;
    show(g.fromX(p.x), p.y);
  };
  element.onpointerleave = () => {
    const group = element.querySelector("#graph-trace");
    if (group) group.innerHTML = "";
  };
  return show;
}
export function downloadGraph(options, format = "svg") {
  const source = buildGraph(options).svg;
  return new Promise((resolve, reject) => {
    const save = (blob, ext) => {
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "grafico-matematico." + ext;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    };
    if (format === "svg") {
      save(new Blob([source], { type: "image/svg+xml;charset=utf-8" }), "svg");
      return;
    }
    const url = URL.createObjectURL(
        new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
      ),
      img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = options.widthCm
        ? cmToPixels(options.widthCm, 300)
        : options.width;
      canvas.height = options.heightCm
        ? cmToPixels(options.heightCm, 300)
        : options.height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(Error("Não foi possível exportar o PNG."));
          return;
        }
        try {
          save(
            options.widthCm
              ? new Blob([pngWithDpi(await blob.arrayBuffer(), 300)], {
                  type: "image/png",
                })
              : blob,
            "png",
          );
        } catch (e) {
          reject(e);
        }
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Não foi possível gerar a imagem."));
    };
    img.src = url;
  });
}

export function attachGraphZoom(element, getOptions, apply) {
  const wheel = (e) => {
    const matrix = element.getScreenCTM();
    if (!matrix) return;
    e.preventDefault();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        matrix.inverse(),
      ),
      o = getOptions(),
      g = graphGeometry(o);
    const x = g.fromX(Math.max(g.left, Math.min(g.w - g.right, p.x))),
      y = g.fromY(Math.max(g.top, Math.min(g.h - g.bottom, p.y)));
    const delta =
      e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    apply(
      zoomWindow(
        o,
        Math.exp(Math.max(-0.5, Math.min(0.5, delta * 0.0015))),
        x,
        y,
      ),
    );
  };
  element.addEventListener("wheel", wheel, { passive: false });
  return () => element.removeEventListener("wheel", wheel);
}
