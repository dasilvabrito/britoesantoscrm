'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, History, Printer, Save, Trash2, FileJson, Sun, Moon, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { calcularGPS, obterSalarioMinimo, recomendarCodigoINSS, PerfilContribuinte } from '@/modules/social-security/GpsService';
import { generateSimulationPDF } from '@/lib/simulationPdfGenerator';

export default function GpsMensalPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [localTheme, setLocalTheme] = useState<'light' | 'dark'>('light');

    // Perfil para Recomendação
    const [perfil, setPerfil] = useState<PerfilContribuinte>({
        tipoSegurado: "INDIVIDUAL",
        desejaAposentadoriaTempo: true,
        baixaRendaCadUnico: false,
        prestadorParaPJ: false,
        competenciaEmAtraso: false,
        jaContribuiu11: false
    });

    const [recomendacao, setRecomendacao] = useState<any>(null);
    const [manualMode, setManualMode] = useState(false);

    // Estados do Formulário
    const [ano, setAno] = useState<string>(new Date().getFullYear().toString());
    const [salarioBase, setSalarioBase] = useState<string>(obterSalarioMinimo(new Date().getFullYear()).toString());
    const [mes, setMes] = useState<string>((new Date().getMonth() + 1).toString());

    useEffect(() => {
        const saved = localStorage.getItem('gps_mensal_history');
        if (saved) setHistory(JSON.parse(saved));

        const savedTheme = localStorage.getItem('gps_theme') as 'light' | 'dark';
        if (savedTheme) setLocalTheme(savedTheme);
    }, []);

    // Atualiza recomendação sempre que o perfil muda
    useEffect(() => {
        const rec = recomendarCodigoINSS(perfil);
        setRecomendacao(rec);
    }, [perfil]);

    const toggleTheme = () => {
        const newTheme = localTheme === 'light' ? 'dark' : 'light';
        setLocalTheme(newTheme);
        localStorage.setItem('gps_theme', newTheme);
    };

    const saveToHistory = (data: any) => {
        const newHistory = [data, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('gps_mensal_history', JSON.stringify(newHistory));
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);

        // Determinar modalidade baseada na recomendação ou seleção manual
        let modalidade = 'NORMAL';
        if (recomendacao?.codigo === '1163' || recomendacao?.codigo === '1473' || recomendacao?.codigo === '1236') {
            modalidade = 'SIMPLIFICADO';
        } else if (recomendacao?.codigo === '1929') {
            modalidade = 'BAIXA_RENDA';
        }

        const data = {
            nome: String(formData.get('nome') || ''),
            nit: String(formData.get('nit') || ''),
            tipo: perfil.tipoSegurado,
            modalidade,
            salarioBase: parseFloat(salarioBase),
            ano,
            mes: parseInt(mes),
            diasAtraso: formData.get('isAtraso') === 'on' ? parseInt(formData.get('diasAtraso') as string || '0') : 0,
            isTrimestral: false
        };

        const calculation = calcularGPS(data);
        const finalResult = { ...calculation, inputData: data, recomendacao };
        setResult(finalResult);
        saveToHistory(finalResult);
        setLoading(false);
    }

    const handleExportPDF = () => {
        if (!result) return;
        generateSimulationPDF({
            type: 'GPS_MENSAL',
            inputData: result.inputData,
            resultData: result,
            createdAt: new Date(),
        });
    };

    return (
        <div className="container mx-auto py-10 space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calculadora GPS Mensal</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        Recolhimento mensal com Assistente de Recomendação Inteligente.
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">Engine v1.0</Badge>
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {localTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Assistente e Formulário */}
                <div className="lg:col-span-12 space-y-6">
                    <Card className="border-2 border-slate-200 shadow-lg">
                        <CardHeader className="bg-slate-50 border-b">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-amber-500" /> Assistente de Código de Recolhimento
                                    </CardTitle>
                                    <CardDescription>Responda as perguntas abaixo para recomendarmos o código correto.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border">
                                    <Button
                                        variant={!manualMode ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setManualMode(false)}
                                        className="text-xs h-7"
                                    >
                                        Assistente
                                    </Button>
                                    <Button
                                        variant={manualMode ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setManualMode(true)}
                                        className="text-xs h-7"
                                    >
                                        Manual
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Quiz de Perfil */}
                                <div className="md:col-span-2 space-y-4">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3 p-4 border rounded-xl hover:border-slate-400 transition-colors">
                                            <Label className="text-slate-500 text-[10px] uppercase font-bold">1. Qual sua categoria?</Label>
                                            <Select
                                                value={perfil.tipoSegurado}
                                                onValueChange={(val: any) => setPerfil({ ...perfil, tipoSegurado: val })}
                                            >
                                                <SelectTrigger className="font-bold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="INDIVIDUAL">Contribuinte Individual (Autônomo)</SelectItem>
                                                    <SelectItem value="FACULTATIVO">Facultativo (Sem renda própria)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-3 p-4 border rounded-xl hover:border-slate-400 transition-colors">
                                            <Label className="text-slate-500 text-[10px] uppercase font-bold">2. Objetivo Previdenciário?</Label>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Contar tempo para aposentadoria?</span>
                                                <Switch
                                                    checked={perfil.desejaAposentadoriaTempo}
                                                    onCheckedChange={(val) => setPerfil({ ...perfil, desejaAposentadoriaTempo: val })}
                                                />
                                            </div>
                                        </div>

                                        {perfil.tipoSegurado === "FACULTATIVO" && (
                                            <div className="space-y-3 p-4 border rounded-xl hover:border-slate-400 transition-colors animate-in slide-in-from-left-2">
                                                <Label className="text-slate-500 text-[10px] uppercase font-bold">3. Condição Social</Label>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Baixa Renda (CadÚnico)?</span>
                                                    <Switch
                                                        checked={perfil.baixaRendaCadUnico}
                                                        onCheckedChange={(val) => setPerfil({ ...perfil, baixaRendaCadUnico: val })}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {perfil.tipoSegurado === "INDIVIDUAL" && (
                                            <div className="space-y-3 p-4 border rounded-xl hover:border-slate-400 transition-colors animate-in slide-in-from-left-2">
                                                <Label className="text-slate-500 text-[10px] uppercase font-bold">3. Prestação de Serviço</Label>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Presta serviço para Empresa?</span>
                                                    <Switch
                                                        checked={perfil.prestadorParaPJ}
                                                        onCheckedChange={(val) => setPerfil({ ...perfil, prestadorParaPJ: val })}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3 p-4 border rounded-xl hover:border-slate-400 transition-colors">
                                            <Label className="text-slate-500 text-[10px] uppercase font-bold">4. Situação do Pagamento</Label>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">É um pagamento em atraso?</span>
                                                <Switch
                                                    checked={perfil.competenciaEmAtraso}
                                                    onCheckedChange={(val) => setPerfil({ ...perfil, competenciaEmAtraso: val })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Resultado da Recomendação */}
                                <div className="bg-slate-900 rounded-xl p-6 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Sparkles className="w-20 h-20" />
                                    </div>
                                    <div className="space-y-4 z-10">
                                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">Recomendação Técnica</p>
                                        <div className="space-y-1">
                                            <h3 className="text-4xl font-black">{recomendacao?.codigo || '---'}</h3>
                                            <p className="text-slate-300 font-medium text-sm leading-tight">{recomendacao?.descricao || 'Analizando perfil...'}</p>
                                        </div>
                                        <div className="pt-4 border-t border-slate-700 space-y-2">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Impacto Previdenciário:</p>
                                            <div className="flex items-center gap-2">
                                                {perfil.desejaAposentadoriaTempo ? (
                                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">Gera Tempo Contrib.</Badge>
                                                ) : (
                                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px]">Apenas Apos. Idade</Badge>
                                                )}
                                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[9px]">Proteção Soc.</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-6">
                                        <p className="text-[10px] text-slate-500 italic">Vencimento em Dia 10</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Formulário Complementar e Guia */}
                <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-4 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-bold uppercase tracking-tight">Dados para Emissão</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nome do Segurado</Label>
                                        <Input name="nome" placeholder="Nome Completo" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>NIT/PIS/PASEP</Label>
                                        <Input name="nit" maxLength={11} placeholder="000.00000.00-0" required />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Ano</Label>
                                            <Select value={ano} onValueChange={(val) => {
                                                setAno(val);
                                                setSalarioBase(obterSalarioMinimo(val).toString());
                                            }}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="2026">2026</SelectItem>
                                                    <SelectItem value="2025">2025</SelectItem>
                                                    <SelectItem value="2024">2024</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Mês</Label>
                                            <Select value={mes} onValueChange={setMes}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 12 }, (_, i) => (
                                                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                                                            {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Salário Base (R$)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={salarioBase}
                                            onChange={(e) => setSalarioBase(e.target.value)}
                                        />
                                        <p className="text-[9px] text-muted-foreground italic text-right">* Base sugerida p/ {ano}</p>
                                    </div>

                                    {perfil.competenciaEmAtraso && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2 animate-in zoom-in-95">
                                            <div className="flex items-center gap-2 text-amber-700">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase">Cálculo de Atraso</span>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px]">Dias em atraso?</Label>
                                                <Input name="diasAtraso" type="number" defaultValue="30" />
                                                <input type="hidden" name="isAtraso" value="on" />
                                            </div>
                                        </div>
                                    )}

                                    <Button type="submit" className="w-full h-12 bg-slate-900 font-bold uppercase tracking-widest text-xs">
                                        {loading ? 'Processando...' : 'Simular Guia Mensal'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-8">
                        {result ? (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                {/* Simulação Visual */}
                                <Card className="border-2 border-slate-900 overflow-hidden shadow-xl font-mono">
                                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest leading-none opacity-60">Guia Previdência Social</p>
                                            <h3 className="text-xl font-black italic">MENSAL - {result.competencia}</h3>
                                        </div>
                                        <Badge variant="outline" className="border-slate-500 text-slate-300 font-bold uppercase text-[9px]">Código: {result.codigo}</Badge>
                                    </div>
                                    <CardContent className="p-0 bg-white text-slate-900 grid grid-cols-12 min-h-[300px]">
                                        <div className="col-span-7 p-6 border-r border-slate-200 space-y-6 flex flex-col justify-between">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black border-b-2 border-slate-100 inline-block">IDENTIFICAÇÃO DO SEGURADO</p>
                                                <h4 className="text-2xl font-black leading-tight uppercase">{result.inputData.nome}</h4>
                                                <p className="text-sm font-bold text-slate-600">NIT/PIS: {result.inputData.nit}</p>
                                                <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] uppercase font-bold">{result.recomendacao?.descricao}</Badge>
                                            </div>
                                            <div className="space-y-2 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
                                                <p className="text-[8px] font-bold uppercase text-slate-400">Vencimento Previsto</p>
                                                <p className="text-xl font-black text-slate-900">{result.vencimento}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-5 flex flex-col justify-between p-0">
                                            <div className="border-b border-slate-100 p-4 flex justify-between items-center bg-slate-50/50">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Principal</span>
                                                <span className="text-lg font-black">R$ {result.valorPrincipal}</span>
                                            </div>
                                            <div className="border-b border-slate-100 p-4 flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Multa/Juros</span>
                                                <span className="text-lg font-black text-amber-600">R$ {(result.multa + result.juros).toFixed(2)}</span>
                                            </div>
                                            <div className="p-4 flex justify-between items-center bg-slate-900 text-white h-24">
                                                <span className="text-[11px] font-black uppercase tracking-tighter self-start">Total a Pagar</span>
                                                <span className="text-3xl font-black italic">R$ {result.total}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50 p-4 border-t flex justify-between items-center group cursor-pointer" onClick={handleExportPDF}>
                                        <div className="flex items-center gap-3">
                                            <Printer className="w-5 h-5 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-600 uppercase group-hover:text-slate-900 transition-colors">Gerar PDF p/ Impressão</span>
                                        </div>
                                        <Badge variant="outline" className="animate-pulse">Clique aqui</Badge>
                                    </CardFooter>
                                </Card>

                                {/* Resumo de Direitos */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/30">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xs font-bold uppercase text-emerald-700">O que você garante:</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="text-[10px] space-y-1 text-emerald-800 font-medium">
                                                <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Aposentadoria por Idade</li>
                                                {perfil.desejaAposentadoriaTempo && (
                                                    <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Aposentadoria por Tempo (Vantagem!)</li>
                                                )}
                                                <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Auxílio Doença / Invalidez</li>
                                                <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Salário Maternidade</li>
                                            </ul>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xs font-bold uppercase text-amber-700">Dica Estratégica:</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-[9px] leading-tight text-amber-900">
                                                Sempre pague até o <strong>dia 15</strong>. Se pagar em atraso, a competência pode não contar para carência se for sua primeira contribuição ou houver perda de qualidade de segurado.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-20 bg-muted/10 opacity-60">
                                <Sparkles className="w-16 h-16 text-slate-200 mb-4" />
                                <p className="text-sm font-bold text-slate-400 text-center uppercase tracking-widest">Aguardando definição de perfil</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
