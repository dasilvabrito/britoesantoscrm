'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { simularPlanoJudicial, calcularMinimoExistencial, calcularCapacidadePagamento, SimulacaoPlano } from '@/lib/lei14181';
import { useState, useEffect } from 'react';
import { saveSimulation, deleteSimulation } from '@/app/analise/[id]/actions';
import { generatePDF } from '@/lib/pdfGenerator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SimulationStep({ cliente, onBack }: any) {
    const [prazo, setPrazo] = useState(60);
    const [desconto, setDesconto] = useState(0);
    const [carencia, setCarencia] = useState(30); // Default 30 days
    const [resultado, setResultado] = useState<SimulacaoPlano | null>(null);
    const [use30PercentLimit, setUse30PercentLimit] = useState(false);

    const renda = Number(cliente.rendaLiquida);
    const gastos = calcularMinimoExistencial(cliente.gastos);

    // Calculate Capacity
    let capacidade = calcularCapacidadePagamento(renda, gastos);

    // Apply 30% Limit Logic if enabled
    const limite30 = renda * 0.30;
    if (use30PercentLimit && capacidade > limite30) {
        capacidade = limite30;
    }

    useEffect(() => {
        // Run simulation whenever inputs change
        const res = simularPlanoJudicial(cliente.dividas, capacidade, prazo, desconto, carencia);
        setResultado(res);
    }, [cliente.dividas, capacidade, prazo, desconto, carencia]);

    const handleSave = async () => {
        if (!resultado) return;
        await saveSimulation(cliente.id, {
            prazoMeses: resultado.prazoMeses,
            capacidadeMensal: capacidade,
            totalDividaConsolidada: resultado.totalDividaConsolidada,
            valorParcelaMensal: resultado.valorParcela,
            descontoGlobal: desconto,
            carenciaDias: carencia
        });
        alert("Plano salvo com sucesso!");
    };

    const handleDelete = async (id: number) => {
        if (confirm("Tem certeza que deseja excluir esta simulação?")) {
            await deleteSimulation(cliente.id, id);
        }
    };

    const handleLoad = (plano: any) => {
        setPrazo(plano.prazoMeses);
        // Default to current values if saved plan doesn't have them (legacy support)
        setDesconto(plano.descontoGlobal || 0);
        setCarencia(plano.carenciaDias || 30);

        // We can't easily restore the "30% limit" state just from the plan unless we saved it, 
        // but we can infer or Just leave it as is. 
        // Ideally we would save that flag too, but it wasn't explicitly requested to be persistent.
    };

    const handleGeneratePDF = async () => {
        if (!resultado) return;
        await generatePDF(cliente, resultado, capacidade, gastos);
    };

    if (!resultado) return <div>Carregando simulação...</div>;

    const savedPlans = cliente.planos || [];

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h3 className="text-2xl font-serif font-bold text-slate-900">Plano de Pagamento Judicial</h3>
                <p className="text-slate-500">Simulação baseada no Art. 104-B da Lei 14.181/2021.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Controls */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Parâmetros do Plano</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* 30% Limit Switch */}
                        <div className="flex items-center space-x-2 border-b pb-4">
                            <Switch
                                id="limit-30"
                                checked={use30PercentLimit}
                                onCheckedChange={setUse30PercentLimit}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="limit-30">Limitar a 30% da Renda</Label>
                                <p className="text-xs text-slate-500">
                                    Restringe a capacidade de pagamento a {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(limite30)}.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Prazo de Pagamento (Meses)</label>
                            <div className="flex gap-2">
                                {[12, 24, 36, 48, 60].map(m => (
                                    <Button
                                        key={m}
                                        variant={prazo === m ? "default" : "outline"}
                                        onClick={() => setPrazo(m)}
                                        className="flex-1"
                                    >
                                        {m}x
                                    </Button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Máximo legal: 60 meses (5 anos).</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Carência (Dias)</label>
                            <div className="flex gap-2">
                                {[30, 60, 90, 120, 180].map(d => (
                                    <Button
                                        key={d}
                                        variant={carencia === d ? "default" : "outline"}
                                        onClick={() => setCarencia(d)}
                                        className="flex-1 text-xs"
                                    >
                                        {d} dias
                                    </Button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Prazo para pagar a 1ª parcela (Max: 180 dias).</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Desconto Global (Haircut) %</label>
                            <input
                                type="range" min="0" max="90" step="5"
                                value={desconto} onChange={(e) => setDesconto(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-right font-bold text-slate-900">{desconto}%</div>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="flex justify-between text-sm mb-2">
                                <span>Capacidade Mensal:</span>
                                <span className={`font-bold ${use30PercentLimit ? "text-amber-600" : ""}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(capacidade)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Renda Preservada (Mínimo):</span>
                                <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(renda - capacidade)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                <div className="space-y-4">
                    <Card className={resultado.viavel ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}>
                        <CardHeader>
                            <CardTitle className={resultado.viavel ? "text-emerald-800" : "text-red-800"}>
                                {resultado.viavel ? "✅ Plano Viável" : "❌ Plano Inviável"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold mb-2 text-slate-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado.valorParcela)}
                                <span className="text-sm font-normal text-slate-500 ml-2">/ mês</span>
                            </div>
                            <p className="text-sm text-slate-700 mb-4">{resultado.mensagem}</p>

                            <div className="space-y-2 text-sm border-t border-slate-200/50 pt-4">
                                <div className="flex justify-between">
                                    <span>Dívida Original:</span>
                                    <span className="line-through text-slate-400">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado.totalDividaOriginal)}
                                    </span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-700">
                                    <span>Após Carência ({carencia}d):</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado.totalDividaConsolidada)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-900 mt-2">
                                    <span>Total do Plano:</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado.valorParcela * resultado.prazoMeses)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button onClick={handleSave} className="w-full" size="lg" disabled={!resultado.viavel}>
                        💾 Salvar Simulação
                    </Button>
                    <Button onClick={handleGeneratePDF} variant="outline" className="w-full" disabled={!resultado.viavel}>
                        📄 Gerar PDF Detalhado
                    </Button>
                </div>
            </div>

            {/* Saved Simulations List */}
            {savedPlans.length > 0 && (
                <div className="mt-12 border-t pt-8">
                    <h3 className="text-xl font-bold font-serif text-slate-900 mb-4">Simulações Salvas</h3>
                    <div className="border rounded-lg overflow-hidden bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Prazo</TableHead>
                                    <TableHead>Parcela</TableHead>
                                    <TableHead>Total Consolidado</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {savedPlans.map((p: any) => (
                                    <TableRow key={p.id}>
                                        <TableCell>{new Date(p.dataCriacao).toLocaleDateString()}</TableCell>
                                        <TableCell>{p.prazoMeses}x</TableCell>
                                        <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valorParcelaMensal)}</TableCell>
                                        <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.totalDividaConsolidada)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleLoad(p)}>
                                                    Carregar
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    Excluir
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <div className="flex justify-start pt-6 border-t mt-6">
                <Button onClick={onBack} variant="outline" size="lg">
                    &larr; Voltar
                </Button>
            </div>
        </div>
    );
}
