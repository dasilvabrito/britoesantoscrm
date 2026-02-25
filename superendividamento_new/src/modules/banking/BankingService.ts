import { PrismaClient } from '@prisma/client';
import { CalculationEngine } from '../../core/calculation-engine/CalculationEngine';

const prisma = new PrismaClient();

export class BankingService {
    /**
     * Realiza uma revisão bancária (comparação de taxas) e salva no banco.
     */
    static async calculateAndSave(data: {
        tenantId: number;
        clienteId?: number;
        principal: number;
        contractedRate: number;
        recalculatedRate: number;
        totalPeriods: number;
        type: 'PRICE' | 'SAC';
    }) {
        const comparison = CalculationEngine.compareScenarios(
            data.principal,
            data.contractedRate,
            data.recalculatedRate,
            data.totalPeriods,
            data.type
        );

        const simulation = await (prisma as any).simulation.create({
            data: {
                tenantId: data.tenantId,
                clienteId: data.clienteId,
                type: 'BANK_REVISION',
                inputData: {
                    principal: data.principal,
                    contractedRate: data.contractedRate,
                    recalculatedRate: data.recalculatedRate,
                    totalPeriods: data.totalPeriods,
                    type: data.type,
                } as any,
                resultData: {
                    difference: comparison.difference.toFixed(2),
                    savingsPercentage: comparison.savingsPercentage.toFixed(2),
                    contractedTotal: comparison.contracted.totalPaid.toFixed(2),
                    recalculatedTotal: comparison.recalculated.totalPaid.toFixed(2),
                    contractedPmt: comparison.contracted.pmt ? comparison.contracted.pmt.toFixed(2) : comparison.contracted.firstPmt.toFixed(2),
                    recalculatedPmt: comparison.recalculated.pmt ? comparison.recalculated.pmt.toFixed(2) : comparison.recalculated.firstPmt.toFixed(2),
                } as any,
            }
        });

        return { simulation, comparison };
    }
}
