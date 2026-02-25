/**
 * unifiedEngine.ts
 * Orquestrador central da Family Legal Engine.
 * Roteia o cálculo para o módulo especializado correspondente.
 */

import { calcularPensao, type ConfiguracaoPensao, type ResultadoPensao } from './alimentosEngine';
import { calcularGravidicos, type ConfiguracaoGravidico, type ResultadoGravidico } from './gravidicosEngine';
import { calcularExecucao, type ConfiguracaoExecucao, type ResultadoExecucao } from './execucaoEngine';
import { calcularRevisional, type ConfiguracaoRevisional, type ResultadoRevisional } from './revisionalEngine';
import { calcularScoreJuridico, type FatoresScore, type ResultadoScore } from './scoreJuridicoEngine';
import { compararIndices, projetarFuturo, type ComparativoIndices } from './indiceEngine';

// Re-exports dos tipos para consumo externo
export type { ConfiguracaoPensao } from './alimentosEngine';
export type { ConfiguracaoGravidico } from './gravidicosEngine';
export type { ConfiguracaoExecucao } from './execucaoEngine';
export type { ConfiguracaoRevisional } from './revisionalEngine';
export type { FatoresScore } from './scoreJuridicoEngine';

export type TipoOperacao = 'pensao' | 'gravidico' | 'execucao' | 'revisional' | 'score' | 'completo';

export interface PayloadPensao extends ConfiguracaoPensao { tipo: 'pensao' }
export interface PayloadGravidico extends ConfiguracaoGravidico { tipo: 'gravidico' }
export interface PayloadExecucao extends ConfiguracaoExecucao { tipo: 'execucao' }
export interface PayloadRevisional extends ConfiguracaoRevisional { tipo: 'revisional' }
export interface PayloadScore {
    tipo: 'score';
    fatores: FatoresScore;
    rendaAlimentante: number;
    despesasAlimentando: number;
}
export interface PayloadCompleto {
    tipo: 'completo';
    pensao?: ConfiguracaoPensao;
    gravidico?: ConfiguracaoGravidico;
    execucao?: ConfiguracaoExecucao;
    revisional?: ConfiguracaoRevisional;
    score?: { fatores: FatoresScore; rendaAlimentante: number; despesasAlimentando: number };
}

export type FamilyPayload =
    | PayloadPensao
    | PayloadGravidico
    | PayloadExecucao
    | PayloadRevisional
    | PayloadScore
    | PayloadCompleto;

/** Resposta padronizada — todos os campos opcionais conforme tipo */
export interface FamilyResult {
    tipo: TipoOperacao;
    timestamp: string;
    pensao?: ResultadoPensao;
    gravidico?: ResultadoGravidico;
    execucao?: ResultadoExecucao;
    revisional?: ResultadoRevisional;
    score?: ResultadoScore;
    comparativoIndices?: ComparativoIndices;
    projecaoFutura?: { mes: number; valorProjetado: number }[];
    memoriaGlobal: string[];
}

export class FamilyEngine {
    static execute(payload: FamilyPayload): FamilyResult {
        const timestamp = new Date().toISOString();
        const memoria: string[] = [];

        switch (payload.tipo) {
            case 'pensao': {
                const { tipo, ...config } = payload;
                const r = calcularPensao(config);
                const projecao = projetarFuturo(r.valorMensalCalculado, 12);
                return {
                    tipo: 'pensao',
                    timestamp,
                    pensao: r,
                    projecaoFutura: projecao,
                    memoriaGlobal: r.memoriaCalculo,
                };
            }

            case 'gravidico': {
                const { tipo, ...config } = payload;
                const r = calcularGravidicos(config);
                return {
                    tipo: 'gravidico',
                    timestamp,
                    gravidico: r,
                    memoriaGlobal: r.memoriaCalculo,
                };
            }

            case 'execucao': {
                const { tipo, ...config } = payload;
                const r = calcularExecucao(config);
                const comparativo = compararIndices(
                    config.valorMensal,
                    config.dataInicioInadimplencia,
                    config.dataCalculo
                );
                return {
                    tipo: 'execucao',
                    timestamp,
                    execucao: r,
                    comparativoIndices: comparativo,
                    memoriaGlobal: r.memoriaCalculo,
                };
            }

            case 'revisional': {
                const { tipo, ...config } = payload;
                const r = calcularRevisional(config);
                return {
                    tipo: 'revisional',
                    timestamp,
                    revisional: r,
                    memoriaGlobal: r.memoriaCalculo,
                };
            }

            case 'score': {
                const r = calcularScoreJuridico(
                    payload.fatores,
                    payload.rendaAlimentante,
                    payload.despesasAlimentando
                );
                return {
                    tipo: 'score',
                    timestamp,
                    score: r,
                    memoriaGlobal: [`Score: ${r.score}/100 — ${r.nivel}`],
                };
            }

            case 'completo': {
                const result: FamilyResult = {
                    tipo: 'completo',
                    timestamp,
                    memoriaGlobal: memoria,
                };

                if (payload.pensao) {
                    result.pensao = calcularPensao(payload.pensao);
                    memoria.push(...result.pensao.memoriaCalculo);
                }
                if (payload.gravidico) {
                    result.gravidico = calcularGravidicos(payload.gravidico);
                    memoria.push(...result.gravidico.memoriaCalculo);
                }
                if (payload.execucao) {
                    result.execucao = calcularExecucao(payload.execucao);
                    memoria.push(...result.execucao.memoriaCalculo);
                }
                if (payload.revisional) {
                    result.revisional = calcularRevisional(payload.revisional);
                    memoria.push(...result.revisional.memoriaCalculo);
                }
                if (payload.score) {
                    result.score = calcularScoreJuridico(
                        payload.score.fatores,
                        payload.score.rendaAlimentante,
                        payload.score.despesasAlimentando
                    );
                    memoria.push(`Score jurídico: ${result.score.score}/100 — ${result.score.nivel}`);
                }

                return result;
            }

            default:
                throw new Error(`Tipo de operação inválido`);
        }
    }
}
