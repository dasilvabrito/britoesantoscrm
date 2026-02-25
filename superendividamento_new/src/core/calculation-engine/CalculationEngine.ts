import { Decimal } from 'decimal.js';
import { SelicService } from '../../modules/social-security/SelicService';
import { GracePeriodService } from '../../modules/social-security/GracePeriodService';

// Configuração padrão de precisão matemática para cálculos jurídicos
Decimal.set({
    precision: 20,
    rounding: Decimal.ROUND_HALF_UP
});

export class CalculationEngine {
    /**
     * Aplica juros simples sobre um valor base.
     * Fórmula: M = P * (1 + (i * n))
     */
    static applySimpleInterest(
        baseValue: Decimal | number | string,
        monthlyRate: Decimal | number | string,
        periodMonths: number
    ): Decimal {
        const P = new Decimal(baseValue);
        const i = new Decimal(monthlyRate).div(100);
        const n = new Decimal(periodMonths);

        // M = P * (1 + i*n)
        return P.mul(new Decimal(1).add(i.mul(n)));
    }

    /**
     * Aplica juros compostos sobre um valor base.
     * Fórmula: M = P * (1 + i)^n
     */
    static applyCompoundInterest(
        baseValue: Decimal | number | string,
        monthlyRate: Decimal | number | string,
        periodMonths: number
    ): Decimal {
        const P = new Decimal(baseValue);
        const i = new Decimal(monthlyRate).div(100);
        const n = new Decimal(periodMonths);

        // M = P * (1 + i)^n
        return P.mul(new Decimal(1).add(i).pow(n));
    }

    /**
     * Aplica correção monetária usando um fator acumulado.
     */
    static applyMonetaryCorrection(
        baseValue: Decimal | number | string,
        accumulationFactor: Decimal | number | string
    ): Decimal {
        const P = new Decimal(baseValue);
        const factor = new Decimal(accumulationFactor);
        return P.mul(factor);
    }

    /**
     * Calcula amortização pela Tabela Price (Parcelas Fixas).
     * PMT = P * [i * (1 + i)^n] / [(1 + i)^n - 1]
     */
    static calculateAmortizationPrice(
        principal: Decimal | number | string,
        monthlyRate: Decimal | number | string,
        totalPeriods: number
    ): { pmt: Decimal; totalInterest: Decimal; totalPaid: Decimal } {
        const P = new Decimal(principal);
        const i = new Decimal(monthlyRate).div(100);
        const n = totalPeriods;

        if (i.isZero()) {
            const pmt = P.div(n);
            return { pmt, totalInterest: new Decimal(0), totalPaid: P };
        }

        const factor = new Decimal(1).add(i).pow(n);
        const pmt = P.mul(i.mul(factor)).div(factor.sub(1));
        const totalPaid = pmt.mul(n);
        const totalInterest = totalPaid.sub(P);

        return { pmt, totalInterest, totalPaid };
    }

    /**
     * Calcula amortização pelo sistema SAC (Amortização Constante).
     */
    static calculateAmortizationSAC(
        principal: Decimal | number | string,
        monthlyRate: Decimal | number | string,
        totalPeriods: number
    ): {
        firstPmt: Decimal;
        lastPmt: Decimal;
        amortization: Decimal;
        totalInterest: Decimal;
        totalPaid: Decimal
    } {
        const P = new Decimal(principal);
        const i = new Decimal(monthlyRate).div(100);
        const n = new Decimal(totalPeriods);

        const A = P.div(n); // Amortização constante

        // Primeira parcela: A + P*i
        const firstPmt = A.add(P.mul(i));

        // Última parcela: A + A*i
        const lastPmt = A.add(A.mul(i));

        // Juros totais no SAC: (J1 + Jn) * n / 2
        // J1 = P*i, Jn = A*i
        const totalInterest = P.mul(i).add(A.mul(i)).mul(n).div(2);
        const totalPaid = P.add(totalInterest);

        return {
            firstPmt,
            lastPmt,
            amortization: A,
            totalInterest,
            totalPaid
        };
    }

    /**
   * Calcula a Selic acumulada entre duas datas.
   * Simulação simplificada: em produção, deve buscar de uma tabela de índices.
   */
    static calculateSelicAccumulated(
        baseValue: Decimal | number | string,
        startDate: Date,
        endDate: Date,
        monthlyRatePlaceholder: number = 0.5 // Exemplo de taxa média se não houver tabela
    ): Decimal {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

        // Simplificando como juros compostos para o placeholder
        return this.applyCompoundInterest(baseValue, monthlyRatePlaceholder, Math.max(0, months));
    }

