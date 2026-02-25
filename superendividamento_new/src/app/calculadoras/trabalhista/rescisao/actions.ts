'use server';

import { RescisaoEngine, type TipoRescisao } from '@/modules/labor/RescisaoEngine';
import { RiscoTrabalhistaEngine, type IrregularidadesInput } from '@/modules/labor/RiscoTrabalhistaEngine';
import db from "@/lib/db";


function getFlag(formData: FormData, key: string): boolean {
    return formData.get(key) === 'on' || formData.get(key) === 'true';
}

export async function calculateLaborAction(formData: FormData, simulationId?: number) {
    // ── Dados contratuais ────────────────────────────────────────────────────
    const tipoRescisao = (formData.get('tipoRescisao') as TipoRescisao) || 'SEM_JUSTA_CAUSA';
    const salarioBase = parseFloat(formData.get('salarioBase') as string) || 0;
    const dataAdmissao = formData.get('dataAdmissao') as string;
    const dataDemissao = formData.get('dataDemissao') as string;
    const diasTrabalhosNoMes = parseInt(formData.get('diasTrabalhosNoMes') as string) || 30;

    // ── Férias ────────────────────────────────────────────────────────────────
    const mesesFeriasVencidas = parseInt(formData.get('mesesFeriasVencidas') as string) || 0;
    const mesesFeriasProporcionais = parseInt(formData.get('mesesFeriasProporcionais') as string) || 0;

    // ── FGTS ──────────────────────────────────────────────────────────────────
    const saldoFGTS = parseFloat(formData.get('saldoFGTS') as string) || 0;

    // ── Variáveis (médias 12 meses) ──────────────────────────────────────────
    const mediaHorasExtras = parseFloat(formData.get('mediaHorasExtras') as string) || 0;
    const mediaAdicionalNoturno = parseFloat(formData.get('mediaAdicionalNoturno') as string) || 0;
    const mediaComissoes = parseFloat(formData.get('mediaComissoes') as string) || 0;

    // ── Deduções ──────────────────────────────────────────────────────────────
    const numeroDependentes = parseInt(formData.get('numeroDependentes') as string) || 0;
    const avisoTrabalhado = getFlag(formData, 'avisoTrabalhado');

    // ── Ficha de atendimento — cliente ───────────────────────────────────────
    const nomeCliente = formData.get('nomeCliente') as string || '';
    const cpfCliente = formData.get('cpfCliente') as string || '';
    const nomeEmpresa = formData.get('nomeEmpresa') as string || '';
    const cargoRegistrado = formData.get('cargoRegistrado') as string || '';
    const funcaoReal = formData.get('funcaoReal') as string || '';
    const relatoLivre = formData.get('relatoLivre') as string || '';

    // ── Irregularidades ───────────────────────────────────────────────────────
    const irregularidades: IrregularidadesInput = {
        horasExtrasNaoPagas: getFlag(formData, 'irr_horasExtras'),
        intervaloCurtado: getFlag(formData, 'irr_intervalo'),
        adicionalNoturnoNaoPago: getFlag(formData, 'irr_adicionalNoturno'),
        insalubridadeNaoPaga: getFlag(formData, 'irr_insalubridade'),
        desvioFuncao: getFlag(formData, 'irr_desvioFuncao'),
        fgtsIrregular: getFlag(formData, 'irr_fgts'),
        feriasFoaDoPrazo: getFlag(formData, 'irr_ferias'),
        salarioPorFora: getFlag(formData, 'irr_salarioPorFora'),
        assedioMoral: getFlag(formData, 'irr_assedio'),
        acidenteTrabalho: getFlag(formData, 'irr_acidente'),
        possuiProvas: getFlag(formData, 'irr_possuiProvas'),
        empregadorReincidente: getFlag(formData, 'irr_reincidente'),
    };

    const minutosExtrasCard = parseInt(formData.get('minutosExtrasCard') as string) || 0;

    // ── Cálculo das verbas ────────────────────────────────────────────────────
    const rescisao = RescisaoEngine.calcular({
        salarioBase,
        tipoRescisao,
        dataAdmissao,
        dataDemissao,
        diasTrabalhosNoMes,
        mesesFeriasVencidas,
        saldoFGTS,
        mediaHorasExtras,
        mediaAdicionalNoturno,
        mediaComissoes,
        numeroDependentes,
        avisoTrabalhado,
        minutosExtrasCard,
        irregularidadeHorasExtras: irregularidades.horasExtrasNaoPagas,
    });

    // ── Score de risco ────────────────────────────────────────────────────────
    const mesesTrabalhados = rescisao.mesesCompletos;
    const risco = RiscoTrabalhistaEngine.calcular(irregularidades, salarioBase, mesesTrabalhados);

    const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const result = {
        // Contexto da simulação
        nomeCliente,
        cpfCliente,
        nomeEmpresa,
        cargoRegistrado,
        funcaoReal,
        tipoRescisao,
        dataAdmissao,
        dataDemissao,
        relatoLivre,
        numeroDependentes,
        avisoTrabalhado,
        salarioBase,

        // Dados calculados
        anosCompletos: rescisao.anosCompletos,
        mesesCompletos: rescisao.mesesCompletos,
        diasAvisoPrevio: rescisao.diasAvisoPrevio,
        mediaVariaveisTotal: fmt(rescisao.mediaVariaveisTotal),

        // Verbas brutas
        saldoSalario: fmt(rescisao.saldoSalario),
        avisoPrevio: fmt(rescisao.avisoPrevio),
        feriasVencidas: fmt(rescisao.feriasVencidas),
        feriasVencidasTercoProporcional: fmt(rescisao.feriasVencidasTercoProporcional),
        feriasProporcionais: fmt(rescisao.feriasProporcionais),
        decimoTerceiro: fmt(rescisao.decimoTerceiro),
        valorHECard: fmt(rescisao.valorHECard),
        reflexoVariaveisFeriasVencidas: fmt(rescisao.reflexoVariaveisFeriasVencidas),
        reflexoVariaveisFeriasProporcionais: fmt(rescisao.reflexoVariaveisFeriasProporcionais),
        reflexoVariaveisDecimo: fmt(rescisao.reflexoVariaveisDecimo),
        multaFGTS: fmt(rescisao.multaFGTS),

        // Deduções (Atualmente zeradas conforme solicitado)
        inss: fmt(rescisao.inss),
        irrf: fmt(rescisao.irrf),

        // Totais
        totalBruto: fmt(rescisao.totalBruto),
        totalDeducoes: fmt(rescisao.totalDeducoes),
        totalLiquido: fmt(rescisao.totalLiquido),

        // Informativo
        liberacaoFGTS: rescisao.liberacaoFGTS,
        seguroDesemprego: rescisao.seguroDesemprego,
        direitos: rescisao.direitos,
        alerta: rescisao.alerta,

        // Score trabalhista
        risco,
    };

    // ── Persistência Automática ─────────────────────────────────────────────
    try {
        const inputData = Object.fromEntries(formData.entries());
        if (simulationId) {
            await (db as any).simulation.update({
                where: { id: simulationId },
                data: {
                    inputData: inputData as any,
                    resultData: result as any,
                }
            });
        } else {
            const saved = await (db as any).simulation.create({
                data: {
                    tenantId: 1, // Default para este ambiente
                    type: 'LABOR_RESCISAO',
                    inputData: inputData as any,
                    resultData: result as any,
                }
            });
            (result as any).id = saved.id;
        }
    } catch (e) {
        console.error("Erro ao persistir cálculo:", e);
    }

    return result;
}

