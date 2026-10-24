import { mesh, solidMetrics } from "./math.js";
export const SOLID_NAMES = {
  cubo: "Cubo",
  prisma: "Prisma retangular",
  piramide: "Pirâmide quadrangular",
  cilindro: "Cilindro",
  cone: "Cone",
  esfera: "Esfera",
};
export const FACE_COLORS = [
  "#c5d9b0",
  "#8fb28b",
  "#d7e3c2",
  "#a8c99f",
  "#c4d5ad",
  "#e1e9cf",
];
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const norm = (v) => Math.hypot(...v);
export const scale = (v, k) => v.map((x) => x * k);
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function area3D(points) {
  let result = 0;
  for (let i = 1; i < points.length - 1; i++)
    result +=
      norm(
        cross(
          add(points[i], scale(points[0], -1)),
          add(points[i + 1], scale(points[0], -1)),
        ),
      ) / 2;
  return result;
}
export const CAMERA_VIEWS = {
  perspective: { label: "Perspectiva 3D", rx: 0.38, ry: 0.56 },
  front: { label: "Frontal", rx: 0, ry: 0 },
  right: { label: "Lateral direita", rx: 0, ry: -Math.PI / 2 },
  left: { label: "Lateral esquerda", rx: 0, ry: Math.PI / 2 },
  top: { label: "Superior", rx: Math.PI / 2, ry: 0 },
  bottom: { label: "Inferior", rx: -Math.PI / 2, ry: 0 },
  back: { label: "Traseira", rx: 0, ry: Math.PI },
};
export function cameraAngles(s) {
  let { rx, ry } = s;
  if (s.view === "net" && s.camera === "perspective") {
    const t = s.opening / 100;
    rx =
      s.type === "cilindro" ? rx * (1 - t) : rx * (1 - t) + (Math.PI / 2) * t;
    ry *= 1 - t;
  }
  return { rx, ry };
}
export function defaultGeometry() {
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
    zoom: 1,
  };
}
const face = (points, i = 0, extra = {}) => ({
  points,
  color: FACE_COLORS[i % 6],
  ...extra,
});
export function cuboidNet(a, h, b, t) {
  const q = (t * Math.PI) / 2,
    C = Math.cos(q),
    S = Math.sin(q),
    base = [
      [-a / 2, 0, -b / 2],
      [a / 2, 0, -b / 2],
      [a / 2, 0, b / 2],
      [-a / 2, 0, b / 2],
    ],
    north = (u, v) => [u, v * C, -b / 2 - v * S],
    south = (u, v) => [u, v * C, b / 2 + v * S],
    west = (u, v) => [-a / 2 - v * S, v * C, u],
    east = (u, v) => [a / 2 + v * S, v * C, u],
    panel = (fn, w) => [
      fn(-w / 2, 0),
      fn(w / 2, 0),
      fn(w / 2, h),
      fn(-w / 2, h),
    ],
    top = (u, v) => [
      u,
      h * C + v * Math.sin(2 * q),
      -b / 2 - h * S + v * Math.cos(2 * q),
    ];
  return [
    face(base, 0),
    face(panel(north, a), 1),
    face(panel(south, a), 2),
    face(panel(west, b), 3),
    face(panel(east, b), 4),
    face([top(-a / 2, 0), top(a / 2, 0), top(a / 2, b), top(-a / 2, b)], 5),
  ];
}
export function pyramidNet(a, h, t) {
  const q = (Math.PI - Math.atan2(h, a / 2)) * t,
    C = Math.cos(q),
    S = Math.sin(q),
    v = h * C + (a / 2) * S,
    w = h * S - (a / 2) * C;
  return [
    face(
      [
        [-a / 2, 0, -a / 2],
        [a / 2, 0, -a / 2],
        [a / 2, 0, a / 2],
        [-a / 2, 0, a / 2],
      ],
      0,
    ),
    face(
      [
        [-a / 2, 0, -a / 2],
        [a / 2, 0, -a / 2],
        [0, v, -a / 2 - w],
      ],
      1,
    ),
    face(
      [
        [a / 2, 0, -a / 2],
        [a / 2, 0, a / 2],
        [a / 2 + w, v, 0],
      ],
      2,
    ),
    face(
      [
        [a / 2, 0, a / 2],
        [-a / 2, 0, a / 2],
        [0, v, a / 2 + w],
      ],
      3,
    ),
    face(
      [
        [-a / 2, 0, a / 2],
        [-a / 2, 0, -a / 2],
        [-a / 2 - w, v, 0],
      ],
      4,
    ),
  ];
}
export function cylinderNet(r, h, t, N = 80) {
  const k = (1 - t) / r,
    bend = (s) =>
      Math.abs(k) < 1e-8
        ? [s, 0]
        : [Math.sin(k * s) / k, (Math.cos(k * s) - 1) / k],
    result = [],
    q = (t * Math.PI) / 2;
  for (let i = 0; i < N; i++) {
    let p = bend(-Math.PI * r + (2 * Math.PI * r * i) / N),
      n = bend(-Math.PI * r + (2 * Math.PI * r * (i + 1)) / N);
    result.push(
      face(
        [
          [p[0], 0, p[1]],
          [n[0], 0, n[1]],
          [n[0], h, n[1]],
          [p[0], h, p[1]],
        ],
        2,
        { smooth: true },
      ),
    );
  }
  for (let side of [-1, 1]) {
    let pts = [];
    for (let i = 0; i < N; i++) {
      const angle = (2 * Math.PI * i) / N,
        x = r * Math.sin(angle),
        z = r * (Math.cos(angle) - 1);
      pts.push([
        x,
        (side === 1 ? h : 0) - side * z * Math.sin(q),
        z * Math.cos(q),
      ]);
    }
    result.push(face(pts, side === 1 ? 1 : 0));
  }
  return result;
}
export function coneNet(r, h, t, N = 96) {
  let g = Math.hypot(r, h),
    alpha = Math.asin(r / g),
    beta = alpha + (Math.PI / 2 - alpha) * t,
    phi = (2 * Math.PI * Math.sin(alpha)) / Math.sin(beta),
    base = (i) => [
      g * Math.sin(beta) * Math.sin(-phi / 2 + (phi * i) / N),
      0,
      g * Math.sin(beta) * Math.cos(-phi / 2 + (phi * i) / N),
    ],
    apex = [0, g * Math.cos(beta), 0],
    result = [];
  for (let i = 0; i < N; i++)
    result.push(face([apex, base(i), base(i + 1)], 2, { smooth: true }));
  const q = Math.PI * t,
    pts = [];
  for (let i = 0; i < N; i++) {
    let angle = (2 * Math.PI * i) / N,
      z = r * (Math.cos(angle) - 1);
    pts.push([
      r * Math.sin(angle),
      -z * Math.sin(q),
      g * Math.sin(beta) + z * Math.cos(q),
    ]);
  }
  result.push(face(pts, 1));
  return result;
}
export function capMetrics(r, h) {
  const curved = 2 * Math.PI * r * h,
    base = Math.PI * (2 * r * h - h * h),
    volume = Math.PI * h * h * (r - h / 3);
  return {
    curved,
    base,
    total: curved + base,
    volume,
    baseRadius: Math.sqrt(Math.max(0, 2 * r * h - h * h)),
  };
}
export function wedgeMetrics(r, degrees) {
  const fraction = degrees / 360,
    curved = fraction * 4 * Math.PI * r * r,
    cut = degrees > 0 && degrees < 360 ? Math.PI * r * r : 0;
  return {
    curved,
    cut,
    total: curved + cut,
    volume: (fraction * 4 * Math.PI * r ** 3) / 3,
  };
}
export function sphericalCap(r, h, N = 64, rows = 26) {
  const limit = Math.acos(Math.max(-1, Math.min(1, (r - h) / r))),
    p = (j, i) => {
      let t = (limit * j) / rows,
        a = (2 * Math.PI * i) / N;
      return [
        r * Math.sin(t) * Math.cos(a),
        r * Math.cos(t),
        r * Math.sin(t) * Math.sin(a),
      ];
    },
    out = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < N; i++)
      out.push(
        face([p(j, i), p(j, i + 1), p(j + 1, i + 1), p(j + 1, i)], 2, {
          smooth: true,
        }),
      );
  if (h > 0 && h < 2 * r)
    out.push(
      face(
        Array.from({ length: N }, (_, i) => p(rows, i)),
        0,
      ),
    );
  return out;
}
export function revolutionProfile(type, r, h) {
  if (type === "cilindro")
    return [
      [0, -h / 2, 0],
      [r, -h / 2, 0],
      [r, h / 2, 0],
      [0, h / 2, 0],
    ];
  if (type === "cone")
    return [
      [0, -h / 2, 0],
      [r, -h / 2, 0],
      [0, h / 2, 0],
    ];
  return Array.from({ length: 49 }, (_, j) => {
    let a = (Math.PI * j) / 48;
    return [r * Math.sin(a), r * Math.cos(a), 0];
  });
}
export const revolvePoint = ([x, y], phi, axis = "y") =>
  axis === "y"
    ? [x * Math.cos(phi), y, x * Math.sin(phi)]
    : [y, x * Math.cos(phi), x * Math.sin(phi)];
