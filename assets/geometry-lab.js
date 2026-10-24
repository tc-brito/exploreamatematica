import { solidMetrics } from "./math.js";
import {
  SOLID_NAMES,
  CAMERA_VIEWS,
  cameraAngles,
  FACE_COLORS,
  solidScene,
  revolutionProfile,
  revolvePoint,
  capMetrics,
  wedgeMetrics,
  add,
  scale,
  norm,
  cuboidNet,
  pyramidNet,
  cylinderNet,
  coneNet,
} from "./geometry-model.js";
export function mountGeometry(ctx) {
  const {
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
      state,
    } = ctx,
    s = state.geometry,
    curved = ["cilindro", "cone", "esfera"].includes(s.type),
    normal = s.view === "solid";
  let controls = `<div class="control-title">Seu sólido <span>◇</span></div>${select("shape", "Escolha o sólido", Object.entries(SOLID_NAMES), s.type)}${select("camera-view", "Vista do sólido", [...Object.entries(CAMERA_VIEWS).map(([key, v]) => [key, v.label]), ["custom", "Rotação livre"]], s.camera)}<div class="control-section"><h2>Dimensões · unidades de comprimento</h2>${range("dim-a", curved ? "Raio (r)" : s.type === "cubo" ? "Aresta (a)" : "Lado da base (a)", s.a, 0.5, 10, 0.1)}${!["cubo", "esfera"].includes(s.type) ? range("dim-h", "Altura (h)", s.h, 0.5, 12, 0.1) : ""}${s.type === "prisma" ? range("dim-b", "Largura da base (b)", s.b, 0.5, 10, 0.1) : ""}</div><div class="control-section"><h2>Explore a estrutura</h2><div class="segmented">${[["solid", "Sólido 3D"], ["net", "Planificação"], ["exploded", "Vista explodida"], ...(curved ? [["revolution", "Revolução"]] : [])].map(([v, l]) => `<button data-view="${v}" aria-pressed="${s.view === v}" ${s.type === "esfera" && ["net", "exploded"].includes(v) ? 'disabled title="A esfera não tem planificação plana exata"' : ""} class="${s.view === v ? "selected" : ""}">${l}</button>`).join("")}</div>${s.view === "net" ? `<div class="dynamic-control">${range("opening", "Abertura da planificação", s.opening, 0, 100, 1, "%")}<div class="range-ends"><span>Fechado</span><span>Aberto</span></div><p class="small">Arraste o controle para abrir e fechar o sólido. As dimensões das faces são preservadas.</p></div>` : ""}${s.type === "esfera" ? '<p class="small">A esfera não admite planificação exata sem deformação.</p>' : ""}</div>`;
  if (s.view === "revolution")
    controls += `<div class="control-section"><h2>Gerar por revolução</h2>${select(
      "rotation-axis",
      "Eixo de rotação",
      [
        ["y", "Eixo y"],
        ["x", "Eixo x"],
      ],
      s.axis,
    )}${range("sweep", "Ângulo de rotação", s.revolution, 0, 360, 1, "°")}<div class="inline-actions"><button id="sweep-zero">Figura plana</button><button id="sweep-full">Volta completa</button></div><p class="small">${s.type === "cilindro" ? "Um retângulo gira em torno de um de seus lados." : s.type === "cone" ? "Um triângulo retângulo gira em torno de um de seus catetos." : "Um semicírculo gira em torno de seu diâmetro."} A figura geradora aparece em laranja.</p></div>`;
  if (s.type === "esfera" && normal)
    controls += `<div class="control-section"><h2>Partes da esfera</h2>${select(
      "sphere-part",
      "Objeto de estudo",
      [
        ["whole", "Esfera completa"],
        ["cap", "Calota esférica"],
        ["wedge", "Cunha esférica"],
      ],
      s.part,
    )}${s.part === "cap" ? range("cap-height", "Altura da calota (h)", s.capHeight, 0.05, 2 * s.a, 0.05) : s.part === "wedge" ? range("wedge-angle", "Ângulo da cunha (θ)", s.wedge, 1, 360, 1, "°") : ""}</div>`;
  controls += `<div class="control-section"><h2>Elementos visíveis</h2>${check("faces", curved ? "Superfícies" : "Faces", s.faces)}${!curved ? check("edges", "Arestas", s.edges) + check("vertices", "Vértices", s.vertices) : ""}${normal ? check("measure", "Medidas", s.measure) : ""}${normal && ["cone", "cilindro", "piramide"].includes(s.type) ? check("guide", s.type === "piramide" ? "Apótema lateral (ℓ)" : "Geratriz (g)", s.guide) : ""}</div>`;
  if (s.type === "piramide" && normal)
    controls += `<div class="control-section"><h2>Construções auxiliares</h2>${check("diagonal", "Diagonal da base", s.diagonal)}${check("triangleApothem", "Triângulo do apótema lateral", s.triangleApothem)}${check("triangleEdge", "Triângulo da aresta lateral", s.triangleEdge)}<p class="small">Os dois triângulos têm ângulo reto no centro da base.</p></div>`;
  $("#main").innerHTML = shell(
    "Geometria espacial",
    "Abra, construa e investigue os sólidos em movimento.",
    controls,
    `<div class="stage-top"><strong id="solid-name"></strong><span class="pill">${s.view === "net" ? "PLANIFICAÇÃO DINÂMICA" : s.view === "revolution" ? "SÓLIDO DE REVOLUÇÃO" : "LABORATÓRIO INTERATIVO"}</span></div><div class="stage geometry-stage"><span class="view-label" id="view-label"></span><svg id="solid" viewBox="0 0 800 500" role="img" aria-label="Sólido geométrico" tabindex="0"></svg><span class="stage-note">Arraste para girar · Setas do teclado para rotação</span><div class="stage-tools"><button id="zoom-out" aria-label="Diminuir sólido">−</button><button id="camera-reset" aria-label="Restaurar câmera">↺</button><button id="zoom-in" aria-label="Ampliar sólido">+</button><button id="export" aria-label="Baixar figura SVG">↓</button></div></div><div class="metrics" id="solid-metrics"></div><div class="formula-panel" id="solid-formulas"></div>`,
  );
  $("#lab-controls").classList.add("extended-controls");
  const bind = (id, key, suffix = "", after) => {
    const el = $("#" + id);
    if (!el) return;
    el.oninput = (e) => {
      s[key] = +e.target.value;
      $("#" + id + "-out").textContent = fmt(s[key]) + suffix;
      if (after) after();
      draw();
    };
  };
  $("#camera-view").onchange = (e) => {
    const view = e.target.value;
    if (view === "custom") Object.assign(s, cameraAngles(s));
    else
      Object.assign(s, {
        rx: CAMERA_VIEWS[view].rx,
        ry: CAMERA_VIEWS[view].ry,
      });
    s.camera = view;
    draw();
  };
  function freeCamera() {
    if (s.camera === "custom") return;
    Object.assign(s, cameraAngles(s));
    s.camera = "custom";
    $("#camera-view").value = "custom";
  }
  $("#shape").onchange = (e) => {
    s.type = e.target.value;
    s.view = "solid";
    s.opening = 0;
    s.capHeight = Math.min(s.capHeight, 2 * s.a);
    render();
  };
  bind("dim-a", "a", "", () => {
    s.capHeight = Math.min(s.capHeight, 2 * s.a);
    if ($("#cap-height")) {
      $("#cap-height").max = 2 * s.a;
      $("#cap-height").value = s.capHeight;
      $("#cap-height-out").textContent = fmt(s.capHeight);
    }
  });
  bind("dim-h", "h");
  bind("dim-b", "b");
  bind("opening", "opening", "%");
  bind("sweep", "revolution", "°");
  bind("cap-height", "capHeight");
  bind("wedge-angle", "wedge", "°");
  for (const k of [
    "faces",
    "edges",
    "vertices",
    "measure",
    "guide",
    "diagonal",
    "triangleApothem",
    "triangleEdge",
  ])
    if ($("#" + k))
      $("#" + k).onchange = (e) => {
        s[k] = e.target.checked;
        draw();
      };
  document.querySelectorAll("[data-view]").forEach(
    (el) =>
      (el.onclick = () => {
        s.view = el.dataset.view;
        render();
      }),
  );
  if ($("#sphere-part"))
    $("#sphere-part").onchange = (e) => {
      s.part = e.target.value;
      render();
    };
  if ($("#rotation-axis"))
    $("#rotation-axis").onchange = (e) => {
      s.axis = e.target.value;
      draw();
    };
  for (const [id, v] of [
    ["sweep-zero", 0],
    ["sweep-full", 360],
  ])
    if ($("#" + id))
      $("#" + id).onclick = () => {
        s.revolution = v;
        $("#sweep").value = v;
        $("#sweep-out").textContent = v + "°";
        draw();
      };
  $("#zoom-out").onclick = () => {
    s.zoom = Math.max(0.4, s.zoom - 0.15);
    draw();
  };
  $("#zoom-in").onclick = () => {
    s.zoom = Math.min(2, s.zoom + 0.15);
    draw();
  };
  $("#camera-reset").onclick = () => {
    s.camera = "perspective";
    $("#camera-view").value = "perspective";
    s.rx = 0.38;
    s.ry = 0.56;
    s.zoom = 1;
    draw();
  };
  $("#export").onclick = () => downloadSVG("solid", "geometria-" + s.type);
  const el = $("#solid");
  let pointer = null;
  el.onpointerdown = (e) => {
    pointer = [e.clientX, e.clientY];
    el.setPointerCapture(e.pointerId);
  };
  el.onpointermove = (e) => {
    if (!pointer) return;
    freeCamera();
    s.ry += (e.clientX - pointer[0]) * 0.009;
    s.rx = Math.max(
      -Math.PI,
      Math.min(Math.PI, s.rx + (e.clientY - pointer[1]) * 0.009),
    );
    pointer = [e.clientX, e.clientY];
    draw();
  };
  el.onpointerup = el.onpointercancel = () => (pointer = null);
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
    const m = solidMetrics(s.type, s.a, s.h, s.b),
      cap = capMetrics(s.a, s.capHeight),
      wedge = wedgeMetrics(s.a, s.wedge);
    $("#solid-name").textContent =
      SOLID_NAMES[s.type] +
      (s.type === "esfera" && normal && s.part !== "whole"
        ? " · " + (s.part === "cap" ? "calota" : "cunha")
        : "");
    $("#view-label").textContent =
      s.view === "net"
        ? `Abertura ${fmt(s.opening, 0)}% · faces em escala`
        : s.view === "revolution"
          ? `Rotação de ${fmt(s.revolution, 0)}° em torno do eixo ${s.axis}`
          : s.view === "exploded"
            ? "Partes afastadas para observação"
            : "Projeção ortográfica";
    const viewName = CAMERA_VIEWS[s.camera]?.label || "Rotação livre";
    $("#view-label").textContent =
      viewName + " · " + $("#view-label").textContent;
    let detail = `<span class="formula">A = ${m.formulaA} &nbsp; · &nbsp; V = ${m.formulaV}</span><p>u.a.: unidades de área · u.v.: unidades de volume.</p>`;
    if (s.view === "revolution") {
      $("#solid-metrics").innerHTML =
        metric("Área do sólido completo", fmt(m.area) + " u.a.") +
        metric(
          "Volume varrido",
          fmt((m.volume * s.revolution) / 360) + " u.v.",
        ) +
        metric("Fração da volta", fmt((s.revolution / 360) * 100) + "%");
      detail += `<p>Ao completar 360°, V = ${fmt(m.volume)} u.v. O controle mostra a região varrida pela figura geradora.</p>`;
    } else if (s.type === "esfera" && s.part === "cap") {
      $("#solid-metrics").innerHTML =
        metric(
          "Área da calota",
          fmt(cap.curved) + " u.a.",
          "Superfície curva: 2πrh",
        ) +
        metric(
          "Volume do segmento",
          fmt(cap.volume) + " u.v.",
          "πh²(r − h/3)",
        ) +
        metric("Área da base circular", fmt(cap.base) + " u.a.", "π(2rh − h²)");
      detail = `<span class="formula">A<sub>calota</sub> = 2πrh &nbsp; · &nbsp; V = πh²(r − h/3)</span><p>Altura h = ${fmt(s.capHeight)}; raio da base ρ = √(2rh − h²) = ${fmt(cap.baseRadius)}. Área total do segmento fechado: ${fmt(cap.total)} u.a. A calota é a superfície curva; o volume corresponde ao segmento esférico.</p>`;
    } else if (s.type === "esfera" && s.part === "wedge") {
      $("#solid-metrics").innerHTML =
        metric("Área curva do fuso", fmt(wedge.curved) + " u.a.") +
        metric("Volume da cunha", fmt(wedge.volume) + " u.v.") +
        metric(
          "Área total da cunha",
          fmt(wedge.total) + " u.a.",
          "Inclui os cortes planos",
        );
      detail = `<span class="formula">V = (θ / 360°) · 4πr³/3</span><p>A<sub>curva</sub> = (θ / 360°) · 4πr². Para 0° &lt; θ &lt; 360°, os dois semicírculos dos cortes somam πr². Em 360°, não há cortes.</p>`;
    } else {
      $("#solid-metrics").innerHTML =
        metric("Área total", fmt(m.area) + " u.a.") +
        metric("Volume", fmt(m.volume) + " u.v.") +
        metric(
          m.vertices !== null ? "Vértices · arestas · faces" : "Superfícies",
          m.vertices !== null
            ? `${m.vertices} · ${m.edges} · ${m.faces}`
            : s.type === "esfera"
              ? "1 curva"
              : s.type === "cone"
                ? "1 plana + 1 curva"
                : "2 planas + 1 curva",
        );
      if (m.g)
        detail += `<p>${s.type === "piramide" ? "Apótema lateral ℓ" : "Geratriz g"} = ${fmt(m.g)}. ${s.type === "cone" ? "g² = r² + h²." : s.type === "piramide" ? "ℓ² = h² + (a/2)²." : ""}</p>`;
    }
    if (s.type === "piramide" && normal) {
      if (s.diagonal)
        detail += `<p><strong>Diagonal:</strong> d = a√2 = ${fmt(s.a * Math.SQRT2)}.</p>`;
      if (s.triangleApothem)
        detail += `<p class="blue-note"><strong>Triângulo do apótema:</strong> ℓ² = h² + (a/2)² = ${fmt(s.h * s.h)} + ${fmt((s.a / 2) ** 2)}; ℓ = ${fmt(Math.hypot(s.h, s.a / 2))}.</p>`;
      if (s.triangleEdge)
        detail += `<p class="purple-note"><strong>Triângulo da aresta:</strong> e² = h² + (d/2)² = ${fmt(s.h * s.h)} + ${fmt((s.a * s.a) / 2)}; e = ${fmt(Math.hypot(s.h, s.a / Math.SQRT2))}.</p>`;
    }
    $("#solid-formulas").innerHTML = detail;
    $("#solid").setAttribute(
      "aria-label",
      `${$("#solid-name").textContent}. ${$("#solid-metrics").textContent}. ${$("#view-label").textContent}.`,
    );
    renderScene(s, $("#solid"), fmt);
  }
  draw();
  common();
  return () => {};
}
function renderScene(s, svg, fmt) {
  let { faces, poly } = solidScene(s),
    { rx, ry } = cameraAngles(s),
    frame = faces.flatMap((f) => f.points),
    annotations = [];
  const curved = ["cilindro", "cone", "esfera"].includes(s.type),
    H = s.type === "cubo" ? s.a : s.h;
  // Use a stable framing across the complete unfolding sequence.
  if (s.view === "net") {
    let open =
      s.type === "piramide"
        ? pyramidNet(s.a, s.h, 1)
        : s.type === "cilindro"
          ? cylinderNet(s.a, s.h, 1)
          : s.type === "cone"
            ? coneNet(s.a, s.h, 1)
            : cuboidNet(s.a, H, s.type === "cubo" ? s.a : s.b, 1);
    frame = frame.concat(open.flatMap((f) => f.points));
  }
  const line = (
    p,
    q,
    label,
    color = "#8a4b24",
    dash = false,
    dx = 10,
    dy = -10,
  ) => annotations.push({ kind: "line", p, q, label, color, dash, dx, dy });
  const tri = (points, color) =>
    annotations.push({ kind: "triangle", points, color });
  if (s.view === "revolution") {
    const profile = revolutionProfile(s.type, s.a, s.h),
      points = profile.map((p) =>
        revolvePoint(p, (s.revolution * Math.PI) / 180, s.axis),
      );
    annotations.push({ kind: "profile", points, color: "#c27719" });
    frame = frame.concat(
      points,
      profile.map((p) => revolvePoint(p, Math.PI / 2, s.axis)),
      profile.map((p) => revolvePoint(p, Math.PI, s.axis)),
    );
    const len = s.type === "esfera" ? s.a * 1.35 : s.h / 2 + 1.5;
    line(
      s.axis === "y" ? [0, -len, 0] : [-len, 0, 0],
      s.axis === "y" ? [0, len, 0] : [len, 0, 0],
      "eixo " + s.axis,
      "#725282",
      true,
    );
  }
  if (s.view === "solid" && s.measure) {
    if (!curved) {
      let y = -H / 2,
        z = (s.type === "prisma" ? s.b : s.a) / 2;
      line(
        [-s.a / 2, y, z],
        [s.a / 2, y, z],
        `a = ${fmt(s.a)}`,
        "#8a4b24",
        false,
        10,
        s.type === "piramide" ? 38 : -10,
      );
      if (s.type === "prisma")
        line(
          [s.a / 2, y, -s.b / 2],
          [s.a / 2, y, s.b / 2],
          `b = ${fmt(s.b)}`,
          "#285d85",
        );
      if (
        s.type !== "cubo" &&
        !(s.type === "piramide" && (s.triangleApothem || s.triangleEdge))
      )
        line([0, -H / 2, 0], [0, H / 2, 0], `h = ${fmt(H)}`, "#7452a1", true);
    } else if (s.type === "esfera") {
      line([0, 0, 0], [s.a, 0, 0], `r = ${fmt(s.a)}`);
      if (s.part === "cap")
        line(
          [0, s.a - s.capHeight, 0],
          [0, s.a, 0],
          `h = ${fmt(s.capHeight)}`,
          "#7452a1",
          true,
        );
    } else {
      line([0, -s.h / 2, 0], [s.a, -s.h / 2, 0], `r = ${fmt(s.a)}`);
      line(
        [0, -s.h / 2, 0],
        [0, s.h / 2, 0],
        `h = ${fmt(s.h)}`,
        "#7452a1",
        true,
      );
    }
  }
  if (
    s.view === "solid" &&
    s.guide &&
    !(s.type === "piramide" && s.triangleApothem) &&
    ["piramide", "cone", "cilindro"].includes(s.type)
  ) {
    const p =
        s.type === "piramide" ? [0, -s.h / 2, s.a / 2] : [s.a, -s.h / 2, 0],
      q = s.type === "cilindro" ? [s.a, s.h / 2, 0] : [0, s.h / 2, 0];
    line(
      p,
      q,
      `${s.type === "piramide" ? "ℓ" : "g"} = ${fmt(s.type === "cilindro" ? s.h : Math.hypot(s.h, s.type === "piramide" ? s.a / 2 : s.a))}`,
    );
  }
  if (s.type === "piramide" && s.view === "solid") {
    const O = [0, -s.h / 2, 0],
      S = [0, s.h / 2, 0],
      M = [0, -s.h / 2, s.a / 2],
      C = [s.a / 2, -s.h / 2, s.a / 2];
    if (s.diagonal)
      line(
        [-s.a / 2, -s.h / 2, -s.a / 2],
        C,
        `d = ${fmt(s.a * Math.SQRT2)}`,
        "#a0593a",
        true,
        -110,
        10,
      );
    for (const [enabled, P, color, label] of [
      [s.triangleApothem, M, "#246d9c", "ℓ"],
      [s.triangleEdge, C, "#8551a4", "e"],
    ])
      if (enabled) {
        tri([O, P, S], color);
        if (label === "ℓ" || !s.triangleApothem)
          line(O, S, `h = ${fmt(s.h)}`, color, false, -53, -10);
        line(
          O,
          P,
          (label === "ℓ" ? "a/2" : "d/2") +
            " = " +
            fmt(norm(add(P, scale(O, -1)))),
          color,
          false,
          label === "ℓ" ? -63 : 25,
          label === "ℓ" ? 24 : 8,
        );
        line(
          P,
          S,
          `${label} = ${fmt(norm(add(P, scale(S, -1))))}`,
          color,
          false,
          label === "ℓ" ? -80 : 25,
          -10,
        );
        let eps = Math.min(s.a, s.h) * 0.12,
          dir = scale(add(P, scale(O, -1)), eps / norm(add(P, scale(O, -1))));
        annotations.push({
          kind: "right",
          points: [
            add(O, [0, eps, 0]),
            add(add(O, dir), [0, eps, 0]),
            add(O, dir),
          ],
          color,
        });
      }
  }
  frame = frame.concat(annotations.flatMap((a) => a.points || [a.p, a.q]));
  if (!frame.length)
    frame = [
      [0, 0, 0],
      [1, 1, 1],
    ];
  const rotation = ([x, y, z]) => {
    let u = x * Math.cos(ry) + z * Math.sin(ry),
      v = -x * Math.sin(ry) + z * Math.cos(ry);
    return [
      u,
      y * Math.cos(rx) - v * Math.sin(rx),
      y * Math.sin(rx) + v * Math.cos(rx),
    ];
  };
  let bounds = frame.map(rotation),
    mins = [0, 1].map((k) => Math.min(...bounds.map((p) => p[k]))),
    maxs = [0, 1].map((k) => Math.max(...bounds.map((p) => p[k]))),
    cx = (mins[0] + maxs[0]) / 2,
    cy = (mins[1] + maxs[1]) / 2,
    factor =
      Math.min(
        49,
        620 / Math.max(1, maxs[0] - mins[0]),
        340 / Math.max(1, maxs[1] - mins[1]),
      ) * s.zoom,
    proj = (p) => {
      let [x, y] = rotation(p);
      return [400 + (x - cx) * factor, 240 - (y - cy) * factor];
    },
    pts = (points) =>
      points
        .map(proj)
        .map((p) => p.map((v) => v.toFixed(2)).join(","))
        .join(" ");
  let ordered = faces
      .map((f) => ({
        ...f,
        z: f.points.reduce(
          (sum, p) => sum + rotation(p)[2] / f.points.length,
          0,
        ),
      }))
      .sort((a, b) => a.z - b.z),
    html = "";
  for (const f of ordered) {
    let fill = f.smooth
        ? `hsl(94 25% ${Math.max(48, Math.min(82, 68 + f.z * 2))}%)`
        : f.color,
      stroke = s.faces
        ? f.smooth
          ? fill
          : poly && !s.edges
            ? "none"
            : "#55744f"
        : "#6a8364";
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
      const [x, y] = proj(a.p),
        [u, v] = proj(a.q);
      if (Math.hypot(u - x, v - y) < 3) continue;
      html += `<path d="M${x} ${y}L${u} ${v}" fill="none" stroke="${a.color}" stroke-width="2.2" ${a.dash ? 'stroke-dasharray="6 5"' : ""}/><text x="${(x + u) / 2 + a.dx}" y="${(y + v) / 2 + a.dy}" font-family="sans-serif" font-size="17" fill="${a.color}" stroke="#fcfdf9" stroke-width="4" paint-order="stroke">${a.label}</text>`;
    }
  }
  svg.innerHTML = html;
}
