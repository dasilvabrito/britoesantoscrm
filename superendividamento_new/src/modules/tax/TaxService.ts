import { PrismaClient } from '@prisma/client';
import { CalculationEngine } from '../../core/calculation-engine/CalculationEngine';

const prisma = new PrismaClient();

export class TaxService {
    /**
     * Realiza um cálculo de exclusão de ICMS do PIS/COFINS e salva no banco.
     */
    static async calculateAndSave(data: {
        tenantId: number;
        clienteId?: number;
        grossRevenue: number;
        taxToBeExcludedValue: number;
        pisRate: number;
        cofinsRate: number;
    }) {
        const result = CalculationEngine.calculateTaxExclusion({
            grossRevenue: data.grossRevenue,
            taxToBeExcludedValue: data.taxToBeExcludedValue,
            pisRate: data.pisRate,
            cofinsRate: data.cofinsRate,
        });

        const simulation = await (prisma as any).simulation.create({
            data: {
                tenantId: data.tenantId,
                clienteId: data.clienteId,
                type: 'TAX_EXCLUSION_ICMS',
                inputData: {
                    grossRevenue: data.grossRevenue,
                    taxToBeExcludedValue: data.taxToBeExcludedValue,
                    pisRate: data.pisRate,
                    cofinsRate: data.cofinsRate,
                } as any,
                resultData: {
                    originalPisCofins: result.originalPisCofins.toFixed(2),
                    newPisCofins: result.newPisCofins.toFixed(2),
                    recoverableCredit: result.recoverableCredit.toFixed(2),
                } as any,
            }
        });

        return { simulation, result };
    }
}
