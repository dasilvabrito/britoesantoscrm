/**
 * inventarioPdfGenerator.ts
 * Gerador de PDF para o Módulo de Inventário Jurídico.
 * Paleta: Âmbar/Dourado — remetendo a documentos cartorários.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResultadoInventario, InventarioConfig } from '@/modules/family/inventarioEngine';

interface Doc extends jsPDF { lastAutoTable: { finalY: number } }

// ── Constantes visuais ────────────────────────────────────────────────────────
type Color3 = [number, number, number];
const GOLD: Color3 = [120, 85, 15];
const GOLD_L: Color3 = [253, 243, 197];
const DARK: Color3 = [30, 27, 22];
const GRAY: Color3 = [100, 96, 88];
const GREEN: Color3 = [22, 98, 52];
const RED: Color3 = [153, 27, 27];

const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) =>
    (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITÁRIOS DE LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

function drawHeader(doc: Doc, title: string, subtitle: string): number {
    const w = doc.internal.pageSize.width;

    // Fundo header
    doc.setFillColor(...GOLD);
    doc.rect(0, 0, w, 38, 'F');

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, 14, 16);

    // Subtítulo
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(253, 230, 138);
    doc.text(subtitle, 14, 24);

    // Data de geração
    const now = new Date().toLocaleString('pt-BR');
    doc.setFontSize(7);
    doc.setTextColor(253, 230, 138);
    doc.text(`Gerado em ${now}`, w - 14, 24, { align: 'right' });

    // Linha divisória
    doc.setFillColor(...GOLD_L);
    doc.rect(0, 38, w, 2, 'F');

    return 48;
}

function drawSectionTitle(doc: Doc, text: string, y: number): number {
    const w = doc.internal.pageSize.width;
    doc.setFillColor(...GOLD_L);
    doc.roundedRect(10, y, w - 20, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GOLD);
    doc.text(text.toUpperCase(), 14, y + 5.5);
    return y + 13;
}

function drawKV(doc: Doc, label: string, value: string, y: number, accent = false): number {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accent ? GOLD[0] : DARK[0], accent ? GOLD[1] : DARK[1], accent ? GOLD[2] : DARK[2]);
    doc.text(value, 100, y);
    return y + 7;
}

function checkPageBreak(doc: Doc, y: number, needed = 30): number {
    if (y + needed > doc.internal.pageSize.height - 20) {
        doc.addPage();
        return 20;
    }
    return y;
}

function drawFooter(doc: Doc): void {
    const w = doc.internal.pageSize.width;
    const h = doc.internal.pageSize.height;
    const pages = (doc as any).getNumberOfPages?.() ?? 1;
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFillColor(...GOLD);
        doc.rect(0, h - 12, w, 12, 'F');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(
            'Instrumento de apoio técnico — não substitui assessoria jurídica   |   CC/2002 & CPC/2015',
            14, h - 4.5,
        );
        doc.text(`Pág. ${i}/${pages}`, w - 14, h - 4.5, { align: 'right' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE DE COMPLEXIDADE
// ═══════════════════════════════════════════════════════════════════════════════

function drawComplexidadeBadge(doc: Doc, score: number, classe: string, y: number): number {
    const color: Color3 = score <= 30 ? GREEN : score <= 60 ? [180, 100, 10] : score <= 90 ? [180, 40, 40] : RED;
    doc.setFillColor(...color);
    doc.roundedRect(14, y, 60, 10, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Score ${score} — ${classe}`, 44, y + 6.5, { align: 'center' });
    return y + 16;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GERADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function gerarPDFInventario(
    resultados: ResultadoInventario[],
    config: InventarioConfig,
): void {
    const doc = new jsPDF() as Doc;
    let y = drawHeader(
        doc,
        'Inventário Sucessório',
        'CC/2002 arts. 1.784–2.027 | CPC/2015 arts. 610–673 | Res. CNJ 35/2007',
    );

    // ── Para cada inventário (falecido) ───────────────────────────────────────
    for (let idx = 0; idx < resultados.length; idx++) {
        const r = resultados[idx];
        const falecido = config.falecidos.find(f => f.id === r.falecidoId);

        if (idx > 0) { doc.addPage(); y = 20; }

        // ── 1. Identificação ─────────────────────────────────────────────────
        y = drawSectionTitle(doc, `1. Identificação — ${r.falecidoNome}`, y);

        if (r.comoriencia) {
            doc.setFillColor(254, 240, 138);
            doc.roundedRect(10, y, 190, 9, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GOLD);
            doc.text('⚠  COMORIÊNCIA DETECTADA — CC art. 8º: Sem transmissão entre comorientes', 14, y + 6);
            y += 14;
        }

        if (falecido) {
            y = drawKV(doc, 'Regime de Bens', falecido.regimeBens.replace(/_/g, ' ').toUpperCase(), y);
            y = drawKV(doc, 'UF / Domicílio', `${falecido.uf} — ${falecido.ultimoDomicilio}`, y);
            y = drawKV(doc, 'Testamento', falecido.temTestamento ? 'Sim' : 'Não', y);
        }
        y = drawKV(doc, 'Modalidade', r.modalidade === 'extrajudicial' ? '✔ Extrajudicial (Cartório)' : '⚖ Judicial', y, true);

        if (r.motivoJudicial.length > 0) {
            doc.setFontSize(7.5);
            doc.setTextColor(...RED);
            doc.setFont('helvetica', 'normal');
            for (const m of r.motivoJudicial) {
                doc.text(`• ${m}`, 18, y); y += 5.5;
            }
        }
        y += 4;

        // ── 2. Monte-Mor ─────────────────────────────────────────────────────
        y = checkPageBreak(doc, y, 40);
        y = drawSectionTitle(doc, '2. Composição do Monte-Mor', y);

        const bensFalecido = config.bens.filter(b => b.pertenceAFalecidoId === r.falecidoId);
        if (bensFalecido.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Tipo', 'Descrição', 'Origem', '% Prop.', 'Valor de Mercado']],
                body: bensFalecido.map(b => [
                    b.tipo.replace(/_/g, ' '),
                    b.descricao + (b.onusOuGravame ? ' ⚠ ÔNUS' : ''),
                    b.origem.replace(/_/g, ' '),
                    fmtPct(b.percentualPropriedade),
                    fmtBRL(b.valorMercado * b.percentualPropriedade),
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: GOLD, textColor: 255 },
                alternateRowStyles: { fillColor: [253, 250, 244] },
                margin: { left: 10, right: 10 },
            });
            y = doc.lastAutoTable.finalY + 6;
        }

        y = drawKV(doc, 'Total de Bens (ajustado)', fmtBRL(r.totalBensBruto), y);
        y = drawKV(doc, 'Total de Dívidas', fmtBRL(r.totalDividas), y);
        y = drawKV(doc, 'MONTE-MOR LÍQUIDO', fmtBRL(r.monteMor), y, true);
        y += 4;

        // ── 3. Meação e Herança ───────────────────────────────────────────────
        y = checkPageBreak(doc, y, 40);
        y = drawSectionTitle(doc, '3. Meação e Herança Líquida', y);
        y = drawKV(doc, 'Meação do cônjuge sobrevivente', fmtBRL(r.meacao), y);
        y = drawKV(doc, 'HERANÇA LÍQUIDA para partilha', fmtBRL(r.herancaLiquida), y, true);
        y += 4;

        // ── 4. Quinhões ───────────────────────────────────────────────────────
        y = checkPageBreak(doc, y, 50);
        y = drawSectionTitle(doc, '4. Quinhão por Herdeiro', y);

        if (r.quinhoes.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Herdeiro', 'Grau', 'Percentual', 'Quinhão', `ITCMD (${fmtPct(r.quinhoes[0]?.itcmdAliquota ?? 0)})`, 'Líquido']],
                body: r.quinhoes.map(q => [
                    q.herdeiroNome,
                    q.grau.replace(/_/g, ' '),
                    fmtPct(q.percentual),
                    fmtBRL(q.quinhao),
                    fmtBRL(q.itcmd),
                    fmtBRL(q.quinhao - q.itcmd),
                ]),
                foot: [['TOTAL', '', '100%', fmtBRL(r.herancaLiquida), fmtBRL(r.itcmdTotal), fmtBRL(r.herancaLiquida - r.itcmdTotal)]],
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: GOLD, textColor: 255 },
                footStyles: { fillColor: DARK, textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [253, 250, 244] },
                margin: { left: 10, right: 10 },
            });
            y = doc.lastAutoTable.finalY + 6;
        } else {
            doc.setFontSize(8.5);
            doc.setTextColor(...RED);
            doc.text('Nenhum herdeiro identificado — herança jacente (CC art. 1.844)', 14, y);
            y += 10;
        }

        // ── 5. Plano de Partilha ───────────────────────────────────────────────
        y = checkPageBreak(doc, y, 50);
        y = drawSectionTitle(doc, '5. Plano de Partilha Sugerido', y);

        if (r.partilhaSugerida.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Herdeiro', 'Bem / Descrição', 'Valor Atribuído', 'Compensação', 'ITCMD']],
                body: r.partilhaSugerida.map(p => [
                    p.herdeiroNome,
                    p.descricao,
                    fmtBRL(p.valor),
                    p.compensacaoDevida === 0 ? '—' :
                        (p.compensacaoDevida > 0 ? `+${fmtBRL(p.compensacaoDevida)}` : fmtBRL(p.compensacaoDevida)),
                    fmtBRL(p.itcmd),
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: GOLD, textColor: 255 },
                alternateRowStyles: { fillColor: [253, 250, 244] },
                margin: { left: 10, right: 10 },
            });
            y = doc.lastAutoTable.finalY + 6;
        }

        // ── 6. Diagnóstico de Complexidade ─────────────────────────────────────
        y = checkPageBreak(doc, y, 40);
        y = drawSectionTitle(doc, '6. Diagnóstico de Complexidade', y);
        y = drawComplexidadeBadge(doc, r.scoreComplexidade, r.classificacaoComplexidade, y);
        y = drawKV(doc, 'Tempo estimado de tramitação',
            `${r.tempoEstimadoMeses.min}–${r.tempoEstimadoMeses.max} meses`, y);
        y += 4;

        // ── 7. Checklist Documental ────────────────────────────────────────────
        y = checkPageBreak(doc, y, 60);
        y = drawSectionTitle(doc, '7. Checklist Documental', y);
        const checklist = [
            'Certidão de Óbito',
            'RG e CPF do falecido e herdeiros',
            r.comoriencia ? 'Laudo pericial de comoriência' : null,
            'Certidão de Casamento / Escritura de União Estável',
            'Matrículas atualizadas de imóveis (últimos 30 dias)',
            'CRLV de veículos',
            'Extratos bancários e de investimentos',
            'Contratos sociais de empresas',
            falecido?.temTestamento ? 'Testamento original + inventário de cumprimento' : null,
            'ITBI e IPTU em dia (imóveis)',
            'Certidão negativa de débitos federais (falecido)',
            r.modalidade === 'extrajudicial' ? 'Escritura pública de inventário e partilha' : 'Petição inicial de inventário judicial',
        ].filter(Boolean) as string[];

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        for (const item of checklist) {
            y = checkPageBreak(doc, y, 8);
            doc.text(`☐  ${item}`, 14, y); y += 6.5;
        }
        y += 4;

        // ── 8. Memória de Cálculo ─────────────────────────────────────────────
        y = checkPageBreak(doc, y, 30);
        y = drawSectionTitle(doc, '8. Memória de Cálculo', y);

        for (const linha of r.memoriaCalculo) {
            y = checkPageBreak(doc, y, 6);
            if (linha.startsWith('──')) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...GOLD);
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...GRAY);
            }
            doc.setFontSize(7.5);
            doc.text(linha, 14, y);
            y += 5.5;
        }
    }

    drawFooter(doc);
    doc.save('inventario-sucessorio.pdf');
}
