/**
 * gravidicosEngine.ts
 * Engine de alimentos gravídicos.
 * Base legal: Lei 11.804/2008, Art. 2º — baseiam-se em indícios de paternidade.
 */

import { fmtBRL, fmtPct } from './formatBR';

export interface DespesasGestacao {
    // Mensais (recorrentes)
    planoSaude: number;
    medicamentos: number;
    consultas: number;
    exames: number;
    // Pontuais / não mensais (rateadas pelo nº de meses restantes)
    parto: number;
    enxoval: number;
    outrasDepesas: number;
}

export interface ConfiguracaoGravidico {
    rendaSupostoPai: number;
    percentualSugerido: number;
    despesas: DespesasGestacao;
    mesesRestantesGestacao: number;
    nasceuComVida?: boolean;
}

export interface ResultadoGravidico {
    // Despesas mensais diretas
    totalDespesasMensaisRecorrentes: number;
    // Despesas pontuais rateadas por mês
    totalDespesasPontuaisRateadas: number;
    // Total mensal efetivo (recorrentes + rateio das pontuais)
    totalDespesasMensais: number;
    quotaSupostoPai: number;          // 50% das despesas mensais efetivas
    valorBasePercentual: number;      // Renda × percentual
    valorMensalSugerido: number;      // min(base, despesas)
    valorTotalGestacao: number;       // × meses restantes
    conversaoPensao?: {
        status: string;
        valorBaseConvertido: number;
    };
    memoriaCalculo: string[];
}

export function calcularGravidicos(config: ConfiguracaoGravidico): ResultadoGravidico {
    const memoria: string[] = [];
    const meses = Math.max(config.mesesRestantesGestacao, 1);

    // ── Despesas recorrentes (mensais) ───────────────────────────────────────
    const recorrentes =
        config.despesas.planoSaude +
        config.despesas.medicamentos +
        config.despesas.consultas +
        config.despesas.exames +
        config.despesas.outrasDepesas;

    // ── Despesas pontuais rateadas ───────────────────────────────────────────
    const pontuaisTotal = config.despesas.parto + config.despesas.enxoval;
    const pontuaisRateadas = pontuaisTotal / meses;

    // ── Total mensal efetivo ─────────────────────────────────────────────────
    const totalDespesas = recorrentes + pontuaisRateadas;

    const quotaPai = totalDespesas / 2;
    const valorBasePercentual = config.rendaSupostoPai * config.percentualSugerido;

    // Regra da Lei 11.804/2008: valor limitado às necessidades comprovadas
    const valorMensal = Math.min(valorBasePercentual, quotaPai);
    const totalGestacao = valorMensal * meses;

    // ── Memória de cálculo ───────────────────────────────────────────────────
    memoria.push('── DESPESAS MENSAIS (recorrentes) ──');
    memoria.push(`  Plano de saúde: ${fmtBRL(config.despesas.planoSaude)}/mês`);
    memoria.push(`  Medicamentos: ${fmtBRL(config.despesas.medicamentos)}/mês`);
    memoria.push(`  Consultas médicas: ${fmtBRL(config.despesas.consultas)}/mês`);
    memoria.push(`  Exames / ultrassons: ${fmtBRL(config.despesas.exames)}/mês`);
    memoria.push(`  Subtotal recorrente: ${fmtBRL(recorrentes)}/mês`);

    memoria.push('── DESPESAS PONTUAIS (rateadas) ──');
    memoria.push(`  Parto / internação: ${fmtBRL(config.despesas.parto)} ÷ ${meses}m = ${fmtBRL(config.despesas.parto / meses)}/mês`);
    memoria.push(`  Enxoval / equipamentos: ${fmtBRL(config.despesas.enxoval)} ÷ ${meses}m = ${fmtBRL(config.despesas.enxoval / meses)}/mês`);
    memoria.push(`  Subtotal pontuais rateadas: ${fmtBRL(pontuaisRateadas)}/mês`);

    memoria.push('── RESUMO ──');
    memoria.push(`Total mensal efetivo (recorrentes + pontuais): ${fmtBRL(totalDespesas)}/mês`);
    memoria.push(`Quota do suposto pai (50%): ${fmtBRL(quotaPai)}`);
    memoria.push(`Valor por percentual (${fmtPct(config.percentualSugerido)} × ${fmtBRL(config.rendaSupostoPai)}): ${fmtBRL(valorBasePercentual)}`);
    memoria.push(`Valor mensal sugerido (mínimo entre quota e percentual): ${fmtBRL(valorMensal)}`);
    memoria.push(`Total estimado para os ${meses} meses restantes: ${fmtBRL(totalGestacao)}`);

    const resultado: ResultadoGravidico = {
        totalDespesasMensaisRecorrentes: +recorrentes.toFixed(2),
        totalDespesasPontuaisRateadas: +pontuaisRateadas.toFixed(2),
        totalDespesasMensais: +totalDespesas.toFixed(2),
        quotaSupostoPai: +quotaPai.toFixed(2),
        valorBasePercentual: +valorBasePercentual.toFixed(2),
        valorMensalSugerido: +valorMensal.toFixed(2),
        valorTotalGestacao: +totalGestacao.toFixed(2),
        memoriaCalculo: memoria,
    };

    // Art. 6º, §único — converte automaticamente após nascimento com vida
    if (config.nasceuComVida === true) {
        resultado.conversaoPensao = {
            status: 'Convertido automaticamente em pensão alimentícia (Art. 6º, §único, Lei 11.804/2008)',
            valorBaseConvertido: +valorMensal.toFixed(2),
        };
        memoria.push('⚠ Nascimento com vida confirmado: alimentos gravídicos convertidos em pensão alimentícia.');
    }

    return resultado;
}
