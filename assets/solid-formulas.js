import { isFrustum } from "./geometry-model.js";
const v = (x) => `<mi>${x}</mi>`,
  n = (x) => `<mn>${x}</mn>`,
  op = (x) => `<mo>${x}</mo>`;
const row = (x) => `<mrow>${x}</mrow>`,
  pow = (x, p) => `<msup>${v(x)}${n(p)}</msup>`;
const frac = (a, b) => `<mfrac>${row(a)}${row(b)}</mfrac>`,
  bracket = (x) => op("(") + x + op(")");
const sq = (x) => pow(x, 2),
  cube = (x) => pow(x, 3),
  pi = v("π");
const sum = (...xs) => xs.join(op("+"));
export function geometryFormula(s) {
  let A,
    V,
    label = v("A");
  const a = v("a"),
    b = v("b"),
    h = v("h"),
    r = v("r"),
    g = v("g");
  switch (s.type) {
    case "cubo":
      A = n(6) + sq("a");
      V = cube("a");
      break;
    case "prisma":
      A = n(2) + bracket(sum(a + b, a + h, b + h));
      V = a + b + h;
      break;
    case "piramide":
      A = sum(sq("a"), n(2) + a + v("ℓ"));
      V = frac(sq("a") + h, n(3));
      break;
    case "cilindro":
      A = n(2) + pi + r + bracket(sum(r, h));
      V = pi + sq("r") + h;
      break;
    case "cone":
      A = pi + r + bracket(sum(r, g));
      V = frac(pi + sq("r") + h, n(3));
      break;
    default:
      A = n(4) + pi + sq("r");
      V = frac(n(4) + pi + cube("r"), n(3));
  }
  if (isFrustum(s)) {
    if (s.type === "cone") {
      A =
        pi +
        bracket(sum(sq("R"), sq("r"))) +
        op("+") +
        pi +
        bracket(sum(v("R"), r)) +
        g;
      V = frac(pi + h, n(3)) + bracket(sum(sq("R"), v("R") + r, sq("r")));
    } else {
      A = sum(sq("a"), sq("b"), n(2) + bracket(sum(a, b)) + v("ℓ"));
      V = frac(h, n(3)) + bracket(sum(sq("a"), a + b, sq("b")));
    }
  }
  if (s.type === "esfera" && s.view !== "revolution") {
    if (s.part === "cap") {
      label = `<msub>${v("A")}<mtext>calota</mtext></msub>`;
      A = n(2) + pi + r + h;
      V = pi + sq("h") + bracket(r + op("−") + frac(h, n(3)));
    } else if (s.part === "wedge") {
      label = `<msub>${v("A")}<mtext>curva</mtext></msub>`;
      const f = frac(v("θ"), n(360) + op("°"));
      A = f + op("·") + A;
      V = f + op("·") + V;
    }
  }
  const math = (content) =>
    `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${row(content)}</math>`;
  return `<div class="solid-math">${math(label + op("=") + A)}${math(v("V") + op("=") + V)}</div><p>u.a.: unidades de área · u.v.: unidades de volume.</p>`;
}