    /**
     * Aplica atualização judicial seguindo o Tema 810 STF e EC 113/2021.
     */
    static applyJudicialUpdate(
        baseValue: Decimal | number | string,
        startDate: Date,
        endDate: Date,
        config: {
            useSelicAfterEC113: boolean;
            preECIndex: 'IPCA-E' | 'INPC' | 'TR';
            interestRatePreEC: number;
        }
    ): { total: Decimal; correction: Decimal; interest: Decimal } {
        const cutoffDate = new Date('2021-12-09'); // Data da EC 113/2021
        const start = new Date(startDate);
        const end = new Date(endDate);

        let currentPrincipal = new Decimal(baseValue);
        let totalInterest = new Decimal(0);
        let totalCorrection = new Decimal(0);

        // Se começou antes da EC 113
        if (start < cutoffDate) {
            const judicialEnd = end < cutoffDate ? end : cutoffDate;
            const monthsPreEC = (judicialEnd.getFullYear() - start.getFullYear()) * 12 + (judicialEnd.getMonth() - start.getMonth());

            // Simulação: Aqui deveríamos aplicar o índice IPCA-E/INPC da tabela
            // placeholder: 0.4% de correção média
            const correctionFactor = new Decimal(1.004).pow(Math.max(0, monthsPreEC));
            const correctedValue = currentPrincipal.mul(correctionFactor);

            totalCorrection = correctedValue.sub(currentPrincipal);

            // Juros Pré-EC (Simples)
            const interestValue = this.applySimpleInterest(correctedValue, config.interestRatePreEC, Math.max(0, monthsPreEC)).sub(correctedValue);
            totalInterest = interestValue;

            currentPrincipal = correctedValue;
        }

        // Se terminou após a EC 113 e a config permitir SELIC
        if (end > cutoffDate && config.useSelicAfterEC113) {
            const postECStart = start > cutoffDate ? start : cutoffDate;
            const monthsPostEC = (end.getFullYear() - postECStart.getFullYear()) * 12 + (end.getMonth() - postECStart.getMonth());

            // Pós-EC 113: SELIC engloba correção e juros
            // placeholder SELIC: 1% am
            const selicValue = this.applyCompoundInterest(currentPrincipal, 1.0, Math.max(0, monthsPostEC));

            const totalPostEC = selicValue.sub(currentPrincipal);
            // No caso da SELIC, não se separa juros e correção legalmente da mesma forma, 
            // mas para o relatório podemos estimar ou colocar tudo em 'atualização selic'
            totalCorrection = totalCorrection.add(totalPostEC);
            currentPrincipal = selicValue;
        }

        return {
            total: currentPrincipal,
            correction: totalCorrection,
            interest: totalInterest
        };
    }

