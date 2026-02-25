/**
 * familyPdfGenerator.ts
 * Gerador de PDF para os módulos da Family Legal Engine.
 * Padrão: jsPDF + jspdf-autotable, seguindo convenções do projeto.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Paleta (Rosto: tons de Rosa/Vinho) ───────────────────────────────────────
const COLOR_HEADER: [number, number, number] = [136, 19, 55];   // Rose-900
const COLOR_SUBHEAD: [number, number, number] = [190, 18, 60];   // Rose-700
const COLOR_ACCENT: [number, number, number] = [244, 63, 94];   // Rose-500
const COLOR_LIGHT: [number, number, number] = [255, 241, 242];  // Rose-50
const COLOR_GRAY: [number, number, number] = [100, 116, 139];  // Slate-500
const COLOR_DARK: [number, number, number] = [15, 23, 42];     // Slate-900

type Doc = jsPDF & { lastAutoTable: { finalY: number } };

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (v: number, d = 1) =>
    (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';

const today = () => new Date().toLocaleDateString('pt-BR');

function getY(doc: Doc, extra = 0): number {
    return (doc.lastAutoTable?.finalY ?? 0) + extra;
}

function newPageIfNeeded(doc: Doc, y: number, needed = 40): number {
    if (y + needed > doc.internal.pageSize.height - 20) {
        doc.addPage();
        return 20;
    }
    return y;
}

/** Cabeçalho padrão: faixa colorida + título + subtítulo */
function drawHeader(doc: Doc, titulo: string, subtitulo: string): number {
    const W = doc.internal.pageSize.width;
    doc.setFillColor(...COLOR_HEADER);
    doc.rect(0, 0, W, 38, 'F');

    // Faixa decorativa rose-500
    doc.setFillColor(...COLOR_ACCENT);
    doc.rect(0, 34, W, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitulo, 14, 26);

    doc.setFontSize(8);
    doc.text(`Emitido em: ${today()}`, doc.internal.pageSize.width - 14, 26, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    return 50;
}

/** Seção H2 */
function drawSection(doc: Doc, label: string, y: number): number {
    y = newPageIfNeeded(doc, y, 20);
    doc.setFillColor(...COLOR_LIGHT);
    doc.setDrawColor(...COLOR_ACCENT);
    doc.rect(14, y - 5, doc.internal.pageSize.width - 28, 10, 'FD');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_HEADER);
    doc.text(label.toUpperCase(), 18, y + 1);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    return y + 12;
}

/** Linha de dado key: value com sublinha */
function drawKV(doc: Doc, label: string, value: string, x: number, y: number, W = 88): number {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_GRAY);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_DARK);
    doc.text(value, x, y + 6);
    doc.setDrawColor(220, 220, 220);
    doc.line(x, y + 7, x + W - 4, y + 7);
    return y + 16;
}

/** Rodapé em todas as páginas */
function drawFooters(doc: Doc) {
    const count = doc.getNumberOfPages();
    const W = doc.internal.pageSize.width;
    const H = doc.internal.pageSize.height;
    for (let i = 1; i <= count; i++) {
        doc.setPage(i);
        doc.setFillColor(...COLOR_HEADER);
        doc.rect(0, H - 14, W, 14, 'F');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(`Family Legal Engine — Documento gerado automaticamente. Não substitui orientação jurídica individual.`, 14, H - 6);
        doc.text(`Página ${i}/${count}`, W - 14, H - 6, { align: 'right' });
    }
}

