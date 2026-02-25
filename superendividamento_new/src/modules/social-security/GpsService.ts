/**
 * Lógica de Cálculo GPS INSS Trimestral (ES6+)
 * Sem dependências de frameworks ou backend.
 */

import { MinimumWageService } from './MinimumWageService';
import { CalculationEngine } from '../../core/calculation-engine/CalculationEngine';

export function obterSalarioMinimo(anoOuData: string | number | Date): number {
    return MinimumWageService.obterSalarioMinimo(anoOuData as any);
}

export interface PerfilContribuinte {
    tipoSegurado: "INDIVIDUAL" | "FACULTATIVO";
    baixaRendaCadUnico?: boolean;
    desejaAposentadoriaTempo: boolean;
    querPagarTrimestral?: boolean;
    competenciaEmAtraso?: boolean;
    prestadorParaPJ?: boolean;
    jaContribuiu11?: boolean;
}

export function recomendarCodigoINSS(perfil: PerfilContribuinte) {
    const {
        tipoSegurado,
        baixaRendaCadUnico,
        desejaAposentadoriaTempo,
        querPagarTrimestral,
        competenciaEmAtraso,
        prestadorParaPJ,
        jaContribuiu11
    } = perfil;

    // Facultativo baixa renda
    if (tipoSegurado === "FACULTATIVO" && baixaRendaCadUnico) {
        return { codigo: "1929", descricao: "Facultativo Baixa Renda 5%" };
    }

    // Facultativo trimestral
    if (tipoSegurado === "FACULTATIVO" && querPagarTrimestral) {
        return { codigo: "1805", descricao: "Facultativo 20% Trimestral" };
    }

    // Facultativo 20%
    if (tipoSegurado === "FACULTATIVO" && desejaAposentadoriaTempo) {
        return { codigo: "1406", descricao: "Facultativo 20% Mensal" };
    }

    // Facultativo 11%
    if (tipoSegurado === "FACULTATIVO") {
        return { codigo: "1473", descricao: "Facultativo 11% (Simplificado)" };
    }

    // Prestador para PJ
    if (prestadorParaPJ) {
        return { codigo: "1287", descricao: "CI Prestador a Pessoa Jurídica (20%)" };
    }

    // Em atraso
    if (tipoSegurado === "INDIVIDUAL" && competenciaEmAtraso) {
        if (desejaAposentadoriaTempo) {
            return { codigo: "1120", descricao: "CI 20% em atraso" };
        } else {
            return { codigo: "1236", descricao: "CI 11% em atraso" };
        }
    }

    // Complementação
    if (jaContribuiu11 && desejaAposentadoriaTempo) {
        return { codigo: "1503", descricao: "Complementação 9%" };
    }

    // CI 20%
    if (tipoSegurado === "INDIVIDUAL" && desejaAposentadoriaTempo) {
        return { codigo: "1007", descricao: "CI 20% Mensal" };
    }

    // CI 11%
    if (tipoSegurado === "INDIVIDUAL") {
        return { codigo: "1163", descricao: "CI 11% (Simplificado)" };
    }

    return { error: "Perfil não identificado" };
}

export function obterCodigoGPS(tipo: string, modalidade: string, isTrimestral = true): string {
    if (isTrimestral) {
        if (tipo === 'INDIVIDUAL') {
            return modalidade === 'NORMAL' ? '1104' : '1180';
        } else if (tipo === 'FACULTATIVO') {
            if (modalidade === 'NORMAL') return '1457';
            if (modalidade === 'BAIXA_RENDA') return '1490';
            return '1473';
        }
    } else {
        // Mensal
        if (tipo === 'INDIVIDUAL') {
            return modalidade === 'NORMAL' ? '1007' : '1163';
        } else if (tipo === 'FACULTATIVO') {
            if (modalidade === 'NORMAL') return '1406';
            if (modalidade === 'BAIXA_RENDA') return '1929';
            return '1473';
        }
    }
    return '1104';
}

export function obterCompetencia(trimestre: number, ano: string | number): string {
    const meses: Record<number, string> = { 1: '03', 2: '06', 3: '09', 4: '12' };
    return `${meses[trimestre]}/${ano}`;
}

export function obterVencimento(trimestre: number, ano: string | number): string {
    const vencimentos: Record<number, string> = {
        1: `15/04/${ano}`,
        2: `15/07/${ano}`,
        3: `15/10/${ano}`,
        4: `15/01/${parseInt(ano as string) + 1}`
    };
    return vencimentos[trimestre];
}

export function obterVencimentoMensal(competencia: string): string {
    // Competência format: "MM/AAAA" ou "YYYY-MM"
    let compISO = competencia;
    if (competencia.includes('/')) {
        const [m, y] = competencia.split('/');
        compISO = `${y}-${m.padStart(2, '0')}`;
    }

    const venc = MinimumWageService.calcularVencimentoAntecipado(compISO);
    return venc.toLocaleDateString('pt-BR');
}

interface GPSInput {
    salarioBase: number;
    tipo: string;
    modalidade: string;
    trimestre?: number;
    mes?: number;
    ano: string | number;
    diasAtraso: number;
    isTrimestral?: boolean;
}

export function calcularGPS(data: GPSInput) {
    const { salarioBase, tipo, modalidade, trimestre, mes, ano, diasAtraso, isTrimestral = true } = data;

    // 1. Alíquota
    let aliquota = 0.20;
    if (modalidade === 'SIMPLIFICADO') aliquota = 0.11;
    if (modalidade === 'BAIXA_RENDA') aliquota = 0.05;

    // 2. Valores Base
    const valorMensal = Math.round(salarioBase * aliquota * 100) / 100;
    const multiplicador = isTrimestral ? 3 : 1;
    const valorPrincipal = Math.round(valorMensal * multiplicador * 100) / 100;

    // 3. Encargos de Atraso (Multa e Juros) usando o Engine Centralizado
    const competencia = isTrimestral
        ? obterCompetencia(trimestre!, ano)
        : `${String(mes).padStart(2, '0')}/${ano}`;

    const vencimentoStr = isTrimestral
        ? obterVencimento(trimestre!, ano)
        : obterVencimentoMensal(competencia);

    // Converter vencimento "DD/MM/AAAA" para Date
    const [diaV, mesV, anoV] = vencimentoStr.split('/').map(Number);
    const dataVencimento = new Date(anoV, mesV - 1, diaV);

    // Calcular data de pagamento aproximada baseada nos dias de atraso
    const dataPagamento = new Date(dataVencimento);
    dataPagamento.setDate(dataPagamento.getDate() + diasAtraso);

    // Formatar competência para o engine (YYYY-MM)
    const [mesC, anoC] = competencia.split('/');
    const competenciaISO = `${anoC}-${mesC.padStart(2, '0')}`;

    const lateResult = CalculationEngine.calculateSocialSecurityLatePayment({
        principal: valorPrincipal,
        dueDate: dataVencimento,
        paymentDate: dataPagamento,
        competencia: competenciaISO
    });

    const multa = Math.round(lateResult.fine.toNumber() * 100) / 100;
    const juros = Math.round(lateResult.interest.toNumber() * 100) / 100;

    const total = Math.round((valorPrincipal + multa + juros) * 100) / 100;

    const vencimento = vencimentoStr;

    return {
        codigo: obterCodigoGPS(tipo, modalidade, isTrimestral),
        competencia,
        vencimento,
        valorPrincipal,
        multa,
        juros,
        total,
        memoria: {
            aliquota: aliquota * 100,
            valorMensal,
            diasAtraso,
            baseCalculo: salarioBase,
            isTrimestral
        }
    };
}
