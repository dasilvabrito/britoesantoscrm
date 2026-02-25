import { PrismaClient } from '@prisma/client';
import { CalculationEngine } from '../../core/calculation-engine/CalculationEngine';

const prisma = new PrismaClient();

export class FamilyService {
    /**
     * Realiza um cálculo de pensão alimentícia e salva no banco.
     */
    static async calculateAndSave(data: {
        tenantId: number;
        clienteId?: number;
        netIncome: number;
        percentage: number;
        numDependents: number;
    }) {
        const calculation = CalculationEngine.calculateFoodSupport(
            data.netIncome,
            data.percentage,
            data.numDependents
        );

        const simulation = await (prisma as any).simulation.create({
            data: {
                tenantId: data.tenantId,
                clienteId: data.clienteId,
                type: 'FAMILY_PENSION',
                inputData: {
                    netIncome: data.netIncome,
                    percentage: data.percentage,
                    numDependents: data.numDependents,
                } as any,
                resultData: {
                    total: calculation.total.toFixed(2),
                    perDependent: calculation.perDependent.toFixed(2),
                } as any,
            }
        });

        return { simulation, calculation };
    }
}