/** Tabela de Memória de Cálculo */
function drawMemoria(doc: Doc, items: string[], y: number): number {
    y = newPageIfNeeded(doc, y, 30);
    autoTable(doc as any, {
        startY: y,
        head: [['Memória de Cálculo Auditável']],
        body: items.map(m => [m]),
        theme: 'striped',
        headStyles: { fillColor: COLOR_SUBHEAD, fontSize: 8, fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: 'normal' } },
    });
    return getY(doc as Doc, 10);
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. PENSÃO BASE
// ══════════════════════════════════════════════════════════════════════════════
export function gerarPDFPensaoBase(resultado: any): void {
    const doc = new jsPDF() as Doc;
    const p = resultado.pensao;
    let y = drawHeader(doc,
        'Cálculo de Pensão Alimentícia',
        'Código Civil Brasileiro — Arts. 1.694–1.710 | CF/88, Art. 227'
    );

    // ── Resumo executivo ──────────────────────────────────────────────────────
    y = drawSection(doc, '1. Resumo Executivo', y);

    // Card destaque
    doc.setFillColor(254, 226, 226); // rose-100
    doc.setDrawColor(...COLOR_ACCENT);
    doc.roundedRect(14, y, 182, 28, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_HEADER);
    doc.text('VALOR MENSAL CALCULADO', 20, y + 9);
    doc.setFontSize(22);
    doc.text(fmtBRL(p.valorMensalCalculado), 20, y + 21);
    doc.setFontSize(10);
    doc.text(`por filho: ${fmtBRL(p.valorPorFilho)}`, 130, y + 21);
    doc.setTextColor(0, 0, 0);
    y += 34;

    // Grid de métricas
    const metrics = [
        ['Renda Total Líquida', fmtBRL(p.rendaTotalLiquida)],
        ['Base de Cálculo Utilizada', fmtBRL(p.rendaBaseCalculo)],
        ['Comprometimento da Renda', p.comprometimentoRenda],
        ['Impacto Anual', fmtBRL(p.impactoAnual)],
        ['Pensão sobre 13º Salário', fmtBRL(p.pensaoSobre13)],
        ['Pensão sobre Férias + 1/3', fmtBRL(p.pensaoSobreFerias)],
        ['Impacto até 18 anos (estimado)', fmtBRL(p.impactoAte18Anos)],
    ];

    const half = Math.ceil(metrics.length / 2);
    for (let i = 0; i < half; i++) {
        const left = metrics[i];
        const right = metrics[i + half];
        drawKV(doc, left[0], left[1], 14, y);
        if (right) drawKV(doc, right[0], right[1], 110, y);
        y += 16;
    }

    // ── Cenários comparativos ─────────────────────────────────────────────────
    y = newPageIfNeeded(doc, y + 4, 60);
    y = drawSection(doc, '2. Cenários Comparativos', y);

    autoTable(doc as any, {
        startY: y,
        head: [['Cenário', 'Valor Mensal', 'Valor Anual (12×)', 'Total até 18 anos', 'Comprometimento']],
        body: p.cenarios.map((c: any) => [
            c.label,
            fmtBRL(c.valorMensal),
            fmtBRL(c.valorAnual),
            fmtBRL(c.valorAte18Anos),
            c.comprometimentoRenda,
        ]),
        theme: 'grid',
        headStyles: { fillColor: COLOR_HEADER, fontSize: 8 },
        styles: { fontSize: 8.5, cellPadding: 3 },
        didParseCell(data: any) {
            if (data.row.index === p.cenarios.findIndex(
                (c: any) => Math.abs(c.valorMensal - p.valorMensalCalculado) < 1
            )) {
                data.cell.styles.fillColor = [255, 241, 242];
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });
    y = getY(doc as Doc, 10);

    // ── Fundamentos jurídicos ─────────────────────────────────────────────────
    y = newPageIfNeeded(doc, y + 4, 50);
    y = drawSection(doc, '3. Base Legal Aplicada', y);
    const fundamentos = [
        'Art. 1.694 CC — Parentes, cônjuges ou companheiros podem pedir uns aos outros alimentos.',
        'Art. 1.695 CC — O binômio necessidade × possibilidade é o critério-mestre da fixação.',
        'Art. 1.699 CC — Se situação financeira do alimentante se modificar, pode pleitear revisão.',
        'Súm. 622 STJ — A fixação de alimentos entre ex-cônjuges deve observar o padrão de vida.',
        'CF/88, Art. 227 — Dever da família, sociedade e Estado em garantir alimentos às crianças.',
    ];
    fundamentos.forEach(f => {
        y = newPageIfNeeded(doc, y, 12);
        doc.setFontSize(8.5);
        doc.setTextColor(...COLOR_DARK);
        const lines = doc.splitTextToSize(`• ${f}`, 180);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 3;
    });

    // ── Memória ───────────────────────────────────────────────────────────────
    y = newPageIfNeeded(doc, y + 4, 30);
    drawMemoria(doc, p.memoriaCalculo, y);

    drawFooters(doc);
    doc.save(`Pensao_Base_${today().replace(/\//g, '-')}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. ALIMENTOS GRAVÍDICOS
// ══════════════════════════════════════════════════════════════════════════════
export function gerarPDFGravidicos(resultado: any): void {
    const doc = new jsPDF() as Doc;
    const g = resultado.gravidico;
    let y = drawHeader(doc,
        'Alimentos Gravídicos',
        'Lei 11.804/2008 — desde a concepção até o nascimento'
    );

    y = drawSection(doc, '1. Resumo', y);

    // Card destaque
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(...COLOR_ACCENT);
    doc.roundedRect(14, y, 182, 28, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_HEADER);
    doc.text('VALOR MENSAL SUGERIDO (GRAVÍDICOS)', 20, y + 9);
    doc.setFontSize(18);
    doc.text(fmtBRL(g.valorMensalSugerido), 20, y + 21);
    doc.setFontSize(10);
    doc.text(`Total gestação: ${fmtBRL(g.valorTotalGestacao)}`, 120, y + 21);
    doc.setTextColor(0, 0, 0);
    y += 34;

    // Grid de métricas
    [
        ['Total de Despesas Mensais', fmtBRL(g.totalDespesasMensais)],
        ['Quota do Suposto Pai (50%)', fmtBRL(g.quotaSupostoPai)],
        ['Valor por Percentual Aplicado', fmtBRL(g.valorBasePercentual)],
        ['Valor Total da Gestação', fmtBRL(g.valorTotalGestacao)],
    ].forEach(([l, v], i) => {
        drawKV(doc, l, v, i % 2 === 0 ? 14 : 110, y);
        if (i % 2 === 1) y += 16;
    });
    y += 16;

    // Conversão automática
    if (g.conversaoPensao) {
        y = newPageIfNeeded(doc, y + 4, 20);
        doc.setFillColor(220, 252, 231);
        doc.setDrawColor(34, 197, 94);
        doc.roundedRect(14, y, 182, 16, 2, 2, 'FD');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(21, 128, 61);
        doc.text(`✔  CONVERSÃO AUTOMÁTICA: ${g.conversaoPensao.status}`, 20, y + 9);
        doc.setTextColor(0, 0, 0);
        y += 22;
    }

    // Tabela de despesas
    y = newPageIfNeeded(doc, y + 4, 60);
    y = drawSection(doc, '2. Composição das Despesas', y);

    const despesas = resultado.gravidico.memoriaCalculo.filter((m: string) => m.includes('R$') || m.includes('estimado'));

    autoTable(doc as any, {
        startY: y,
        head: [['Descrição', 'Valor']],
        body: despesas.map((d: string) => {
            const parts = d.split(':');
            return [parts[0].trim(), parts[1]?.trim() ?? ''];
        }),
        theme: 'striped',
        headStyles: { fillColor: COLOR_HEADER, fontSize: 8 },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });
    y = getY(doc as Doc, 10);

    // Base legal
    y = newPageIfNeeded(doc, y + 4, 40);
    y = drawSection(doc, '3. Base Legal', y);
    [
        'Art. 2º, Lei 11.804/2008 — Os alimentos gravídicos compreendem todos os encargos da gestação.',
        'Art. 6º, Lei 11.804/2008 — Nascida com vida, os gravídicos convertem-se em alimentos.',
        'Paternidade — Basta indício da paternidade para a fixação (fumus boni iuris).',
    ].forEach(f => {
        y = newPageIfNeeded(doc, y, 12);
        const lines = doc.splitTextToSize(`• ${f}`, 180);
        doc.setFontSize(8.5);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 3;
    });

    drawMemoria(doc, g.memoriaCalculo, y + 4);
    drawFooters(doc);
    doc.save(`Gravidicos_${today().replace(/\//g, '-')}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. EXECUÇÃO DE ALIMENTOS
// ══════════════════════════════════════════════════════════════════════════════
export function gerarPDFExecucao(resultado: any): void {
    const doc = new jsPDF() as Doc;
    const e = resultado.execucao;
    let y = drawHeader(doc,
        'Execução de Alimentos',
        'CPC/2015, Art. 528 — Rito Prisão (3 últ. parcelas) e Rito Penhora'
    );

    y = drawSection(doc, '1. Resumo Executivo', y);

    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(...COLOR_ACCENT);
    doc.roundedRect(14, y, 182, 28, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_HEADER);
    doc.text('TOTAL EXECUTÁVEL', 20, y + 9);
    doc.setFontSize(20);
    doc.text(fmtBRL(e.totalExecutavel), 20, y + 21);
    doc.setFontSize(9);
    doc.text(`${e.numeroParcelas} parcela(s) em atraso`, 130, y + 21);
    doc.setTextColor(0, 0, 0);
    y += 34;

    [
        ['Rito Prisão (CPC 528)', fmtBRL(e.valorRitoPrisao)],
        ['Rito Penhora', fmtBRL(e.valorRitoPenhora)],
        ['Acordo à Vista (30% deságio)', fmtBRL(e.simulacaoAcordoVista)],
        ['Parcelamento 3× (estimado)', fmtBRL(e.simulacaoParcelamento3x) + '/mês'],
    ].forEach(([l, v], i) => {
        drawKV(doc, l, v, i % 2 === 0 ? 14 : 110, y);
        if (i % 2 === 1) y += 16;
    });
    y += 16;

    // ── Tabela de parcelas ────────────────────────────────────────────────────
    y = newPageIfNeeded(doc, y + 4, 60);
    y = drawSection(doc, '2. Parcelas Atualizadas', y);

    autoTable(doc as any, {
        startY: y,
        head: [['Competência', 'Valor Original', 'Juros', 'Multa', 'Correção', 'Total Atualizado', 'Rito']],
        body: e.parcelas.map((p: any) => [
            p.competencia,
            fmtBRL(p.valorOriginal),
            fmtBRL(p.juros),
            fmtBRL(p.multa),
            fmtBRL(p.correcaoMonetaria),
            fmtBRL(p.totalAtualizado),
            p.rito,
        ]),
        theme: 'grid',
        headStyles: { fillColor: COLOR_HEADER, fontSize: 7.5, halign: 'center' },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 24 },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' },
            6: { halign: 'center', cellWidth: 18 },
        },
        didParseCell(data: any) {
            if (data.section === 'body') {
                const rito = e.parcelas[data.row.index]?.rito;
                if (rito === 'PRISAO') data.cell.styles.textColor = [190, 18, 60];
            }
        },
    });
    y = getY(doc as Doc, 10);

    // ── Comparativo de índices ────────────────────────────────────────────────
    if (resultado.comparativoIndices) {
        y = newPageIfNeeded(doc, y + 4, 50);
        y = drawSection(doc, '3. Comparativo de Índices (soma total corrigida)', y);

        const entries = Object.entries(resultado.comparativoIndices) as [string, number][];
        autoTable(doc as any, {
            startY: y,
            head: [['Índice', 'Valor Total Corrigido']],
            body: entries.map(([k, v]) => [k, fmtBRL(v)]),
            theme: 'striped',
            headStyles: { fillColor: COLOR_SUBHEAD, fontSize: 8.5 },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        });
        y = getY(doc as Doc, 10);
    }

    // ── Base legal ────────────────────────────────────────────────────────────
    y = newPageIfNeeded(doc, y + 4, 50);
    y = drawSection(doc, '4. Base Legal', y);
    [
        'Art. 528 CPC — Descumprimento de alimentos: decretação de prisão civil (rito prisão) ou penhora (rito execução).',
        'Art. 529 CPC — Desconto em folha para pagamento de alimentos.',
        'Súm. 309 STJ — O débito de alimentos está sujeito à prisão civil nos três últimos meses anteriores ao ajuizamento.',
        'Lei 13.058/2014 — Igualdade na guarda e responsabilidade dos pais.',
    ].forEach(f => {
        y = newPageIfNeeded(doc, y, 12);
        const lines = doc.splitTextToSize(`• ${f}`, 180);
        doc.setFontSize(8.5);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 3;
    });

    drawMemoria(doc, e.memoriaCalculo, y + 4);
    drawFooters(doc);
    doc.save(`Execucao_Alimentos_${today().replace(/\//g, '-')}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. REVISIONAL
// ══════════════════════════════════════════════════════════════════════════════
export function gerarPDFRevisional(resultado: any): void {
    const doc = new jsPDF() as Doc;
    const r = resultado.revisional;
    let y = drawHeader(doc,
        'Simulador Revisional de Alimentos',
        'CC, Art. 1.699 — mudança da fortuna de quem presta ou recebe alimentos'
    );

    y = drawSection(doc, '1. Diagnóstico e Score', y);

    // Score card
    const scoreColor: [number, number, number] =
        r.classificacao === 'ALTA' ? [22, 163, 74] :
            r.classificacao === 'MEDIA' ? [217, 119, 6] : [220, 38, 38];

    doc.setFillColor(...scoreColor);
    doc.roundedRect(14, y, 55, 28, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SCORE', 41.5, y + 8, { align: 'center' });
    doc.setFontSize(22);
    doc.text(`${r.scoreProbabilidade}`, 41.5, y + 20, { align: 'center' });

    doc.setTextColor(...COLOR_DARK);
    doc.setFontSize(10);
    doc.text(`Probabilidade: ${r.classificacao}`, 80, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const probLines = doc.splitTextToSize(r.probabilidadeTexto ?? '', 100);
    doc.text(probLines, 80, y + 18);
    y += 34;

    // Grades
    const kvs = [
        ['Renda Anterior', fmtBRL(r.valorAtualPayloadRenda ?? 0)],
        ['Renda Atual', fmtBRL(r.rendaAtualInput ?? 0)],
        ['Variação de Renda', fmtPct(r.variacaoRenda)],
        ['Índice de Necessidade', fmtPct(r.indiceNecessidade ?? r.indiceNecessidadeAlimentando ?? 0)],
        ['Valor Mensal Atual', fmtBRL(r.valorMensalAtual)],
        ['Valor Mensal Sugerido', fmtBRL(r.valorMensalSugerido)],
        ['Diferença Mensal', fmtBRL(r.diferenca ?? (r.valorMensalSugerido - r.valorMensalAtual))],
        ['Impacto Anual da Diferença', fmtBRL(r.impactoAnualDiferenca)],
    ];
    for (let i = 0; i < kvs.length; i += 2) {
        drawKV(doc, kvs[i][0], kvs[i][1], 14, y);
        if (kvs[i + 1]) drawKV(doc, kvs[i + 1][0], kvs[i + 1][1], 110, y);
        y += 16;
    }

    // Fatores
    y = newPageIfNeeded(doc, y + 4, 50);
    y = drawSection(doc, '2. Fatores Analisados', y);

    const todasFatores = [
        ...(r.fatoresPositivos ?? []).map((f: string) => ['+ Favorável', f]),
        ...(r.fatoresNegativos ?? []).map((f: string) => ['- Desfavorável', f]),
    ];
    autoTable(doc as any, {
        startY: y,
        head: [['Sentido', 'Fator']],
        body: todasFatores,
        theme: 'striped',
        headStyles: { fillColor: COLOR_HEADER, fontSize: 8 },
        styles: { fontSize: 8.5, cellPadding: 3 },
        didParseCell(data: any) {
            if (data.section === 'body') {
                data.cell.styles.textColor = data.cell.raw?.startsWith('+')
                    ? [22, 163, 74] : [190, 18, 60];
            }
        },
        columnStyles: { 0: { cellWidth: 30 } },
    });
    y = getY(doc as Doc, 10);

    // Base legal
    y = newPageIfNeeded(doc, y + 4, 50);
    y = drawSection(doc, '3. Base Legal', y);
    [
        'Art. 1.699 CC — Se as possibilidades de quem presta ou as necessidades de quem recebe mudarem, pode o credor ou o devedor pedir exoneração, redução ou majoração do encargo.',
        'Súm. 309 STJ — O débito alimentar que autoriza prisão é o que compreende as 3 prestações anteriores ao ajuizamento.',
        'OBS: O score probabilístico é estimativa técnica. Decisão judicial pode variar conforme prova produzida.',
    ].forEach(f => {
        y = newPageIfNeeded(doc, y, 12);
        const lines = doc.splitTextToSize(`• ${f}`, 180);
        doc.setFontSize(8.5);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 3;
    });

    drawMemoria(doc, r.memoriaCalculo, y + 4);
    drawFooters(doc);
    doc.save(`Revisional_Alimentos_${today().replace(/\//g, '-')}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. SCORE JURÍDICO
// ══════════════════════════════════════════════════════════════════════════════
export function gerarPDFScoreJuridico(resultado: any): void {
    const doc = new jsPDF() as Doc;
    const s = resultado.score;
    let y = drawHeader(doc,
        'Score Jurídico de Pretensão Alimentar',
        'Índice de solidez da pretensão — instrumento estratégico de análise preventiva'
    );

    y = drawSection(doc, '1. Score Global', y);

    // Gauge visual
    const scoreColor: [number, number, number] =
        s.nivel === 'ALTO' ? [22, 163, 74] :
            s.nivel === 'MEDIO' ? [217, 119, 6] : [220, 38, 38];

    const W = doc.internal.pageSize.width;
    doc.setFillColor(...scoreColor);
    doc.roundedRect(14, y, W - 28, 32, 4, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(`${s.score}/100`, W / 2, y + 14, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`${s.nivel} — ${s.descricao}`, W / 2, y + 24, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 38;

    // Barra de progresso
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(14, y, W - 28, 6, 2, 2, 'F');
    doc.setFillColor(...scoreColor);
    doc.roundedRect(14, y, (W - 28) * (s.score / 100), 6, 2, 2, 'F');
    y += 12;

    // Métricas
    [
        ['Capacidade Contributiva', fmtPct(s.indiceCapacidadeContributiva)],
        ['Necessidade do Alimentando', fmtPct(s.indiceNecessidadeAlimentando)],
        ['Percentual Recomendado', s.percentualRecomendado],
        ['Nível de Risco', s.nivel],
    ].forEach(([l, v], i) => {
        drawKV(doc, l, v, i % 2 === 0 ? 14 : 110, y);
        if (i % 2 === 1) y += 16;
    });
    y += 4;

    // Recomendação
    y = newPageIfNeeded(doc, y + 4, 22);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.roundedRect(14, y, W - 28, 18, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_HEADER);
    doc.text('RECOMENDAÇÃO ESTRATÉGICA:', 20, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_DARK);
    const recLines = doc.splitTextToSize(s.recomendacao ?? '', W - 46);
    doc.text(recLines, 20, y + 13);
    y += Math.max(18, recLines.length * 5 + 10) + 4;

    // ── Tabela de fatores ─────────────────────────────────────────────────────
    y = newPageIfNeeded(doc, y + 4, 60);
    y = drawSection(doc, '2. Detalhamento dos Fatores', y);

    autoTable(doc as any, {
        startY: y,
        head: [['Fator Avaliado', 'Impacto', 'Pontos']],
        body: (s.detalhes ?? []).map((d: any) => [
            d.fator,
            d.positivo ? 'Favorável ↑' : 'Desfavorável ↓',
            (d.impacto > 0 ? '+' : '') + d.impacto + ' pts',
        ]),
        theme: 'grid',
        headStyles: { fillColor: COLOR_HEADER, fontSize: 8 },
        styles: { fontSize: 8.5, cellPadding: 3 },
        didParseCell(data: any) {
            if (data.section === 'body' && data.column.index === 2) {
                const pts = Number((data.cell.raw as string).replace(' pts', ''));
                data.cell.styles.textColor = pts >= 0 ? [22, 163, 74] : [190, 18, 60];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.halign = 'center';
            }
        },
        columnStyles: {
            0: { cellWidth: 110 },
            1: { cellWidth: 36 },
            2: { cellWidth: 30 },
        },
    });
    y = getY(doc as Doc, 10);

    // Observações metodológicas
    y = newPageIfNeeded(doc, y + 4, 50);
    y = drawSection(doc, '3. Metodologia e Limitações', y);
    [
        'O score é um índice técnico probabilístico, não uma decisão judicial.',
        'Fatores como provas em juízo, testemunhos e condições socioeconômicas locais podem alterar o resultado.',
        'Percentual recomendado baseia-se no binômio necessidade × possibilidade (Art. 1.695 CC).',
        'Renda formal comprovada é o principal fator positivo; renda informal dificulta a fixação.',
        'A assistência de advogado especializado eleva significativamente as chances de êxito.',
    ].forEach(f => {
        y = newPageIfNeeded(doc, y, 12);
        const lines = doc.splitTextToSize(`• ${f}`, 180);
        doc.setFontSize(8.5);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 3;
    });

    drawFooters(doc);
    doc.save(`Score_Juridico_${today().replace(/\//g, '-')}.pdf`);
}
