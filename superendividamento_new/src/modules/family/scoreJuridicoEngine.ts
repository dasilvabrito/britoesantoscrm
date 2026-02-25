/**
 * scoreJuridicoEngine.ts
 * Score jurídico preventivo para alimentos.
 * Avalia a solidez da pretensão antes do ajuizamento.
 */

export interface FatoresScore {
    rendaFormalComprovada: boolean;
    rendaInformal: boolean;
    provaDocumentalDespesas: boolean;
    novaFamilia: boolean;
    historicoInadimplencia: boolean;
    alteracaoRecenteRenda: boolean;
    temAdvogado: boolean;
    acordoExtrajudicial: boolean;
    mediacao: boolean;
}

export interface ResultadoScore {
    score: number;         // 0–100
    nivel: 'BAIXO' | 'MEDIO' | 'ALTO';
    descricao: string;
    recomendacao: string;
    detalhes: { fator: string; impacto: number; positivo: boolean }[];
    // Índices derivados
    indiceCapacidadeContributiva: number;  // 0–1
    indiceNecessidadeAlimentando: number;  // 0–1
    percentualRecomendado: string;
}

const FATORES_PESO: { key: keyof FatoresScore; label: string; peso: number; positivo: boolean }[] = [
    { key: 'rendaFormalComprovada', label: 'Renda formal comprovada (holerite/IR)', peso: 20, positivo: true },
    { key: 'provaDocumentalDespesas', label: 'Prova documental das despesas do alimentando', peso: 25, positivo: true },
    { key: 'historicoInadimplencia', label: 'Histórico de inadimplência do alimentante', peso: 20, positivo: true },
    { key: 'alteracaoRecenteRenda', label: 'Alteração recente na renda do alimentante', peso: 15, positivo: true },
    { key: 'temAdvogado', label: 'Assistência jurídica especializada', peso: 10, positivo: true },
    { key: 'mediacao', label: 'Tentativa de mediação ou conciliação prévia', peso: 5, positivo: true },
    { key: 'acordoExtrajudicial', label: 'Proposta de acordo extrajudicial frustrada', peso: 5, positivo: true },
    { key: 'rendaInformal', label: 'Renda informal / difícil comprovação', peso: -10, positivo: false },
    { key: 'novaFamilia', label: 'Nova família constituída (reduz possibilidade)', peso: -15, positivo: false },
];

export function calcularScoreJuridico(
    fatores: FatoresScore,
    rendaAlimentante: number,
    despesasAlimentando: number
): ResultadoScore {
    let score = 0;
    const detalhes: ResultadoScore['detalhes'] = [];

    for (const f of FATORES_PESO) {
        if (fatores[f.key]) {
            score += f.peso;
            detalhes.push({ fator: f.label, impacto: f.peso, positivo: f.positivo });
        }
    }

    score = Math.max(0, Math.min(100, score));

    const nivel: ResultadoScore['nivel'] =
        score >= 71 ? 'ALTO' : score >= 31 ? 'MEDIO' : 'BAIXO';

    const descricao = {
        ALTO: 'Alta solidez jurídica — pretensão bem fundamentada',
        MEDIO: 'Solidez moderada — possibilidade de êxito com boa instrução processual',
        BAIXO: 'Baixa solidez — risco significativo de dificuldades processuais',
    }[nivel];

    const recomendacao = {
        ALTO: 'Prosseguir com ação judicial ou acordo extrajudicial em posição de força.',
        MEDIO: 'Reforçar prova documental antes do ajuizamento. Considerar mediação.',
        BAIXO: 'Buscar maior compilação de provas. Avaliar alternativas extrajudiciais.',
    }[nivel];

    // Índices derivados
    const indiceCapacidade = rendaAlimentante > 0
        ? Math.min(1, (rendaAlimentante - despesasAlimentando * 0.3) / rendaAlimentante)
        : 0;

    const indiceNecessidade = rendaAlimentante > 0
        ? Math.min(1, despesasAlimentando / rendaAlimentante)
        : 1;

    // Percentual recomendado com base nos índices
    const basePerc = (indiceNecessidade * 0.4 + (1 - indiceCapacidade) * 0.1) * 100;
    const percRecomendado = Math.min(40, Math.max(10, Math.round(basePerc / 5) * 5));

    return {
        score,
        nivel,
        descricao,
        recomendacao,
        detalhes,
        indiceCapacidadeContributiva: +indiceCapacidade.toFixed(2),
        indiceNecessidadeAlimentando: +indiceNecessidade.toFixed(2),
        percentualRecomendado: `${percRecomendado}%`,
    };
}
