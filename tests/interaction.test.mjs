import test from "node:test";
import assert from "node:assert/strict";
import {
  compileExpression,
  sanitizeFunctions,
  makeExpression,
} from "../assets/function-math.js";
import { expressionCurve } from "../assets/functions-lab.js";
import { cmToPixels, zoomWindow, pngWithDpi } from "../assets/plot-utils.js";
import { buildGraph } from "../assets/plot.js";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("Comparações acompanham coeficientes sem executar código", () => {
  const p = { a: 2, b: 1, c: 0, d: 0 },
    f = compileExpression("ax^2+b", p);
  assert.equal(f(3), 19);
  p.a = -1;
  assert.equal(f(3), -8);
  for (const s of [
    "window.location",
    "constructor(x)",
    "a.foo",
    "alert(1)",
    "z*x",
  ])
    assert.throws(() => compileExpression(s, p));
});
test("Domínio por expressão respeita extremos, radianos e entradas inválidas", () => {
  const f = expressionCurve({
    expression: "sen(x)",
    min: "-pi/2",
    max: "pi/2",
  });
  near(f(Math.PI / 2), 1);
  assert.ok(Number.isNaN(f(2)));
  assert.equal(
    expressionCurve({ expression: "x^2", min: "", max: "" })(20),
    400,
  );
  for (const q of [
    { min: "3", max: "2" },
    { min: "abc", max: "" },
    { min: "0", max: "0" },
  ])
    assert.throws(() => expressionCurve({ expression: "x", ...q }));
});
test("Compartilhamento preserva campos vazios, domínios e centímetros", () => {
  const s = sanitizeFunctions({
    comparisons: Array.from({ length: 8 }, makeExpression),
    free: {
      equations: [
        {
          expression: "",
          min: "-pi",
          max: "pi",
          showEquation: true,
          visible: false,
        },
      ],
      widthCm: 16.5,
      heightCm: 10,
      axesBold: true,
    },
  });
  assert.equal(s.comparisons.length, 5);
  assert.equal(s.free.equations[0].expression, "");
  assert.equal(s.free.equations[0].min, "-pi");
  assert.equal(s.free.equations[0].showEquation, true);
  assert.equal(s.free.equations[0].visible, false);
  assert.equal(s.free.widthCm, 16.5);
  assert.equal(s.free.axesBold, true);
});
test("Zoom mantém posição do ponteiro e permite voltar à janela inicial", () => {
  const v = { xmin: -10, xmax: 10, ymin: -6, ymax: 6 },
    z = zoomWindow(v, 0.7, 3, -2);
  near((3 - z.xmin) / (z.xmax - z.xmin), 0.65);
  near((-2 - z.ymin) / (z.ymax - z.ymin), 1 / 3);
  const back = zoomWindow(z, 1 / 0.7, 3, -2);
  for (const k in v) near(back[k], v[k]);
  const bounded = zoomWindow(v, 1e6);
  assert.ok(bounded.xmin >= -10000 && bounded.xmax <= 10000);
  const tiny = zoomWindow(v, 1e-12);
  assert.ok(tiny.ymax - tiny.ymin >= 0.00009999);
});
test("SVG usa tamanho físico, Calibri, nomes sem itálico e legenda por função", () => {
  assert.equal(cmToPixels(14, 300), 1654);
  const o = {
    width: cmToPixels(14),
    height: cmToPixels(9),
    widthCm: 14,
    heightCm: 9,
    xmin: -5,
    xmax: 5,
    ymin: -2,
    ymax: 8,
    professional: true,
    axesBold: true,
    xlabel: "Tempo (s)",
    ylabel: "Altura",
    legend: true,
    curves: [
      { fn: (x) => x * x, label: "VISÍVEL", color: "#000", showEquation: true },
      { fn: (x) => x, label: "OCULTA", color: "#00f", showEquation: false },
    ],
  };
  const { svg } = buildGraph(o);
  assert.match(svg, /width="14cm" height="9cm"/);
  assert.match(svg, /Calibri,Arial,sans-serif/);
  assert.match(svg, /font-style="normal" font-weight="700">Tempo/);
  assert.doesNotMatch(svg, /<text[^>]*>OCULTA/);
  assert.match(svg, /<text[^>]*>VISÍVEL/);
  assert.doesNotMatch(svg, /fill="white"/);
  const tiny = buildGraph({
    ...o,
    height: cmToPixels(4),
    heightCm: 4,
    curves: Array.from({ length: 5 }, () => o.curves[0]),
  });
  assert.ok(tiny.geometry.H > 0);
});
test("PNG armazena 300 dpi com CRC válido sem duplicar metadados", () => {
  const src = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE6kAAAAASUVORK5CYII=",
    "base64",
  );
  const result = pngWithDpi(pngWithDpi(src, 96), 300),
    dv = new DataView(result.buffer);
  const chunks = [];
  for (let i = 8; i < result.length;) {
    const len = dv.getUint32(i);
    chunks.push({
      type: String.fromCharCode(...result.slice(i + 4, i + 8)),
      start: i,
      len,
    });
    i += 12 + len;
  }
  const physical = chunks.filter((c) => c.type === "pHYs");
  assert.equal(physical.length, 1);
  const i = physical[0].start;
  assert.equal(dv.getUint32(i + 8), 11811);
  assert.equal(dv.getUint32(i + 12), 11811);
  assert.equal(result[i + 16], 1);
  let crc = 0xffffffff;
  for (const b of result.slice(i + 4, i + 17)) {
    crc ^= b;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  assert.equal(dv.getUint32(i + 17), (crc ^ 0xffffffff) >>> 0);
  assert.deepEqual(result.slice(0, 33), new Uint8Array(src.slice(0, 33)));
  assert.equal(chunks.at(-1).type, "IEND");
});
