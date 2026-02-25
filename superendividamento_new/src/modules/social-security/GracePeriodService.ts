/**
 * Serviço para cálculo de Período de Graça (Manutenção da Qualidade de Segurado).
 * Base Legal: Art. 15 da Lei 8.213/91 e Decreto 3.048/99.
 *
 * ⚠️  REGRA RESTRITIVA — SEGURADO FACULTATIVO (Art. 15, II, 'b'):
 *   - Prazo fixo de 6 meses após a última contribuição
 *   - NÃO tem direito à extensão de 24 meses por +120 contribuições
 *   - NÃO tem direito à extensão de 36 meses por desemprego involuntário
 *   - As flags maisDe120Contribuicoes e situacaoDesemprego são IGNORADAS
 */
export class GracePeriodService {

    /**
     * Calcula o número de meses de graça conforme o perfil do segurado.
     * Para FACULTATIVO: sempre 6 meses (sem extensões).
     * Para INDIVIDUAL: 12 + 12 (se +120 contrib.) + 12 (se desemprego) = máx 36.
     */
    static calcularMesesGrace(
        tipoSegurado: 'INDIVIDUAL' | 'FACULTATIVO',
        maisDe120Contribuicoes: boolean,
        situacaoDesemprego: boolean
    ): number {
        if (tipoSegurado === 'FACULTATIVO') {
            // Regra restritiva: APENAS 6 meses. Extensões não se aplicam.
            return 6;
        }
        let meses = 12;
        if (maisDe120Contribuicoes) meses += 12; // Até 24 meses (Art. 15, §2º)
        if (situacaoDesemprego) meses += 12;     // Até 36 meses (Art. 15, §1º)
        return meses;
    }

    /**
     * Calcula a data limite para manutenção da qualidade de segurado.
     */
    static calcularDataLimiteGrace(
        competenciaUltima: string,
        tipoSegurado: 'INDIVIDUAL' | 'FACULTATIVO',
        maisDe120Contribuicoes: boolean = false,
        situacaoDesemprego: boolean = false,
        estaRecebendoBeneficio: boolean = false
    ): Date {
        // Em gozo de benefício: qualidade mantida indefinidamente (Art. 15, I)
        if (estaRecebendoBeneficio) return new Date(2099, 11, 31);

        const [ano, mes] = competenciaUltima.split('-').map(Number);
        // Graça começa no mês seguinte ao da última contribuição
        const dataInicioGrace = new Date(ano, mes, 1);

        const mesesGrace = this.calcularMesesGrace(
            tipoSegurado,
            // Facultativo: ignora as extensões (regra mais restritiva)
            tipoSegurado === 'FACULTATIVO' ? false : maisDe120Contribuicoes,
            tipoSegurado === 'FACULTATIVO' ? false : situacaoDesemprego
        );

        // Fim do prazo de graça puro
        const dataFimPrazo = new Date(dataInicioGrace);
        dataFimPrazo.setMonth(dataFimPrazo.getMonth() + mesesGrace);
        dataFimPrazo.setDate(0); // último dia do mês anterior

        // +1 mês de tolerância conforme Art. 15, §4º (manutenção até o mês seguinte)
        const dataLimiteFinal = new Date(dataFimPrazo);
        dataLimiteFinal.setMonth(dataLimiteFinal.getMonth() + 2);
        dataLimiteFinal.setDate(15);

        return dataLimiteFinal;
    }

    static isDentroDoPeriodo(
        competenciaDesejada: string,
        competenciaUltima: string,
        tipoSegurado: 'INDIVIDUAL' | 'FACULTATIVO',
        maisDe120Contribuicoes: boolean = false,
        situacaoDesemprego: boolean = false,
        dataPagamento: Date = new Date(),
        estaRecebendoBeneficio: boolean = false
    ): {
        dentro: boolean;
        dataLimite: string;
        diasRestantes: number;
        emBeneficio: boolean;
        mesesGrace: number;
        tipoSegurado: 'INDIVIDUAL' | 'FACULTATIVO';
    } {
        // Para facultativo, extensões são IGNORADAS
        const _120 = tipoSegurado === 'FACULTATIVO' ? false : maisDe120Contribuicoes;
        const _desemp = tipoSegurado === 'FACULTATIVO' ? false : situacaoDesemprego;

        const limite = this.calcularDataLimiteGrace(
            competenciaUltima,
            tipoSegurado,
            _120,
            _desemp,
            estaRecebendoBeneficio
        );

        const mesesGrace = estaRecebendoBeneficio
            ? 0
            : this.calcularMesesGrace(tipoSegurado, _120, _desemp);

        // A competência em atraso deve caber dentro do período de graça
        const [compAno, compMes] = competenciaDesejada.split('-').map(Number);
        const dataVencimentoDesejado = new Date(compAno, compMes, 15);
        dataVencimentoDesejado.setMonth(dataVencimentoDesejado.getMonth() + 1);

        const pagamentoDentro = dataPagamento <= limite;
        const competenciaDentro = dataVencimentoDesejado <= limite;

        const dentro = estaRecebendoBeneficio
            || (tipoSegurado === 'FACULTATIVO'
                ? (pagamentoDentro && competenciaDentro)
                : (pagamentoDentro && competenciaDentro));

        const diffTime = limite.getTime() - dataPagamento.getTime();
        const diasRestantes = estaRecebendoBeneficio
            ? 9999
            : Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            dentro,
            dataLimite: estaRecebendoBeneficio
                ? 'Vigente (Em Benefício)'
                : limite.toLocaleDateString('pt-BR'),
            diasRestantes,
            emBeneficio: estaRecebendoBeneficio,
            mesesGrace,
            tipoSegurado,
        };
    }
}
