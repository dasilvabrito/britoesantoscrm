'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateTaxExclusionAction } from './actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Landmark, TrendingUp, ShieldCheck, FileText } from 'lucide-react';
import { generateSimulationPDF } from '@/lib/simulationPdfGenerator';

export default function TaxExclusionPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleExportPDF = () => {
        if (!result) return;
        generateSimulationPDF({
            type: 'TAX_EXCLUSION_ICMS',
            inputData: result,
            resultData: result,
            createdAt: new Date(),
        });
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        const data = await calculateTaxExclusionAction(formData);

        setResult(data);
        setLoading(false);
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tese do Século</h1>
                    <p className="text-muted-foreground">Exclusão do ICMS da base de cálculo do PIS e da COFINS (RE 574.706).</p>
                </div>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">Módulo Tributário</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Dados do Faturamento</CardTitle>
                        <CardDescription>Informe os valores mensais ou acumulados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="grossRevenue">Receita Bruta (R$)</Label>
                                <Input id="grossRevenue" name="grossRevenue" type="number" step="0.01" required defaultValue="100000.00" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="taxToBeExcludedValue">ICMS Destacado na Nota (R$)</Label>
                                <Input id="taxToBeExcludedValue" name="taxToBeExcludedValue" type="number" step="0.01" required defaultValue="18000.00" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="pisRate">Alíquota PIS (%)</Label>
                                    <Input id="pisRate" name="pisRate" type="number" step="0.01" required defaultValue="1.65" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cofinsRate">Alíquota COFINS (%)</Label>
                                    <Input id="cofinsRate" name="cofinsRate" type="number" step="0.01" required defaultValue="7.6" />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                {loading ? 'Processando Tese...' : 'Calcular Crédito'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2">
                    {result ? (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="bg-blue-50/50 border-blue-200">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-blue-700 font-semibold flex items-center gap-1">
                                            <TrendingUp className="w-4 h-4" />
                                            Crédito Recuperável
                                        </CardDescription>
                                        <CardTitle className="text-3xl font-bold text-blue-900">R$ {result.recoverableCredit}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Redução Proporcional</CardDescription>
                                        <CardTitle className="text-3xl font-bold">
                                            {((parseFloat(result.recoverableCredit) / parseFloat(result.originalPisCofins)) * 100).toFixed(1)}%
                                        </CardTitle>
                                    </CardHeader>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Landmark className="w-5 h-5 text-blue-600" />
                                        Memória de Cálculo - PIS/COFINS
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Metodologia</TableHead>
                                                <TableHead className="text-right">Cenário Original</TableHead>
                                                <TableHead className="text-right">Cenário Com Exclusão</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">Base de Cálculo</TableCell>
                                                <TableCell className="text-right">R$ {result.grossRevenue}</TableCell>
                                                <TableCell className="text-right">R$ {(parseFloat(result.grossRevenue) - (parseFloat(result.grossRevenue) * 0.18)).toFixed(2)} (Ref. ICMS)</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">PIS/COFINS Apurado</TableCell>
                                                <TableCell className="text-right">R$ {result.originalPisCofins}</TableCell>
                                                <TableCell className="text-right">R$ {result.newPisCofins}</TableCell>
                                            </TableRow>
                                            <TableRow className="bg-blue-600/5 font-bold">
                                                <TableCell className="text-blue-700">Diferença (Crédito)</TableCell>
                                                <TableCell colSpan={2} className="text-right text-blue-700">R$ {result.recoverableCredit}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            <div className="p-4 bg-muted/50 border rounded-lg flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5" />
                                <div className="text-xs text-muted-foreground">
                                    <p className="font-semibold text-foreground mb-1">Fundamento Jurídico Consolidado:</p>
                                    O STF decidiu, no julgamento do RE 574.706 (Tema 69), que o ICMS faturado não compõe a base de cálculo para a incidência do PIS e da COFINS, pois não constitui receita bruta ou faturamento da empresa.
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button className="flex-1 bg-blue-700 hover:bg-blue-800 gap-2" onClick={handleExportPDF}>
                                    <FileText className="w-4 h-4" />
                                    Gerar Memorial (PDF)
                                </Button>
                                <Button variant="outline" className="flex-1">Exportar XML/SPED</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl grayscale opacity-50">
                            <Landmark className="w-16 h-16 mb-4" />
                            <p className="text-muted-foreground font-medium">Informe os dados da empresa para simular a exclusão.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
