import db from '@/lib/db';
import { CalculationEngine } from '../../core/calculation-engine/CalculationEngine';
import { Decimal } from 'decimal.js';

const prisma = db;

export class JudicialService {
    /**
     * Realiza um cálculo de atualização judicial e salva no banco de dados.
     */
    static async calculateAndSave(data: {
        tenantId: number;
        clienteId?: number;
        entries: Array<{
            date: string;
            value: number;
            type: 'DEBIT' | 'CREDIT';
            repeatIndebito?: boolean;
            remuneratoryRate?: number;
            moraRate?: number;
            customJurosStartDate?: string;
            customJurosEndDate?: string;
        }>;
        endDate: string;
        useSelicAfterEC113: boolean;
        preECIndex: 'IPCA-E' | 'INPC' | 'TR';
        interestRatePreEC: number;
        feesSucumbenciais?: number;
        feesArt523?: number;
        fineArt523?: boolean;
    }) {
        const end = new Date(data.endDate);
        const entriesProcessed = data.entries.map(e => ({
            ...e,
            date: new Date(e.date),
            customJurosStartDate: e.customJurosStartDate ? new Date(e.customJurosStartDate) : undefined,
            customJurosEndDate: e.customJurosEndDate ? new Date(e.customJurosEndDate) : undefined,
        }));

        const result = CalculationEngine.calculateJudicialSeries({
            entries: entriesProcessed,
            endDate: end,
            config: {
                useSelicAfterEC113: data.useSelicAfterEC113,
                preECIndex: data.preECIndex,
                interestRatePreEC: data.interestRatePreEC,
                feesSucumbenciais: data.feesSucumbenciais,
                feesArt523: data.feesArt523,
                fineArt523: data.fineArt523
            }
        });

        // Persistir no banco
        const simulation = await (prisma as any).simulation.create({
            data: {
                tenantId: data.tenantId,
                clienteId: data.clienteId,
                type: 'JUDICIAL_UPDATE',
                inputData: data as any,
                resultData: result as any,
            }
        });

        return simulation;
    }

    /**
     * Busca histórico de simulações do tenant.
     */
    static async getHistory(tenantId: number) {
        return (prisma as any).simulation.findMany({
            where: {
                tenantId,
                type: 'JUDICIAL_UPDATE'
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                cliente: true
            }
        });
    }
}
