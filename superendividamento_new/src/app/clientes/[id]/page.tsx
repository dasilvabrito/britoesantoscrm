import db from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cliente = await db.cliente.findUnique({
        where: { id: Number(id) },
        include: {
            _count: {
                select: { dividas: true, planos: true }
            },
            gastos: true,
            dividas: true
        }
    });

    if (!cliente) return notFound();

    // Basic stats
    const totalDividas = cliente.dividas.reduce((acc, d) => acc + Number(d.saldoAtual), 0);
    const totalGastos = cliente.gastos.reduce((acc, g) => acc + Number(g.valor), 0);
    const renda = Number(cliente.rendaLiquida);
    const comprometimento = renda > 0 ? (totalGastos / renda) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Link href="/clientes" className="text-sm text-slate-500 hover:text-slate-800 mb-1 block">
                        &larr; Voltar para Lista
                    </Link>
                    <h2 className="text-3xl font-serif font-bold text-slate-900">{cliente.nome}</h2>
                    <p className="text-slate-500">CPF: {cliente.cpf} • Cadastro: {cliente.createdAt.toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/analise/${cliente.id}`}>
                        <Button className="bg-slate-900 shadow-lg hover:bg-slate-800">
                            🚀 Iniciar Análise Judicial
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Renda Líquida</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(renda)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Mínimo Existencial (Gastos)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGastos)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{comprometimento.toFixed(1)}% da renda</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total de Dívidas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDividas)}
                        </div>
                        <div className="mt-1">
                            <Badge variant="outline">{cliente._count.dividas} contratos</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions / Recent Activity Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Resumo do Caso</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {cliente._count.planos > 0 ? (
                            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg">
                                ✅ Possui {cliente._count.planos} simulação de plano judicial salva.
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 text-slate-600 rounded-lg">
                                Nenhuma simulação realizada ainda. Clique em "Iniciar Análise Judicial" para começar.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
