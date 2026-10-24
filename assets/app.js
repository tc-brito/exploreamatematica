import { defaultGeometry, sanitizeGeometry } from "./geometry-model.js";
import { defaultFunctions, sanitizeFunctions } from "./function-math.js";
import { mountGeometry } from "./geometry-lab.js";
import { mountFunctions } from "./functions-lab.js";
import {
  choose,
  binomial,
  statistics,
  parseData,
  conditional,
  solidMetrics,
  functionValue,
  mesh,
} from "./math.js";
const $ = (s) => document.querySelector(s),
  fmt = (n, d = 2) =>
    n === null || !Number.isFinite(n)
      ? "—"
      : n.toLocaleString("pt-BR", { maximumFractionDigits: d }),
  pct = (n) => (n === null ? "indefinida" : fmt(n * 100, 1) + "%"),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const icons = {
  geometria: `<path d="M100 28 160 61 160 131 100 165 40 131 40 61Z" fill="#b4cc9d" stroke="#476a43" stroke-width="1.7"/><path d="m40 61 60 35 60-35M100 96v69" fill="none" stroke="#476a43" stroke-width="1.7"/><path d="m100 28 0 69" stroke="#476a43" stroke-dasharray="4 5"/><path d="m40 131 60-34 60 34" fill="none" stroke="#476a43" stroke-dasharray="4 5"/><circle cx="100" cy="96" r="4" fill="#194c40"/>`,
  funcoes: `<path d="M25 135H180M55 165V20" stroke="#b0a5c1"/><path d="M26 38Q90 212 175 40" fill="none" stroke="#8965b2" stroke-width="3"/><path d="M27 140 174 55" stroke="#c0abda" stroke-width="2"/><circle cx="100" cy="118" r="5" fill="#8965b2"/><text x="132" y="148" fill="#8965b2" font-family="Georgia" font-size="18">f(x)</text>`,
  estatistica: `<path d="M30 150H182" stroke="#cabda7"/><rect x="42" y="98" width="23" height="52" rx="3" fill="#e5b981"/><rect x="77" y="63" width="23" height="87" rx="3" fill="#dca264"/><rect x="112" y="31" width="23" height="119" rx="3" fill="#bf7948"/><rect x="147" y="83" width="23" height="67" rx="3" fill="#e5b981"/><path d="M25 81H180" stroke="#976139" stroke-dasharray="5 5"/><circle cx="123" cy="31" r="4" fill="#976139"/>`,
  probabilidade: `<g transform="rotate(-12 80 90)"><rect x="30" y="40" width="92" height="92" rx="15" fill="#d3e1eb" stroke="#56819b" stroke-width="1.5"/><g fill="#56819b"><circle cx="52" cy="62" r="6"/><circle cx="100" cy="62" r="6"/><circle cx="76" cy="86" r="6"/><circle cx="52" cy="110" r="6"/><circle cx="100" cy="110" r="6"/></g></g><circle cx="145" cy="125" r="33" fill="#eef5f8" stroke="#56819b" stroke-width="1.5"/><circle cx="145" cy="125" r="25" fill="none" stroke="#a5bdcb"/><text x="145" y="134" text-anchor="middle" font-size="26" fill="#56819b" font-family="Georgia">½</text>`,
};
const svgArt = (type) =>
  `<svg viewBox="0 0 210 190" aria-hidden="true">${icons[type]}</svg>`;
