/**
 * RiscoTrabalhistaEngine — Score de risco trabalhista ponderado.
 * Gera score 0–100 com base em irregularidades reportadas na ficha de atendimento.
 */

export interface IrregularidadesInput {
    // Irregularidades de jornada e remuneração
    horasExtrasNaoPagas: boolean;
    intervaloCurtado: boolean;         // intervalo intrajornada inferior a 1h
    adicionalNoturnoNaoPago: boolean;
    insalubridadeNaoPaga: boolean;
    desvioFuncao: boolean;

    // Irregularidades de rescisão/contrato
    fgtsIrregular: boolean;            // não depositado ou com atraso
    feriasFoaDoPrazo: boolean;         // férias concedidas fora do prazo legal
    salarioPorFora: boolean;           // pagamento informal (não consta na CTPS)

    // Danos pessoais
    assedioMoral: boolean;
    acidenteTrabalho: boolean;

    // Contexto agravante
    possuiProvas: boolean;             // documentos disponíveis
    empregadorReincidente: boolean;    // já teve ações trabalhistas
}

export interface ScoreRisco {
    total: number;            // 0–100
    nivel: 'BAIXO' | 'MÉDIO' | 'ALTO';
    cor: string;              // classe CSS
    badge: string;
    observacao: string;
    irregularidadesAtivas: string[];
    estimativaValorCausa: string;
}

const PESOS: Record<keyof IrregularidadesInput, number> = {
    fgtsIrregular: 18,
    horasExtrasNaoPagas: 18,
    feriasFoaDoPrazo: 14,
    assedioMoral: 14,
    intervaloCurtado: 10,
    desvioFuncao: 10,
    salarioPorFora: 10,
    acidenteTrabalho: 10,
    adicionalNoturnoNaoPago: 6,
    insalubridadeNaoPaga: 6,
    possuiProvas: 0,   // multiplicador, não peso direto
    empregadorReincidente: 0,   // multiplicador
};

const LABELS: Record<keyof IrregularidadesInput, string> = {
    horasExtrasNaoPagas: 'Horas extras não pagas',
    intervaloCurtado: 'Intervalo intrajornada curtado',
    adicionalNoturnoNaoPago: 'Adicional noturno não pago',
    insalubridadeNaoPaga: 'Insalubridade/periculosidade não paga',
    desvioFuncao: 'Desvio ou acúmulo de função',
    fgtsIrregular: 'FGTS não depositado/irregular',
    feriasFoaDoPrazo: 'Férias concedidas fora do prazo',
    salarioPorFora: 'Salário pago por fora (informal)',
    assedioMoral: 'Assédio moral',
    acidenteTrabalho: 'Acidente de trabalho',
    possuiProvas: 'Possui provas documentais',
    empregadorReincidente: 'Empregador com histórico de ações',
};

export class RiscoTrabalhistaEngine {

    static calcular(
        irregularidades: IrregularidadesInput,
        salarioBase: number,
        mesesTrabalhados: number
    ): ScoreRisco {
        let pontos = 0;
        const ativas: string[] = [];

        for (const [key, peso] of Object.entries(PESOS) as [keyof IrregularidadesInput, number][]) {
            if (peso > 0 && irregularidades[key]) {
                pontos += peso;
                ativas.push(LABELS[key]);
            }
        }

        // Multiplicadores: provas aumentam o score (causa mais viável)
        if (irregularidades.possuiProvas && pontos > 0) pontos = Math.min(100, pontos * 1.15);
        if (irregularidades.empregadorReincidente && pontos > 0) pontos = Math.min(100, pontos * 1.10);

        const total = Math.min(100, Math.round(pontos));

        let nivel: 'BAIXO' | 'MÉDIO' | 'ALTO';
        let cor: string;
        let badge: string;
        let observacao: string;

        if (total <= 30) {
            nivel = 'BAIXO';
            cor = 'text-emerald-600';
            badge = 'Baixo Potencial';
            observacao = 'Irregularidades pontuais. Possível acordo extrajudicial favorável antes do ajuizamento.';
        } else if (total <= 70) {
            nivel = 'MÉDIO';
            cor = 'text-amber-600';
            badge = 'Médio Potencial';
            observacao = 'Irregularidades relevantes identificadas. Recomenda-se análise documental aprofundada antes do ajuizamento.';
        } else {
            nivel = 'ALTO';
            cor = 'text-red-600';
            badge = 'Alto Potencial';
            observacao = 'Múltiplas irregularidades graves detectadas. Forte indicativo de passivo trabalhista expressivo.';
        }

        // Estimativa de valor da causa (heurística baseada em meses e score)
        const fatorScore = total / 100;
        const estimativa = salarioBase * mesesTrabalhados * fatorScore * 0.5;
        const estimativaValorCausa = estimativa.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });

        return { total, nivel, cor, badge, observacao, irregularidadesAtivas: ativas, estimativaValorCausa };
    }
}
