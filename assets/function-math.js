// All expressions are parsed into a small arithmetic AST. No eval/Function or JS access.
export const PALETTE = [
  ["#111111", "Preto"],
  ["#2563eb", "Azul"],
  ["#dc2626", "Vermelho"],
  ["#15803d", "Verde"],
  ["#db2777", "Rosa"],
  ["#7c3aed", "Roxo"],
  ["#ea580c", "Laranja"],
  ["#d4a600", "Amarelo"],
];
export const FAMILIES = [
  ["afim", "Função afim"],
  ["quadratica", "Função quadrática"],
  ["exponencial", "Função exponencial"],
  ["logistica", "Função logística"],
  ["logaritmica", "Função logarítmica"],
  ["trigonometrica", "Função trigonométrica"],
  ["modular", "Função modular"],
];
export const PARAMS = {
  afim: [
    ["a", "Inclinação", -5, 5, 0.1],
    ["b", "Intercepto", -5, 5, 0.1],
  ],
  quadratica: [
    ["a", "Coeficiente de x²", -5, 5, 0.1],
    ["b", "Coeficiente de x", -5, 5, 0.1],
    ["c", "Termo constante", -5, 5, 0.1],
  ],
  exponencial: [
    ["a", "Multiplicador", -5, 5, 0.1],
    ["b", "Base positiva", 0.1, 5, 0.1],
    ["c", "Deslocamento vertical", -5, 5, 0.1],
  ],
  logistica: [
    ["a", "Amplitude do crescimento", 0.1, 20, 0.1],
    ["b", "Taxa de crescimento", -4, 4, 0.1],
    ["c", "Centro da transição", -6, 6, 0.1],
    ["d", "Deslocamento vertical", -5, 5, 0.1],
  ],
  logaritmica: [
    ["a", "Multiplicador", -5, 5, 0.1],
    ["b", "Base (b > 0; b ≠ 1)", 0.1, 5, 0.1],
    ["c", "Deslocamento horizontal", -5, 5, 0.1],
    ["d", "Deslocamento vertical", -5, 5, 0.1],
  ],
  trigonometrica: [
    ["a", "Deslocamento vertical", -5, 5, 0.1],
    ["b", "Amplitude / escala", -5, 5, 0.1],
    ["c", "Frequência angular", -5, 5, 0.1],
    ["d", "Fase · radianos", -6.3, 6.3, 0.05],
  ],
  modular: [
    ["a", "Multiplicador", -5, 5, 0.1],
    ["b", "Deslocamento horizontal", -5, 5, 0.1],
    ["c", "Deslocamento vertical", -5, 5, 0.1],
  ],
};
export function makeCurve(type = "quadratica", index = 0) {
  const c = {
    id: index + 1,
    type,
    a: 1,
    b: 0,
    c: 0,
    d: 0,
    trig: "sin",
    color: PALETTE[[1, 2, 3, 5][index % 4]][0],
    visible: true,
    domain: false,
    min: -10,
    max: 10,
  };
  if (type === "exponencial" || type === "logaritmica") c.b = 2;
  if (type === "logistica") Object.assign(c, { a: 8, b: 1, c: 0, d: 0 });
  if (type === "trigonometrica") Object.assign(c, { a: 0, b: 1, c: 1, d: 0 });
  return c;
}
export function makeExpression(index = 0) {
  return {
    expression: "",
    color: PALETTE[index % PALETTE.length][0],
    visible: true,
    showEquation: false,
    min: "",
    max: "",
  };
}
export function defaultFunctions() {
  return {
    mode: "families",
    active: 0,
    curves: [makeCurve()],
    comparisons: [makeExpression(2)],
    xmin: -10,
    xmax: 10,
    ymin: -6,
    ymax: 6,
    free: {
      equations: [makeExpression()],
      points: [],
      xmin: -5,
      xmax: 5,
      ymin: -2,
      ymax: 8,
      width: 1000,
      height: 700,
      widthCm: 14,
      heightCm: 9,
      axesBold: false,
      xlabel: "x",
      ylabel: "y",
      radians: false,
      grid: false,
      legend: true,
    },
  };
}
export function familyError(c) {
  if (c.type === "exponencial" && c.b <= 0)
    return "A base exponencial deve ser positiva.";
  if (c.type === "logaritmica" && (c.b <= 0 || Math.abs(c.b - 1) < 1e-12))
    return "O logaritmo exige base positiva e diferente de 1.";
  if (c.domain && !(c.min < c.max))
    return "O início do domínio deve ser menor que o fim.";
  return "";
}
export function familyValue(c, x) {
  if (
    !Number.isFinite(x) ||
    familyError(c) ||
    (c.domain && (x < c.min || x > c.max))
  )
    return NaN;
  const { a, b, d } = c,
    k = c.c;
  switch (c.type) {
    case "afim":
      return a * x + b;
    case "quadratica":
      return a * x * x + b * x + k;
    case "exponencial":
      return a * b ** x + k;
    case "logistica": {
      const z = -b * (x - k);
      return a * (z > 700 ? 0 : z < -700 ? 1 : 1 / (1 + Math.exp(z))) + d;
    }
    case "logaritmica":
      return x > k ? (a * Math.log(x - k)) / Math.log(b) + d : NaN;
    case "modular":
      return a * Math.abs(x - b) + k;
    case "trigonometrica": {
      let t = k * x + d;
      if (c.trig === "tan" && Math.abs(Math.cos(t)) < 1e-10) return NaN;
      return (
        a +
        b *
          (c.trig === "cos"
            ? Math.cos(t)
            : c.trig === "tan"
              ? Math.tan(t)
              : Math.sin(t))
      );
    }
    default:
      return NaN;
  }
}
const num = (n) =>
  Number(n.toFixed(4)).toLocaleString("pt-BR", {
    maximumFractionDigits: 4,
    useGrouping: false,
  });
