'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Heart, Scale, TrendingUp, AlertTriangle, CheckCircle2,
    Baby, Gavel, BarChart2, Wallet, Users, ChevronRight,
    ShieldAlert, FileSearch, ArrowUpCircle, ArrowDownCircle,
    Minus, CircleDot, Info, Calculator, Download,
} from 'lucide-react';
import {
    calcularPensaoAction, calcularGravidiosAction,
    calcularExecucaoAction, calcularRevisionalAction,
    calcularScoreAction,
} from './actions';
import type { TipoIndice } from '@/modules/family/indiceEngine';
import {
    gerarPDFPensaoBase, gerarPDFGravidicos,
    gerarPDFExecucao, gerarPDFRevisional, gerarPDFScoreJuridico,
} from '@/lib/familyPdfGenerator';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number | undefined) =>
    v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const pct = (v: number | undefined) =>
    v != null
        ? (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%'
        : '—';

const num = (v: number | undefined, decimals = 2) =>
    v != null
        ? v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : '—';

// ── Componentes auxiliares ───────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent = false }: {
    label: string; value: string; sub?: string; accent?: boolean;
}) {
    return (
        <div className={`rounded-xl border p-4 flex flex-col gap-1 ${accent ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
            <span className="text-[10px] uppercase font-bold text-slate-400">{label}</span>
            <span className={`text-2xl font-extrabold ${accent ? 'text-rose-600' : 'text-slate-800'}`}>{value}</span>
            {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
        </div>
    );
}

function ScoreBadge({ score }: { score: number }) {
    const cor = score >= 71 ? 'bg-green-100 text-green-700 border-green-200'
        : score >= 31 ? 'bg-amber-100 text-amber-700 border-amber-200'
            : 'bg-red-100 text-red-700 border-red-200';
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm font-bold ${cor}`}>
            <CircleDot className="w-3.5 h-3.5" />
            {score}/100
        </span>
    );
}

// ── ABAS ─────────────────────────────────────────────────────────────────────
type Aba = 'pensao' | 'gravidico' | 'execucao' | 'revisional' | 'score';