export async function listSimulations() {
    try {
        return await (db as any).simulation.findMany({
            where: { type: 'LABOR_RESCISAO' },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                createdAt: true,
                nomeCliente: true,
                inputData: true,
                resultData: true,
            }
        });
    } catch (error) {
        console.error("Erro ao listar simulações:", error);
        return [];
    }
}

export async function deleteSimulation(id: number) {
    try {
        await (db as any).simulation.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("Erro ao excluir simulação:", error);
        return { success: false };
    }
}

export async function getSimulation(id: number) {
    try {
        return await (db as any).simulation.findUnique({ where: { id } });
    } catch (error) {
        console.error("Erro ao recuperar simulação:", error);
        return null;
    }
}

/**
 * Persiste os dados do Cartão de Ponto no modelo Simulation.
 * Cada alteração no frontend dispara esta action via debounce.
 */
export async function upsertCartaoPonto(data: {
    simulationId?: number;
    clienteId?: number;
    tenantId: number;
    linhas: any;
    mes: number;
    ano: number;
}) {
    try {
        if (data.simulationId) {
            const updated = await (db as any).simulation.update({
                where: { id: data.simulationId },
                data: {
                    inputData: {
                        linhas: data.linhas,
                        mes: data.mes,
                        ano: data.ano,
                    } as any,
                }
            });
            return { success: true, id: updated.id };
        } else {
            const created = await (db as any).simulation.create({
                data: {
                    tenantId: data.tenantId,
                    clienteId: data.clienteId,
                    type: 'LABOR_RESCISAO_CARD',
                    inputData: {
                        linhas: data.linhas,
                        mes: data.mes,
                        ano: data.ano,
                    } as any,
                    resultData: {}
                }
            });
            return { success: true, id: created.id };
        }
    } catch (error) {
        console.error("Erro ao salvar Cartão de Ponto:", error);
        return { success: false, error: "Falha na persistência" };
    }
}
