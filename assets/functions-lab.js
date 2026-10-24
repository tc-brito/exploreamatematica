import {
  FAMILIES,
  PALETTE,
  PARAMS,
  makeCurve,
  makeExpression,
  familyValue,
  familyFormula,
  familyError,
  naturalDomain,
  period,
  familyBreaks,
  trigBounds,
  compileExpression,
  finiteInput,
  piLabel,
} from "./function-math.js";
import {
  drawGraph,
  attachTrace,
  attachGraphZoom,
  downloadGraph,
  xml,
  decimal,
} from "./plot.js";
import { cmToPixels, zoomWindow } from "./plot-utils.js";
const names = ["f", "g", "h", "p", "q", "r"];
const field = (id, label, value, extra = "") =>
  `<label class="field compact-field" for="${id}"><span>${label}</span><input id="${id}" value="${xml(value)}" ${extra}></label>`;
const numeric = (id, label, value, extra = "") =>
  field(id, label, value, 'type="number" step="any" ' + extra);
function viewportFields(o) {
  return `<div class="field-grid">${[
    ["xmin", "x mínimo"],
    ["xmax", "x máximo"],
    ["ymin", "y mínimo"],
    ["ymax", "y máximo"],
  ]
    .map(([k, l]) => field("window-" + k, l, decimal(o[k], 5)))
    .join(
      "",
    )}</div><button id="apply-window" class="wide-button">Aplicar janela</button><p class="small error" id="window-error" role="status"></p>`;
}
export function expressionCurve(q, parameters = {}) {
  const fn = compileExpression(q.expression, parameters);
  const min =
      String(q.min ?? "").trim() === "" ? -Infinity : finiteInput(q.min),
    max = String(q.max ?? "").trim() === "" ? Infinity : finiteInput(q.max);
  if (min >= max) throw Error("O início do domínio deve ser menor que o fim.");
  return (x) => (x < min || x > max ? NaN : fn(x));
}
function algebraDetails(c) {
  const v = decimal,
    within = (x) => !c.domain || (x >= c.min && x <= c.max);
  let text = "";
  if (familyError(c)) return "";
  if (c.type === "afim") {
    const root = c.a
      ? within(-c.b / c.a)
        ? v(-c.b / c.a)
        : "fora do intervalo escolhido"
      : c.b === 0
        ? "todo x do domínio"
        : "nenhuma";
    text = `<p><strong>Inclinação:</strong> ${v(c.a)}. <strong>Intercepto:</strong> (0; ${v(c.b)}). <strong>Raiz:</strong> ${root}. ${c.a > 0 ? "Crescente" : c.a < 0 ? "Decrescente" : "Constante"}.</p>`;
  }
  if (c.type === "quadratica") {
    if (!c.a)
      text =
        "<p>Com a = 0, a expressão se reduz a uma função afim ou constante.</p>";
    else {
      const D = c.b * c.b - 4 * c.a * c.c,
        vx = -c.b / (2 * c.a),
        vy = -D / (4 * c.a),
        roots =
          D < 0
            ? []
            : [
                (-c.b - Math.sqrt(D)) / (2 * c.a),
                (-c.b + Math.sqrt(D)) / (2 * c.a),
              ].filter(within);
      text = `<p><strong>Discriminante:</strong> Δ = b² − 4ac = ${v(D)}. <strong>Raízes no domínio:</strong> ${roots.length ? [...new Set(roots.map((x) => v(x)))].join(" e ") : "nenhuma"}.</p><p><strong>Vértice da parábola:</strong> (${v(vx)}; ${v(vy)}). Concavidade para ${c.a > 0 ? "cima" : "baixo"}${within(vx) ? "; ponto de " + (c.a > 0 ? "mínimo" : "máximo") : "; vértice fora do intervalo escolhido"}.</p>`;
    }
  }
  if (c.type === "exponencial")
    text = `<p><strong>Intercepto:</strong> (0; ${v(c.a + c.c)}). ${!c.a || c.b === 1 ? "Esta configuração produz uma constante." : `Assíntota horizontal da curva completa: y = ${v(c.c)}. Função ${c.a * Math.log(c.b) > 0 ? "crescente" : "decrescente"}.`}</p><button id="explore-logistic" class="text-button">Estudar crescimento logístico →</button>`;
  if (c.type === "modular")
    text = `<p><strong>Ponto de mudança:</strong> (${v(c.b)}; ${v(c.c)}). ${!c.a ? "Função constante." : c.a > 0 ? "A curva completa tem mínimo em x = b." : "A curva completa tem máximo em x = b."}</p>`;
  return text;
}