export function revolutionMesh(type, r, h, degrees, axis = "y") {
  const angle = (degrees * Math.PI) / 180,
    steps = Math.max(1, Math.ceil(degrees / 5)),
    profile = revolutionProfile(type, r, h),
    out = [];
  if (degrees <= 0) return [];
  for (let j = 0; j < profile.length; j++) {
    let next = (j + 1) % profile.length;
    if (Math.abs(profile[j][0]) + Math.abs(profile[next][0]) < 1e-8) continue;
    for (let i = 0; i < steps; i++) {
      const a = (angle * i) / steps,
        b = (angle * (i + 1)) / steps;
      out.push(
        face(
          [
            revolvePoint(profile[j], a, axis),
            revolvePoint(profile[next], a, axis),
            revolvePoint(profile[next], b, axis),
            revolvePoint(profile[j], b, axis),
          ],
          j === 0 ? 0 : 2,
          { smooth: true },
        ),
      );
    }
  }
  if (degrees < 360) {
    out.push(
      face(
        profile.map((p) => revolvePoint(p, 0, axis)),
        4,
        { cut: true },
      ),
    );
    out.push(
      face(
        profile.map((p) => revolvePoint(p, angle, axis)),
        1,
        { cut: true },
      ),
    );
  }
  return out;
}
export function solidScene(s) {
  let faces,
    poly = ["cubo", "prisma", "piramide"].includes(s.type),
    a = s.a,
    h = s.type === "cubo" ? a : s.h,
    b = s.type === "cubo" ? a : s.b;
  if (s.view === "net") {
    const t = s.opening / 100;
    faces =
      s.type === "piramide"
        ? pyramidNet(a, h, t)
        : s.type === "cilindro"
          ? cylinderNet(a, h, t)
          : s.type === "cone"
            ? coneNet(a, h, t)
            : cuboidNet(a, h, b, t);
  } else if (s.view === "revolution")
    faces = revolutionMesh(s.type, a, h, s.revolution, s.axis);
  else if (s.type === "esfera" && s.part === "cap")
    faces = sphericalCap(a, s.capHeight);
  else if (s.type === "esfera" && s.part === "wedge")
    faces = revolutionMesh("esfera", a, h, s.wedge);
  else {
    let m = mesh(s.type, a, h, b);
    faces = m.faces.map((f, i) =>
      face(
        f.map((j) => m.vertices[j]),
        i,
        { smooth: !m.poly && f.length <= 4 },
      ),
    );
  }
  if (s.view === "exploded") {
    faces = faces.map((f, i) => {
      let c = f.points.reduce(
          (v, p) => add(v, scale(p, 1 / f.points.length)),
          [0, 0, 0],
        ),
        offset = poly
          ? scale(c, 1.8 / (norm(c) || 1))
          : i === 0
            ? [0, -1.8, 0]
            : s.type === "cilindro" && i === 1
              ? [0, 1.8, 0]
              : [0, 0.3, 0];
      return { ...f, points: f.points.map((p) => add(p, offset)) };
    });
  }
  return { faces, poly };
}
export function sanitizeGeometry(raw) {
  const s = defaultGeometry();
  if (!raw || typeof raw !== "object") return s;
  for (const k of Object.keys(s)) {
    if (typeof s[k] === "number" && Number.isFinite(raw[k])) s[k] = raw[k];
    if (typeof s[k] === "boolean" && typeof raw[k] === "boolean") s[k] = raw[k];
    if (typeof s[k] === "string" && typeof raw[k] === "string") s[k] = raw[k];
  }
  const clamp = (k, min, max) => (s[k] = Math.max(min, Math.min(max, s[k])));
  if (!SOLID_NAMES[s.type]) s.type = "cubo";
  if (!Object.hasOwn(CAMERA_VIEWS, s.camera) && s.camera !== "custom")
    s.camera = "perspective";
  if (
    raw.camera === undefined &&
    (raw.rx !== undefined || raw.ry !== undefined)
  )
    s.camera = "custom";
  if (!["solid", "net", "exploded", "revolution"].includes(s.view))
    s.view = "solid";
  if (
    s.view === "revolution" &&
    !["cilindro", "cone", "esfera"].includes(s.type)
  )
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
