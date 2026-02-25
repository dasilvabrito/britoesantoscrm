'use server';

import { SocialSecurityService } from '@/modules/social-security/SocialSecurityService';
import { MinimumWageService } from '@/modules/social-security/MinimumWageService';

export async function calculateLatePaymentAction(formData: FormData) {
    const competenciaInput = formData.get('competencia') as string; // Expecting YYYY-MM
    const paymentDate = formData.get('paymentDate') as string;
    const tipoSegurado = formData.get('tipoSegurado') as 'INDIVIDUAL' | 'FACULTATIVO';
    const modalidade = formData.get('modalidade') as string; // 'NORMAL', 'SIMPLIFICADO', 'BAIXA_RENDA'
    const possuiComprovacaoAtividade = formData.get('possuiComprovacaoAtividade') === 'on';
    const competenciaUltima = formData.get('competenciaUltima') as string;
    const maisDe120Contribuicoes = formData.get('maisDe120Contribuicoes') === 'on';
    const situacaoDesemprego = formData.get('situacaoDesemprego') === 'on';
    const estaRecebendoBeneficio = formData.get('estaRecebendoBeneficio') === 'on';
    const useManualValue = formData.get('useManualValue') === 'on';
    const manualPrincipal = parseFloat(formData.get('principal') as string || "0");
    const nit = formData.get('nit') as string || "";
    const nomeSegurado = formData.get('nomeSegurado') as string || "SEGURADO NÃO IDENTIFICADO";

    // 1. Calcular Vencimento Original (Dia 10 Antecipado)
    const originalDueDate = MinimumWageService.calcularVencimentoAntecipado(competenciaInput);
    const dueDateStr = originalDueDate.toISOString().split('T')[0];

    // 2. Definir Alíquota
    let aliquota = 0.20;
    if (modalidade === 'SIMPLIFICADO') aliquota = 0.11;
    if (modalidade === 'BAIXA_RENDA') aliquota = 0.05;

    // 3. Obter Salário Mínimo do Vencimento Original
    const minWage = MinimumWageService.obterSalarioMinimo(originalDueDate);

    // 4. Calcular Valor Principal (se não for manual)
    // Regra: Apenas o Plano NORMAL (20%) permite contribuição acima do mínimo.
    let principal = minWage * aliquota;
    if (useManualValue && modalidade === 'NORMAL') {
        principal = manualPrincipal;
    }

    // Calcular anos em atraso
    const paymentDateObj = new Date(paymentDate);
    const anosEmAtraso = (paymentDateObj.getTime() - originalDueDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const tenantId = 1; // Temporário

    const { simulation, result, risco } = await SocialSecurityService.calculateAndSave({
        tenantId,
        principal,
        dueDate: dueDateStr,
        paymentDate,
        competencia: competenciaInput,
        tipoSegurado,
        anosEmAtraso,
        possuiComprovacaoAtividade,
        competenciaUltima,
        maisDe120Contribuicoes,
        situacaoDesemprego,
        estaRecebendoBeneficio
    });

    return {
        principal: principal.toFixed(2),
        minWageUsed: minWage.toFixed(2),
        aliquotaUsed: (aliquota * 100).toFixed(0),
        fine: result.fine.toFixed(2),
        interest: result.interest.toFixed(2),
        total: result.total.toFixed(2),
        selicAcumulada: result.selicAcumulada,
        risco: risco,
        originalDueDate: originalDueDate.toLocaleDateString('pt-BR'),
        modalidade,
        nit,
        nomeSegurado,
        competencia: competenciaInput,
        paymentDate: paymentDate,
        // Contexto do segurado para renderização da UI
        tipoSegurado,
        possuiComprovacaoAtividade,
    };
}
