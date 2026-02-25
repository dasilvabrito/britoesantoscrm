'use server'

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const ClientSchema = z.object({
    nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    cpf: z.string().min(11, "CPF inválido"),
    rendaLiquida: z.coerce.number().min(0, "Renda não pode ser negativa"),
    numeroDependentes: z.coerce.number().int().min(0),
});

export async function createClient(prevState: any, formData: FormData) {
    const validatedFields = ClientSchema.safeParse({
        nome: formData.get("nome"),
        cpf: formData.get("cpf"),
        rendaLiquida: formData.get("rendaLiquida"),
        numeroDependentes: formData.get("numeroDependentes"),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { nome, cpf, rendaLiquida, numeroDependentes } = validatedFields.data;

    try {
        // Buscar o tenant padrão (slug: escritorio-modelo) ou o primeiro disponível
        let tenant = await db.tenant.findUnique({ where: { slug: 'escritorio-modelo' } });
        if (!tenant) tenant = await db.tenant.findFirst();

        if (!tenant) {
            throw new Error("Nenhum Tenant encontrado. Execute o seed do banco de dados.");
        }

        await db.cliente.create({
            data: {
                tenantId: tenant.id,
                nome,
                cpf,
                rendaLiquida,
                numeroDependentes,
            },
        });
    } catch (error) {
        return {
            message: "Erro ao criar cliente. Verifique se o CPF já existe.",
        };
    }

    revalidatePath("/clientes");
    redirect("/clientes");
}
