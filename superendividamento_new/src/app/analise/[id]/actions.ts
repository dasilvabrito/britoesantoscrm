'use server'

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const GastoSchema = z.object({
    tipo: z.string().min(1, "Selecione o tipo"),
    valor: z.coerce.number().min(0.01, "Valor inválido"),
    descricao: z.string().optional(),
});

const DividaSchema = z.object({
    credor: z.string().min(1),
    tipo: z.string(),
    numeroContrato: z.string().optional(),
    saldoAtual: z.coerce.number().min(0),
    taxaJurosMensal: z.coerce.number().min(0).optional(),
    taxaMediaMercado: z.coerce.number().min(0).optional(),
});

// Helper for currency parsing
function parseCurrency(value: FormDataEntryValue | null): number | undefined {
    if (!value || typeof value !== 'string') return undefined;

    // Remove currency symbols and whitespace
    let clean = value.replace(/[R$\s]/g, '');

    // Check if it uses comma as decimal separator (e.g. 1.200,50 or 1200,50)
    if (clean.includes(',')) {
        // Remove thousands separators (dots) if present
        if (clean.includes('.')) {
            clean = clean.replace(/\./g, '');
        }
        // Replace decimal separator
        clean = clean.replace(',', '.');
    }

    const num = parseFloat(clean);
    return isNaN(num) ? undefined : num;
}

// --- Expenses Actions ---
export async function manageExpense(clienteId: number, prevState: any, formData: FormData) {
    const id = formData.get("id");
    const valorRaw = formData.get("valor");
    const valorParsed = parseCurrency(valorRaw);

    const validated = GastoSchema.safeParse({
        tipo: formData.get("tipo"),
        valor: valorParsed,
        descricao: formData.get("descricao") || undefined,
    });

    if (!validated.success) {
        console.error("Erro validação:", validated.error);
        return { error: "Dados inválidos: " + validated.error.issues.map(e => e.message).join(", ") };
    }

    try {
        if (id) {
            await db.gastoEssencial.update({
                where: { id: Number(id) },
                data: {
                    tipo: validated.data.tipo,
                    valor: validated.data.valor,
                    descricao: validated.data.descricao || "",
                }
            });
        } else {
            await db.gastoEssencial.create({
                data: {
                    clienteId,
                    tipo: validated.data.tipo,
                    valor: validated.data.valor,
                    descricao: validated.data.descricao || "",
                }
            });
        }

        revalidatePath(`/analise/${clienteId}`);
        return { message: "Salvo com sucesso!", success: true };
    } catch (e) {
        return { error: "Erro ao salvar" };
    }
}

export async function removeExpense(clienteId: number, id: number) {
    await db.gastoEssencial.delete({ where: { id } });
    revalidatePath(`/analise/${clienteId}`);
}

// --- Debts Actions ---
export async function manageDebt(clienteId: number, prevState: any, formData: FormData) {
    const id = formData.get("id");

    //console.log("Manage Debt ID:", id);

    const validated = DividaSchema.safeParse({
        credor: formData.get("credor"),
        tipo: formData.get("tipo"),
        numeroContrato: formData.get("numeroContrato"),
        saldoAtual: formData.get("saldoAtual"),
        taxaJurosMensal: formData.get("taxaJurosMensal"),
        taxaMediaMercado: formData.get("taxaMediaMercado"),
    });

    if (!validated.success) {
        return { message: "Dados inválidos. Verifique os campos." };
    }

    try {
        if (id) {
            await db.divida.update({
                where: { id: Number(id) },
                data: {
                    credor: validated.data.credor,
                    tipo: validated.data.tipo,
                    numeroContrato: validated.data.numeroContrato || "",
                    saldoAtual: validated.data.saldoAtual,
                    taxaJurosMensal: validated.data.taxaJurosMensal,
                    taxaMediaMercado: validated.data.taxaMediaMercado,
                }
            });
            return { message: "Dívida atualizada com sucesso!", success: true };
        } else {
            await db.divida.create({
                data: {
                    clienteId,
                    credor: validated.data.credor,
                    tipo: validated.data.tipo,
                    numeroContrato: validated.data.numeroContrato || "",
                    saldoAtual: validated.data.saldoAtual,
                    taxaJurosMensal: validated.data.taxaJurosMensal,
                    taxaMediaMercado: validated.data.taxaMediaMercado,
                }
            });
            return { message: "Dívida adicionada com sucesso!", success: true };
        }
    } catch (e) {
        console.error("Database Error:", e);
        return { message: "Erro ao salvar no banco de dados." };
    } finally {
        revalidatePath(`/analise/${clienteId}`);
    }
}

export async function removeDebt(clienteId: number, id: number) {
    await db.divida.delete({ where: { id } });
    revalidatePath(`/analise/${clienteId}`);
}

// --- Simulation Action ---
// --- Simulation Action ---
export async function saveSimulation(clienteId: number, dataset: any) {
    // Save a snapshot of the plan
    await db.planoPagamento.create({
        data: {
            clienteId,
            prazoMeses: dataset.prazoMeses,
            capacidadeMensal: dataset.capacidadeMensal,
            totalDividaConsolidada: dataset.totalDividaConsolidada,
            valorParcelaMensal: dataset.valorParcelaMensal,
            descontoGlobal: dataset.descontoGlobal,
            carenciaDias: dataset.carenciaDias
        }
    });
    revalidatePath(`/analise/${clienteId}`);
}

export async function deleteSimulation(clienteId: number, simulationId: number) {
    await db.planoPagamento.delete({
        where: { id: simulationId }
    });
    revalidatePath(`/analise/${clienteId}`);
}
