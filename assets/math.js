export const choose = (n, k) => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) r = (r * (n - i + 1)) / i;
  return Math.round(r);
};
export const binomial = (n, p) =>
  Array.from(
    { length: n + 1 },
    (_, k) => choose(n, k) * p ** k * (1 - p) ** (n - k),
  );
export function statistics(values, sample = false) {
  if (!values.length || values.some((x) => !Number.isFinite(x)))
    throw Error("Informe ao menos um número finito.");
  const sorted = [...values].sort((a, b) => a - b),
    n = values.length,
    mean = values.reduce((a, b) => a + b, 0) / n,
    median =
      n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const frequencies = new Map();
  values.forEach((v) => frequencies.set(v, (frequencies.get(v) || 0) + 1));
  const max = Math.max(...frequencies.values());
  const variance =
    sample && n < 2
      ? null
      : values.reduce((s, x) => s + (x - mean) ** 2, 0) / (sample ? n - 1 : n);
  return {
    n,
    mean,
    median,
    modes:
      max === 1
        ? []
        : [...frequencies]
            .filter(([, v]) => v === max)
            .map(([k]) => k)
            .sort((a, b) => a - b),
    variance,
    std: variance === null ? null : Math.sqrt(variance),
    range: sorted[n - 1] - sorted[0],
    min: sorted[0],
    max: sorted[n - 1],
    sorted,
    frequencies,
  };
}
export function parseData(text) {
  const tokens = text
    .trim()
    .split(/[;\s]+/)
    .filter(Boolean);
  if (!tokens.length || tokens.length > 500)
    throw Error(
      "Use de 1 a 500 valores, separados por espaço ou ponto e vírgula.",
    );
  const values = tokens.map((t) => Number(t.replace(",", ".")));
  if (values.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e9))
    throw Error(
      "Use apenas números entre −1 bilhão e 1 bilhão. Exemplo: 4; 5,5; 7.",
    );
  return values;
}
export function conditional(a, b, c, d) {
  const total = a + b + c + d;
  return {
    total,
    pa: total ? (a + b) / total : null,
    pb: total ? (a + c) / total : null,
    pab: total ? a / total : null,
    paGivenB: a + c ? a / (a + c) : null,
    pbGivenA: a + b ? a / (a + b) : null,
  };
}
export function solidMetrics(type, a, h, b) {
  let area,
    volume,
    formulaA,
    formulaV,
    vertices = null,
    edges = null,
    faces = null,
    g = null;
  if (type === "cubo") {
    area = 6 * a * a;
    volume = a ** 3;
    formulaA = "6a²";
    formulaV = "a³";
    vertices = 8;
    edges = 12;
    faces = 6;
  }
  if (type === "prisma") {
    area = 2 * (a * b + a * h + b * h);
    volume = a * b * h;
    formulaA = "2(ab + ah + bh)";
    formulaV = "abh";
    vertices = 8;
    edges = 12;
    faces = 6;
  }
  if (type === "piramide") {
    g = Math.hypot(h, a / 2);
    area = a * a + 2 * a * g;
    volume = (a * a * h) / 3;
    formulaA = "a² + 2aℓ";
    formulaV = "a²h / 3";
    vertices = 5;
    edges = 8;
    faces = 5;
  }
  if (type === "cilindro") {
    area = 2 * Math.PI * a * (a + h);
    volume = Math.PI * a * a * h;
    formulaA = "2πr(r + h)";
    formulaV = "πr²h";
    g = h;
  }
  if (type === "cone") {
    g = Math.hypot(a, h);
    area = Math.PI * a * (a + g);
    volume = (Math.PI * a * a * h) / 3;
    formulaA = "πr(r + g)";
    formulaV = "πr²h / 3";
  }
  if (type === "esfera") {
    area = 4 * Math.PI * a * a;
    volume = (4 * Math.PI * a ** 3) / 3;
    formulaA = "4πr²";
    formulaV = "4πr³ / 3";
  }
  return { area, volume, formulaA, formulaV, vertices, edges, faces, g };
}
export const functionValue = (type, x, a, b, c = 0) =>
  type === "afim"
    ? a * x + b
    : type === "quadratica"
      ? a * x * x + b * x + c
      : type === "exponencial"
        ? a * b ** x + c
        : a * Math.sin(b * x + c);
export function mesh(type, a, h, b) {
  if (type === "cubo" || type === "prisma") {
    let x = a / 2,
      y = (type === "cubo" ? a : h) / 2,
      z = (type === "cubo" ? a : b) / 2;
    return {
      vertices: [
        [-x, -y, -z],
        [x, -y, -z],
        [x, y, -z],
        [-x, y, -z],
        [-x, -y, z],
        [x, -y, z],
        [x, y, z],
        [-x, y, z],
      ],
      faces: [
        [0, 1, 2, 3],
        [4, 7, 6, 5],
        [0, 4, 5, 1],
        [3, 2, 6, 7],
        [0, 3, 7, 4],
        [1, 5, 6, 2],
      ],
      poly: true,
    };
  }
  if (type === "piramide")
    return {
      vertices: [
        [-a / 2, -h / 2, -a / 2],
        [a / 2, -h / 2, -a / 2],
        [a / 2, -h / 2, a / 2],
        [-a / 2, -h / 2, a / 2],
        [0, h / 2, 0],
      ],
      faces: [
        [0, 3, 2, 1],
        [0, 1, 4],
        [1, 2, 4],
        [2, 3, 4],
        [3, 0, 4],
      ],
      poly: true,
    };
  const vertices = [],
    faces = [],
    N = 64;
  if (type === "esfera") {
    const rows = 24;
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i < N; i++) {
        const t = (Math.PI * j) / rows,
          p = (2 * Math.PI * i) / N;
        vertices.push([
          a * Math.sin(t) * Math.cos(p),
          a * Math.cos(t),
          a * Math.sin(t) * Math.sin(p),
        ]);
      }
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < N; i++)
        faces.push([
          j * N + i,
          j * N + ((i + 1) % N),
          (j + 1) * N + ((i + 1) % N),
          (j + 1) * N + i,
        ]);
    return { vertices, faces, poly: false };
  }
  for (let i = 0; i < N; i++)
    vertices.push([
      a * Math.cos((2 * Math.PI * i) / N),
      -h / 2,
      a * Math.sin((2 * Math.PI * i) / N),
    ]);
  faces.push(Array.from({ length: N }, (_, i) => N - 1 - i));
  if (type === "cone") {
    vertices.push([0, h / 2, 0]);
    for (let i = 0; i < N; i++) faces.push([i, (i + 1) % N, N]);
  } else {
    for (let i = 0; i < N; i++)
      vertices.push([
        a * Math.cos((2 * Math.PI * i) / N),
        h / 2,
        a * Math.sin((2 * Math.PI * i) / N),
      ]);
    faces.push(Array.from({ length: N }, (_, i) => N + i));
    for (let i = 0; i < N; i++)
      faces.push([i, (i + 1) % N, N + ((i + 1) % N), N + i]);
  }
  return { vertices, faces, poly: false };
}