    /**
     * Aplica atualização judicial em série (múltiplos débitos e amortizações).
     */
    static calculateJudicialSeries(data: {
        entries: Array<{
            date: Date;
            value: Decimal | number | string;
            type: 'DEBIT' | 'CREDIT';
            repeatIndebito?: boolean;
            remuneratoryRate?: number; // % am
            moraRate?: number;        // % am
            customJurosStartDate?: Date;
            customJurosEndDate?: Date;
        }>;
        endDate: Date;
        config: {
            useSelicAfterEC113: boolean;
            preECIndex: 'IPCA-E' | 'INPC' | 'TR';
            interestRatePreEC: number;
            feesSucumbenciais?: number; // %
            feesArt523?: number;       // %
            fineArt523?: boolean;      // 10%
        }
    }) {
        let totalPrincipalBalance = new Decimal(0);
        let totalInterest = new Decimal(0);
        let totalCorrection = new Decimal(0);
        let totalRemuneratory = new Decimal(0);

        const processedEntries = data.entries.map(entry => {
            let baseVal = new Decimal(entry.value);
            if (entry.repeatIndebito) {
                baseVal = baseVal.mul(2);
            }

            const result = this.applyJudicialUpdate(baseVal, entry.date, data.endDate, {
                useSelicAfterEC113: data.config.useSelicAfterEC113,
                preECIndex: data.config.preECIndex,
                interestRatePreEC: data.config.interestRatePreEC,
            });

            const factor = entry.type === 'CREDIT' ? new Decimal(-1) : new Decimal(1);

            // Cálculos Adicionais por Lançamento (Remuneratórios e Mora Extra)
            const jurosStart = entry.customJurosStartDate || entry.date;
            const jurosEnd = entry.customJurosEndDate || data.endDate;
            const months = Math.max(0, (jurosEnd.getFullYear() - jurosStart.getFullYear()) * 12 + (jurosEnd.getMonth() - jurosStart.getMonth()));

            let remuneratoryVal = new Decimal(0);
            if (entry.remuneratoryRate) {
                remuneratoryVal = baseVal.mul(new Decimal(entry.remuneratoryRate).div(100)).mul(months);
            }

            let extraMoraVal = new Decimal(0);
            if (entry.moraRate) {
                extraMoraVal = baseVal.mul(new Decimal(entry.moraRate).div(100)).mul(months);
            }

            return {
                ...entry,
                originalValue: baseVal.toFixed(2),
                correctedValue: result.total.mul(factor),
                correction: result.correction.mul(factor),
                interest: result.interest.add(extraMoraVal).mul(factor),
                remuneratory: remuneratoryVal.mul(factor),
            };
        });

        // Somar saldos
        processedEntries.forEach(e => {
            totalPrincipalBalance = totalPrincipalBalance.add(e.correctedValue);
            totalCorrection = totalCorrection.add(e.correction);
            totalInterest = totalInterest.add(e.interest);
            totalRemuneratory = totalRemuneratory.add(e.remuneratory);
        });

        const subtotal = totalPrincipalBalance.add(totalRemuneratory);

        // Aplicação de Multas e Honorários do Art. 523 CPC
        let fine523Value = new Decimal(0);
        let fees523Value = new Decimal(0);

        if (data.config.fineArt523) {
            fine523Value = subtotal.mul(0.10);
        }

        if (data.config.feesArt523) {
            fees523Value = subtotal.mul(new Decimal(data.config.feesArt523).div(100));
        }

        // Honorários Sucumbenciais
        let feesSucumbenciaisValue = new Decimal(0);
        if (data.config.feesSucumbenciais) {
            feesSucumbenciaisValue = subtotal.mul(new Decimal(data.config.feesSucumbenciais).div(100));
        }

        const grandTotal = subtotal.add(fine523Value).add(fees523Value).add(feesSucumbenciaisValue);

        return {
            entries: processedEntries.map(e => ({
                ...e,
                correctedValue: e.correctedValue.toFixed(2),
                correction: e.correction.toFixed(2),
                interest: e.interest.toFixed(2),
                remuneratory: e.remuneratory.toFixed(2),
            })),
            subtotal: subtotal.toFixed(2),
            totalCorrection: totalCorrection.toFixed(2),
            totalInterest: totalInterest.toFixed(2),
            totalRemuneratory: totalRemuneratory.toFixed(2),
            fine523: fine523Value.toFixed(2),
            fees523: fees523Value.toFixed(2),
            feesSucumbenciais: feesSucumbenciaisValue.toFixed(2),
            grandTotal: grandTotal.toFixed(2)
        };
    }

    /**
   * Calcula multa do FGTS (normalmente 40%).
   */
    static calculateFGTSFine(
        balance: Decimal | number | string,
        percentage: number = 40
    ): Decimal {
        const B = new Decimal(balance);
        const P = new Decimal(percentage).div(100);
        return B.mul(P);
    }

    /**
     * Calcula rescisão trabalhista simplificada.
     */
    static calculateRescisaoTrabalhista(data: {
        salary: Decimal | number | string;
        monthsWorked: number;
        hasThirteenth: boolean;
        hasVacation: boolean;
        hasNotice: boolean;
    }): { total: Decimal; thirteenth: Decimal; vacation: Decimal; notice: Decimal } {
        const salary = new Decimal(data.salary);

        // 13º proporcional: Salário / 12 * meses no ano
        const thirteenth = data.hasThirteenth
            ? salary.div(12).mul(data.monthsWorked % 12 || 12)
            : new Decimal(0);

        // Férias + 1/3: (Salário / 12 * meses) * 1.33
        const vacation = data.hasVacation
            ? salary.div(12).mul(data.monthsWorked).mul(1.33333333)
            : new Decimal(0);

        // Aviso Prévio: 1 salário
        const notice = data.hasNotice ? salary : new Decimal(0);

        return {
            total: thirteenth.add(vacation).add(notice),
            thirteenth,
            vacation,
            notice
        };
    }

