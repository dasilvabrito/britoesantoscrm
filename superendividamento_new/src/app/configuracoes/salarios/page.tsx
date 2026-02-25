'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Trash2, Database, History, TrendingUp, AlertCircle } from 'lucide-react';
import { MinimumWageService } from '@/modules/social-security/MinimumWageService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MinimumWageSettingsPage() {
    const [salarios, setSalarios] = useState<Record<string, number>>({});
    const [newComp, setNewComp] = useState('');
    const [newValue, setNewValue] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    // Carregar dados iniciais do serviço
    useEffect(() => {
        // @ts-ignore - Acessando histórico para exibição
        const historico = MinimumWageService.historico;
        setSalarios({ ...historico });
    }, []);

    const handleAdd = () => {
        if (!newComp || !newValue) return;
        setSalarios(prev => ({
            ...prev,
            [newComp]: parseFloat(newValue)
        }));
        setNewComp('');
        setNewValue('');
    };

    const handleRemove = (key: string) => {
        const next = { ...salarios };
        delete next[key];
        setSalarios(next);
    };

    const handleSave = () => {
        // Aqui simularíamos a persistência
        // Em um sistema real, enviaríamos para uma API ou salvaríamos no DB
        console.log("Salvando novos salários:", salarios);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    // Ordenar keys
    const sortedKeys = Object.keys(salarios).sort().reverse();

    return (
        <div className="container mx-auto py-10 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        Gestão da Tabela de Salário Mínimo Nacional.
                        <Badge variant="outline" className="bg-blue-100 text-blue-700">Módulo Core</Badge>
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button onClick={handleSave} className="bg-slate-900 gap-2">
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                    </Button>
                </div>
            </div>

            {isSaved && (
                <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 animate-in zoom-in-95">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <AlertTitle>Sucesso!</AlertTitle>
                    <AlertDescription>
                        A tabela de salários foi atualizada na memória do sistema para esta sessão.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" />
                                Adicionar Novo Valor
                            </CardTitle>
                            <CardDescription>Insira uma nova competência e o valor vigente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="comp">Competência (AAAA-MM)</Label>
                                <Input
                                    id="comp"
                                    type="month"
                                    value={newComp}
                                    onChange={e => setNewComp(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="val">Valor Nominal (R$)</Label>
                                <Input
                                    id="val"
                                    type="number"
                                    step="0.01"
                                    value={newValue}
                                    onChange={e => setNewValue(e.target.value)}
                                    placeholder="1621.00"
                                />
                            </div>
                            <Button onClick={handleAdd} variant="outline" className="w-full border-2 border-dashed">
                                Adicionar à Lista
                            </Button>
                        </CardContent>
                    </Card>

                    <Alert className="bg-blue-50 border-blue-100">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800 font-bold">Importante</AlertTitle>
                        <AlertDescription className="text-blue-700 text-xs">
                            Estes valores impactam diretamente os cálculos de INSS em Atraso e GPS Mensal. Certifique-se de usar os valores publicados no Diário Oficial da União.
                        </AlertDescription>
                    </Alert>
                </div>

                <div className="lg:col-span-8">
                    <Card>
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="w-5 h-5 text-slate-500" />
                                Histórico de Salário Mínimo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[600px] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[40%]">Competência</TableHead>
                                            <TableHead>Valor Nominal</TableHead>
                                            <TableHead className="text-right w-[100px]">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedKeys.map(key => (
                                            <TableRow key={key}>
                                                <TableCell className="font-mono font-bold text-slate-600">
                                                    {key.split('-').reverse().join('/')}
                                                </TableCell>
                                                <TableCell className="font-bold text-emerald-700">
                                                    R$ {salarios[key].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleRemove(key)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
