import test from "node:test";
import assert from "node:assert/strict";
import { findIntersections } from "../assets/graph-analysis.js";
import { panWindow } from "../assets/plot-utils.js";
import { buildGraph, graphGeometry } from "../assets/plot.js";
import {
  familyMathML,
  makeCurve,
  sanitizeFunctions,
} from "../assets/function-math.js";
const view = { xmin: -5, xmax: 5, ymin: -3, ymax: 10 };
const curves = (...fns) =>
  fns.map((fn, i) => ({ fn, name: ["f", "g", "h"][i], color: "#111" }));
const near = (a, b, e = 1e-7) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
test("Ímã localiza cruzamentos e une três curvas no mesmo ponto", () => {
  const roots = findIntersections(
    curves(
      (x) => x * x,
      (x) => x + 2,
    ),
    view,
  );
  assert.equal(roots.length, 2);
  near(roots[0].x, -1);
  near(roots[0].y, 1);
  near(roots[1].x, 2);
  near(roots[1].y, 4);
  const triple = findIntersections(
    curves(
      (x) => x,
      (x) => -x,
      (x) => x * x,
    ),
    view,
  ).find((p) => Math.abs(p.x) < 1e-6);
  assert.equal(triple.names.length, 3);
});
test("Ímã encontra tangências e respeita domínios e descontinuidades", () => {
  const tangent = findIntersections(
    curves(
      (x) => (x - 0.137) ** 2,
      () => 0,
    ),
    view,
  );
  assert.equal(tangent.length, 1);
  near(tangent[0].x, 0.137);
  assert.equal(
    findIntersections(
      curves(
        (x) => 1 / (x - 0.137),
        () => 0,
      ),
      view,
    ).length,
    0,
  );
  assert.equal(
    findIntersections(
      curves(
        (x) => (x < 0 ? NaN : x * x),
        () => 1,
      ),
      view,
    ).length,
    1,
  );
  assert.equal(
    findIntersections(
      curves(
        (x) => x * x,
        (x) => x * x,
      ),
      view,
    ).length,
    0,
  );
  assert.equal(
    findIntersections(
      curves(
        (x) => x * x + 1,
        () => 0,
      ),
      view,
    ).length,
    0,
  );
});
test("Arraste translada sem alterar escala e respeita limites", () => {
  const p = panWindow(view, 2, -3);
  assert.deepEqual(p, { xmin: -3, xmax: 7, ymin: -6, ymax: 7 });
  const b = panWindow(view, 30000, -30000);
  assert.equal(b.xmax, 10000);
  assert.equal(b.ymin, -10000);
  near(b.xmax - b.xmin, 10);
  near(b.ymax - b.ymin, 13);
});
test("Fórmulas apresentam fração, potências e base logarítmica", () => {
  assert.match(familyMathML(makeCurve("logistica")), /<mfrac>/);
  assert.match(familyMathML(makeCurve("exponencial")), /<msup>/);
  assert.match(familyMathML(makeCurve("logaritmica")), /<msub>/);
  for (const type of [
    "afim",
    "quadratica",
    "exponencial",
    "logistica",
    "logaritmica",
    "trigonometrica",
    "modular",
  ])
    assert.match(familyMathML(makeCurve(type)), /^<math/);
});
test("SVG conserva passos, espessura e posicionamento editorial dos eixos", () => {
  const o = {
    ...view,
    width: 600,
    height: 400,
    professional: true,
    xlabel: "x",
    ylabel: "y",
    xstep: 1,
    ystep: 2,
    curves: [{ fn: (x) => x * x, color: "#111", strokeWidth: 4, label: "f" }],
  };
  const { svg, geometry: g } = buildGraph(o);
  assert.match(svg, /stroke-width="4" stroke-linejoin/);
  assert.doesNotMatch(svg, />2,5<|>7,5</);
  const x = svg.match(
      /<text[^>]* x="([^"]+)" y="([^"]+)"[^>]*font-style="normal"[^>]*>x<\/text>/,
    ),
    y = svg.match(
      /<text[^>]* x="([^"]+)" y="([^"]+)"[^>]*font-style="normal"[^>]*>y<\/text>/,
    );
  assert.ok(+x[2] > g.Y(0));
  assert.ok(+y[1] < g.X(0));
  const dense = buildGraph({ ...o, xstep: 0.00001 });
  assert.ok(dense.svg.length < 250000);
});
test("Links preservam espessura e passos e descartam entradas inválidas", () => {
  const s = sanitizeFunctions({
    free: {
      xstep: "pi/2",
      ystep: "2",
      equations: [{ expression: "x", strokeWidth: 2.5 }],
    },
  });
  assert.equal(s.free.xstep, "pi/2");
  assert.equal(s.free.equations[0].strokeWidth, 2.5);
  const bad = sanitizeFunctions({
    free: { xstep: "alert(1)", ystep: "-2", equations: [{ strokeWidth: 999 }] },
  });
  assert.equal(bad.free.xstep, "");
  assert.equal(bad.free.ystep, "");
  assert.equal(bad.free.equations[0].strokeWidth, 6);
});
