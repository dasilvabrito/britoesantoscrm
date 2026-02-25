import { Decimal } from '@prisma/client/runtime/library';

/**
 * Módulo de Lógica Jurídica - Lei 14.181/2021 (Lei do Superendividamento)
 */

// Art. 54-A § 1º: Preservação do Mínimo Existencial
export const calcularMinimoExistencial = (gastosEssenciais: { valor: Decimal | number }[]): number => {
    return gastosEssenciais.reduce((acc, gasto) => acc + Number(gasto.valor), 0);
};

// Cálculo da Capacidade de Pagamento (Renda - Mínimo)
export const calcularCapacidadePagamento = (rendaLiquida: number, minimoExistencial: number): number => {
    const capacidade = rendaLiquida - minimoExistencial;
    return capacidade > 0 ? capacidade : 0;
};

// Verificação de Abusividade (Juros > 1.5x Média)
// Embora a lei não defina "1.5x" explicitamente no texto, é um parâmetro jurisprudencial comum.
export const verificarAbusividade = (taxaContrato: number, taxaMedia: number): boolean => {
    if (!taxaContrato || !taxaMedia) return false;
    return taxaContrato > (taxaMedia * 1.5);
};

// Simulação de Plano Judicial Compulsório (Art. 104-B)
export interface ParcelaPrice {
    numero: number;
    data: Date;
    saldoDevedorInicial: number;
    valorParcela: number;
    amortizacao: number;
    juros: number;
    saldoDevedorFinal: number;
}

export interface SimulacaoPlano {
    totalDividaOriginal: number;
    totalDividaConsolidada: number; // Após carência e desconto
    prazoMeses: number;
    valorParcela: number;
    viavel: boolean;
    mensagem: string;
    tabelaPrice: ParcelaPrice[];
    carenciaDias: number;
}

export const simularPlanoJudicial = (
    dividas: { saldoAtual: Decimal | number }[],
    capacidadePagamento: number,
    prazoMeses: number = 60,
    descontoGlobal: number = 0,
    carenciaDias: number = 30, // Default 30 dias
    taxaJurosMensal: number = obterSelicMensal() // Default Selic atual
): SimulacaoPlano => {
    const totalDividaOriginal = dividas.reduce((acc, d) => acc + Number(d.saldoAtual), 0);

    // 1. Aplica Desconto Global (Haircut)
    let saldoComDesconto = totalDividaOriginal * (1 - descontoGlobal / 100);

    // 2. Aplica Juros da Carência (Juros Simples pro-rata dia pode ser usado, mas PDF usa variação)
    // O PDF mostra: Saldo Devedor após carência (+1.1642%)
    // Vamos usar: Saldo * (1 + (taxaMensal/30 * dias))
    // Ou composto: Saldo * (1 + taxaMensal)^(dias/30)

    // Convertendo taxa percentual para decimal
    const i = taxaJurosMensal / 100;

    // Juros compostos pro-rata temporis para a carência
    // Fator = (1 + i)^(dias/30)
    const fatorCarencia = Math.pow(1 + i, carenciaDias / 30);
    const totalDividaConsolidada = saldoComDesconto * fatorCarencia;

    // 3. Sistema Price (Parcelas Fixas)
    // PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)

    // Se a taxa for 0, divisão linear
    let valorParcela = 0;
    if (i === 0) {
        valorParcela = totalDividaConsolidada / prazoMeses;
    } else {
        valorParcela = totalDividaConsolidada * (i * Math.pow(1 + i, prazoMeses)) / (Math.pow(1 + i, prazoMeses) - 1);
    }

    const viavel = valorParcela <= capacidadePagamento;

    let mensagem = "Plano viável dentro da capacidade de pagamento.";
    if (!viavel) {
        mensagem = `Plano inviável. A parcela (R$ ${valorParcela.toFixed(2)}) excede a capacidade (R$ ${capacidadePagamento.toFixed(2)}).`;
    }

    // 4. Gerar Tabela Price
    const tabelaPrice: ParcelaPrice[] = [];
    let saldoDevedor = totalDividaConsolidada;
    const dataBase = new Date();
    dataBase.setDate(dataBase.getDate() + carenciaDias); // Primeiro vencimento após carência

    for (let p = 1; p <= prazoMeses; p++) {
        const juros = saldoDevedor * i;
        const amortizacao = valorParcela - juros;
        const saldoFinal = saldoDevedor - amortizacao;

        // Avançar 1 mês
        const dataParcela = new Date(dataBase);
        dataParcela.setMonth(dataBase.getMonth() + (p - 1));

        tabelaPrice.push({
            numero: p,
            data: dataParcela,
            saldoDevedorInicial: saldoDevedor,
            valorParcela,
            amortizacao,
            juros,
            saldoDevedorFinal: saldoFinal > 0 ? saldoFinal : 0
        });

        saldoDevedor = saldoFinal;
    }

    return {
        totalDividaOriginal,
        totalDividaConsolidada,
        prazoMeses,
        valorParcela,
        viavel,
        mensagem,
        tabelaPrice,
        carenciaDias
    };
};

// Taxa Selic Atual (Meta Anual) - Atualizado em Fev/2026
export const SELIC_ANUAL_ATUAL = 15.00;

export const obterSelicMensal = (): number => {
    // Conversão de Taxa Anual para Mensal: (1 + taxa_anual)^(1/12) - 1
    const taxa = (Math.pow(1 + (SELIC_ANUAL_ATUAL / 100), 1 / 12) - 1) * 100;
    return Number(taxa.toFixed(2)); // Retorna com 2 casas decimais (ex: 1.17)
};