    /**
     * Calcula Pensão Alimentícia baseada em renda e percentual.
     */
    static calculateFoodSupport(
        netIncome: Decimal | number | string,
        percentage: number,
        numDependents: number = 1
    ): { total: Decimal; perDependent: Decimal } {
        const income = new Decimal(netIncome);
        const p = new Decimal(percentage).div(100);
        const total = income.mul(p);
        const perDependent = total.div(Math.max(1, numDependents));

        return { total, perDependent };
    }

    /**
   * Compara dois cenários de financiamento (Contratado vs Recalculado).
   */
    static compareScenarios(
        principal: Decimal | number | string,
        contractedRate: Decimal | number | string,
        recalculatedRate: Decimal | number | string,
        totalPeriods: number,
        type: 'PRICE' | 'SAC'
    ): {
        difference: Decimal;
        savingsPercentage: Decimal;
        contracted: any;
        recalculated: any;
    } {
        const contracted = type === 'PRICE'
            ? this.calculateAmortizationPrice(principal, contractedRate, totalPeriods)
            : this.calculateAmortizationSAC(principal, contractedRate, totalPeriods);

        const recalculated = type === 'PRICE'
            ? this.calculateAmortizationPrice(principal, recalculatedRate, totalPeriods)
            : this.calculateAmortizationSAC(principal, recalculatedRate, totalPeriods);

        const difference = contracted.totalPaid.sub(recalculated.totalPaid);
        const savingsPercentage = difference.div(contracted.totalPaid).mul(100);

        return {
            difference,
            savingsPercentage,
            contracted,
            recalculated
        };
    }

    /**
   * Calcula a exclusão de impostos da base de outros impostos (ex: ICMS do PIS/COFINS).
   */
    static calculateTaxExclusion(data: {
        grossRevenue: Decimal | number | string;
        taxToBeExcludedValue: Decimal | number | string;
        pisRate: number;
        cofinsRate: number;
    }): {
        originalPisCofins: Decimal;
        newPisCofins: Decimal;
        recoverableCredit: Decimal
    } {
        const revenue = new Decimal(data.grossRevenue);
        const taxToExclude = new Decimal(data.taxToBeExcludedValue);
        const pisR = new Decimal(data.pisRate).div(100);
        const cofinsR = new Decimal(data.cofinsRate).div(100);
        const totalRate = pisR.add(cofinsR);

        const originalPisCofins = revenue.mul(totalRate);
        const newPisCofins = revenue.sub(taxToExclude).mul(totalRate);
        const recoverableCredit = originalPisCofins.sub(newPisCofins);

        return {
            originalPisCofins,
            newPisCofins,
            recoverableCredit
        };
    }

    /**
     * Calcula tributação "por dentro" (Gross Up).
     */
    static calculateTaxInside(
        netValue: Decimal | number | string,
        taxRate: number
    ): Decimal {
        const net = new Decimal(netValue);
        const rate = new Decimal(taxRate).div(100);

        // Valor = Líquido / (1 - Alíquota)
        return net.div(new Decimal(1).sub(rate));
    }