export function mountFunctions(ctx) {
  const { $, select, check, shell, common, render, state, toast } = ctx,
    s = state.functions,
    free = s.mode === "free";
  s.active = 0;
  const c = s.curves[0],
    f = s.free,
    rows = free ? f.equations : s.comparisons,
    windowState = free ? f : s;
  let options,
    raf = 0,
    previous = 0,
    paletteTarget = null;
  const playing = new Map();
  const nav = `<div class="function-tabs" role="group" aria-label="Modo do laboratório"><button id="mode-families" class="${!free ? "selected" : ""}" aria-pressed="${!free}">Famílias de funções</button><button id="mode-free" class="${free ? "selected" : ""}" aria-pressed="${free}">Gráfico para avaliações</button></div>`;
  const controls = free ? assessmentControls() : familyControls();
  $("#main").innerHTML = shell(
    "Funções",
    free
      ? "Prepare gráficos claros para suas avaliações."
      : "Escolha uma família, experimente os coeficientes e compare.",
    controls,
    `<div class="plot-toolbar"><div class="plot-curves" id="plot-curves" aria-label="Cores das funções">${(!free
      ? [c]
      : []
    )
      .concat(rows)
      .map(
        (q, i) =>
          `<button class="plot-curve-chip" data-color="${i}" aria-label="Escolher cor de ${names[i]}" aria-expanded="false"><i style="background:${q.color}"></i><span id="chip-label-${i}">${names[i]}(x)</span></button>`,
      )
      .join(
        "",
      )}</div><div class="plot-zoom"><button id="graph-minus" aria-label="Reduzir zoom do gráfico">−</button><button id="graph-reset" aria-label="Restaurar janela do gráfico">↺</button><button id="graph-plus" aria-label="Ampliar zoom do gráfico">+</button></div><div id="color-palette" class="plot-palette" hidden role="group" aria-label="Escolha uma cor">${PALETTE.map(([color, label]) => `<button data-palette-color="${color}" style="--swatch:${color}" aria-label="${label}" title="${label}"><i></i></button>`).join("")}<button id="close-palette" aria-label="Fechar cores">×</button></div></div>
 <div class="graph-summary" id="graph-summary"></div><div class="stage graph-stage ${free ? "exam-stage" : ""}"><svg id="function-graph" role="img" tabindex="0" aria-label="Gráfico de funções"></svg><span class="graph-gesture">Role para dar zoom · Passe sobre a curva para ver coordenadas</span></div><div class="export-toolbar"><button id="export-svg">↓ SVG vetorial</button><button id="export-png">↓ PNG</button></div>`,
    nav,
  );
  $(".lab").classList.add("function-lab");
  $("#lab-controls").classList.add("extended-controls", "function-controls");
  $(".workspace").insertAdjacentHTML(
    "afterend",
    `<details class="function-notes" ${free ? "hidden" : ""}><summary>Propriedades da função e tabela de valores</summary><div id="function-details"></div></details>`,
  );
  $("#mode-families").onclick = () => {
    s.mode = "families";
    render();
  };
  $("#mode-free").onclick = () => {
    s.mode = "free";
    render();
  };
  function equationRows() {
    return (
      rows
        .map(
          (q, i) =>
            `<div class="expression-row"><label class="expression-field" for="expression-${i}"><span>${names[i + (free ? 0 : 1)]}(x) =</span><input id="expression-${i}" value="${xml(q.expression)}" maxlength="240" placeholder="Digite uma função" autocomplete="off" spellcheck="false"></label><div class="expression-switches">${check("visible-" + i, "Mostrar", q.visible)}${free ? check("equation-" + i, "Mostrar equação", q.showEquation) : ""}<button data-remove-expression="${i}" aria-label="Remover função ${names[i + (free ? 0 : 1)]}" ${rows.length === 1 ? "disabled" : ""}>×</button></div>${free ? `<div class="equation-domain"><span>Domínio de x</span>${field("min-" + i, "Mínimo", q.min, 'placeholder="−∞" aria-label="Início do domínio de ' + names[i] + '"')}${field("max-" + i, "Máximo", q.max, 'placeholder="+∞" aria-label="Fim do domínio de ' + names[i] + '"')}</div>` : ""}<p class="small error" id="expression-error-${i}" role="status"></p></div>`,
        )
        .join("") +
      `<button id="add-expression" class="wide-button" ${rows.length >= 5 ? "disabled" : ""}>＋ Adicionar função <span>${rows.length}/5</span></button>`
    );
  }
  function familyControls() {
    return `<div class="control-title">Comece pela família</div>${select("family", "Família da função", FAMILIES, c.type)}${
      c.type === "trigonometrica"
        ? select(
            "trig",
            "Razão trigonométrica",
            [
              ["sin", "Seno"],
              ["cos", "Cosseno"],
              ["tan", "Tangente"],
            ],
            c.trig,
          )
        : ""
    }<div class="main-equation"><span class="symbolic-formula">${xml(familyFormula(c, true))}</span>${check("main-visible", "Mostrar", c.visible)}</div><div class="parameters">${PARAMS[c.type].map(([k, l, min, max, step]) => `<div class="parameter"><label for="coef-${k}"><b>${k}</b><span>${l}</span></label><div class="parameter-values"><input type="range" id="coef-${k}" min="${Math.min(min, c[k])}" max="${Math.max(max, c[k])}" step="${step}" value="${c[k]}" aria-label="Coeficiente ${k}"><input type="number" id="value-${k}" step="any" value="${Number(c[k].toFixed(4))}" aria-label="Valor de ${k}"><button id="play-${k}" aria-label="Animar coeficiente ${k}" aria-pressed="false">▶</button></div></div>`).join("")}</div><button id="stop-animation" class="text-button compact-pause">Pausar animações</button><p class="small error" id="family-error" role="status"></p><details class="control-section main-domain"><summary>Domínio da função principal</summary><p id="natural-domain" class="small"></p>${check("limit-domain", "Limitar intervalo", c.domain)}<div id="main-domain-fields" class="field-grid" ${c.domain ? "" : "hidden"}>${numeric("domain-min", "Início", c.min)}${numeric("domain-max", "Fim", c.max)}</div></details><div class="control-section comparisons"><h2>Comparar com outras funções</h2><p class="small">Digite até 5 expressões. Use a, b, c e d para acompanhar os coeficientes.</p>${equationRows()}</div><details class="control-section"><summary>Janela do gráfico</summary>${viewportFields(s)}</details>`;
  }
  function assessmentControls() {
    return `<div class="control-title">Gráfico para avaliações</div>${equationRows()}<details class="syntax-help"><summary>Como escrever as funções</summary><p class="small">Use x^2, 2x, sen(x), cos(x), tan(x), sqrt(x), ln(x), log(x) e |x|. Use pi para π. Domínio vazio mantém o domínio natural.</p></details><details class="control-section"><summary>Janela do gráfico</summary>${viewportFields(f)}</details><details class="control-section"><summary>Eixos e tipografia</summary><div class="field-grid">${field("xlabel", "Nome do eixo x", f.xlabel, 'maxlength="30"')}${field("ylabel", "Nome do eixo y", f.ylabel, 'maxlength="30"')}</div>${check("axes-bold", "Nomes dos eixos em negrito", f.axesBold)}${check("radians", "Eixo x em radianos", f.radians)}${check("grid", "Mostrar malha", f.grid)}<p class="small">Fonte: Calibri, quando instalada; alternativa sem serifa nos demais dispositivos. Nomes dos eixos sem itálico.</p></details><details class="control-section" id="points-panel"><summary>Inserir coordenadas</summary><div class="field-grid">${field("point-x", "Coordenada x", "0")}${field("point-y", "Coordenada y", "0")}</div>${field("point-label", "Nome do ponto (opcional)", "", 'maxlength="24"')}${check("point-project", "Projeções nos eixos", true)}<button id="add-point" class="wide-button" ${f.points.length >= 12 ? "disabled" : ""}>＋ Inserir ponto</button><p class="small error" id="point-error" role="status"></p><div id="point-list">${pointList()}</div></details><details class="control-section" open><summary>Tamanho da figura · cm</summary><div class="field-grid">${numeric("width-cm", "Largura (cm)", f.widthCm, 'min="6" max="30"')}${numeric("height-cm", "Altura (cm)", f.heightCm, 'min="4" max="25"')}</div><button id="apply-size" class="wide-button">Aplicar tamanho</button><p class="small error" id="size-error" role="status"></p><p class="small">Fundo transparente · SVG em tamanho físico · PNG a 300 dpi.</p></details>`;
  }
  function pointList() {
    return f.points
      .map(
        (p, i) =>
          `<div class="point-row"><span>${xml(p.label || "P" + (i + 1))}: (${decimal(p.x)}; ${decimal(p.y)})</span><button data-remove-point="${i}" aria-label="Remover ponto ${i + 1}">×</button></div>`,
      )
      .join("");
  }
  function compileRows() {
    const curves = [];
    rows.forEach((q, i) => {
      const error = $("#expression-error-" + i),
        input = $("#expression-" + i);
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
            showEquation: q.showEquation,
          });
      } catch (e) {
        error.textContent = e.message;
        input.setAttribute("aria-invalid", "true");
      }
    });
    return curves;
  }
  function draw() {
    let curves = compileRows(),
      guides = [];
    if (free) {
      options = {
        ...f,
        width: cmToPixels(f.widthCm),
        height: cmToPixels(f.heightCm),
        curves,
        legend: true,
        professional: true,
        guides,
      };
      $("#graph-summary").textContent =
        `${decimal(f.widthCm)} × ${decimal(f.heightCm)} cm · Calibri · fundo transparente`;
    } else {
      const error = familyError(c);
      $("#family-error").textContent = error;
      $(".symbolic-formula").textContent = familyFormula(c, true);
      $("#natural-domain").textContent = "Domínio natural: " + naturalDomain(c);
      if (c.visible && !error) {
        curves.unshift({
          fn: (x) => familyValue(c, x),
          color: c.color,
          name: "f",
          label: "f(x) = " + familyFormula(c),
          breaks: familyBreaks(c, s.xmin, s.xmax),
        });
        if (c.type === "trigonometrica") {
          if (c.trig === "tan") {
            if (c.b && c.c)
              familyBreaks(c, s.xmin, s.xmax)
                .filter((x) => !c.domain || (x >= c.min && x <= c.max))
                .forEach((x) =>
                  guides.push({ axis: "x", value: x, color: c.color }),
                );
          } else {
            const b = trigBounds(c);
            if (b) {
              guides.push({
                axis: "y",
                value: b.max,
                color: c.color,
                label: "máx. " + decimal(b.max),
              });
              if (b.max !== b.min)
                guides.push({
                  axis: "y",
                  value: b.min,
                  color: c.color,
                  label: "mín. " + decimal(b.min),
                });
            }
          }
        }
      }
      options = {
        ...s,
        width: 1000,
        height: 490,
        xlabel: "x",
        ylabel: "y",
        curves,
        legend: false,
        radians: c.type === "trigonometrica",
        grid: true,
        guides,
      };
      let summary = "f(x) = " + familyFormula(c);
      const T = period(c);
      if (c.type === "trigonometrica")
        summary += T
          ? ` · T = ${c.trig === "tan" ? "π" : "2π"}/|c| = ${c.trig === "tan" ? "π" : "2π"}/|${decimal(c.c)}| ≈ ${decimal(T)} rad`
          : " · Sem período fundamental positivo";
      $("#graph-summary").textContent = summary;
      $("#function-details").innerHTML =
        `<p>Domínio: ${xml(naturalDomain(c))}${c.domain ? ` ∩ [${decimal(c.min)}; ${decimal(c.max)}]` : ""}.</p>${algebraDetails(c)}${c.type === "logistica" ? "<p>Crescimento logístico: para b ≠ 0, os patamares da curva completa são y = d e y = a + d.</p>" : ""}${c.type === "trigonometrica" ? "<p>As linhas tracejadas mostram os extremos no domínio escolhido (seno e cosseno) ou as assíntotas (tangente). Os ângulos estão em radianos.</p>" : ""}<div class="table-scroll"><table class="data-table"><thead><tr><th>x</th>${[-2, -1, 0, 1, 2].map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody><tr><th>f(x)</th>${[-2, -1, 0, 1, 2].map((x) => `<td>${decimal(familyValue(c, x))}</td>`).join("")}</tr></tbody></table></div>`;
      if ($("#explore-logistic"))
        $("#explore-logistic").onclick = () => changeFamily("logistica");
    }
    drawGraph($("#function-graph"), options);
    $("#function-graph").setAttribute(
      "aria-label",
      `Gráfico com ${curves.length} funções. Janela x de ${decimal(options.xmin)} a ${decimal(options.xmax)}, y de ${decimal(options.ymin)} a ${decimal(options.ymax)}. Role o mouse ou use mais e menos para ajustar o zoom.`,
    );
    (!free ? [c] : []).concat(rows).forEach((q, i) => {
      const chip = document.querySelector(`[data-color="${i}"]`);
      chip.querySelector("i").style.background = q.color;
      chip.classList.toggle("muted", !q.visible);
      $("#chip-label-" + i).textContent = names[i] + "(x)";
      chip.title =
        !free && i === 0 ? familyFormula(c) : q.expression || "Escolher cor";
    });
  }
  function syncWindow() {
    for (const k of ["xmin", "xmax", "ymin", "ymax"])
      $("#window-" + k).value = decimal(windowState[k], 5);
  }
  function setWindow(v) {
    Object.assign(windowState, v);
    syncWindow();
    draw();
  }
  function resetWindow() {
    const next = free
      ? { xmin: -5, xmax: 5, ymin: -2, ymax: 8 }
      : c.type === "trigonometrica"
        ? { xmin: -2 * Math.PI, xmax: 2 * Math.PI, ymin: -3, ymax: 3 }
        : c.type === "logistica"
          ? { xmin: -8, xmax: 8, ymin: -1, ymax: 10 }
          : { xmin: -10, xmax: 10, ymin: -6, ymax: 6 };
    setWindow(next);
  }
  $("#apply-window").onclick = () => {
    try {
      const v = {};
      for (const k of ["xmin", "xmax", "ymin", "ymax"]) {
        v[k] = finiteInput($("#window-" + k).value);
        if (Math.abs(v[k]) > 10000)
          throw Error("Use valores entre −10.000 e 10.000.");
      }
      if (v.xmax - v.xmin < 1e-4 || v.ymax - v.ymin < 1e-4)
        throw Error(
          "Use mínimos menores que os máximos, com intervalo de pelo menos 0,0001.",
        );
      $("#window-error").textContent = "";
      setWindow(v);
    } catch (e) {
      $("#window-error").textContent = e.message;
    }
  };
  $("#graph-plus").onclick = () => setWindow(zoomWindow(windowState, 0.8));
  $("#graph-minus").onclick = () => setWindow(zoomWindow(windowState, 1.25));
  $("#graph-reset").onclick = resetWindow;
  rows.forEach((q, i) => {
    $("#expression-" + i).oninput = (e) => {
      q.expression = e.target.value;
      draw();
    };
    $("#visible-" + i).onchange = (e) => {
      q.visible = e.target.checked;
      draw();
    };
    if (free) {
      $("#equation-" + i).onchange = (e) => {
        q.showEquation = e.target.checked;
        draw();
      };
      for (const k of ["min", "max"])
        $("#" + k + "-" + i).oninput = (e) => {
          q[k] = e.target.value;
          draw();
        };
    }
  });
  document.querySelectorAll("[data-remove-expression]").forEach(
    (el) =>
      (el.onclick = () => {
        rows.splice(+el.dataset.removeExpression, 1);
        render();
      }),
  );
  $("#add-expression").onclick = () => {
    if (rows.length < 5)
      rows.push(makeExpression(rows.length + (free ? 0 : 2)));
    render();
  };
  document.querySelectorAll("[data-color]").forEach(
    (el) =>
      (el.onclick = () => {
        paletteTarget = +el.dataset.color;
        $("#color-palette").hidden = false;
        document
          .querySelectorAll("[data-color]")
          .forEach((b) => b.setAttribute("aria-expanded", String(b === el)));
      }),
  );
  const closePalette = () => {
    $("#color-palette").hidden = true;
    document
      .querySelectorAll("[data-color]")
      .forEach((b) => b.setAttribute("aria-expanded", "false"));
  };
  $("#close-palette").onclick = closePalette;
  document.querySelectorAll("[data-palette-color]").forEach(
    (el) =>
      (el.onclick = () => {
        const list = (!free ? [c] : []).concat(rows);
        if (paletteTarget !== null)
          list[paletteTarget].color = el.dataset.paletteColor;
        draw();
        closePalette();
      }),
  );
  $("#color-palette").onkeydown = (e) => {
    if (e.key === "Escape") closePalette();
  };
  function changeFamily(type) {
    s.curves = [makeCurve(type)];
    if (type === "trigonometrica")
      Object.assign(s, {
        xmin: -2 * Math.PI,
        xmax: 2 * Math.PI,
        ymin: -3,
        ymax: 3,
      });
    else if (type === "logistica")
      Object.assign(s, { xmin: -8, xmax: 8, ymin: -1, ymax: 10 });
    render();
  }
  if (free) {
    for (const k of ["xlabel", "ylabel"])
      $("#" + k).oninput = (e) => {
        f[k] = e.target.value;
        draw();
      };
    for (const k of ["radians", "grid"])
      $("#" + k).onchange = (e) => {
        f[k] = e.target.checked;
        draw();
      };
    $("#axes-bold").onchange = (e) => {
      f.axesBold = e.target.checked;
      draw();
    };
    $("#apply-size").onclick = () => {
      const w = +$("#width-cm").value,
        h = +$("#height-cm").value;
      if (
        !Number.isFinite(w) ||
        !Number.isFinite(h) ||
        w < 6 ||
        w > 30 ||
        h < 4 ||
        h > 25
      ) {
        $("#size-error").textContent = "Largura: 6–30 cm. Altura: 4–25 cm.";
        return;
      }
      Object.assign(f, { widthCm: w, heightCm: h });
      $("#size-error").textContent = "";
      draw();
    };
    const bindPoints = () =>
      document.querySelectorAll("[data-remove-point]").forEach(
        (el) =>
          (el.onclick = () => {
            f.points.splice(+el.dataset.removePoint, 1);
            $("#point-list").innerHTML = pointList();
            $("#add-point").disabled = false;
            bindPoints();
            draw();
          }),
      );
    bindPoints();
    $("#add-point").onclick = () => {
      try {
        if (f.points.length >= 12) return;
        f.points.push({
          x: finiteInput($("#point-x").value),
          y: finiteInput($("#point-y").value),
          label: $("#point-label").value,
          project: $("#point-project").checked,
        });
        $("#point-error").textContent = "";
        $("#point-list").innerHTML = pointList();
        $("#add-point").disabled = f.points.length >= 12;
        bindPoints();
        draw();
      } catch (e) {
        $("#point-error").textContent = e.message;
      }
    };
  } else {
    $("#family").onchange = (e) => changeFamily(e.target.value);
    if ($("#trig"))
      $("#trig").onchange = (e) => {
        c.trig = e.target.value;
        draw();
      };
    $("#main-visible").onchange = (e) => {
      c.visible = e.target.checked;
      draw();
    };
    $("#limit-domain").onchange = (e) => {
      c.domain = e.target.checked;
      $("#main-domain-fields").hidden = !c.domain;
      draw();
    };
    for (const k of ["min", "max"])
      $("#domain-" + k).oninput = (e) => {
        if (Number.isFinite(e.target.valueAsNumber)) {
          c[k] = e.target.valueAsNumber;
          draw();
        }
      };
    for (const [k, , min, max] of PARAMS[c.type]) {
      const update = (v, write = true) => {
        c[k] = v;
        $("#coef-" + k).min = Math.min(min, v);
        $("#coef-" + k).max = Math.max(max, v);
        $("#coef-" + k).value = v;
        if (write) $("#value-" + k).value = Number(v.toFixed(4));
        draw();
      };
      $("#coef-" + k).oninput = (e) => {
        stop(k);
        update(+e.target.value);
      };
      $("#value-" + k).oninput = (e) => {
        const v = e.target.valueAsNumber;
        if (Number.isFinite(v) && Math.abs(v) <= 1000) {
          stop(k);
          update(v, false);
          e.target.setCustomValidity("");
        } else e.target.setCustomValidity("Use um valor entre −1.000 e 1.000.");
      };
      $("#play-" + k).onclick = () => {
        if (playing.has(k)) stop(k);
        else {
          c[k] = Math.max(min, Math.min(max, c[k]));
          playing.set(k, { min, max, direction: c[k] >= max ? -1 : 1 });
          $("#play-" + k).textContent = "Ⅱ";
          $("#play-" + k).setAttribute("aria-pressed", "true");
          $("#play-" + k).setAttribute("aria-label", "Pausar coeficiente " + k);
          if (!raf) {
            previous = 0;
            raf = requestAnimationFrame(animate);
          }
        }
      };
    }
    $("#stop-animation").onclick = stopAll;
  }
  function stop(k) {
    playing.delete(k);
    const b = $("#play-" + k);
    if (b) {
      b.textContent = "▶";
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
    const dt = Math.min((t - previous) / 1000, 0.1);
    if (t - previous >= 50) {
      previous = t;
      for (const [k, p] of playing) {
        let v = c[k] + (p.direction * (p.max - p.min) * dt) / 9;
        if (v > p.max) {
          v = p.max;
          p.direction = -1;
        }
        if (v < p.min) {
          v = p.min;
          p.direction = 1;
        }
        c[k] = v;
        $("#coef-" + k).value = v;
        $("#value-" + k).value = Number(v.toFixed(3));
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
  attachTrace($("#function-graph"), () => options);
  const removeZoom = attachGraphZoom(
    $("#function-graph"),
    () => options,
    setWindow,
  );
  $("#function-graph").onkeydown = (e) => {
    if (["+", "=", "-", "0"].includes(e.key)) {
      e.preventDefault();
      if (e.key === "0") resetWindow();
      else setWindow(zoomWindow(windowState, e.key === "-" ? 1.25 : 0.8));
    }
  };
  for (const format of ["svg", "png"])
    $("#export-" + format).onclick = async () => {
      try {
        await downloadGraph(
          free ? options : { ...options, legend: true },
          format,
        );
        toast("Figura exportada com fundo transparente.");
      } catch (e) {
        toast(e.message);
      }
    };
  common();
  return () => {
    stopAll();
    removeZoom();
    document.removeEventListener("visibilitychange", visibility);
  };
}
