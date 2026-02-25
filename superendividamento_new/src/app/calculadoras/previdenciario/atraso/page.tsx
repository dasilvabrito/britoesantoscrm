'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { calculateLatePaymentAction } from './actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ShieldCheck, CalendarSearch, History, FileDown, AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, Printer } from 'lucide-react';
import { generateSimulationPDF } from '@/lib/simulationPdfGenerator';
import { MonthPicker } from '@/components/ui/month-picker';
import { DatePicker } from '@/components/ui/date-picker';

// ── Helpers de data ─────────────────────────────────────────────────────────
function toMonthValue(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(monthValue: string, months: number): string {
    const [y, m] = monthValue.split('-').map(Number);
    const d = new Date(y, m - 1 + months, 1);
    return toMonthValue(d);
}

const today = new Date();
const DEFAULT_ULTIMA = toMonthValue(new Date(today.getFullYear() - 1, today.getMonth(), 1));
const DEFAULT_COMPETENCIA = addMonths(DEFAULT_ULTIMA, 1);
const DEFAULT_PAYMENT = today.toISOString().split('T')[0];

// ─────────────────────────────────────────────────────────────────────────────

export default function SocialSecurityLatePaymentPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [tipoSegurado, setTipoSegurado] = useState<'INDIVIDUAL' | 'FACULTATIVO'>('INDIVIDUAL');
    const [useManualValue, setUseManualValue] = useState(false);

    // Switches controlados
    const [estaRecebendoBeneficio, setEstaRecebendoBeneficio] = useState(false);
    const [possuiComprovacaoAtividade, setPossuiComprovacaoAtividade] = useState(true);
    const [maisDe120Contribuicoes, setMaisDe120Contribuicoes] = useState(false);
    const [situacaoDesemprego, setSituacaoDesemprego] = useState(false);

    // Datas controladas
    const [competenciaUltima, setCompetenciaUltima] = useState(DEFAULT_ULTIMA);
    const [competencia, setCompetencia] = useState(DEFAULT_COMPETENCIA);
    const [paymentDate, setPaymentDate] = useState(DEFAULT_PAYMENT);

    const handleUltimaChange = useCallback((val: string) => {
        setCompetenciaUltima(val);
        if (val) setCompetencia(addMonths(val, 1));
    }, []);

    const handleExportPDF = () => {
        if (!result) return;
        generateSimulationPDF({
            type: 'SOCIAL_SECURITY_LATE',
            inputData: { ...result, tipoSegurado },
            resultData: result,
            createdAt: new Date(),
        });
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        // Garante que os switches controlados entram no FormData corretamente
        if (estaRecebendoBeneficio) formData.set('estaRecebendoBeneficio', 'on');
        if (possuiComprovacaoAtividade) formData.set('possuiComprovacaoAtividade', 'on');
        if (maisDe120Contribuicoes) formData.set('maisDe120Contribuicoes', 'on');
        if (situacaoDesemprego) formData.set('situacaoDesemprego', 'on');
        // Garante datas dos pickers controlados
        formData.set('competenciaUltima', competenciaUltima);
        formData.set('competencia', competencia);
        formData.set('paymentDate', paymentDate);

        const data = await calculateLatePaymentAction(formData);

        setResult(data);
        setLoading(false);
    }

    return (
        <div className="container mx-auto py-10 space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contribuições em Atraso</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        Cálculo automatizado por Salário Mínimo e Matriz de Risco.
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Legal Intel v4.0.1 - Blue Edition</Badge>
                    </p>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">Módulo Previdenciário</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-green-100 shadow-md">
                        <CardHeader className="bg-green-50/50 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CalendarSearch className="w-5 h-5 text-green-600" />
                                Parâmetros de Cálculo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <Label className="text-xs uppercase font-bold text-slate-500">1. Identificação do Segurado</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="nomeSegurado" className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</Label>
                                            <Input id="nomeSegurado" name="nomeSegurado" placeholder="Ex: João da Silva" className="h-9 text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="nit" className="text-[10px] font-bold text-slate-400 uppercase">NIT / PIS / PASEP / CPF</Label>
                                            <Input id="nit" name="nit" placeholder="000.00000.00-0" className="h-9 text-sm" />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="my-2" />

                                <div className="space-y-4">
                                    <Label className="text-xs uppercase font-bold text-slate-500">2. Histórico Técnico (Qualidade)</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Última Contribuição Paga</Label>
                                            <MonthPicker
                                                name="competenciaUltima"
                                                value={competenciaUltima}
                                                onChange={handleUltimaChange}
                                            />
                                            <p className="text-[9px] text-blue-600 italic">Marco para início do período de graça.</p>
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-blue-50/50 rounded border border-blue-100 h-[52px] mt-4">
                                            <div className="flex flex-col">
                                                <Label htmlFor="estaRecebendoBeneficioSwitch" className="text-[10px] font-bold text-blue-700">EM GOZO DE BENEFÍCIO?</Label>
                                                <span className="text-[8px] text-blue-500">Mantém qualidade automática</span>
                                            </div>
                                            <Switch
                                                id="estaRecebendoBeneficioSwitch"
                                                checked={estaRecebendoBeneficio}
                                                onCheckedChange={setEstaRecebendoBeneficio}
                                            />
                                        </div>
                                    </div>

                                    {tipoSegurado === 'INDIVIDUAL' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                            <div className={`flex items-center justify-between p-2 rounded border transition-colors ${possuiComprovacaoAtividade ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                                <span className="text-[10px] font-medium text-slate-600">Prova atividade?</span>
                                                <Switch
                                                    checked={possuiComprovacaoAtividade}
                                                    onCheckedChange={setPossuiComprovacaoAtividade}
                                                />
                                            </div>
                                            <div className={`flex items-center justify-between p-2 rounded border transition-colors ${maisDe120Contribuicoes ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                                                <span className="text-[10px] font-medium text-slate-600">+120 contrib.?</span>
                                                <Switch
                                                    checked={maisDe120Contribuicoes}
                                                    onCheckedChange={setMaisDe120Contribuicoes}
                                                />
                                            </div>
                                            <div className={`flex items-center justify-between p-2 rounded border transition-colors ${situacaoDesemprego ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                                                <span className="text-[10px] font-medium text-slate-600">Desemprego?</span>
                                                <Switch
                                                    checked={situacaoDesemprego}
                                                    onCheckedChange={setSituacaoDesemprego}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator className="my-2" />

                                <div className="space-y-4">
                                    <Label className="text-xs uppercase font-bold text-slate-500">3. Parâmetros da Guia (Atraso)</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Perfil</Label>
                                            <Select name="tipoSegurado" value={tipoSegurado} onValueChange={(val: any) => setTipoSegurado(val)}>
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="INDIVIDUAL">Contribuinte Individual</SelectItem>
                                                    <SelectItem value="FACULTATIVO">Facultativo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Plano</Label>
                                            <Select name="modalidade" defaultValue="NORMAL">
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {tipoSegurado === 'INDIVIDUAL' ? (
                                                        <>
                                                            <SelectItem value="NORMAL">1007 - CI Autônomo (20%)</SelectItem>
                                                            <SelectItem value="SIMPLIFICADO">1163 - CI Simplificado (11%)</SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="NORMAL">1406 - Facultativo (20%)</SelectItem>
                                                            <SelectItem value="SIMPLIFICADO">1473 - Facultativo (11%)</SelectItem>
                                                            <SelectItem value="BAIXA_RENDA">1929 - Baixa Renda (5%)</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Competência (Atraso)</Label>
                                            <MonthPicker
                                                name="competencia"
                                                value={competencia}
                                                onChange={setCompetencia}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Data de Pagamento</Label>
                                            <DatePicker
                                                name="paymentDate"
                                                value={paymentDate}
                                                onChange={setPaymentDate}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-2 bg-amber-50/50 rounded border border-amber-100">
                                        <div className="flex flex-col">
                                            <Label htmlFor="useManualValue" className="text-[11px] font-bold text-amber-700">PAGAR ACIMA DO MÍNIMO?</Label>
                                            <span className="text-[8px] text-amber-500">Habilitado apenas para planos de 20%</span>
                                        </div>
                                        <Switch id="useManualValue" name="useManualValue" checked={useManualValue} onCheckedChange={setUseManualValue} />
                                    </div>

                                    {useManualValue && (
                                        <div className="space-y-1 animate-in slide-in-from-top-2">
                                            <Label htmlFor="principal" className="text-[10px] font-bold text-green-700 uppercase">Base de Cálculo Manual (R$)</Label>
                                            <Input id="principal" name="principal" type="number" step="0.01" className="h-9" />
                                        </div>
                                    )}
                                </div>

                                <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 font-bold uppercase tracking-wider text-xs shadow-lg shadow-green-200" disabled={loading}>
                                    {loading ? 'Consultando SELIC...' : 'Calcular Regularização e Gerar GPS'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    {result ? (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            {/* ── ANÁLISE DE RISCO DETALHADA ─────────────────── */}
                            <Card className={`border-l-8 ${result.risco.nivel === 'BAIXO' ? 'border-l-emerald-500' : result.risco.nivel === 'MÉDIO' ? 'border-l-amber-500' : 'border-l-red-500'}`}>
                                <CardHeader className={`border-b-2 pb-5 ${result.risco.nivel === 'BAIXO' ? 'bg-emerald-50 border-emerald-100' : result.risco.nivel === 'MÉDIO' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl border-2 ${result.risco.nivel === 'BAIXO' ? 'bg-white border-emerald-200 text-emerald-600' : result.risco.nivel === 'MÉDIO' ? 'bg-white border-amber-200 text-amber-600' : 'bg-white border-red-200 text-red-600'}`}>
                                            {result.risco.nivel === 'BAIXO' ? <ShieldCheck className="w-7 h-7" /> : result.risco.nivel === 'MÉDIO' ? <AlertTriangle className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <CardTitle className="text-xl font-black uppercase tracking-tight">MANUTENÇÃO DA QUALIDADE DE SEGURADO</CardTitle>
                                                <Badge className={`px-3 py-1 ${result.risco.nivel === 'BAIXO' ? 'bg-emerald-600 hover:bg-emerald-700' : result.risco.nivel === 'MÉDIO' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'} text-white font-bold text-sm`}>{result.risco.nivel}</Badge>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 mt-1">{result.risco.observacao}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 divide-y divide-slate-100">

                                    {/* ── 1. QUALIDADE DO SEGURADO ─────────────── */}
                                    {result.risco.infoGrace && (
                                        <div className="p-4 space-y-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">① Qualidade do Segurado — Art. 15 da Lei 8.213/91</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Prazo de Graça</p>
                                                    <p className="font-semibold text-slate-800">
                                                        {result.risco.infoGrace.emBeneficio
                                                            ? 'Indefinido — em benefício'
                                                            : `${result.risco.infoGrace.mesesGrace} meses`
                                                        }
                                                    </p>
                                                    {result.tipoSegurado === 'FACULTATIVO' && !result.risco.infoGrace.emBeneficio && (
                                                        <p className="text-[9px] text-amber-600 font-medium mt-0.5">⚠ Regra restritiva — sem extensões</p>
                                                    )}
                                                </div>
                                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Qualidade Mantida Até</p>
                                                    <p className={`font-bold text-base ${result.risco.infoGrace.emBeneficio ? 'text-emerald-600' : result.risco.infoGrace.diasRestantes > 0 ? 'text-blue-700' : 'text-red-600'}`}>
                                                        {result.risco.infoGrace.emBeneficio ? '∞ Automática' : result.risco.infoGrace.dataLimite}
                                                    </p>
                                                </div>
                                                <div className={`rounded-lg p-3 border font-bold ${result.risco.infoGrace.emBeneficio ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : result.risco.infoGrace.diasRestantes > 0 ? result.risco.infoGrace.diasRestantes < 30 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                    <p className="text-[9px] uppercase font-bold opacity-70 mb-1">Status em {result.paymentDate ? result.paymentDate.split('-').reverse().join('/') : '—'}</p>
                                                    <p className="text-sm leading-tight">
                                                        {result.risco.infoGrace.emBeneficio
                                                            ? '✓ Em gozo de benefício'
                                                            : result.risco.infoGrace.diasRestantes > 0
                                                                ? `✓ ${result.risco.infoGrace.diasRestantes} dias restantes`
                                                                : '✗ Qualidade perdida'
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Alerta Regra Restritiva — Facultativo */}
                                            {result.tipoSegurado === 'FACULTATIVO' && !result.risco.infoGrace.emBeneficio && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                                                    <p className="font-bold text-[10px] uppercase">⚠ Regra mais restritiva — Segurado Facultativo</p>
                                                    <p>▸ Prazo fixo de <strong>6 meses</strong> após a última contribuição (Art. 15, II, 'b')</p>
                                                    <p>▸ <strong>Não</strong> tem direito à extensão de 24 meses por +120 contribuições</p>
                                                    <p>▸ <strong>Não</strong> tem direito à extensão de 36 meses por desemprego involuntário</p>
                                                    <p>▸ Vencido o prazo, o segurado <strong>perde definitivamente</strong> a qualidade — não há recolhimento em atraso</p>
                                                </div>
                                            )}

                                            {/* Fundamentação Legal — Individual */}
                                            {result.tipoSegurado === 'INDIVIDUAL' && !result.risco.infoGrace.emBeneficio && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1 font-mono">
                                                    <p className="font-sans font-bold text-[10px] uppercase text-slate-400 mb-2">Fundamentação Legal — Contribuinte Individual</p>
                                                    <p>▸ Art. 15, II — período de graça = mês da última contrib. + prazo legal + 1 mês</p>
                                                    <p>▸ Art. 15, §1º — +12 meses se desemprego involuntário comprovado (total: 24 meses)</p>
                                                    <p>▸ Art. 15, §2º — +12 meses adicionais se ≥ 120 contribuições (total: até 36 meses)</p>
                                                </div>
                                            )}

                                            {result.risco.infoGrace.emBeneficio && (
                                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 space-y-1">
                                                    <p className="font-bold text-[10px] uppercase">✓ Em Gozo de Benefício — Art. 15, I</p>
                                                    <p>▸ Mantém qualidade durante todo o período em que recebe o benefício, sem limite de prazo</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ── 2. CRITÉRIO DE ATRASO PARA INDIVIDUAL ── */}
                                    {result.tipoSegurado === 'INDIVIDUAL' && (
                                        <div className="p-4 space-y-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">② Critério de Recolhimento em Atraso — Art. 27-A Lei 8.213/91</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                                {[
                                                    { label: 'Até 5 anos', desc: 'Recolhimento automático sem prova de atividade (contribuinte individual)', ok: true },
                                                    { label: '5 a 10 anos', desc: 'Exige prova de atividade: notas fiscais, recibos, contratos', ok: result.possuiComprovacaoAtividade },
                                                    { label: '+ de 10 anos', desc: 'Risco máximo de indeferimento mesmo com documentos', ok: false },
                                                ].map((item, i) => (
                                                    <div key={i} className={`rounded-lg p-2.5 border ${item.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                                        <p className={`font-bold mb-1 ${item.ok ? 'text-emerald-700' : 'text-slate-500'}`}>{item.label}</p>
                                                        <p className="text-slate-600 leading-snug">{item.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── 3. MEMORIAL DE ENCARGOS DETALHADO ────── */}
                                    <div className="p-4 space-y-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">③ Memorial de Encargos — Art. 35 Lei 8.212/91</p>
                                        <div className="rounded-lg border border-slate-200 overflow-hidden text-sm">
                                            {/* Principal */}
                                            <div className="grid grid-cols-12 gap-0 bg-white hover:bg-slate-50 transition-colors">
                                                <div className="col-span-5 px-3 py-2 font-semibold text-slate-700 border-b border-slate-100 flex items-center">
                                                    Contribuição Principal
                                                </div>
                                                <div className="col-span-5 px-3 py-2 text-slate-500 border-b border-l border-slate-100 text-xs flex items-center">
                                                    <span className="font-mono">R$ {result.minWageUsed} × {result.aliquotaUsed}%</span>
                                                </div>
                                                <div className="col-span-2 px-3 py-2 font-bold text-slate-800 border-b border-l border-slate-100 text-right flex items-center justify-end">
                                                    R$ {result.principal}
                                                </div>
                                            </div>
                                            {/* Multa */}
                                            <div className="grid grid-cols-12 gap-0 bg-white hover:bg-amber-50/40 transition-colors">
                                                <div className="col-span-5 px-3 py-2 font-semibold text-slate-700 border-b border-slate-100 flex flex-col justify-center">
                                                    <span>Multa de Mora</span>
                                                    <span className="text-[10px] font-normal text-slate-400">0,33% ao dia · limitado a 20%</span>
                                                </div>
                                                <div className="col-span-5 px-3 py-2 text-slate-500 border-b border-l border-slate-100 text-xs flex flex-col justify-center gap-0.5">
                                                    <span className="font-mono">R$ {result.principal} × 20% (cap)</span>
                                                    <span className="text-[10px] text-slate-400">Art. 35, I — máx. 20% após 60 dias</span>
                                                </div>
                                                <div className="col-span-2 px-3 py-2 font-bold text-amber-600 border-b border-l border-slate-100 text-right flex items-center justify-end">
                                                    R$ {result.fine}
                                                </div>
                                            </div>
                                            {/* Juros */}
                                            <div className="grid grid-cols-12 gap-0 bg-white hover:bg-red-50/30 transition-colors">
                                                <div className="col-span-5 px-3 py-2 font-semibold text-slate-700 border-b border-slate-100 flex flex-col justify-center">
                                                    <span>Juros de Mora (SELIC)</span>
                                                    <span className="text-[10px] font-normal text-slate-400">Acumulado + 1% no mês do pgto</span>
                                                </div>
                                                <div className="col-span-5 px-3 py-2 text-slate-500 border-b border-l border-slate-100 text-xs flex flex-col justify-center gap-0.5">
                                                    <span className="font-mono">R$ {result.principal} × {(result.selicAcumulada * 100).toFixed(4)}%</span>
                                                    <span className="text-[10px] text-slate-400">Art. 35, II — SELIC acum. desde vencto.</span>
                                                </div>
                                                <div className="col-span-2 px-3 py-2 font-bold text-red-600 border-b border-l border-slate-100 text-right flex items-center justify-end">
                                                    R$ {result.interest}
                                                </div>
                                            </div>
                                            {/* Total */}
                                            <div className="grid grid-cols-12 gap-0 bg-slate-900 text-white">
                                                <div className="col-span-5 px-3 py-3 font-black uppercase text-xs tracking-wide flex items-center">
                                                    Total da GPS (Campo 11)
                                                </div>
                                                <div className="col-span-5 px-3 py-3 text-slate-400 border-l border-slate-700 text-xs flex flex-col justify-center gap-0.5">
                                                    <span className="font-mono">{result.principal} + {result.fine} + {result.interest}</span>
                                                    <span className="text-[10px] text-slate-500">Encargos sobre {result.originalDueDate}</span>
                                                </div>
                                                <div className="col-span-2 px-3 py-3 font-black text-lg italic text-right border-l border-slate-700 flex items-center justify-end">
                                                    R$ {result.total}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── 4. CÓDIGO GPS ───────────────────────── */}
                                    <div className="p-4 flex flex-wrap gap-3">
                                        <div className="flex-1 min-w-[140px] bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
                                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Código GPS</p>
                                            <p className="font-black text-2xl font-mono text-slate-800">{result.aliquotaUsed === '20' ? (result.tipoSegurado === 'INDIVIDUAL' ? '1007' : '1406') : result.aliquotaUsed === '11' ? (result.tipoSegurado === 'INDIVIDUAL' ? '1163' : '1473') : '1929'}</p>
                                        </div>
                                        <div className="flex-1 min-w-[140px] bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
                                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Vencimento Original</p>
                                            <p className="font-bold text-base text-slate-800">{result.originalDueDate}</p>
                                        </div>
                                        <div className="flex-1 min-w-[140px] bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
                                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Salário Mínimo Usado</p>
                                            <p className="font-bold text-base text-slate-800">R$ {result.minWageUsed} ({result.aliquotaUsed}%)</p>
                                        </div>
                                        <div className="flex-1 min-w-[140px] bg-blue-50 rounded-lg p-3 border border-blue-100 text-xs">
                                            <p className="text-[9px] uppercase font-bold text-blue-400 mb-1">SELIC Acumulada</p>
                                            <p className="font-black text-xl text-blue-700">{(result.selicAcumulada * 100).toFixed(2)}%</p>
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card className="bg-slate-900 border-slate-800 text-white">
                                    <CardHeader className="py-4">
                                        <CardDescription className="text-slate-400">Total com Encargos</CardDescription>
                                        <CardTitle className="text-3xl font-black italic">R$ {result.total}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card>
                                    <CardHeader className="py-4">
                                        <CardDescription>Juros SELIC Acumulados</CardDescription>
                                        <CardTitle className="text-3xl font-bold text-destructive">{(result.selicAcumulada * 100).toFixed(2)}%</CardTitle>
                                    </CardHeader>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Badge variant="outline" className="flex justify-center py-2 bg-slate-50 border-slate-200 text-slate-600 gap-2">
                                    <ShieldCheck className="w-3 h-3" />
                                    Vencimento: {result.originalDueDate}
                                </Badge>
                                <Badge variant="outline" className="flex justify-center py-2 bg-slate-50 border-slate-200 text-slate-600 gap-2">
                                    <TrendingUp className="w-3 h-3 text-green-600" />
                                    Mínimo: R$ {result.minWageUsed}
                                </Badge>
                                <Badge variant="outline" className="flex justify-center py-2 bg-slate-50 border-slate-200 text-slate-600 gap-2">
                                    <TrendingUp className="w-3 h-3 text-blue-600" />
                                    Alíquota: {result.aliquotaUsed}%
                                </Badge>
                            </div>

                            <Card className="border-2">
                                <CardHeader className="border-b bg-slate-50/50">
                                    <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                        <History className="w-4 h-4 text-green-600" />
                                        Memória de Cálculo (Art. 35 Lei 8.212/91)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="text-xs uppercase">Rubrica</TableHead>
                                                <TableHead className="text-right text-xs uppercase">Base / Alíquota</TableHead>
                                                <TableHead className="text-right text-xs uppercase">Valor</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">Valor Principal</TableCell>
                                                <TableCell className="text-right">R$ {result.principal}</TableCell>
                                                <TableCell className="text-right font-bold">R$ {result.principal}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Multa de Mora (0,33% p/ dia)</TableCell>
                                                <TableCell className="text-right">Limitado a 20%</TableCell>
                                                <TableCell className="text-right font-bold text-amber-600">R$ {result.fine}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Juros de Mora (SELIC)</TableCell>
                                                <TableCell className="text-right">Acum. + 1%</TableCell>
                                                <TableCell className="text-right font-bold text-destructive">R$ {result.interest}</TableCell>
                                            </TableRow>
                                            <TableRow className="bg-slate-900 text-white font-bold h-16">
                                                <TableCell className="rounded-bl-lg">TOTAL DA GUIA</TableCell>
                                                <TableCell className="text-right">-</TableCell>
                                                <TableCell className="text-right text-xl italic">R$ {result.total}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter className="p-4 border-t flex justify-between gap-4">
                                    <Button
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2 h-11 shadow-lg shadow-blue-200"
                                        onClick={() => window.open('https://sal.rfb.gov.br/home', '_blank')}
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                        Gerar Guia no SAL (Oficial)
                                    </Button>
                                    <Button variant="outline" className="flex-1 border-2 gap-2 h-11" onClick={handleExportPDF}>
                                        <FileDown className="w-4 h-4" />
                                        Memorial de Cálculo (PDF)
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl bg-slate-50 text-center opacity-60">
                            <ShieldCheck className="w-20 h-20 text-green-200 mb-4" />
                            <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">Inteligência Previdenciária</h3>
                            <p className="text-slate-400 max-w-sm mt-3 font-medium">Insira os dados da contribuição para avaliar o risco de indeferimento e os encargos legais.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
