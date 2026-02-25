'use server';

import { BankingService } from '@/modules/banking/BankingService';

export async function calculateBankingAction(formData: FormData) {
    const principal = parseFloat(formData.get('principal') as string);
    const contractedRate = parseFloat(formData.get('contractedRate') as string);
    const recalculatedRate = parseFloat(formData.get('recalculatedRate') as string);
    const totalPeriods = parseInt(formData.get('totalPeriods') as string);
    const type = formData.get('type') as 'PRICE' | 'SAC';

    const tenantId = 1; // Temporário

    const { simulation, comparison } = await BankingService.calculateAndSave({
        tenantId,
        principal,
        contractedRate,
        recalculatedRate,
        totalPeriods,
        type,
    });

    return {
        principal: principal.toFixed(2),
        difference: comparison.difference.toFixed(2),
        savingsPercentage: comparison.savingsPercentage.toFixed(2),
        contractedTotal: comparison.contracted.totalPaid.toFixed(2),
        recalculatedTotal: comparison.recalculated.totalPaid.toFixed(2),
        contractedPmt: comparison.contracted.pmt ? comparison.contracted.pmt.toFixed(2) : comparison.contracted.firstPmt.toFixed(2),
        recalculatedPmt: comparison.recalculated.pmt ? comparison.recalculated.pmt.toFixed(2) : comparison.recalculated.firstPmt.toFixed(2),
    };
}
