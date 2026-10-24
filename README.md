# Exploração Matemática

Um laboratório de investigação matemática para professores e alunos, com interface em português e publicação estática no GitHub Pages.

## Laboratórios

- **Geometria espacial:** cubo, prisma retangular, pirâmide quadrangular, cilindro, cone e esfera. Rotação por arraste ou teclado; dimensões; faces, arestas e vértices de poliedros; medidas; geratriz e apótema; planificação, vista explodida e exportação em SVG. Área e volume atualizados automaticamente.
- **Funções:** afim, quadrática, exponencial e trigonométrica (seno). Parâmetros, gráfico, comparação com função-base, zoom, tabela de valores e resultados específicos de cada família.
- **Estatística:** entrada de até 500 números, média, mediana, moda, amplitude, variância populacional/amostral e desvio padrão. Gráfico de frequências, tabela e experimento com valor extremo.
- **Probabilidade:** moeda com probabilidade ajustável, dado e soma de dois dados; lotes de até 1.000 lançamentos; frequências e probabilidades teóricas.
- **Probabilidade condicional:** tabela de dupla entrada, quatro grupos configuráveis, comparação de P(A | B) e P(B | A), tratamento de condições vazias.
- **Binômio de Newton:** triângulo de Pascal, expansão de (a + b)ⁿ, combinações e distribuição binomial, com 0 ≤ n ≤ 10.

Todos os laboratórios incluem uma pergunta investigativa, roteiro de aula, impressão, modo de apresentação e compartilhamento da configuração por URL. Os lançamentos simulados são reiniciados quando se abre um link compartilhado.

## Executar localmente

Requer Node.js 20 ou superior. Não há dependências para instalar.

```sh
npm start
```

Abra `http://127.0.0.1:4173`. Para outra porta: `PORT=4175 npm start`.

Use um servidor HTTP: abrir `index.html` por `file://` pode bloquear os módulos JavaScript em alguns navegadores.

## Testar

```sh
npm test
node --check assets/app.js
```

Os testes conferem fórmulas, casos degenerados, propriedades da distribuição binomial, validação de entradas e topologia dos poliedros. A interface também foi verificada manualmente no navegador em uma janela ampla e uma janela estreita.

## Publicar em tc-brito/exploreamatematica

O fluxo `.github/workflows/pages.yml` publica automaticamente após cada envio para `main`. Ele executa os testes e envia apenas `index.html`, `.nojekyll` e `assets/`.

1. Envie estes arquivos para a branch `main` do repositório.
2. No GitHub, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Em **Actions → Publicar no GitHub Pages**, execute **Run workflow** caso a primeira execução tenha ocorrido antes da configuração de Pages.
4. Aguarde o resultado verde do deploy. O endereço esperado é `https://tc-brito.github.io/exploreamatematica/`.

O endereço só deve ser considerado publicado depois de uma implantação bem-sucedida. Os caminhos relativos e a navegação por fragmentos são compatíveis com o subdiretório do GitHub Pages.

Referência oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Estrutura

```text
index.html             Estrutura e navegação
assets/app.js          Estado, interações, laboratórios e visualizações
assets/math.js         Cálculos matemáticos puros
assets/style.css       Layout responsivo, impressão e acessibilidade
assets/fonts.css       Fontes locais
assets/*LICENSE.txt    Licenças das fontes
scripts/serve.mjs      Servidor de desenvolvimento
 tests/math.test.mjs   Testes matemáticos
.github/workflows/     Publicação contínua
```

## Decisões e limites do modelo

- Sólidos retos, com bases circulares ou retangulares; a pirâmide tem base quadrada e vértice sobre o centro da base.
- A planificação é uma representação plana em escala, alternada por um botão. Não há animação contínua de dobragem.
- A esfera não possui planificação plana exata sem deformação; por isso, essa opção fica indisponível.
- As superfícies curvas são aproximadas por uma malha visual; os cálculos usam as fórmulas exatas dos sólidos, e não a área da malha.
- Na vista explodida, as partes são afastadas para inspeção; o volume exibido continua sendo o volume do sólido original.
- O diagrama condicional é esquemático: o tamanho dos retângulos não codifica as contagens. A informação numérica e a tabela são as referências.
- Gráficos estatísticos com mais de 25 valores distintos agrupam os dados em 12 intervalos. Os cálculos e a tabela preservam todos os valores originais.
- O laboratório trigonométrico desta versão explora a família seno.
- Estado mantido durante a navegação nesta aba; recarregar reinicia a sessão, exceto quando o link contém uma configuração compartilhada. Não há contas, banco de dados ou analytics.

## Acessibilidade e privacidade

HTML semântico, foco visível, rótulos nos controles, navegação por teclado, descrição das visualizações e tabelas alternativas. O sólido pode ser girado com as setas quando está focado. Não há movimento automático. Fontes hospedadas localmente, sem coleta de dados nem chamadas a APIs externas durante as explorações. Nenhuma certificação formal de conformidade WCAG foi realizada.

## Referências de design

- Site original: https://exploreamatematica.netlify.app/
- Polypad: https://polypad.amplify.com/pt/
- GeoGebra Classic: https://www.geogebra.org/classic

Implementação independente, sem incorporar o código dessas plataformas nem pressupor afiliação. DM Sans e Manrope são distribuídas sob SIL Open Font License; os textos das licenças estão em `assets/`.
