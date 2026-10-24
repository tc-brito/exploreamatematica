(() => {
  // assets/math.js
  var choose = (n, k) => {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 1; i <= Math.min(k, n - k); i++) r = r * (n - i + 1) / i;
    return Math.round(r);
  };
  var binomial = (n, p) => Array.from(
    { length: n + 1 },
    (_, k) => choose(n, k) * p ** k * (1 - p) ** (n - k)
  );
  function statistics(values, sample = false) {
    if (!values.length || values.some((x) => !Number.isFinite(x)))
      throw Error("Informe ao menos um n\xFAmero finito.");
    const sorted = [...values].sort((a, b) => a - b), n = values.length, mean = values.reduce((a, b) => a + b, 0) / n, median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const frequencies = /* @__PURE__ */ new Map();
    values.forEach((v) => frequencies.set(v, (frequencies.get(v) || 0) + 1));
    const max = Math.max(...frequencies.values());
    const variance = sample && n < 2 ? null : values.reduce((s, x) => s + (x - mean) ** 2, 0) / (sample ? n - 1 : n);
    return {
      n,
      mean,
      median,
      modes: max === 1 ? [] : [...frequencies].filter(([, v]) => v === max).map(([k]) => k).sort((a, b) => a - b),
      variance,
      std: variance === null ? null : Math.sqrt(variance),
      range: sorted[n - 1] - sorted[0],
      min: sorted[0],
      max: sorted[n - 1],
      sorted,
      frequencies
    };
  }
  function parseData(text) {
    const tokens = text.trim().split(/[;\s]+/).filter(Boolean);
    if (!tokens.length || tokens.length > 500)
      throw Error(
        "Use de 1 a 500 valores, separados por espa\xE7o ou ponto e v\xEDrgula."
      );
    const values = tokens.map((t) => Number(t.replace(",", ".")));
    if (values.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e9))
      throw Error(
        "Use apenas n\xFAmeros entre \u22121 bilh\xE3o e 1 bilh\xE3o. Exemplo: 4; 5,5; 7."
      );
    return values;
  }
  function conditional(a, b, c, d) {
    const total = a + b + c + d;
    return {
      total,
      pa: total ? (a + b) / total : null,
      pb: total ? (a + c) / total : null,
      pab: total ? a / total : null,
      paGivenB: a + c ? a / (a + c) : null,
      pbGivenA: a + b ? a / (a + b) : null
    };
  }
  function solidMetrics(type, a, h, b) {
    let area, volume, formulaA, formulaV, vertices = null, edges = null, faces = null, g = null;
    if (type === "cubo") {
      area = 6 * a * a;
      volume = a ** 3;
      formulaA = "6a\xB2";
      formulaV = "a\xB3";
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
      volume = a * a * h / 3;
      formulaA = "a\xB2 + 2a\u2113";
      formulaV = "a\xB2h / 3";
      vertices = 5;
      edges = 8;
      faces = 5;
    }
    if (type === "cilindro") {
      area = 2 * Math.PI * a * (a + h);
      volume = Math.PI * a * a * h;
      formulaA = "2\u03C0r(r + h)";
      formulaV = "\u03C0r\xB2h";
      g = h;
    }
    if (type === "cone") {
      g = Math.hypot(a, h);
      area = Math.PI * a * (a + g);
      volume = Math.PI * a * a * h / 3;
      formulaA = "\u03C0r(r + g)";
      formulaV = "\u03C0r\xB2h / 3";
    }
    if (type === "esfera") {
      area = 4 * Math.PI * a * a;
      volume = 4 * Math.PI * a ** 3 / 3;
      formulaA = "4\u03C0r\xB2";
      formulaV = "4\u03C0r\xB3 / 3";
    }
    return { area, volume, formulaA, formulaV, vertices, edges, faces, g };
  }
  function mesh(type, a, h, b) {
    if (type === "cubo" || type === "prisma") {
      let x = a / 2, y = (type === "cubo" ? a : h) / 2, z = (type === "cubo" ? a : b) / 2;
      return {
        vertices: [
          [-x, -y, -z],
          [x, -y, -z],
          [x, y, -z],
          [-x, y, -z],
          [-x, -y, z],
          [x, -y, z],
          [x, y, z],
          [-x, y, z]
        ],
        faces: [
          [0, 1, 2, 3],
          [4, 7, 6, 5],
          [0, 4, 5, 1],
          [3, 2, 6, 7],
          [0, 3, 7, 4],
          [1, 5, 6, 2]
        ],
        poly: true
      };
    }
    if (type === "piramide")
      return {
        vertices: [
          [-a / 2, -h / 2, -a / 2],
          [a / 2, -h / 2, -a / 2],
          [a / 2, -h / 2, a / 2],
          [-a / 2, -h / 2, a / 2],
          [0, h / 2, 0]
        ],
        faces: [
          [0, 3, 2, 1],
          [0, 1, 4],
          [1, 2, 4],
          [2, 3, 4],
          [3, 0, 4]
        ],
        poly: true
      };
    const vertices = [], faces = [], N = 64;
    if (type === "esfera") {
      const rows = 24;
      for (let j = 0; j <= rows; j++)
        for (let i = 0; i < N; i++) {
          const t = Math.PI * j / rows, p = 2 * Math.PI * i / N;
          vertices.push([
            a * Math.sin(t) * Math.cos(p),
            a * Math.cos(t),
            a * Math.sin(t) * Math.sin(p)
          ]);
        }
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < N; i++)
          faces.push([
            j * N + i,
            j * N + (i + 1) % N,
            (j + 1) * N + (i + 1) % N,
            (j + 1) * N + i
          ]);
      return { vertices, faces, poly: false };
    }
    for (let i = 0; i < N; i++)
      vertices.push([
        a * Math.cos(2 * Math.PI * i / N),
        -h / 2,
        a * Math.sin(2 * Math.PI * i / N)
      ]);
    faces.push(Array.from({ length: N }, (_, i) => N - 1 - i));
    if (type === "cone") {
      vertices.push([0, h / 2, 0]);
      for (let i = 0; i < N; i++) faces.push([i, (i + 1) % N, N]);
    } else {
      for (let i = 0; i < N; i++)
        vertices.push([
          a * Math.cos(2 * Math.PI * i / N),
          h / 2,
          a * Math.sin(2 * Math.PI * i / N)
        ]);
      faces.push(Array.from({ length: N }, (_, i) => N + i));
      for (let i = 0; i < N; i++)
        faces.push([i, (i + 1) % N, N + (i + 1) % N, N + i]);
    }
    return { vertices, faces, poly: false };
  }

  // assets/geometry-model.js
  var SOLID_NAMES = {
    cubo: "Cubo",
    prisma: "Prisma retangular",
    piramide: "Pir\xE2mide quadrangular",
    cilindro: "Cilindro",
    cone: "Cone",
    esfera: "Esfera"
  };
  var FACE_COLORS = [
    "#c5d9b0",
    "#8fb28b",
    "#d7e3c2",
    "#a8c99f",
    "#c4d5ad",
    "#e1e9cf"
  ];
  var add = (a, b) => a.map((v, i) => v + b[i]);
  var norm = (v) => Math.hypot(...v);
  var scale = (v, k) => v.map((x) => x * k);
  var CAMERA_VIEWS = {
    perspective: { label: "Perspectiva 3D", rx: 0.38, ry: 0.56 },
    front: { label: "Frontal", rx: 0, ry: 0 },
    right: { label: "Lateral direita", rx: 0, ry: -Math.PI / 2 },
    left: { label: "Lateral esquerda", rx: 0, ry: Math.PI / 2 },
    top: { label: "Superior", rx: Math.PI / 2, ry: 0 },
    bottom: { label: "Inferior", rx: -Math.PI / 2, ry: 0 },
    back: { label: "Traseira", rx: 0, ry: Math.PI }
  };
  function cameraAngles(s) {
    let { rx, ry } = s;
    if (s.view === "net" && s.camera === "perspective") {
      const t = s.opening / 100;
      rx = s.type === "cilindro" ? rx * (1 - t) : rx * (1 - t) + Math.PI / 2 * t;
      ry *= 1 - t;
    }
    return { rx, ry };
  }
  function defaultGeometry() {
    return {
      type: "cubo",
      a: 4,
      h: 6,
      b: 3,
      faces: true,
      edges: true,
      vertices: false,
      measure: true,
      guide: false,
      diagonal: false,
      triangleApothem: false,
      triangleEdge: false,
      view: "solid",
      camera: "perspective",
      opening: 0,
      revolution: 0,
      axis: "y",
      part: "whole",
      capHeight: 2,
      wedge: 90,
      rx: 0.38,
      ry: 0.56,
      zoom: 1
    };
  }
  var face = (points, i = 0, extra = {}) => ({
    points,
    color: FACE_COLORS[i % 6],
    ...extra
  });
  function cuboidNet(a, h, b, t) {
    const q = t * Math.PI / 2, C = Math.cos(q), S = Math.sin(q), base = [
      [-a / 2, 0, -b / 2],
      [a / 2, 0, -b / 2],
      [a / 2, 0, b / 2],
      [-a / 2, 0, b / 2]
    ], north = (u, v) => [u, v * C, -b / 2 - v * S], south = (u, v) => [u, v * C, b / 2 + v * S], west = (u, v) => [-a / 2 - v * S, v * C, u], east = (u, v) => [a / 2 + v * S, v * C, u], panel = (fn, w) => [
      fn(-w / 2, 0),
      fn(w / 2, 0),
      fn(w / 2, h),
      fn(-w / 2, h)
    ], top = (u, v) => [
      u,
      h * C + v * Math.sin(2 * q),
      -b / 2 - h * S + v * Math.cos(2 * q)
    ];
    return [
      face(base, 0),
      face(panel(north, a), 1),
      face(panel(south, a), 2),
      face(panel(west, b), 3),
      face(panel(east, b), 4),
      face([top(-a / 2, 0), top(a / 2, 0), top(a / 2, b), top(-a / 2, b)], 5)
    ];
  }
  function pyramidNet(a, h, t) {
    const q = (Math.PI - Math.atan2(h, a / 2)) * t, C = Math.cos(q), S = Math.sin(q), v = h * C + a / 2 * S, w = h * S - a / 2 * C;
    return [
      face(
        [
          [-a / 2, 0, -a / 2],
          [a / 2, 0, -a / 2],
          [a / 2, 0, a / 2],
          [-a / 2, 0, a / 2]
        ],
        0
      ),
      face(
        [
          [-a / 2, 0, -a / 2],
          [a / 2, 0, -a / 2],
          [0, v, -a / 2 - w]
        ],
        1
      ),
      face(
        [
          [a / 2, 0, -a / 2],
          [a / 2, 0, a / 2],
          [a / 2 + w, v, 0]
        ],
        2
      ),
      face(
        [
          [a / 2, 0, a / 2],
          [-a / 2, 0, a / 2],
          [0, v, a / 2 + w]
        ],
        3
      ),
      face(
        [
          [-a / 2, 0, a / 2],
          [-a / 2, 0, -a / 2],
          [-a / 2 - w, v, 0]
        ],
        4
      )
    ];
  }
  function cylinderNet(r, h, t, N = 80) {
    const k = (1 - t) / r, bend = (s) => Math.abs(k) < 1e-8 ? [s, 0] : [Math.sin(k * s) / k, (Math.cos(k * s) - 1) / k], result = [], q = t * Math.PI / 2;
    for (let i = 0; i < N; i++) {
      let p = bend(-Math.PI * r + 2 * Math.PI * r * i / N), n = bend(-Math.PI * r + 2 * Math.PI * r * (i + 1) / N);
      result.push(
        face(
          [
            [p[0], 0, p[1]],
            [n[0], 0, n[1]],
            [n[0], h, n[1]],
            [p[0], h, p[1]]
          ],
          2,
          { smooth: true }
        )
      );
    }
    for (let side of [-1, 1]) {
      let pts = [];
      for (let i = 0; i < N; i++) {
        const angle = 2 * Math.PI * i / N, x = r * Math.sin(angle), z = r * (Math.cos(angle) - 1);
        pts.push([
          x,
          (side === 1 ? h : 0) - side * z * Math.sin(q),
          z * Math.cos(q)
        ]);
      }
      result.push(face(pts, side === 1 ? 1 : 0));
    }
    return result;
  }
  function coneNet(r, h, t, N = 96) {
    let g = Math.hypot(r, h), alpha = Math.asin(r / g), beta = alpha + (Math.PI / 2 - alpha) * t, phi = 2 * Math.PI * Math.sin(alpha) / Math.sin(beta), base = (i) => [
      g * Math.sin(beta) * Math.sin(-phi / 2 + phi * i / N),
      0,
      g * Math.sin(beta) * Math.cos(-phi / 2 + phi * i / N)
    ], apex = [0, g * Math.cos(beta), 0], result = [];
    for (let i = 0; i < N; i++)
      result.push(face([apex, base(i), base(i + 1)], 2, { smooth: true }));
    const q = Math.PI * t, pts = [];
    for (let i = 0; i < N; i++) {
      let angle = 2 * Math.PI * i / N, z = r * (Math.cos(angle) - 1);
      pts.push([
        r * Math.sin(angle),
        -z * Math.sin(q),
        g * Math.sin(beta) + z * Math.cos(q)
      ]);
    }
    result.push(face(pts, 1));
    return result;
  }
  function capMetrics(r, h) {
    const curved = 2 * Math.PI * r * h, base = Math.PI * (2 * r * h - h * h), volume = Math.PI * h * h * (r - h / 3);
    return {
      curved,
      base,
      total: curved + base,
      volume,
      baseRadius: Math.sqrt(Math.max(0, 2 * r * h - h * h))
    };
  }
  function wedgeMetrics(r, degrees) {
    const fraction = degrees / 360, curved = fraction * 4 * Math.PI * r * r, cut = degrees > 0 && degrees < 360 ? Math.PI * r * r : 0;
    return {
      curved,
      cut,
      total: curved + cut,
      volume: fraction * 4 * Math.PI * r ** 3 / 3
    };
  }
  function sphericalCap(r, h, N = 64, rows = 26) {
    const limit = Math.acos(Math.max(-1, Math.min(1, (r - h) / r))), p = (j, i) => {
      let t = limit * j / rows, a = 2 * Math.PI * i / N;
      return [
        r * Math.sin(t) * Math.cos(a),
        r * Math.cos(t),
        r * Math.sin(t) * Math.sin(a)
      ];
    }, out = [];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < N; i++)
        out.push(
          face([p(j, i), p(j, i + 1), p(j + 1, i + 1), p(j + 1, i)], 2, {
            smooth: true
          })
        );
    if (h > 0 && h < 2 * r)
      out.push(
        face(
          Array.from({ length: N }, (_, i) => p(rows, i)),
          0
        )
      );
    return out;
  }
  function revolutionProfile(type, r, h) {
    if (type === "cilindro")
      return [
        [0, -h / 2, 0],
        [r, -h / 2, 0],
        [r, h / 2, 0],
        [0, h / 2, 0]
      ];
    if (type === "cone")
      return [
        [0, -h / 2, 0],
        [r, -h / 2, 0],
        [0, h / 2, 0]
      ];
    return Array.from({ length: 49 }, (_, j) => {
      let a = Math.PI * j / 48;
      return [r * Math.sin(a), r * Math.cos(a), 0];
    });
  }
  var revolvePoint = ([x, y], phi, axis = "y") => axis === "y" ? [x * Math.cos(phi), y, x * Math.sin(phi)] : [y, x * Math.cos(phi), x * Math.sin(phi)];
  function revolutionMesh(type, r, h, degrees, axis = "y") {
    const angle = degrees * Math.PI / 180, steps = Math.max(1, Math.ceil(degrees / 5)), profile = revolutionProfile(type, r, h), out = [];
    if (degrees <= 0) return [];
    for (let j = 0; j < profile.length; j++) {
      let next = (j + 1) % profile.length;
      if (Math.abs(profile[j][0]) + Math.abs(profile[next][0]) < 1e-8) continue;
      for (let i = 0; i < steps; i++) {
        const a = angle * i / steps, b = angle * (i + 1) / steps;
        out.push(
          face(
            [
              revolvePoint(profile[j], a, axis),
              revolvePoint(profile[next], a, axis),
              revolvePoint(profile[next], b, axis),
              revolvePoint(profile[j], b, axis)
            ],
            j === 0 ? 0 : 2,
            { smooth: true }
          )
        );
      }
    }
    if (degrees < 360) {
      out.push(
        face(
          profile.map((p) => revolvePoint(p, 0, axis)),
          4,
          { cut: true }
        )
      );
      out.push(
        face(
          profile.map((p) => revolvePoint(p, angle, axis)),
          1,
          { cut: true }
        )
      );
    }
    return out;
  }
  function solidScene(s) {
    let faces, poly = ["cubo", "prisma", "piramide"].includes(s.type), a = s.a, h = s.type === "cubo" ? a : s.h, b = s.type === "cubo" ? a : s.b;
    if (s.view === "net") {
      const t = s.opening / 100;
      faces = s.type === "piramide" ? pyramidNet(a, h, t) : s.type === "cilindro" ? cylinderNet(a, h, t) : s.type === "cone" ? coneNet(a, h, t) : cuboidNet(a, h, b, t);
    } else if (s.view === "revolution")
      faces = revolutionMesh(s.type, a, h, s.revolution, s.axis);
    else if (s.type === "esfera" && s.part === "cap")
      faces = sphericalCap(a, s.capHeight);
    else if (s.type === "esfera" && s.part === "wedge")
      faces = revolutionMesh("esfera", a, h, s.wedge);
    else {
      let m = mesh(s.type, a, h, b);
      faces = m.faces.map(
        (f, i) => face(
          f.map((j) => m.vertices[j]),
          i,
          { smooth: !m.poly && f.length <= 4 }
        )
      );
    }
    if (s.view === "exploded") {
      faces = faces.map((f, i) => {
        let c = f.points.reduce(
          (v, p) => add(v, scale(p, 1 / f.points.length)),
          [0, 0, 0]
        ), offset = poly ? scale(c, 1.8 / (norm(c) || 1)) : i === 0 ? [0, -1.8, 0] : s.type === "cilindro" && i === 1 ? [0, 1.8, 0] : [0, 0.3, 0];
        return { ...f, points: f.points.map((p) => add(p, offset)) };
      });
    }
    return { faces, poly };
  }
  function sanitizeGeometry(raw) {
    const s = defaultGeometry();
    if (!raw || typeof raw !== "object") return s;
    for (const k of Object.keys(s)) {
      if (typeof s[k] === "number" && Number.isFinite(raw[k])) s[k] = raw[k];
      if (typeof s[k] === "boolean" && typeof raw[k] === "boolean") s[k] = raw[k];
      if (typeof s[k] === "string" && typeof raw[k] === "string") s[k] = raw[k];
    }
    const clamp = (k, min, max) => s[k] = Math.max(min, Math.min(max, s[k]));
    if (!SOLID_NAMES[s.type]) s.type = "cubo";
    if (!Object.hasOwn(CAMERA_VIEWS, s.camera) && s.camera !== "custom")
      s.camera = "perspective";
    if (raw.camera === void 0 && (raw.rx !== void 0 || raw.ry !== void 0))
      s.camera = "custom";
    if (!["solid", "net", "exploded", "revolution"].includes(s.view))
      s.view = "solid";
    if (s.view === "revolution" && !["cilindro", "cone", "esfera"].includes(s.type))
      s.view = "solid";
    if (s.type === "esfera" && ["net", "exploded"].includes(s.view))
      s.view = "solid";
    if (!["whole", "cap", "wedge"].includes(s.part)) s.part = "whole";
    if (!["x", "y"].includes(s.axis)) s.axis = "y";
    clamp("a", 0.5, 10);
    clamp("h", 0.5, 12);
    clamp("b", 0.5, 10);
    clamp("opening", 0, 100);
    clamp("revolution", 0, 360);
    clamp("capHeight", 0.05, 2 * s.a);
    clamp("wedge", 1, 360);
    clamp("zoom", 0.4, 2);
    clamp("rx", -Math.PI, Math.PI);
    clamp("ry", -100, 100);
    return s;
  }

  // assets/function-math.js
  var PALETTE = [
    ["#111111", "Preto"],
    ["#2563eb", "Azul"],
    ["#dc2626", "Vermelho"],
    ["#15803d", "Verde"],
    ["#db2777", "Rosa"],
    ["#7c3aed", "Roxo"],
    ["#ea580c", "Laranja"],
    ["#d4a600", "Amarelo"]
  ];
  var FAMILIES = [
    ["afim", "Fun\xE7\xE3o afim"],
    ["quadratica", "Fun\xE7\xE3o quadr\xE1tica"],
    ["exponencial", "Fun\xE7\xE3o exponencial"],
    ["logistica", "Fun\xE7\xE3o log\xEDstica"],
    ["logaritmica", "Fun\xE7\xE3o logar\xEDtmica"],
    ["trigonometrica", "Fun\xE7\xE3o trigonom\xE9trica"],
    ["modular", "Fun\xE7\xE3o modular"]
  ];
  var PARAMS = {
    afim: [
      ["a", "Inclina\xE7\xE3o", -5, 5, 0.1],
      ["b", "Intercepto", -5, 5, 0.1]
    ],
    quadratica: [
      ["a", "Coeficiente de x\xB2", -5, 5, 0.1],
      ["b", "Coeficiente de x", -5, 5, 0.1],
      ["c", "Termo constante", -5, 5, 0.1]
    ],
    exponencial: [
      ["a", "Multiplicador", -5, 5, 0.1],
      ["b", "Base positiva", 0.1, 5, 0.1],
      ["c", "Deslocamento vertical", -5, 5, 0.1]
    ],
    logistica: [
      ["a", "Amplitude do crescimento", 0.1, 20, 0.1],
      ["b", "Taxa de crescimento", -4, 4, 0.1],
      ["c", "Centro da transi\xE7\xE3o", -6, 6, 0.1],
      ["d", "Deslocamento vertical", -5, 5, 0.1]
    ],
    logaritmica: [
      ["a", "Multiplicador", -5, 5, 0.1],
      ["b", "Base (b > 0; b \u2260 1)", 0.1, 5, 0.1],
      ["c", "Deslocamento horizontal", -5, 5, 0.1],
      ["d", "Deslocamento vertical", -5, 5, 0.1]
    ],
    trigonometrica: [
      ["a", "Deslocamento vertical", -5, 5, 0.1],
      ["b", "Amplitude / escala", -5, 5, 0.1],
      ["c", "Frequ\xEAncia angular", -5, 5, 0.1],
      ["d", "Fase \xB7 radianos", -6.3, 6.3, 0.05]
    ],
    modular: [
      ["a", "Multiplicador", -5, 5, 0.1],
      ["b", "Deslocamento horizontal", -5, 5, 0.1],
      ["c", "Deslocamento vertical", -5, 5, 0.1]
    ]
  };
  function makeCurve(type = "quadratica", index = 0) {
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
      max: 10
    };
    if (type === "exponencial" || type === "logaritmica") c.b = 2;
    if (type === "logistica") Object.assign(c, { a: 8, b: 1, c: 0, d: 0 });
    if (type === "trigonometrica") Object.assign(c, { a: 0, b: 1, c: 1, d: 0 });
    return c;
  }
  function makeExpression(index = 0) {
    return {
      expression: "",
      color: PALETTE[index % PALETTE.length][0],
      visible: true,
      showEquation: false,
      min: "",
      max: ""
    };
  }
  function defaultFunctions() {
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
        width: 1e3,
        height: 700,
        widthCm: 14,
        heightCm: 9,
        axesBold: false,
        xlabel: "x",
        ylabel: "y",
        radians: false,
        grid: false,
        legend: true
      }
    };
  }
  function familyError(c) {
    if (c.type === "exponencial" && c.b <= 0)
      return "A base exponencial deve ser positiva.";
    if (c.type === "logaritmica" && (c.b <= 0 || Math.abs(c.b - 1) < 1e-12))
      return "O logaritmo exige base positiva e diferente de 1.";
    if (c.domain && !(c.min < c.max))
      return "O in\xEDcio do dom\xEDnio deve ser menor que o fim.";
    return "";
  }
  function familyValue(c, x) {
    if (!Number.isFinite(x) || familyError(c) || c.domain && (x < c.min || x > c.max))
      return NaN;
    const { a, b, d } = c, k = c.c;
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
        return x > k ? a * Math.log(x - k) / Math.log(b) + d : NaN;
      case "modular":
        return a * Math.abs(x - b) + k;
      case "trigonometrica": {
        let t = k * x + d;
        if (c.trig === "tan" && Math.abs(Math.cos(t)) < 1e-10) return NaN;
        return a + b * (c.trig === "cos" ? Math.cos(t) : c.trig === "tan" ? Math.tan(t) : Math.sin(t));
      }
      default:
        return NaN;
    }
  }
  var num = (n) => Number(n.toFixed(4)).toLocaleString("pt-BR", {
    maximumFractionDigits: 4,
    useGrouping: false
  });
  function familyFormula(c, symbolic = false) {
    const trig = c.trig === "cos" ? "cos" : c.trig === "tan" ? "tan" : "sen";
    if (symbolic)
      return {
        afim: "ax + b",
        quadratica: "ax\xB2 + bx + c",
        exponencial: "a \xB7 b\u02E3 + c",
        logistica: "a / [1 + e^(\u2212b(x \u2212 c))] + d",
        logaritmica: "a \xB7 log\u1D66(x \u2212 c) + d",
        modular: "a \xB7 |x \u2212 b| + c",
        trigonometrica: "a + b \xB7 " + trig + "(cx + d)"
      }[c.type];
    const sum = (terms) => {
      let out = "";
      for (const [v, label] of terms) {
        if (v === 0) continue;
        const mag = Math.abs(v), part = (label ? mag === 1 ? "" : num(mag) + (label === "x" || label === "x\xB2" ? "" : " \xB7 ") : num(mag)) + label;
        out += (out ? v < 0 ? " \u2212 " : " + " : v < 0 ? "\u2212" : "") + part;
      }
      return out || "0";
    };
    const shift = (v) => v === 0 ? "" : v < 0 ? " \u2212 " + num(-v) : " + " + num(v);
    switch (c.type) {
      case "afim":
        return sum([
          [c.a, "x"],
          [c.b, ""]
        ]);
      case "quadratica":
        return sum([
          [c.a, "x\xB2"],
          [c.b, "x"],
          [c.c, ""]
        ]);
      case "exponencial":
        return num(c.a) + " \xB7 (" + num(c.b) + ")\u02E3" + shift(c.c);
      case "logistica":
        return num(c.a) + " / [1 + e^(" + num(-c.b) + " \xB7 (x" + shift(-c.c) + "))]" + shift(c.d);
      case "logaritmica":
        return num(c.a) + " \xB7 log[" + num(c.b) + "](x" + shift(-c.c) + ")" + shift(c.d);
      case "modular":
        return sum([
          [c.a, "|x" + shift(-c.b) + "|"],
          [c.c, ""]
        ]);
      case "trigonometrica":
        return sum([
          [c.a, ""],
          [
            c.b,
            trig + "(" + sum([
              [c.c, "x"],
              [c.d, ""]
            ]) + ")"
          ]
        ]);
    }
  }
  function naturalDomain(c) {
    if (c.type === "logaritmica") return `x > ${num(c.c)}`;
    if (c.type === "trigonometrica" && c.trig === "tan") {
      if (c.c === 0)
        return Math.abs(Math.cos(c.d)) < 1e-10 ? "Dom\xEDnio vazio" : "\u211D";
      return "x \u2260 (\u03C0/2 + k\u03C0 \u2212 d)/c, k \u2208 \u2124";
    }
    return "\u211D";
  }
  function period(c) {
    if (c.type !== "trigonometrica" || !c.c || !c.b) return null;
    return (c.trig === "tan" ? Math.PI : 2 * Math.PI) / Math.abs(c.c);
  }
  function familyBreaks(c, lo, hi) {
    if (c.type === "logaritmica") return [c.c];
    if (c.type !== "trigonometrica" || c.trig !== "tan" || !c.c) return [];
    const v = [c.c * lo + c.d, c.c * hi + c.d].sort((a, b) => a - b), out = [];
    for (let k = Math.ceil((v[0] - Math.PI / 2) / Math.PI); k <= Math.floor((v[1] - Math.PI / 2) / Math.PI) && out.length < 300; k++)
      out.push((Math.PI / 2 + k * Math.PI - c.d) / c.c);
    return out.sort((a, b) => a - b);
  }
  function piLabel(x) {
    if (Math.abs(x) < 1e-9) return "0";
    let f = x / Math.PI;
    for (let q of [1, 2, 3, 4, 6, 8, 12]) {
      let p = Math.round(f * q);
      if (Math.abs(f - p / q) < 1e-7) {
        let sign = p < 0 ? "\u2212" : "", n = Math.abs(p);
        return sign + (n === 1 ? "" : n) + "\u03C0" + (q === 1 ? "" : "/" + q);
      }
    }
    return num(x);
  }
  var funcs = {
    sin: Math.sin,
    sen: Math.sin,
    cos: Math.cos,
    tan: (x) => Math.abs(Math.cos(x)) < 1e-10 ? NaN : Math.tan(x),
    tg: (x) => Math.abs(Math.cos(x)) < 1e-10 ? NaN : Math.tan(x),
    sqrt: Math.sqrt,
    raiz: Math.sqrt,
    abs: Math.abs,
    ln: Math.log,
    log: Math.log10,
    exp: Math.exp
  };
  function compileExpression(source, parameters = {}) {
    const parameterNames = ["a", "b", "c", "d"].filter(
      (k) => Object.hasOwn(parameters, k)
    );
    if (typeof source !== "string" || !source.trim())
      throw Error("Digite uma express\xE3o.");
    if (source.length > 240) throw Error("Use at\xE9 240 caracteres por express\xE3o.");
    let text = source.trim().toLowerCase().replace(/^(?:[fghpq]\(x\)|y)\s*=\s*/, "").replaceAll("\u03C0", "pi").replaceAll("\u2212", "-").replaceAll("\xD7", "*").replaceAll("\xB7", "*").replaceAll("\xF7", "/").replaceAll("\xB2", "^2").replaceAll("\xB3", "^3").replace(/(\d),(\d)/g, "$1.$2");
    if (parameterNames.length) text = text.replace(/([abcd])x\b/g, "$1*x");
    let opening = true;
    text = text.replace(/\|/g, () => {
      let t = opening ? "abs(" : ")";
      opening = !opening;
      return t;
    });
    if (!opening) throw Error("Feche o m\xF3dulo com | ou use abs(x).");
    const tokens = [];
    let pos = 0;
    while (pos < text.length) {
      if (/\s/.test(text[pos])) {
        pos++;
        continue;
      }
      const sub = text.slice(pos);
      let m;
      if (m = sub.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/)) {
        tokens.push({ type: "num", v: Number(m[0]) });
        pos += m[0].length;
      } else if (m = sub.match(/^[a-z]+/)) {
        const word = m[0];
        if (!["x", "pi", "e", ...parameterNames, ...Object.keys(funcs)].includes(
          word
        ))
          throw Error(`S\xEDmbolo n\xE3o reconhecido: ${word}.`);
        tokens.push({ type: "name", v: word });
        pos += word.length;
      } else if ("+-*/^()".includes(text[pos]))
        tokens.push({ type: text[pos], v: text[pos++] });
      else throw Error(`Caractere n\xE3o permitido: ${text[pos]}.`);
      if (tokens.length > 180) throw Error("Simplifique a express\xE3o.");
    }
    const expanded = [];
    for (const token of tokens) {
      const prev = expanded.at(-1), ends = prev && (prev.type === "num" || prev.type === ")" || prev.type === "name" && ["x", "pi", "e", ...parameterNames].includes(prev.v)), starts = token.type === "num" || token.type === "name" || token.type === "(";
      if (ends && starts) expanded.push({ type: "*" });
      expanded.push(token);
    }
    let i = 0, depth = 0;
    const peek = () => expanded[i]?.type, take = () => expanded[i++];
    function expr(min = 0) {
      if (++depth > 30) throw Error("Express\xE3o muito aninhada.");
      let t = take(), node;
      if (!t) throw Error("Express\xE3o incompleta.");
      if (t.type === "+" || t.type === "-")
        node = { op: t.type === "-" ? "neg" : "pos", a: expr(25) };
      else if (t.type === "num") node = { op: "num", v: t.v };
      else if (t.type === "name") {
        if (["x", "pi", "e"].includes(t.v)) node = { op: t.v };
        else if (parameterNames.includes(t.v)) node = { op: "parameter", v: t.v };
        else {
          if (peek() !== "(") throw Error(`Use ${t.v}(\u2026).`);
          take();
          node = { op: "call", fn: t.v, a: expr() };
          if (take()?.type !== ")") throw Error("Falta fechar um par\xEAntese.");
        }
      } else if (t.type === "(") {
        node = expr();
        if (take()?.type !== ")") throw Error("Falta fechar um par\xEAntese.");
      } else throw Error("Confira os operadores e par\xEAnteses.");
      while (true) {
        let op = peek(), power = { "+": 10, "-": 10, "*": 20, "/": 20, "^": 30 }[op];
        if (power === void 0 || power < min) break;
        take();
        node = { op, a: node, b: expr(op === "^" ? power : power + 1) };
      }
      depth--;
      return node;
    }
    const ast = expr();
    if (i !== expanded.length)
      throw Error("H\xE1 um par\xEAntese ou operador fora de posi\xE7\xE3o.");
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
  function finiteInput(text) {
    if (/x/i.test(String(text).replace(/exp/gi, "")))
      throw Error("Informe um valor num\xE9rico, sem a vari\xE1vel x.");
    const n = compileExpression(String(text))(0);
    if (!Number.isFinite(n))
      throw Error("Informe um n\xFAmero finito, como 2,5 ou pi/2.");
    return n;
  }
  function sanitizeFunctions(raw) {
    let out = defaultFunctions();
    if (!raw || typeof raw !== "object") return out;
    const finite = (n, f2, min, max) => typeof n === "number" && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : f2;
    if (Array.isArray(raw.curves) && raw.curves.length) {
      out.curves = raw.curves.slice(0, 4).map((c, i) => {
        let type = FAMILIES.some(([v]) => v === c.type) ? c.type : "afim", d = makeCurve(type, i);
        for (const k of ["a", "b", "c", "d"])
          d[k] = finite(c[k], d[k], -1e3, 1e3);
        d.trig = ["sin", "cos", "tan"].includes(c.trig) ? c.trig : "sin";
        d.visible = c.visible !== false;
        d.domain = c.domain === true;
        d.min = finite(c.min, -10, -1e4, 1e4);
        d.max = finite(c.max, 10, -1e4, 1e4);
        d.color = PALETTE.some(([v]) => v === c.color) ? c.color : d.color;
        return d;
      });
    } else if (raw.type) {
      let c = makeCurve(raw.type);
      ["a", "b", "c"].forEach((k) => c[k] = finite(raw[k], c[k], -1e3, 1e3));
      out.curves = [c];
    }
    out.active = Math.round(finite(raw.active, 0, 0, out.curves.length - 1));
    out.mode = raw.mode === "free" ? "free" : "families";
    for (const k of ["xmin", "xmax", "ymin", "ymax"])
      out[k] = finite(raw[k], out[k], -1e4, 1e4);
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
        max: String(c.max ?? "").slice(0, 40)
      };
    };
    if (Array.isArray(raw.comparisons))
      out.comparisons = raw.comparisons.slice(0, 5).map(readExpression);
    if (!out.comparisons.length) out.comparisons = [makeExpression(2)];
    const f = raw.free;
    if (f && typeof f === "object") {
      for (const k of ["xmin", "xmax", "ymin", "ymax"])
        out.free[k] = finite(f[k], out.free[k], -1e4, 1e4);
      for (const k of ["width", "height"])
        out.free[k] = Math.round(
          finite(
            f[k],
            out.free[k],
            k === "width" ? 320 : 240,
            k === "width" ? 2e3 : 1600
          )
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
        out.free.points = f.points.slice(0, 12).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).map((p) => ({
          x: finite(p.x, 0, -1e4, 1e4),
          y: finite(p.y, 0, -1e4, 1e4),
          label: String(p.label || "").slice(0, 24),
          project: p.project !== false
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
  function trigBounds(c) {
    if (c.type !== "trigonometrica" || c.trig === "tan" || familyError(c))
      return null;
    if (!c.b || !c.c) {
      const y = familyValue(c, c.domain ? c.min : 0);
      return { min: y, max: y };
    }
    const full = { min: c.a - Math.abs(c.b), max: c.a + Math.abs(c.b) };
    if (!c.domain || Math.abs(c.c * (c.max - c.min)) >= 2 * Math.PI) return full;
    const [lo, hi] = [c.c * c.min + c.d, c.c * c.max + c.d].sort((a, b) => a - b), shift = c.trig === "cos" ? 0 : Math.PI / 2;
    const values = [familyValue(c, c.min), familyValue(c, c.max)];
    for (let k = Math.ceil((lo - shift) / Math.PI); k <= Math.floor((hi - shift) / Math.PI); k++)
      values.push(c.a + c.b * (k % 2 === 0 ? 1 : -1));
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  // assets/geometry-lab.js
  function mountGeometry(ctx) {
    const {
      $: $2,
      fmt: fmt2,
      range: range2,
      select: select2,
      check: check2,
      metric: metric2,
      shell: shell2,
      common: common2,
      render: render2,
      downloadSVG: downloadSVG2,
      state: state2
    } = ctx, s = state2.geometry, curved = ["cilindro", "cone", "esfera"].includes(s.type), normal = s.view === "solid";
    let controls = `<div class="control-title">Seu s\xF3lido <span>\u25C7</span></div>${select2("shape", "Escolha o s\xF3lido", Object.entries(SOLID_NAMES), s.type)}${select2("camera-view", "Vista do s\xF3lido", [...Object.entries(CAMERA_VIEWS).map(([key, v]) => [key, v.label]), ["custom", "Rota\xE7\xE3o livre"]], s.camera)}<div class="control-section"><h2>Dimens\xF5es \xB7 unidades de comprimento</h2>${range2("dim-a", curved ? "Raio (r)" : s.type === "cubo" ? "Aresta (a)" : "Lado da base (a)", s.a, 0.5, 10, 0.1)}${!["cubo", "esfera"].includes(s.type) ? range2("dim-h", "Altura (h)", s.h, 0.5, 12, 0.1) : ""}${s.type === "prisma" ? range2("dim-b", "Largura da base (b)", s.b, 0.5, 10, 0.1) : ""}</div><div class="control-section"><h2>Explore a estrutura</h2><div class="segmented">${[["solid", "S\xF3lido 3D"], ["net", "Planifica\xE7\xE3o"], ["exploded", "Vista explodida"], ...curved ? [["revolution", "Revolu\xE7\xE3o"]] : []].map(([v, l]) => `<button data-view="${v}" aria-pressed="${s.view === v}" ${s.type === "esfera" && ["net", "exploded"].includes(v) ? 'disabled title="A esfera n\xE3o tem planifica\xE7\xE3o plana exata"' : ""} class="${s.view === v ? "selected" : ""}">${l}</button>`).join("")}</div>${s.view === "net" ? `<div class="dynamic-control">${range2("opening", "Abertura da planifica\xE7\xE3o", s.opening, 0, 100, 1, "%")}<div class="range-ends"><span>Fechado</span><span>Aberto</span></div><p class="small">Arraste o controle para abrir e fechar o s\xF3lido. As dimens\xF5es das faces s\xE3o preservadas.</p></div>` : ""}${s.type === "esfera" ? '<p class="small">A esfera n\xE3o admite planifica\xE7\xE3o exata sem deforma\xE7\xE3o.</p>' : ""}</div>`;
    if (s.view === "revolution")
      controls += `<div class="control-section"><h2>Gerar por revolu\xE7\xE3o</h2>${select2(
        "rotation-axis",
        "Eixo de rota\xE7\xE3o",
        [
          ["y", "Eixo y"],
          ["x", "Eixo x"]
        ],
        s.axis
      )}${range2("sweep", "\xC2ngulo de rota\xE7\xE3o", s.revolution, 0, 360, 1, "\xB0")}<div class="inline-actions"><button id="sweep-zero">Figura plana</button><button id="sweep-full">Volta completa</button></div><p class="small">${s.type === "cilindro" ? "Um ret\xE2ngulo gira em torno de um de seus lados." : s.type === "cone" ? "Um tri\xE2ngulo ret\xE2ngulo gira em torno de um de seus catetos." : "Um semic\xEDrculo gira em torno de seu di\xE2metro."} A figura geradora aparece em laranja.</p></div>`;
    if (s.type === "esfera" && normal)
      controls += `<div class="control-section"><h2>Partes da esfera</h2>${select2(
        "sphere-part",
        "Objeto de estudo",
        [
          ["whole", "Esfera completa"],
          ["cap", "Calota esf\xE9rica"],
          ["wedge", "Cunha esf\xE9rica"]
        ],
        s.part
      )}${s.part === "cap" ? range2("cap-height", "Altura da calota (h)", s.capHeight, 0.05, 2 * s.a, 0.05) : s.part === "wedge" ? range2("wedge-angle", "\xC2ngulo da cunha (\u03B8)", s.wedge, 1, 360, 1, "\xB0") : ""}</div>`;
    controls += `<div class="control-section"><h2>Elementos vis\xEDveis</h2>${check2("faces", curved ? "Superf\xEDcies" : "Faces", s.faces)}${!curved ? check2("edges", "Arestas", s.edges) + check2("vertices", "V\xE9rtices", s.vertices) : ""}${normal ? check2("measure", "Medidas", s.measure) : ""}${normal && ["cone", "cilindro", "piramide"].includes(s.type) ? check2("guide", s.type === "piramide" ? "Ap\xF3tema lateral (\u2113)" : "Geratriz (g)", s.guide) : ""}</div>`;
    if (s.type === "piramide" && normal)
      controls += `<div class="control-section"><h2>Constru\xE7\xF5es auxiliares</h2>${check2("diagonal", "Diagonal da base", s.diagonal)}${check2("triangleApothem", "Tri\xE2ngulo do ap\xF3tema lateral", s.triangleApothem)}${check2("triangleEdge", "Tri\xE2ngulo da aresta lateral", s.triangleEdge)}<p class="small">Os dois tri\xE2ngulos t\xEAm \xE2ngulo reto no centro da base.</p></div>`;
    $2("#main").innerHTML = shell2(
      "Geometria espacial",
      "Abra, construa e investigue os s\xF3lidos em movimento.",
      controls,
      `<div class="stage-top"><strong id="solid-name"></strong><span class="pill">${s.view === "net" ? "PLANIFICA\xC7\xC3O DIN\xC2MICA" : s.view === "revolution" ? "S\xD3LIDO DE REVOLU\xC7\xC3O" : "LABORAT\xD3RIO INTERATIVO"}</span></div><div class="stage geometry-stage"><span class="view-label" id="view-label"></span><svg id="solid" viewBox="0 0 800 500" role="img" aria-label="S\xF3lido geom\xE9trico" tabindex="0"></svg><span class="stage-note">Arraste para girar \xB7 Role para dar zoom</span><div class="stage-tools"><button id="zoom-out" aria-label="Diminuir s\xF3lido">\u2212</button><button id="camera-reset" aria-label="Restaurar c\xE2mera">\u21BA</button><button id="zoom-in" aria-label="Ampliar s\xF3lido">+</button><button id="export" aria-label="Baixar figura SVG">\u2193</button></div></div><div class="metrics" id="solid-metrics"></div><div class="formula-panel" id="solid-formulas"></div>`
    );
    $2("#lab-controls").classList.add("extended-controls");
    const bind = (id, key, suffix = "", after) => {
      const el2 = $2("#" + id);
      if (!el2) return;
      el2.oninput = (e) => {
        s[key] = +e.target.value;
        $2("#" + id + "-out").textContent = fmt2(s[key]) + suffix;
        if (after) after();
        draw();
      };
    };
    $2("#camera-view").onchange = (e) => {
      const view = e.target.value;
      if (view === "custom") Object.assign(s, cameraAngles(s));
      else
        Object.assign(s, {
          rx: CAMERA_VIEWS[view].rx,
          ry: CAMERA_VIEWS[view].ry
        });
      s.camera = view;
      draw();
    };
    function freeCamera() {
      if (s.camera === "custom") return;
      Object.assign(s, cameraAngles(s));
      s.camera = "custom";
      $2("#camera-view").value = "custom";
    }
    $2("#shape").onchange = (e) => {
      s.type = e.target.value;
      s.view = "solid";
      s.opening = 0;
      s.capHeight = Math.min(s.capHeight, 2 * s.a);
      render2();
    };
    bind("dim-a", "a", "", () => {
      s.capHeight = Math.min(s.capHeight, 2 * s.a);
      if ($2("#cap-height")) {
        $2("#cap-height").max = 2 * s.a;
        $2("#cap-height").value = s.capHeight;
        $2("#cap-height-out").textContent = fmt2(s.capHeight);
      }
    });
    bind("dim-h", "h");
    bind("dim-b", "b");
    bind("opening", "opening", "%");
    bind("sweep", "revolution", "\xB0");
    bind("cap-height", "capHeight");
    bind("wedge-angle", "wedge", "\xB0");
    for (const k of [
      "faces",
      "edges",
      "vertices",
      "measure",
      "guide",
      "diagonal",
      "triangleApothem",
      "triangleEdge"
    ])
      if ($2("#" + k))
        $2("#" + k).onchange = (e) => {
          s[k] = e.target.checked;
          draw();
        };
    document.querySelectorAll("[data-view]").forEach(
      (el2) => el2.onclick = () => {
        s.view = el2.dataset.view;
        render2();
      }
    );
    if ($2("#sphere-part"))
      $2("#sphere-part").onchange = (e) => {
        s.part = e.target.value;
        render2();
      };
    if ($2("#rotation-axis"))
      $2("#rotation-axis").onchange = (e) => {
        s.axis = e.target.value;
        draw();
      };
    for (const [id, v] of [
      ["sweep-zero", 0],
      ["sweep-full", 360]
    ])
      if ($2("#" + id))
        $2("#" + id).onclick = () => {
          s.revolution = v;
          $2("#sweep").value = v;
          $2("#sweep-out").textContent = v + "\xB0";
          draw();
        };
    $2("#zoom-out").onclick = () => {
      s.zoom = Math.max(0.4, s.zoom - 0.15);
      draw();
    };
    $2("#zoom-in").onclick = () => {
      s.zoom = Math.min(2, s.zoom + 0.15);
      draw();
    };
    $2("#camera-reset").onclick = () => {
      s.camera = "perspective";
      $2("#camera-view").value = "perspective";
      s.rx = 0.38;
      s.ry = 0.56;
      s.zoom = 1;
      draw();
    };
    $2("#export").onclick = () => downloadSVG2("solid", "geometria-" + s.type);
    const el = $2("#solid");
    const wheelZoom = (e) => {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      s.zoom = Math.max(
        0.4,
        Math.min(
          2,
          s.zoom * Math.exp(Math.max(-0.5, Math.min(0.5, -delta * 2e-3)))
        )
      );
      draw();
    };
    el.addEventListener("wheel", wheelZoom, { passive: false });
    let pointer = null;
    el.onpointerdown = (e) => {
      pointer = [e.clientX, e.clientY];
      el.setPointerCapture(e.pointerId);
    };
    el.onpointermove = (e) => {
      if (!pointer) return;
      freeCamera();
      s.ry += (e.clientX - pointer[0]) * 9e-3;
      s.rx = Math.max(
        -Math.PI,
        Math.min(Math.PI, s.rx + (e.clientY - pointer[1]) * 9e-3)
      );
      pointer = [e.clientX, e.clientY];
      draw();
    };
    el.onpointerup = el.onpointercancel = () => pointer = null;
    el.onkeydown = (e) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        return;
      e.preventDefault();
      freeCamera();
      s.rx += e.key === "ArrowUp" ? -0.12 : e.key === "ArrowDown" ? 0.12 : 0;
      s.ry += e.key === "ArrowLeft" ? -0.12 : e.key === "ArrowRight" ? 0.12 : 0;
      draw();
    };
    function draw() {
      const m = solidMetrics(s.type, s.a, s.h, s.b), cap = capMetrics(s.a, s.capHeight), wedge = wedgeMetrics(s.a, s.wedge);
      $2("#solid-name").textContent = SOLID_NAMES[s.type] + (s.type === "esfera" && normal && s.part !== "whole" ? " \xB7 " + (s.part === "cap" ? "calota" : "cunha") : "");
      $2("#view-label").textContent = s.view === "net" ? `Abertura ${fmt2(s.opening, 0)}% \xB7 faces em escala` : s.view === "revolution" ? `Rota\xE7\xE3o de ${fmt2(s.revolution, 0)}\xB0 em torno do eixo ${s.axis}` : s.view === "exploded" ? "Partes afastadas para observa\xE7\xE3o" : "Proje\xE7\xE3o ortogr\xE1fica";
      const viewName = CAMERA_VIEWS[s.camera]?.label || "Rota\xE7\xE3o livre";
      $2("#view-label").textContent = viewName + " \xB7 " + $2("#view-label").textContent;
      let detail = `<span class="formula">A = ${m.formulaA} &nbsp; \xB7 &nbsp; V = ${m.formulaV}</span><p>u.a.: unidades de \xE1rea \xB7 u.v.: unidades de volume.</p>`;
      if (s.view === "revolution") {
        $2("#solid-metrics").innerHTML = metric2("\xC1rea do s\xF3lido completo", fmt2(m.area) + " u.a.") + metric2(
          "Volume varrido",
          fmt2(m.volume * s.revolution / 360) + " u.v."
        ) + metric2("Fra\xE7\xE3o da volta", fmt2(s.revolution / 360 * 100) + "%");
        detail += `<p>Ao completar 360\xB0, V = ${fmt2(m.volume)} u.v. O controle mostra a regi\xE3o varrida pela figura geradora.</p>`;
      } else if (s.type === "esfera" && s.part === "cap") {
        $2("#solid-metrics").innerHTML = metric2(
          "\xC1rea da calota",
          fmt2(cap.curved) + " u.a.",
          "Superf\xEDcie curva: 2\u03C0rh"
        ) + metric2(
          "Volume do segmento",
          fmt2(cap.volume) + " u.v.",
          "\u03C0h\xB2(r \u2212 h/3)"
        ) + metric2("\xC1rea da base circular", fmt2(cap.base) + " u.a.", "\u03C0(2rh \u2212 h\xB2)");
        detail = `<span class="formula">A<sub>calota</sub> = 2\u03C0rh &nbsp; \xB7 &nbsp; V = \u03C0h\xB2(r \u2212 h/3)</span><p>Altura h = ${fmt2(s.capHeight)}; raio da base \u03C1 = \u221A(2rh \u2212 h\xB2) = ${fmt2(cap.baseRadius)}. \xC1rea total do segmento fechado: ${fmt2(cap.total)} u.a. A calota \xE9 a superf\xEDcie curva; o volume corresponde ao segmento esf\xE9rico.</p>`;
      } else if (s.type === "esfera" && s.part === "wedge") {
        $2("#solid-metrics").innerHTML = metric2("\xC1rea curva do fuso", fmt2(wedge.curved) + " u.a.") + metric2("Volume da cunha", fmt2(wedge.volume) + " u.v.") + metric2(
          "\xC1rea total da cunha",
          fmt2(wedge.total) + " u.a.",
          "Inclui os cortes planos"
        );
        detail = `<span class="formula">V = (\u03B8 / 360\xB0) \xB7 4\u03C0r\xB3/3</span><p>A<sub>curva</sub> = (\u03B8 / 360\xB0) \xB7 4\u03C0r\xB2. Para 0\xB0 &lt; \u03B8 &lt; 360\xB0, os dois semic\xEDrculos dos cortes somam \u03C0r\xB2. Em 360\xB0, n\xE3o h\xE1 cortes.</p>`;
      } else {
        $2("#solid-metrics").innerHTML = metric2("\xC1rea total", fmt2(m.area) + " u.a.") + metric2("Volume", fmt2(m.volume) + " u.v.") + metric2(
          m.vertices !== null ? "V\xE9rtices \xB7 arestas \xB7 faces" : "Superf\xEDcies",
          m.vertices !== null ? `${m.vertices} \xB7 ${m.edges} \xB7 ${m.faces}` : s.type === "esfera" ? "1 curva" : s.type === "cone" ? "1 plana + 1 curva" : "2 planas + 1 curva"
        );
        if (m.g)
          detail += `<p>${s.type === "piramide" ? "Ap\xF3tema lateral \u2113" : "Geratriz g"} = ${fmt2(m.g)}. ${s.type === "cone" ? "g\xB2 = r\xB2 + h\xB2." : s.type === "piramide" ? "\u2113\xB2 = h\xB2 + (a/2)\xB2." : ""}</p>`;
      }
      if (s.type === "piramide" && normal) {
        if (s.diagonal)
          detail += `<p><strong>Diagonal:</strong> d = a\u221A2 = ${fmt2(s.a * Math.SQRT2)}.</p>`;
        if (s.triangleApothem)
          detail += `<p class="blue-note"><strong>Tri\xE2ngulo do ap\xF3tema:</strong> \u2113\xB2 = h\xB2 + (a/2)\xB2 = ${fmt2(s.h * s.h)} + ${fmt2((s.a / 2) ** 2)}; \u2113 = ${fmt2(Math.hypot(s.h, s.a / 2))}.</p>`;
        if (s.triangleEdge)
          detail += `<p class="purple-note"><strong>Tri\xE2ngulo da aresta:</strong> e\xB2 = h\xB2 + (d/2)\xB2 = ${fmt2(s.h * s.h)} + ${fmt2(s.a * s.a / 2)}; e = ${fmt2(Math.hypot(s.h, s.a / Math.SQRT2))}.</p>`;
      }
      $2("#solid-formulas").innerHTML = detail;
      $2("#solid").setAttribute(
        "aria-label",
        `${$2("#solid-name").textContent}. ${$2("#solid-metrics").textContent}. ${$2("#view-label").textContent}.`
      );
      renderScene(s, $2("#solid"), fmt2);
    }
    draw();
    common2();
    return () => el.removeEventListener("wheel", wheelZoom);
  }
  function renderScene(s, svg, fmt2) {
    let { faces, poly } = solidScene(s), { rx, ry } = cameraAngles(s), frame = faces.flatMap((f) => f.points), annotations = [];
    const curved = ["cilindro", "cone", "esfera"].includes(s.type), H = s.type === "cubo" ? s.a : s.h;
    if (s.view === "net") {
      let open = s.type === "piramide" ? pyramidNet(s.a, s.h, 1) : s.type === "cilindro" ? cylinderNet(s.a, s.h, 1) : s.type === "cone" ? coneNet(s.a, s.h, 1) : cuboidNet(s.a, H, s.type === "cubo" ? s.a : s.b, 1);
      frame = frame.concat(open.flatMap((f) => f.points));
    }
    const line = (p, q, label, color = "#8a4b24", dash = false, dx = 10, dy = -10) => annotations.push({ kind: "line", p, q, label, color, dash, dx, dy });
    const tri = (points, color) => annotations.push({ kind: "triangle", points, color });
    if (s.view === "revolution") {
      const profile = revolutionProfile(s.type, s.a, s.h), points = profile.map(
        (p) => revolvePoint(p, s.revolution * Math.PI / 180, s.axis)
      );
      annotations.push({ kind: "profile", points, color: "#c27719" });
      frame = frame.concat(
        points,
        profile.map((p) => revolvePoint(p, Math.PI / 2, s.axis)),
        profile.map((p) => revolvePoint(p, Math.PI, s.axis))
      );
      const len = s.type === "esfera" ? s.a * 1.35 : s.h / 2 + 1.5;
      line(
        s.axis === "y" ? [0, -len, 0] : [-len, 0, 0],
        s.axis === "y" ? [0, len, 0] : [len, 0, 0],
        "eixo " + s.axis,
        "#725282",
        true
      );
    }
    if (s.view === "solid" && s.measure) {
      if (!curved) {
        let y = -H / 2, z = (s.type === "prisma" ? s.b : s.a) / 2;
        line(
          [-s.a / 2, y, z],
          [s.a / 2, y, z],
          `a = ${fmt2(s.a)}`,
          "#8a4b24",
          false,
          10,
          s.type === "piramide" ? 38 : -10
        );
        if (s.type === "prisma")
          line(
            [s.a / 2, y, -s.b / 2],
            [s.a / 2, y, s.b / 2],
            `b = ${fmt2(s.b)}`,
            "#285d85"
          );
        if (s.type !== "cubo" && !(s.type === "piramide" && (s.triangleApothem || s.triangleEdge)))
          line([0, -H / 2, 0], [0, H / 2, 0], `h = ${fmt2(H)}`, "#7452a1", true);
      } else if (s.type === "esfera") {
        line([0, 0, 0], [s.a, 0, 0], `r = ${fmt2(s.a)}`);
        if (s.part === "cap")
          line(
            [0, s.a - s.capHeight, 0],
            [0, s.a, 0],
            `h = ${fmt2(s.capHeight)}`,
            "#7452a1",
            true
          );
      } else {
        line([0, -s.h / 2, 0], [s.a, -s.h / 2, 0], `r = ${fmt2(s.a)}`);
        line(
          [0, -s.h / 2, 0],
          [0, s.h / 2, 0],
          `h = ${fmt2(s.h)}`,
          "#7452a1",
          true
        );
      }
    }
    if (s.view === "solid" && s.guide && !(s.type === "piramide" && s.triangleApothem) && ["piramide", "cone", "cilindro"].includes(s.type)) {
      const p = s.type === "piramide" ? [0, -s.h / 2, s.a / 2] : [s.a, -s.h / 2, 0], q = s.type === "cilindro" ? [s.a, s.h / 2, 0] : [0, s.h / 2, 0];
      line(
        p,
        q,
        `${s.type === "piramide" ? "\u2113" : "g"} = ${fmt2(s.type === "cilindro" ? s.h : Math.hypot(s.h, s.type === "piramide" ? s.a / 2 : s.a))}`
      );
    }
    if (s.type === "piramide" && s.view === "solid") {
      const O = [0, -s.h / 2, 0], S = [0, s.h / 2, 0], M = [0, -s.h / 2, s.a / 2], C = [s.a / 2, -s.h / 2, s.a / 2];
      if (s.diagonal)
        line(
          [-s.a / 2, -s.h / 2, -s.a / 2],
          C,
          `d = ${fmt2(s.a * Math.SQRT2)}`,
          "#a0593a",
          true,
          -110,
          10
        );
      for (const [enabled, P, color, label] of [
        [s.triangleApothem, M, "#246d9c", "\u2113"],
        [s.triangleEdge, C, "#8551a4", "e"]
      ])
        if (enabled) {
          tri([O, P, S], color);
          if (label === "\u2113" || !s.triangleApothem)
            line(O, S, `h = ${fmt2(s.h)}`, color, false, -53, -10);
          line(
            O,
            P,
            (label === "\u2113" ? "a/2" : "d/2") + " = " + fmt2(norm(add(P, scale(O, -1)))),
            color,
            false,
            label === "\u2113" ? -63 : 25,
            label === "\u2113" ? 24 : 8
          );
          line(
            P,
            S,
            `${label} = ${fmt2(norm(add(P, scale(S, -1))))}`,
            color,
            false,
            label === "\u2113" ? -80 : 25,
            -10
          );
          let eps = Math.min(s.a, s.h) * 0.12, dir = scale(add(P, scale(O, -1)), eps / norm(add(P, scale(O, -1))));
          annotations.push({
            kind: "right",
            points: [
              add(O, [0, eps, 0]),
              add(add(O, dir), [0, eps, 0]),
              add(O, dir)
            ],
            color
          });
        }
    }
    frame = frame.concat(annotations.flatMap((a) => a.points || [a.p, a.q]));
    if (!frame.length)
      frame = [
        [0, 0, 0],
        [1, 1, 1]
      ];
    const rotation = ([x, y, z]) => {
      let u = x * Math.cos(ry) + z * Math.sin(ry), v = -x * Math.sin(ry) + z * Math.cos(ry);
      return [
        u,
        y * Math.cos(rx) - v * Math.sin(rx),
        y * Math.sin(rx) + v * Math.cos(rx)
      ];
    };
    let bounds = frame.map(rotation), mins = [0, 1].map((k) => Math.min(...bounds.map((p) => p[k]))), maxs = [0, 1].map((k) => Math.max(...bounds.map((p) => p[k]))), cx = (mins[0] + maxs[0]) / 2, cy = (mins[1] + maxs[1]) / 2, factor = Math.min(
      49,
      620 / Math.max(1, maxs[0] - mins[0]),
      340 / Math.max(1, maxs[1] - mins[1])
    ) * s.zoom, proj = (p) => {
      let [x, y] = rotation(p);
      return [400 + (x - cx) * factor, 240 - (y - cy) * factor];
    }, pts = (points) => points.map(proj).map((p) => p.map((v) => v.toFixed(2)).join(",")).join(" ");
    let ordered = faces.map((f) => ({
      ...f,
      z: f.points.reduce(
        (sum, p) => sum + rotation(p)[2] / f.points.length,
        0
      )
    })).sort((a, b) => a.z - b.z), html = "";
    for (const f of ordered) {
      let fill = f.smooth ? `hsl(94 25% ${Math.max(48, Math.min(82, 68 + f.z * 2))}%)` : f.color, stroke = s.faces ? f.smooth ? fill : poly && !s.edges ? "none" : "#55744f" : "#6a8364";
      html += `<polygon points="${pts(f.points)}" fill="${s.faces ? fill : "none"}" stroke="${stroke}" stroke-width="${f.smooth ? 0.45 : 1.4}" stroke-linejoin="round"/>`;
      if (poly && s.vertices)
        for (const p of f.points) {
          const [x, y] = proj(p);
          html += `<circle cx="${x}" cy="${y}" r="4" fill="#7557a4" stroke="white"/>`;
        }
    }
    for (const a of annotations) {
      if (["triangle", "profile"].includes(a.kind))
        html += `<polygon points="${pts(a.points)}" fill="${a.color}" fill-opacity="${a.kind === "profile" ? 0.35 : 0.22}" stroke="${a.color}" stroke-width="2.3"/>`;
      else if (a.kind === "right")
        html += `<polyline points="${pts(a.points)}" fill="none" stroke="${a.color}" stroke-width="2"/>`;
      else {
        const [x, y] = proj(a.p), [u, v] = proj(a.q);
        if (Math.hypot(u - x, v - y) < 3) continue;
        html += `<path d="M${x} ${y}L${u} ${v}" fill="none" stroke="${a.color}" stroke-width="2.2" ${a.dash ? 'stroke-dasharray="6 5"' : ""}/><text x="${(x + u) / 2 + a.dx}" y="${(y + v) / 2 + a.dy}" font-family="sans-serif" font-size="17" fill="${a.color}" stroke="#fcfdf9" stroke-width="4" paint-order="stroke">${a.label}</text>`;
      }
    }
    svg.innerHTML = html;
  }

  // assets/plot-utils.js
  function cmToPixels(cm, dpi = 96) {
    return Math.round(cm * dpi / 2.54);
  }
  function zoomWindow(view, factor, anchorX = (view.xmin + view.xmax) / 2, anchorY = (view.ymin + view.ymax) / 2) {
    const sx = view.xmax - view.xmin, sy = view.ymax - view.ymin;
    factor = Math.max(
      1e-4 / Math.min(sx, sy),
      Math.min(2e4 / Math.max(sx, sy), factor)
    );
    const axis = (lo, hi, anchor) => {
      let a = anchor + (lo - anchor) * factor, b = anchor + (hi - anchor) * factor;
      if (a < -1e4) {
        b += -1e4 - a;
        a = -1e4;
      }
      if (b > 1e4) {
        a -= b - 1e4;
        b = 1e4;
      }
      return [a, b];
    };
    const [xmin, xmax] = axis(view.xmin, view.xmax, anchorX), [ymin, ymax] = axis(view.ymin, view.ymax, anchorY);
    return { xmin, xmax, ymin, ymax };
  }
  function crc32(bytes) {
    let crc = 4294967295;
    for (const byte of bytes) {
      crc ^= byte;
      for (let k = 0; k < 8; k++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
    }
    return (crc ^ 4294967295) >>> 0;
  }
  function pngWithDpi(bytes, dpi = 300) {
    const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (input.length < 33 || input[0] !== 137 || input[1] !== 80)
      throw Error("PNG inv\xE1lido.");
    const chunk = new Uint8Array(21), v = new DataView(chunk.buffer);
    v.setUint32(0, 9);
    chunk.set([112, 72, 89, 115], 4);
    const ppm = Math.round(dpi / 0.0254);
    v.setUint32(8, ppm);
    v.setUint32(12, ppm);
    chunk[16] = 1;
    v.setUint32(17, crc32(chunk.slice(4, 17)));
    const parts = [input.slice(0, 33), chunk];
    let offset = 33;
    while (offset + 12 <= input.length) {
      const len = new DataView(
        input.buffer,
        input.byteOffset + offset,
        4
      ).getUint32(0), end = offset + 12 + len;
      if (end > input.length) throw Error("PNG incompleto.");
      if (String.fromCharCode(...input.slice(offset + 4, offset + 8)) !== "pHYs")
        parts.push(input.slice(offset, end));
      offset = end;
    }
    const out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
    let pos = 0;
    for (const p of parts) {
      out.set(p, pos);
      pos += p.length;
    }
    return out;
  }

  // assets/plot.js
  var xml = (s) => String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
  var decimal = (n, d = 3) => Number.isFinite(n) ? Number(n.toFixed(d)).toLocaleString("pt-BR", {
    maximumFractionDigits: d,
    useGrouping: false
  }) : "indefinido";
  function niceStep(span, space) {
    const raw = span / space, p = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 2.5, 5, 10].map((x) => x * p).find((x) => x >= raw) || 10 * p;
  }
  function graphGeometry(o) {
    const w = o.width || 900, h = o.height || 530, font = o.professional ? 14.6667 : 15, left = o.professional ? 44 : 52, right = o.professional ? 25 : 28, legendCount = o.legend ? o.curves.filter((c) => c.showEquation !== false).length : 0, legendStep = legendCount ? Math.min(20, (h * 0.4 - 20) / legendCount) : 20, top = legendCount ? Math.max(36, 20 + legendCount * legendStep) : 28, bottom = o.professional ? 34 : 38, W = w - left - right, H = h - top - bottom, X = (x) => left + (x - o.xmin) / (o.xmax - o.xmin) * W, Y = (y) => top + (o.ymax - y) / (o.ymax - o.ymin) * H;
    return {
      w,
      h,
      font,
      legendStep,
      left,
      right,
      top,
      bottom,
      W,
      H,
      X,
      Y,
      fromX: (v) => o.xmin + (v - left) / W * (o.xmax - o.xmin),
      fromY: (v) => o.ymax - (v - top) / H * (o.ymax - o.ymin)
    };
  }
  function curvePath(fn, o, breaks = []) {
    const g = graphGeometry(o), { X, Y } = g, span = o.xmax - o.xmin, height = o.ymax - o.ymin;
    let d = "", last = null;
    const valid = (p) => Number.isFinite(p.y) && Math.abs(p.y) < 1e100, inside = (p) => valid(p) && p.y >= o.ymin - height * 0.25 && p.y <= o.ymax + height * 0.25;
    const emit = (p, q) => {
      if (!valid(p) || !valid(q)) {
        last = null;
        return;
      }
      if (!inside(p) && !inside(q) && Math.sign(p.y - (o.ymax + o.ymin) / 2) === Math.sign(q.y - (o.ymax + o.ymin) / 2)) {
        last = null;
        return;
      }
      if (Math.abs(Y(p.y)) > 1e7 || Math.abs(Y(q.y)) > 1e7) {
        last = null;
        return;
      }
      if (!last || Math.abs(last.x - p.x) > span * 1e-8 || Math.abs(last.y - p.y) > height * 1e-8)
        d += `M${X(p.x).toFixed(2)},${Y(p.y).toFixed(2)}`;
      d += `L${X(q.x).toFixed(2)},${Y(q.y).toFixed(2)}`;
      last = q;
    };
    function segment(p, q, depth = 0) {
      const x = (p.x + q.x) / 2, m = { x, y: fn(x) }, all = valid(p) && valid(q) && valid(m), curvature = all ? Math.abs(Y(m.y) - (Y(p.y) + Y(q.y)) / 2) : Infinity, range2 = all ? Math.max(
        Math.abs(p.y - q.y),
        Math.abs(p.y - m.y),
        Math.abs(q.y - m.y)
      ) : Infinity;
      if (depth < 9 && (!all || curvature > 1.4 || range2 > height * 0.7)) {
        if (!valid(p) && !valid(q) && !valid(m)) {
          last = null;
          return;
        }
        segment(p, m, depth + 1);
        segment(m, q, depth + 1);
        return;
      }
      if (!all || curvature > 40 || range2 > height * 4) {
        last = null;
        return;
      }
      emit(p, q);
    }
    const cuts = [
      o.xmin,
      ...breaks.filter((x) => x > o.xmin && x < o.xmax),
      o.xmax
    ];
    for (let k = 0; k < cuts.length - 1; k++) {
      last = null;
      const eps = span * 1e-8, lo = cuts[k] + (k ? eps : 0), hi = cuts[k + 1] - (k < cuts.length - 2 ? eps : 0), n = Math.max(4, Math.ceil(450 * (hi - lo) / span));
      let p = { x: lo, y: fn(lo) };
      for (let i = 1; i <= n; i++) {
        let x = lo + (hi - lo) * i / n, q = { x, y: fn(x) };
        segment(p, q);
        p = q;
      }
    }
    return d;
  }
  function buildGraph(o) {
    const g = graphGeometry(o), { w, h, left, right, top, bottom, W, H, X, Y, font } = g, ink = o.professional ? "#111111" : "#4f5d59", grid = o.professional ? "#dedede" : "#edf0ed", family = o.professional ? "Calibri,Arial,sans-serif" : "DM Sans,Arial,sans-serif", xAxis = Math.max(top, Math.min(h - bottom, Y(0))), yAxis = Math.max(left, Math.min(w - right, X(0)));
    let xstep;
    if (o.radians) {
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
        2048 * Math.PI
      ];
      xstep = steps.find((s) => s >= (o.xmax - o.xmin) / (W / 78)) || 4096 * Math.PI;
    } else xstep = niceStep(o.xmax - o.xmin, Math.max(3, W / 75));
    const ystep = niceStep(o.ymax - o.ymin, Math.max(3, H / 58)), id = "graph-clip";
    let html = `<defs><clipPath id="${id}"><rect x="${left}" y="${top}" width="${W}" height="${H}"/></clipPath><marker id="axis-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L7 3L0 6" fill="none" stroke="${ink}" stroke-width="1.05"/></marker></defs><g font-family="${family}" font-size="${font}" fill="${ink}">`;
    if (o.legend)
      o.curves.filter((c) => c.showEquation !== false).forEach((c, i) => {
        html += `<line x1="${left}" x2="${left + 23}" y1="${19 + i * g.legendStep}" y2="${19 + i * g.legendStep}" stroke="${c.color}" stroke-width="1.6"/><text x="${left + 33}" y="${24 + i * g.legendStep}" font-size="${Math.min(font, g.legendStep - 2)}">${xml(c.label)}</text>`;
      });
    for (let i = Math.ceil(o.xmin / xstep); i <= Math.floor(o.xmax / xstep) && i - Math.ceil(o.xmin / xstep) < 80; i++) {
      const x = i * xstep, u = X(x);
      if (o.grid)
        html += `<path d="M${u} ${top}V${h - bottom}" stroke="${grid}" stroke-width=".8"/>`;
      html += `<path d="M${u} ${xAxis - 4}v8" stroke="${ink}"/>`;
      if (Math.abs(x) > xstep * 1e-6)
        html += `<text x="${u}" y="${xAxis + font + 7 > h - 8 ? xAxis - 9 : xAxis + font + 7}" text-anchor="middle">${xml(o.radians ? piLabel(x) : decimal(x, 4))}</text>`;
    }
    for (let i = Math.ceil(o.ymin / ystep); i <= Math.floor(o.ymax / ystep) && i - Math.ceil(o.ymin / ystep) < 80; i++) {
      const y = i * ystep, v = Y(y);
      if (o.grid)
        html += `<path d="M${left} ${v}H${w - right}" stroke="${grid}" stroke-width=".8"/>`;
      html += `<path d="M${yAxis - 4} ${v}h8" stroke="${ink}"/>`;
      if (Math.abs(y) > ystep * 1e-6)
        html += `<text x="${yAxis - 10}" y="${v + font * 0.32}" text-anchor="end">${xml(decimal(y, 4))}</text>`;
    }
    html += `<path d="M${left} ${xAxis}H${w - right + 8}" stroke="${ink}" stroke-width="1.05" marker-end="url(#axis-arrow)"/><path d="M${yAxis} ${h - bottom}V${top - 8}" stroke="${ink}" stroke-width="1.05" marker-end="url(#axis-arrow)"/>`;
    if (o.xmin <= 0 && o.xmax >= 0 && o.ymin <= 0 && o.ymax >= 0)
      html += `<text x="${yAxis - 10}" y="${xAxis + font + 7}" text-anchor="end">0</text>`;
    html += `<text x="${w - right + 9}" y="${xAxis - 12}" text-anchor="end" font-style="normal" font-weight="${o.axesBold ? 700 : 400}">${xml(o.xlabel || "")}</text><text x="${yAxis + 13}" y="${top - 9}" font-style="normal" font-weight="${o.axesBold ? 700 : 400}">${xml(o.ylabel || "")}</text><g clip-path="url(#${id})">`;
    for (const guide2 of o.guides || []) {
      if (guide2.axis === "x" && guide2.value >= o.xmin && guide2.value <= o.xmax) {
        let x = X(guide2.value);
        html += `<path d="M${x} ${top}V${h - bottom}" stroke="${guide2.color || "#857294"}" stroke-dasharray="7 6" stroke-width="1.2"/>`;
      } else if (guide2.axis === "y" && guide2.value >= o.ymin && guide2.value <= o.ymax) {
        let y = Y(guide2.value);
        html += `<path d="M${left} ${y}H${w - right}" stroke="${guide2.color || "#857294"}" stroke-dasharray="7 6" stroke-width="1.2"/><text x="${w - right - 7}" y="${y - 7}" text-anchor="end" font-size="13">${xml(guide2.label || decimal(guide2.value))}</text>`;
      }
    }
    for (const c of o.curves)
      if (c.fn)
        html += `<path d="${curvePath(c.fn, o, c.breaks || [])}" fill="none" stroke="${c.color}" stroke-width="${o.professional ? 1.35 : 1.8}" stroke-linejoin="round" stroke-linecap="round"><title>${xml(c.label)}</title></path>`;
    for (const p of o.points || []) {
      if (p.x < o.xmin || p.x > o.xmax || p.y < o.ymin || p.y > o.ymax) continue;
      const x = X(p.x), y = Y(p.y);
      if (p.project)
        html += `<path d="M${yAxis} ${y}H${x}V${xAxis}" fill="none" stroke="${ink}" stroke-dasharray="5 4" stroke-width="1"/>`;
      html += `<circle cx="${x}" cy="${y}" r="3" fill="${ink}"/><text x="${Math.min(w - right - 6, Math.max(left + 6, x + 10))}" y="${Math.max(top + font, y - 12)}" text-anchor="${x > w - right - 120 ? "end" : "start"}">${xml(p.label || `(${o.radians ? piLabel(p.x) : decimal(p.x)}; ${decimal(p.y)})`)}</text>`;
    }
    html += '</g><g id="graph-trace" aria-hidden="true"></g></g>';
    return {
      inner: html,
      geometry: g,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${o.widthCm ? o.widthCm + "cm" : w}" height="${o.heightCm ? o.heightCm + "cm" : h}" viewBox="0 0 ${w} ${h}">${html.replace('<g id="graph-trace" aria-hidden="true"></g>', "")}</svg>`
    };
  }
  function drawGraph(element, o) {
    const result = buildGraph(o);
    element.setAttribute(
      "viewBox",
      `0 0 ${result.geometry.w} ${result.geometry.h}`
    );
    element.setAttribute("width", result.geometry.w);
    element.setAttribute("height", result.geometry.h);
    element.innerHTML = result.inner;
    return result;
  }
  function attachTrace(element, getOptions, onRead) {
    const show = (x, mouseY = null) => {
      let o = getOptions(), g = graphGeometry(o);
      if (x < o.xmin || x > o.xmax) return;
      let candidates = o.curves.map((c2) => ({ ...c2, value: c2.fn?.(x) })).filter(
        (c2) => Number.isFinite(c2.value) && c2.value >= o.ymin && c2.value <= o.ymax
      );
      if (!candidates.length) {
        element.querySelector("#graph-trace").innerHTML = "";
        onRead?.("Nenhuma curva definida nesta coordenada.");
        return;
      }
      if (mouseY !== null)
        candidates.sort(
          (a, b) => Math.abs(g.Y(a.value) - mouseY) - Math.abs(g.Y(b.value) - mouseY)
        );
      let c = candidates[0], px = g.X(x), py = g.Y(c.value), label = `${c.name || "f"}: (${o.radians ? piLabel(x) : decimal(x)}; ${decimal(c.value)})`, tx = Math.max(g.left + 4, Math.min(g.w - g.right - 220, px + 14)), ty = Math.max(g.top + 24, Math.min(g.h - g.bottom - 12, py - 15));
      element.querySelector("#graph-trace").innerHTML = `<path d="M${px} ${g.top}V${g.h - g.bottom}" stroke="#708472" stroke-width="1" stroke-dasharray="4 5"/><circle cx="${px}" cy="${py}" r="5" fill="${c.color}" stroke="white" stroke-width="2"/><rect x="${tx}" y="${ty - 22}" width="216" height="29" rx="5" fill="#fff" stroke="#bdcdbb"/><text x="${tx + 9}" y="${ty - 3}" font-family="Arial,sans-serif" font-size="15" fill="#243d2e">${xml(label)}</text>`;
      onRead?.(label);
    };
    element.onpointermove = (e) => {
      const matrix = element.getScreenCTM();
      if (!matrix) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        matrix.inverse()
      ), o = getOptions(), g = graphGeometry(o);
      if (p.x < g.left || p.x > g.w - g.right || p.y < g.top || p.y > g.h - g.bottom)
        return;
      show(g.fromX(p.x), p.y);
    };
    element.onpointerleave = () => {
      const group = element.querySelector("#graph-trace");
      if (group) group.innerHTML = "";
    };
    return show;
  }
  function downloadGraph(options, format = "svg") {
    const source = buildGraph(options).svg;
    return new Promise((resolve, reject) => {
      const save = (blob, ext) => {
        const url2 = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url2;
        a.download = "grafico-matematico." + ext;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url2), 1e3);
        resolve();
      };
      if (format === "svg") {
        save(new Blob([source], { type: "image/svg+xml;charset=utf-8" }), "svg");
        return;
      }
      const url = URL.createObjectURL(
        new Blob([source], { type: "image/svg+xml;charset=utf-8" })
      ), img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = options.widthCm ? cmToPixels(options.widthCm, 300) : options.width;
        canvas.height = options.heightCm ? cmToPixels(options.heightCm, 300) : options.height;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(Error("N\xE3o foi poss\xEDvel exportar o PNG."));
            return;
          }
          try {
            save(
              options.widthCm ? new Blob([pngWithDpi(await blob.arrayBuffer(), 300)], {
                type: "image/png"
              }) : blob,
              "png"
            );
          } catch (e) {
            reject(e);
          }
        }, "image/png");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(Error("N\xE3o foi poss\xEDvel gerar a imagem."));
      };
      img.src = url;
    });
  }
  function attachGraphZoom(element, getOptions, apply) {
    const wheel = (e) => {
      const matrix = element.getScreenCTM();
      if (!matrix) return;
      e.preventDefault();
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        matrix.inverse()
      ), o = getOptions(), g = graphGeometry(o);
      const x = g.fromX(Math.max(g.left, Math.min(g.w - g.right, p.x))), y = g.fromY(Math.max(g.top, Math.min(g.h - g.bottom, p.y)));
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      apply(
        zoomWindow(
          o,
          Math.exp(Math.max(-0.5, Math.min(0.5, delta * 15e-4))),
          x,
          y
        )
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }

  // assets/functions-lab.js
  var names = ["f", "g", "h", "p", "q", "r"];
  var field = (id, label, value, extra = "") => `<label class="field compact-field" for="${id}"><span>${label}</span><input id="${id}" value="${xml(value)}" ${extra}></label>`;
  var numeric = (id, label, value, extra = "") => field(id, label, value, 'type="number" step="any" ' + extra);
  function viewportFields(o) {
    return `<div class="field-grid">${[
      ["xmin", "x m\xEDnimo"],
      ["xmax", "x m\xE1ximo"],
      ["ymin", "y m\xEDnimo"],
      ["ymax", "y m\xE1ximo"]
    ].map(([k, l]) => field("window-" + k, l, decimal(o[k], 5))).join(
      ""
    )}</div><button id="apply-window" class="wide-button">Aplicar janela</button><p class="small error" id="window-error" role="status"></p>`;
  }
  function expressionCurve(q, parameters = {}) {
    const fn = compileExpression(q.expression, parameters);
    const min = String(q.min ?? "").trim() === "" ? -Infinity : finiteInput(q.min), max = String(q.max ?? "").trim() === "" ? Infinity : finiteInput(q.max);
    if (min >= max) throw Error("O in\xEDcio do dom\xEDnio deve ser menor que o fim.");
    return (x) => x < min || x > max ? NaN : fn(x);
  }
  function algebraDetails(c) {
    const v = decimal, within = (x) => !c.domain || x >= c.min && x <= c.max;
    let text = "";
    if (familyError(c)) return "";
    if (c.type === "afim") {
      const root = c.a ? within(-c.b / c.a) ? v(-c.b / c.a) : "fora do intervalo escolhido" : c.b === 0 ? "todo x do dom\xEDnio" : "nenhuma";
      text = `<p><strong>Inclina\xE7\xE3o:</strong> ${v(c.a)}. <strong>Intercepto:</strong> (0; ${v(c.b)}). <strong>Raiz:</strong> ${root}. ${c.a > 0 ? "Crescente" : c.a < 0 ? "Decrescente" : "Constante"}.</p>`;
    }
    if (c.type === "quadratica") {
      if (!c.a)
        text = "<p>Com a = 0, a express\xE3o se reduz a uma fun\xE7\xE3o afim ou constante.</p>";
      else {
        const D = c.b * c.b - 4 * c.a * c.c, vx = -c.b / (2 * c.a), vy = -D / (4 * c.a), roots = D < 0 ? [] : [
          (-c.b - Math.sqrt(D)) / (2 * c.a),
          (-c.b + Math.sqrt(D)) / (2 * c.a)
        ].filter(within);
        text = `<p><strong>Discriminante:</strong> \u0394 = b\xB2 \u2212 4ac = ${v(D)}. <strong>Ra\xEDzes no dom\xEDnio:</strong> ${roots.length ? [...new Set(roots.map((x) => v(x)))].join(" e ") : "nenhuma"}.</p><p><strong>V\xE9rtice da par\xE1bola:</strong> (${v(vx)}; ${v(vy)}). Concavidade para ${c.a > 0 ? "cima" : "baixo"}${within(vx) ? "; ponto de " + (c.a > 0 ? "m\xEDnimo" : "m\xE1ximo") : "; v\xE9rtice fora do intervalo escolhido"}.</p>`;
      }
    }
    if (c.type === "exponencial")
      text = `<p><strong>Intercepto:</strong> (0; ${v(c.a + c.c)}). ${!c.a || c.b === 1 ? "Esta configura\xE7\xE3o produz uma constante." : `Ass\xEDntota horizontal da curva completa: y = ${v(c.c)}. Fun\xE7\xE3o ${c.a * Math.log(c.b) > 0 ? "crescente" : "decrescente"}.`}</p><button id="explore-logistic" class="text-button">Estudar crescimento log\xEDstico \u2192</button>`;
    if (c.type === "modular")
      text = `<p><strong>Ponto de mudan\xE7a:</strong> (${v(c.b)}; ${v(c.c)}). ${!c.a ? "Fun\xE7\xE3o constante." : c.a > 0 ? "A curva completa tem m\xEDnimo em x = b." : "A curva completa tem m\xE1ximo em x = b."}</p>`;
    return text;
  }
  function mountFunctions(ctx) {
    const { $: $2, select: select2, check: check2, shell: shell2, common: common2, render: render2, state: state2, toast: toast2 } = ctx, s = state2.functions, free = s.mode === "free";
    s.active = 0;
    const c = s.curves[0], f = s.free, rows = free ? f.equations : s.comparisons, windowState = free ? f : s;
    let options, raf = 0, previous = 0, paletteTarget = null;
    const playing = /* @__PURE__ */ new Map();
    const nav = `<div class="function-tabs" role="group" aria-label="Modo do laborat\xF3rio"><button id="mode-families" class="${!free ? "selected" : ""}" aria-pressed="${!free}">Fam\xEDlias de fun\xE7\xF5es</button><button id="mode-free" class="${free ? "selected" : ""}" aria-pressed="${free}">Gr\xE1fico para avalia\xE7\xF5es</button></div>`;
    const controls = free ? assessmentControls() : familyControls();
    $2("#main").innerHTML = shell2(
      "Fun\xE7\xF5es",
      free ? "Prepare gr\xE1ficos claros para suas avalia\xE7\xF5es." : "Escolha uma fam\xEDlia, experimente os coeficientes e compare.",
      controls,
      `<div class="plot-toolbar"><div class="plot-curves" id="plot-curves" aria-label="Cores das fun\xE7\xF5es">${(!free ? [c] : []).concat(rows).map(
        (q, i) => `<button class="plot-curve-chip" data-color="${i}" aria-label="Escolher cor de ${names[i]}" aria-expanded="false"><i style="background:${q.color}"></i><span id="chip-label-${i}">${names[i]}(x)</span></button>`
      ).join(
        ""
      )}</div><div class="plot-zoom"><button id="graph-minus" aria-label="Reduzir zoom do gr\xE1fico">\u2212</button><button id="graph-reset" aria-label="Restaurar janela do gr\xE1fico">\u21BA</button><button id="graph-plus" aria-label="Ampliar zoom do gr\xE1fico">+</button></div><div id="color-palette" class="plot-palette" hidden role="group" aria-label="Escolha uma cor">${PALETTE.map(([color, label]) => `<button data-palette-color="${color}" style="--swatch:${color}" aria-label="${label}" title="${label}"><i></i></button>`).join("")}<button id="close-palette" aria-label="Fechar cores">\xD7</button></div></div>
 <div class="graph-summary" id="graph-summary"></div><div class="stage graph-stage ${free ? "exam-stage" : ""}"><svg id="function-graph" role="img" tabindex="0" aria-label="Gr\xE1fico de fun\xE7\xF5es"></svg><span class="graph-gesture">Role para dar zoom \xB7 Passe sobre a curva para ver coordenadas</span></div><div class="export-toolbar"><button id="export-svg">\u2193 SVG vetorial</button><button id="export-png">\u2193 PNG</button></div>`,
      nav
    );
    $2(".lab").classList.add("function-lab");
    $2("#lab-controls").classList.add("extended-controls", "function-controls");
    $2(".workspace").insertAdjacentHTML(
      "afterend",
      `<details class="function-notes" ${free ? "hidden" : ""}><summary>Propriedades da fun\xE7\xE3o e tabela de valores</summary><div id="function-details"></div></details>`
    );
    $2("#mode-families").onclick = () => {
      s.mode = "families";
      render2();
    };
    $2("#mode-free").onclick = () => {
      s.mode = "free";
      render2();
    };
    function equationRows() {
      return rows.map(
        (q, i) => `<div class="expression-row"><label class="expression-field" for="expression-${i}"><span>${names[i + (free ? 0 : 1)]}(x) =</span><input id="expression-${i}" value="${xml(q.expression)}" maxlength="240" placeholder="Digite uma fun\xE7\xE3o" autocomplete="off" spellcheck="false"></label><div class="expression-switches">${check2("visible-" + i, "Mostrar", q.visible)}${free ? check2("equation-" + i, "Mostrar equa\xE7\xE3o", q.showEquation) : ""}<button data-remove-expression="${i}" aria-label="Remover fun\xE7\xE3o ${names[i + (free ? 0 : 1)]}" ${rows.length === 1 ? "disabled" : ""}>\xD7</button></div>${free ? `<div class="equation-domain"><span>Dom\xEDnio de x</span>${field("min-" + i, "M\xEDnimo", q.min, 'placeholder="\u2212\u221E" aria-label="In\xEDcio do dom\xEDnio de ' + names[i] + '"')}${field("max-" + i, "M\xE1ximo", q.max, 'placeholder="+\u221E" aria-label="Fim do dom\xEDnio de ' + names[i] + '"')}</div>` : ""}<p class="small error" id="expression-error-${i}" role="status"></p></div>`
      ).join("") + `<button id="add-expression" class="wide-button" ${rows.length >= 5 ? "disabled" : ""}>\uFF0B Adicionar fun\xE7\xE3o <span>${rows.length}/5</span></button>`;
    }
    function familyControls() {
      return `<div class="control-title">Comece pela fam\xEDlia</div>${select2("family", "Fam\xEDlia da fun\xE7\xE3o", FAMILIES, c.type)}${c.type === "trigonometrica" ? select2(
        "trig",
        "Raz\xE3o trigonom\xE9trica",
        [
          ["sin", "Seno"],
          ["cos", "Cosseno"],
          ["tan", "Tangente"]
        ],
        c.trig
      ) : ""}<div class="main-equation"><span class="symbolic-formula">${xml(familyFormula(c, true))}</span>${check2("main-visible", "Mostrar", c.visible)}</div><div class="parameters">${PARAMS[c.type].map(([k, l, min, max, step]) => `<div class="parameter"><label for="coef-${k}"><b>${k}</b><span>${l}</span></label><div class="parameter-values"><input type="range" id="coef-${k}" min="${Math.min(min, c[k])}" max="${Math.max(max, c[k])}" step="${step}" value="${c[k]}" aria-label="Coeficiente ${k}"><input type="number" id="value-${k}" step="any" value="${Number(c[k].toFixed(4))}" aria-label="Valor de ${k}"><button id="play-${k}" aria-label="Animar coeficiente ${k}" aria-pressed="false">\u25B6</button></div></div>`).join("")}</div><button id="stop-animation" class="text-button compact-pause">Pausar anima\xE7\xF5es</button><p class="small error" id="family-error" role="status"></p><details class="control-section main-domain"><summary>Dom\xEDnio da fun\xE7\xE3o principal</summary><p id="natural-domain" class="small"></p>${check2("limit-domain", "Limitar intervalo", c.domain)}<div id="main-domain-fields" class="field-grid" ${c.domain ? "" : "hidden"}>${numeric("domain-min", "In\xEDcio", c.min)}${numeric("domain-max", "Fim", c.max)}</div></details><div class="control-section comparisons"><h2>Comparar com outras fun\xE7\xF5es</h2><p class="small">Digite at\xE9 5 express\xF5es. Use a, b, c e d para acompanhar os coeficientes.</p>${equationRows()}</div><details class="control-section"><summary>Janela do gr\xE1fico</summary>${viewportFields(s)}</details>`;
    }
    function assessmentControls() {
      return `<div class="control-title">Gr\xE1fico para avalia\xE7\xF5es</div>${equationRows()}<details class="syntax-help"><summary>Como escrever as fun\xE7\xF5es</summary><p class="small">Use x^2, 2x, sen(x), cos(x), tan(x), sqrt(x), ln(x), log(x) e |x|. Use pi para \u03C0. Dom\xEDnio vazio mant\xE9m o dom\xEDnio natural.</p></details><details class="control-section"><summary>Janela do gr\xE1fico</summary>${viewportFields(f)}</details><details class="control-section"><summary>Eixos e tipografia</summary><div class="field-grid">${field("xlabel", "Nome do eixo x", f.xlabel, 'maxlength="30"')}${field("ylabel", "Nome do eixo y", f.ylabel, 'maxlength="30"')}</div>${check2("axes-bold", "Nomes dos eixos em negrito", f.axesBold)}${check2("radians", "Eixo x em radianos", f.radians)}${check2("grid", "Mostrar malha", f.grid)}<p class="small">Fonte: Calibri, quando instalada; alternativa sem serifa nos demais dispositivos. Nomes dos eixos sem it\xE1lico.</p></details><details class="control-section" id="points-panel"><summary>Inserir coordenadas</summary><div class="field-grid">${field("point-x", "Coordenada x", "0")}${field("point-y", "Coordenada y", "0")}</div>${field("point-label", "Nome do ponto (opcional)", "", 'maxlength="24"')}${check2("point-project", "Proje\xE7\xF5es nos eixos", true)}<button id="add-point" class="wide-button" ${f.points.length >= 12 ? "disabled" : ""}>\uFF0B Inserir ponto</button><p class="small error" id="point-error" role="status"></p><div id="point-list">${pointList()}</div></details><details class="control-section" open><summary>Tamanho da figura \xB7 cm</summary><div class="field-grid">${numeric("width-cm", "Largura (cm)", f.widthCm, 'min="6" max="30"')}${numeric("height-cm", "Altura (cm)", f.heightCm, 'min="4" max="25"')}</div><button id="apply-size" class="wide-button">Aplicar tamanho</button><p class="small error" id="size-error" role="status"></p><p class="small">Fundo transparente \xB7 SVG em tamanho f\xEDsico \xB7 PNG a 300 dpi.</p></details>`;
    }
    function pointList() {
      return f.points.map(
        (p, i) => `<div class="point-row"><span>${xml(p.label || "P" + (i + 1))}: (${decimal(p.x)}; ${decimal(p.y)})</span><button data-remove-point="${i}" aria-label="Remover ponto ${i + 1}">\xD7</button></div>`
      ).join("");
    }
    function compileRows() {
      const curves = [];
      rows.forEach((q, i) => {
        const error = $2("#expression-error-" + i), input = $2("#expression-" + i);
        error.textContent = "";
        input.removeAttribute("aria-invalid");
        if (!q.expression.trim()) return;
        try {
          const fn = expressionCurve(q, free ? {} : c);
          if (q.visible)
            curves.push({
              fn,
              color: q.color,
              name: names[i + (free ? 0 : 1)],
              label: `${names[i + (free ? 0 : 1)]}(x) = ${q.expression}`,
              showEquation: q.showEquation
            });
        } catch (e) {
          error.textContent = e.message;
          input.setAttribute("aria-invalid", "true");
        }
      });
      return curves;
    }
    function draw() {
      let curves = compileRows(), guides = [];
      if (free) {
        options = {
          ...f,
          width: cmToPixels(f.widthCm),
          height: cmToPixels(f.heightCm),
          curves,
          legend: true,
          professional: true,
          guides
        };
        $2("#graph-summary").textContent = `${decimal(f.widthCm)} \xD7 ${decimal(f.heightCm)} cm \xB7 Calibri \xB7 fundo transparente`;
      } else {
        const error = familyError(c);
        $2("#family-error").textContent = error;
        $2(".symbolic-formula").textContent = familyFormula(c, true);
        $2("#natural-domain").textContent = "Dom\xEDnio natural: " + naturalDomain(c);
        if (c.visible && !error) {
          curves.unshift({
            fn: (x) => familyValue(c, x),
            color: c.color,
            name: "f",
            label: "f(x) = " + familyFormula(c),
            breaks: familyBreaks(c, s.xmin, s.xmax)
          });
          if (c.type === "trigonometrica") {
            if (c.trig === "tan") {
              if (c.b && c.c)
                familyBreaks(c, s.xmin, s.xmax).filter((x) => !c.domain || x >= c.min && x <= c.max).forEach(
                  (x) => guides.push({ axis: "x", value: x, color: c.color })
                );
            } else {
              const b = trigBounds(c);
              if (b) {
                guides.push({
                  axis: "y",
                  value: b.max,
                  color: c.color,
                  label: "m\xE1x. " + decimal(b.max)
                });
                if (b.max !== b.min)
                  guides.push({
                    axis: "y",
                    value: b.min,
                    color: c.color,
                    label: "m\xEDn. " + decimal(b.min)
                  });
              }
            }
          }
        }
        options = {
          ...s,
          width: 1e3,
          height: 490,
          xlabel: "x",
          ylabel: "y",
          curves,
          legend: false,
          radians: c.type === "trigonometrica",
          grid: true,
          guides
        };
        let summary = "f(x) = " + familyFormula(c);
        const T = period(c);
        if (c.type === "trigonometrica")
          summary += T ? ` \xB7 T = ${c.trig === "tan" ? "\u03C0" : "2\u03C0"}/|c| = ${c.trig === "tan" ? "\u03C0" : "2\u03C0"}/|${decimal(c.c)}| \u2248 ${decimal(T)} rad` : " \xB7 Sem per\xEDodo fundamental positivo";
        $2("#graph-summary").textContent = summary;
        $2("#function-details").innerHTML = `<p>Dom\xEDnio: ${xml(naturalDomain(c))}${c.domain ? ` \u2229 [${decimal(c.min)}; ${decimal(c.max)}]` : ""}.</p>${algebraDetails(c)}${c.type === "logistica" ? "<p>Crescimento log\xEDstico: para b \u2260 0, os patamares da curva completa s\xE3o y = d e y = a + d.</p>" : ""}${c.type === "trigonometrica" ? "<p>As linhas tracejadas mostram os extremos no dom\xEDnio escolhido (seno e cosseno) ou as ass\xEDntotas (tangente). Os \xE2ngulos est\xE3o em radianos.</p>" : ""}<div class="table-scroll"><table class="data-table"><thead><tr><th>x</th>${[-2, -1, 0, 1, 2].map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody><tr><th>f(x)</th>${[-2, -1, 0, 1, 2].map((x) => `<td>${decimal(familyValue(c, x))}</td>`).join("")}</tr></tbody></table></div>`;
        if ($2("#explore-logistic"))
          $2("#explore-logistic").onclick = () => changeFamily("logistica");
      }
      drawGraph($2("#function-graph"), options);
      $2("#function-graph").setAttribute(
        "aria-label",
        `Gr\xE1fico com ${curves.length} fun\xE7\xF5es. Janela x de ${decimal(options.xmin)} a ${decimal(options.xmax)}, y de ${decimal(options.ymin)} a ${decimal(options.ymax)}. Role o mouse ou use mais e menos para ajustar o zoom.`
      );
      (!free ? [c] : []).concat(rows).forEach((q, i) => {
        const chip = document.querySelector(`[data-color="${i}"]`);
        chip.querySelector("i").style.background = q.color;
        chip.classList.toggle("muted", !q.visible);
        $2("#chip-label-" + i).textContent = names[i] + "(x)";
        chip.title = !free && i === 0 ? familyFormula(c) : q.expression || "Escolher cor";
      });
    }
    function syncWindow() {
      for (const k of ["xmin", "xmax", "ymin", "ymax"])
        $2("#window-" + k).value = decimal(windowState[k], 5);
    }
    function setWindow(v) {
      Object.assign(windowState, v);
      syncWindow();
      draw();
    }
    function resetWindow() {
      const next = free ? { xmin: -5, xmax: 5, ymin: -2, ymax: 8 } : c.type === "trigonometrica" ? { xmin: -2 * Math.PI, xmax: 2 * Math.PI, ymin: -3, ymax: 3 } : c.type === "logistica" ? { xmin: -8, xmax: 8, ymin: -1, ymax: 10 } : { xmin: -10, xmax: 10, ymin: -6, ymax: 6 };
      setWindow(next);
    }
    $2("#apply-window").onclick = () => {
      try {
        const v = {};
        for (const k of ["xmin", "xmax", "ymin", "ymax"]) {
          v[k] = finiteInput($2("#window-" + k).value);
          if (Math.abs(v[k]) > 1e4)
            throw Error("Use valores entre \u221210.000 e 10.000.");
        }
        if (v.xmax - v.xmin < 1e-4 || v.ymax - v.ymin < 1e-4)
          throw Error(
            "Use m\xEDnimos menores que os m\xE1ximos, com intervalo de pelo menos 0,0001."
          );
        $2("#window-error").textContent = "";
        setWindow(v);
      } catch (e) {
        $2("#window-error").textContent = e.message;
      }
    };
    $2("#graph-plus").onclick = () => setWindow(zoomWindow(windowState, 0.8));
    $2("#graph-minus").onclick = () => setWindow(zoomWindow(windowState, 1.25));
    $2("#graph-reset").onclick = resetWindow;
    rows.forEach((q, i) => {
      $2("#expression-" + i).oninput = (e) => {
        q.expression = e.target.value;
        draw();
      };
      $2("#visible-" + i).onchange = (e) => {
        q.visible = e.target.checked;
        draw();
      };
      if (free) {
        $2("#equation-" + i).onchange = (e) => {
          q.showEquation = e.target.checked;
          draw();
        };
        for (const k of ["min", "max"])
          $2("#" + k + "-" + i).oninput = (e) => {
            q[k] = e.target.value;
            draw();
          };
      }
    });
    document.querySelectorAll("[data-remove-expression]").forEach(
      (el) => el.onclick = () => {
        rows.splice(+el.dataset.removeExpression, 1);
        render2();
      }
    );
    $2("#add-expression").onclick = () => {
      if (rows.length < 5)
        rows.push(makeExpression(rows.length + (free ? 0 : 2)));
      render2();
    };
    document.querySelectorAll("[data-color]").forEach(
      (el) => el.onclick = () => {
        paletteTarget = +el.dataset.color;
        $2("#color-palette").hidden = false;
        document.querySelectorAll("[data-color]").forEach((b) => b.setAttribute("aria-expanded", String(b === el)));
      }
    );
    const closePalette = () => {
      $2("#color-palette").hidden = true;
      document.querySelectorAll("[data-color]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    };
    $2("#close-palette").onclick = closePalette;
    document.querySelectorAll("[data-palette-color]").forEach(
      (el) => el.onclick = () => {
        const list = (!free ? [c] : []).concat(rows);
        if (paletteTarget !== null)
          list[paletteTarget].color = el.dataset.paletteColor;
        draw();
        closePalette();
      }
    );
    $2("#color-palette").onkeydown = (e) => {
      if (e.key === "Escape") closePalette();
    };
    function changeFamily(type) {
      s.curves = [makeCurve(type)];
      if (type === "trigonometrica")
        Object.assign(s, {
          xmin: -2 * Math.PI,
          xmax: 2 * Math.PI,
          ymin: -3,
          ymax: 3
        });
      else if (type === "logistica")
        Object.assign(s, { xmin: -8, xmax: 8, ymin: -1, ymax: 10 });
      render2();
    }
    if (free) {
      for (const k of ["xlabel", "ylabel"])
        $2("#" + k).oninput = (e) => {
          f[k] = e.target.value;
          draw();
        };
      for (const k of ["radians", "grid"])
        $2("#" + k).onchange = (e) => {
          f[k] = e.target.checked;
          draw();
        };
      $2("#axes-bold").onchange = (e) => {
        f.axesBold = e.target.checked;
        draw();
      };
      $2("#apply-size").onclick = () => {
        const w = +$2("#width-cm").value, h = +$2("#height-cm").value;
        if (!Number.isFinite(w) || !Number.isFinite(h) || w < 6 || w > 30 || h < 4 || h > 25) {
          $2("#size-error").textContent = "Largura: 6\u201330 cm. Altura: 4\u201325 cm.";
          return;
        }
        Object.assign(f, { widthCm: w, heightCm: h });
        $2("#size-error").textContent = "";
        draw();
      };
      const bindPoints = () => document.querySelectorAll("[data-remove-point]").forEach(
        (el) => el.onclick = () => {
          f.points.splice(+el.dataset.removePoint, 1);
          $2("#point-list").innerHTML = pointList();
          $2("#add-point").disabled = false;
          bindPoints();
          draw();
        }
      );
      bindPoints();
      $2("#add-point").onclick = () => {
        try {
          if (f.points.length >= 12) return;
          f.points.push({
            x: finiteInput($2("#point-x").value),
            y: finiteInput($2("#point-y").value),
            label: $2("#point-label").value,
            project: $2("#point-project").checked
          });
          $2("#point-error").textContent = "";
          $2("#point-list").innerHTML = pointList();
          $2("#add-point").disabled = f.points.length >= 12;
          bindPoints();
          draw();
        } catch (e) {
          $2("#point-error").textContent = e.message;
        }
      };
    } else {
      $2("#family").onchange = (e) => changeFamily(e.target.value);
      if ($2("#trig"))
        $2("#trig").onchange = (e) => {
          c.trig = e.target.value;
          draw();
        };
      $2("#main-visible").onchange = (e) => {
        c.visible = e.target.checked;
        draw();
      };
      $2("#limit-domain").onchange = (e) => {
        c.domain = e.target.checked;
        $2("#main-domain-fields").hidden = !c.domain;
        draw();
      };
      for (const k of ["min", "max"])
        $2("#domain-" + k).oninput = (e) => {
          if (Number.isFinite(e.target.valueAsNumber)) {
            c[k] = e.target.valueAsNumber;
            draw();
          }
        };
      for (const [k, , min, max] of PARAMS[c.type]) {
        const update = (v, write = true) => {
          c[k] = v;
          $2("#coef-" + k).min = Math.min(min, v);
          $2("#coef-" + k).max = Math.max(max, v);
          $2("#coef-" + k).value = v;
          if (write) $2("#value-" + k).value = Number(v.toFixed(4));
          draw();
        };
        $2("#coef-" + k).oninput = (e) => {
          stop(k);
          update(+e.target.value);
        };
        $2("#value-" + k).oninput = (e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v) && Math.abs(v) <= 1e3) {
            stop(k);
            update(v, false);
            e.target.setCustomValidity("");
          } else e.target.setCustomValidity("Use um valor entre \u22121.000 e 1.000.");
        };
        $2("#play-" + k).onclick = () => {
          if (playing.has(k)) stop(k);
          else {
            c[k] = Math.max(min, Math.min(max, c[k]));
            playing.set(k, { min, max, direction: c[k] >= max ? -1 : 1 });
            $2("#play-" + k).textContent = "\u2161";
            $2("#play-" + k).setAttribute("aria-pressed", "true");
            $2("#play-" + k).setAttribute("aria-label", "Pausar coeficiente " + k);
            if (!raf) {
              previous = 0;
              raf = requestAnimationFrame(animate);
            }
          }
        };
      }
      $2("#stop-animation").onclick = stopAll;
    }
    function stop(k) {
      playing.delete(k);
      const b = $2("#play-" + k);
      if (b) {
        b.textContent = "\u25B6";
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-label", "Animar coeficiente " + k);
      }
      if (!playing.size) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }
    function stopAll() {
      for (const k of [...playing.keys()]) stop(k);
    }
    function animate(t) {
      raf = 0;
      if (!playing.size) return;
      if (!previous) previous = t;
      const dt = Math.min((t - previous) / 1e3, 0.1);
      if (t - previous >= 50) {
        previous = t;
        for (const [k, p] of playing) {
          let v = c[k] + p.direction * (p.max - p.min) * dt / 9;
          if (v > p.max) {
            v = p.max;
            p.direction = -1;
          }
          if (v < p.min) {
            v = p.min;
            p.direction = 1;
          }
          c[k] = v;
          $2("#coef-" + k).value = v;
          $2("#value-" + k).value = Number(v.toFixed(3));
        }
        draw();
      }
      raf = requestAnimationFrame(animate);
    }
    const visibility = () => {
      if (document.hidden) stopAll();
    };
    document.addEventListener("visibilitychange", visibility);
    draw();
    attachTrace($2("#function-graph"), () => options);
    const removeZoom = attachGraphZoom(
      $2("#function-graph"),
      () => options,
      setWindow
    );
    $2("#function-graph").onkeydown = (e) => {
      if (["+", "=", "-", "0"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "0") resetWindow();
        else setWindow(zoomWindow(windowState, e.key === "-" ? 1.25 : 0.8));
      }
    };
    for (const format of ["svg", "png"])
      $2("#export-" + format).onclick = async () => {
        try {
          await downloadGraph(
            free ? options : { ...options, legend: true },
            format
          );
          toast2("Figura exportada com fundo transparente.");
        } catch (e) {
          toast2(e.message);
        }
      };
    common2();
    return () => {
      stopAll();
      removeZoom();
      document.removeEventListener("visibilitychange", visibility);
    };
  }

  // assets/app.js
  var $ = (s) => document.querySelector(s);
  var fmt = (n, d = 2) => n === null || !Number.isFinite(n) ? "\u2014" : n.toLocaleString("pt-BR", { maximumFractionDigits: d });
  var pct = (n) => n === null ? "indefinida" : fmt(n * 100, 1) + "%";
  var esc = (s) => String(s).replace(
    /[&<>"']/g,
    (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]
  );
  var icons = {
    geometria: `<path d="M100 28 160 61 160 131 100 165 40 131 40 61Z" fill="#b4cc9d" stroke="#476a43" stroke-width="1.7"/><path d="m40 61 60 35 60-35M100 96v69" fill="none" stroke="#476a43" stroke-width="1.7"/><path d="m100 28 0 69" stroke="#476a43" stroke-dasharray="4 5"/><path d="m40 131 60-34 60 34" fill="none" stroke="#476a43" stroke-dasharray="4 5"/><circle cx="100" cy="96" r="4" fill="#194c40"/>`,
    funcoes: `<path d="M25 135H180M55 165V20" stroke="#b0a5c1"/><path d="M26 38Q90 212 175 40" fill="none" stroke="#8965b2" stroke-width="3"/><path d="M27 140 174 55" stroke="#c0abda" stroke-width="2"/><circle cx="100" cy="118" r="5" fill="#8965b2"/><text x="132" y="148" fill="#8965b2" font-family="Georgia" font-size="18">f(x)</text>`,
    estatistica: `<path d="M30 150H182" stroke="#cabda7"/><rect x="42" y="98" width="23" height="52" rx="3" fill="#e5b981"/><rect x="77" y="63" width="23" height="87" rx="3" fill="#dca264"/><rect x="112" y="31" width="23" height="119" rx="3" fill="#bf7948"/><rect x="147" y="83" width="23" height="67" rx="3" fill="#e5b981"/><path d="M25 81H180" stroke="#976139" stroke-dasharray="5 5"/><circle cx="123" cy="31" r="4" fill="#976139"/>`,
    probabilidade: `<g transform="rotate(-12 80 90)"><rect x="30" y="40" width="92" height="92" rx="15" fill="#d3e1eb" stroke="#56819b" stroke-width="1.5"/><g fill="#56819b"><circle cx="52" cy="62" r="6"/><circle cx="100" cy="62" r="6"/><circle cx="76" cy="86" r="6"/><circle cx="52" cy="110" r="6"/><circle cx="100" cy="110" r="6"/></g></g><circle cx="145" cy="125" r="33" fill="#eef5f8" stroke="#56819b" stroke-width="1.5"/><circle cx="145" cy="125" r="25" fill="none" stroke="#a5bdcb"/><text x="145" y="134" text-anchor="middle" font-size="26" fill="#56819b" font-family="Georgia">\xBD</text>`
  };
  var svgArt = (type) => `<svg viewBox="0 0 210 190" aria-hidden="true">${icons[type]}</svg>`;
  var topics = [
    [
      "funcoes",
      "Fun\xE7\xF5es",
      "Mude os par\xE2metros. Veja cada transforma\xE7\xE3o no gr\xE1fico.",
      ["7 fam\xEDlias", "Editor de gr\xE1ficos"]
    ],
    [
      "geometria",
      "Geometria espacial",
      "Gire, desmonte e descubra o que d\xE1 forma ao espa\xE7o.",
      ["6 s\xF3lidos", "Planifica\xE7\xF5es"]
    ],
    [
      "estatistica",
      "Estat\xEDstica",
      "Transforme dados em perguntas e compare suas medidas.",
      ["Tend\xEAncia central", "Dispers\xE3o"]
    ],
    [
      "probabilidade",
      "Probabilidade",
      "Experimente o acaso e investigue os padr\xF5es que aparecem.",
      ["Condicional", "Bin\xF4mio de Newton"]
    ]
  ];
  var state = {
    geometry: defaultGeometry(),
    functions: defaultFunctions(),
    stats: { text: "4; 5; 5; 6; 7; 7; 8; 8; 9; 11", sample: false },
    prob: {
      tab: "simulacao",
      mode: "moeda",
      event: 0,
      p: 0.5,
      counts: [0, 0],
      history: []
    },
    conditional: { a: 30, b: 20, c: 10, d: 40, reverse: false },
    binomial: { n: 5, p: 0.5, tab: "pascal", k: 2 }
  };
  var cleanupLab = () => {
  };
  var current = "inicio";
  var toastTimer;
  var controlsOpen = false;
  function toast(text) {
    $("#toast").textContent = text;
    $("#toast").style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").style.display = "none", 4e3);
  }
  function range(id, label, v, min, max, step = 1, suffix = "") {
    return `<label class="field" for="${id}"><span>${label}<output id="${id}-out">${fmt(v)}${suffix}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
  }
  function select(id, label, options, value) {
    return `<label class="field" for="${id}"><span>${label}</span><select id="${id}">${options.map(([v, l]) => `<option value="${v}" ${v === value ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
  }
  function check(id, label, value) {
    return `<label class="check"><input type="checkbox" id="${id}" ${value ? "checked" : ""}>${label}</label>`;
  }
  function metric(label, value, detail = "") {
    return `<div class="metric"><span>${label}</span><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ""}</div>`;
  }
  function bindRange(id, obj, key, callback) {
    $("#" + id).addEventListener("input", (e) => {
      obj[key] = +e.target.value;
      $("#" + id + "-out").textContent = fmt(obj[key]);
      callback();
    });
  }
  var plans = {
    geometria: {
      title: "O que acontece quando o s\xF3lido cresce?",
      time: "15\u201320 min",
      question: "Se a aresta do cubo dobrar, a \xE1rea e o volume tamb\xE9m dobram? Formule uma hip\xF3tese antes de mover o controle.",
      steps: [
        "Antecipar: pe\xE7a que cada grupo registre quanto a \xE1rea e o volume devem crescer ao dobrar a aresta.",
        "Experimentar: comece com a = 2 e passe para a = 4. Compare 24 e 96 u.a.; 8 e 64 u.v.",
        "Explicar: relacione os fatores 4 e 8 com as dimens\xF5es 2 e 3 das f\xF3rmulas. Abra a planifica\xE7\xE3o para contar as faces."
      ],
      answer: "Ao multiplicar todas as dimens\xF5es por k, a \xE1rea \xE9 multiplicada por k\xB2 e o volume por k\xB3. No cubo: dobrar a aresta quadruplica a \xE1rea e multiplica o volume por 8."
    },
    funcoes: {
      title: "Do par\xE2metro \xE0 transforma\xE7\xE3o",
      time: "15\u201320 min",
      question: "Na fun\xE7\xE3o quadr\xE1tica, o que muda quando a passa de positivo para negativo? E quando c aumenta?",
      steps: [
        "Antecipar: desenhe uma hip\xF3tese para y = x\xB2 e y = \u2212x\xB2 antes de alterar a.",
        "Experimentar: altere a e depois c, mantendo b = 0. Compare a abertura, a concavidade e a altura do v\xE9rtice.",
        "Explicar: discuta por que a = 0 deixa de produzir uma fun\xE7\xE3o quadr\xE1tica. Explore a mesma ideia de transforma\xE7\xE3o nas outras fam\xEDlias."
      ],
      answer: "O sinal de a determina a concavidade; |a| influencia a abertura. Somar c desloca verticalmente o gr\xE1fico. Quando a = 0, a express\xE3o se reduz a uma fun\xE7\xE3o afim (ou constante)."
    },
    estatistica: {
      title: "Uma medida conta toda a hist\xF3ria?",
      time: "15 min",
      question: "Acrescente um valor muito alto. Qual medida muda mais: a m\xE9dia ou a mediana? O que acontece com o desvio padr\xE3o?",
      steps: [
        "Antecipar: calcule e registre a m\xE9dia e a mediana do conjunto inicial.",
        "Experimentar: clique em \u201CAdicionar valor extremo\u201D e compare as medidas e o gr\xE1fico.",
        "Explicar: discuta quando a mediana pode representar melhor um conjunto assim\xE9trico e por que dispers\xE3o tamb\xE9m importa."
      ],
      answer: "Valores extremos podem afetar fortemente a m\xE9dia e o desvio padr\xE3o. A mediana depende da posi\xE7\xE3o dos valores ordenados e costuma ser menos sens\xEDvel. Isso n\xE3o significa que ela nunca muda."
    },
    probabilidade: {
      title: "O acaso tem mem\xF3ria?",
      time: "15\u201320 min",
      question: "Se uma moeda mostrar cara cinco vezes seguidas, a probabilidade de cara no pr\xF3ximo lan\xE7amento muda?",
      steps: [
        "Antecipar: registre previs\xF5es para 10 e 1.000 lan\xE7amentos de uma moeda equilibrada.",
        "Experimentar: simule lotes crescentes. Compare a frequ\xEAncia relativa com a probabilidade te\xF3rica.",
        "Explicar: diferencie independ\xEAncia entre lan\xE7amentos e estabiliza\xE7\xE3o da frequ\xEAncia relativa em muitas repeti\xE7\xF5es."
      ],
      answer: "Em lan\xE7amentos independentes de uma moeda equilibrada, P(cara) continua 50%. Frequ\xEAncias relativas tendem a se aproximar da probabilidade com muitas repeti\xE7\xF5es, mas n\xE3o h\xE1 compensa\xE7\xE3o obrigat\xF3ria nem converg\xEAncia monot\xF4nica."
    }
  };
  function home() {
    return `<div class="home"><section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="dot"></span> UM LABORAT\xD3RIO PARA A SALA DE AULA</div><h1>A matem\xE1tica faz<br>mais sentido quando<br><em>voc\xEA explora.</em></h1><p>Transforme conceitos em descobertas. Um espa\xE7o para professores e alunos experimentarem, juntos.</p><a class="cta" href="#geometria">Come\xE7ar a explorar <span>\u2197</span></a></div><div class="hero-art"><svg viewBox="0 0 480 380" aria-hidden="true"><defs><pattern id="gridhero" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#91b79b" stroke-opacity=".13"/></pattern></defs><circle cx="250" cy="190" r="145" fill="none" stroke="#83ab8e" stroke-opacity=".25" stroke-dasharray="3 7"/><path d="M84 280H405M140 330V46" stroke="#81a58c" stroke-opacity=".6"/><path d="M82 111Q218 444 390 76" stroke="#c4d79a" stroke-width="2.5" fill="none"/><g transform="translate(140 58) scale(1.25)"><path d="m90 15 65 37v76l-65 38-65-38V52Z" fill="#d3e9ad" fill-opacity=".8" stroke="#dbefbd"/><path d="m25 52 65 39 65-39M90 91v75" fill="none" stroke="#f3f7df" stroke-width="1.3"/><path d="M90 15V91m-65 37 65-37 65 37" fill="none" stroke="#194c40" stroke-dasharray="4 5"/><path d="m25 52 65 39v75l-65-38Z" fill="#80a77f" fill-opacity=".7"/></g><circle cx="264" cy="275" r="5" fill="#e4f3bc"/><text x="327" y="315" font-family="Georgia" font-style="italic" font-size="25" fill="#b5cda6">f(x)</text><text x="85" y="91" font-family="Georgia" font-size="26" fill="#d5e7bf" transform="rotate(-12 85 91)">\u2211</text><g transform="translate(350 42) rotate(12)"><rect width="52" height="52" rx="11" fill="#f3f4dd"/><g fill="#194c40"><circle cx="15" cy="15" r="3"/><circle cx="37" cy="15" r="3"/><circle cx="26" cy="26" r="3"/><circle cx="15" cy="37" r="3"/><circle cx="37" cy="37" r="3"/></g></g><text x="76" y="335" fill="#bfd4b8" font-size="11" font-family="monospace">OBSERVAR \u2192 CONJECTURAR \u2192 DESCOBRIR</text></svg></div></section><div class="intro-row"><span><b>\u2733</b> Feito para ensinar e aprender</span><span><b>\u2194</b> Interativo, do conceito \xE0 descoberta</span><span><b>\u2713</b> Livre para explorar. Sem cadastro.</span></div><section aria-labelledby="areas-title"><div class="section-title"><div><h2 id="areas-title">Por onde vamos come\xE7ar?</h2><p>Escolha uma \xE1rea. Deixe a curiosidade conduzir.</p></div><span>04 \xE1reas de explora\xE7\xE3o</span></div><div class="cards">${topics.map(([id, title, desc, tags], i) => `<a class="topic-card" href="#${id}"><div class="card-art"><span class="card-number">0${i + 1} /</span>${svgArt(id)}</div><div class="card-body"><h3>${title}</h3><p>${desc}</p><div class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div><span class="card-link">Abrir laborat\xF3rio <span>\u2197</span></span></div></a>`).join("")}</div></section><section class="teacher-strip"><span class="spark">\u2733</span><div><h3>Menos respostas prontas. Mais boas perguntas.</h3><p>Cada laborat\xF3rio traz uma proposta de investiga\xE7\xE3o para levar \xE0 sua aula.</p></div><button id="home-guide">Conhe\xE7a o guia do professor \u2197</button></section></div>`;
  }
  function lessonPlan() {
    if (current === "geometria" && state.geometry.type !== "cubo") {
      const type = state.geometry.type, base = plans.geometria;
      const lessons = {
        prisma: [
          "Como o volume responde \xE0 altura?",
          "Mantenha a base do prisma e dobre apenas a altura. A \xE1rea total tamb\xE9m dobra?",
          "Compare alturas 3 e 6 com a mesma base.",
          "O volume dobra. A \xE1rea lateral dobra, mas a \xE1rea das duas bases permanece a mesma."
        ],
        piramide: [
          "Uma pir\xE2mide dentro de um prisma",
          "Compare a pir\xE2mide com um prisma de mesma base e altura. Que rela\xE7\xE3o aparece entre os volumes?",
          "Use uma base quadrada de lado 4 e altura 6; no prisma, configure tamb\xE9m b = 4.",
          "O volume da pir\xE2mide \xE9 um ter\xE7o do volume do prisma de mesma base e altura. O ap\xF3tema lateral \xE9 diferente da altura."
        ],
        cilindro: [
          "Desenrolando a superf\xEDcie",
          "Qual deve ser a largura do ret\xE2ngulo na planifica\xE7\xE3o do cilindro? Como ela se relaciona com o raio?",
          "Abra a planifica\xE7\xE3o e relacione a largura do ret\xE2ngulo \xE0 circunfer\xEAncia da base.",
          "A largura \xE9 2\u03C0r; a altura do ret\xE2ngulo \xE9 h. A \xE1rea lateral \xE9 2\u03C0rh, \xE0 qual somamos as \xE1reas dos dois discos."
        ],
        cone: [
          "Um cone, um cilindro e uma hip\xF3tese",
          "Um cone e um cilindro t\xEAm o mesmo raio e a mesma altura. Seus volumes s\xE3o iguais?",
          "Compare cone e cilindro com r = 3 e h = 4. Ative a geratriz e diferencie-a da altura.",
          "O cone tem um ter\xE7o do volume do cilindro correspondente. Sua planifica\xE7\xE3o \xE9 um setor circular de raio g mais o disco da base."
        ],
        esfera: [
          "A esfera pode virar um plano?",
          "O que acontece com a \xE1rea e o volume ao dobrar o raio? Por que n\xE3o h\xE1 planifica\xE7\xE3o exata da esfera?",
          "Compare r = 2 e r = 4. Discuta a diferen\xE7a entre uma esfera e uma superf\xEDcie cil\xEDndrica.",
          "Dobrar o raio quadruplica a \xE1rea e multiplica o volume por 8. A superf\xEDcie esf\xE9rica n\xE3o pode ser planificada sem deforma\xE7\xE3o."
        ]
      };
      const [title, question, experiment, answer] = lessons[type];
      return {
        ...base,
        title,
        question,
        steps: [
          "Antecipar: registre as hip\xF3teses da turma antes de alterar os controles.",
          experiment,
          "Explicar: confronte as hip\xF3teses com a visualiza\xE7\xE3o e com as f\xF3rmulas."
        ],
        answer
      };
    }
    if (current === "funcoes" && state.functions.mode !== "free" && state.functions.curves[state.functions.active].type !== "quadratica") {
      const type = state.functions.curves[state.functions.active].type, lessons = {
        afim: [
          "Inclina\xE7\xE3o e ponto de partida",
          "O que muda quando alteramos a? E quando mudamos apenas b?",
          "Compare y = 2x + 1, y = \u22122x + 1 e y = 2x + 3.",
          "O coeficiente a controla a inclina\xE7\xE3o e o sentido de crescimento. O coeficiente b \xE9 a ordenada na origem."
        ],
        exponencial: [
          "Crescer ou decrescer?",
          "O que acontece quando a base passa de 2 para 0,5? E se a base for 1?",
          "Mantenha a = 1 e c = 0. Compare b = 2, b = 0,5 e b = 1.",
          "Para a > 0, bases maiores que 1 produzem crescimento e bases entre 0 e 1 produzem decaimento. A base 1 produz uma constante."
        ],
        trigonometrica: [
          "O ritmo de uma onda",
          "Qual par\xE2metro muda a altura da onda? Qual muda o intervalo entre as repeti\xE7\xF5es?",
          "Compare b = 1 e b = 2; depois mantenha b = 1 e compare c = 1 e c = 2.",
          "Em a + b sen(cx + d), a amplitude \xE9 |b| e o per\xEDodo \xE9 2\u03C0/|c| para b e c n\xE3o nulos. A fase d desloca a onda horizontalmente em \u2212d/c. Na tangente, o per\xEDodo \xE9 \u03C0/|c|."
        ]
      };
      const [title, question, experiment, answer] = lessons[type] || [
        "Transforma\xE7\xF5es e dom\xEDnio",
        "Como a curva responde a cada coeficiente? Quais valores de x s\xE3o permitidos?",
        "Adicione uma segunda equa\xE7\xE3o e altere um coeficiente por vez.",
        "Compare o dom\xEDnio, a posi\xE7\xE3o da curva e seu comportamento. Registre as conclus\xF5es com a express\xE3o alg\xE9brica."
      ];
      return {
        ...plans.funcoes,
        title,
        question,
        steps: [
          "Antecipar: desenhe a transforma\xE7\xE3o esperada.",
          experiment,
          "Explicar: descreva o papel de cada par\xE2metro com palavras e express\xF5es."
        ],
        answer
      };
    }
    return plans[current];
  }
  function shell(title, subtitle, controls, content, subnav = "") {
    const plan = lessonPlan();
    return `<div class="lab"><div class="breadcrumb"><a href="#inicio">In\xEDcio</a><span>/</span><span>${title}</span></div><div class="lab-title"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="lab-actions"><button id="reset">\u21BA Reiniciar</button><button id="share">\u2197 Compartilhar</button><button id="present">\u26F6 ${document.body.classList.contains("presenting") ? "Sair da apresenta\xE7\xE3o" : "Apresentar"}</button></div></div>${subnav}<div class="workspace ${controlsOpen ? "controls-open" : ""}"><button class="mobile-controls" id="toggle-controls" aria-expanded="${controlsOpen}" aria-controls="lab-controls">Ajustar explora\xE7\xE3o <span>${controlsOpen ? "\u2212" : "\uFF0B"}</span></button><aside id="lab-controls" class="controls" aria-label="Controles do laborat\xF3rio">${controls}</aside><section class="stage-column" aria-label="Visualiza\xE7\xE3o e resultados">${content}</section></div><section class="insight"><h2>\u2733 Para investigar<br>com a turma</h2><p>${plan.question}</p><button id="lesson">Roteiro de aula \u2197</button></section><section class="teacher-notes" id="lesson-notes" hidden><div class="eyebrow">${plan.time} \xB7 INVESTIGA\xC7\xC3O GUIADA</div><h3>${plan.title}</h3><ol>${plan.steps.map((s) => `<li>${s}</li>`).join("")}</ol><details><summary>Notas para o professor</summary><p>${plan.answer}</p></details><button id="print">Imprimir roteiro</button></section></div>`;
  }
  function common() {
    $("#toggle-controls").onclick = () => {
      const open = $(".workspace").classList.toggle("controls-open");
      controlsOpen = open;
      $("#toggle-controls").setAttribute("aria-expanded", open);
      $("#toggle-controls").innerHTML = "Ajustar explora\xE7\xE3o <span>" + (open ? "\u2212" : "\uFF0B") + "</span>";
    };
    $("#reset").onclick = () => {
      if (current === "geometria") state.geometry = defaultGeometry();
      if (current === "funcoes") state.functions = defaultFunctions();
      if (current === "estatistica")
        Object.assign(state.stats, {
          text: "4; 5; 5; 6; 7; 7; 8; 8; 9; 11",
          sample: false
        });
      if (current === "probabilidade") {
        Object.assign(state.prob, {
          mode: "moeda",
          event: 0,
          p: 0.5,
          counts: [0, 0],
          history: []
        });
        Object.assign(state.conditional, {
          a: 30,
          b: 20,
          c: 10,
          d: 40,
          reverse: false
        });
        Object.assign(state.binomial, { n: 5, p: 0.5, tab: "pascal", k: 2 });
      }
      render();
    };
    $("#present").onclick = () => {
      document.body.classList.toggle("presenting");
      $("#present").textContent = document.body.classList.contains("presenting") ? "\u26F6 Sair da apresenta\xE7\xE3o" : "\u26F6 Apresentar";
    };
    $("#share").onclick = share;
    $("#lesson").onclick = () => {
      let el = $("#lesson-notes");
      el.hidden = !el.hidden;
      $("#lesson").setAttribute("aria-expanded", !el.hidden);
      if (!el.hidden) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    $("#print").onclick = () => window.print();
  }
  function geometry() {
    cleanupLab = mountGeometry({
      $,
      fmt,
      range,
      select,
      check,
      metric,
      shell,
      common,
      render,
      downloadSVG,
      state
    });
  }
  function downloadSVG(id, name) {
    let original = $("#" + id), copy = original.cloneNode(true);
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.insertAdjacentHTML(
      "afterbegin",
      '<style>text{font-family:sans-serif;fill:#203831;font-size:12px}.plot-value{font-weight:600}</style><rect width="100%" height="100%" fill="#fcfdf9"/>'
    );
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(copy)], {
        type: "image/svg+xml"
      })
    ), a = document.createElement("a");
    a.href = url;
    a.download = name + ".svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
    toast("Imagem SVG exportada.");
  }
  function functionsLab() {
    cleanupLab = mountFunctions({
      $,
      fmt,
      range,
      select,
      check,
      metric,
      shell,
      common,
      render,
      state,
      toast
    });
  }
  function statisticsLab() {
    const s = state.stats;
    $("#main").innerHTML = shell(
      "Estat\xEDstica",
      "Encontre hist\xF3rias nos dados. Investigue o que as medidas revelam.",
      `<div class="control-title">Seus dados <span>\u25A5</span></div><label class="field" for="data"><span>Valores do conjunto</span><textarea id="data" spellcheck="false">${esc(s.text)}</textarea></label><p class="small">Separe com espa\xE7o ou ponto e v\xEDrgula. Use v\xEDrgula para decimais: 4; 5,5; 7. At\xE9 500 valores.</p><button id="apply-data" class="primary wide">Atualizar dados</button><p class="error" id="data-error" role="alert"></p><div class="control-section"><h2>Experimente</h2><div class="inline-actions"><button id="outlier">+ Valor extremo</button><button id="example">Outro conjunto</button></div>${select(
        "variance-type",
        "C\xE1lculo da dispers\xE3o",
        [
          ["population", "Popula\xE7\xE3o (divide por n)"],
          ["sample", "Amostra (divide por n \u2212 1)"]
        ],
        s.sample ? "sample" : "population"
      )}<p class="small">Use popula\xE7\xE3o para descrever todo o grupo observado; amostra para estimar a vari\xE2ncia de uma popula\xE7\xE3o maior.</p></div>`,
      `<div class="stage-top"><strong>Distribui\xE7\xE3o dos valores</strong><span class="pill" id="data-count"></span></div><div class="stage"><svg id="stats-plot" viewBox="0 0 800 420" role="img" aria-label="Gr\xE1fico de frequ\xEAncias dos valores"></svg><div class="stage-tools"><button id="stats-export" aria-label="Baixar gr\xE1fico de dados">\u2193</button></div></div><div class="legend"><span><i></i>Frequ\xEAncia absoluta</span><span><i class="violet"></i>M\xE9dia (linha tracejada)</span></div><div class="metrics" id="central"></div><div class="metrics" id="dispersion"></div><div class="table-wrap"><details><summary class="small">Ver tabela de frequ\xEAncias e dados ordenados</summary><div id="stats-table"></div></details></div>`
    );
    $("#apply-data").onclick = () => {
      try {
        parseData($("#data").value);
        s.text = $("#data").value;
        drawStats();
        $("#data-error").textContent = "";
      } catch (e) {
        $("#data-error").textContent = e.message;
      }
    };
    $("#variance-type").onchange = (e) => {
      s.sample = e.target.value === "sample";
      drawStats();
    };
    $("#outlier").onclick = () => {
      let data = parseData(s.text);
      if (data.length >= 500) {
        toast("O limite \xE9 500 valores.");
        return;
      }
      let max = Math.max(...data), min = Math.min(...data), v = Math.min(1e9, max + Math.max(1, max - min) * 5);
      data.push(v);
      s.text = data.map((n) => String(n).replace(".", ",")).join("; ");
      $("#data").value = s.text;
      drawStats();
    };
    $("#example").onclick = () => {
      s.text = "2; 2; 4; 4; 6; 6; 8; 8; 10; 10";
      $("#data").value = s.text;
      drawStats();
    };
    $("#stats-export").onclick = () => downloadSVG("stats-plot", "estatistica");
    drawStats();
    common();
  }
  function drawStats() {
    let s = state.stats, values = parseData(s.text), m = statistics(values, s.sample);
    $("#data-count").textContent = m.n + " OBSERVA\xC7\xD5ES";
    $("#central").innerHTML = metric("M\xE9dia", fmt(m.mean), "Soma dos valores \xF7 n") + metric("Mediana", fmt(m.median), "Centro dos dados ordenados") + metric(
      "Moda",
      m.modes.length ? m.modes.slice(0, 5).map((x) => fmt(x)).join("; ") + (m.modes.length > 5 ? "\u2026" : "") : "Amodal",
      m.modes.length ? "Maior frequ\xEAncia" : "Nenhum valor se repete"
    );
    $("#dispersion").innerHTML = metric("Amplitude", fmt(m.range), "M\xE1ximo \u2212 m\xEDnimo") + metric(
      "Vari\xE2ncia " + (s.sample ? "amostral" : "populacional"),
      fmt(m.variance),
      m.variance === null ? "Necessita de n \u2265 2" : "Soma dos desvios\xB2 \xF7 " + (s.sample ? "(n \u2212 1)" : "n")
    ) + metric("Desvio padr\xE3o", fmt(m.std), "Raiz quadrada da vari\xE2ncia");
    let entries = [...m.frequencies].sort((a, b) => a[0] - b[0]), binned = entries.length > 25, bins;
    if (binned) {
      let count = 12, w = (m.max - m.min) / count;
      bins = Array.from({ length: count }, (_, i) => ({
        x: m.min + (i + 0.5) * w,
        n: 0,
        label: fmt(m.min + i * w) + " a " + fmt(m.min + (i + 1) * w)
      }));
      values.forEach(
        (v) => bins[Math.min(count - 1, Math.floor((v - m.min) / w))].n++
      );
    } else bins = entries.map(([x, n]) => ({ x, n, label: fmt(x) }));
    let span = m.max - m.min || 2, lo = m.min - span * 0.1, hi = m.max + span * 0.1, X = (x) => 70 + (x - lo) / (hi - lo) * 660, peak = Math.max(...bins.map((b) => b.n)), V = (y) => 340 - y / peak * 265, width = binned ? 660 / bins.length * 0.8 : Math.min(
      45,
      ...bins.slice(1).map((b, i) => (X(b.x) - X(bins[i].x)) * 0.75)
    );
    let html = '<text x="70" y="27" class="plot-label">Frequ\xEAncia</text>';
    for (let i = 0; i <= 4; i++) {
      let n = peak * i / 4;
      html += `<path d="M70 ${V(n)}H740" stroke="#e0e6dc"/><text x="57" y="${V(n) + 4}" text-anchor="end" class="plot-label">${fmt(n, 1)}</text>`;
    }
    bins.forEach(
      (b, i) => html += `<rect x="${X(b.x) - width / 2}" y="${V(b.n)}" width="${width}" height="${340 - V(b.n)}" rx="4" fill="#94b57f"><title>${esc(b.label)}: ${b.n}</title></rect><text x="${X(b.x)}" y="${V(b.n) - 9}" text-anchor="middle" class="plot-value">${b.n}</text>${bins.length <= 12 || i % 2 === 0 ? `<text x="${X(b.x)}" y="364" text-anchor="middle" class="plot-label">${fmt(b.x, 1)}</text>` : ""}`
    );
    html += `<path d="M${X(m.mean)} 45V341" stroke="#7557a4" stroke-width="2" stroke-dasharray="6 5"/><text x="${Math.max(90, Math.min(680, X(m.mean) + 8))}" y="48" fill="#7557a4" font-family="sans-serif" font-size="12">M\xE9dia ${fmt(m.mean)}</text><text x="400" y="400" text-anchor="middle" class="plot-label">${binned ? "Valores agrupados em 12 intervalos (r\xF3tulos nos centros)" : "Valor observado"}</text>`;
    $("#stats-plot").innerHTML = html;
    $("#stats-table").innerHTML = `<p class="small">${m.sorted.map((x) => fmt(x)).join(" \xB7 ")}</p><table class="data-table"><thead><tr><th>Valor</th><th>Frequ\xEAncia</th><th>Frequ\xEAncia relativa</th></tr></thead><tbody>${entries.map(([v, n]) => `<tr><td>${fmt(v)}</td><td>${n}</td><td>${pct(n / m.n)}</td></tr>`).join("")}</tbody></table>`;
  }
  function probabilityLab() {
    const tabs = [
      ["simulacao", "Experimentos"],
      ["condicional", "Probabilidade condicional"],
      ["binomio", "Bin\xF4mio de Newton"]
    ], s = state.prob, subnav = `<div class="subnav" aria-label="T\xF3picos de probabilidade">${tabs.map(([id, l]) => `<button data-prob="${id}" class="${s.tab === id ? "selected" : ""}" aria-pressed="${s.tab === id}">${l}</button>`).join("")}</div>`;
    if (s.tab === "simulacao") simulation(subnav);
    else if (s.tab === "condicional") conditionalLab(subnav);
    else binomialLab(subnav);
    document.querySelectorAll("[data-prob]").forEach(
      (b) => b.onclick = () => {
        s.tab = b.dataset.prob;
        render();
      }
    );
    common();
  }
  function simulation(subnav) {
    const s = state.prob, labels = s.mode === "moeda" ? ["Cara", "Coroa"] : s.mode === "dado" ? ["1", "2", "3", "4", "5", "6"] : Array.from({ length: 11 }, (_, i) => String(i + 2));
    $("#main").innerHTML = shell(
      "Probabilidade",
      "Experimente o acaso. Compare previs\xF5es e resultados.",
      `<div class="control-title">Seu experimento <span>\u2684</span></div>${select(
        "experiment",
        "O que vamos lan\xE7ar?",
        [
          ["moeda", "Uma moeda"],
          ["dado", "Um dado de 6 faces"],
          ["dois", "Dois dados \xB7 soma"]
        ],
        s.mode
      )}${select(
        "event",
        "Evento observado",
        labels.map((l, i) => [String(i), l]),
        String(s.event)
      )}${s.mode === "moeda" ? range("coin-p", "Probabilidade de cara", s.p, 0, 1, 0.05) : '<p class="small">Dados equilibrados e lan\xE7amentos independentes.</p>'}<div class="control-section"><h2>Simular lan\xE7amentos</h2><button id="roll-one" class="primary wide">Lan\xE7ar uma vez</button><div class="inline-actions"><button data-roll="10">+ 10</button><button data-roll="100">+ 100</button><button data-roll="1000">+ 1.000</button></div><button id="clear-rolls" class="quiet wide">Limpar resultados</button><p class="small">Os resultados s\xE3o aleat\xF3rios. Mudar o experimento ou a probabilidade inicia uma nova amostra.</p><div id="last-roll" class="small" role="status"></div></div>`,
      `<div class="stage-top"><strong>Frequ\xEAncia observada \xD7 probabilidade</strong><span class="pill">SIMULA\xC7\xC3O</span></div><div class="stage"><svg id="prob-plot" viewBox="0 0 800 380" role="img" aria-label="Compara\xE7\xE3o das frequ\xEAncias observadas e te\xF3ricas"></svg></div><div class="legend"><span><i></i>Frequ\xEAncia observada</span><span><i class="violet"></i>Probabilidade te\xF3rica (tra\xE7o)</span></div><div class="metrics" id="prob-metrics" aria-live="polite"></div><div class="table-wrap"><details><summary class="small">Contagens e frequ\xEAncias</summary><div id="prob-table"></div></details></div>`,
      subnav
    );
    $("#experiment").onchange = (e) => {
      s.mode = e.target.value;
      s.event = 0;
      s.counts = Array(s.mode === "moeda" ? 2 : s.mode === "dado" ? 6 : 11).fill(
        0
      );
      s.history = [];
      render();
    };
    $("#event").onchange = (e) => {
      s.event = +e.target.value;
      drawProbability();
    };
    if ($("#coin-p"))
      bindRange("coin-p", s, "p", () => {
        s.counts = [0, 0];
        s.history = [];
        drawProbability();
      });
    $("#roll-one").onclick = () => roll(1);
    document.querySelectorAll("[data-roll]").forEach((b) => b.onclick = () => roll(+b.dataset.roll));
    $("#clear-rolls").onclick = () => {
      s.counts.fill(0);
      s.history = [];
      drawProbability();
      $("#last-roll").textContent = "Amostra reiniciada.";
    };
    drawProbability();
  }
  function random() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  }
  function roll(n) {
    const s = state.prob;
    let last;
    for (let i = 0; i < n; i++) {
      last = s.mode === "moeda" ? random() < s.p ? 0 : 1 : s.mode === "dado" ? Math.floor(random() * 6) : Math.floor(random() * 6) + Math.floor(random() * 6);
      s.counts[last]++;
    }
    drawProbability();
    $("#last-roll").textContent = `\xDAltimo resultado: ${s.mode === "moeda" ? last === 0 ? "cara" : "coroa" : s.mode === "dado" ? last + 1 : last + 2}.`;
  }
  function drawProbability() {
    const s = state.prob, total = s.counts.reduce((a, b) => a + b, 0), theory = s.mode === "moeda" ? [s.p, 1 - s.p] : s.mode === "dado" ? Array(6).fill(1 / 6) : Array.from({ length: 11 }, (_, i) => (6 - Math.abs(i - 5)) / 36), labels = s.mode === "moeda" ? ["Cara", "Coroa"] : s.mode === "dado" ? ["1", "2", "3", "4", "5", "6"] : Array.from({ length: 11 }, (_, i) => String(i + 2)), peak = Math.max(
      0.2,
      ...theory,
      ...s.counts.map((n) => total ? n / total : 0)
    ) * 1.2, Y = (v) => 300 - v / peak * 240;
    let html = "";
    for (let i = 0; i <= 4; i++) {
      let v = peak * i / 4;
      html += `<path d="M70 ${Y(v)}H740" stroke="#e0e6dc"/><text x="58" y="${Y(v) + 4}" text-anchor="end" class="plot-label">${pct(v)}</text>`;
    }
    const step = 650 / s.counts.length;
    labels.forEach((l, i) => {
      let x = 80 + step * (i + 0.5), width = Math.min(90, step * 0.6), v = total ? s.counts[i] / total : 0;
      html += `<rect x="${x - width / 2}" y="${Y(v)}" width="${width}" height="${300 - Y(v)}" fill="${i === s.event ? "#316449" : "#a8c299"}" rx="4"/><path d="M${x - width / 2 - 5} ${Y(theory[i])}h${width + 10}" stroke="#7557a4" stroke-width="3"/><text x="${x}" y="325" text-anchor="middle" class="plot-label">${l}</text>${total ? `<text x="${x}" y="${Y(v) - 12}" text-anchor="middle" class="plot-value">${pct(v)}</text>` : ""}`;
    });
    if (!total)
      html += '<text x="400" y="170" text-anchor="middle" class="plot-title">O que voc\xEA espera encontrar?</text><text x="400" y="195" text-anchor="middle" class="plot-label">Fa\xE7a o primeiro lan\xE7amento para come\xE7ar.</text>';
    $("#prob-plot").innerHTML = html;
    $("#prob-metrics").innerHTML = metric("Lan\xE7amentos", fmt(total, 0)) + metric(
      "Frequ\xEAncia de " + labels[s.event],
      total ? pct(s.counts[s.event] / total) : "\u2014",
      fmt(s.counts[s.event], 0) + " ocorr\xEAncias"
    ) + metric("Probabilidade te\xF3rica", pct(theory[s.event]), labels[s.event]);
    $("#prob-table").innerHTML = `<table class="data-table"><thead><tr><th>Resultado</th><th>Contagem</th><th>Observada</th><th>Te\xF3rica</th></tr></thead><tbody>${labels.map((l, i) => `<tr><td>${l}${i === s.event ? " \u2605" : ""}</td><td>${s.counts[i]}</td><td>${total ? pct(s.counts[i] / total) : "\u2014"}</td><td>${pct(theory[i])}</td></tr>`).join("")}</tbody></table><p class="small">Simula\xE7\xE3o pseudoaleat\xF3ria do navegador. Cada lan\xE7amento \xE9 independente.</p>`;
  }
  function conditionalLab(subnav) {
    const s = state.conditional;
    let field2 = (id, label) => `<label class="field" for="group-${id}"><span>${label}</span><input type="number" id="group-${id}" value="${s[id]}" min="0" max="1000" step="1"></label>`;
    $("#main").innerHTML = shell(
      "Probabilidade",
      "Quando sabemos algo, o espa\xE7o de possibilidades muda.",
      `<div class="control-title">Uma turma fict\xEDcia</div><p class="small"><strong>A:</strong> gosta de matem\xE1tica.<br><strong>B:</strong> participa do clube de ci\xEAncias.</p><div class="two-cols">${field2("a", "A e B")}${field2("b", "A e n\xE3o B")}${field2("c", "N\xE3o A e B")}${field2("d", "Nem A nem B")}</div><p class="error" id="conditional-error" role="alert"></p><div class="control-section">${select(
        "condition",
        "O que queremos saber?",
        [
          ["normal", "P(A | B)"],
          ["reverse", "P(B | A)"]
        ],
        s.reverse ? "reverse" : "normal"
      )}<p class="small" id="condition-explanation"></p></div>`,
      `<div class="stage-top"><strong>Diagrama de frequ\xEAncias</strong><span class="pill">CONDI\xC7\xC3O EM DESTAQUE</span></div><div class="stage"><svg id="conditional-plot" viewBox="0 0 800 400" role="img" aria-label="Diagrama das quatro regi\xF5es de eventos"></svg></div><div class="prob-result" id="conditional-result" aria-live="polite"></div><div class="metrics" id="conditional-metrics"></div><div class="table-wrap" id="conditional-table"></div>`,
      subnav
    );
    ["a", "b", "c", "d"].forEach(
      (k) => $("#group-" + k).oninput = (e) => {
        let v = +e.target.value;
        if (e.target.value === "" || !Number.isInteger(v) || v < 0 || v > 1e3) {
          $("#conditional-error").textContent = "Use contagens inteiras entre 0 e 1.000.";
          return;
        }
        s[k] = v;
        $("#conditional-error").textContent = "";
        drawConditional();
      }
    );
    $("#condition").onchange = (e) => {
      s.reverse = e.target.value === "reverse";
      drawConditional();
    };
    drawConditional();
    const insight = $(".insight p");
    insight.textContent = "P(A | B) \xE9 sempre igual a P(B | A)? Mude as contagens e explique por que o denominador faz diferen\xE7a.";
    $("#lesson-notes").innerHTML = `<h3>O denominador muda a pergunta</h3><ol><li>Compare P(A | B) e P(B | A) com as contagens iniciais.</li><li>Na primeira, o universo \xE9 o clube: 30 de 40. Na segunda, \xE9 o grupo que gosta de matem\xE1tica: 30 de 50.</li><li>Zere as duas contagens que comp\xF5em uma condi\xE7\xE3o. Discuta por que a probabilidade fica indefinida.</li></ol><details><summary>Notas para o professor</summary><p>Nos dados iniciais, P(A | B) = 75% e P(B | A) = 60%. Para independ\xEAncia, compare P(A \u2229 B) com P(A)P(B).</p></details><button id="print">Imprimir roteiro</button>`;
  }
  function drawConditional() {
    const s = state.conditional, m = conditional(s.a, s.b, s.c, s.d), den = s.a + (s.reverse ? s.b : s.c), value = s.reverse ? m.pbGivenA : m.paGivenB, formula = s.reverse ? "P(B | A)" : "P(A | B)";
    $("#condition-explanation").textContent = s.reverse ? "Entre quem gosta de matem\xE1tica, qual \xE9 a propor\xE7\xE3o que participa do clube?" : "Entre os participantes do clube, qual \xE9 a propor\xE7\xE3o que gosta de matem\xE1tica?";
    const cells = [
      ["A \u2229 B", s.a, true, 80, 60],
      ["A \u2229 n\xE3o B", s.b, s.reverse, 410, 60],
      ["N\xE3o A \u2229 B", s.c, !s.reverse, 80, 225],
      ["Nem A nem B", s.d, false, 410, 225]
    ];
    $("#conditional-plot").innerHTML = cells.map(
      ([l, v, on, x, y], i) => `<rect x="${x}" y="${y}" width="308" height="132" rx="12" fill="${i === 0 ? "#316449" : on ? "#dce8ce" : "#eef0e9"}" stroke="${on ? "#688561" : "#e0e6dc"}" stroke-width="${on ? 2 : 1}"/><text x="${x + 22}" y="${y + 33}" fill="${i === 0 ? "#fff" : "#4e6654"}" font-size="13" font-family="sans-serif">${l}${on ? " \xB7 condi\xE7\xE3o" : ""}</text><text x="${x + 22}" y="${y + 91}" fill="${i === 0 ? "#fff" : "#4e6654"}" font-size="37" font-family="sans-serif">${v}</text>`
    ).join("") + '<text x="400" y="389" text-anchor="middle" class="plot-label">Regi\xF5es esquem\xE1ticas: \xE1reas dos ret\xE2ngulos n\xE3o representam propor\xE7\xF5es.</text>';
    $("#conditional-result").innerHTML = `<span class="big">${pct(value)}</span><div><strong>${formula} = ${s.a} / ${den}</strong><p>${den ? "Ocorr\xEAncias na interse\xE7\xE3o \xF7 total da condi\xE7\xE3o." : "Condi\xE7\xE3o vazia: divis\xE3o por zero, probabilidade indefinida."}</p></div>`;
    $("#conditional-metrics").innerHTML = metric("Total da turma", m.total) + metric("P(A)", pct(m.pa)) + metric("P(B)", pct(m.pb));
    $("#conditional-table").innerHTML = `<table class="data-table"><caption>Contagens da turma fict\xEDcia</caption><thead><tr><th></th><th>B</th><th>N\xE3o B</th><th>Total</th></tr></thead><tbody><tr><th>A</th><td>${s.a}</td><td>${s.b}</td><td>${s.a + s.b}</td></tr><tr><th>N\xE3o A</th><td>${s.c}</td><td>${s.d}</td><td>${s.c + s.d}</td></tr><tr><th>Total</th><td>${s.a + s.c}</td><td>${s.b + s.d}</td><td>${m.total}</td></tr></tbody></table>`;
  }
  function binomialLab(subnav) {
    const s = state.binomial;
    $("#main").innerHTML = shell(
      "Probabilidade",
      "Encontre a conex\xE3o entre combina\xE7\xF5es, \xE1lgebra e acaso.",
      `<div class="control-title">Bin\xF4mio de Newton</div>${range("bin-n", "Expoente / ensaios (n)", s.n, 0, 10)}${select(
        "bin-view",
        "Representa\xE7\xE3o",
        [
          ["pascal", "Tri\xE2ngulo de Pascal"],
          ["distribution", "Distribui\xE7\xE3o binomial"]
        ],
        s.tab
      )}<div class="control-section">${range("bin-p", "Probabilidade de sucesso (p)", s.p, 0, 1, 0.05)}${range("bin-k", "Sucessos observados (k)", s.k, 0, s.n)}<p class="small">Na distribui\xE7\xE3o binomial, os n ensaios s\xE3o independentes e t\xEAm a mesma probabilidade p de sucesso.</p></div>`,
      `<div class="stage-top"><strong id="bin-title"></strong><span class="pill">PADR\xD5ES E COMBINA\xC7\xD5ES</span></div><div class="stage" id="bin-stage"></div><div class="expansion" id="expansion"></div><div class="metrics" id="bin-metrics"></div><div class="formula-panel"><span class="formula">P(X = k) = C(n,k) \xB7 p\u1D4F \xB7 (1 \u2212 p)\u207F\u207B\u1D4F</span><p>C(n,k) = n! / [k!(n \u2212 k)!]. Cada coeficiente conta as escolhas de k elementos entre n.</p></div>`,
      subnav
    );
    bindRange("bin-n", s, "n", () => {
      s.k = Math.min(s.k, s.n);
      $("#bin-k").max = s.n;
      $("#bin-k").value = s.k;
      $("#bin-k-out").textContent = s.k;
      drawBinomial();
    });
    bindRange("bin-p", s, "p", drawBinomial);
    bindRange("bin-k", s, "k", drawBinomial);
    $("#bin-view").onchange = (e) => {
      s.tab = e.target.value;
      drawBinomial();
    };
    drawBinomial();
    $(".insight p").textContent = "Por que os coeficientes de (a + b)\u207F s\xE3o os mesmos da linha n do tri\xE2ngulo de Pascal? O que muda na distribui\xE7\xE3o quando p deixa de ser 0,5?";
    $("#lesson-notes").innerHTML = `<h3>Da soma de vizinhos ao bin\xF4mio</h3><ol><li>Observe as linhas 0 a 5 de Pascal. Cada termo interno \xE9 a soma dos dois termos acima.</li><li>Compare a linha n com os coeficientes de (a + b)\u207F. Para n = 0, o resultado \xE9 1.</li><li>Abra a distribui\xE7\xE3o binomial. Explore p = 0,5, p = 0,2 e os extremos 0 e 1.</li></ol><details><summary>Notas para o professor</summary><p>C(n,k) conta as escolhas das posi\xE7\xF5es dos k fatores b. A soma da linha \xE9 2\u207F, pois basta substituir a = b = 1. A distribui\xE7\xE3o tem m\xE9dia np e vari\xE2ncia np(1 \u2212 p).</p></details><button id="print">Imprimir roteiro</button>`;
  }
  function drawBinomial() {
    const s = state.binomial, probs = binomial(s.n, s.p);
    $("#bin-title").textContent = s.tab === "pascal" ? "Tri\xE2ngulo de Pascal \xB7 linha " + s.n : "Distribui\xE7\xE3o binomial";
    if (s.tab === "pascal") {
      $("#bin-stage").innerHTML = `<div class="pascal" role="img" aria-label="Tri\xE2ngulo de Pascal, linha ${s.n}: ${Array.from({ length: s.n + 1 }, (_, k) => choose(s.n, k)).join(", ")}">${Array.from({ length: 11 }, (_, n) => `<div class="pascal-row ${n === s.n ? "current" : ""}"><span class="small" style="width:29px;padding-top:6px">${n}</span>${Array.from({ length: n + 1 }, (_2, k) => `<span class="pascal-cell" title="C(${n},${k}) = ${choose(n, k)}">${choose(n, k)}</span>`).join("")}</div>`).join("")}</div>`;
    } else {
      let max = Math.max(...probs), step = 650 / (s.n + 1);
      $("#bin-stage").innerHTML = `<svg viewBox="0 0 800 400" role="img" aria-label="Probabilidades para cada quantidade de sucessos"><path d="M65 330H745" stroke="#8b9b87"/>${probs.map((p, k) => {
        let x = 75 + (k + 0.5) * step, w = Math.min(step * 0.65, 120), h = p / max * 245;
        return `<rect x="${x - w / 2}" y="${330 - h}" width="${w}" height="${h}" rx="4" fill="${k === s.k ? "#316449" : "#b1c99c"}"/><text x="${x}" y="${320 - h}" text-anchor="middle" class="plot-value">${pct(p)}</text><text x="${x}" y="355" text-anchor="middle" class="plot-label">${k}</text>`;
      }).join(
        ""
      )}<text x="400" y="390" text-anchor="middle" class="plot-label">N\xFAmero de sucessos (k)</text></svg>`;
    }
    const sup = (n) => n === 1 ? "" : `<sup>${n}</sup>`, terms = Array.from({ length: s.n + 1 }, (_, k) => {
      let c = choose(s.n, k), term = (s.n - k ? "a" + sup(s.n - k) : "") + (k ? "b" + sup(k) : "");
      return (c === 1 && term ? "" : c) + term;
    });
    $("#expansion").innerHTML = `(a + b)<sup>${s.n}</sup> = ${terms.join(" + ")}`;
    $("#bin-metrics").innerHTML = metric(`Combina\xE7\xF5es C(${s.n},${s.k})`, choose(s.n, s.k)) + metric(`P(X = ${s.k})`, pct(probs[s.k])) + metric(
      "M\xE9dia \xB7 vari\xE2ncia",
      `${fmt(s.n * s.p)} \xB7 ${fmt(s.n * s.p * (1 - s.p))}`,
      "np \xB7 np(1 \u2212 p)"
    );
  }
  function showDialog(html) {
    $("#dialog-content").innerHTML = html;
    $("#dialog").showModal();
  }
  function guide() {
    showDialog(
      `<div class="eyebrow">PARA QUEM ENSINA</div><h2>Uma boa pergunta abre<br>muitas descobertas.</h2><p>Use os laborat\xF3rios como um espa\xE7o de investiga\xE7\xE3o: a turma formula hip\xF3teses, testa ideias e constr\xF3i explica\xE7\xF5es.</p>${[
        [
          "01",
          "Antes de mover, pergunte.",
          "Convide os alunos a prever o resultado. Registre hip\xF3teses no quadro, sem corrigi-las de imediato."
        ],
        [
          "02",
          "Mude uma coisa de cada vez.",
          "Altere um par\xE2metro, compare o que mudou e pe\xE7a que os grupos encontrem um padr\xE3o."
        ],
        [
          "03",
          "Pe\xE7a uma explica\xE7\xE3o.",
          "Conecte a visualiza\xE7\xE3o, os n\xFAmeros e a express\xE3o matem\xE1tica. Teste tamb\xE9m casos extremos."
        ]
      ].map(
        ([n, t, p]) => `<div class="guide-step"><b>${n}</b><div><strong>${t}</strong><p>${p}</p></div></div>`
      ).join(
        ""
      )}<p><strong>Na sala:</strong> use \u201CApresentar\u201D para ampliar a bancada, \u201CRoteiro de aula\u201D para orientar a investiga\xE7\xE3o e \u201CCompartilhar\u201D para abrir a mesma configura\xE7\xE3o em outro dispositivo. Os dados ficam nesta aba; baixar ou compartilhar \xE9 uma a\xE7\xE3o sua.</p><p><strong>Acessibilidade:</strong> controles por teclado, tabelas alternativas aos gr\xE1ficos e modo de impress\xE3o. Use as setas do teclado no s\xF3lido para girar.</p>`
    );
  }
  function share() {
    const payload = current === "geometria" ? state.geometry : current === "funcoes" ? state.functions : current === "estatistica" ? state.stats : {
      prob: { ...state.prob, counts: void 0, history: void 0 },
      conditional: state.conditional,
      binomial: state.binomial
    };
    const url = new URL(location.href);
    url.hash = current + "?s=" + encodeURIComponent(JSON.stringify(payload));
    navigator.clipboard?.writeText(url.href).then(() => toast("Link copiado com a configura\xE7\xE3o atual.")).catch(() => shareFallback(url.href));
    if (!navigator.clipboard) shareFallback(url.href);
  }
  function shareFallback(url) {
    showDialog(
      `<h2>Compartilhar explora\xE7\xE3o</h2><p>Copie o link abaixo. Ele abre os mesmos par\xE2metros; lan\xE7amentos simulados come\xE7am do zero.</p><label class="field"><span>Link da atividade</span><textarea readonly>${esc(url)}</textarea></label>`
    );
  }
  function restore() {
    let raw = location.hash.slice(1), [route, query] = raw.split("?");
    current = topics.some((t) => t[0] === route) ? route : "inicio";
    if (!query) return;
    try {
      let data = JSON.parse(new URLSearchParams(query).get("s"));
      if (!data || typeof data !== "object") return;
      const apply = (dest, src) => {
        if (!src || typeof src !== "object") return;
        for (const k of Object.keys(dest)) {
          if (["counts", "history"].includes(k)) continue;
          if (typeof dest[k] === "number" && typeof src[k] === "number" && Number.isFinite(src[k]))
            dest[k] = src[k];
          if (typeof dest[k] === "boolean" && typeof src[k] === "boolean")
            dest[k] = src[k];
          if (typeof dest[k] === "string" && typeof src[k] === "string" && src[k].length < 12e3)
            dest[k] = src[k];
        }
      };
      if (current === "geometria") state.geometry = sanitizeGeometry(data);
      if (current === "funcoes") state.functions = sanitizeFunctions(data);
      if (current === "estatistica") {
        apply(state.stats, data);
        parseData(state.stats.text);
      }
      if (current === "probabilidade") {
        apply(state.prob, data.prob);
        apply(state.conditional, data.conditional);
        apply(state.binomial, data.binomial);
      }
    } catch {
      toast("N\xE3o foi poss\xEDvel restaurar a configura\xE7\xE3o do link.");
    }
    sanitize();
  }
  function sanitize() {
    const clamp = (o, k, min, max, integer = false) => {
      o[k] = Math.max(min, Math.min(max, o[k]));
      if (integer) o[k] = Math.round(o[k]);
    }, option = (o, k, list) => {
      if (!list.includes(o[k])) o[k] = list[0];
    };
    state.geometry = sanitizeGeometry(state.geometry);
    state.functions = sanitizeFunctions(state.functions);
    try {
      parseData(state.stats.text);
    } catch {
      state.stats.text = "4; 5; 5; 6; 7; 7; 8; 8; 9; 11";
    }
    let p = state.prob;
    option(p, "tab", ["simulacao", "condicional", "binomio"]);
    option(p, "mode", ["moeda", "dado", "dois"]);
    clamp(p, "p", 0, 1);
    const count = p.mode === "moeda" ? 2 : p.mode === "dado" ? 6 : 11;
    clamp(p, "event", 0, count - 1, true);
    if (p.counts.length !== count) p.counts = Array(count).fill(0);
    ["a", "b", "c", "d"].forEach(
      (k) => clamp(state.conditional, k, 0, 1e3, true)
    );
    let b = state.binomial;
    clamp(b, "n", 0, 10, true);
    clamp(b, "k", 0, b.n, true);
    clamp(b, "p", 0, 1);
    option(b, "tab", ["pascal", "distribution"]);
  }
  function refreshBranding() {
    const brand = $(".brand");
    brand.setAttribute("aria-label", "Explore a Matem\xE1tica, in\xEDcio");
    brand.lastElementChild.innerHTML = "explore a<br><strong>matem\xE1tica</strong>";
    $(".header nav").innerHTML = '<a href="#inicio">In\xEDcio</a><a href="#funcoes">Fun\xE7\xF5es</a><a href="#geometria">Geometria</a><a href="#estatistica">Estat\xEDstica</a><a href="#probabilidade">Probabilidade</a>';
    $(".footer-brand").innerHTML = "explore a matem\xE1tica <span>\u2733</span>";
  }
  function render() {
    refreshBranding();
    cleanupLab();
    cleanupLab = () => {
    };
    document.querySelectorAll(".header nav a").forEach((a) => {
      let active = a.hash === "#" + current;
      a.classList.toggle("active", active);
      active ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    });
    document.title = (topics.find((t) => t[0] === current)?.[1] || "Experimente, observe, explique") + " \xB7 Explore a Matem\xE1tica";
    if (current === "inicio") {
      $("#main").innerHTML = home();
      $("#home-guide").onclick = guide;
      document.body.classList.remove("presenting");
    } else if (current === "geometria") geometry();
    else if (current === "funcoes") functionsLab();
    else if (current === "estatistica") statisticsLab();
    else probabilityLab();
  }
  $("#teacher-guide").onclick = guide;
  $("#dialog .dialog-close").onclick = () => $("#dialog").close();
  $("#dialog").addEventListener("click", (e) => {
    if (e.target === $("#dialog")) {
      let r = $("#dialog").getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        $("#dialog").close();
    }
  });
  $("#about").onclick = () => showDialog(
    `<p>Laborat\xF3rios para apoiar professores do Ensino Fundamental e M\xE9dio em aulas investigativas. As representa\xE7\xF5es s\xE3o modelos did\xE1ticos; combine a explora\xE7\xE3o digital com argumentos, registros e materiais concretos.</p><p>Sem cadastro, an\xFAncios ou coleta de dados. As fontes s\xE3o hospedadas junto com o site, sem requisi\xE7\xF5es a servi\xE7os de terceiros. Os experimentos e os c\xE1lculos acontecem no navegador.</p>`
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("presenting")) {
      document.body.classList.remove("presenting");
      if ($("#present")) $("#present").textContent = "\u26F6 Apresentar";
    }
  });
  $(".skip").onclick = (e) => {
    e.preventDefault();
    $("#main").focus();
    $("#main").scrollIntoView();
  };
  window.addEventListener("hashchange", () => {
    controlsOpen = false;
    restore();
    render();
    window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
  });
  restore();
  render();
})();
