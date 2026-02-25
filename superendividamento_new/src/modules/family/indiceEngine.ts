/**
 * indiceEngine.ts
 * Motor de múltiplos índices de correção monetária.
 * Suporta INPC, IPCA, Salário Mínimo e índice personalizado.
 */

export type TipoIndice = 'INPC' | 'IPCA' | 'SALARIO_MINIMO' | 'PERSONALIZADO';

/** Tabela mensal de índices — chave: "YYYY-MM" */
export type TabelaIndices = Record<string, { INPC?: number; IPCA?: number;[key: string]: number | undefined }>;

/** Tabela anual de salário mínimo — chave: "YYYY" */
export type TabelaSalarioMinimo = Record<string, number>;

/** Dados históricos embutidos (base 2024–2025).
 *  Em produção, isso pode ser carregado de uma API ou banco de dados.
 */
export const INDICES_HISTORICOS: TabelaIndices = {
    '2024-01': { INPC: 0.0042, IPCA: 0.0042 },
    '2024-02': { INPC: 0.0083, IPCA: 0.0083 },
    '2024-03': { INPC: 0.0177, IPCA: 0.0183 },
    '2024-04': { INPC: 0.0038, IPCA: 0.0038 },
    '2024-05': { INPC: 0.0046, IPCA: 0.0044 },
    '2024-06': { INPC: 0.0056, IPCA: 0.0050 },
    '2024-07': { INPC: 0.0049, IPCA: 0.0038 },
    '2024-08': { INPC: 0.0044, IPCA: 0.0044 },
    '2024-09': { INPC: 0.0043, IPCA: 0.0044 },
    '2024-10': { INPC: 0.0056, IPCA: 0.0056 },
    '2024-11': { INPC: 0.0039, IPCA: 0.0039 },
    '2024-12': { INPC: 0.0052, IPCA: 0.0052 },
    '2025-01': { INPC: 0.0059, IPCA: 0.0016 },
    '2025-02': { INPC: 0.0050, IPCA: 0.0013 },
};

export const SALARIO_MINIMO_HISTORICO: TabelaSalarioMinimo = {
    '2020': 1045,
    '2021': 1100,
    '2022': 1212,
    '2023': 1320,
    '2024': 1412,
    '2025': 1518,
};

export interface ResultadoIndice {
    indiceAcumulado: number;
    fatorCorrecao: number;
    percentualTotal: string;
    detalhes: { competencia: string; taxa: number; fatorParcial: number }[];
}

export interface ComparativoIndices {
    INPC: number;
    IPCA: number;
    SALARIO_MINIMO: number;
}

/** Calcula o índice acumulado entre duas datas no formato "YYYY-MM-DD" */
export function calcularIndiceAcumulado(
    dataInicio: string,
    dataFim: string,
    tipoIndice: TipoIndice,
    tabelaCustom?: TabelaIndices
): ResultadoIndice {
    const tabela = tabelaCustom ?? INDICES_HISTORICOS;
    const inicio = new Date(dataInicio + 'T12:00:00');
    const fim = new Date(dataFim + 'T12:00:00');

    let fator = 1;
    const detalhes: ResultadoIndice['detalhes'] = [];
    const cur = new Date(inicio);

    while (cur <= fim) {
        const chave = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const taxa = tabela[chave]?.[tipoIndice] ?? 0;
        const fatorParcial = 1 + taxa;
        fator *= fatorParcial;
        detalhes.push({ competencia: chave, taxa, fatorParcial });
        cur.setMonth(cur.getMonth() + 1);
    }

    const acumulado = fator - 1;
    return {
        indiceAcumulado: acumulado,
        fatorCorrecao: fator,
        percentualTotal: (acumulado * 100).toFixed(4) + '%',
        detalhes,
    };
}

/** Atualiza um valor conforme índice acumulado */
export function atualizarValor(valorOriginal: number, resultado: ResultadoIndice): number {
    return valorOriginal * resultado.fatorCorrecao;
}

/** Compara o mesmo valor corrigido por diferentes índices */
export function compararIndices(
    valorBase: number,
    dataInicio: string,
    dataFim: string
): ComparativoIndices {
    const calcular = (tipo: TipoIndice) => {
        const res = calcularIndiceAcumulado(dataInicio, dataFim, tipo);
        return atualizarValor(valorBase, res);
    };

    // Salário mínimo: fator = SM_atual / SM_base
    const anoInicio = dataInicio.substring(0, 4);
    const anoFim = dataFim.substring(0, 4);
    const smBase = SALARIO_MINIMO_HISTORICO[anoInicio] ?? 1412;
    const smAtual = SALARIO_MINIMO_HISTORICO[anoFim] ?? 1518;
    const smCorrigido = valorBase * (smAtual / smBase);

    return {
        INPC: calcular('INPC'),
        IPCA: calcular('IPCA'),
        SALARIO_MINIMO: smCorrigido,
    };
}

/** Projeta o valor para os próximos N meses com taxa média */
export function projetarFuturo(
    valorAtual: number,
    meses: number,
    taxaMediaMensal: number = 0.005
): { mes: number; valorProjetado: number }[] {
    return Array.from({ length: meses }, (_, i) => ({
        mes: i + 1,
        valorProjetado: +(valorAtual * Math.pow(1 + taxaMediaMensal, i + 1)).toFixed(2),
    }));
}
