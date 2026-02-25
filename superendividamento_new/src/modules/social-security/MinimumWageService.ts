/**
 * Serviço para gestão do histórico de Salário Mínimo Nacional (Brasil).
 */
export class MinimumWageService {
    // Tabela Histórica (Variações mensais suportadas)
    private static historico: Record<string, number> = {
        // 2020
        "2020-01": 1039.00,
        "2020-02": 1045.00, "2020-03": 1045.00, "2020-04": 1045.00, "2020-05": 1045.00,
        "2020-06": 1045.00, "2020-07": 1045.00, "2020-08": 1045.00, "2020-09": 1045.00,
        "2020-10": 1045.00, "2020-11": 1045.00, "2020-12": 1045.00,
        // 2021
        "2021-01": 1100.00, "2021-02": 1100.00, "2021-03": 1100.00, "2021-04": 1100.00,
        "2021-05": 1100.00, "2021-06": 1100.00, "2021-07": 1100.00, "2021-08": 1100.00,
        "2021-09": 1100.00, "2021-10": 1100.00, "2021-11": 1100.00, "2021-12": 1100.00,
        // 2022
        "2022-01": 1212.00, "2022-02": 1212.00, "2022-03": 1212.00, "2022-04": 1212.00,
        "2022-05": 1212.00, "2022-06": 1212.00, "2022-07": 1212.00, "2022-08": 1212.00,
        "2022-09": 1212.00, "2022-10": 1212.00, "2022-11": 1212.00, "2022-12": 1212.00,
        // 2023
        "2023-01": 1302.00, "2023-02": 1302.00, "2023-03": 1302.00, "2023-04": 1302.00,
        "2023-05": 1320.00, "2023-06": 1320.00, "2023-07": 1320.00, "2023-08": 1320.00,
        "2023-09": 1320.00, "2023-10": 1320.00, "2023-11": 1320.00, "2023-12": 1320.00,
        // 2024
        "2024-01": 1412.00, "2024-02": 1412.00, "2024-03": 1412.00, "2024-04": 1412.00,
        "2024-05": 1412.00, "2024-06": 1412.00, "2024-07": 1412.00, "2024-08": 1412.00,
        "2024-09": 1412.00, "2024-10": 1412.00, "2024-11": 1412.00, "2024-12": 1412.00,
        // 2025
        "2025-01": 1518.00, "2025-02": 1518.00, "2025-03": 1518.00, "2025-04": 1518.00,
        "2025-05": 1518.00, "2025-06": 1518.00, "2025-07": 1518.00, "2025-08": 1518.00,
        "2025-09": 1518.00, "2025-10": 1518.00, "2025-11": 1518.00, "2025-12": 1518.00,
        // 2026
        "2026-01": 1621.00, "2026-02": 1621.00, "2026-03": 1621.00, "2026-04": 1621.00,
        "2026-05": 1621.00, "2026-06": 1621.00, "2026-07": 1621.00, "2026-08": 1621.00,
        "2026-09": 1621.00, "2026-10": 1621.00, "2026-11": 1621.00, "2026-12": 1621.00,
    };

    /**
     * Obtém o salário mínimo para uma competência ou data específica.
     * @param data Date, number (ano) ou string "YYYY-MM" ou "MM/YYYY"
     */
    static obterSalarioMinimo(data: Date | string | number): number {
        let key = "";
        if (typeof data === 'number') {
            // Recebeu apenas o ano — usa o mês atual como referência
            const mes = String(new Date().getMonth() + 1).padStart(2, '0');
            key = `${data}-${mes}`;
        } else if (data instanceof Date) {
            key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        } else if (String(data).includes('-')) {
            key = String(data).substring(0, 7); // "YYYY-MM"
        } else if (String(data).includes('/')) {
            // MM/YYYY -> YYYY-MM
            const [m, y] = String(data).split('/');
            key = `${y}-${m.padStart(2, '0')}`;
        }

        return this.historico[key] || 1621.00; // Fallback para o último valor conhecido
    }

    /**
     * Lista feriados nacionais fixos para ajuste de vencimento.
     */
    static isFeriadoNacional(date: Date): boolean {
        const dia = date.getDate();
        const mes = date.getMonth() + 1;

        const feriados = [
            "1-1",   // Ano Novo
            "21-4",  // Tiradentes
            "1-5",   // Dia do Trabalho
            "7-9",   // Independência
            "12-10", // Padroeira
            "2-11",  // Finados
            "15-11", // Proclamação República
            "25-12"  // Natal
        ];

        return feriados.includes(`${dia}-${mes}`);
    }

    /**
     * Calcula o vencimento (dia 10) com regra de antecipação.
     * Regra ajustada conforme solicitação do usuário: Dia 10 do próprio mês.
     */
    static calcularVencimentoAntecipado(competencia: string): Date {
        // Assume competência no formato "YYYY-MM"
        const date = new Date(competencia + "-10T12:00:00");

        // Antecipar se for final de semana ou feriado
        while (date.getDay() === 0 || date.getDay() === 6 || this.isFeriadoNacional(date)) {
            date.setDate(date.getDate() - 1);
        }

        return date;
    }
}