const ABAS: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'pensao', label: 'Pensão Base', icon: <Heart className="w-4 h-4" /> },
    { id: 'gravidico', label: 'Gravídicos', icon: <Baby className="w-4 h-4" /> },
    { id: 'execucao', label: 'Execução', icon: <Gavel className="w-4 h-4" /> },
    { id: 'revisional', label: 'Revisional', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'score', label: 'Score Jurídico', icon: <ShieldAlert className="w-4 h-4" /> },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function PensaoPage() {
    const [aba, setAba] = useState<Aba>('pensao');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const run = useCallback(async (fn: () => Promise<any>) => {
        setLoading(true);
        setResult(null);
        try { setResult(await fn()); }
        finally { setLoading(false); }
    }, []);

    // ── 1. Pensão Base ────────────────────────────────────────────────────────
    const [salario, setSalario] = useState('5000');
    const [mediaVar, setMediaVar] = useState('0');
    const [plr, setPlr] = useState('0');
    const [rendaAuto, setRendaAuto] = useState('0');
    const [percentualP, setPercentualP] = useState('0.30');
    const [numFilhos, setNumFilhos] = useState('1');
    const [novaFamiliaP, setNovaFamiliaP] = useState(false);
    const [baseCalc, setBaseCalc] = useState<'LIQUIDO' | 'BRUTO' | 'FIXO' | 'FIXO_VARIAVEIS'>('LIQUIDO');
    // 13º e Férias calculados automaticamente; null = usar auto
    const [decTerceiroOverride, setDecTerceiroOverride] = useState<string | null>(null);
    const [feriasOverride, setFeriasOverride] = useState<string | null>(null);
    const decTerceiro = decTerceiroOverride ?? String((+salario).toFixed(2));
    const ferias = feriasOverride ?? String(((+salario) * (4 / 3)).toFixed(2));


    async function handlePensao() {
        await run(() => calcularPensaoAction({
            renda: {
                salarioFixo: +salario, mediaVariaveis12m: +mediaVar, plrProporcional: +plr,
                decimoTerceiro: +decTerceiro, feriasComTerco: +ferias,
                rendaAutonoma: +rendaAuto, outrosRendimentos: 0,
            },
            percentualPleiteado: +percentualP,
            numeroFilhos: +numFilhos,
            novaFamilia: novaFamiliaP,
            filhosNovaFamilia: 0,
            baseCalculo: baseCalc,
        }));
    }

    // ── 2. Gravídicos ─────────────────────────────────────────────────────────
    const [rendaPai, setRendaPai] = useState('6000');
    const [percGrav, setPercGrav] = useState('0.20');
    const [planoSaude, setPlanoSaude] = useState('600');
    const [meds, setMeds] = useState('300');
    const [consultas, setConsultas] = useState('400');
    const [exames, setExames] = useState('500');
    const [parto, setParto] = useState('2000');
    const [enxoval, setEnxoval] = useState('1000');
    const [mesesGest, setMesesGest] = useState('5');
    const [nasceuComVida, setNasceuComVida] = useState(false);

    async function handleGravidico() {
        await run(() => calcularGravidiosAction({
            rendaSupostoPai: +rendaPai,
            percentualSugerido: +percGrav,
            despesas: {
                planoSaude: +planoSaude, medicamentos: +meds, consultas: +consultas,
                exames: +exames, parto: +parto, enxoval: +enxoval, outrasDepesas: 0,
            },
            mesesRestantesGestacao: +mesesGest,
            nasceuComVida,
        }));
    }

    // ── 3. Execução ───────────────────────────────────────────────────────────
    const [valMensal, setValMensal] = useState('1200');
    const [dataInicio, setDataInicio] = useState('2024-01-10');
    const [dataCalc, setDataCalc] = useState('2025-01-10');
    const [tipoIndice, setTipoIndice] = useState<TipoIndice>('INPC');
    const [jurosMes, setJurosMes] = useState('0.01');
    const [multaExec, setMultaExec] = useState('0.10');

    async function handleExecucao() {
        await run(() => calcularExecucaoAction({
            valorMensal: +valMensal,
            dataInicioInadimplencia: dataInicio,
            dataCalculo: dataCalc,
            tipoIndice,
            jurosMensal: +jurosMes,
            multa: +multaExec,
        }));
    }

    // ── 4. Revisional ─────────────────────────────────────────────────────────
    const [rendaAtual, setRendaAtual] = useState('8000');
    const [rendaAnt, setRendaAnt] = useState('5000');
    const [percAtual, setPercAtual] = useState('0.30');
    const [filhosRev, setFilhosRev] = useState('1');
    const [despAlim, setDespAlim] = useState('2500');
    const [novaFamRev, setNovaFamRev] = useState(false);
    const [perdaEmprego, setPerdaEmprego] = useState(false);
    const [mudancaEscola, setMudancaEscola] = useState(false);
    const [maioria, setMaioria] = useState(false);

    async function handleRevisional() {
        await run(() => calcularRevisionalAction({
            rendaAtual: +rendaAtual,
            rendaAnterior: +rendaAnt,
            percentualAtual: +percAtual,
            numeroFilhosAtual: +filhosRev,
            despesasMensaisAlimentando: +despAlim,
            novaFamilia: novaFamRev,
            filhosNovaFamilia: 0,
            perdaEmprego,
            novoEmprego: false,
            maioria,
            mudancaEscola,
            tempoObrigacao: 0,
        }));
    }

    // ── 5. Score ──────────────────────────────────────────────────────────────
    const [rendaScore, setRendaScore] = useState('5000');
    const [despScore, setDespScore] = useState('2500');
    const [fatores, setFatores] = useState({
        rendaFormalComprovada: true, rendaInformal: false,
        provaDocumentalDespesas: false, novaFamilia: false,
        historicoInadimplencia: false, alteracaoRecenteRenda: false,
        temAdvogado: true, acordoExtrajudicial: false, mediacao: false,
    });
    const toggleFator = (k: keyof typeof fatores) =>
        setFatores(prev => ({ ...prev, [k]: !prev[k] }));

    async function handleScore() {
        await run(() => calcularScoreAction(fatores, +rendaScore, +despScore));
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50/40 via-white to-pink-50/30">
            <div className="container mx-auto py-8 px-4 space-y-6">

                {/* Header */}
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-xl bg-rose-100">
                                <Heart className="w-6 h-6 text-rose-600 fill-rose-200" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
                                Pensão Alimentícia
                            </h1>
                        </div>
                        <p className="text-slate-500 text-sm ml-14">
                            Engine jurídica completa — Cálculo, Execução &amp; Análise Estratégica
                        </p>
                    </div>
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200 text-xs">
                        Family Legal Engine Pro
                    </Badge>
                </div>

                {/* Base legal */}
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
                    {['CC, Arts. 1.694–1.710', 'Lei 11.804/2008', 'CPC/2015, Art. 528', 'CF/88, Art. 227'].map(l => (
                        <span key={l} className="px-2 py-0.5 rounded-full bg-slate-100 font-medium">{l}</span>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1.5 flex-wrap">
                    {ABAS.map(a => (
                        <button
                            key={a.id}
                            onClick={() => { setAba(a.id); setResult(null); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${aba === a.id
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:text-rose-600'
                                }`}
                        >
                            {a.icon}{a.label}
                        </button>
                    ))}
                </div>

                {/* Content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* ── Formulário (2/5) ─────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* ── PENSÃO BASE ──────────────────────────────────── */}
                        {aba === 'pensao' && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-rose-500" /> Parâmetros da Renda
                                    </CardTitle>
                                    <CardDescription className="text-xs">Binômio Necessidade × Possibilidade</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">

                                    {/* ── Renda Mensal ──────────────────────────────────────── */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Renda Mensal</span>
                                            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-semibold">Recorrente</span>
                                        </div>
                                        {([
                                            ['Salário Fixo (R$)', salario, setSalario],
                                            ['Média Variáveis 12m — HE, adic. noturno, comissões (R$)', mediaVar, setMediaVar],
                                            ['Renda Autônoma / Freelánce (R$)', rendaAuto, setRendaAuto],
                                        ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, set]) => (
                                            <div key={label} className="space-y-1">
                                                <Label className="text-[10px] text-slate-400">{label}</Label>
                                                <Input type="number" step="0.01" value={val}
                                                    onChange={e => set(e.target.value)} className="h-9" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* ── Verbas Não Mensais ─────────────────────────────────── */}
                                    <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Verbas Não Mensais</span>
                                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-semibold">Anuais / Esporádicas</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400">Informe o valor total anual de cada verba. A pensão sobre elas será calculada separadamente.</p>

                                        {/* 13º Salário — auto */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] text-slate-400">13º Salário (valor anual) (R$)</Label>
                                                <div className="flex items-center gap-1">
                                                    {decTerceiroOverride === null
                                                        ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold">Auto</span>
                                                        : <button onClick={() => setDecTerceiroOverride(null)} className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 font-semibold hover:bg-rose-200">Resetar</button>
                                                    }
                                                </div>
                                            </div>
                                            <Input
                                                type="number" step="0.01"
                                                value={decTerceiro}
                                                onChange={e => setDecTerceiroOverride(e.target.value)}
                                                className={`h-9 ${decTerceiroOverride === null ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''}`}
                                            />
                                        </div>

                                        {/* Férias + 1/3 — auto */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] text-slate-400">Férias + 1/3 Constitucional (valor anual) (R$)</Label>
                                                <div className="flex items-center gap-1">
                                                    {feriasOverride === null
                                                        ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold">Auto</span>
                                                        : <button onClick={() => setFeriasOverride(null)} className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 font-semibold hover:bg-rose-200">Resetar</button>
                                                    }
                                                </div>
                                            </div>
                                            <Input
                                                type="number" step="0.01"
                                                value={ferias}
                                                onChange={e => setFeriasOverride(e.target.value)}
                                                className={`h-9 ${feriasOverride === null ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''}`}
                                            />
                                        </div>

                                        {/* PLR — manual */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-slate-400">PLR / Bônus (valor anual) (R$)</Label>
                                            <Input type="number" step="0.01" value={plr}
                                                onChange={e => setPlr(e.target.value)} className="h-9" />
                                        </div>
                                    </div>

                                    {/* ── Opções ────────────────────────────────────────────── */}
                                    <div className="space-y-3 pt-2 border-t border-dashed border-slate-200">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Percentual</Label>
                                                <Input type="number" step="0.01" value={percentualP}
                                                    onChange={e => setPercentualP(e.target.value)} className="h-9" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Nº de Filhos</Label>
                                                <Input type="number" value={numFilhos}
                                                    onChange={e => setNumFilhos(e.target.value)} className="h-9" />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Base de Cálculo</Label>
                                            <select
                                                value={baseCalc}
                                                onChange={e => setBaseCalc(e.target.value as any)}
                                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                <option value="LIQUIDO">Renda Líquida (padrão)</option>
                                                <option value="BRUTO">Renda Bruta</option>
                                                <option value="FIXO">Somente Salário Fixo</option>
                                                <option value="FIXO_VARIAVEIS">Fixo + Variáveis</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between py-2 border-t">
                                            <Label className="text-xs text-slate-500">Nova família constituída?</Label>
                                            <Switch checked={novaFamiliaP} onCheckedChange={setNovaFamiliaP} />
                                        </div>
                                    </div>

                                    <Button onClick={handlePensao} disabled={loading}
                                        className="w-full bg-rose-600 hover:bg-rose-700">
                                        <Calculator className="w-4 h-4 mr-2" />
                                        {loading ? 'Calculando...' : 'Calcular Pensão'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* ── GRAVÍDICOS ────────────────────────────────────── */}
                        {aba === 'gravidico' && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Baby className="w-4 h-4 text-rose-500" /> Alimentos Gravídicos
                                    </CardTitle>
                                    <CardDescription className="text-xs">Lei 11.804/2008 — desde a concepção</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">

                                    {/* Dados do suposto pai */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1 col-span-2">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Renda do Suposto Pai (R$)</Label>
                                            <Input type="number" value={rendaPai} onChange={e => setRendaPai(e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">% Sugerido</Label>
                                            <Input type="number" step="0.01" value={percGrav} onChange={e => setPercGrav(e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Meses restantes</Label>
                                            <Input type="number" value={mesesGest} onChange={e => setMesesGest(e.target.value)} className="h-9" />
                                        </div>
                                    </div>

                                    {/* ── Despesas Mensais ────────────────────── */}
                                    <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Despesas Mensais</span>
                                            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-semibold">Recorrente / mês</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400">Valores que se repetem todo mês durante a gestação.</p>
                                        {([
                                            ['Plano de Saúde (R$/mês)', planoSaude, setPlanoSaude],
                                            ['Medicamentos (R$/mês)', meds, setMeds],
                                            ['Consultas Médicas (R$/mês)', consultas, setConsultas],
                                            ['Exames / Ultrassons (R$/mês)', exames, setExames],
                                        ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, set]) => (
                                            <div key={label} className="space-y-1">
                                                <Label className="text-[10px] text-slate-400">{label}</Label>
                                                <Input type="number" step="0.01" value={val}
                                                    onChange={e => set(e.target.value)} className="h-9" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* ── Despesas Pontuais (Não Mensais) ─────── */}
                                    <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Despesas Pontuais</span>
                                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-semibold">Não Mensais / Únicas</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400">Gastos que ocorrem uma única vez. O engine divide pelo nº de meses restantes para calcular o impacto mensal.</p>
                                        {([
                                            ['Parto / Internação (R$ total)', parto, setParto],
                                            ['Enxoval / Equipamentos (R$ total)', enxoval, setEnxoval],
                                        ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, set]) => (
                                            <div key={label} className="space-y-1">
                                                <Label className="text-[10px] text-slate-400">{label}</Label>
                                                <Input type="number" step="0.01" value={val}
                                                    onChange={e => set(e.target.value)} className="h-9" />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between py-2 border-t">
                                        <Label className="text-xs text-slate-500">Nasceu com vida? (converte em pensão)</Label>
                                        <Switch checked={nasceuComVida} onCheckedChange={setNasceuComVida} />
                                    </div>
                                    <Button onClick={handleGravidico} disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700">
                                        <Calculator className="w-4 h-4 mr-2" />
                                        {loading ? 'Calculando...' : 'Calcular Gravídicos'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}


                        {/* ── EXECUÇÃO ─────────────────────────────────────── */}
                        {aba === 'execucao' && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Gavel className="w-4 h-4 text-rose-500" /> Execução de Alimentos
                                    </CardTitle>
                                    <CardDescription className="text-xs">CPC/2015, Art. 528 — atualização monetária + rito</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Valor Mensal da Pensão (R$)</Label>
                                        <Input type="number" value={valMensal} onChange={e => setValMensal(e.target.value)} className="h-9" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Início Inadimplência</Label>
                                            <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Data do Cálculo</Label>
                                            <Input type="date" value={dataCalc} onChange={e => setDataCalc(e.target.value)} className="h-9" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Índice de Correção</Label>
                                        <select value={tipoIndice} onChange={e => setTipoIndice(e.target.value as TipoIndice)}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                                            <option value="INPC">INPC</option>
                                            <option value="IPCA">IPCA</option>
                                            <option value="SALARIO_MINIMO">Salário Mínimo</option>
                                            <option value="PERSONALIZADO">Personalizado</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Juros a.m.</Label>
                                            <Input type="number" step="0.001" value={jurosMes} onChange={e => setJurosMes(e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Multa</Label>
                                            <Input type="number" step="0.01" value={multaExec} onChange={e => setMultaExec(e.target.value)} className="h-9" />
                                        </div>
                                    </div>
                                    <Button onClick={handleExecucao} disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700">
                                        <Calculator className="w-4 h-4 mr-2" />
                                        {loading ? 'Calculando...' : 'Calcular Execução'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* ── REVISIONAL ───────────────────────────────────── */}
                        {aba === 'revisional' && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-rose-500" /> Simulador Revisional
                                    </CardTitle>
                                    <CardDescription className="text-xs">CC, Art. 1.699 — mudança de situação financeira</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Renda Anterior (R$)</Label>
                                            <Input type="number" value={rendaAnt} onChange={e => setRendaAnt(e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Renda Atual (R$)</Label>
                                            <Input type="number" value={rendaAtual} onChange={e => setRendaAtual(e.target.value)} className="h-9" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Percentual Atual</Label>
                                            <Input type="number" step="0.01" value={percAtual} onChange={e => setPercAtual(e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Nº de Filhos</Label>
                                            <Input type="number" value={filhosRev} onChange={e => setFilhosRev(e.target.value)} className="h-9" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Despesas do Alimentando (R$/mês)</Label>
                                        <Input type="number" value={despAlim} onChange={e => setDespAlim(e.target.value)} className="h-9" />
                                    </div>
                                    {[
                                        ['Nova família?', novaFamRev, setNovaFamRev],
                                        ['Perda de emprego?', perdaEmprego, setPerdaEmprego],
                                        ['Mudança de escola?', mudancaEscola, setMudancaEscola],
                                        ['Alimentando atingiu 18 anos?', maioria, setMaioria],
                                    ].map(([label, val, set]) => (
                                        <div key={label as string} className="flex items-center justify-between py-1.5 border-t">
                                            <Label className="text-xs text-slate-500">{label as string}</Label>
                                            <Switch checked={val as boolean} onCheckedChange={set as any} />
                                        </div>
                                    ))}
                                    <Button onClick={handleRevisional} disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700">
                                        <Calculator className="w-4 h-4 mr-2" />
                                        {loading ? 'Analisando...' : 'Simular Revisional'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* ── SCORE ─────────────────────────────────────────── */}
                        {aba === 'score' && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileSearch className="w-4 h-4 text-rose-500" /> Score Jurídico
                                    </CardTitle>
                                    <CardDescription className="text-xs">Índice de solidez da pretensão alimentar</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Renda Alimentante (R$)</Label>
                                            <Input type="number" value={rendaScore} onChange={e => setRendaScore(e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Despesas Alimentando (R$)</Label>
                                            <Input type="number" value={despScore} onChange={e => setDespScore(e.target.value)} className="h-9" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 border-t pt-2">Fatores</p>
                                    {([
                                        ['rendaFormalComprovada', 'Renda formal comprovada (holerite/IR)'],
                                        ['rendaInformal', 'Renda informal / difícil comprovação'],
                                        ['provaDocumentalDespesas', 'Provas documentais das despesas'],
                                        ['novaFamilia', 'Nova família constituída'],
                                        ['historicoInadimplencia', 'Histórico de inadimplência do alimentante'],
                                        ['alteracaoRecenteRenda', 'Alteração recente de renda'],
                                        ['temAdvogado', 'Assistência jurídica especializada'],
                                        ['acordoExtrajudicial', 'Acordo extrajudicial tentado (e frustrado)'],
                                        ['mediacao', 'Mediação ou conciliação prévia tentada'],
                                    ] as [keyof typeof fatores, string][]).map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between py-1 border-b last:border-0">
                                            <Label className="text-xs text-slate-600">{label}</Label>
                                            <Switch checked={fatores[key]} onCheckedChange={() => toggleFator(key)} />
                                        </div>
                                    ))}
                                    <Button onClick={handleScore} disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700">
                                        <ShieldAlert className="w-4 h-4 mr-2" />
                                        {loading ? 'Analisando...' : 'Calcular Score'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* ── Results (3/5) ─────────────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-4">
                        {!result && !loading && (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-rose-200 rounded-2xl bg-rose-50/20 p-12">
                                <Heart className="w-16 h-16 text-rose-200 fill-rose-50 mb-4" />
                                <h3 className="text-lg font-bold text-rose-800/40">Selecione um módulo e calcule</h3>
                                <p className="text-sm text-rose-800/25 text-center mt-1 max-w-xs">
                                    Preencha os parâmetros ao lado e clique em <em>Calcular</em>
                                </p>
                            </div>
                        )}

                        {loading && (
                            <div className="h-full min-h-[200px] flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                            </div>
                        )}

                        {/* ── Resultado PENSÃO ──────────────────────────────── */}
                        {result && aba === 'pensao' && result.pensao && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-3">
                                    <MetricCard label="Valor Mensal" value={fmt(result.pensao.valorMensalCalculado)} accent />
                                    <MetricCard label="Por Filho" value={fmt(result.pensao.valorPorFilho)} />
                                    <MetricCard label="Impacto Anual" value={fmt(result.pensao.impactoAnual)} />
                                    <MetricCard label="Comprometimento" value={result.pensao.comprometimentoRenda} />
                                </div>

                                {/* Verbas anuais */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Verbas Anuais Extra</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {[
                                            ['Pensão sobre 13º Salário', result.pensao.pensaoSobre13],
                                            ['Pensão sobre Férias + 1/3', result.pensao.pensaoSobreFerias],
                                            ['Projeção até 18 anos', result.pensao.impactoAte18Anos],
                                        ].map(([l, v]) => (
                                            <div key={l as string} className="flex justify-between text-sm border-b pb-1 last:border-0">
                                                <span className="text-slate-600">{l as string}</span>
                                                <span className="font-bold text-slate-800">{fmt(v as number)}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Cenários comparativos */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Scale className="w-4 h-4 text-rose-500" /> Cenários Comparativos
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {result.pensao.cenarios.map((c: any) => (
                                                <div key={c.percentual} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm border ${c.percentual === Math.round(+percentualP * 100) ? 'bg-rose-50 border-rose-300 font-bold' : 'border-slate-100'}`}>
                                                    <span className="flex items-center gap-2 text-slate-600">
                                                        <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                                                        {c.label}
                                                    </span>
                                                    <span className="font-bold text-slate-800">{fmt(c.valorMensal)}/mês</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Memória */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Memória de Cálculo</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-1">
                                            {result.pensao.memoriaCalculo.map((m: string, i: number) => (
                                                <li key={i} className="text-xs text-slate-500 flex gap-2">
                                                    <span className="text-rose-400 font-bold">›</span>{m}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>

                                <Button
                                    onClick={() => gerarPDFPensaoBase(result)}
                                    className="w-full bg-rose-700 hover:bg-rose-800 gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Baixar PDF — Pensão Base
                                </Button>
                            </div>
                        )}

                        {/* ── Resultado GRAVÍDICOS ─────────────────────────── */}
                        {result && aba === 'gravidico' && result.gravidico && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-3">
                                    <MetricCard label="Valor Mensal Sugerido" value={fmt(result.gravidico.valorMensalSugerido)} accent />
                                    <MetricCard label="Total da Gestação" value={fmt(result.gravidico.valorTotalGestacao)} />
                                    <MetricCard label="Quota do Suposto Pai" value={fmt(result.gravidico.quotaSupostoPai)} />
                                    <MetricCard label="Total Mensal Efetivo" value={fmt(result.gravidico.totalDespesasMensais)} />
                                </div>

                                {/* Breakdown de despesas */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Composição das Despesas</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex justify-between text-sm border-b pb-2">
                                            <span className="text-slate-600 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                                                Mensais recorrentes
                                            </span>
                                            <span className="font-bold text-slate-800">{fmt(result.gravidico.totalDespesasMensaisRecorrentes)}<span className="text-slate-400 font-normal text-xs">/mês</span></span>
                                        </div>
                                        <div className="flex justify-between text-sm pb-1">
                                            <span className="text-slate-600 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                                                Pontuais rateadas
                                            </span>
                                            <span className="font-bold text-slate-800">{fmt(result.gravidico.totalDespesasPontuaisRateadas)}<span className="text-slate-400 font-normal text-xs">/mês</span></span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {result.gravidico.conversaoPensao && (
                                    <Card className="border-green-200 bg-green-50">
                                        <CardContent className="pt-4 flex items-start gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-bold text-sm text-green-700">Conversão Automática</p>
                                                <p className="text-xs text-green-600 mt-1">{result.gravidico.conversaoPensao.status}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm">Memória de Cálculo</CardTitle></CardHeader>
                                    <CardContent>
                                        <ul className="space-y-1">
                                            {result.gravidico.memoriaCalculo.map((m: string, i: number) => (
                                                <li key={i} className="text-xs text-slate-500 flex gap-2">
                                                    <span className="text-rose-400 font-bold">›</span>{m}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>

                                <Button
                                    onClick={() => gerarPDFGravidicos(result)}
                                    className="w-full bg-rose-700 hover:bg-rose-800 gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Baixar PDF — Alimentos Gravídicos
                                </Button>
                            </div>
                        )}

                        {/* ── Resultado EXECUÇÃO ───────────────────────────── */}
                        {result && aba === 'execucao' && result.execucao && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-3">
                                    <MetricCard label="Total Executável" value={fmt(result.execucao.totalExecutavel)} accent />
                                    <MetricCard label="Parcelas" value={`${result.execucao.numeroParcelas}x`} />
                                    <MetricCard label="Rito Prisão (3 últ.)" value={fmt(result.execucao.valorRitoPrisao)} sub="CPC, Art. 528" />
                                    <MetricCard label="Rito Penhora" value={fmt(result.execucao.valorRitoPenhora)} />
                                </div>

                                <Card className="border-amber-200 bg-amber-50">
                                    <CardContent className="pt-4 space-y-2">
                                        <p className="font-bold text-sm text-amber-700">Simulação de Acordo</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-amber-600">À vista (30% deságio)</span>
                                            <span className="font-bold">{fmt(result.execucao.simulacaoAcordoVista)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-amber-600">Parcelamento em 3×</span>
                                            <span className="font-bold">{fmt(result.execucao.simulacaoParcelamento3x)}/mês</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Comparativo de índices */}
                                {result.comparativoIndices && (
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">Comparativo de Índices (valor corrigido total)</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {Object.entries(result.comparativoIndices).map(([k, v]) => (
                                                <div key={k} className="flex justify-between text-sm border-b pb-1 last:border-0">
                                                    <span className="text-slate-500">{k}</span>
                                                    <span className="font-bold">{fmt(v as number)}</span>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Tabela de parcelas (resumo) */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Parcelas Atualizadas</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="max-h-64 overflow-y-auto space-y-1">
                                            {result.execucao.parcelas.map((p: any) => (
                                                <div key={p.competencia} className={`flex justify-between items-center text-xs px-2 py-1 rounded ${p.rito === 'PRISAO' ? 'bg-red-50 border border-red-100' : 'bg-slate-50'}`}>
                                                    <span className="font-medium">{p.competencia}</span>
                                                    <span className="text-slate-400">{p.mesesAtraso} {p.mesesAtraso === 1 ? 'mês' : 'meses'}</span>
                                                    <span className={`font-bold ${p.rito === 'PRISAO' ? 'text-red-600' : 'text-slate-700'}`}>
                                                        {fmt(p.totalAtualizado)}
                                                    </span>
                                                    <Badge variant="outline" className={`text-[9px] ${p.rito === 'PRISAO' ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-500'}`}>
                                                        {p.rito}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Button
                                    onClick={() => gerarPDFExecucao(result)}
                                    className="w-full bg-rose-700 hover:bg-rose-800 gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Baixar PDF — Execução de Alimentos
                                </Button>
                            </div>
                        )}

                        {/* ── Resultado REVISIONAL ─────────────────────────── */}
                        {result && aba === 'revisional' && result.revisional && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-3">
                                    <MetricCard label="Score Probabilístico"
                                        value={num(result.revisional.scoreProbabilidade, 0) + '/100'}
                                        sub={result.revisional.classificacao} accent />
                                    <MetricCard label="Variação de Renda" value={pct(result.revisional.variacaoRenda)} />
                                    <MetricCard label="Valor Atual" value={fmt(result.revisional.valorMensalAtual)} />
                                    <MetricCard label="Valor Sugerido" value={fmt(result.revisional.valorMensalSugerido)} />
                                </div>

                                {/* Diagnóstico */}
                                <Card>
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            {result.revisional.classificacao === 'ALTA'
                                                ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                : result.revisional.classificacao === 'MEDIA'
                                                    ? <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                    : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                                            <div>
                                                <p className="font-bold text-sm">{result.revisional.probabilidadeTexto}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Impacto anual da diferença: {fmt(result.revisional.impactoAnualDiferenca)}
                                                </p>
                                            </div>
                                        </div>

                                        {result.revisional.fatoresPositivos.length > 0 && (
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-green-600 mb-1">Fatores Favoráveis</p>
                                                <ul className="space-y-1">
                                                    {result.revisional.fatoresPositivos.map((f: string, i: number) => (
                                                        <li key={i} className="text-xs flex gap-2 text-slate-600">
                                                            <ArrowUpCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />{f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {result.revisional.fatoresNegativos.length > 0 && (
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-red-600 mb-1">Fatores Desfavoráveis</p>
                                                <ul className="space-y-1">
                                                    {result.revisional.fatoresNegativos.map((f: string, i: number) => (
                                                        <li key={i} className="text-xs flex gap-2 text-slate-600">
                                                            <ArrowDownCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />{f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Button
                                    onClick={() => gerarPDFRevisional(result)}
                                    className="w-full bg-rose-700 hover:bg-rose-800 gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Baixar PDF — Revisional
                                </Button>
                            </div>
                        )}

                        {/* ── Resultado SCORE ───────────────────────────────── */}
                        {result && aba === 'score' && result.score && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <Card className={`border-t-4 ${result.score.nivel === 'ALTO' ? 'border-t-green-500' : result.score.nivel === 'MEDIO' ? 'border-t-amber-500' : 'border-t-red-500'}`}>
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-lg font-extrabold text-slate-800">{result.score.descricao}</p>
                                                <p className="text-xs text-slate-500 mt-1">{result.score.recomendacao}</p>
                                            </div>
                                            <ScoreBadge score={result.score.score} />
                                        </div>

                                        {/* Barra de score */}
                                        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${result.score.nivel === 'ALTO' ? 'bg-green-500' : result.score.nivel === 'MEDIO' ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${result.score.score}%` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-3 gap-3">
                                    <MetricCard label="Cap. Contributiva" value={pct(result.score.indiceCapacidadeContributiva)} />
                                    <MetricCard label="Necessidade" value={pct(result.score.indiceNecessidadeAlimentando)} />
                                    <MetricCard label="% Recomendado" value={result.score.percentualRecomendado} accent />
                                </div>

                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm">Fatores Avaliados</CardTitle></CardHeader>
                                    <CardContent className="space-y-1">
                                        {result.score.detalhes.map((d: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-xs border-b last:border-0 py-1">
                                                <span className="text-slate-600">{d.fator}</span>
                                                <span className={`font-bold ${d.positivo ? 'text-green-600' : 'text-red-500'}`}>
                                                    {d.impacto > 0 ? '+' : ''}{d.impacto} pts
                                                </span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Button
                                    onClick={() => gerarPDFScoreJuridico(result)}
                                    className="w-full bg-rose-700 hover:bg-rose-800 gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Baixar PDF — Score Jurídico
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
