# Explore a Matemática

Versão publicada no GitHub Pages, com geometria espacial e funções revisadas. A migração para o Netlify fica para depois da revisão de estatística e probabilidade.

## Abrir para revisar

Descompacte o ZIP e abra **index.html** no navegador. Mantenha a pasta `assets` junto desse arquivo. A cópia inclui o JavaScript reunido em `assets/app.bundle.js` e as fontes locais; não exige instalação nem conexão para explorar.

Para desenvolver com recarregamento manual, usando Node.js 20 ou superior:

```sh
npm start
```

Abra `http://127.0.0.1:4173`. Para outra porta: `PORT=4175 npm start`.

## O que mudou nesta rodada

### Geometria espacial

- Área em **u.a.** e volume em **u.v.** em todas as visualizações.
- Cubo, prisma e pirâmide com faces articuladas, de 0% a 100% de abertura.
- Cilindro e cone com desenrolamento contínuo da superfície lateral e abertura das bases.
- A largura b aparece como medida no prisma retangular.
- Pirâmide: diagonal da base, triângulo do apótema lateral e triângulo da aresta lateral, com ângulo reto e cálculo pelo teorema de Pitágoras.
- Cilindro, cone e esfera gerados por rotação de uma figura plana, entre 0° e 360°, em torno do eixo x ou y.
- Esfera: calota/segmento esférico e cunha, com raio, altura ou ângulo ajustáveis.
- Vistas frontal, traseira, laterais direita/esquerda, superior, inferior e perspectiva 3D. A escolha funciona também na planificação e na revolução; arrastar ou usar as setas ativa a rotação livre.
- Rotação por arraste ou setas, zoom pelo scroll do mouse ou botões, faces, arestas, vértices, medidas, geratriz e exportação SVG.

### Funções

- Ordem: afim, quadrática, exponencial, logística, logarítmica, trigonométrica e modular.
- Família como primeira escolha, função principal com coeficientes e até cinco campos de comparação. Expressões podem usar a, b, c e d para acompanhar os controles. Cores junto ao gráfico e visibilidade individual.
- Botão de reprodução/pausa em cada coeficiente. A animação para ao trocar de exploração ou ocultar a aba.
- Coordenadas ao passar o ponteiro, zoom pelo scroll ou botões e janela manual dos eixos x/y. Interface compacta para projeção a 100%; controles laterais com rolagem própria.
- Domínio natural por padrão. A restrição opcional do domínio é diferente da janela visível do gráfico.
- Seno, cosseno e tangente na forma **a + b · trig(cx + d)**. Eixo x em radianos; máximos/mínimos e assíntotas tracejados; fórmula e cálculo do período.
- A função logística também está acessível por um atalho na função exponencial.
- Informações algébricas e tabela de valores da equação selecionada.

### Gráfico para avaliações

- Até cinco expressões, oito cores, pontos com rótulos e projeções nos eixos.
- Eixo x numérico ou em radianos; nomes dos eixos sem itálico, com negrito opcional; janela e dimensões em centímetros.
- Domínio e opção de mostrar equação junto de cada expressão. Malha opcional; traços finos e fonte Calibri quando instalada (Arial/sans-serif como alternativa). A Calibri não é redistribuída no projeto.
- Exportação **SVG vetorial em centímetros e PNG a 300 dpi com fundo transparente**, sem marca d’água. O PNG inclui metadados de resolução física.
- Use `x^2`, `2x`, `sen(x)`, `cos(x)`, `tan(x)`, `sqrt(x)`, `ln(x)`, `log(x)`, `exp(x)`, `abs(x)` ou `|x|`. `log` usa base 10; `ln`, base e. Aceita pi e vírgula decimal. Por exemplo: `2sen(x) + 1`.
- Expressões aritméticas passam por um analisador próprio, sem executar JavaScript. Limite de 240 caracteres por expressão e 12 pontos destacados.

O diálogo **Sobre o projeto** contém somente os dois parágrafos solicitados, sem links externos.

Estatística e probabilidade permanecem disponíveis com suas funções anteriores, aguardando a próxima rodada de alterações.

## Editar e verificar

Os módulos legíveis ficam em `assets/`. Depois de editar JavaScript, gere novamente o arquivo usado pelo navegador:

```sh
npm run build
npm test
```

A geração usa esbuild 0.28.2 pelo npm e pode precisar de internet na primeira execução. O site pronto não depende de serviços externos.

Os 26 grupos de testes verificam cálculos, distribuições, planificações, conservação de áreas, calota e cunha, sólidos de revolução, domínios, períodos, expressões livres e SVG. Os fluxos principais também foram conferidos no navegador, incluindo comparações digitadas, cinco campos, cores, zoom por scroll, coordenadas, tipografia e exportação PNG.

## Estrutura

- `index.html`: página de entrada, funciona também por abertura local.
- `assets/app.js`: navegação e laboratórios de estatística/probabilidade.
- `assets/geometry-model.js`: geometrias e cálculos de partes da esfera.
- `assets/geometry-lab.js`: controles e renderização dos sólidos.
- `assets/function-math.js`: famílias e analisador de expressões.
- `assets/functions-lab.js`: interface de funções e editor livre.
- `assets/plot.js`: traçado, coordenadas e exportação.
- `assets/plot-utils.js`: zoom ancorado no ponteiro, centímetros e resolução física do PNG.
- `assets/app.bundle.js`: arquivo gerado; não editar diretamente.
- `assets/style.css`, `fonts.css` e arquivos TTF: estilo e fontes locais.
- `tests/`: testes matemáticos e de exportação.
- `scripts/serve.mjs`: servidor local de desenvolvimento.

## Convenções dos modelos

- Sólidos retos; pirâmide de base quadrada com vértice sobre o centro.
- A esfera não possui planificação plana exata sem deformação. Essa opção permanece indisponível; sua construção por revolução é explorável.
- Superfícies curvas usam malhas visuais; as medidas exibidas usam fórmulas analíticas. No teste, a diferença de área das malhas desenvolvidas ficou abaixo de 0,2%.
- A calota é a superfície curva; seu volume é o volume do segmento esférico correspondente. Na cunha, a área total inclui os dois cortes semicirculares, exceto na volta completa.
- As animações de revolução exibem o volume varrido e a área do sólido completo, com rótulos distintos.
- As curvas são amostradas numericamente e refinadas perto de variações rápidas; a figura é um modelo visual, não uma demonstração. Para funções muito oscilatórias, ajuste a janela.
- O estado permanece ao navegar entre laboratórios na mesma aba. Recarregar reinicia a sessão; o botão Compartilhar inclui os parâmetros no link. Um link `file://` só é útil no mesmo computador; após a publicação, o compartilhamento usa o endereço público.
- Fontes DM Sans e Manrope locais, com licenças SIL OFL na pasta `assets`. Sem analytics, contas ou chamadas a APIs durante as explorações.
