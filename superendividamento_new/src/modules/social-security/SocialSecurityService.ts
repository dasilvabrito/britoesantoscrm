import { PrismaClient } from '@prisma/client';
import { CalculationEngine } from '../../core/calculation-engine/CalculationEngine';

const prisma = new PrismaClient();

export class SocialSecurityService {
    /**
     * Realiza um cálculo de contribuição em atraso e salva no banco.
     */
    static async calculateAndSave(data: {
        tenantId: number;
        clienteId?: number;
        principal: number;
        dueDate: string;
        paymentDate: string;
        competencia: string;
        tipoSegurado: 'INDIVIDUAL' | 'FACULTATIVO';
        anosEmAtraso: number;
        possuiComprovacaoAtividade: boolean;
        competenciaUltima?: string;
        maisDe120Contribuicoes?: boolean;
        situacaoDesemprego?: boolean;
        estaRecebendoBeneficio?: boolean;
    }) {
        const dueDate = new Date(data.dueDate);
        const paymentDate = new Date(data.paymentDate);

        const result = CalculationEngine.calculateSocialSecurityLatePayment({
            principal: data.principal,
            dueDate,
            paymentDate,
            competencia: data.competencia,
        });

        const risco = CalculationEngine.calculateRiskMatrix({
            tipoSegurado: data.tipoSegurado,
            anosEmAtraso: data.anosEmAtraso,
            possuiComprovacaoAtividade: data.possuiComprovacaoAtividade,
            competenciaDesejada: data.competencia,
            competenciaUltima: data.competenciaUltima,
            maisDe120Contribuicoes: data.maisDe120Contribuicoes,
            situacaoDesemprego: data.situacaoDesemprego,
            estaRecebendoBeneficio: data.estaRecebendoBeneficio,
            paymentDate: paymentDate
        });

        const simulation = await (prisma as any).simulation.create({
            data: {
                tenantId: data.tenantId,
                clienteId: data.clienteId,
                type: 'SOCIAL_SECURITY_LATE',
                inputData: {
                    principal: data.principal,
                    dueDate: data.dueDate,
                    paymentDate: data.paymentDate,
                    competencia: data.competencia,
                    tipoSegurado: data.tipoSegurado,
                    anosEmAtraso: data.anosEmAtraso,
                    possuiComprovacaoAtividade: data.possuiComprovacaoAtividade,
                    competenciaUltima: data.competenciaUltima,
                    maisDe120Contribuicoes: data.maisDe120Contribuicoes,
                    situacaoDesemprego: data.situacaoDesemprego
                } as any,
                resultData: {
                    fine: result.fine.toFixed(2),
                    interest: result.interest.toFixed(2),
                    total: result.total.toFixed(2),
                    selicAcumulada: result.selicAcumulada,
                    risco: risco
                } as any,
            }
        });

        return { simulation, result, risco };
    }
}
