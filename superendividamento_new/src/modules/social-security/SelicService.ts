/**
 * Serviço para gestão de índices SELIC acumulados para cálculos previdenciários.
 */
export class SelicService {
    // Tabela SELIC Mensal (Mock Realista 2023-2025)
    // Em produção, isso deve ser alimentado por uma API ou Banco de Dados
    private static tabelaSelic: Record<string, number> = {
        "2023-01": 0.0112, "2023-02": 0.0092, "2023-03": 0.0117, "2023-04": 0.0092,
        "2023-05": 0.0112, "2023-06": 0.0107, "2023-07": 0.0107, "2023-08": 0.0114,
        "2023-09": 0.0097, "2023-10": 0.0100, "2023-11": 0.0092, "2023-12": 0.0089,
        "2024-01": 0.0097, "2024-02": 0.0080, "2024-03": 0.0083, "2024-04": 0.0089,
        "2024-05": 0.0083, "2024-06": 0.0079, "2024-07": 0.0091, "2024-08": 0.0087,
        "2024-09": 0.0084, "2024-10": 0.0093, "2024-11": 0.0081, "2024-12": 0.0087,
        "2025-01": 0.0100, "2025-02": 0.0095, "2025-03": 0.0110, "2025-04": 0.0105,
        "2025-05": 0.0098, "2025-06": 0.0102, "2025-07": 0.0107, "2025-08": 0.0101,
        "2025-09": 0.0095, "2025-10": 0.0100, "2025-11": 0.0110, "2025-12": 0.0105,
        "2026-01": 0.0090, "2026-02": 0.0100
    };

    /**
     * Acumula a SELIC entre duas datas (Mês seguinte ao vencimento até o mês anterior ao pagamento).
     * @param dataInicio Data de início da acumulação
     * @param dataFim Data final da acumulação
     */
    static acumularSelic(dataInicio: Date, dataFim: Date): number {
        let acumulado = 0;
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);

        // Ajusta para o primeiro dia do mês para iteração
        inicio.setDate(1);
        fim.setDate(1);

        while (inicio <= fim) {
            const anoMes = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`;
            const taxaMensal = this.tabelaSelic[anoMes] !== undefined
                ? this.tabelaSelic[anoMes]
                : 0.01; // Fallback para taxa média se não houver dados (1% am)

            acumulado += taxaMensal;
            inicio.setMonth(inicio.getMonth() + 1);
        }

        return acumulado;
    }

    /**
     * Retorna a tabela completa para debug ou exibição.
     */
    static getTabela() {
        return this.tabelaSelic;
    }
}