const topics = [
  [
    "funcoes",
    "Funções",
    "Mude os parâmetros. Veja cada transformação no gráfico.",
    ["7 famílias", "Editor de gráficos"],
  ],
  [
    "geometria",
    "Geometria espacial",
    "Gire, desmonte e descubra o que dá forma ao espaço.",
    ["6 sólidos", "Planificações"],
  ],
  [
    "estatistica",
    "Estatística",
    "Transforme dados em perguntas e compare suas medidas.",
    ["Tendência central", "Dispersão"],
  ],
  [
    "probabilidade",
    "Probabilidade",
    "Experimente o acaso e investigue os padrões que aparecem.",
    ["Condicional", "Binômio de Newton"],
  ],
];
const state = {
  geometry: defaultGeometry(),
  functions: defaultFunctions(),
  stats: { text: "4; 5; 5; 6; 7; 7; 8; 8; 9; 11", sample: false },
  prob: {
    tab: "simulacao",
    mode: "moeda",
    event: 0,
    p: 0.5,
    counts: [0, 0],
    history: [],
  },
  conditional: { a: 30, b: 20, c: 10, d: 40, reverse: false },
  binomial: { n: 5, p: 0.5, tab: "pascal", k: 2 },
};
let cleanupLab = () => {};
let current = "inicio",
  toastTimer,
  controlsOpen = false;
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 4000);
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
const plans = {
  geometria: {
    title: "O que acontece quando o sólido cresce?",
    time: "15–20 min",
    question:
      "Se a aresta do cubo dobrar, a área e o volume também dobram? Formule uma hipótese antes de mover o controle.",
    steps: [
      "Antecipar: peça que cada grupo registre quanto a área e o volume devem crescer ao dobrar a aresta.",
      "Experimentar: comece com a = 2 e passe para a = 4. Compare 24 e 96 u.a.; 8 e 64 u.v.",
      "Explicar: relacione os fatores 4 e 8 com as dimensões 2 e 3 das fórmulas. Abra a planificação para contar as faces.",
    ],
    answer:
      "Ao multiplicar todas as dimensões por k, a área é multiplicada por k² e o volume por k³. No cubo: dobrar a aresta quadruplica a área e multiplica o volume por 8.",
  },
  funcoes: {
    title: "Do parâmetro à transformação",
    time: "15–20 min",
    question:
      "Na função quadrática, o que muda quando a passa de positivo para negativo? E quando c aumenta?",
    steps: [
      "Antecipar: desenhe uma hipótese para y = x² e y = −x² antes de alterar a.",
      "Experimentar: altere a e depois c, mantendo b = 0. Compare a abertura, a concavidade e a altura do vértice.",
      "Explicar: discuta por que a = 0 deixa de produzir uma função quadrática. Explore a mesma ideia de transformação nas outras famílias.",
    ],
    answer:
      "O sinal de a determina a concavidade; |a| influencia a abertura. Somar c desloca verticalmente o gráfico. Quando a = 0, a expressão se reduz a uma função afim (ou constante).",
  },
  estatistica: {
    title: "Uma medida conta toda a história?",
    time: "15 min",
    question:
      "Acrescente um valor muito alto. Qual medida muda mais: a média ou a mediana? O que acontece com o desvio padrão?",
    steps: [
      "Antecipar: calcule e registre a média e a mediana do conjunto inicial.",
      "Experimentar: clique em “Adicionar valor extremo” e compare as medidas e o gráfico.",
      "Explicar: discuta quando a mediana pode representar melhor um conjunto assimétrico e por que dispersão também importa.",
    ],
    answer:
      "Valores extremos podem afetar fortemente a média e o desvio padrão. A mediana depende da posição dos valores ordenados e costuma ser menos sensível. Isso não significa que ela nunca muda.",
  },
  probabilidade: {
    title: "O acaso tem memória?",
    time: "15–20 min",
    question:
      "Se uma moeda mostrar cara cinco vezes seguidas, a probabilidade de cara no próximo lançamento muda?",
    steps: [
      "Antecipar: registre previsões para 10 e 1.000 lançamentos de uma moeda equilibrada.",
      "Experimentar: simule lotes crescentes. Compare a frequência relativa com a probabilidade teórica.",
      "Explicar: diferencie independência entre lançamentos e estabilização da frequência relativa em muitas repetições.",
    ],
    answer:
      "Em lançamentos independentes de uma moeda equilibrada, P(cara) continua 50%. Frequências relativas tendem a se aproximar da probabilidade com muitas repetições, mas não há compensação obrigatória nem convergência monotônica.",
  },
};
function home() {
  return `<div class="home"><section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="dot"></span> UM LABORATÓRIO PARA A SALA DE AULA</div><h1>A matemática faz<br>mais sentido quando<br><em>você explora.</em></h1><p>Transforme conceitos em descobertas. Um espaço para professores e alunos experimentarem, juntos.</p><a class="cta" href="#geometria">Começar a explorar <span>↗</span></a></div><div class="hero-art"><svg viewBox="0 0 480 380" aria-hidden="true"><defs><pattern id="gridhero" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#91b79b" stroke-opacity=".13"/></pattern></defs><circle cx="250" cy="190" r="145" fill="none" stroke="#83ab8e" stroke-opacity=".25" stroke-dasharray="3 7"/><path d="M84 280H405M140 330V46" stroke="#81a58c" stroke-opacity=".6"/><path d="M82 111Q218 444 390 76" stroke="#c4d79a" stroke-width="2.5" fill="none"/><g transform="translate(140 58) scale(1.25)"><path d="m90 15 65 37v76l-65 38-65-38V52Z" fill="#d3e9ad" fill-opacity=".8" stroke="#dbefbd"/><path d="m25 52 65 39 65-39M90 91v75" fill="none" stroke="#f3f7df" stroke-width="1.3"/><path d="M90 15V91m-65 37 65-37 65 37" fill="none" stroke="#194c40" stroke-dasharray="4 5"/><path d="m25 52 65 39v75l-65-38Z" fill="#80a77f" fill-opacity=".7"/></g><circle cx="264" cy="275" r="5" fill="#e4f3bc"/><text x="327" y="315" font-family="Georgia" font-style="italic" font-size="25" fill="#b5cda6">f(x)</text><text x="85" y="91" font-family="Georgia" font-size="26" fill="#d5e7bf" transform="rotate(-12 85 91)">∑</text><g transform="translate(350 42) rotate(12)"><rect width="52" height="52" rx="11" fill="#f3f4dd"/><g fill="#194c40"><circle cx="15" cy="15" r="3"/><circle cx="37" cy="15" r="3"/><circle cx="26" cy="26" r="3"/><circle cx="15" cy="37" r="3"/><circle cx="37" cy="37" r="3"/></g></g><text x="76" y="335" fill="#bfd4b8" font-size="11" font-family="monospace">OBSERVAR → CONJECTURAR → DESCOBRIR</text></svg></div></section><div class="intro-row"><span><b>✳</b> Feito para ensinar e aprender</span><span><b>↔</b> Interativo, do conceito à descoberta</span><span><b>✓</b> Livre para explorar. Sem cadastro.</span></div><section aria-labelledby="areas-title"><div class="section-title"><div><h2 id="areas-title">Por onde vamos começar?</h2><p>Escolha uma área. Deixe a curiosidade conduzir.</p></div><span>04 áreas de exploração</span></div><div class="cards">${topics.map(([id, title, desc, tags], i) => `<a class="topic-card" href="#${id}"><div class="card-art"><span class="card-number">0${i + 1} /</span>${svgArt(id)}</div><div class="card-body"><h3>${title}</h3><p>${desc}</p><div class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div><span class="card-link">Abrir laboratório <span>↗</span></span></div></a>`).join("")}</div></section><section class="teacher-strip"><span class="spark">✳</span><div><h3>Menos respostas prontas. Mais boas perguntas.</h3><p>Cada laboratório traz uma proposta de investigação para levar à sua aula.</p></div><button id="home-guide">Conheça o guia do professor ↗</button></section></div>`;
}
function lessonPlan() {
  if (current === "geometria" && state.geometry.type !== "cubo") {
    const type = state.geometry.type,
      base = plans.geometria;
    const lessons = {
      prisma: [
        "Como o volume responde à altura?",
        "Mantenha a base do prisma e dobre apenas a altura. A área total também dobra?",
        "Compare alturas 3 e 6 com a mesma base.",
        "O volume dobra. A área lateral dobra, mas a área das duas bases permanece a mesma.",
      ],
      piramide: [
        "Uma pirâmide dentro de um prisma",
        "Compare a pirâmide com um prisma de mesma base e altura. Que relação aparece entre os volumes?",
        "Use uma base quadrada de lado 4 e altura 6; no prisma, configure também b = 4.",
        "O volume da pirâmide é um terço do volume do prisma de mesma base e altura. O apótema lateral é diferente da altura.",
      ],
      cilindro: [
        "Desenrolando a superfície",
        "Qual deve ser a largura do retângulo na planificação do cilindro? Como ela se relaciona com o raio?",
        "Abra a planificação e relacione a largura do retângulo à circunferência da base.",
        "A largura é 2πr; a altura do retângulo é h. A área lateral é 2πrh, à qual somamos as áreas dos dois discos.",
      ],
      cone: [
        "Um cone, um cilindro e uma hipótese",
        "Um cone e um cilindro têm o mesmo raio e a mesma altura. Seus volumes são iguais?",
        "Compare cone e cilindro com r = 3 e h = 4. Ative a geratriz e diferencie-a da altura.",
        "O cone tem um terço do volume do cilindro correspondente. Sua planificação é um setor circular de raio g mais o disco da base.",
      ],
      esfera: [
        "A esfera pode virar um plano?",
        "O que acontece com a área e o volume ao dobrar o raio? Por que não há planificação exata da esfera?",
        "Compare r = 2 e r = 4. Discuta a diferença entre uma esfera e uma superfície cilíndrica.",
        "Dobrar o raio quadruplica a área e multiplica o volume por 8. A superfície esférica não pode ser planificada sem deformação.",
      ],
    };
    const [title, question, experiment, answer] = lessons[type];
    return {
      ...base,
      title,
      question,
      steps: [
        "Antecipar: registre as hipóteses da turma antes de alterar os controles.",
        experiment,
        "Explicar: confronte as hipóteses com a visualização e com as fórmulas.",
      ],
      answer,
    };
  }
  if (
    current === "funcoes" &&
    state.functions.mode !== "free" &&
    state.functions.curves[state.functions.active].type !== "quadratica"
  ) {
    const type = state.functions.curves[state.functions.active].type,
      lessons = {
        afim: [
          "Inclinação e ponto de partida",
          "O que muda quando alteramos a? E quando mudamos apenas b?",
          "Compare y = 2x + 1, y = −2x + 1 e y = 2x + 3.",
          "O coeficiente a controla a inclinação e o sentido de crescimento. O coeficiente b é a ordenada na origem.",
        ],
        exponencial: [
          "Crescer ou decrescer?",
          "O que acontece quando a base passa de 2 para 0,5? E se a base for 1?",
          "Mantenha a = 1 e c = 0. Compare b = 2, b = 0,5 e b = 1.",
          "Para a > 0, bases maiores que 1 produzem crescimento e bases entre 0 e 1 produzem decaimento. A base 1 produz uma constante.",
        ],
        trigonometrica: [
          "O ritmo de uma onda",
          "Qual parâmetro muda a altura da onda? Qual muda o intervalo entre as repetições?",
          "Compare b = 1 e b = 2; depois mantenha b = 1 e compare c = 1 e c = 2.",
          "Em a + b sen(cx + d), a amplitude é |b| e o período é 2π/|c| para b e c não nulos. A fase d desloca a onda horizontalmente em −d/c. Na tangente, o período é π/|c|.",
        ],
      };
    const [title, question, experiment, answer] = lessons[type] || [
      "Transformações e domínio",
      "Como a curva responde a cada coeficiente? Quais valores de x são permitidos?",
      "Adicione uma segunda equação e altere um coeficiente por vez.",
      "Compare o domínio, a posição da curva e seu comportamento. Registre as conclusões com a expressão algébrica.",
    ];
    return {
      ...plans.funcoes,
      title,
      question,
      steps: [
        "Antecipar: desenhe a transformação esperada.",
        experiment,
        "Explicar: descreva o papel de cada parâmetro com palavras e expressões.",
      ],
      answer,
    };
  }
  return plans[current];
}
function shell(title, subtitle, controls, content, subnav = "") {
  const plan = lessonPlan();
  return `<div class="lab"><div class="breadcrumb"><a href="#inicio">Início</a><span>/</span><span>${title}</span></div><div class="lab-title"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="lab-actions"><button id="reset">↺ Reiniciar</button><button id="share">↗ Compartilhar</button><button id="present">⛶ ${document.body.classList.contains("presenting") ? "Sair da apresentação" : "Apresentar"}</button></div></div>${subnav}<div class="workspace ${controlsOpen ? "controls-open" : ""}"><button class="mobile-controls" id="toggle-controls" aria-expanded="${controlsOpen}" aria-controls="lab-controls">Ajustar exploração <span>${controlsOpen ? "−" : "＋"}</span></button><aside id="lab-controls" class="controls" aria-label="Controles do laboratório">${controls}</aside><section class="stage-column" aria-label="Visualização e resultados">${content}</section></div><section class="insight"><h2>✳ Para investigar<br>com a turma</h2><p>${plan.question}</p><button id="lesson">Roteiro de aula ↗</button></section><section class="teacher-notes" id="lesson-notes" hidden><div class="eyebrow">${plan.time} · INVESTIGAÇÃO GUIADA</div><h3>${plan.title}</h3><ol>${plan.steps.map((s) => `<li>${s}</li>`).join("")}</ol><details><summary>Notas para o professor</summary><p>${plan.answer}</p></details><button id="print">Imprimir roteiro</button></section></div>`;
}
function common() {
  $("#toggle-controls").onclick = () => {
    const open = $(".workspace").classList.toggle("controls-open");
    controlsOpen = open;
    $("#toggle-controls").setAttribute("aria-expanded", open);
    $("#toggle-controls").innerHTML =
      "Ajustar exploração <span>" + (open ? "−" : "＋") + "</span>";
  };
  $("#reset").onclick = () => {
    if (current === "geometria") state.geometry = defaultGeometry();
    if (current === "funcoes") state.functions = defaultFunctions();
    if (current === "estatistica")
      Object.assign(state.stats, {
        text: "4; 5; 5; 6; 7; 7; 8; 8; 9; 11",
        sample: false,
      });
    if (current === "probabilidade") {
      Object.assign(state.prob, {
        mode: "moeda",
        event: 0,
        p: 0.5,
        counts: [0, 0],
        history: [],
      });
      Object.assign(state.conditional, {
        a: 30,
        b: 20,
        c: 10,
        d: 40,
        reverse: false,
      });
      Object.assign(state.binomial, { n: 5, p: 0.5, tab: "pascal", k: 2 });
    }
    render();
  };
  $("#present").onclick = () => {
    document.body.classList.toggle("presenting");
    $("#present").textContent = document.body.classList.contains("presenting")
      ? "⛶ Sair da apresentação"
      : "⛶ Apresentar";
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
    state,
  });
}
function downloadSVG(id, name) {
  let original = $("#" + id),
    copy = original.cloneNode(true);
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.insertAdjacentHTML(
    "afterbegin",
    '<style>text{font-family:sans-serif;fill:#203831;font-size:12px}.plot-value{font-weight:600}</style><rect width="100%" height="100%" fill="#fcfdf9"/>',
  );
  const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(copy)], {
        type: "image/svg+xml",
      }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name + ".svg";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    toast,
  });
}
function statisticsLab() {
  const s = state.stats;
  $("#main").innerHTML = shell(
    "Estatística",
    "Encontre histórias nos dados. Investigue o que as medidas revelam.",
    `<div class="control-title">Seus dados <span>▥</span></div><label class="field" for="data"><span>Valores do conjunto</span><textarea id="data" spellcheck="false">${esc(s.text)}</textarea></label><p class="small">Separe com espaço ou ponto e vírgula. Use vírgula para decimais: 4; 5,5; 7. Até 500 valores.</p><button id="apply-data" class="primary wide">Atualizar dados</button><p class="error" id="data-error" role="alert"></p><div class="control-section"><h2>Experimente</h2><div class="inline-actions"><button id="outlier">+ Valor extremo</button><button id="example">Outro conjunto</button></div>${select(
      "variance-type",
      "Cálculo da dispersão",
      [
        ["population", "População (divide por n)"],
        ["sample", "Amostra (divide por n − 1)"],
      ],
      s.sample ? "sample" : "population",
    )}<p class="small">Use população para descrever todo o grupo observado; amostra para estimar a variância de uma população maior.</p></div>`,
    `<div class="stage-top"><strong>Distribuição dos valores</strong><span class="pill" id="data-count"></span></div><div class="stage"><svg id="stats-plot" viewBox="0 0 800 420" role="img" aria-label="Gráfico de frequências dos valores"></svg><div class="stage-tools"><button id="stats-export" aria-label="Baixar gráfico de dados">↓</button></div></div><div class="legend"><span><i></i>Frequência absoluta</span><span><i class="violet"></i>Média (linha tracejada)</span></div><div class="metrics" id="central"></div><div class="metrics" id="dispersion"></div><div class="table-wrap"><details><summary class="small">Ver tabela de frequências e dados ordenados</summary><div id="stats-table"></div></details></div>`,
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
      toast("O limite é 500 valores.");
      return;
    }
    let max = Math.max(...data),
      min = Math.min(...data),
      v = Math.min(1e9, max + Math.max(1, max - min) * 5);
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
  let s = state.stats,
    values = parseData(s.text),
    m = statistics(values, s.sample);
  $("#data-count").textContent = m.n + " OBSERVAÇÕES";
  $("#central").innerHTML =
    metric("Média", fmt(m.mean), "Soma dos valores ÷ n") +
    metric("Mediana", fmt(m.median), "Centro dos dados ordenados") +
    metric(
      "Moda",
      m.modes.length
        ? m.modes
            .slice(0, 5)
            .map((x) => fmt(x))
            .join("; ") + (m.modes.length > 5 ? "…" : "")
        : "Amodal",
      m.modes.length ? "Maior frequência" : "Nenhum valor se repete",
    );
  $("#dispersion").innerHTML =
    metric("Amplitude", fmt(m.range), "Máximo − mínimo") +
    metric(
      "Variância " + (s.sample ? "amostral" : "populacional"),
      fmt(m.variance),
      m.variance === null
        ? "Necessita de n ≥ 2"
        : "Soma dos desvios² ÷ " + (s.sample ? "(n − 1)" : "n"),
    ) +
    metric("Desvio padrão", fmt(m.std), "Raiz quadrada da variância");
  let entries = [...m.frequencies].sort((a, b) => a[0] - b[0]),
    binned = entries.length > 25,
    bins;
  if (binned) {
    let count = 12,
      w = (m.max - m.min) / count;
    bins = Array.from({ length: count }, (_, i) => ({
      x: m.min + (i + 0.5) * w,
      n: 0,
      label: fmt(m.min + i * w) + " a " + fmt(m.min + (i + 1) * w),
    }));
    values.forEach(
      (v) => bins[Math.min(count - 1, Math.floor((v - m.min) / w))].n++,
    );
  } else bins = entries.map(([x, n]) => ({ x, n, label: fmt(x) }));
  let span = m.max - m.min || 2,
    lo = m.min - span * 0.1,
    hi = m.max + span * 0.1,
    X = (x) => 70 + ((x - lo) / (hi - lo)) * 660,
    peak = Math.max(...bins.map((b) => b.n)),
    V = (y) => 340 - (y / peak) * 265,
    width = binned
      ? (660 / bins.length) * 0.8
      : Math.min(
          45,
          ...bins.slice(1).map((b, i) => (X(b.x) - X(bins[i].x)) * 0.75),
        );
  let html = '<text x="70" y="27" class="plot-label">Frequência</text>';
  for (let i = 0; i <= 4; i++) {
    let n = (peak * i) / 4;
    html += `<path d="M70 ${V(n)}H740" stroke="#e0e6dc"/><text x="57" y="${V(n) + 4}" text-anchor="end" class="plot-label">${fmt(n, 1)}</text>`;
  }
  bins.forEach(
    (b, i) =>
      (html += `<rect x="${X(b.x) - width / 2}" y="${V(b.n)}" width="${width}" height="${340 - V(b.n)}" rx="4" fill="#94b57f"><title>${esc(b.label)}: ${b.n}</title></rect><text x="${X(b.x)}" y="${V(b.n) - 9}" text-anchor="middle" class="plot-value">${b.n}</text>${bins.length <= 12 || i % 2 === 0 ? `<text x="${X(b.x)}" y="364" text-anchor="middle" class="plot-label">${fmt(b.x, 1)}</text>` : ""}`),
  );
  html += `<path d="M${X(m.mean)} 45V341" stroke="#7557a4" stroke-width="2" stroke-dasharray="6 5"/><text x="${Math.max(90, Math.min(680, X(m.mean) + 8))}" y="48" fill="#7557a4" font-family="sans-serif" font-size="12">Média ${fmt(m.mean)}</text><text x="400" y="400" text-anchor="middle" class="plot-label">${binned ? "Valores agrupados em 12 intervalos (rótulos nos centros)" : "Valor observado"}</text>`;
  $("#stats-plot").innerHTML = html;
  $("#stats-table").innerHTML =
    `<p class="small">${m.sorted.map((x) => fmt(x)).join(" · ")}</p><table class="data-table"><thead><tr><th>Valor</th><th>Frequência</th><th>Frequência relativa</th></tr></thead><tbody>${entries.map(([v, n]) => `<tr><td>${fmt(v)}</td><td>${n}</td><td>${pct(n / m.n)}</td></tr>`).join("")}</tbody></table>`;
}
function probabilityLab() {
  const tabs = [
      ["simulacao", "Experimentos"],
      ["condicional", "Probabilidade condicional"],
      ["binomio", "Binômio de Newton"],
    ],
    s = state.prob,
    subnav = `<div class="subnav" aria-label="Tópicos de probabilidade">${tabs.map(([id, l]) => `<button data-prob="${id}" class="${s.tab === id ? "selected" : ""}" aria-pressed="${s.tab === id}">${l}</button>`).join("")}</div>`;
  if (s.tab === "simulacao") simulation(subnav);
  else if (s.tab === "condicional") conditionalLab(subnav);
  else binomialLab(subnav);
  document.querySelectorAll("[data-prob]").forEach(
    (b) =>
      (b.onclick = () => {
        s.tab = b.dataset.prob;
        render();
      }),
  );
  common();
}
function simulation(subnav) {
  const s = state.prob,
    labels =
      s.mode === "moeda"
        ? ["Cara", "Coroa"]
        : s.mode === "dado"
          ? ["1", "2", "3", "4", "5", "6"]
          : Array.from({ length: 11 }, (_, i) => String(i + 2));
  $("#main").innerHTML = shell(
    "Probabilidade",
    "Experimente o acaso. Compare previsões e resultados.",
    `<div class="control-title">Seu experimento <span>⚄</span></div>${select(
      "experiment",
      "O que vamos lançar?",
      [
        ["moeda", "Uma moeda"],
        ["dado", "Um dado de 6 faces"],
        ["dois", "Dois dados · soma"],
      ],
      s.mode,
    )}${select(
      "event",
      "Evento observado",
      labels.map((l, i) => [String(i), l]),
      String(s.event),
    )}${s.mode === "moeda" ? range("coin-p", "Probabilidade de cara", s.p, 0, 1, 0.05) : '<p class="small">Dados equilibrados e lançamentos independentes.</p>'}<div class="control-section"><h2>Simular lançamentos</h2><button id="roll-one" class="primary wide">Lançar uma vez</button><div class="inline-actions"><button data-roll="10">+ 10</button><button data-roll="100">+ 100</button><button data-roll="1000">+ 1.000</button></div><button id="clear-rolls" class="quiet wide">Limpar resultados</button><p class="small">Os resultados são aleatórios. Mudar o experimento ou a probabilidade inicia uma nova amostra.</p><div id="last-roll" class="small" role="status"></div></div>`,
    `<div class="stage-top"><strong>Frequência observada × probabilidade</strong><span class="pill">SIMULAÇÃO</span></div><div class="stage"><svg id="prob-plot" viewBox="0 0 800 380" role="img" aria-label="Comparação das frequências observadas e teóricas"></svg></div><div class="legend"><span><i></i>Frequência observada</span><span><i class="violet"></i>Probabilidade teórica (traço)</span></div><div class="metrics" id="prob-metrics" aria-live="polite"></div><div class="table-wrap"><details><summary class="small">Contagens e frequências</summary><div id="prob-table"></div></details></div>`,
    subnav,
  );
  $("#experiment").onchange = (e) => {
    s.mode = e.target.value;
    s.event = 0;
    s.counts = Array(s.mode === "moeda" ? 2 : s.mode === "dado" ? 6 : 11).fill(
      0,
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
  document
    .querySelectorAll("[data-roll]")
    .forEach((b) => (b.onclick = () => roll(+b.dataset.roll)));
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
    last =
      s.mode === "moeda"
        ? random() < s.p
          ? 0
          : 1
        : s.mode === "dado"
          ? Math.floor(random() * 6)
          : Math.floor(random() * 6) + Math.floor(random() * 6);
    s.counts[last]++;
  }
  drawProbability();
  $("#last-roll").textContent =
    `Último resultado: ${s.mode === "moeda" ? (last === 0 ? "cara" : "coroa") : s.mode === "dado" ? last + 1 : last + 2}.`;
}
function drawProbability() {
  const s = state.prob,
    total = s.counts.reduce((a, b) => a + b, 0),
    theory =
      s.mode === "moeda"
        ? [s.p, 1 - s.p]
        : s.mode === "dado"
          ? Array(6).fill(1 / 6)
          : Array.from({ length: 11 }, (_, i) => (6 - Math.abs(i - 5)) / 36),
    labels =
      s.mode === "moeda"
        ? ["Cara", "Coroa"]
        : s.mode === "dado"
          ? ["1", "2", "3", "4", "5", "6"]
          : Array.from({ length: 11 }, (_, i) => String(i + 2)),
    peak =
      Math.max(
        0.2,
        ...theory,
        ...s.counts.map((n) => (total ? n / total : 0)),
      ) * 1.2,
    Y = (v) => 300 - (v / peak) * 240;
  let html = "";
  for (let i = 0; i <= 4; i++) {
    let v = (peak * i) / 4;
    html += `<path d="M70 ${Y(v)}H740" stroke="#e0e6dc"/><text x="58" y="${Y(v) + 4}" text-anchor="end" class="plot-label">${pct(v)}</text>`;
  }
  const step = 650 / s.counts.length;
  labels.forEach((l, i) => {
    let x = 80 + step * (i + 0.5),
      width = Math.min(90, step * 0.6),
      v = total ? s.counts[i] / total : 0;
    html += `<rect x="${x - width / 2}" y="${Y(v)}" width="${width}" height="${300 - Y(v)}" fill="${i === s.event ? "#316449" : "#a8c299"}" rx="4"/><path d="M${x - width / 2 - 5} ${Y(theory[i])}h${width + 10}" stroke="#7557a4" stroke-width="3"/><text x="${x}" y="325" text-anchor="middle" class="plot-label">${l}</text>${total ? `<text x="${x}" y="${Y(v) - 12}" text-anchor="middle" class="plot-value">${pct(v)}</text>` : ""}`;
  });
  if (!total)
    html +=
      '<text x="400" y="170" text-anchor="middle" class="plot-title">O que você espera encontrar?</text><text x="400" y="195" text-anchor="middle" class="plot-label">Faça o primeiro lançamento para começar.</text>';
  $("#prob-plot").innerHTML = html;
  $("#prob-metrics").innerHTML =
    metric("Lançamentos", fmt(total, 0)) +
    metric(
      "Frequência de " + labels[s.event],
      total ? pct(s.counts[s.event] / total) : "—",
      fmt(s.counts[s.event], 0) + " ocorrências",
    ) +
    metric("Probabilidade teórica", pct(theory[s.event]), labels[s.event]);
  $("#prob-table").innerHTML =
    `<table class="data-table"><thead><tr><th>Resultado</th><th>Contagem</th><th>Observada</th><th>Teórica</th></tr></thead><tbody>${labels.map((l, i) => `<tr><td>${l}${i === s.event ? " ★" : ""}</td><td>${s.counts[i]}</td><td>${total ? pct(s.counts[i] / total) : "—"}</td><td>${pct(theory[i])}</td></tr>`).join("")}</tbody></table><p class="small">Simulação pseudoaleatória do navegador. Cada lançamento é independente.</p>`;
}
function conditionalLab(subnav) {
  const s = state.conditional;
  let field = (id, label) =>
    `<label class="field" for="group-${id}"><span>${label}</span><input type="number" id="group-${id}" value="${s[id]}" min="0" max="1000" step="1"></label>`;
  $("#main").innerHTML = shell(
    "Probabilidade",
    "Quando sabemos algo, o espaço de possibilidades muda.",
    `<div class="control-title">Uma turma fictícia</div><p class="small"><strong>A:</strong> gosta de matemática.<br><strong>B:</strong> participa do clube de ciências.</p><div class="two-cols">${field("a", "A e B")}${field("b", "A e não B")}${field("c", "Não A e B")}${field("d", "Nem A nem B")}</div><p class="error" id="conditional-error" role="alert"></p><div class="control-section">${select(
      "condition",
      "O que queremos saber?",
      [
        ["normal", "P(A | B)"],
        ["reverse", "P(B | A)"],
      ],
      s.reverse ? "reverse" : "normal",
    )}<p class="small" id="condition-explanation"></p></div>`,
    `<div class="stage-top"><strong>Diagrama de frequências</strong><span class="pill">CONDIÇÃO EM DESTAQUE</span></div><div class="stage"><svg id="conditional-plot" viewBox="0 0 800 400" role="img" aria-label="Diagrama das quatro regiões de eventos"></svg></div><div class="prob-result" id="conditional-result" aria-live="polite"></div><div class="metrics" id="conditional-metrics"></div><div class="table-wrap" id="conditional-table"></div>`,
    subnav,
  );
  ["a", "b", "c", "d"].forEach(
    (k) =>
      ($("#group-" + k).oninput = (e) => {
        let v = +e.target.value;
        if (
          e.target.value === "" ||
          !Number.isInteger(v) ||
          v < 0 ||
          v > 1000
        ) {
          $("#conditional-error").textContent =
            "Use contagens inteiras entre 0 e 1.000.";
          return;
        }
        s[k] = v;
        $("#conditional-error").textContent = "";
        drawConditional();
      }),
  );
  $("#condition").onchange = (e) => {
    s.reverse = e.target.value === "reverse";
    drawConditional();
  };
  drawConditional();
  const insight = $(".insight p");
  insight.textContent =
    "P(A | B) é sempre igual a P(B | A)? Mude as contagens e explique por que o denominador faz diferença.";
  $("#lesson-notes").innerHTML =
    `<h3>O denominador muda a pergunta</h3><ol><li>Compare P(A | B) e P(B | A) com as contagens iniciais.</li><li>Na primeira, o universo é o clube: 30 de 40. Na segunda, é o grupo que gosta de matemática: 30 de 50.</li><li>Zere as duas contagens que compõem uma condição. Discuta por que a probabilidade fica indefinida.</li></ol><details><summary>Notas para o professor</summary><p>Nos dados iniciais, P(A | B) = 75% e P(B | A) = 60%. Para independência, compare P(A ∩ B) com P(A)P(B).</p></details><button id="print">Imprimir roteiro</button>`;
}
function drawConditional() {
  const s = state.conditional,
    m = conditional(s.a, s.b, s.c, s.d),
    den = s.a + (s.reverse ? s.b : s.c),
    value = s.reverse ? m.pbGivenA : m.paGivenB,
    formula = s.reverse ? "P(B | A)" : "P(A | B)";
  $("#condition-explanation").textContent = s.reverse
    ? "Entre quem gosta de matemática, qual é a proporção que participa do clube?"
    : "Entre os participantes do clube, qual é a proporção que gosta de matemática?";
  const cells = [
    ["A ∩ B", s.a, true, 80, 60],
    ["A ∩ não B", s.b, s.reverse, 410, 60],
    ["Não A ∩ B", s.c, !s.reverse, 80, 225],
    ["Nem A nem B", s.d, false, 410, 225],
  ];
  $("#conditional-plot").innerHTML =
    cells
      .map(
        ([l, v, on, x, y], i) =>
          `<rect x="${x}" y="${y}" width="308" height="132" rx="12" fill="${i === 0 ? "#316449" : on ? "#dce8ce" : "#eef0e9"}" stroke="${on ? "#688561" : "#e0e6dc"}" stroke-width="${on ? 2 : 1}"/><text x="${x + 22}" y="${y + 33}" fill="${i === 0 ? "#fff" : "#4e6654"}" font-size="13" font-family="sans-serif">${l}${on ? " · condição" : ""}</text><text x="${x + 22}" y="${y + 91}" fill="${i === 0 ? "#fff" : "#4e6654"}" font-size="37" font-family="sans-serif">${v}</text>`,
      )
      .join("") +
    '<text x="400" y="389" text-anchor="middle" class="plot-label">Regiões esquemáticas: áreas dos retângulos não representam proporções.</text>';
  $("#conditional-result").innerHTML =
    `<span class="big">${pct(value)}</span><div><strong>${formula} = ${s.a} / ${den}</strong><p>${den ? "Ocorrências na interseção ÷ total da condição." : "Condição vazia: divisão por zero, probabilidade indefinida."}</p></div>`;
  $("#conditional-metrics").innerHTML =
    metric("Total da turma", m.total) +
    metric("P(A)", pct(m.pa)) +
    metric("P(B)", pct(m.pb));
  $("#conditional-table").innerHTML =
    `<table class="data-table"><caption>Contagens da turma fictícia</caption><thead><tr><th></th><th>B</th><th>Não B</th><th>Total</th></tr></thead><tbody><tr><th>A</th><td>${s.a}</td><td>${s.b}</td><td>${s.a + s.b}</td></tr><tr><th>Não A</th><td>${s.c}</td><td>${s.d}</td><td>${s.c + s.d}</td></tr><tr><th>Total</th><td>${s.a + s.c}</td><td>${s.b + s.d}</td><td>${m.total}</td></tr></tbody></table>`;
}
function binomialLab(subnav) {
  const s = state.binomial;
  $("#main").innerHTML = shell(
    "Probabilidade",
    "Encontre a conexão entre combinações, álgebra e acaso.",
    `<div class="control-title">Binômio de Newton</div>${range("bin-n", "Expoente / ensaios (n)", s.n, 0, 10)}${select(
      "bin-view",
      "Representação",
      [
        ["pascal", "Triângulo de Pascal"],
        ["distribution", "Distribuição binomial"],
      ],
      s.tab,
    )}<div class="control-section">${range("bin-p", "Probabilidade de sucesso (p)", s.p, 0, 1, 0.05)}${range("bin-k", "Sucessos observados (k)", s.k, 0, s.n)}<p class="small">Na distribuição binomial, os n ensaios são independentes e têm a mesma probabilidade p de sucesso.</p></div>`,
    `<div class="stage-top"><strong id="bin-title"></strong><span class="pill">PADRÕES E COMBINAÇÕES</span></div><div class="stage" id="bin-stage"></div><div class="expansion" id="expansion"></div><div class="metrics" id="bin-metrics"></div><div class="formula-panel"><span class="formula">P(X = k) = C(n,k) · pᵏ · (1 − p)ⁿ⁻ᵏ</span><p>C(n,k) = n! / [k!(n − k)!]. Cada coeficiente conta as escolhas de k elementos entre n.</p></div>`,
    subnav,
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
  $(".insight p").textContent =
    "Por que os coeficientes de (a + b)ⁿ são os mesmos da linha n do triângulo de Pascal? O que muda na distribuição quando p deixa de ser 0,5?";
  $("#lesson-notes").innerHTML =
    `<h3>Da soma de vizinhos ao binômio</h3><ol><li>Observe as linhas 0 a 5 de Pascal. Cada termo interno é a soma dos dois termos acima.</li><li>Compare a linha n com os coeficientes de (a + b)ⁿ. Para n = 0, o resultado é 1.</li><li>Abra a distribuição binomial. Explore p = 0,5, p = 0,2 e os extremos 0 e 1.</li></ol><details><summary>Notas para o professor</summary><p>C(n,k) conta as escolhas das posições dos k fatores b. A soma da linha é 2ⁿ, pois basta substituir a = b = 1. A distribuição tem média np e variância np(1 − p).</p></details><button id="print">Imprimir roteiro</button>`;
}
function drawBinomial() {
  const s = state.binomial,
    probs = binomial(s.n, s.p);
  $("#bin-title").textContent =
    s.tab === "pascal"
      ? "Triângulo de Pascal · linha " + s.n
      : "Distribuição binomial";
  if (s.tab === "pascal") {
    $("#bin-stage").innerHTML =
      `<div class="pascal" role="img" aria-label="Triângulo de Pascal, linha ${s.n}: ${Array.from({ length: s.n + 1 }, (_, k) => choose(s.n, k)).join(", ")}">${Array.from({ length: 11 }, (_, n) => `<div class="pascal-row ${n === s.n ? "current" : ""}"><span class="small" style="width:29px;padding-top:6px">${n}</span>${Array.from({ length: n + 1 }, (_, k) => `<span class="pascal-cell" title="C(${n},${k}) = ${choose(n, k)}">${choose(n, k)}</span>`).join("")}</div>`).join("")}</div>`;
  } else {
    let max = Math.max(...probs),
      step = 650 / (s.n + 1);
    $("#bin-stage").innerHTML =
      `<svg viewBox="0 0 800 400" role="img" aria-label="Probabilidades para cada quantidade de sucessos"><path d="M65 330H745" stroke="#8b9b87"/>${probs
        .map((p, k) => {
          let x = 75 + (k + 0.5) * step,
            w = Math.min(step * 0.65, 120),
            h = (p / max) * 245;
          return `<rect x="${x - w / 2}" y="${330 - h}" width="${w}" height="${h}" rx="4" fill="${k === s.k ? "#316449" : "#b1c99c"}"/><text x="${x}" y="${320 - h}" text-anchor="middle" class="plot-value">${pct(p)}</text><text x="${x}" y="355" text-anchor="middle" class="plot-label">${k}</text>`;
        })
        .join(
          "",
        )}<text x="400" y="390" text-anchor="middle" class="plot-label">Número de sucessos (k)</text></svg>`;
  }
  const sup = (n) => (n === 1 ? "" : `<sup>${n}</sup>`),
    terms = Array.from({ length: s.n + 1 }, (_, k) => {
      let c = choose(s.n, k),
        term = (s.n - k ? "a" + sup(s.n - k) : "") + (k ? "b" + sup(k) : "");
      return (c === 1 && term ? "" : c) + term;
    });
  $("#expansion").innerHTML = `(a + b)<sup>${s.n}</sup> = ${terms.join(" + ")}`;
  $("#bin-metrics").innerHTML =
    metric(`Combinações C(${s.n},${s.k})`, choose(s.n, s.k)) +
    metric(`P(X = ${s.k})`, pct(probs[s.k])) +
    metric(
      "Média · variância",
      `${fmt(s.n * s.p)} · ${fmt(s.n * s.p * (1 - s.p))}`,
      "np · np(1 − p)",
    );
}
function showDialog(html) {
  $("#dialog-content").innerHTML = html;
  $("#dialog").showModal();
}
function guide() {
  showDialog(
    `<div class="eyebrow">PARA QUEM ENSINA</div><h2>Uma boa pergunta abre<br>muitas descobertas.</h2><p>Use os laboratórios como um espaço de investigação: a turma formula hipóteses, testa ideias e constrói explicações.</p>${[
      [
        "01",
        "Antes de mover, pergunte.",
        "Convide os alunos a prever o resultado. Registre hipóteses no quadro, sem corrigi-las de imediato.",
      ],
      [
        "02",
        "Mude uma coisa de cada vez.",
        "Altere um parâmetro, compare o que mudou e peça que os grupos encontrem um padrão.",
      ],
      [
        "03",
        "Peça uma explicação.",
        "Conecte a visualização, os números e a expressão matemática. Teste também casos extremos.",
      ],
    ]
      .map(
        ([n, t, p]) =>
          `<div class="guide-step"><b>${n}</b><div><strong>${t}</strong><p>${p}</p></div></div>`,
      )
      .join(
        "",
      )}<p><strong>Na sala:</strong> use “Apresentar” para ampliar a bancada, “Roteiro de aula” para orientar a investigação e “Compartilhar” para abrir a mesma configuração em outro dispositivo. Os dados ficam nesta aba; baixar ou compartilhar é uma ação sua.</p><p><strong>Acessibilidade:</strong> controles por teclado, tabelas alternativas aos gráficos e modo de impressão. Use as setas do teclado no sólido para girar.</p>`,
  );
}
function share() {
  const payload =
    current === "geometria"
      ? state.geometry
      : current === "funcoes"
        ? state.functions
        : current === "estatistica"
          ? state.stats
          : {
              prob: { ...state.prob, counts: undefined, history: undefined },
              conditional: state.conditional,
              binomial: state.binomial,
            };
  const url = new URL(location.href);
  url.hash = current + "?s=" + encodeURIComponent(JSON.stringify(payload));
  navigator.clipboard
    ?.writeText(url.href)
    .then(() => toast("Link copiado com a configuração atual."))
    .catch(() => shareFallback(url.href));
  if (!navigator.clipboard) shareFallback(url.href);
}
function shareFallback(url) {
  showDialog(
    `<h2>Compartilhar exploração</h2><p>Copie o link abaixo. Ele abre os mesmos parâmetros; lançamentos simulados começam do zero.</p><label class="field"><span>Link da atividade</span><textarea readonly>${esc(url)}</textarea></label>`,
  );
}
function restore() {
  let raw = location.hash.slice(1),
    [route, query] = raw.split("?");
  current = topics.some((t) => t[0] === route) ? route : "inicio";
  if (!query) return;
  try {
    let data = JSON.parse(new URLSearchParams(query).get("s"));
    if (!data || typeof data !== "object") return;
    const apply = (dest, src) => {
      if (!src || typeof src !== "object") return;
      for (const k of Object.keys(dest)) {
        if (["counts", "history"].includes(k)) continue;
        if (
          typeof dest[k] === "number" &&
          typeof src[k] === "number" &&
          Number.isFinite(src[k])
        )
          dest[k] = src[k];
        if (typeof dest[k] === "boolean" && typeof src[k] === "boolean")
          dest[k] = src[k];
        if (
          typeof dest[k] === "string" &&
          typeof src[k] === "string" &&
          src[k].length < 12000
        )
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
    toast("Não foi possível restaurar a configuração do link.");
  }
  sanitize();
}
function sanitize() {
  const clamp = (o, k, min, max, integer = false) => {
      o[k] = Math.max(min, Math.min(max, o[k]));
      if (integer) o[k] = Math.round(o[k]);
    },
    option = (o, k, list) => {
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
  ["a", "b", "c", "d"].forEach((k) =>
    clamp(state.conditional, k, 0, 1000, true),
  );
  let b = state.binomial;
  clamp(b, "n", 0, 10, true);
  clamp(b, "k", 0, b.n, true);
  clamp(b, "p", 0, 1);
  option(b, "tab", ["pascal", "distribution"]);
}
function refreshBranding() {
  const brand = $(".brand");
  brand.setAttribute("aria-label", "Explore a Matemática, início");
  brand.lastElementChild.innerHTML = "explore a<br><strong>matemática</strong>";
  $(".header nav").innerHTML =
    '<a href="#inicio">Início</a><a href="#funcoes">Funções</a><a href="#geometria">Geometria</a><a href="#estatistica">Estatística</a><a href="#probabilidade">Probabilidade</a>';
  $(".footer-brand").innerHTML = "explore a matemática <span>✳</span>";
}
function render() {
  refreshBranding();
  cleanupLab();
  cleanupLab = () => {};
  document.querySelectorAll(".header nav a").forEach((a) => {
    let active = a.hash === "#" + current;
    a.classList.toggle("active", active);
    active
      ? a.setAttribute("aria-current", "page")
      : a.removeAttribute("aria-current");
  });
  document.title =
    (topics.find((t) => t[0] === current)?.[1] ||
      "Experimente, observe, explique") + " · Explore a Matemática";
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
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      $("#dialog").close();
  }
});
$("#about").onclick = () =>
  showDialog(
    `<p>Laboratórios para apoiar professores do Ensino Fundamental e Médio em aulas investigativas. As representações são modelos didáticos; combine a exploração digital com argumentos, registros e materiais concretos.</p><p>Sem cadastro, anúncios ou coleta de dados. As fontes são hospedadas junto com o site, sem requisições a serviços de terceiros. Os experimentos e os cálculos acontecem no navegador.</p>`,
  );
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("presenting")) {
    document.body.classList.remove("presenting");
    if ($("#present")) $("#present").textContent = "⛶ Apresentar";
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
