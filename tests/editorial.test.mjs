import test from "node:test";
import assert from "node:assert/strict";
import { buildGraph, radianTick } from "../assets/plot.js";
import { findSpecialPoints } from "../assets/graph-analysis.js";
import {
  makeCurve,
  trigSummaryMathML,
  sanitizeFunctions,
} from "../assets/function-math.js";
const view = { xmin: -4, xmax: 4, ymin: -4, ymax: 8 },
  curves = [
    { name: "f", fn: (x) => x * x - 1, color: "#111" },
    { name: "g", fn: (x) => x + 1, color: "#111" },
  ];
test("Pontos especiais localizam zeros, interseções e extremos finitos", () => {
  assert.equal(findSpecialPoints([curves[0]], view, "roots").length, 2);
  const e = findSpecialPoints([curves[0]], view, "extrema");
  assert.equal(e.length, 1);
  assert.ok(Math.abs(e[0].x) < 1e-6);
  assert.ok(Math.abs(e[0].y + 1) < 1e-8);
  assert.equal(findSpecialPoints(curves, view, "intersections").length, 2);
  assert.equal(
    findSpecialPoints([{ name: "f", fn: (x) => 1 / x }], view, "extrema")
      .length,
    0,
  );
});
test("Exportação preserva pontos fixados, projeta valores e não recorta marcadores nos eixos", () => {
  const o = {
    ...view,
    width: 700,
    height: 400,
    professional: true,
    tickMode: "points",
    curves,
    points: [
      { x: 0, y: 6, label: "A", project: false },
      { x: 1, y: 5, label: "B", project: true },
    ],
    xlabel: "Tempo (h)",
    ylabel: "Volume (L)",
  };
  const s = buildGraph(o).svg;
  assert.equal((s.match(/class="fixed-point"/g) || []).length, 2);
  assert.match(s, />6<\/text>/);
  assert.match(s, />5<\/text>/);
  assert.match(s, /class="point-projection"/);
  assert.doesNotMatch(s, /class="origin-label"/);
  assert.match(
    buildGraph({ ...o, showOrigin: true }).svg,
    /class="origin-label"/,
  );
});
test("Malha usa o mesmo retângulo dos eixos e mantém transparência", () => {
  const { svg, geometry: g } = buildGraph({
    ...view,
    width: 700,
    height: 400,
    curves,
    grid: true,
    xlabel: "x",
    ylabel: "y",
  });
  assert.match(svg, /class="graph-grid" clip-path="url\(#graph-clip\)"/);
  assert.ok(svg.includes(`width="${g.W}" height="${g.H}"`));
  assert.doesNotMatch(
    svg.replace(/<defs>[\s\S]*?<\/defs>/, ""),
    /fill="(?:white|#fff(?:fff)?)"/,
  );
});
test("Frações em radianos são vetoriais e o período usa frações MathML", () => {
  const tick = radianTick(100, 30, (-3 * Math.PI) / 2);
  assert.match(tick, /class="radian-fraction"/);
  assert.match(tick, /<line /);
  assert.match(tick, />3π<\/text>/);
  assert.match(tick, />2<\/text>/);
  const c = makeCurve("trigonometrica");
  c.c = 2;
  assert.equal((trigSummaryMathML(c).match(/<mfrac>/g) || []).length, 2);
  c.c = 0;
  assert.doesNotMatch(trigSummaryMathML(c), /<mfrac>/);
});
test("Links restauram pontos fixados dos dois modos e preferências editoriais", () => {
  const p = { x: 1, y: 5, label: "B", project: true };
  const s = sanitizeFunctions({
    points: [p],
    free: { points: [p], tickMode: "points", showOrigin: false },
  });
  assert.deepEqual(s.points, [p]);
  assert.deepEqual(s.free.points, [p]);
  assert.equal(s.free.tickMode, "points");
  assert.equal(s.free.showOrigin, false);
});

test("Pontos especiais incluem encontros e zeros nos extremos do domínio", () => {
  const v = { xmin: 0, xmax: 3.4, ymin: 0, ymax: 7800 };
  const a = {
      name: "f",
      domainMin: 0,
      domainMax: 1,
      fn: (x) => (x >= 0 && x <= 1 ? 6000 - 1000 * x : NaN),
    },
    b = {
      name: "g",
      domainMin: 1,
      domainMax: 3,
      fn: (x) => (x >= 1 && x <= 3 ? 7500 - 2500 * x : NaN),
    };
  assert.equal(findSpecialPoints([a, b], v, "intersections")[0].x, 1);
  assert.equal(findSpecialPoints([a, b], v, "roots")[0].x, 3);
});
