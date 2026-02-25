/**
 * revisionalEngine.ts
 * Simulador revisional avançado de pensão alimentícia.
 * Base legal: CC, Art. 1.699 — possibilidade de revisão quando houver mudança na situação financeira.
 */

import { fmtBRL, fmtPct } from './formatBR';

export interface ConfiguracaoRevisional {
    // Situação atual
    rendaAtual: number;
    rendaAnterior: number;
    percentualAtual: number;  // ex: 0.30
    numeroFilhosAtual: number;
    // Fatores modificadores
    novaFamilia: boolean;
    filhosNovaFamilia: number;
    perdaEmprego: boolean;
    novoEmprego: boolean;
    maioria: boolean;        // Alimentando atingiu 18 anos?
    mudancaEscola: boolean;  // Escola pública → particular (necessidade maior)
    // Despesas do alimentando
    despesasMensaisAlimentando: number;
    // Contexto
    tempoObrigacao: number;  // meses
}

export interface ResultadoRevisional {
    // Índices
    variacaoRenda: number;          // Percentual de variação (+/-) 
    indiceNecessidade: number;      // Despesas / Renda alimentante
    indiceCapacidade: number;       // Disponível após pensão / Total
    // Score probabilístico
    scoreProbabilidade: number;     // 0–100
    classificacao: 'BAIXA' | 'MEDIA' | 'ALTA';
    probabilidadeTexto: string;
    // Sugestão
    percentualSugerido: number;
    valorMensalAtual: number;
    valorMensalSugerido: number;
    diferencaMensal: number;
    impactoAnualDiferenca: number;
    // Fatores de risco
    fatoresPositivos: string[];
    fatoresNegativos: string[];
    riscoImprocedencia: 'BAIXO' | 'MODERADO' | 'ALTO';
    memoriaCalculo: string[];
}

export function calcularRevisional(config: ConfiguracaoRevisional): ResultadoRevisional {
    const memoria: string[] = [];
    const positivos: string[] = [];
    const negativos: string[] = [];

    // ── Variação de renda ──────────────────────────────────────────────────
    const variacaoRenda = config.rendaAnterior > 0
        ? (config.rendaAtual - config.rendaAnterior) / config.rendaAnterior
        : 0;

    const indiceNecessidade = config.rendaAtual > 0
        ? config.despesasMensaisAlimentando / config.rendaAtual
        : 1;

    const valorAtual = config.rendaAtual * config.percentualAtual;
    const indiceCapacidade = config.rendaAtual > 0
        ? (config.rendaAtual - valorAtual) / config.rendaAtual
        : 0;

    memoria.push(`Variação de renda: ${fmtPct(variacaoRenda)}`);
    memoria.push(`Índice de necessidade: ${fmtPct(indiceNecessidade)}`);


    // ── Score probabilístico ───────────────────────────────────────────────
    let score = 0;

    if (variacaoRenda > 0.30) {
        score += 30;
        positivos.push('Aumento de renda superior a 30% (forte fundamento para majoração)');
    } else if (variacaoRenda > 0.15) {
        score += 15;
        positivos.push('Aumento de renda entre 15% e 30% (fundamento moderado para majoração)');
    }

    if (variacaoRenda < -0.30) {
        score += 25;
        positivos.push('Perda de renda superior a 30% (forte fundamento para redução)');
    } else if (variacaoRenda < -0.15) {
        score += 12;
        positivos.push('Perda de renda entre 15% e 30% (fundamento moderado para redução)');
    }

    if (indiceNecessidade > 0.40) {
        score += 20;
        positivos.push('Despesas do alimentando superam 40% da renda do alimentante');
    } else if (indiceNecessidade > 0.25) {
        score += 10;
        positivos.push('Despesas do alimentando entre 25%-40% da renda — necessidade comprovável');
    }

    if (config.perdaEmprego) {
        score += 20;
        positivos.push('Desemprego do alimentante — fundamento para redução');
    }

    if (config.mudancaEscola) {
        score += 15;
        positivos.push('Mudança para escola particular — aumento de necessidade comprovável');
    }

    if (config.maioria) {
        score -= 20;
        negativos.push('Alimentando atingiu maioridade — extinção automática possível (Súmula 358 STJ)');
    }

    if (config.novaFamilia) {
        score -= 10;
        negativos.push('Nova família constituída — fator de redução (possibilidade diminuída)');
    }

    if (config.filhosNovaFamilia > 0) {
        score -= 5 * config.filhosNovaFamilia;
        negativos.push(`Filhos da nova família (${config.filhosNovaFamilia}) — redução de capacidade contributiva`);
    }

    score = Math.max(0, Math.min(100, score));

    const classificacao: ResultadoRevisional['classificacao'] =
        score >= 51 ? 'ALTA' : score >= 21 ? 'MEDIA' : 'BAIXA';

    const probabilidadeTexto = {
        ALTA: 'Alta probabilidade de êxito (>= 51 pts) — ação revisional recomendada',
        MEDIA: 'Probabilidade média (21–50 pts) — avaliar custos x benefícios',
        BAIXA: 'Baixa probabilidade (< 21 pts) — risco de improcedência elevado',
    }[classificacao];

    // ── Sugestão de percentual ─────────────────────────────────────────────
    let percentualSugerido = config.percentualAtual;
    if (variacaoRenda > 0.30) percentualSugerido = Math.min(0.40, config.percentualAtual + 0.05);
    else if (variacaoRenda < -0.30 || config.perdaEmprego) percentualSugerido = Math.max(0.10, config.percentualAtual - 0.05);

    const valorSugerido = config.rendaAtual * percentualSugerido;
    const diferenca = valorSugerido - valorAtual;

    const riscoImprocedencia: ResultadoRevisional['riscoImprocedencia'] =
        score < 20 ? 'ALTO' : score < 50 ? 'MODERADO' : 'BAIXO';

    memoria.push(`Score probabilístico: ${score}/100 — ${classificacao}`);
    memoria.push(`Percentual atual: ${fmtPct(config.percentualAtual)} → Sugerido: ${fmtPct(percentualSugerido)}`);
    memoria.push(`Valor atual: ${fmtBRL(valorAtual)} → Valor sugerido: ${fmtBRL(valorSugerido)}`);
    memoria.push(`Diferença mensal: ${fmtBRL(diferenca)} | Impacto anual: ${fmtBRL(diferenca * 12)}`);

    return {
        variacaoRenda,
        indiceNecessidade,
        indiceCapacidade,
        scoreProbabilidade: score,
        classificacao,
        probabilidadeTexto,
        percentualSugerido,
        valorMensalAtual: +valorAtual.toFixed(2),
        valorMensalSugerido: +valorSugerido.toFixed(2),
        diferencaMensal: +diferenca.toFixed(2),
        impactoAnualDiferenca: +(diferenca * 12).toFixed(2),
        fatoresPositivos: positivos,
        fatoresNegativos: negativos,
        riscoImprocedencia,
        memoriaCalculo: memoria,
    };
}
