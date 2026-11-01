import test from "node:test";
import assert from "node:assert/strict";
import {
  frustumMetrics,
  frustumMesh,
  frustumNet,
  area3D,
  sanitizeGeometry,
  solidScene,
  revolutionProfile,
} from "../assets/geometry-model.js";
import { geometryFormula } from "../assets/solid-formulas.js";
import { gestureWindow } from "../assets/plot-utils.js";
import {
  defaultFunctions,
  sanitizeFunctions,
} from "../assets/function-math.js";
import { buildGraph } from "../assets/plot.js";
const near = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
const area = (fs) => fs.reduce((sum, f) => sum + area3D(f.points), 0);
test("Troncos: volume equivale à diferença de sólidos semelhantes; área concorda com malha", () => {
  for (const type of ["cone", "piramide"])
    for (const [a, b, h] of [
      [4, 2, 6],
      [20, 1, 20],
      [2, 1.9, 0.5],
    ]) {
      const m = frustumMetrics(type, a, b, h),
        H = (h * a) / (a - b),
        small = H - h,
        factor = type === "cone" ? Math.PI : 1;
      near(m.volume, (factor * (a * a * H - b * b * small)) / 3);
      assert.ok(
        Math.abs(area(frustumMesh(type, a, b, h)) - m.area) / m.area < 0.002,
      );
    }
  near(frustumMetrics("cone", 3, 3, 7).volume, Math.PI * 9 * 7);
  near(frustumMetrics("piramide", 3, 3, 7).volume, 9 * 7);
});
test("Planificações dos troncos conservam áreas e ficam planas ao abrir", () => {
  for (const type of ["cone", "piramide"])
    for (const [a, b, h] of [
      [4, 2, 6],
      [20, 0.1, 0.5],
      [2, 1.9, 20],
      [3, 3, 5],
    ])
      for (const t of [0, 0.25, 0.5, 0.9, 1]) {
        const fs = frustumNet(type, a, b, h, t),
          expected = frustumMetrics(type, a, b, h).area;
        assert.ok(
          Math.abs(area(fs) - expected) / expected < 0.002,
          `${type} t=${t}`,
        );
        assert.ok(fs.every((f) => f.points.flat().every(Number.isFinite)));
        if (t === 1 && !(type === "cone" && a === b))
          for (const p of fs.flatMap((f) => f.points)) near(p[1], 0, 1e-8);
      }
});
test("Dimensões até 20 e troncos persistem; base menor respeita base maior", () => {
  const s = sanitizeGeometry({
    type: "cone",
    a: 20,
    b: 20,
    h: 20,
    frustum: true,
    top: 30,
  });
  assert.equal(s.a, 20);
  assert.equal(s.h, 20);
  assert.equal(s.b, 20);
  assert.equal(s.top, 20);
  assert.equal(s.frustum, true);
  assert.equal(solidScene({ ...s, type: "piramide" }).faces.length, 6);
  assert.deepEqual(revolutionProfile("cone", 4, 6, 2), [
    [0, -3, 0],
    [4, -3, 0],
    [2, 3, 0],
    [0, 3, 0],
  ]);
});
test("Fórmulas de sólidos usam duas linhas matemáticas e frações reais", () => {
  for (const type of [
    "cubo",
    "prisma",
    "piramide",
    "cilindro",
    "cone",
    "esfera",
  ]) {
    const html = geometryFormula({ type });
    assert.equal((html.match(/<math /g) || []).length, 2);
    if (["piramide", "cone", "esfera"].includes(type))
      assert.match(html, /<mfrac>/);
  }
  assert.match(geometryFormula({ type: "cone", frustum: true }), /<mi>R<\/mi>/);
});
test("Pinça mantém âncora, acompanha translação e permite retorno sem deriva", () => {
  const v = { xmin: -10, xmax: 10, ymin: -6, ymax: 6 },
    g = { left: 50, top: 20, W: 400, H: 240 };
  const start = [
      { x: 200, y: 140 },
      { x: 300, y: 140 },
    ],
    end = [
      { x: 150, y: 140 },
      { x: 350, y: 140 },
    ];
  const next = gestureWindow(v, g, start, end);
  near(next.xmin, -5);
  near(next.xmax, 5);
  near(next.ymax, 3);
  const shifted = gestureWindow(
    v,
    g,
    start,
    end.map((p) => ({ x: p.x + 40, y: p.y + 24 })),
  );
  near(shifted.xmin, -6);
  near(shifted.ymax, 3.6);
  const original = gestureWindow(next, g, end, start);
  for (const k of Object.keys(v)) near(original[k], v[k]);
  const dragged = gestureWindow(v, g, [start[0]], [{ x: 240, y: 140 }]);
  near(dragged.xmin, -12);
  near(dragged.xmax, 8);
});
test("Figura padrão 15 × 10; deslocamentos sobrevivem ao compartilhamento e SVG", () => {
  const defaults = defaultFunctions();
  assert.equal(defaults.free.widthCm, 15);
  assert.equal(defaults.free.heightCm, 10);
  const raw = {
    xlabelDx: 8,
    ylabelDy: 12,
    points: [{ x: 1, y: 1, label: "A", labelDx: 12, labelDy: -8 }],
    free: {
      xlabelDx: -16,
      ylabelDy: 8,
      points: [{ x: 2, y: 3, label: "B", labelDx: -8, labelDy: 12 }],
    },
  };
  const clean = sanitizeFunctions(raw);
  assert.equal(clean.xlabelDx, 8);
  assert.equal(clean.points[0].labelDy, -8);
  assert.equal(clean.free.xlabelDx, -16);
  assert.equal(clean.free.points[0].labelDy, 12);
  const o = {
    ...defaults.free,
    width: 567,
    height: 378,
    curves: [],
    points: [{ x: 1, y: 1, label: "A" }],
  };
  const baseline = buildGraph(o).svg,
    moved = buildGraph({
      ...o,
      xlabelDx: 8,
      ylabelDy: 12,
      points: [{ ...o.points[0], labelDx: 12, labelDy: -8 }],
    }).svg;
  const xy = (svg, pattern) => Number(svg.match(pattern)[1]);
  near(
    xy(moved, /axis-name-x" x="([^"]+)/) -
      xy(baseline, /axis-name-x" x="([^"]+)/),
    8,
  );
  near(
    xy(moved, /axis-name-y" x="[^"]+" y="([^"]+)/) -
      xy(baseline, /axis-name-y" x="[^"]+" y="([^"]+)/),
    12,
  );
  const point = /<g class="fixed-point">.*?<text x="([^"]+)/;
  near(xy(moved, point) - xy(baseline, point), 12);
});

test("Gestos de dois ponteiros retomam arraste sem salto e cancelam corretamente", async () => {
  const { attachGraphPan } = await import("../assets/plot.js");
  const originalPoint = globalThis.DOMPoint;
  globalThis.DOMPoint = class {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
    matrixTransform() {
      return this;
    }
  };
  try {
    const listeners = new Map(),
      captured = new Set();
    const element = {
      dataset: {},
      getScreenCTM: () => ({ inverse: () => ({}) }),
      querySelector: () => null,
      setPointerCapture: (id) => captured.add(id),
      hasPointerCapture: (id) => captured.has(id),
      releasePointerCapture: (id) => captured.delete(id),
      addEventListener: (type, fn) => listeners.set(type, fn),
      removeEventListener: (type) => listeners.delete(type),
    };
    let o = {
      width: 1000,
      height: 490,
      xmin: -10,
      xmax: 10,
      ymin: -6,
      ymax: 6,
      curves: [],
    };
    const cleanup = attachGraphPan(
      element,
      () => o,
      (v) => Object.assign(o, v),
    );
    const event = (type, id, x, y) =>
      listeners.get(type)({
        pointerId: id,
        button: 0,
        clientX: x,
        clientY: y,
        preventDefault() {},
      });
    event("pointerdown", 1, 400, 250);
    event("pointerdown", 2, 600, 250);
    event("pointermove", 1, 300, 250);
    event("pointermove", 2, 700, 250);
    near(o.xmax - o.xmin, 10);
    const before = { ...o };
    event("pointerup", 2, 700, 250);
    event("pointermove", 1, 300, 250);
    near(o.xmin, before.xmin);
    near(o.ymin, before.ymin);
    event("pointermove", 1, 320, 250);
    assert.ok(o.xmin < before.xmin);
    event("pointercancel", 1, 320, 250);
    assert.equal(element.dataset.dragging, undefined);
    assert.equal(captured.size, 0);
    cleanup();
    assert.equal(listeners.size, 0);
  } finally {
    if (originalPoint) globalThis.DOMPoint = originalPoint;
    else delete globalThis.DOMPoint;
  }
});