    /**
    * Calcula contribuições previdenciárias em atraso com multa e juros SELIC.
    * Regra: Multa 0.33% dia (max 20%) + Juros (SELIC acumulada próxima competência até mês anterior + 1% mês pgto).
    */
    static calculateSocialSecurityLatePayment(data: {
        principal: Decimal | number | string;
        dueDate: Date;
        paymentDate: Date;
        competencia: string; // "YYYY-MM"
    }): {
        principal: Decimal;
        fine: Decimal;
        interest: Decimal;
        selicAcumulada: number;
        total: Decimal
    } {
        const P = new Decimal(data.principal);
        const start = new Date(data.dueDate);
        const end = new Date(data.paymentDate);

        // 1. Multa: 0,33% ao dia, máximo 20%
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let fineRate = new Decimal(diffDays).mul(0.0033);
        if (fineRate.gt(0.20)) fineRate = new Decimal(0.20);

        // Multa: Truncar para 2 casas decimais (ex: 33,396 -> 33,39)
        const fine = P.mul(fineRate).toDecimalPlaces(2, Decimal.ROUND_DOWN);

        // 2. Juros SELIC
        // Regra Art. 35, II Lei 8.212/91:
        // Acumulado do primeiro dia do mês subsequente ao vencimento até o mês anterior ao do pagamento + 1% no mês do pagamento.

        // Mês seguinte ao vencimento - Usamos a data de vencimento real passada no input
        const dataInicioJuros = new Date(start.getFullYear(), start.getMonth() + 1, 1);

        // Mês anterior ao pagamento
        const dataFimJuros = new Date(end.getFullYear(), end.getMonth() - 1, 1);

        let selicAcumulada = 0;
        if (dataInicioJuros <= dataFimJuros) {
            selicAcumulada = SelicService.acumularSelic(dataInicioJuros, dataFimJuros);
        }

        // + 1% no mês do pagamento (se o pagamento for após o vencimento)
        let interestRateTotal = new Decimal(0);
        if (end > start) {
            interestRateTotal = new Decimal(selicAcumulada).add(0.01);
        }

        // Juros: Arredondamento para cima (CEIL) para 2 casas decimais conforme exemplo do usuário
        const interest = P.mul(interestRateTotal).toDecimalPlaces(2, Decimal.ROUND_CEIL);

        return {
            principal: P,
            fine,
            interest,
            selicAcumulada: Number(interestRateTotal.toFixed(4)),
            total: P.add(fine).add(interest)
        };
    }

    /**
     * Avalia o risco previdenciário da regularização em atraso.
     */
    static calculateRiskMatrix(data: {
        tipoSegurado: 'INDIVIDUAL' | 'FACULTATIVO';
        anosEmAtraso: number;
        possuiComprovacaoAtividade: boolean;
        competenciaDesejada: string;
        competenciaUltima?: string;
        maisDe120Contribuicoes?: boolean;
        situacaoDesemprego?: boolean;
        estaRecebendoBeneficio?: boolean;
        paymentDate?: Date;
    }) {
        let detemQualidade = true;
        let infoGrace = null;

        if (data.competenciaUltima || data.estaRecebendoBeneficio) {
            infoGrace = GracePeriodService.isDentroDoPeriodo(
                data.competenciaDesejada,
                data.competenciaUltima || "",
                data.tipoSegurado,
                data.maisDe120Contribuicoes,
                data.situacaoDesemprego,
                data.paymentDate,
                data.estaRecebendoBeneficio
            );
            detemQualidade = infoGrace.dentro;
        }

        if (data.tipoSegurado === 'FACULTATIVO') {
            if (!detemQualidade) {
                return {
                    nivel: 'CRÍTICO',
                    cor: 'text-red-600',
                    badge: 'Indeferimento certo',
                    observacao: `O segurado facultativo perdeu a qualidade em ${infoGrace?.dataLimite} e não pode recolher atraso.`,
                    infoGrace
                };
            }
            return {
                nivel: 'BAIXO',
                cor: 'text-emerald-600',
                badge: 'Risco Baixo',
                observacao: 'Regularização permitida dentro do período de manutenção da qualidade.',
                infoGrace
            };
        }

        if (data.tipoSegurado === 'INDIVIDUAL') {
            if (data.anosEmAtraso <= 5) {
                return {
                    nivel: 'BAIXO',
                    cor: 'text-emerald-600',
                    badge: 'Risco Baixo',
                    observacao: 'Regularização automática possível sem necessidade de prova de atividade.',
                    infoGrace
                };
            } else if (data.possuiComprovacaoAtividade) {
                return {
                    nivel: 'MÉDIO',
                    cor: 'text-amber-600',
                    badge: 'Risco Médio',
                    observacao: 'Sujeito à validação do INSS mediante apresentação de documentos (notas, recibos).',
                    infoGrace
                };
            } else {
                return {
                    nivel: 'ALTO',
                    cor: 'text-red-600',
                    badge: 'Risco Alto',
                    observacao: 'Falta de prova de atividade onerosa pode levar ao indeferimento do tempo.',
                    infoGrace
                };
            }
        }

        return { nivel: 'DESCONHECIDO', cor: 'text-slate-400', badge: 'N/A', observacao: '' };
    }

    /**
     * Converte Decimal para string formatada como BRL.
     */
    static toBRL(value: Decimal): string {
        return value.toFixed(2);
    }
}
