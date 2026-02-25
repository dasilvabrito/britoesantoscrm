'use server';

import { JudicialService } from '@/modules/judicial/JudicialService';

export async function calculateJudicialAction(formData: FormData) {
    const entriesRaw = formData.get('entries') as string;
    const entries = JSON.parse(entriesRaw);
    const endDate = formData.get('endDate') as string;
    const preECIndex = formData.get('preECIndex') as any;
    const interestRatePreEC = parseFloat(formData.get('interestRate') as string);
    const useSelicAfterEC113 = formData.get('useSelic') === 'on';
    const feesSucumbenciais = parseFloat(formData.get('feesSucumbenciais') as string) || 0;
    const feesArt523 = parseFloat(formData.get('feesArt523') as string) || 0;
    const fineArt523 = formData.get('fineArt523') === 'on';

    // TODO: Buscar tenantId do contexto de autenticação
    const tenantId = 1;

    const simulation = await JudicialService.calculateAndSave({
        tenantId,
        entries: entries.map((e: any) => ({
            ...e,
            remuneratoryRate: parseFloat(e.remuneratoryRate) || 0,
            moraRate: parseFloat(e.moraRate) || 0,
            repeatIndebito: !!e.repeatIndebito,
            customJurosStartDate: e.customJurosStartDate || e.date,
            customJurosEndDate: e.customJurosEndDate || endDate
        })),
        endDate,
        preECIndex,
        interestRatePreEC,
        useSelicAfterEC113,
        feesSucumbenciais,
        feesArt523,
        fineArt523
    });

    return {
        total: (simulation.resultData as any).grandTotal,
        subtotal: (simulation.resultData as any).subtotal,
        correction: (simulation.resultData as any).totalCorrection,
        interest: (simulation.resultData as any).totalInterest,
        fine523: (simulation.resultData as any).fine523,
        fees523: (simulation.resultData as any).fees523,
        feesSucumbenciais: (simulation.resultData as any).feesSucumbenciais,
        inputData: simulation.inputData,
        resultData: simulation.resultData
    };
}
