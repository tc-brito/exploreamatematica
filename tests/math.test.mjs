import test from "node:test";
import assert from "node:assert/strict";
import {
  choose,
  binomial,
  statistics,
  parseData,
  conditional,
  solidMetrics,
  functionValue,
  mesh,
} from "../assets/math.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
test("Pascal: linhas, simetria e soma dos coeficientes", () => {
  assert.deepEqual(
    Array.from({ length: 6 }, (_, k) => choose(5, k)),
    [1, 5, 10, 10, 5, 1],
  );
  for (let n = 0; n <= 10; n++) {
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      sum += choose(n, k);
      assert.equal(choose(n, k), choose(n, n - k));
      if (k > 0 && k < n)
        assert.equal(choose(n, k), choose(n - 1, k - 1) + choose(n - 1, k));
    }
    assert.equal(sum, 2 ** n);
  }
});
test("Binomial: soma, esperança e probabilidades degeneradas", () => {
  for (let n = 0; n <= 10; n++)
    for (const p of [0, 0.05, 0.2, 0.5, 0.95, 1]) {
      const d = binomial(n, p);
      close(
        d.reduce((a, b) => a + b, 0),
        1,
      );
      close(
        d.reduce((a, b, k) => a + b * k, 0),
        n * p,
      );
    }
  assert.deepEqual(binomial(0, 0.5), [1]);
  assert.deepEqual(binomial(3, 0), [1, 0, 0, 0]);
  assert.deepEqual(binomial(3, 1), [0, 0, 0, 1]);
});
test("Estatística populacional e amostral, empates e unitário", () => {
  let s = statistics([1, 2, 3, 4]);
  close(s.mean, 2.5);
  close(s.median, 2.5);
  close(s.variance, 1.25);
  close(s.std, Math.sqrt(1.25));
  assert.equal(s.range, 3);
  assert.deepEqual(s.modes, []);
  close(statistics([1, 2, 3, 4], true).variance, 5 / 3);
  assert.deepEqual(statistics([1, 1, 2, 2, 3]).modes, [1, 2]);
  assert.equal(statistics([3], true).variance, null);
  assert.equal(statistics([3]).variance, 0);
  assert.equal(statistics([-5, 1, 3]).median, 1);
});
test("Entrada brasileira, rejeição de dados inválidos e limites", () => {
  assert.deepEqual(parseData("1; 2,5; -3.25\n4"), [1, 2.5, -3.25, 4]);
  for (const s of [
    "",
    "1; abc",
    "Infinity",
    "1000000001",
    Array(501).fill("1").join(";"),
  ])
    assert.throws(() => parseData(s));
});
test("Condicional: assimetria e denominadores nulos", () => {
  const r = conditional(30, 20, 10, 40);
  close(r.paGivenB, 0.75);
  close(r.pbGivenA, 0.6);
  close(r.pa, 0.5);
  close(r.pb, 0.4);
  assert.equal(conditional(0, 20, 0, 40).paGivenB, null);
  assert.equal(conditional(0, 0, 0, 0).pa, null);
});
test("Áreas e volumes de seis sólidos", () => {
  let c = solidMetrics("cubo", 4, 6, 3);
  close(c.area, 96);
  close(c.volume, 64);
  let p = solidMetrics("prisma", 4, 6, 3);
  close(p.area, 108);
  close(p.volume, 72);
  let y = solidMetrics("piramide", 6, 4, 0);
  close(y.g, 5);
  close(y.area, 96);
  close(y.volume, 48);
  let cone = solidMetrics("cone", 3, 4, 0);
  close(cone.g, 5);
  close(cone.area, 24 * Math.PI);
  close(cone.volume, 12 * Math.PI);
  let cylinder = solidMetrics("cilindro", 3, 4, 0);
  close(cylinder.area, 42 * Math.PI);
  close(cylinder.volume, 36 * Math.PI);
  let sphere = solidMetrics("esfera", 3, 0, 0);
  close(sphere.area, 36 * Math.PI);
  close(sphere.volume, 36 * Math.PI);
});
test("Homotetia: área k² e volume k³", () => {
  for (const type of [
    "cubo",
    "prisma",
    "piramide",
    "cilindro",
    "cone",
    "esfera",
  ]) {
    let a = solidMetrics(type, 2, 4, 3),
      b = solidMetrics(type, 4, 8, 6);
    close(b.area, 4 * a.area);
    close(b.volume, 8 * a.volume);
  }
});
test("Malhas: índices válidos, arestas compartilhadas e Euler", () => {
  for (const type of ["cubo", "prisma", "piramide"]) {
    let m = mesh(type, 4, 6, 3),
      edges = new Map();
    for (const face of m.faces)
      for (let i = 0; i < face.length; i++) {
        assert.ok(face[i] < m.vertices.length);
        let key = [face[i], face[(i + 1) % face.length]]
          .sort((a, b) => a - b)
          .join(",");
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    for (const count of edges.values()) assert.equal(count, 2);
    assert.equal(m.vertices.length - edges.size + m.faces.length, 2);
    let metrics = solidMetrics(type, 4, 6, 3);
    assert.equal(metrics.vertices, m.vertices.length);
    assert.equal(metrics.faces, m.faces.length);
    assert.equal(metrics.edges, edges.size);
  }
});
test("Funções: famílias e parâmetros degenerados", () => {
  assert.equal(functionValue("afim", 3, 2, -1), 5);
  assert.equal(functionValue("quadratica", 2, 1, -4, 4), 0);
  assert.equal(functionValue("quadratica", 2, 0, 3, 1), 7);
  assert.equal(functionValue("exponencial", 3, 2, 2, 1), 17);
  assert.equal(functionValue("exponencial", -3, 2, 1, 1), 3);
  close(functionValue("trigonometrica", Math.PI / 2, 2, 1, 0), 2);
});
