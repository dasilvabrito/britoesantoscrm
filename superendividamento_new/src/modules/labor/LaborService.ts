import { PrismaClient } from '@prisma/client';
import { CalculationEngine } from '../../core/calculation-engine/CalculationEngine';

const prisma = new PrismaClient();

export class LaborService {
    /**
     * Realiza um cálculo de rescisão trabalhista e salva no banco.
     */
    static async calculateAndSave(data: {
        tenantId: number;
        clienteId?: number;
        salary: number;
        monthsWorked: number;
        hasThirteenth: boolean;
        hasVacation: boolean;
        hasNotice: boolean;
        fgtsBalance?: number;
    }) {
        const rescisao = CalculationEngine.calculateRescisaoTrabalhista({
            salary: data.salary,
            monthsWorked: data.monthsWorked,
            hasThirteenth: data.hasThirteenth,
            hasVacation: data.hasVacation,
            hasNotice: data.hasNotice,
        });

        const fgtsFine = data.fgtsBalance
            ? CalculationEngine.calculateFGTSFine(data.fgtsBalance)
            : null;

        const totalRescisao = fgtsFine
            ? rescisao.total.add(fgtsFine)
            : rescisao.total;

        const simulation = await (prisma as any).simulation.create({
            data: {
                tenantId: data.tenantId,
                clienteId: data.clienteId,
                type: 'LABOR_RESCISAO',
                inputData: {
                    salary: data.salary,
                    monthsWorked: data.monthsWorked,
                    hasThirteenth: data.hasThirteenth,
                    hasVacation: data.hasVacation,
                    hasNotice: data.hasNotice,
                    fgtsBalance: data.fgtsBalance,
                } as any,
                resultData: {
                    thirteenth: rescisao.thirteenth.toFixed(2),
                    vacation: rescisao.vacation.toFixed(2),
                    notice: rescisao.notice.toFixed(2),
                    fgtsFine: fgtsFine ? fgtsFine.toFixed(2) : '0.00',
                    total: totalRescisao.toFixed(2),
                } as any,
            }
        });

        return { simulation, rescisao, fgtsFine, totalRescisao };
    }
}
