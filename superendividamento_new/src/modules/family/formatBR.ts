/**
 * formatBR.ts
 * Utilitários de formatação numérica no padrão pt-BR.
 */

/** Formata um número como moeda em Real Brasileiro: R$ 1.500,00 */
export const fmtBRL = (v: number): string =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata um percentual (0–1) como string: "30,5%" */
export const fmtPct = (v: number, decimals = 1): string =>
    (v * 100).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }) + '%';

/** Formata um número simples com separadores pt-BR: "1.200,50" */
export const fmtNum = (v: number, decimals = 2): string =>
    v.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
