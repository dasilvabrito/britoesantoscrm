'use server';

import db from '@/lib/db';
import { FamilyEngine } from '@/modules/family/unifiedEngine';
import type {
    ConfiguracaoPensao,
    ConfiguracaoGravidico,
    ConfiguracaoExecucao,
    ConfiguracaoRevisional,
    FatoresScore,
} from '@/modules/family/unifiedEngine';

// Re-exports para o frontend
export { type ConfiguracaoPensao, type ConfiguracaoGravidico, type ConfiguracaoExecucao, type ConfiguracaoRevisional };

// ── PENSÃO ALIMENTÍCIA ──────────────────────────────────────────────────────
export async function calcularPensaoAction(config: ConfiguracaoPensao) {
    const result = FamilyEngine.execute({ tipo: 'pensao', ...config });
    try {
        const saved = await (db as any).simulation.create({
            data: {
                tenantId: 1,
                type: 'FAMILY_PENSAO',
                inputData: config as any,
                resultData: result as any,
            },
        });
        return { ...result, id: saved.id };
    } catch (e) {
        console.error('Erro ao salvar pensão:', e);
        return result;
    }
}

// ── ALIMENTOS GRAVÍDICOS ───────────────────────────────────────────────────
export async function calcularGravidiosAction(config: ConfiguracaoGravidico) {
    const result = FamilyEngine.execute({ tipo: 'gravidico', ...config });
    try {
        const saved = await (db as any).simulation.create({
            data: {
                tenantId: 1,
                type: 'FAMILY_GRAVIDICO',
                inputData: config as any,
                resultData: result as any,
            },
        });
        return { ...result, id: saved.id };
    } catch (e) {
        console.error('Erro ao salvar gravídicos:', e);
        return result;
    }
}

// ── EXECUÇÃO DE ALIMENTOS ──────────────────────────────────────────────────
export async function calcularExecucaoAction(config: ConfiguracaoExecucao) {
    const result = FamilyEngine.execute({ tipo: 'execucao', ...config });
    try {
        const saved = await (db as any).simulation.create({
            data: {
                tenantId: 1,
                type: 'FAMILY_EXECUCAO',
                inputData: config as any,
                resultData: result as any,
            },
        });
        return { ...result, id: saved.id };
    } catch (e) {
        console.error('Erro ao salvar execução:', e);
        return result;
    }
}

// ── REVISIONAL ─────────────────────────────────────────────────────────────
export async function calcularRevisionalAction(config: ConfiguracaoRevisional) {
    const result = FamilyEngine.execute({ tipo: 'revisional', ...config });
    try {
        const saved = await (db as any).simulation.create({
            data: {
                tenantId: 1,
                type: 'FAMILY_REVISIONAL',
                inputData: config as any,
                resultData: result as any,
            },
        });
        return { ...result, id: saved.id };
    } catch (e) {
        console.error('Erro ao salvar revisional:', e);
        return result;
    }
}

// ── SCORE JURÍDICO ─────────────────────────────────────────────────────────
export async function calcularScoreAction(
    fatores: FatoresScore,
    rendaAlimentante: number,
    despesasAlimentando: number
) {
    const result = FamilyEngine.execute({
        tipo: 'score',
        fatores,
        rendaAlimentante,
        despesasAlimentando,
    });
    return result;
}

// ── HISTÓRICO ──────────────────────────────────────────────────────────────
export async function listFamilySimulations(tipo?: string) {
    try {
        return await (db as any).simulation.findMany({
            where: {
                type: tipo ? tipo : { startsWith: 'FAMILY_' },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true, type: true, createdAt: true, inputData: true, resultData: true },
        });
    } catch (e) {
        console.error('Erro ao listar simulações família:', e);
        return [];
    }
}

export async function deleteFamilySimulation(id: number) {
    try {
        await (db as any).simulation.delete({ where: { id } });
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}
