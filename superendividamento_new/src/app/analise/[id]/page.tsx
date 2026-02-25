
import AnalysisWizard from "@/components/AnalysisWizard";
import { Button } from "@/components/ui/button";
import db from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AnalisePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cliente = await db.cliente.findUnique({
        where: { id: Number(id) },
        include: {
            gastos: true,
            dividas: true,
            planos: {
                orderBy: { dataCriacao: 'desc' }
            }
        }
    });

    if (!cliente) return notFound();

    // Convert Decimals to numbers for serialization
    const serializedCliente = {
        ...cliente,
        rendaLiquida: Number(cliente.rendaLiquida),
        gastos: cliente.gastos.map(g => ({ ...g, valor: Number(g.valor) })),
        dividas: cliente.dividas.map(d => ({
            ...d,
            valorContratado: d.valorContratado ? Number(d.valorContratado) : null,
            valorPago: d.valorPago ? Number(d.valorPago) : null,
            saldoAtual: Number(d.saldoAtual),
            taxaJurosMensal: d.taxaJurosMensal ? Number(d.taxaJurosMensal) : null,
            taxaMediaMercado: d.taxaMediaMercado ? Number(d.taxaMediaMercado) : null,
            cet: d.cet ? Number(d.cet) : null,
        })),
        planos: cliente.planos.map(p => ({
            ...p,
            capacidadeMensal: Number(p.capacidadeMensal),
            totalDividaConsolidada: Number(p.totalDividaConsolidada),
            valorParcelaMensal: Number(p.valorParcelaMensal),
            descontoGlobal: p.descontoGlobal ? Number(p.descontoGlobal) : 0,
            carenciaDias: p.carenciaDias ? Number(p.carenciaDias) : 0
        }))
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/clientes" className="text-sm text-slate-500 hover:text-slate-800 mb-1 block">
                        &larr; Voltar
                    </Link>
                    <h2 className="text-3xl font-serif font-bold text-slate-900">
                        Análise de Superendividamento
                    </h2>
                    <p className="text-slate-500">
                        Consumidor: <span className="font-bold text-slate-700">{cliente.nome}</span> (CPF: {cliente.cpf})
                    </p>
                </div>
            </div>

            <AnalysisWizard cliente={serializedCliente} />
        </div>
    );
}
