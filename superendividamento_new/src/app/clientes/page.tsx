import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
    const clients = await db.cliente.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { dividas: true, planos: true }
            }
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900">Gestão de Clientes</h2>
                    <p className="text-slate-500">Consumidores cadastrados no sistema.</p>
                </div>
                <Link href="/clientes/novo">
                    <Button className="shadow-lg hover:shadow-xl transition-all">
                        ➕ Novo Cliente
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome / CPF</TableHead>
                                <TableHead>Renda Líquida</TableHead>
                                <TableHead>Diagnóstico</TableHead>
                                <TableHead>Dívidas</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.map((client) => (
                                <TableRow key={client.id} className="group cursor-pointer hover:bg-slate-50">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">👤</div>
                                            <div>
                                                <div className="font-bold text-slate-800">{client.nome}</div>
                                                <div className="text-xs text-slate-500">{client.cpf}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-emerald-600 font-bold">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(client.rendaLiquida))}
                                    </TableCell>
                                    <TableCell>
                                        {/* Placeholder logic for status */}
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                            Regular
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {client._count.dividas === 0 ? (
                                                <span className="text-slate-400">Nenhuma</span>
                                            ) : (
                                                <span className="font-bold">{client._count.dividas} contratos</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/clientes/${client.id}`}>
                                            <Button variant="outline" size="sm">
                                                📂 Abrir Prontuário
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {clients.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                                        Nenhum cliente encontrado. Cadastre o primeiro!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
