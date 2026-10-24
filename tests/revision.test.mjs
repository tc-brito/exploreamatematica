import test from "node:test";
import assert from "node:assert/strict";
import {
  cuboidNet,
  pyramidNet,
  cylinderNet,
  coneNet,
  area3D,
  capMetrics,
  wedgeMetrics,
  revolutionMesh,
  revolvePoint,
  sanitizeGeometry,
} from "../assets/geometry-model.js";
import {
  makeCurve,
  familyValue,
  familyError,
  period,
  familyBreaks,
  compileExpression,
  piLabel,
  sanitizeFunctions,
} from "../assets/function-math.js";
import { buildGraph, curvePath } from "../assets/plot.js";
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);
const sumArea = (faces) => faces.reduce((sum, f) => sum + area3D(f.points), 0);
test("Planificações poliédricas preservam áreas, dobradiças e fechamento plano", () => {
  for (const [a, h, b] of [
    [4, 6, 3],
    [0.5, 12, 10],
    [7, 2, 4],
  ])
    for (const t of [0, 0.1, 0.5, 0.85, 1]) {
      const faces = cuboidNet(a, h, b, t);
      near(sumArea(faces), 2 * (a * h + a * b + h * b));
      assert.deepEqual(
        faces[1].points.slice(0, 2),
        faces[0].points.slice(0, 2),
      );
      assert.deepEqual(faces[5].points[0], faces[1].points[3]);
      const pyramid = pyramidNet(a, h, t);
      near(sumArea(pyramid), a * a + 2 * a * Math.hypot(h, a / 2));
      if (t === 1)
        for (const p of [...faces, ...pyramid].flatMap((f) => f.points))
          near(p[1], 0);
    }
});
test("Cilindro e cone desenrolam sem alteração da área analítica (malha < 0,2%)", () => {
  for (const [r, h] of [
    [4, 6],
    [0.5, 12],
    [10, 0.5],
  ])
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      for (const [fn, area] of [
        [cylinderNet, 2 * Math.PI * r * (r + h)],
        [coneNet, Math.PI * r * (r + Math.hypot(r, h))],
      ])
        assert.ok(Math.abs(sumArea(fn(r, h, t)) / area - 1) < 0.002);
      if (t === 1) {
        for (const p of cylinderNet(r, h, t).flatMap((f) => f.points))
          near(p[2], 0);
        for (const p of coneNet(r, h, t).flatMap((f) => f.points))
          near(p[1], 0);
      }
    }
});
test("Calota e cunha: hemisfério, esfera completa e fração angular", () => {
  const r = 3,
    c = capMetrics(r, r);
  near(c.curved, 2 * Math.PI * r * r);
  near(c.total, 3 * Math.PI * r * r);
  near(c.volume, (2 * Math.PI * r ** 3) / 3);
  near(capMetrics(r, 2 * r).volume, (4 * Math.PI * r ** 3) / 3);
  near(capMetrics(r, 0).volume, 0);
  near(wedgeMetrics(r, 90).volume, (Math.PI * r ** 3) / 3);
  near(wedgeMetrics(r, 360).cut, 0);
  near(wedgeMetrics(r, 180).cut, Math.PI * r * r);
});
test("Revolução conserva distância ao eixo e gera malha finita nos dois eixos", () => {
  for (const axis of ["x", "y"])
    for (const angle of [0, Math.PI / 2, Math.PI]) {
      const p = revolvePoint([4, 6], angle, axis);
      near(axis === "x" ? Math.hypot(p[1], p[2]) : Math.hypot(p[0], p[2]), 4);
      near(p[axis === "x" ? 0 : 1], 6);
    }
  for (const type of ["cilindro", "cone", "esfera"])
    for (const axis of ["x", "y"]) {
      assert.equal(revolutionMesh(type, 4, 6, 0, axis).length, 0);
      for (const angle of [1, 180, 360])
        assert.ok(
          revolutionMesh(type, 4, 6, angle, axis)
            .flatMap((f) => f.points.flat())
            .every(Number.isFinite),
        );
    }
});
test("Sete famílias: coeficientes, domínio e estabilidade logística", () => {
  const examples = [
    ["afim", 2, 2],
    ["quadratica", 3, 9],
    ["exponencial", 3, 8],
    ["logistica", 0, 4],
    ["logaritmica", 8, 3],
    ["modular", -3, 3],
    ["trigonometrica", Math.PI / 2, 1],
  ];
  for (const [type, x, y] of examples) near(familyValue(makeCurve(type), x), y);
  const l = makeCurve("logistica");
  near(familyValue(l, 1e6), 8);
  near(familyValue(l, -1e6), 0);
  const g = makeCurve("logaritmica");
  assert.ok(Number.isNaN(familyValue(g, 0)));
  g.b = 1;
  assert.ok(familyError(g));
  let a = makeCurve("afim");
  Object.assign(a, { domain: true, min: -2, max: 2 });
  assert.ok(Number.isNaN(familyValue(a, 3)));
  near(familyValue(a, 2), 2);
});
test("Trigonometria usa a+b·sen(cx+d), cosseno, tangente, período e polos", () => {
  let c = makeCurve("trigonometrica");
  Object.assign(c, { a: 2, b: 3, c: 2, d: Math.PI / 2 });
  near(familyValue(c, 0), 5);
  near(period(c), Math.PI);
  c.trig = "cos";
  near(familyValue(c, 0), 2);
  c.trig = "tan";
  assert.ok(Number.isNaN(familyValue(c, 0)));
  near(period(c), Math.PI / 2);
  assert.ok(familyBreaks(c, -1, 1).some((x) => Math.abs(x) < 1e-8));
  c.b = 0;
  assert.equal(period(c), null);
  near(familyValue(c, 0.1), 2);
});
test("Editor livre: precedência, produtos implícitos, radianos, módulo e funções", () => {
  for (const [expr, x, y] of [
    ["-x^2", 3, -9],
    ["2^3^2", 0, 512],
    ["2x + 3(x-1)", 2, 7],
    ["sen(pi/2)", 0, 1],
    ["|x|", -5, 5],
    ["log(100)", 0, 2],
    ["ln(e)", 0, 1],
    ["sqrt(9)", 0, 3],
    ["f(x) = 2,5x", 2, 5],
    ["2sen(x)", Math.PI / 2, 2],
    ["(x+1)(x-1)", 3, 8],
  ])
    near(compileExpression(expr)(x), y);
  assert.ok(Number.isNaN(compileExpression("1/x")(0)));
  assert.ok(Number.isNaN(compileExpression("ln(x)")(-1)));
  assert.equal(piLabel(-Math.PI / 2), "−π/2");
});
test("Parser rejeita JavaScript e expressões inválidas sem executar código", () => {
  for (const expr of [
    "window.alert(1)",
    "constructor(1)",
    "x;alert(1)",
    "x[0]",
    "fetch(1)",
    "x=>x",
    "sin x",
    "(x+1",
    "|x",
    "2**3",
  ])
    assert.throws(() => compileExpression(expr));
});
test("SVG transparente, dimensões, rótulos seguros e curvas separadas nas assíntotas", () => {
  const c = makeCurve("trigonometrica");
  c.trig = "tan";
  const o = {
    xmin: -Math.PI,
    xmax: Math.PI,
    ymin: -4,
    ymax: 4,
    width: 1000,
    height: 700,
    radians: true,
    professional: true,
    legend: true,
    xlabel: "Tempo <s>",
    ylabel: "y",
    curves: [
      {
        fn: (x) => familyValue(c, x),
        color: "#111111",
        label: "tan(x)",
        breaks: familyBreaks(c, -Math.PI, Math.PI),
      },
    ],
    points: [{ x: 0, y: 0, label: "A < B", project: true }],
  };
  const g = buildGraph(o);
  assert.match(g.svg, /width="1000" height="700"/);
  assert.match(g.svg, /Tempo &lt;s&gt;/);
  assert.match(g.svg, /A &lt; B/);
  assert.ok(
    !/fill="(?:white|#fff(?:fff)?)"/.test(
      g.svg.replace(/<defs>[\s\S]*?<\/defs>/, ""),
    ),
  );
  assert.ok(!g.svg.includes("NaN"));
  const path = curvePath(o.curves[0].fn, o, o.curves[0].breaks);
  assert.ok((path.match(/M/g) || []).length >= 3);
  const rational = curvePath(compileExpression("1/x"), o);
  assert.ok((rational.match(/M/g) || []).length >= 2);
});
test("Links compartilhados limitam entradas e mantêm quatro/cinco funções", () => {
  const data = sanitizeFunctions({
    curves: Array.from({ length: 9 }, () => makeCurve()),
    free: {
      equations: Array.from({ length: 9 }, () => ({ expression: "x" })),
      width: 100000,
      height: -1,
    },
    xmin: 10,
    xmax: -10,
  });
  assert.equal(data.curves.length, 4);
  assert.equal(data.free.equations.length, 5);
  assert.equal(data.free.width, 2000);
  assert.equal(data.free.height, 240);
  assert.ok(data.xmin < data.xmax);
  const g = sanitizeGeometry({
    type: "esfera",
    view: "net",
    a: 2,
    capHeight: 50,
  });
  assert.equal(g.view, "solid");
  near(g.capHeight, 4);
});

test("Extremos trigonométricos respeitam o domínio restrito", async () => {
  const { trigBounds } = await import("../assets/function-math.js");
  const c = makeCurve("trigonometrica");
  Object.assign(c, { domain: true, min: 0, max: Math.PI / 6 });
  near(trigBounds(c).min, 0);
  near(trigBounds(c).max, 0.5);
  Object.assign(c, { b: -2, c: -1, min: 0, max: Math.PI });
  near(trigBounds(c).max, 2);
  near(trigBounds(c).min, 0);
  c.trig = "cos";
  near(trigBounds(c).min, -2);
  near(trigBounds(c).max, 2);
});
