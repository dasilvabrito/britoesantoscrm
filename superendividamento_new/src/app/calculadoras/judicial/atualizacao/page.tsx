'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { calculateJudicialAction } from './actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generateSimulationPDF } from '@/lib/simulationPdfGenerator';
import { Download, Plus, Trash2, Calculator, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Entry {
    id: string;
    date: string;
    value: string;
    type: 'DEBIT' | 'CREDIT';
    remuneratoryRate: string;
    moraRate: string;
    repeatIndebito: boolean;
}

export default function JudicialUpdatePage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [entries, setEntries] = useState<Entry[]>([
        {
            id: Math.random().toString(),
            date: '2024-03-10',
            value: '1000.00',
            type: 'DEBIT',
            remuneratoryRate: '0',
            moraRate: '1.0',
            repeatIndebito: false
        }
    ]);

    const addEntry = () => {
        setEntries([...entries, {
            id: Math.random().toString(),
            date: '2024-03-10',
            value: '',
            type: 'DEBIT',
            remuneratoryRate: '0',
            moraRate: '1.0',
            repeatIndebito: false
        }]);
    };

    const removeEntry = (id: string) => {
        if (entries.length > 1) {
            setEntries(entries.filter(e => e.id !== id));
        }
    };

    const updateEntry = (id: string, field: keyof Entry, value: any) => {
        setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const toggleRepeatIndebito = (id: string) => {
        setEntries(entries.map(e => e.id === id ? { ...e, repeatIndebito: !e.repeatIndebito } : e));
    };

    const handleExportPDF = () => {
        if (!result) return;
        generateSimulationPDF({
            type: 'JUDICIAL_UPDATE',
            inputData: result.inputData,
            resultData: result.resultData,
            createdAt: new Date(),
        });
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        // Enviamos as entries como JSON
        formData.append('entries', JSON.stringify(entries));

        const data = await calculateJudicialAction(formData);

        setResult(data);
        setLoading(false);
    }

    return (
        <div className="container mx-auto py-10 space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Atualização Judicial Pro</h1>
                    <p className="text-muted-foreground italic">Execução complexa: Lançamentos em série, Amortizações e Verbas do CPC.</p>
                </div>
                {result && (
                    <Button variant="outline" className="gap-2 border-slate-900 text-slate-900 border-2" onClick={handleExportPDF}>
                        <Download className="w-4 h-4" />
                        Exportar Relatório
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Painel de Entrada */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card className="border-2 shadow-lg">
                            <CardHeader className="bg-slate-50 border-b">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg">Lançamentos (Débitos e Créditos)</CardTitle>
                                        <CardDescription>Adicione o principal e eventuais amortizações pagas.</CardDescription>
                                    </div>
                                    <Button type="button" size="sm" onClick={addEntry} className="gap-2 bg-slate-900">
                                        <Plus className="w-4 h-4" /> Novo Lançamento
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="w-[140px] py-4">Data</TableHead>
                                            <TableHead className="w-[100px]">Tipo</TableHead>
                                            <TableHead>Valor Orig. (R$)</TableHead>
                                            <TableHead className="w-[80px]">Remun.%</TableHead>
                                            <TableHead className="w-[80px]">Mora %</TableHead>
                                            <TableHead className="w-[120px] text-center">Indébito</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y">
                                        {entries.map((entry) => (
                                            <TableRow key={entry.id} className={entry.repeatIndebito ? "bg-amber-50/20" : ""}>
                                                <TableCell className="py-4">
                                                    <Input
                                                        type="date"
                                                        value={entry.date}
                                                        onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                                                        required
                                                        className="h-8 text-[11px] font-mono border-slate-200"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={entry.type}
                                                        onValueChange={(val) => updateEntry(entry.id, 'type', val as any)}
                                                    >
                                                        <SelectTrigger className="h-8 text-[11px] border-slate-200">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="DEBIT">Débito</SelectItem>
                                                            <SelectItem value="CREDIT">Amort.</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={entry.value}
                                                        onChange={(e) => updateEntry(entry.id, 'value', e.target.value)}
                                                        required
                                                        placeholder="0,00"
                                                        className="h-8 text-xs font-mono border-slate-200 shadow-inner"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={entry.remuneratoryRate}
                                                        onChange={(e) => updateEntry(entry.id, 'remuneratoryRate', e.target.value)}
                                                        className="h-8 text-xs font-mono border-slate-200"
                                                        placeholder="0"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={entry.moraRate}
                                                        onChange={(e) => updateEntry(entry.id, 'moraRate', e.target.value)}
                                                        className="h-8 text-xs font-mono border-slate-200"
                                                        placeholder="1.0"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={entry.repeatIndebito ? "default" : "outline"}
                                                        className={`h-7 text-[10px] w-full px-2 uppercase tracking-tighter ${entry.repeatIndebito ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                                                        onClick={() => toggleRepeatIndebito(entry.id)}
                                                    >
                                                        {entry.repeatIndebito ? "Repetir (x2)" : "Repetir?"}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeEntry(entry.id)}
                                                        className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                                        disabled={entries.length === 1}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Verbas da Execução */}
                            <Card className="border-2">
                                <CardHeader className="pb-3 border-b bg-slate-50">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Calculator className="w-4 h-4" /> Verbas da Execução (CPC)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm uppercase font-bold text-slate-700">Multa Art. 523, §1º</Label>
                                                <p className="text-[10px] text-muted-foreground uppercase">10% sobre o débito</p>
                                            </div>
                                            <Switch name="fineArt523" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm uppercase font-bold text-slate-700">Honorários Art. 523, §1º (%)</Label>
                                            <Input name="feesArt523" type="number" step="0.1" placeholder="0.0" defaultValue="0" className="h-9" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm uppercase font-bold text-slate-700">Honorários Sucumbenciais (%)</Label>
                                            <Input name="feesSucumbenciais" type="number" step="0.1" placeholder="0.0" defaultValue="10" className="h-9" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Índices e Juros */}
                            <Card className="border-2">
                                <CardHeader className="pb-3 border-b bg-slate-50">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Parâmetros de Correção
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Correção Pré-2021</Label>
                                        <Select name="preECIndex" defaultValue="IPCA-E">
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="IPCA-E">IPCA-E</SelectItem>
                                                <SelectItem value="INPC">INPC</SelectItem>
                                                <SelectItem value="TR">TR</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Juros de Mora (%)</Label>
                                        <Input name="interestRate" type="number" step="0.1" defaultValue="1.0" className="h-9" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Data Final do Cálculo</Label>
                                        <Input name="endDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="h-9" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase">Aplicar SELIC (Pós EC 113)?</Label>
                                        <Switch name="useSelic" defaultChecked />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Button type="submit" className="w-full bg-slate-900 h-12 text-lg font-bold" disabled={loading}>
                            {loading ? 'Calculando Execução...' : 'Processar Cálculos e Gerar Memorial'}
                        </Button>
                    </form>
                </div>

                {/* Painel de Resultados */}
                <div className="lg:col-span-12 xl:col-span-5">
                    {result ? (
                        <Card className="border-2 border-slate-900 shadow-2xl h-fit overflow-hidden sticky top-4">
                            <CardHeader className="bg-slate-900 text-white">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-amber-500 text-slate-900 border-none">MEMORIAL</Badge>
                                        Resumo da Execução
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="p-6 bg-slate-50 border-b space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                                        <span>Total Geral da Planilha</span>
                                        <span className="text-slate-900">R$ {result.total}</span>
                                    </div>
                                    <div className="text-4xl font-black text-slate-900 tracking-tighter">
                                        R$ {result.total}
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <Table>
                                        <TableBody>
                                            <TableRow className="border-slate-200">
                                                <TableCell className="px-0 py-3 font-semibold text-slate-600">Subtotal Atualizado</TableCell>
                                                <TableCell className="px-0 py-3 text-right font-bold">R$ {result.subtotal}</TableCell>
                                            </TableRow>
                                            <TableRow className="border-slate-200">
                                                <TableCell className="px-0 py-3 text-sm text-slate-500 italic">— Correção Monetária</TableCell>
                                                <TableCell className="px-0 py-3 text-right text-sm">R$ {result.correction}</TableCell>
                                            </TableRow>
                                            <TableRow className="border-slate-200">
                                                <TableCell className="px-0 py-3 text-sm text-slate-500 italic">— Juros Calculados</TableCell>
                                                <TableCell className="px-0 py-3 text-right text-sm">R$ {result.interest}</TableCell>
                                            </TableRow>

                                            {/* Verbas CPC */}
                                            {parseFloat(result.fine523) > 0 && (
                                                <TableRow className="border-slate-200 bg-amber-50/30">
                                                    <TableCell className="px-0 py-3 font-semibold text-amber-800">Multa Art. 523 (10%)</TableCell>
                                                    <TableCell className="px-0 py-3 text-right font-bold text-amber-800">R$ {result.fine523}</TableCell>
                                                </TableRow>
                                            )}
                                            {parseFloat(result.fees523) > 0 && (
                                                <TableRow className="border-slate-200 bg-amber-50/30">
                                                    <TableCell className="px-0 py-3 font-semibold text-amber-800">Honorários Art. 523</TableCell>
                                                    <TableCell className="px-0 py-3 text-right font-bold text-amber-800">R$ {result.fees523}</TableCell>
                                                </TableRow>
                                            )}
                                            {parseFloat(result.feesSucumbenciais) > 0 && (
                                                <TableRow className="border-slate-200">
                                                    <TableCell className="px-0 py-3 font-semibold text-slate-600">Honorários Sucumbenciais</TableCell>
                                                    <TableCell className="px-0 py-3 text-right font-bold">R$ {result.feesSucumbenciais}</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-100 p-4 flex justify-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold italic">
                                    Cálculo processado com precisão Decimal (20 casas)
                                </p>
                            </CardFooter>
                        </Card>
                    ) : (
                        <Card className="border-2 border-dashed h-full min-h-[400px] flex flex-col items-center justify-center p-10 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                <Calculator className="w-8 h-8 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-400 uppercase tracking-widest">Aguardando Parâmetros</h3>
                                <p className="text-slate-400 text-sm max-w-[250px] mx-auto pt-2 italic">
                                    Insira os lançamentos e verbas da execução para visualizar o memorial detalhado.
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
