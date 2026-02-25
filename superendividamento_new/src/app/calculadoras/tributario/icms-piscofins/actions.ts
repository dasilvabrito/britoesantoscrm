'use server';

import { TaxService } from '@/modules/tax/TaxService';

export async function calculateTaxExclusionAction(formData: FormData) {
    const grossRevenue = parseFloat(formData.get('grossRevenue') as string);
    const taxToBeExcludedValue = parseFloat(formData.get('taxToBeExcludedValue') as string);
    const pisRate = parseFloat(formData.get('pisRate') as string);
    const cofinsRate = parseFloat(formData.get('cofinsRate') as string);

    const tenantId = 1; // Temporário

    const { simulation, result } = await TaxService.calculateAndSave({
        tenantId,
        grossRevenue,
        taxToBeExcludedValue,
        pisRate,
        cofinsRate,
    });

    return {
        grossRevenue: grossRevenue.toFixed(2),
        originalPisCofins: result.originalPisCofins.toFixed(2),
        newPisCofins: result.newPisCofins.toFixed(2),
        recoverableCredit: result.recoverableCredit.toFixed(2),
    };
}
