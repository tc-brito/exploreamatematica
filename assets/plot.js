import { cmToPixels, pngWithDpi, zoomWindow, panWindow } from "./plot-utils.js";
import { findIntersections } from "./graph-analysis.js";
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
export function axisNumber(n, o = {}) {
  return o.professional
    ? Number(n.toFixed(4))
        .toLocaleString("pt-BR", {
          maximumFractionDigits: 4,
          useGrouping: true,
        })
        .replaceAll(".", " ")
    : decimal(n, 4);
}
export function radianTick(x, top, value, font = 15) {
  const label = piLabel(value),
    m = label.match(/^([−-]?)([^/]+)\/(\d+)$/);
  if (!m)
    return `<text x="${x}" y="${top + font}" text-anchor="middle">${xml(label)}</text>`;
  const small = font * 0.9,
    width = Math.max(m[2].length, m[3].length) * small * 0.56 + 4;
  return `<g class="radian-fraction" aria-label="${xml(label)}" font-style="normal" font-size="${small}">${m[1] ? `<text x="${x - width / 2 - 3}" y="${top + font * 1.25}" text-anchor="end">−</text>` : ""}<text x="${x}" y="${top + small}" text-anchor="middle">${xml(m[2])}</text><line x1="${x - width / 2}" x2="${x + width / 2}" y1="${top + font}" y2="${top + font}" stroke="currentColor" stroke-width="0.8"/><text x="${x}" y="${top + font * 1.95}" text-anchor="middle">${xml(m[3])}</text></g>`;
}
export function graphGeometry(o) {
  const w = o.width || 900,
    h = o.height || 530,
    font = o.professional ? 14.6667 : 18,
    left = Math.max(
      52,
      Math.min(w * 0.35, (o.ylabel || "").length * font * 0.52 + 18),
      Math.min(
        w * 0.25,
        Math.max(axisNumber(o.ymin, o).length, axisNumber(o.ymax, o).length) *
          font *
          0.5 +
          16,
      ),
    ),
    xNameOffset = Math.max(
      10,
      (o.radians ? piLabel(o.xmax).split("/")[0] : axisNumber(o.xmax, o))
        .length *
        font *
        0.28 +
        4,
    ),
    right = Math.max(
      30,
      Math.min(
        w * 0.32,
        (o.xlabel || "").length * font * 0.52 + xNameOffset + 6,
      ),
    ),
    legendCount = o.legend
      ? o.curves.filter((c) => c.showEquation !== false).length
      : 0,
    legendStep = legendCount ? Math.min(20, (h * 0.4 - 20) / legendCount) : 20,
    top = legendCount ? Math.max(36, 20 + legendCount * legendStep) : 28,
    bottom = o.radians ? 66 : 54,
    W = w - left - right,
    H = h - top - bottom,
    X = (x) => left + ((x - o.xmin) / (o.xmax - o.xmin)) * W,
    Y = (y) => top + ((o.ymax - y) / (o.ymax - o.ymin)) * H;
  return {
    w,
    h,
    font,
    legendStep,
    xNameOffset,
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
  if (Number.isFinite(o.xstep) && o.xstep > 0) xstep = o.xstep;
  else if (o.radians) {
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
  const ystep =
      Number.isFinite(o.ystep) && o.ystep > 0
        ? o.ystep
        : niceStep(o.ymax - o.ymin, Math.max(3, H / 58)),
    id = "graph-clip";
  const labelHoles = [];
  let html = `<defs>__LABEL_MASK__<clipPath id="${id}"><rect x="${left}" y="${top}" width="${W}" height="${H}"/></clipPath><marker id="axis-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L7 3L0 6" fill="none" stroke="${ink}" stroke-width="1.05"/></marker></defs><g font-family="${family}" font-size="${font}" fill="${ink}">`;
  if (o.legend)
    o.curves
      .filter((c) => c.showEquation !== false)
      .forEach((c, i) => {
        html += `<line x1="${left}" x2="${left + 23}" y1="${19 + i * g.legendStep}" y2="${19 + i * g.legendStep}" stroke="${c.color}" stroke-width="1.6"/><text x="${left + 33}" y="${24 + i * g.legendStep}" font-size="${Math.min(font, g.legendStep - 2)}">${xml(c.label)}</text>`;
      });
  const regular = (lo, hi, step) => {
    const stride = Math.max(1, Math.ceil((hi - lo) / step / 200)),
      values = [];
    for (
      let i = Math.ceil(lo / step / stride) * stride;
      i <= Math.floor(hi / step);
      i += stride
    )
      values.push(i * step);
    return values;
  };
  const xs = regular(o.xmin, o.xmax, xstep),
    ys = regular(o.ymin, o.ymax, ystep);
  // The mesh and axes share the same exact viewport rectangle.
  html += `<g class="graph-grid" clip-path="url(#${id})" mask="url(#label-mask)" fill="none" stroke="${grid}" stroke-width=".65">`;
  if (o.grid) {
    for (const x of xs) html += `<path d="M${X(x)} ${top}V${h - bottom}"/>`;
    for (const y of ys) html += `<path d="M${left} ${Y(y)}H${w - right}"/>`;
  }
  html += "</g>";
  const visiblePoints = (o.points || []).filter(
    (p) => p.x >= o.xmin && p.x <= o.xmax && p.y >= o.ymin && p.y <= o.ymax,
  );
  const ticks = (values, axis, step) => {
    const special = visiblePoints
      .filter((p) => p.project || Math.abs(p[axis === "x" ? "y" : "x"]) < 1e-9)
      .map((p) => p[axis]);
    const all = (o.tickMode === "points" ? [] : values).map((v) => ({
      v,
      special: false,
    }));
    for (const v of special) {
      const same = all.find((p) => Math.abs(p.v - v) < step * 1e-7);
      if (same) same.special = true;
      else all.push({ v, special: true });
    }
    return all.sort((a, b) => a.v - b.v);
  };
  const xt = ticks(xs, "x", xstep),
    yt = ticks(ys, "y", ystep),
    xSkip = Math.max(
      1,
      Math.ceil((o.xmax - o.xmin) / xstep / (W / (o.radians ? 58 : 40))),
    ),
    ySkip = Math.max(1, Math.ceil((o.ymax - o.ymin) / ystep / (H / 27)));
  for (const t of xt) {
    const u = X(t.v);
    html += `<path d="M${u} ${xAxis - 3}v6" stroke="${ink}" stroke-width=".9"/>`;
    const crowded =
      !t.special &&
      xt.some((p) => p.special && Math.abs(X(p.v) - u) < (o.radians ? 42 : 28));
    if (
      Math.abs(t.v) > xstep * 1e-7 &&
      !crowded &&
      (t.special || Math.abs(Math.round(t.v / xstep)) % xSkip === 0)
    ) {
      const text = o.radians ? piLabel(t.v) : axisNumber(t.v, o),
        frac = o.radians && text.includes("/"),
        width =
          (frac ? text.split("/")[0].length : text.length) * font * 0.58 + 8;
      labelHoles.push(
        `<rect x="${u - width / 2}" y="${xAxis + 5}" width="${width}" height="${frac ? font * 2.1 + 6 : font + 8}" fill="#000"/>`,
      );
      html += o.radians
        ? radianTick(u, xAxis + 8, t.v, font)
        : `<text x="${u}" y="${xAxis + font + 8}" text-anchor="middle">${xml(text)}</text>`;
    }
  }
  for (const t of yt) {
    const v = Y(t.v);
    html += `<path d="M${yAxis - 3} ${v}h6" stroke="${ink}" stroke-width=".9"/>`;
    const crowded =
      !t.special &&
      yt.some((p) => p.special && Math.abs(Y(p.v) - v) < font * 1.4);
    if (
      Math.abs(t.v) > ystep * 1e-7 &&
      !crowded &&
      (t.special || Math.abs(Math.round(t.v / ystep)) % ySkip === 0)
    ) {
      const text = axisNumber(t.v, o),
        width = text.length * font * 0.58 + 6;
      labelHoles.push(
        `<rect x="${yAxis - 13 - width}" y="${v - font * 0.7}" width="${width + 6}" height="${font + 5}" fill="#000"/>`,
      );
      html += `<text x="${yAxis - 10}" y="${v + font * 0.32}" text-anchor="end">${xml(text)}</text>`;
    }
  }
  html += `<g class="graph-axes" fill="none" stroke="${ink}" stroke-width="1.1"><path d="M${left} ${xAxis}H${w - right}" marker-end="url(#axis-arrow)"/><path d="M${yAxis} ${h - bottom}V${top}" marker-end="url(#axis-arrow)"/></g>`;
  if (o.showOrigin && o.xmin <= 0 && o.xmax >= 0 && o.ymin <= 0 && o.ymax >= 0)
    html += `<text class="origin-label" x="${yAxis - 10}" y="${xAxis + font + 8}" text-anchor="end">0</text>`;
  const xNameSize = Math.min(
      font,
      (right - g.xNameOffset - 4) / Math.max(1, (o.xlabel || "").length * 0.52),
    ),
    yNameSize = Math.min(
      font,
      (yAxis - 18) / Math.max(1, (o.ylabel || "").length * 0.52),
    );
  html += `<text class="axis-name axis-name-x" x="${w - right + g.xNameOffset}" y="${xAxis + font + 9}" text-anchor="start" font-size="${xNameSize}" font-style="normal" font-weight="${o.axesBold ? 700 : 400}">${xml(o.xlabel || "")}</text><text class="axis-name axis-name-y" x="${yAxis - 12}" y="${top - 10}" text-anchor="end" font-size="${yNameSize}" font-style="normal" font-weight="${o.axesBold ? 700 : 400}">${xml(o.ylabel || "")}</text><g clip-path="url(#${id})" mask="url(#label-mask)">`;
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
      html += `<path d="${curvePath(c.fn, o, c.breaks || [])}" fill="none" stroke="${c.color}" stroke-width="${o.professional ? c.strokeWidth || 1.3333 : 1.8}" stroke-linejoin="round" stroke-linecap="round"><title>${xml(c.label)}</title></path>`;
  html += "</g>";
  const occupied = [];
  for (const p of visiblePoints) {
    const x = X(p.x),
      y = Y(p.y),
      label =
        p.label ||
        `(${o.radians ? piLabel(p.x) : decimal(p.x)}; ${decimal(p.y)})`;
    if (p.project && Math.abs(p.x) > 1e-9 && Math.abs(p.y) > 1e-9)
      html += `<path class="point-projection" d="M${yAxis} ${y}H${x}V${xAxis}" fill="none" stroke="${ink}" stroke-dasharray="4 3" stroke-width=".9"/>`;
    const lw = label.length * font * 0.56;
    const candidates = [
      { x: x + 7, y: y - 8, anchor: "start" },
      { x: x + 7, y: y + font + 7, anchor: "start" },
      { x: x - 7, y: y - 8, anchor: "end" },
      { x: x - 7, y: y + font + 7, anchor: "end" },
    ];
    const valid = (c) => {
      const l = c.anchor === "end" ? c.x - lw : c.x;
      return (
        l >= 3 &&
        l + lw < w - 3 &&
        c.y - font > 2 &&
        c.y < h - 3 &&
        !occupied.some(
          (r) => l < r.r && l + lw > r.l && c.y > r.t && c.y - font < r.b,
        )
      );
    };
    const c = candidates.find(valid) || candidates[0],
      l = c.anchor === "end" ? c.x - lw : c.x;
    occupied.push({ l, r: l + lw, t: c.y - font, b: c.y });
    html += `<g class="fixed-point"><circle cx="${x}" cy="${y}" r="3.5" fill="${ink}"/><text x="${c.x}" y="${c.y}" text-anchor="${c.anchor}" font-weight="700" font-style="${p.label ? "italic" : "normal"}">${xml(label)}</text></g>`;
  }
  html += '<g id="graph-trace" aria-hidden="true"></g></g>';
  html = html.replace(
    "__LABEL_MASK__",
    `<mask id="label-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#fff"/>${labelHoles.join("")}</mask>`,
  );
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
  let cachedOptions,
    intersections = [];
  const show = (x, mouseY = null, scale = 1) => {
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
    if (cachedOptions !== o) {
      intersections = findIntersections(o.curves, o);
      cachedOptions = o;
    }
    let snapped = null;
    if (mouseY !== null) {
      let distance = 14 / scale;
      for (const p of intersections) {
        const d = Math.hypot(g.X(p.x) - g.X(x), g.Y(p.y) - mouseY);
        if (d < distance) {
          snapped = p;
          distance = d;
        }
      }
    }
    let c = snapped
      ? {
          color: snapped.color,
          value: snapped.y,
          name: snapped.names.join(" ∩ "),
        }
      : candidates[0];
    if (snapped) x = snapped.x;
    let px = g.X(x),
      py = g.Y(c.value),
      label = `${snapped ? "Interseção " : ""}${c.name || "f"}: (${o.radians ? piLabel(x) : decimal(x)}; ${decimal(c.value)})`,
      tx = Math.max(g.left + 4, Math.min(g.w - g.right - 290, px + 14)),
      ty = Math.max(g.top + 24, Math.min(g.h - g.bottom - 12, py - 15));
    element.querySelector("#graph-trace").innerHTML =
      `<path d="M${px} ${g.top}V${g.h - g.bottom}" stroke="#708472" stroke-width="1" stroke-dasharray="4 5"/><circle cx="${px}" cy="${py}" r="5" fill="${c.color}" stroke="white" stroke-width="2"/><rect x="${tx}" y="${ty - 22}" width="286" height="29" rx="5" fill="#fff" stroke="#bdcdbb"/><text x="${tx + 9}" y="${ty - 3}" font-family="Arial,sans-serif" font-size="15" fill="#243d2e">${xml(label)}</text>`;
    onRead?.(label);
  };
  element.onpointermove = (e) => {
    if (element.dataset.dragging === "true") return;
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
    show(g.fromX(p.x), p.y, Math.hypot(matrix.a, matrix.b));
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
    if (element.dataset.dragging === "true") {
      e.preventDefault();
      return;
    }
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

export function attachGraphPan(element, getOptions, apply) {
  let drag = null;
  const down = (e) => {
    if (e.button !== 0 || drag) return;
    const matrix = element.getScreenCTM();
    if (!matrix) return;
    const inverse = matrix.inverse(),
      p = new DOMPoint(e.clientX, e.clientY).matrixTransform(inverse);
    const o = getOptions();
    drag = {
      id: e.pointerId,
      p,
      inverse,
      view: { xmin: o.xmin, xmax: o.xmax, ymin: o.ymin, ymax: o.ymax },
      geometry: graphGeometry(o),
    };
    element.dataset.dragging = "true";
    element.setPointerCapture(e.pointerId);
    e.preventDefault();
    const trace = element.querySelector("#graph-trace");
    if (trace) trace.innerHTML = "";
  };
  const move = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(drag.inverse),
      v = drag.view,
      g = drag.geometry;
    apply(
      panWindow(
        v,
        (-(p.x - drag.p.x) * (v.xmax - v.xmin)) / g.W,
        ((p.y - drag.p.y) * (v.ymax - v.ymin)) / g.H,
      ),
    );
  };
  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const id = drag.id;
    drag = null;
    delete element.dataset.dragging;
    if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
  };
  element.addEventListener("pointerdown", down);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", up);
  element.addEventListener("lostpointercapture", up);
  return () => {
    element.removeEventListener("pointerdown", down);
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", up);
    element.removeEventListener("lostpointercapture", up);
  };
}
