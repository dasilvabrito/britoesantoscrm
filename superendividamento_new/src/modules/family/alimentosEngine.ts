/**
 * alimentosEngine.ts
 * Engine de cálculo de pensão alimentícia.
 * Base legal: Código Civil Brasileiro (Arts. 1.694–1.710) e CF/88, Art. 227.
 */

import { fmtBRL, fmtPct } from './formatBR';

export interface RendaAlimentante {
    salarioFixo: number;
    mediaVariaveis12m: number;   // HE, adicional noturno, comissões
    plrProporcional: number;
    decimoTerceiro: number;
    feriasComTerco: number;
    rendaAutonoma: number;
    outrosRendimentos: number;
}

export interface ConfiguracaoPensao {
    renda: RendaAlimentante;
    percentualPleiteado: number;  // ex: 0.30
    numeroFilhos: number;
    novaFamilia: boolean;
    filhosNovaFamilia: number;
    baseCalculo: 'LIQUIDO' | 'BRUTO' | 'FIXO' | 'FIXO_VARIAVEIS';
}

export interface CenarioPensao {
    percentual: number;
    label: string;
    valorMensal: number;
    valorAnual: number;
    valorAte18Anos: number;
    comprometimentoRenda: string;
}

export interface ResultadoPensao {
    rendaBaseCalculo: number;
    rendaTotalLiquida: number;
    valorMensalCalculado: number;
    valorPorFilho: number;
    impactoAnual: number;
    impactoAte18Anos: number;
    comprometimentoRenda: string;
    // Verbas anuais separadas
    pensaoSobre13: number;
    pensaoSobreFerias: number;
    // Cenários comparativos
    cenarios: CenarioPensao[];
    memoriaCalculo: string[];
}

function calcularBaseRenda(renda: RendaAlimentante, base: ConfiguracaoPensao['baseCalculo']): number {
    switch (base) {
        case 'FIXO':
            return renda.salarioFixo;
        case 'FIXO_VARIAVEIS':
            return renda.salarioFixo + renda.mediaVariaveis12m;
        case 'BRUTO':
            return renda.salarioFixo + renda.mediaVariaveis12m + renda.rendaAutonoma + renda.outrosRendimentos;
        case 'LIQUIDO':
        default: {
            const total = renda.salarioFixo + renda.mediaVariaveis12m + renda.plrProporcional
                + renda.rendaAutonoma + renda.outrosRendimentos;
            // Estimativa de desconto INSS + IR (~25%)
            return total * 0.75;
        }
    }
}

function gerarCenarios(rendaBase: number, numeroFilhos: number): CenarioPensao[] {
    const percentuais = [
        { p: 0.15, label: '15% (mínimo jurisprudencial)' },
        { p: 0.20, label: '20% (recomendado 1 filho)' },
        { p: 0.25, label: '25% (médio)' },
        { p: 0.30, label: '30% (alto — múltiplos filhos)' },
    ];

    return percentuais.map(({ p, label }) => {
        const mensal = rendaBase * p;
        return {
            percentual: Math.round(p * 100),
            label,
            valorMensal: +mensal.toFixed(2),
            valorAnual: +(mensal * 12).toFixed(2),
            valorAte18Anos: +(mensal * 12 * 18).toFixed(2),
            comprometimentoRenda: fmtPct(p),
        };
    });
}

export function calcularPensao(config: ConfiguracaoPensao): ResultadoPensao {
    const memoria: string[] = [];
    const rendaLiquidaTotal =
        config.renda.salarioFixo + config.renda.mediaVariaveis12m +
        config.renda.plrProporcional + config.renda.rendaAutonoma + config.renda.outrosRendimentos;

    const rendaBase = calcularBaseRenda(config.renda, config.baseCalculo);
    memoria.push(`Base de cálculo (${config.baseCalculo}): ${fmtBRL(rendaBase)}`);

    const valorMensal = rendaBase * config.percentualPleiteado;
    const valorPorFilho = config.numeroFilhos > 0 ? valorMensal / config.numeroFilhos : valorMensal;
    const impactoAnual = valorMensal * 12;
    const comprometimento = fmtPct(valorMensal / rendaLiquidaTotal);

    // Pensão sobre verbas anuais
    const pensaoSobre13 = config.renda.decimoTerceiro * config.percentualPleiteado;
    const pensaoSobreFerias = config.renda.feriasComTerco * config.percentualPleiteado;

    memoria.push(`Percentual pleiteado: ${fmtPct(config.percentualPleiteado)}`);
    memoria.push(`Valor mensal: ${fmtBRL(valorMensal)}`);
    memoria.push(`Valor por filho (${config.numeroFilhos}): ${fmtBRL(valorPorFilho)}`);
    memoria.push(`Pensão sobre 13º: ${fmtBRL(pensaoSobre13)}`);
    memoria.push(`Pensão sobre férias + 1/3: ${fmtBRL(pensaoSobreFerias)}`);
    memoria.push(`Comprometimento da renda: ${comprometimento}`);

    return {
        rendaBaseCalculo: +rendaBase.toFixed(2),
        rendaTotalLiquida: +rendaLiquidaTotal.toFixed(2),
        valorMensalCalculado: +valorMensal.toFixed(2),
        valorPorFilho: +valorPorFilho.toFixed(2),
        impactoAnual: +impactoAnual.toFixed(2),
        impactoAte18Anos: +(impactoAnual * 18).toFixed(2),
        comprometimentoRenda: comprometimento,
        pensaoSobre13: +pensaoSobre13.toFixed(2),
        pensaoSobreFerias: +pensaoSobreFerias.toFixed(2),
        cenarios: gerarCenarios(rendaBase, config.numeroFilhos),
        memoriaCalculo: memoria,
    };
}
