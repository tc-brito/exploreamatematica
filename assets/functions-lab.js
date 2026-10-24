import {
  FAMILIES,
  PALETTE,
  PARAMS,
  makeCurve,
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
import { drawGraph, attachTrace, downloadGraph, xml, decimal } from "./plot.js";
const names = ["f", "g", "h", "p", "q"];
const numberField = (id, label, value, extra = "") =>
  `<label class="field compact-field" for="${id}"><span>${label}</span><input id="${id}" type="number" step="any" value="${value}" ${extra}></label>`;
const textField = (id, label, value, extra = "") =>
  `<label class="field compact-field" for="${id}"><span>${label}</span><input id="${id}" value="${xml(value)}" ${extra}></label>`;
const colorField = (id, value) =>
  `<label class="color-field" for="${id}"><span>Cor</span><select id="${id}" style="border-left:5px solid ${value}">${PALETTE.map(([v, l]) => `<option value="${v}" ${v === value ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
function viewportFields(o, prefix) {
  return `<div class="field-grid">${[
    ["xmin", "x mínimo"],
    ["xmax", "x máximo"],
    ["ymin", "y mínimo"],
    ["ymax", "y máximo"],
  ]
    .map(([k, l]) => textField(prefix + k, l, o[k]))
    .join(
      "",
    )}</div><button id="${prefix}apply" class="wide-button">Aplicar janela</button><p class="small error" id="${prefix}error" role="status"></p>`;
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
    free = s.mode === "free",
    c = s.curves[s.active],
    f = s.free;
  let options,
    raf = 0,
    previous = 0,
    playing = new Map();
  const nav = `<div class="function-tabs" role="group" aria-label="Modo do laboratório"><button id="mode-families" aria-pressed="${!free}" class="${!free ? "selected" : ""}">Famílias de funções</button><button id="mode-free" aria-pressed="${free}" class="${free ? "selected" : ""}">Construção livre · figuras para provas</button></div>`;
  let controls = free ? freeControls() : familyControls();
  $("#main").innerHTML = shell(
    "Funções",
    free
      ? "Construa uma figura precisa e leve-a para sua próxima atividade."
      : "Compare curvas, anime parâmetros e investigue as transformações.",
    controls,
    `<div class="stage-top"><strong>${free ? "Seu gráfico" : "Gráficos em comparação"}</strong><span class="pill">${free ? "EXPORTAÇÃO TRANSPARENTE" : "ATÉ 4 EQUAÇÕES"}</span></div><div class="stage graph-stage ${free ? "exam-stage" : ""}"><svg id="function-graph" role="img" aria-label="Gráfico de funções"></svg></div><div class="graph-inspector"><span id="coordinate-readout">Passe o ponteiro sobre uma curva para ler as coordenadas.</span><div>${textField("inspect-x", "Consultar x", "0", 'inputmode="decimal"')}<button id="inspect-go">Localizar</button></div></div><div class="export-toolbar"><span>${free ? "Fundo transparente · sem marca d’água" : "Salve as curvas da exploração"}</span><button id="export-svg">↓ SVG vetorial</button><button id="export-png">↓ PNG</button></div><div class="formula-panel" id="function-details"></div>`,
    nav,
  );
  $("#lab-controls").classList.add("extended-controls", "function-controls");
  $("#mode-families").onclick = () => {
    s.mode = "families";
    render();
  };
  $("#mode-free").onclick = () => {
    s.mode = "free";
    render();
  };
  function familyControls() {
    return `<div class="control-title">Equações <span>${s.curves.length}/4</span></div><div class="curve-list">${s.curves.map((q, i) => `<div class="curve-card ${s.active === i ? "active" : ""}" style="--curve-color:${q.color}"><button class="curve-select" data-curve="${i}" aria-pressed="${s.active === i}"><b>${names[i]}(x)</b><span id="curve-formula-${i}">${xml(familyFormula(q))}</span></button><div class="curve-actions"><label><input type="checkbox" data-visible="${i}" ${q.visible ? "checked" : ""}> Mostrar</label><button data-remove="${i}" aria-label="Remover ${names[i]}" ${s.curves.length === 1 ? "disabled" : ""}>×</button></div></div>`).join("")}</div><button id="add-curve" class="wide-button" ${s.curves.length >= 4 ? "disabled" : ""}>＋ Adicionar equação</button><div class="control-section"><h2>Editando ${names[s.active]}(x)</h2>${select("family", "Família de função", FAMILIES, c.type)}${
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
    }${colorField("curve-color", c.color)}<p class="symbolic-formula">${xml(familyFormula(c, true))}</p>${PARAMS[c.type].map(([k, l, min, max, step]) => `<div class="parameter"><label for="coef-${k}"><b>${k}</b> ${l}</label><div class="parameter-values"><input type="range" id="coef-${k}" min="${Math.min(min, c[k])}" max="${Math.max(max, c[k])}" step="${step}" value="${c[k]}" aria-label="Coeficiente ${k}"><input type="number" id="value-${k}" step="${step}" value="${Number(c[k].toFixed(4))}" aria-label="Valor de ${k}"><button id="play-${k}" aria-label="Animar coeficiente ${k}" aria-pressed="false">▶</button></div></div>`).join("")}<button id="stop-animation" class="text-button">Pausar animações</button><p id="family-error" class="small error" role="status"></p></div><div class="control-section"><h2>Domínio da equação</h2><p id="natural-domain" class="small"></p>${check("limit-domain", "Limitar intervalo de x", c.domain)}${c.domain ? `<div class="field-grid">${numberField("domain-min", "Início (incluído)", c.min)}${numberField("domain-max", "Fim (incluído)", c.max)}</div>` : ""}<p class="small">Sem restrição, usamos todo o domínio natural. A janela abaixo define apenas a região visível.</p></div><details class="control-section"><summary>Janela do gráfico</summary>${viewportFields(s, "family-")}</details>`;
  }
  function freeControls() {
    return `<div class="control-title">Construção livre <span>${f.equations.length}/5</span></div><p class="small">Escreva expressões em x. Use ^ para potências, pi, sen(x), cos(x), tan(x), sqrt(x), ln(x), log(x) ou |x|. log usa base 10.</p><div class="free-equations">${f.equations.map((q, i) => `<div class="free-equation"><label class="field" for="expression-${i}"><span>${names[i]}(x) =</span><input id="expression-${i}" value="${xml(q.expression)}" maxlength="240" spellcheck="false" autocomplete="off" placeholder="Ex.: 2x + 1"></label><div class="equation-options">${colorField("free-color-" + i, q.color)}<label class="check"><input type="checkbox" id="free-visible-${i}" ${q.visible ? "checked" : ""}>Exibir</label><button data-free-remove="${i}" aria-label="Remover função ${names[i]}" ${f.equations.length === 1 ? "disabled" : ""}>×</button></div><p id="expression-error-${i}" class="small error" role="status"></p></div>`).join("")}</div><button id="add-free" class="wide-button" ${f.equations.length >= 5 ? "disabled" : ""}>＋ Adicionar função</button><details class="control-section" open><summary>Janela e eixos</summary>${viewportFields(f, "free-")}<div class="field-grid">${textField("xlabel", "Nome do eixo x", f.xlabel, 'maxlength="30"')}${textField("ylabel", "Nome do eixo y", f.ylabel, 'maxlength="30"')}</div>${check("radians", "Eixo x em radianos", f.radians)}${check("grid", "Mostrar malha", f.grid)}${check("legend", "Mostrar equações na figura", f.legend)}</details><details class="control-section"><summary>Destacar coordenadas</summary><p class="small">Informe x e y. Você pode usar pi/2, por exemplo.</p><div class="field-grid">${textField("point-x", "x", "0")}${textField("point-y", "y", "0")}</div>${textField("point-label", "Rótulo (opcional)", "", 'maxlength="24"')}${check("point-project", "Projetar nos eixos", true)}<button id="add-point" class="wide-button" ${f.points.length >= 12 ? "disabled" : ""}>＋ Marcar ponto</button><p id="point-error" class="small error" role="status"></p><div id="point-list">${f.points.map((p, i) => `<div class="point-row"><span>${xml(p.label || "P" + (i + 1))}: (${decimal(p.x)}; ${decimal(p.y)})</span><button data-point-remove="${i}" aria-label="Remover ponto ${i + 1}">×</button></div>`).join("")}</div></details><details class="control-section" open><summary>Tamanho da figura</summary><div class="field-grid">${numberField("export-width", "Largura · px", f.width, 'min="320" max="2000"')}${numberField("export-height", "Altura · px", f.height, 'min="240" max="1600"')}</div><button id="apply-size" class="wide-button">Aplicar tamanho</button><p id="size-error" class="small error" role="status"></p><p class="small">SVG mantém a nitidez em qualquer tamanho. PNG respeita as dimensões escolhidas. Ambos têm fundo transparente.</p></details>`;
  }
  function applyViewport(o, prefix) {
    $("#" + prefix + "apply").onclick = () => {
      try {
        const n = {};
        for (const k of ["xmin", "xmax", "ymin", "ymax"]) {
          n[k] = finiteInput($("#" + prefix + k).value);
          if (Math.abs(n[k]) > 10000)
            throw Error("Use valores entre −10.000 e 10.000.");
        }
        if (n.xmin >= n.xmax || n.ymin >= n.ymax)
          throw Error("Cada mínimo deve ser menor que o máximo.");
        Object.assign(o, n);
        $("#" + prefix + "error").textContent = "";
        draw();
      } catch (e) {
        $("#" + prefix + "error").textContent = e.message;
      }
    };
  }
  function draw() {
    if (free) {
      let curves = [];
      f.equations.forEach((q, i) => {
        try {
          const fn = compileExpression(q.expression);
          $("#expression-error-" + i).textContent = "";
          $("#expression-" + i).removeAttribute("aria-invalid");
          if (q.visible)
            curves.push({
              fn,
              color: q.color,
              label: `${names[i]}(x) = ${q.expression}`,
              name: names[i],
            });
        } catch (e) {
          $("#expression-error-" + i).textContent = e.message;
          $("#expression-" + i).setAttribute("aria-invalid", "true");
        }
      });
      options = { ...f, curves, professional: true, guides: [] };
      $("#function-details").innerHTML =
        "<p>A figura exportada contém somente o gráfico, os eixos, os pontos e as equações que você habilitou. O branco da prévia representa a área transparente.</p>";
    } else {
      let guides = [];
      s.curves
        .filter(
          (q) => q.visible && q.type === "trigonometrica" && !familyError(q),
        )
        .forEach((q) => {
          if (q.trig === "tan") {
            if (q.b && q.c)
              for (const x of familyBreaks(q, s.xmin, s.xmax))
                guides.push({ axis: "x", value: x, color: q.color });
          } else {
            const bounds = trigBounds(q);
            if (bounds) {
              guides.push({
                axis: "y",
                value: bounds.max,
                color: q.color,
                label: "máx. " + decimal(bounds.max),
              });
              if (bounds.min !== bounds.max)
                guides.push({
                  axis: "y",
                  value: bounds.min,
                  color: q.color,
                  label: "mín. " + decimal(bounds.min),
                });
            }
          }
        });
      options = {
        xmin: s.xmin,
        xmax: s.xmax,
        ymin: s.ymin,
        ymax: s.ymax,
        width: 1000,
        height: 580,
        xlabel: "x",
        ylabel: "y",
        radians: s.curves.some((q) => q.visible && q.type === "trigonometrica"),
        grid: true,
        legend: true,
        guides,
        curves: s.curves.flatMap((q, i) =>
          q.visible && !familyError(q)
            ? [
                {
                  fn: (x) => familyValue(q, x),
                  color: q.color,
                  label: `${names[i]}(x) = ${familyFormula(q)}`,
                  name: names[i],
                  breaks: familyBreaks(q, s.xmin, s.xmax),
                },
              ]
            : [],
        ),
      };
      s.curves.forEach(
        (q, i) => ($("#curve-formula-" + i).textContent = familyFormula(q)),
      );
      $(".symbolic-formula").textContent = familyFormula(c, true);
      $("#family-error").textContent = familyError(c);
      $("#natural-domain").textContent = "Domínio natural: " + naturalDomain(c);
      let info = `<div class="formula">${names[s.active]}(x) = ${xml(familyFormula(c))}</div><p>Domínio: ${xml(naturalDomain(c))}${c.domain ? ` ∩ [${decimal(c.min)}; ${decimal(c.max)}]` : ""}.</p>`;
      if (c.type === "trigonometrica") {
        const T = period(c);
        info += T
          ? `<p><strong>Período:</strong> T = ${c.trig === "tan" ? "π" : "2π"}/|c| = ${c.trig === "tan" ? "π" : "2π"}/|${decimal(c.c)}| = ${piLabel(T)} ≈ ${decimal(T)} rad.</p>`
          : "<p>Com b = 0 ou c = 0, a expressão é constante onde está definida; não há período fundamental positivo.</p>";
        info +=
          c.trig === "tan"
            ? "<p>As retas verticais tracejadas indicam as assíntotas x = (π/2 + kπ − d)/c, para b e c não nulos. A tangente não possui máximo nem mínimo global nesse caso.</p>"
            : `<p>Na curva completa, para b e c não nulos: amplitude = |b| = ${decimal(Math.abs(c.b))}; máximo = a + |b| = ${decimal(c.a + Math.abs(c.b))}; mínimo = a − |b| = ${decimal(c.a - Math.abs(c.b))}. Fase: d = ${decimal(c.d)} rad.</p>`;
      }
      if (c.type === "logistica")
        info +=
          "<p><strong>Crescimento logístico:</strong> uma extensão do estudo exponencial com saturação. Para b ≠ 0, os patamares assintóticos são y = d e y = a + d; a transição se centra em x = c.</p>";
      if (c.type === "logaritmica")
        info +=
          "<p>O argumento x − c deve ser positivo e a base b deve ser positiva e diferente de 1. ln(x) é o logaritmo natural; log(x) no editor livre usa base 10.</p>";
      if (
        c.type === "trigonometrica" &&
        c.trig !== "tan" &&
        c.domain &&
        !familyError(c)
      ) {
        const bounds = trigBounds(c);
        info +=
          "<p><strong>No intervalo escolhido:</strong> mínimo = " +
          decimal(bounds.min) +
          "; máximo = " +
          decimal(bounds.max) +
          ". As retas tracejadas acompanham esses valores.</p>";
      }
      info += algebraDetails(c);
      info +=
        '<details class="value-table"><summary>Tabela de valores da equação selecionada</summary><div class="table-scroll"><table class="data-table"><thead><tr><th>x</th>' +
        [-2, -1, 0, 1, 2].map((x) => "<th>" + x + "</th>").join("") +
        "</tr></thead><tbody><tr><th>" +
        names[s.active] +
        "(x)</th>" +
        [-2, -1, 0, 1, 2]
          .map((x) => "<td>" + decimal(familyValue(c, x)) + "</td>")
          .join("") +
        "</tr></tbody></table></div></details>";
      $("#function-details").innerHTML = info;
      if ($("#explore-logistic"))
        $("#explore-logistic").onclick = () => {
          s.curves[s.active] = makeCurve("logistica", s.active);
          if (s.curves.length === 1)
            Object.assign(s, { xmin: -8, xmax: 8, ymin: -1, ymax: 10 });
          render();
        };
    }
    drawGraph($("#function-graph"), options);
    $("#function-graph").setAttribute(
      "aria-label",
      `Gráfico com ${options.curves.length} funções, de x = ${options.xmin} a ${options.xmax} e y = ${options.ymin} a ${options.ymax}. Use Consultar x para ler coordenadas pelo teclado.`,
    );
  }
  if (free) {
    f.equations.forEach((q, i) => {
      $("#expression-" + i).oninput = (e) => {
        q.expression = e.target.value;
        draw();
      };
      $("#free-color-" + i).onchange = (e) => {
        q.color = e.target.value;
        e.target.style.borderLeftColor = q.color;
        draw();
      };
      $("#free-visible-" + i).onchange = (e) => {
        q.visible = e.target.checked;
        draw();
      };
    });
    document.querySelectorAll("[data-free-remove]").forEach(
      (el) =>
        (el.onclick = () => {
          f.equations.splice(+el.dataset.freeRemove, 1);
          render();
        }),
    );
    $("#add-free").onclick = () => {
      if (f.equations.length < 5)
        f.equations.push({
          expression: "x",
          color: PALETTE[f.equations.length][0],
          visible: true,
        });
      render();
    };
    applyViewport(f, "free-");
    for (const k of ["xlabel", "ylabel"])
      $("#" + k).oninput = (e) => {
        f[k] = e.target.value;
        draw();
      };
    for (const k of ["radians", "grid", "legend"])
      $("#" + k).onchange = (e) => {
        f[k] = e.target.checked;
        draw();
      };
    $("#apply-size").onclick = () => {
      let w = +$("#export-width").value,
        h = +$("#export-height").value;
      if (
        !Number.isFinite(w) ||
        !Number.isFinite(h) ||
        w < 320 ||
        w > 2000 ||
        h < 240 ||
        h > 1600
      ) {
        $("#size-error").textContent =
          "Largura: 320–2.000 px. Altura: 240–1.600 px.";
        return;
      }
      f.width = Math.round(w);
      f.height = Math.round(h);
      $("#size-error").textContent = "";
      draw();
    };
    $("#add-point").onclick = () => {
      try {
        if (f.points.length >= 12) return;
        f.points.push({
          x: finiteInput($("#point-x").value),
          y: finiteInput($("#point-y").value),
          label: $("#point-label").value,
          project: $("#point-project").checked,
        });
        render();
      } catch (e) {
        $("#point-error").textContent = e.message;
      }
    };
    document.querySelectorAll("[data-point-remove]").forEach(
      (el) =>
        (el.onclick = () => {
          f.points.splice(+el.dataset.pointRemove, 1);
          render();
        }),
    );
  } else {
    document.querySelectorAll("[data-curve]").forEach(
      (el) =>
        (el.onclick = () => {
          s.active = +el.dataset.curve;
          render();
        }),
    );
    document.querySelectorAll("[data-visible]").forEach(
      (el) =>
        (el.onchange = () => {
          s.curves[+el.dataset.visible].visible = el.checked;
          draw();
        }),
    );
    document.querySelectorAll("[data-remove]").forEach(
      (el) =>
        (el.onclick = () => {
          s.curves.splice(+el.dataset.remove, 1);
          s.active = Math.min(s.active, s.curves.length - 1);
          render();
        }),
    );
    $("#add-curve").onclick = () => {
      if (s.curves.length < 4) {
        s.curves.push(makeCurve(c.type, s.curves.length));
        s.active = s.curves.length - 1;
      }
      render();
    };
    $("#family").onchange = (e) => {
      s.curves[s.active] = makeCurve(e.target.value, s.active);
      if (e.target.value === "trigonometrica")
        Object.assign(s, {
          xmin: -2 * Math.PI,
          xmax: 2 * Math.PI,
          ymin: -3,
          ymax: 3,
        });
      render();
    };
    if ($("#trig"))
      $("#trig").onchange = (e) => {
        c.trig = e.target.value;
        draw();
      };
    $("#curve-color").onchange = (e) => {
      c.color = e.target.value;
      e.target.style.borderLeftColor = c.color;
      document
        .querySelectorAll(".curve-card")
        [s.active].style.setProperty("--curve-color", c.color);
      draw();
    };
    $("#limit-domain").onchange = (e) => {
      c.domain = e.target.checked;
      render();
    };
    for (const k of ["min", "max"])
      if ($("#domain-" + k))
        $("#domain-" + k).oninput = (e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v)) {
            c[k] = v;
            draw();
          }
        };
    applyViewport(s, "family-");
    for (const [k, , min, max, step] of PARAMS[c.type]) {
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
        } else {
          e.target.setCustomValidity(
            "Use um coeficiente entre −1.000 e 1.000.",
          );
        }
      };
      $("#play-" + k).onclick = () => {
        if (playing.has(k)) stop(k);
        else {
          c[k] = Math.max(min, Math.min(max, c[k]));
          playing.set(k, { min, max, step, direction: c[k] >= max ? -1 : 1 });
          $("#play-" + k).textContent = "Ⅱ";
          $("#play-" + k).setAttribute("aria-label", "Pausar coeficiente " + k);
          $("#play-" + k).setAttribute("aria-pressed", "true");
          if (!raf) {
            previous = 0;
            raf = requestAnimationFrame(animate);
          }
        }
      };
    }
    $("#stop-animation").onclick = () => stopAll();
  }
  function stop(k) {
    playing.delete(k);
    const b = $("#play-" + k);
    if (b) {
      b.textContent = "▶";
      b.setAttribute("aria-label", "Animar coeficiente " + k);
      b.setAttribute("aria-pressed", "false");
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
        if (c.type === "logaritmica" && k === "b" && Math.abs(v - 1) < 0.002)
          v = 1.003;
        c[k] = v;
        $("#coef-" + k).value = v;
        $("#value-" + k).value = Number(v.toFixed(3));
      }
      draw();
    }
    raf = requestAnimationFrame(animate);
  }
  const onVisibility = () => {
    if (document.hidden) stopAll();
  };
  document.addEventListener("visibilitychange", onVisibility);
  draw();
  const inspect = attachTrace(
    $("#function-graph"),
    () => options,
    (text) => ($("#coordinate-readout").textContent = text),
  );
  $("#inspect-go").onclick = () => {
    try {
      const x = finiteInput($("#inspect-x").value);
      if (x < options.xmin || x > options.xmax)
        throw Error("Escolha x dentro da janela visível.");
      inspect(x);
    } catch (e) {
      $("#coordinate-readout").textContent = e.message;
    }
  };
  $("#inspect-x").onkeydown = (e) => {
    if (e.key === "Enter") $("#inspect-go").click();
  };
  for (const format of ["svg", "png"])
    $("#export-" + format).onclick = async () => {
      try {
        await downloadGraph(options, format);
        toast("Figura exportada com fundo transparente.");
      } catch (e) {
        toast(e.message);
      }
    };
  common();
  return () => {
    stopAll();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