export function familyFormula(c, symbolic = false) {
  const trig = c.trig === "cos" ? "cos" : c.trig === "tan" ? "tan" : "sen";
  if (symbolic)
    return {
      afim: "ax + b",
      quadratica: "ax² + bx + c",
      exponencial: "a · bˣ + c",
      logistica: "a / [1 + e^(−b(x − c))] + d",
      logaritmica: "a · logᵦ(x − c) + d",
      modular: "a · |x − b| + c",
      trigonometrica: "a + b · " + trig + "(cx + d)",
    }[c.type];
  const sum = (terms) => {
    let out = "";
    for (const [v, label] of terms) {
      if (v === 0) continue;
      const mag = Math.abs(v),
        part =
          (label
            ? mag === 1
              ? ""
              : num(mag) + (label === "x" || label === "x²" ? "" : " · ")
            : num(mag)) + label;
      out += (out ? (v < 0 ? " − " : " + ") : v < 0 ? "−" : "") + part;
    }
    return out || "0";
  };
  const shift = (v) =>
    v === 0 ? "" : v < 0 ? " − " + num(-v) : " + " + num(v);
  switch (c.type) {
    case "afim":
      return sum([
        [c.a, "x"],
        [c.b, ""],
      ]);
    case "quadratica":
      return sum([
        [c.a, "x²"],
        [c.b, "x"],
        [c.c, ""],
      ]);
    case "exponencial":
      return num(c.a) + " · (" + num(c.b) + ")ˣ" + shift(c.c);
    case "logistica":
      return (
        num(c.a) +
        " / [1 + e^(" +
        num(-c.b) +
        " · (x" +
        shift(-c.c) +
        "))]" +
        shift(c.d)
      );
    case "logaritmica":
      return (
        num(c.a) + " · log[" + num(c.b) + "](x" + shift(-c.c) + ")" + shift(c.d)
      );
    case "modular":
      return sum([
        [c.a, "|x" + shift(-c.b) + "|"],
        [c.c, ""],
      ]);
    case "trigonometrica":
      return sum([
        [c.a, ""],
        [
          c.b,
          trig +
            "(" +
            sum([
              [c.c, "x"],
              [c.d, ""],
            ]) +
            ")",
        ],
      ]);
  }
}
export function naturalDomain(c) {
  if (c.type === "logaritmica") return `x > ${num(c.c)}`;
  if (c.type === "trigonometrica" && c.trig === "tan") {
    if (c.c === 0)
      return Math.abs(Math.cos(c.d)) < 1e-10 ? "Domínio vazio" : "ℝ";
    return "x ≠ (π/2 + kπ − d)/c, k ∈ ℤ";
  }
  return "ℝ";
}
export function period(c) {
  if (c.type !== "trigonometrica" || !c.c || !c.b) return null;
  return (c.trig === "tan" ? Math.PI : 2 * Math.PI) / Math.abs(c.c);
}
export function familyBreaks(c, lo, hi) {
  if (c.type === "logaritmica") return [c.c];
  if (c.type !== "trigonometrica" || c.trig !== "tan" || !c.c) return [];
  const v = [c.c * lo + c.d, c.c * hi + c.d].sort((a, b) => a - b),
    out = [];
  for (
    let k = Math.ceil((v[0] - Math.PI / 2) / Math.PI);
    k <= Math.floor((v[1] - Math.PI / 2) / Math.PI) && out.length < 300;
    k++
  )
    out.push((Math.PI / 2 + k * Math.PI - c.d) / c.c);
  return out.sort((a, b) => a - b);
}
export function piLabel(x) {
  if (Math.abs(x) < 1e-9) return "0";
  let f = x / Math.PI;
  for (let q of [1, 2, 3, 4, 6, 8, 12]) {
    let p = Math.round(f * q);
    if (Math.abs(f - p / q) < 1e-7) {
      let sign = p < 0 ? "−" : "",
        n = Math.abs(p);
      return sign + (n === 1 ? "" : n) + "π" + (q === 1 ? "" : "/" + q);
    }
  }
  return num(x);
}
const funcs = {
  sin: Math.sin,
  sen: Math.sin,
  cos: Math.cos,
  tan: (x) => (Math.abs(Math.cos(x)) < 1e-10 ? NaN : Math.tan(x)),
  tg: (x) => (Math.abs(Math.cos(x)) < 1e-10 ? NaN : Math.tan(x)),
  sqrt: Math.sqrt,
  raiz: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
};
export function compileExpression(source, parameters = {}) {
  const parameterNames = ["a", "b", "c", "d"].filter((k) =>
    Object.hasOwn(parameters, k),
  );
  if (typeof source !== "string" || !source.trim())
    throw Error("Digite uma expressão.");
  if (source.length > 240) throw Error("Use até 240 caracteres por expressão.");
  let text = source
    .trim()
    .toLowerCase()
    .replace(/^(?:[fghpq]\(x\)|y)\s*=\s*/, "")
    .replaceAll("π", "pi")
    .replaceAll("−", "-")
    .replaceAll("×", "*")
    .replaceAll("·", "*")
    .replaceAll("÷", "/")
    .replaceAll("²", "^2")
    .replaceAll("³", "^3")
    .replace(/(\d),(\d)/g, "$1.$2");
  if (parameterNames.length) text = text.replace(/([abcd])x\b/g, "$1*x");
  // |x| notation; nested bars should be expressed with abs().
  let opening = true;
  text = text.replace(/\|/g, () => {
    let t = opening ? "abs(" : ")";
    opening = !opening;
    return t;
  });
  if (!opening) throw Error("Feche o módulo com | ou use abs(x).");
  const tokens = [];
  let pos = 0;
  while (pos < text.length) {
    if (/\s/.test(text[pos])) {
      pos++;
      continue;
    }
    const sub = text.slice(pos);
    let m;
    if ((m = sub.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/))) {
      tokens.push({ type: "num", v: Number(m[0]) });
      pos += m[0].length;
    } else if ((m = sub.match(/^[a-z]+/))) {
      const word = m[0];
      if (
        !["x", "pi", "e", ...parameterNames, ...Object.keys(funcs)].includes(
          word,
        )
      )
        throw Error(`Símbolo não reconhecido: ${word}.`);
      tokens.push({ type: "name", v: word });
      pos += word.length;
    } else if ("+-*/^()".includes(text[pos]))
      tokens.push({ type: text[pos], v: text[pos++] });
    else throw Error(`Caractere não permitido: ${text[pos]}.`);
    if (tokens.length > 180) throw Error("Simplifique a expressão.");
  }
  // Implicit products: 2x, 3(x+1), (x+1)(x-1), 2sen(x), pi x.
  const expanded = [];
  for (const token of tokens) {
    const prev = expanded.at(-1),
      ends =
        prev &&
        (prev.type === "num" ||
          prev.type === ")" ||
          (prev.type === "name" &&
            ["x", "pi", "e", ...parameterNames].includes(prev.v))),
      starts =
        token.type === "num" || token.type === "name" || token.type === "(";
    if (ends && starts) expanded.push({ type: "*" });
    expanded.push(token);
  }
  let i = 0,
    depth = 0;
  const peek = () => expanded[i]?.type,
    take = () => expanded[i++];
  function expr(min = 0) {
    if (++depth > 30) throw Error("Expressão muito aninhada.");
    let t = take(),
      node;
    if (!t) throw Error("Expressão incompleta.");
    if (t.type === "+" || t.type === "-")
      node = { op: t.type === "-" ? "neg" : "pos", a: expr(25) };
    else if (t.type === "num") node = { op: "num", v: t.v };
    else if (t.type === "name") {
      if (["x", "pi", "e"].includes(t.v)) node = { op: t.v };
      else if (parameterNames.includes(t.v)) node = { op: "parameter", v: t.v };
      else {
        if (peek() !== "(") throw Error(`Use ${t.v}(…).`);
        take();
        node = { op: "call", fn: t.v, a: expr() };
        if (take()?.type !== ")") throw Error("Falta fechar um parêntese.");
      }
    } else if (t.type === "(") {
      node = expr();
      if (take()?.type !== ")") throw Error("Falta fechar um parêntese.");
    } else throw Error("Confira os operadores e parênteses.");
    while (true) {
      let op = peek(),
        power = { "+": 10, "-": 10, "*": 20, "/": 20, "^": 30 }[op];
      if (power === undefined || power < min) break;
      take();
      node = { op, a: node, b: expr(op === "^" ? power : power + 1) };
    }
    depth--;
    return node;
  }
  const ast = expr();
  if (i !== expanded.length)
    throw Error("Há um parêntese ou operador fora de posição.");
  function run(n, x) {
    switch (n.op) {
      case "num":
        return n.v;
      case "parameter":
        return Number(parameters[n.v]);
      case "x":
        return x;
      case "pi":
        return Math.PI;
      case "e":
        return Math.E;
      case "neg":
        return -run(n.a, x);
      case "pos":
        return run(n.a, x);
      case "call":
        return funcs[n.fn](run(n.a, x));
      case "+":
        return run(n.a, x) + run(n.b, x);
      case "-":
        return run(n.a, x) - run(n.b, x);
      case "*":
        return run(n.a, x) * run(n.b, x);
      case "/": {
        let b = run(n.b, x);
        return b === 0 ? NaN : run(n.a, x) / b;
      }
      case "^":
        return run(n.a, x) ** run(n.b, x);
    }
  }
  return (x) => {
    const y = run(ast, x);
    return Number.isFinite(y) ? y : NaN;
  };
}
export function finiteInput(text) {
  if (/x/i.test(String(text).replace(/exp/gi, "")))
    throw Error("Informe um valor numérico, sem a variável x.");
  const n = compileExpression(String(text))(0);
  if (!Number.isFinite(n))
    throw Error("Informe um número finito, como 2,5 ou pi/2.");
  return n;
}
export function sanitizeFunctions(raw) {
  let out = defaultFunctions();
  if (!raw || typeof raw !== "object") return out;
  const finite = (n, f, min, max) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.max(min, Math.min(max, n))
      : f;
  if (Array.isArray(raw.curves) && raw.curves.length) {
    out.curves = raw.curves.slice(0, 4).map((c, i) => {
      let type = FAMILIES.some(([v]) => v === c.type) ? c.type : "afim",
        d = makeCurve(type, i);
      for (const k of ["a", "b", "c", "d"])
        d[k] = finite(c[k], d[k], -1000, 1000);
      d.trig = ["sin", "cos", "tan"].includes(c.trig) ? c.trig : "sin";
      d.visible = c.visible !== false;
      d.domain = c.domain === true;
      d.min = finite(c.min, -10, -10000, 10000);
      d.max = finite(c.max, 10, -10000, 10000);
      d.color = PALETTE.some(([v]) => v === c.color) ? c.color : d.color;
      return d;
    });
  } else if (raw.type) {
    let c = makeCurve(raw.type);
    ["a", "b", "c"].forEach((k) => (c[k] = finite(raw[k], c[k], -1000, 1000)));
    out.curves = [c];
  }
  out.active = Math.round(finite(raw.active, 0, 0, out.curves.length - 1));
  out.mode = raw.mode === "free" ? "free" : "families";
  for (const k of ["xmin", "xmax", "ymin", "ymax"])
    out[k] = finite(raw[k], out[k], -10000, 10000);
  if (out.xmin >= out.xmax) {
    out.xmin = -10;
    out.xmax = 10;
  }
  if (out.ymin >= out.ymax) {
    out.ymin = -6;
    out.ymax = 6;
  }
  const readExpression = (c, i) => {
    c = c && typeof c === "object" ? c : {};
    return {
      expression: String(c.expression ?? "").slice(0, 240),
      color: PALETTE.some(([v]) => v === c.color) ? c.color : PALETTE[i % 8][0],
      visible: c.visible !== false,
      showEquation: c.showEquation === true,
      min: String(c.min ?? "").slice(0, 40),
      max: String(c.max ?? "").slice(0, 40),
    };
  };
  if (Array.isArray(raw.comparisons))
    out.comparisons = raw.comparisons.slice(0, 5).map(readExpression);
  if (!out.comparisons.length) out.comparisons = [makeExpression(2)];
  const f = raw.free;
  if (f && typeof f === "object") {
    for (const k of ["xmin", "xmax", "ymin", "ymax"])
      out.free[k] = finite(f[k], out.free[k], -10000, 10000);
    for (const k of ["width", "height"])
      out.free[k] = Math.round(
        finite(
          f[k],
          out.free[k],
          k === "width" ? 320 : 240,
          k === "width" ? 2000 : 1600,
        ),
      );
    out.free.widthCm = finite(f.widthCm, 14, 6, 30);
    out.free.heightCm = finite(f.heightCm, 9, 4, 25);
    out.free.axesBold = f.axesBold === true;
    for (const k of ["xlabel", "ylabel"])
      if (typeof f[k] === "string") out.free[k] = f[k].slice(0, 30);
    for (const k of ["radians", "grid", "legend"]) out.free[k] = f[k] === true;
    if (Array.isArray(f.equations) && f.equations.length)
      out.free.equations = f.equations.slice(0, 5).map(readExpression);
    if (Array.isArray(f.points))
      out.free.points = f.points
        .slice(0, 12)
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        .map((p) => ({
          x: finite(p.x, 0, -10000, 10000),
          y: finite(p.y, 0, -10000, 10000),
          label: String(p.label || "").slice(0, 24),
          project: p.project !== false,
        }));
    if (out.free.xmin >= out.free.xmax) {
      out.free.xmin = -5;
      out.free.xmax = 5;
    }
    if (out.free.ymin >= out.free.ymax) {
      out.free.ymin = -2;
      out.free.ymax = 8;
    }
  }
  return out;
}

// Extrema of sine/cosine restricted to a closed interval, including endpoints.
export function trigBounds(c) {
  if (c.type !== "trigonometrica" || c.trig === "tan" || familyError(c))
    return null;
  if (!c.b || !c.c) {
    const y = familyValue(c, c.domain ? c.min : 0);
    return { min: y, max: y };
  }
  const full = { min: c.a - Math.abs(c.b), max: c.a + Math.abs(c.b) };
  if (!c.domain || Math.abs(c.c * (c.max - c.min)) >= 2 * Math.PI) return full;
  const [lo, hi] = [c.c * c.min + c.d, c.c * c.max + c.d].sort((a, b) => a - b),
    shift = c.trig === "cos" ? 0 : Math.PI / 2;
  const values = [familyValue(c, c.min), familyValue(c, c.max)];
  for (
    let k = Math.ceil((lo - shift) / Math.PI);
    k <= Math.floor((hi - shift) / Math.PI);
    k++
  )
    values.push(c.a + c.b * (k % 2 === 0 ? 1 : -1));
  return { min: Math.min(...values), max: Math.max(...values) };
}
