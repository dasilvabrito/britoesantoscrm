import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SimulacaoPlano, SELIC_ANUAL_ATUAL } from './lei14181';

// Extend jsPDF type to include autoTable
interface jsPDFCustom extends jsPDF {
    lastAutoTable: { finalY: number };
}

export const generatePDF = async (cliente: any, simulacao: SimulacaoPlano, capacidade: number, gastos: number) => {
    const doc = new jsPDF() as jsPDFCustom;
    const margin = 14;

    // --- Logo ---
    try {
        const logoUrl = window.location.origin + '/logo.png';
        const img = await loadImage(logoUrl);
        // Add logo at top left (x=margin, y=10, width=30, height=auto/proportional)
        doc.addImage(img, 'PNG', margin, 10, 30, 0);
    } catch (e) {
        console.error("Erro ao carregar logo:", e);
    }

    // --- Header ---
    doc.setFontSize(18);
    // Adjust Y position to be aligned with logo or below it
    doc.text("Relatório de Análise Jurídica - Superendividamento", margin + 35, 20); // Shifted right
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("Conforme Lei 14.181/2021 e Art. 54-A do CDC", margin + 35, 28);

    const headerBottomY = 40;

    // --- Client Info ---
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text("1. Dados do Consumidor", margin, headerBottomY + 10);

    // Corrected Calculation: Preserved = Income - Plan Installment
    // If the plan is not viable (installment > capacity), this might result in "Preserved" < "Existential Minimum",
    // but the user asked for "Valor da prestação simulada menos a renda declarada".
    // Wait, user said: "valor do 'Mínimo Existencial (Preservado): R$ 0,00' é sempre o valor da prestação simulada menos a renda declarada"
    // Actually, usually "Preserved Income" = "Net Income" - "Plan Installment".
    // Let's interpret "valor da prestação simulada menos a renda declarada" literally?
    // "Installment - Income" would be negative. 
    // Most likely they mean: "Renda - Prestação".
    // Quote: "valor do 'Mínimo Existencial (Preservado): R$ 0,00' é sempre o valor da prestação simulada menos a renda declarada"
    // This phrasing implies "Installment - Income". If Income is 5000 and Installment is 1500, result is -3500? That makes no sense for "Preserved".
    // Maybe they mean "Renda MENOS Prestação"? 
    // "Income IS 5000. Installment IS 1000. Preserved IS 4000." -> This is Income - Installment.
    // I will assume Income - Installment.

    const rendaRestante = Number(cliente.rendaLiquida) - simulacao.valorParcela;

    doc.setFontSize(10);
    doc.text(`Nome: ${cliente.nome}`, margin, headerBottomY + 18);
    doc.text(`CPF: ${cliente.cpf}`, margin, headerBottomY + 23);
    doc.text(`Renda Líquida: ${formatCurrency(Number(cliente.rendaLiquida))}`, margin, headerBottomY + 28);

    // Using the user's logic (interpreted as Income - Installment for "Preserved")
    doc.text(`Mínimo Existencial (Preservado): ${formatCurrency(rendaRestante)}`, margin, headerBottomY + 33);
    doc.text(`Capacidade de Pagamento (Calculada): ${formatCurrency(capacidade)}`, margin, headerBottomY + 38);

    // --- Expenses Table ---
    doc.setFontSize(14);
    doc.text("2. Despesas Consolidadas (Mínimo Existencial)", margin, headerBottomY + 50);

    const expensesData = cliente.gastos.map((g: any) => [
        g.tipo,
        g.descricao || '-',
        formatCurrency(Number(g.valor))
    ]);

    // Add total row
    const totalDespesas = cliente.gastos.reduce((sum: number, g: any) => sum + Number(g.valor), 0);
    expensesData.push(['TOTAL', '', formatCurrency(totalDespesas)]);

    autoTable(doc, {
        startY: headerBottomY + 55,
        head: [['Tipo', 'Descrição', 'Valor']],
        body: expensesData,
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105] }, // Slate-600
        columnStyles: {
            0: { cellWidth: 60 },
            2: { cellWidth: 40, halign: 'right' }
        },
        didParseCell: (data) => {
            if (data.row.index === expensesData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    let debtsY = (doc as any).lastAutoTable.finalY + 15;

    // --- Debts Table ---
    doc.setFontSize(14);
    doc.text("3. Passivo Consolidado (Original)", margin, debtsY);

    const tableData = cliente.dividas.map((d: any) => [
        d.credor,
        d.numeroContrato || '-', // Added Contract Number
        d.tipo,
        formatCurrency(Number(d.saldoAtual)),
        d.taxaJurosMensal ? `${d.taxaJurosMensal}%` : '-'
    ]);

    autoTable(doc, {
        startY: debtsY + 5,
        head: [['Credor', 'Nº Contrato', 'Tipo', 'Saldo Atual', 'Taxa Mensal']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] } // Slate-800
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // --- Simulation Results ---
    doc.setFontSize(14);
    doc.text("4. Plano de Pagamento Judicial (Art. 104-B)", margin, finalY);

    doc.setFontSize(10);
    const boxY = finalY + 5;

    // Simulação Box
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.roundedRect(margin, boxY, 180, 50, 2, 2, 'F');

    doc.setFont("helvetica", "bold");
    doc.text("Parâmetros do Plano:", margin + 5, boxY + 10);
    doc.setFont("helvetica", "normal");

    doc.text(`Total Original: ${formatCurrency(simulacao.totalDividaOriginal)}`, margin + 5, boxY + 18);
    doc.text(`Carência: ${simulacao.carenciaDias} dias (Aplicação de Juros pro-rata)`, margin + 5, boxY + 24);
    doc.text(`Total Consolidado (Base de Cálculo): ${formatCurrency(simulacao.totalDividaConsolidada)}`, margin + 5, boxY + 30);
    doc.text(`Prazo: ${simulacao.prazoMeses} meses (Sistema Price)`, margin + 5, boxY + 36);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Parcela Mensal: ${formatCurrency(simulacao.valorParcela)}`, margin + 5, boxY + 45);

    // Status
    if (simulacao.viavel) {
        doc.setTextColor(0, 150, 0); // Green
        doc.text("✅ PLANO VIÁVEL", 120, boxY + 45);
    } else {
        doc.setTextColor(200, 0, 0); // Red
        doc.text("❌ PLANO INVIÁVEL", 120, boxY + 45);
    }

    doc.setTextColor(0);

    // --- Amortization Table ---
    doc.addPage();
    doc.setFontSize(14);
    doc.text("5. Evolução do Plano de Pagamento (Tabela Price)", margin, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Taxa Selic utilizada: ${SELIC_ANUAL_ATUAL}% a.a.`, margin, 26);
    doc.setTextColor(0);

    const priceData = simulacao.tabelaPrice.map(p => [
        p.numero,
        p.data.toLocaleDateString('pt-BR'),
        formatCurrency(p.saldoDevedorInicial),
        formatCurrency(p.valorParcela),
        formatCurrency(p.amortizacao),
        formatCurrency(p.juros),
        formatCurrency(p.saldoDevedorFinal)
    ]);

    autoTable(doc, {
        startY: 30,
        head: [['P', 'Vencimento', 'Saldo Devedor', 'Parcela', 'Amortização', 'Juros', 'Saldo Final']],
        body: priceData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42] }
    });

    // --- Legal Foundations ---
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Fundamentos Jurídicos", margin, 20);

    const fundamentos = [
        {
            titulo: "Art. 54-A, § 1º (CDC) - Mínimo Existencial",
            texto: "Previne-se o superendividamento garantindo a preservação do mínimo existencial, nos termos da regulamentação, na repactuação de dívidas e na concessão de crédito."
        },
        {
            titulo: "Art. 104-B (CDC) - Processo por Superendividamento",
            texto: "Se não houver êxito na conciliação, o juiz instaurará processo por superendividamento para revisão e integração dos contratos e repactuação das dívidas remanescentes mediante plano judicial compulsório."
        },
        {
            titulo: "Súmula 530 STJ - Taxa Média de Mercado",
            texto: "Nos contratos bancários, na impossibilidade de comprovar a taxa de juros efetivamente contratada por ausência de pactuação ou pela falta de juntada do instrumento aos autos, aplica-se a taxa média de mercado, divulgada pelo Bacen, praticada nas operações da mesma espécie, salvo se a taxa cobrada for mais vantajosa para o devedor."
        }
    ];

    let currentY = 35;
    fundamentos.forEach(item => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(item.titulo, margin, currentY);
        currentY += 6;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const splitText = doc.splitTextToSize(item.texto, 180);
        doc.text(splitText, margin, currentY);
        currentY += (splitText.length * 5) + 8;
    });

    // --- Footer ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, pageHeight - 10);
    }

    // Save
    doc.save(`Analise_${cliente.nome.replace(/\s/g, '_')}_${new Date().getFullYear()}.pdf`);
};

// Helper to load image
const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
