/**
 * RescisaoEngine — Engine pura de cálculo de verbas rescisórias.
 * Base Legal: Consolidação das Leis do Trabalho (CLT).
 *
 * Não possui I/O, apenas cálculos determinísticos.
 */

// ── Tabela INSS 2025 ─────────────────────────────────────────────────────────
const FAIXAS_INSS = [
    { limite: 1518.00, aliquota: 0.075 },
    { limite: 2793.88, aliquota: 0.09 },
    { limite: 4190.83, aliquota: 0.12 },
    { limite: 8157.41, aliquota: 0.14 },
];

// ── Tabela IRRF 2025 ─────────────────────────────────────────────────────────
const FAIXAS_IRRF = [
    { limite: 2259.20, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];
const DEDUCAO_DEPENDENTE_IRRF = 189.59;

// ── Aviso Prévio Proporcional (Art. 487 + Lei 12.506/2011) ───────────────────
export function calcularAvisoPrevio(anosCompletos: number): number {
    const diasExtras = Math.min(anosCompletos * 3, 60);
    return 30 + diasExtras;
}

// ── Média de Variáveis (12 meses) ─────────────────────────────────────────────
export function calcularMediaVariaveis(valores: number[]): number {
    if (!valores.length) return 0;
    const soma = valores.reduce((a, b) => a + b, 0);
    return soma / valores.length;
}

// ── INSS Progressivo ──────────────────────────────────────────────────────────
export function calcularINSS(base: number): number {
    let inss = 0;
    let baseRestante = base;
    let limiteAnterior = 0;

    for (const faixa of FAIXAS_INSS) {
        if (baseRestante <= 0) break;
        const faixaAtual = Math.min(base, faixa.limite) - limiteAnterior;
        if (faixaAtual <= 0) break;
        inss += faixaAtual * faixa.aliquota;
        limiteAnterior = faixa.limite;
        baseRestante -= faixaAtual;
        if (base <= faixa.limite) break;
    }
    return inss;
}

// ── IRRF sobre verbas tributáveis ─────────────────────────────────────────────
export function calcularIRRF(baseTributavel: number, numeroDependentes: number): number {
    const deducaoDependentes = numeroDependentes * DEDUCAO_DEPENDENTE_IRRF;
    const inss = calcularINSS(baseTributavel);
    const baseCalculo = Math.max(0, baseTributavel - inss - deducaoDependentes);

    for (const faixa of FAIXAS_IRRF) {
        if (baseCalculo <= faixa.limite) {
            return Math.max(0, baseCalculo * faixa.aliquota - faixa.deducao);
        }
    }
    return 0;
}

// ── Multa FGTS ────────────────────────────────────────────────────────────────
export function calcularMultaFGTS(
    saldoFGTS: number,
    tipoRescisao: TipoRescisao
): number {
    if (['SEM_JUSTA_CAUSA', 'RESCISAO_INDIRETA', 'FIM_DETERMINADO'].includes(tipoRescisao)) {
        return saldoFGTS * 0.40;
    }
    if (tipoRescisao === 'ACORDO_484A') {
        return saldoFGTS * 0.20;
    }
    return 0;
}

// ── Tipos de Rescisão ─────────────────────────────────────────────────────────
export type TipoRescisao =
    | 'SEM_JUSTA_CAUSA'
    | 'COM_JUSTA_CAUSA'
    | 'PEDIDO_DEMISSAO'
    | 'RESCISAO_INDIRETA'
    | 'ACORDO_484A'
    | 'FIM_EXPERIENCIA'
    | 'FIM_DETERMINADO';

// Matriz de verbas ativadas (true = gera direito)
export const MATRIZ_RESCISAO: Record<TipoRescisao, {
    saldoSalario: boolean;
    avisoPrevioIndenizado: boolean;
    avisoPrevioDescontavel: boolean; // empregado pede demissão e não cumpre
    feriasVencidas: boolean;
    feriasProporcionais: boolean;
    decimoTerceiro: boolean;
    multa40: boolean;
    multa20: boolean;
    liberacaoFGTS: boolean;
    seguroDesemprego: boolean;
    desconto13Aviso: boolean; // 13º dos dias do aviso incorporado
}> = {
    SEM_JUSTA_CAUSA: {
        saldoSalario: true, avisoPrevioIndenizado: true, avisoPrevioDescontavel: false,
        feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true,
        multa40: true, multa20: false, liberacaoFGTS: true, seguroDesemprego: true,
        desconto13Aviso: false,
    },
    COM_JUSTA_CAUSA: {
        saldoSalario: true, avisoPrevioIndenizado: false, avisoPrevioDescontavel: false,
        feriasVencidas: true, feriasProporcionais: false, decimoTerceiro: false,
        multa40: false, multa20: false, liberacaoFGTS: false, seguroDesemprego: false,
        desconto13Aviso: false,
    },
    PEDIDO_DEMISSAO: {
        saldoSalario: true, avisoPrevioIndenizado: false, avisoPrevioDescontavel: true,
        feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true,
        multa40: false, multa20: false, liberacaoFGTS: false, seguroDesemprego: false,
        desconto13Aviso: false,
    },
    RESCISAO_INDIRETA: {
        saldoSalario: true, avisoPrevioIndenizado: true, avisoPrevioDescontavel: false,
        feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true,
        multa40: true, multa20: false, liberacaoFGTS: true, seguroDesemprego: true,
        desconto13Aviso: false,
    },
    ACORDO_484A: {
        saldoSalario: true, avisoPrevioIndenizado: false, avisoPrevioDescontavel: false,
        feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true,
        multa40: false, multa20: true, liberacaoFGTS: true, seguroDesemprego: false,
        desconto13Aviso: false,
    },
    FIM_EXPERIENCIA: {
        saldoSalario: true, avisoPrevioIndenizado: false, avisoPrevioDescontavel: false,
        feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true,
        multa40: false, multa20: false, liberacaoFGTS: false, seguroDesemprego: false,
        desconto13Aviso: false,
    },
    FIM_DETERMINADO: {
        saldoSalario: true, avisoPrevioIndenizado: false, avisoPrevioDescontavel: false,
        feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true,
        multa40: true, multa20: false, liberacaoFGTS: true, seguroDesemprego: true,
        desconto13Aviso: false,
    },
};

// ── Seguro-Desemprego (estimativa de parcelas — Lei 7.998/1990) ───────────────
export function calcularParcelasSeguroDesemprego(
    salarioMedio: number,
    mesesTrabalhados: number
): { parcelas: number; valorEstimado: number } {
    let parcelas = 3;
    if (mesesTrabalhados >= 12 && mesesTrabalhados < 23) parcelas = 4;
    if (mesesTrabalhados >= 24) parcelas = 5;

    // Cálculo simplificado: 80% do salário médio, mínimo 1 SM
    const sm = 1518.00;
    const valor = Math.max(sm, salarioMedio * 0.80);
    return { parcelas, valorEstimado: parseFloat(valor.toFixed(2)) };
}

// ── Interface de entrada ──────────────────────────────────────────────────────
export interface RescisaoInput {
    // Dados contratuais
    salarioBase: number;
    tipoRescisao: TipoRescisao;
    dataAdmissao: string; // YYYY-MM-DD
    dataDemissao: string; // YYYY-MM-DD
    diasTrabalhosNoMes: number; // dias trabalhados no mês da demissão

    // Período aquisitivo de férias
    mesesFeriasVencidas: number; // 0 se não tem período completo

    // FGTS
    saldoFGTS: number;

    // Variáveis (médias de 12 meses)
    mediaHorasExtras: number;
    mediaAdicionalNoturno: number;
    mediaComissoes: number;

    // Dependentes para IRRF
    numeroDependentes: number;

    // Se aviso foi trabalhado (pedido de demissão)
    avisoTrabalhado: boolean;

    // Horas extras vindas do Cartão de Ponto (em minutos)
    minutosExtrasCard?: number;
    // Se irregularidade de horas extras está marcada (para apurar no memorial)
    irregularidadeHorasExtras?: boolean;
}

// ── Interface de saída ────────────────────────────────────────────────────────
export interface RescisaoResult {
    // Dados calculados
    anosCompletos: number;
    mesesCompletos: number;
    diasAvisoPrevio: number;
    mediaVariaveisTotal: number;

    // Verbas (bruto)
    saldoSalario: number;
    avisoPrevio: number;           // positivo = indenizado, negativo = desconto
    feriasVencidas: number;        // +1/3 incluído
    feriasVencidasTercoProporcional: number;
    feriasProporcionais: number;   // +1/3 incluído
    decimoTerceiro: number;
    reflexoVariaveisFeriasVencidas: number;
    reflexoVariaveisFeriasProporcionais: number;
    reflexoVariaveisDecimo: number;
    multaFGTS: number;
    valorHECard: number;           // HE vindas da grade do cartão

    // Deduções
    inss: number;
    irrf: number;

    // Totais
    totalBruto: number;
    totalDeducoes: number;
    totalLiquido: number;

    // Informativo
    liberacaoFGTS: boolean;
    seguroDesemprego: { parcelas: number; valorEstimado: number } | null;
    direitos: typeof MATRIZ_RESCISAO[TipoRescisao];
    alerta: string | null;
}

// ── Engine Principal ──────────────────────────────────────────────────────────
export class RescisaoEngine {

    static calcular(input: RescisaoInput): RescisaoResult {
        const direitos = MATRIZ_RESCISAO[input.tipoRescisao];

        // Tempo de serviço
        const admissao = new Date(input.dataAdmissao);
        const demissao = new Date(input.dataDemissao);
        const diffMs = demissao.getTime() - admissao.getTime();
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const anosCompletos = Math.floor(diffDias / 365);
        const mesesCompletos = Math.floor(diffDias / 30.44);

        // Aviso prévio
        const diasAvisoPrevio = calcularAvisoPrevio(anosCompletos);

        // Salário diário (base para rateios)
        const salarioDiario = input.salarioBase / 30;

        // Média de variáveis
        const mediaVariaveisTotal =
            input.mediaHorasExtras +
            input.mediaAdicionalNoturno +
            input.mediaComissoes;

        // Base de cálculo (salário + variáveis)
        const baseCalculo = input.salarioBase + mediaVariaveisTotal;

        // ── Verbas ──────────────────────────────────────────────────────────

        // Saldo de salário (proporcional aos dias trabalhados no mês)
        const saldoSalario = direitos.saldoSalario
            ? salarioDiario * input.diasTrabalhosNoMes
            : 0;

        // Aviso prévio (indenizado ou descontado)
        let avisoPrevio = 0;
        if (direitos.avisoPrevioIndenizado) {
            avisoPrevio = baseCalculo * (diasAvisoPrevio / 30);
        } else if (direitos.avisoPrevioDescontavel && !input.avisoTrabalhado) {
            // Pedido de demissão sem cumprir aviso → desconta
            avisoPrevio = -(baseCalculo * (diasAvisoPrevio / 30));
        }

        // Férias vencidas (período completo não gozado) + 1/3
        const feriasVencidasBase = direitos.feriasVencidas
            ? baseCalculo * (input.mesesFeriasVencidas / 12)
            : 0;
        const feriasVencidas = feriasVencidasBase * (4 / 3);
        const feriasVencidasTercoProporcional = feriasVencidas - feriasVencidasBase;

        // Reflexo de variáveis em férias vencidas
        const reflexoVariaveisFeriasVencidas = direitos.feriasVencidas
            ? mediaVariaveisTotal * (input.mesesFeriasVencidas / 12) * (4 / 3)
            : 0;

        // Férias proporcionais (cálculo automático de avos)
        // Regra: 1 mês para cada 30 dias ou fração > 14 dias no último período
        const restosDias = diffDias % 30.44;
        let mesesFeriasProporcionais = mesesCompletos % 12;
        if (restosDias > 14) {
            mesesFeriasProporcionais = Math.min(12, mesesFeriasProporcionais + 1);
        }

        const feriasProporcionaisBase = direitos.feriasProporcionais
            ? baseCalculo * (mesesFeriasProporcionais / 12)
            : 0;
        const feriasProporcionais = feriasProporcionaisBase * (4 / 3);

        // Reflexo de variáveis em férias proporcionais
        const reflexoVariaveisFeriasProporcionais = direitos.feriasProporcionais
            ? mediaVariaveisTotal * (mesesFeriasProporcionais / 12) * (4 / 3)
            : 0;

        // 13º proporcional
        let meses13 = mesesFeriasProporcionais;
        // Se aviso prévio indenizado, acresce os meses do aviso ao 13º
        if (direitos.avisoPrevioIndenizado) {
            const mesesAviso = Math.ceil(diasAvisoPrevio / 30);
            meses13 = Math.min(12, meses13 + mesesAviso);
        }
        const decimoTerceiro = direitos.decimoTerceiro
            ? baseCalculo * (meses13 / 12)
            : 0;

        // Reflexo de variáveis no 13º
        const reflexoVariaveisDecimo = direitos.decimoTerceiro
            ? mediaVariaveisTotal * (meses13 / 12)
            : 0;

        // Multa FGTS
        const multaFGTS = calcularMultaFGTS(input.saldoFGTS, input.tipoRescisao);

        // ── Horas Extras do Cartão de Ponto ──────────────────────────────────
        let valorHECard = 0;
        if (input.irregularidadeHorasExtras && input.minutosExtrasCard && input.minutosExtrasCard > 0) {
            // Valor da hora normal = Base de cálculo / 220
            const valorHoraNormal = baseCalculo / 220;
            // Padronizando 50% de adicional para o memorial (conforme solicitado pelo usuário)
            valorHECard = (input.minutosExtrasCard / 60) * valorHoraNormal * 1.5;
        }

        // ── Bruto ────────────────────────────────────────────────────────────
        const totalBruto = Math.max(0,
            saldoSalario +
            avisoPrevio +
            feriasVencidas +
            feriasProporcionais +
            decimoTerceiro +
            multaFGTS +
            valorHECard
        );

        // ── Deduções ─────────────────────────────────────────────────────────
        const inss = 0;
        const irrf = 0;

        const totalDeducoes = inss + irrf;
        const totalLiquido = totalBruto - totalDeducoes;

        // ── Informativo ──────────────────────────────────────────────────────
        const seguroDesemprego = direitos.seguroDesemprego
            ? calcularParcelasSeguroDesemprego(baseCalculo, mesesCompletos)
            : null;

        // Alerta
        const alerta =
            input.tipoRescisao === 'COM_JUSTA_CAUSA'
                ? 'Rescisão por justa causa: apenas saldo de salário e férias vencidas são devidos.'
                : input.tipoRescisao === 'ACORDO_484A'
                    ? 'Acordo (Art. 484-A CLT): multa de 20%, sem seguro-desemprego. Requer homologação.'
                    : null;

        return {
            anosCompletos,
            mesesCompletos,
            diasAvisoPrevio,
            mediaVariaveisTotal,
            saldoSalario,
            avisoPrevio,
            feriasVencidas,
            feriasVencidasTercoProporcional,
            feriasProporcionais,
            decimoTerceiro,
            reflexoVariaveisFeriasVencidas,
            reflexoVariaveisFeriasProporcionais,
            reflexoVariaveisDecimo,
            multaFGTS,
            valorHECard,
            inss,
            irrf,
            totalBruto,
            totalDeducoes,
            totalLiquido,
            liberacaoFGTS: direitos.liberacaoFGTS,
            seguroDesemprego,
            direitos,
            alerta,
        };
    }
}
