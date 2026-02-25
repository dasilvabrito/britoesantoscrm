'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateBankingAction } from './actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartSpline, ArrowDownToLine, ReceiptText } from 'lucide-react';
import { generateSimulationPDF } from '@/lib/simulationPdfGenerator';

export default function BankingRevisionPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleExportPDF = () => {
        if (!result) return;
        generateSimulationPDF({
            type: 'BANK_REVISION',
            inputData: result.inputData,
            resultData: result.resultData,
            createdAt: new Date(),
        });
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        const data = await calculateBankingAction(formData);

        setResult(data);
        setLoading(false);
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Revisão Bancária</h1>
                    <p className="text-muted-foreground">Compare taxas contratadas com taxas de mercado ou abusivas.</p>
                </div>
                <Badge variant="secondary" className="px-3 py-1">Módulo Bancário</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Dados do Contrato</CardTitle>
                        <CardDescription>Insira os valores do financiamento/empréstimo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="principal">Valor Financiado (R$)</Label>
                                <Input id="principal" name="principal" type="number" step="0.01" required defaultValue="50000.00" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contractedRate">Taxa Contratada (% am)</Label>
                                    <Input id="contractedRate" name="contractedRate" type="number" step="0.01" required defaultValue="2.5" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="recalculatedRate">Taxa Revisada (% am)</Label>
                                    <Input id="recalculatedRate" name="recalculatedRate" type="number" step="0.01" required defaultValue="1.8" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="totalPeriods">Número de Parcelas</Label>
                                <Input id="totalPeriods" name="totalPeriods" type="number" required defaultValue="48" />
                            </div>

                            <div className="space-y-2">
                                <Label>Sistema de Amortização</Label>
                                <Select name="type" defaultValue="PRICE">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o sistema" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PRICE">Tabela Price (Parcelas Fixas)</SelectItem>
                                        <SelectItem value="SAC">SAC (Amortização Constante)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Processando...' : 'Simular Revisão'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-8">
                    {result ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="bg-destructive/5 border-destructive/20">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-destructive font-medium">Extra Pago Abusivamente</CardDescription>
                                        <CardTitle className="text-2xl text-destructive font-bold">R$ {result.difference}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="bg-green-500/5 border-green-500/20">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-green-600 font-medium">Economia Potencial</CardDescription>
                                        <CardTitle className="text-2xl text-green-600 font-bold">{result.savingsPercentage}%</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="bg-primary/5 border-primary/20">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-primary font-medium">Nova Parcela Estimada</CardDescription>
                                        <CardTitle className="text-2xl text-primary font-bold">R$ {result.recalculatedPmt}</CardTitle>
                                    </CardHeader>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ChartSpline className="w-5 h-5" />
                                        Comparação de Cenários
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Métrica</TableHead>
                                                <TableHead className="text-right">Contratado</TableHead>
                                                <TableHead className="text-right">Recalculado</TableHead>
                                                <TableHead className="text-right text-green-600">Diferença</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">Valor da Parcela</TableCell>
                                                <TableCell className="text-right">R$ {result.contractedPmt}</TableCell>
                                                <TableCell className="text-right">R$ {result.recalculatedPmt}</TableCell>
                                                <TableCell className="text-right text-green-600">R$ {(parseFloat(result.contractedPmt) - parseFloat(result.recalculatedPmt)).toFixed(2)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Total Pago</TableCell>
                                                <TableCell className="text-right">R$ {result.contractedTotal}</TableCell>
                                                <TableCell className="text-right">R$ {result.recalculatedTotal}</TableCell>
                                                <TableCell className="text-right text-green-600 font-bold">R$ {result.difference}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            <div className="flex gap-4">
                                <Button className="flex-1 gap-2">
                                    <ReceiptText className="w-4 h-4" />
                                    Gerar Laudo Pericial (PDF)
                                </Button>
                                <Button variant="outline" className="flex-1 gap-2" onClick={handleExportPDF}>
                                    <ArrowDownToLine className="w-4 h-4" />
                                    Baixar Memorial (PDF)
                                </Button>
                                <Button className="flex-1">Formalizar Planilha</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-xl bg-muted/30">
                            <ChartSpline className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold text-muted-foreground">Aguardando Parâmetros</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">Preencha os dados ao lado para ver a comparação entre as taxas de juros.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
