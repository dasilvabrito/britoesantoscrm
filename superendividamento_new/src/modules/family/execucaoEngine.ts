/**
 * execucaoEngine.ts
 * Engine de execução de alimentos com atualização monetária.
 * Base legal: CPC/2015, Art. 528 e ss.; CC, Art. 1.710.
 */

import { calcularIndiceAcumulado, INDICES_HISTORICOS, type TipoIndice, type TabelaIndices } from './indiceEngine';
import { fmtBRL, fmtPct } from './formatBR';


export interface ParcelaPendente {
    competencia: string;   // "YYYY-MM"
    valorOriginal: number;
    dataVencimento: string; // "YYYY-MM-DD"
}

export interface ConfiguracaoExecucao {
    valorMensal: number;
    dataInicioInadimplencia: string; // "YYYY-MM-DD"
    dataCalculo: string;             // "YYYY-MM-DD"
    tipoIndice: TipoIndice;
    jurosMensal: number;             // default 0.01 (1% a.m.)
    multa: number;                   // default 0.10 (10%)
    tabelaCustom?: TabelaIndices;
}

export interface ParcelaAtualizada {
    competencia: string;
    valorOriginal: number;
    correcaoMonetaria: number;
    juros: number;
    multa: number;
    totalAtualizado: number;
    mesesAtraso: number;
    rito: 'PRISAO' | 'PENHORA';
}

export interface ResultadoExecucao {
    parcelas: ParcelaAtualizada[];
    totalExecutavel: number;
    // Separação de rito
    valorRitoPrisao: number;         // Últimas 3 parcelas — prisão civil (CPC, Art. 528)
    valorRitoPenhora: number;        // Demais parcelas — penhora
    numeroParcelas: number;
    // Acordo
    simulacaoAcordoVista: number;   // 70% do total c/ deságio típico
    simulacaoParcelamento3x: number;
    memoriaCalculo: string[];
}

function diffMeses(inicio: string, fim: string): number {
    const d1 = new Date(inicio + 'T12:00');
    const d2 = new Date(fim + 'T12:00');
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

export function calcularExecucao(config: ConfiguracaoExecucao): ResultadoExecucao {
    const memoria: string[] = [];
    const tabela = config.tabelaCustom ?? INDICES_HISTORICOS;

    const totalMeses = diffMeses(config.dataInicioInadimplencia, config.dataCalculo);
    if (totalMeses <= 0) {
        return {
            parcelas: [], totalExecutavel: 0,
            valorRitoPrisao: 0, valorRitoPenhora: 0,
            numeroParcelas: 0,
            simulacaoAcordoVista: 0, simulacaoParcelamento3x: 0,
            memoriaCalculo: ['Nenhuma parcela vencida no período informado.'],
        };
    }

    const inicio = new Date(config.dataInicioInadimplencia + 'T12:00');
    const parcelas: ParcelaAtualizada[] = [];

    for (let i = 0; i < totalMeses; i++) {
        const cur = new Date(inicio);
        cur.setMonth(cur.getMonth() + i);
        const competencia = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const dataVenc = `${competencia}-10`; // vencimento dia 10 (padrão)

        const mesesAtraso = totalMeses - i;
        const taxa = tabela[competencia]?.[config.tipoIndice] ?? 0;
        const correcao = config.valorMensal * taxa;
        const juros = config.valorMensal * config.jurosMensal * mesesAtraso;
        const multaValor = config.valorMensal * config.multa;
        const total = config.valorMensal + correcao + juros + multaValor;

        const rito: ParcelaAtualizada['rito'] =
            i >= totalMeses - 3 ? 'PRISAO' : 'PENHORA';

        parcelas.push({
            competencia,
            valorOriginal: +config.valorMensal.toFixed(2),
            correcaoMonetaria: +correcao.toFixed(2),
            juros: +juros.toFixed(2),
            multa: +multaValor.toFixed(2),
            totalAtualizado: +total.toFixed(2),
            mesesAtraso,
            rito,
        });
    }

    const totalExecutavel = parcelas.reduce((s, p) => s + p.totalAtualizado, 0);
    const valorPrisao = parcelas.filter(p => p.rito === 'PRISAO').reduce((s, p) => s + p.totalAtualizado, 0);
    const valorPenhora = parcelas.filter(p => p.rito === 'PENHORA').reduce((s, p) => s + p.totalAtualizado, 0);

    const acordoVista = totalExecutavel * 0.70;
    const parcelamento3x = totalExecutavel / 3;

    memoria.push(`Período: ${config.dataInicioInadimplencia} a ${config.dataCalculo}`);
    memoria.push(`Índice de correção: ${config.tipoIndice}`);
    memoria.push(`Juros de mora: ${fmtPct(config.jurosMensal)} a.m.`);
    memoria.push(`Multa: ${fmtPct(config.multa)}`);
    memoria.push(`Total de parcelas: ${totalMeses}`);
    memoria.push(`Parcelas rito prisão (${parcelas.filter(p => p.rito === 'PRISAO').length}x): ${fmtBRL(valorPrisao)}`);
    memoria.push(`Parcelas rito penhora (${parcelas.filter(p => p.rito === 'PENHORA').length}x): ${fmtBRL(valorPenhora)}`);
    memoria.push(`Total executável: ${fmtBRL(totalExecutavel)}`);
    memoria.push(`Proposta de acordo à vista (30% deságio): ${fmtBRL(acordoVista)}`);

    return {
        parcelas,
        totalExecutavel: +totalExecutavel.toFixed(2),
        valorRitoPrisao: +valorPrisao.toFixed(2),
        valorRitoPenhora: +valorPenhora.toFixed(2),
        numeroParcelas: totalMeses,
        simulacaoAcordoVista: +acordoVista.toFixed(2),
        simulacaoParcelamento3x: +parcelamento3x.toFixed(2),
        memoriaCalculo: memoria,
    };
}
