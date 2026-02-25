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
import { Download, History, Printer, Save, Trash2, FileJson, Sun, Moon } from 'lucide-react';
import { calcularGPS, obterSalarioMinimo } from '@/modules/social-security/GpsService';
import { generateSimulationPDF } from '@/lib/simulationPdfGenerator';

export default function GpsTrimestralPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [localTheme, setLocalTheme] = useState<'light' | 'dark'>('light');
    const [tipo, setTipo] = useState<string>('INDIVIDUAL');
    const [modalidade, setModalidade] = useState<string>('NORMAL');
    const [ano, setAno] = useState<string>(new Date().getFullYear().toString());
    const [salarioBase, setSalarioBase] = useState<string>(obterSalarioMinimo(new Date().getFullYear()).toString());

    useEffect(() => {
        const saved = localStorage.getItem('gps_history');
        if (saved) setHistory(JSON.parse(saved));

        // Sincronizar com o sistema ou valor salvo
        const savedTheme = localStorage.getItem('gps_theme') as 'light' | 'dark';
        if (savedTheme) setLocalTheme(savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = localTheme === 'light' ? 'dark' : 'light';
        setLocalTheme(newTheme);
        localStorage.setItem('gps_theme', newTheme);
    };

    const saveToHistory = (data: any) => {
        const newHistory = [data, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('gps_history', JSON.stringify(newHistory));
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('gps_history');
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        const data = {
            nome: String(formData.get('nome') || ''),
            nit: String(formData.get('nit') || ''),
            tipo: String(formData.get('tipo') || 'INDIVIDUAL'),
            modalidade: String(formData.get('modalidade') || 'NORMAL'),
            salarioBase: parseFloat(formData.get('salarioBase') as string),
            ano: String(formData.get('ano') || new Date().getFullYear()),
            trimestre: parseInt(formData.get('trimestre') as string),
            diasAtraso: formData.get('isAtraso') === 'on' ? parseInt(formData.get('diasAtraso') as string || '0') : 0
        };

        const calculation = calcularGPS(data);
        const finalResult = { ...calculation, inputData: data };
        setResult(finalResult);
        saveToHistory(finalResult);
        setLoading(false);
    }

    const handleExportPDF = () => {
        if (!result) return;
        generateSimulationPDF({
            type: 'GPS_TRIMESTRAL',
            inputData: result.inputData,
            resultData: result,
            createdAt: new Date(),
        });
    };

    const handleExportJSON = () => {
        if (!result) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `gps_${result.competencia.replace('/', '_')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="container mx-auto py-10 space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calculadora GPS INSS Trimestral</h1>
                    <p className="text-muted-foreground">Recolhimento trimestral para Autônomos e Facultativos.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {localTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Formulário */}
                <div className="lg:col-span-5 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados do Contribuinte</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nome">Nome Completo</Label>
                                    <Input id="nome" name="nome" placeholder="Nome do segurado" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nit">NIT/PIS/PASEP (11 dígitos)</Label>
                                    <Input
                                        id="nit"
                                        name="nit"
                                        placeholder="00000000000"
                                        maxLength={11}
                                        pattern="\d{11}"
                                        title="O NIT deve conter exatamente 11 dígitos numéricos."
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select name="tipo" value={tipo} onValueChange={setTipo}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                                                <SelectItem value="FACULTATIVO">Facultativo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Modalidade</Label>
                                        <Select name="modalidade" value={modalidade} onValueChange={setModalidade}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {tipo === 'INDIVIDUAL' ? (
                                                    <>
                                                        <SelectItem value="NORMAL">1104 - Normal - 20%</SelectItem>
                                                        <SelectItem value="SIMPLIFICADO">1180 - Simplificado - 11%</SelectItem>
                                                    </>
                                                ) : (
                                                    <>
                                                        <SelectItem value="NORMAL">1457 - Normal - 20%</SelectItem>
                                                        <SelectItem value="SIMPLIFICADO">1473 - Simplificado - 11%</SelectItem>
                                                        <SelectItem value="BAIXA_RENDA">1490 - Baixa Renda - 5%</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 border rounded-md space-y-3 text-[11px] leading-relaxed animate-in slide-in-from-top-2 duration-300">
                                    <h4 className="font-bold flex items-center gap-1 text-slate-700">
                                        <History className="w-3 h-3" /> EXPLICAÇÃO DO CÓDIGO SELECIONADO
                                    </h4>
                                    <div className="grid grid-cols-1">
                                        {modalidade === 'NORMAL' && (
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-600 border-b border-slate-200">
                                                    {tipo === 'INDIVIDUAL' ? '1104' : '1457'} - Plano Normal (20%)
                                                </p>
                                                <p><strong>Indicado para:</strong> {tipo === 'INDIVIDUAL' ? 'Autônomos, profissionais liberais e empresários.' : 'Pessoa sem atividade remunerada (dona de casa, estudante).'}</p>
                                                <p><strong>Alíquota:</strong> 20% sobre o salário de contribuição.</p>
                                                <p><strong>Direitos:</strong> Aposentadoria (Idade/Tempo), Invalidez, Auxílio-doença, Maternidade, Pensão, Auxílio-reclusão.</p>
                                                <p className="text-emerald-700 font-bold italic">✓ Diferencial: Permite aposentadoria por tempo de contribuição.</p>
                                            </div>
                                        )}
                                        {modalidade === 'SIMPLIFICADO' && (
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-600 border-b border-slate-200">
                                                    {tipo === 'INDIVIDUAL' ? '1180' : '1473'} - Plano Simplificado (11%)
                                                </p>
                                                <p><strong>Indicado para:</strong> {tipo === 'INDIVIDUAL' ? 'Autônomos e trabalhadores informais.' : 'Pessoas sem renda própria que não são baixa renda.'}</p>
                                                <p><strong>Alíquota:</strong> 11% sobre o salário mínimo.</p>
                                                <p><strong>Direitos:</strong> Aposentadoria (Idade), Invalidez, Auxílio-doença, Maternidade, Pensão.</p>
                                                <p className="text-red-600 font-bold italic">❌ Não permite aposentadoria por tempo de contribuição.</p>
                                                <p className="text-[10px] text-slate-500 italic">* Possível complementação futura para 20%.</p>
                                            </div>
                                        )}
                                        {modalidade === 'BAIXA_RENDA' && (
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-600 border-b border-slate-200">1490 - Baixa Renda (5%)</p>
                                                <p><strong>Indicado para:</strong> Dona de casa de baixa renda (CadÚnico) com renda familiar até 2 SM.</p>
                                                <p><strong>Alíquota:</strong> 5% sobre o salário mínimo.</p>
                                                <p className="text-red-600 font-bold italic">❌ Limitações: Exige comprovação de baixa renda e não conta para tempo de contribuição.</p>
                                                <p><strong>Direitos:</strong> Aposentadoria (Idade), Invalidez, Auxílio-doença, Maternidade, Pensão.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Período e Valores</CardTitle>
                                    <div className="space-y-2">
                                        <Label htmlFor="salarioBase">Salário Base (R$)</Label>
                                        <Input
                                            id="salarioBase"
                                            name="salarioBase"
                                            type="number"
                                            step="0.01"
                                            value={salarioBase}
                                            onChange={(e) => setSalarioBase(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Ano</Label>
                                            <Input
                                                name="ano"
                                                type="number"
                                                value={ano}
                                                onChange={(e) => {
                                                    const newYear = e.target.value;
                                                    setAno(newYear);
                                                    setSalarioBase(obterSalarioMinimo(newYear).toString());
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Trimestre</Label>
                                            <Select name="trimestre" defaultValue="1">
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1º (Jan/Fev/Mar)</SelectItem>
                                                    <SelectItem value="2">2º (Abr/Mai/Jun)</SelectItem>
                                                    <SelectItem value="3">3º (Jul/Ago/Set)</SelectItem>
                                                    <SelectItem value="4">4º (Out/Nov/Dez)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="isAtraso">Pagamento em atraso?</Label>
                                        <Switch id="isAtraso" name="isAtraso" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="diasAtraso">Dias em Atraso</Label>
                                        <Input id="diasAtraso" name="diasAtraso" type="number" defaultValue="0" />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={loading}>
                                    {loading ? 'Calculando...' : 'Calcular GPS'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Histórico Simples */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium italic">Consultas Recentes</CardTitle>
                            <Button variant="ghost" size="icon" onClick={clearHistory}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {history.length === 0 && <p className="text-xs text-muted-foreground italic text-center">Nenhum cálculo salvo.</p>}
                                {history.map((h, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 rounded hover:bg-muted text-[10px] cursor-pointer border-l-2 border-slate-900" onClick={() => setResult(h)}>
                                        <span className="font-medium text-slate-700">{h.competencia} - {h.inputData.nome.substring(0, 15)}...</span>
                                        <span className="font-bold text-slate-900">R$ {h.total}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Resultado e Simulação GPS */}
                <div className="lg:col-span-7 space-y-6">
                    {result ? (
                        <>
                            {/* Simulação Visual GPS - Design Re-imaginado (Sóbrio e Profissional) */}
                            <Card className="border-2 border-slate-900 bg-[#f9f9f9] text-slate-900 overflow-hidden shadow-2xl font-mono">
                                <div className="bg-white border-b-2 border-slate-900 grid grid-cols-12 p-3">
                                    <div className="col-span-8 flex flex-col justify-center border-r-2 border-slate-900 px-2">
                                        <h2 className="text-[12px] font-black tracking-tight leading-none">MINISTÉRIO DA PREVIDÊNCIA SOCIAL - MPS</h2>
                                        <h3 className="text-[10px] font-bold tracking-tight mt-1">INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS</h3>
                                        <p className="text-[14px] font-black mt-2">GUIA DA PREVIDÊNCIA SOCIAL - GPS</p>
                                    </div>
                                    <div className="col-span-4 flex flex-col items-center justify-center bg-slate-100 p-2">
                                        <span className="text-[10px] font-bold text-slate-500 mb-1">VIA BANCO</span>
                                        <div className="w-full border-t border-slate-400 py-1 text-center">
                                            <span className="text-[14px] font-black uppercase">2ª VIA</span>
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-0">
                                    <div className="grid grid-cols-12 min-h-[350px]">
                                        <div className="col-span-8 border-r-2 border-slate-900 p-4 space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold uppercase border-b border-slate-300 inline-block pr-4">1. NOME OU RAZÃO SOCIAL / FONE / ENDEREÇO</p>
                                                <div className="pt-2 text-[14px] font-bold leading-tight">
                                                    {result.inputData.nome}<br />
                                                    NIT: {result.inputData.nit}<br />
                                                    TIPO: {result.inputData.tipo} - {result.inputData.modalidade}
                                                </div>
                                            </div>
                                            <div className="pt-20">
                                                <p className="text-[8px] font-bold italic opacity-60">USO EXCLUSIVO DO INSS</p>
                                                <div className="border-2 border-dashed border-slate-400 p-8 rounded text-center opacity-20 rotate-[-5deg]">
                                                    <span className="text-2xl font-black">AUTENTICAÇÃO MECÂNICA</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-4 flex flex-col">
                                            <div className="border-b-2 border-slate-900 grid grid-rows-2">
                                                <div className="px-2 pt-1 text-[8px] font-bold bg-slate-200">2. CÓDIGO DE PAGAMENTO</div>
                                                <div className="px-2 pb-1 text-[16px] font-black text-right">{result.codigo}</div>
                                            </div>
                                            <div className="border-b-2 border-slate-900 grid grid-rows-2">
                                                <div className="px-2 pt-1 text-[8px] font-bold bg-slate-200">3. COMPETÊNCIA</div>
                                                <div className="px-2 pb-1 text-[16px] font-black text-right">{result.competencia}</div>
                                            </div>
                                            <div className="border-b-2 border-slate-900 grid grid-rows-2">
                                                <div className="px-2 pt-1 text-[8px] font-bold bg-slate-200">4. IDENTIFICADOR</div>
                                                <div className="px-2 pb-1 text-[12px] font-black text-right">{result.inputData.nit}</div>
                                            </div>
                                            <div className="border-b-2 border-slate-900 grid grid-rows-2 h-14">
                                                <div className="px-2 pt-1 text-[8px] font-bold bg-slate-200">5. VALOR DO INSS</div>
                                                <div className="px-2 pb-1 text-[16px] font-black text-right pr-4">R$ {result.valorPrincipal}</div>
                                            </div>
                                            <div className="border-b-2 border-slate-900 grid grid-rows-2 h-14">
                                                <div className="px-2 pt-1 text-[8px] font-bold bg-slate-200">6. OUTRAS ENTIDADES</div>
                                                <div className="px-2 pb-1 text-[16px] font-black text-right pr-4">0,00</div>
                                            </div>
                                            <div className="border-b-2 border-slate-900 grid grid-rows-2 h-14">
                                                <div className="px-2 pt-1 text-[8px] font-bold bg-slate-200">7. ATM / MULTA E JUROS</div>
                                                <div className="px-2 pb-1 text-[16px] font-black text-right pr-4">R$ {(result.multa + result.juros).toFixed(2)}</div>
                                            </div>
                                            <div className="grid grid-rows-2 h-16 bg-slate-900 text-white">
                                                <div className="px-2 pt-1 text-[8px] font-bold uppercase">8. TOTAL</div>
                                                <div className="px-2 pb-1 text-[22px] font-black text-right pr-4 tracking-tighter self-center">R$ {result.total}</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50 border-t-2 border-slate-900 p-2 flex justify-between items-center">
                                    <p className="text-[7px] text-slate-500 italic">Este cálculo é estimativo e não substitui emissão oficial pelo sistema da Receita Federal.</p>
                                    <Badge variant="outline" className="text-[8px] border-slate-300">Lei 8.212/91</Badge>
                                </CardFooter>
                            </Card>

                            {/* Memória de Cálculo */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Memória de Cálculo Detalhada</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableBody className="text-xs">
                                            <TableRow>
                                                <TableCell className="font-medium">Salário Base</TableCell>
                                                <TableCell className="text-right">R$ {result.memoria.baseCalculo}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Alíquota Aplicada</TableCell>
                                                <TableCell className="text-right">{result.memoria.aliquota}%</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Valor Mensal</TableCell>
                                                <TableCell className="text-right">R$ {result.memoria.valorMensal}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium font-bold text-primary">Valor Trimestral (Principal)</TableCell>
                                                <TableCell className="text-right font-bold text-primary">R$ {result.valorPrincipal}</TableCell>
                                            </TableRow>
                                            {result.multa > 0 && (
                                                <TableRow className="text-orange-600">
                                                    <TableCell className="font-medium">Multa ({result.memoria.diasAtraso} dias - max 20%)</TableCell>
                                                    <TableCell className="text-right">R$ {result.multa}</TableCell>
                                                </TableRow>
                                            )}
                                            {result.juros > 0 && (
                                                <TableRow className="text-orange-600">
                                                    <TableCell className="font-medium">Juros de Mora (1% am)</TableCell>
                                                    <TableCell className="text-right">R$ {result.juros}</TableCell>
                                                </TableRow>
                                            )}
                                            <TableRow className="bg-muted/50 font-bold text-lg">
                                                <TableCell>VALOR FINAL</TableCell>
                                                <TableCell className="text-right">R$ {result.total}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    <Button variant="outline" className="flex-1 gap-2" onClick={handleExportPDF}>
                                        <Printer className="w-4 h-4" /> PDF
                                    </Button>
                                    <Button variant="outline" className="flex-1 gap-2" onClick={handleExportJSON}>
                                        <FileJson className="w-4 h-4" /> JSON
                                    </Button>
                                    <Button className="flex-1">Pagar Agora</Button>
                                </CardFooter>
                            </Card>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                            <Download className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-center">Preencha os dados ao lado para simular sua GPS Trimestral conforme a Lei 8.212/91.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
