'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateLaborAction, listSimulations, deleteSimulation, getSimulation } from './actions';
import { DatePicker } from '@/components/ui/date-picker';
import {
    BriefcaseBusiness, Scale, AlertTriangle, CheckCircle2, ShieldAlert,
    TrendingUp, Download, FileText, User, Building2, Clock, ReceiptText,
    PiggyBank, ScrollText, ChevronDown, ChevronUp, History, Trash2, Edit3,
    Plus, Calendar,
} from 'lucide-react';
import { CartaoPonto, type VerbasCartao } from './CartaoPonto';
import { GuiaFinal } from './GuiaFinal';

// ── Helpers ──────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const anosAtras = (n: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return d.toISOString().split('T')[0];
};

const LABEL_RESCISAO: Record<string, string> = {
    SEM_JUSTA_CAUSA: 'Sem Justa Causa',
    COM_JUSTA_CAUSA: 'Com Justa Causa',
    PEDIDO_DEMISSAO: 'Pedido de Demissão',
    RESCISAO_INDIRETA: 'Rescisão Indireta',
    ACORDO_484A: 'Acordo (Art. 484-A)',
    FIM_EXPERIENCIA: 'Fim de Contrato de Experiência',
    FIM_DETERMINADO: 'Fim de Contrato Determinado',
};

// ── Accordion colapsável ──────────────────────────────────────────────────────
function Accordion({ title, icon, children, defaultOpen = false }: {
    title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-700">
                    {icon}{title}
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {open && <div className="p-4 space-y-4 bg-white">{children}</div>}
        </div>
    );
}

// ── Checkbox de irregularidade ────────────────────────────────────────────────
function IrrCheck({ name, label, peso, checked, onChange }: {
    name: string; label: string; peso?: number; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <div className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${checked ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                    type="checkbox"
                    name={name}
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                {label}
            </label>
            {peso && <Badge variant="outline" className={`text-[9px] ${checked ? 'bg-red-100 text-red-700 border-red-200' : 'text-slate-400'}`}>peso {peso}</Badge>}
        </div>
    );
}

// ── Limite salário-família 2025 (portaria MPS nº 3, 2025) ───────────────────
const LIMITE_SALARIO_FAMILIA = 1869.10;

// ─────────────────────────────────────────────────────────────────────────────
export default function RescisaoPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [tipoRescisao, setTipoRescisao] = useState('SEM_JUSTA_CAUSA');
    const [dataAdmissao, setDataAdmissao] = useState(anosAtras(2));
    const [dataDemissao, setDataDemissao] = useState(today);

    // Flags da identificação (controlados)
    const [ajuizou, setAjuizou] = useState(false);
    const [recebeSeguro, setRecebeSeguro] = useState(false);

    // Férias vencidas condicional
    const [temFeriasVencidas, setTemFeriasVencidas] = useState(false);

    // Salário para cálculo de salário-família
    const [salarioBase, setSalarioBase] = useState(3500.00);
    const temDireitoSalarioFamilia = salarioBase <= LIMITE_SALARIO_FAMILIA;

    // Jornada e intervalo
    const [cargaHorariaDiaria, setCargaHorariaDiaria] = useState('8');
    const [temIntervalomaco, setTemIntervaloAlmoco] = useState(true);
    const [localIntervalomaco, setLocalIntervaloAlmoco] = useState('empresa');

    // Tipo de trabalhador (impacta adicional noturno)
    const [tipoTrabalhador, setTipoTrabalhador] = useState<'URBANO' | 'RURAL'>('URBANO');

    // Horas extras — percentual
    const [percentualHE, setPercentualHE] = useState<'50' | '100'>('50');

    // Irregularidades controladas
    const [irr, setIrr] = useState({
        horasExtras: false, intervalo: false, adicionalNoturno: false,
        insalubridade: false, desvioFuncao: false, fgts: false,
        ferias: false, salarioPorFora: false, assedio: false,
        acidente: false, possuiProvas: false, reincidente: false,
    });

    const setI = useCallback((key: keyof typeof irr, val: boolean) => {
        setIrr(prev => ({ ...prev, [key]: val }));
    }, []);

    const scoreAtual = Object.values(irr).filter(Boolean).length;

    // Resumo Cartão e Histórico
    const [resumoCartao, setResumoCartao] = useState<VerbasCartao | null>(null);
    const [showGuia, setShowGuia] = useState(false);
    const [currentSimulationId, setCurrentSimulationId] = useState<number | undefined>(undefined);
    const [history, setHistory] = useState<any[]>([]);

    const loadHistory = useCallback(async () => {
        const data = await listSimulations();
        setHistory(data);
    }, []);

    useState(() => { loadHistory(); });

    async function handleLoadSimulation(id: number) {
        setLoading(true);
        const sim = await getSimulation(id);
        if (sim) {
            const input = sim.inputData as any;
            setTipoRescisao(input.tipoRescisao || 'SEM_JUSTA_CAUSA');
            setDataAdmissao(input.dataAdmissao || anosAtras(2));
            setDataDemissao(input.dataDemissao || today);
            setSalarioBase(parseFloat(input.salarioBase) || 3500);
            setTipoTrabalhador(input.tipoTrabalhador === 'RURAL' ? 'RURAL' : 'URBANO');
            setCargaHorariaDiaria(input.cargaHorariaDiaria || '8');
            setAjuizou(input.ajuizou === 'on');
            setRecebeSeguro(input.recebeSeguro === 'on');
            setTemIntervaloAlmoco(input.temIntervalomaco === 'on');
            setLocalIntervaloAlmoco(input.localIntervaloAlmoco || 'empresa');

            // Reconstruir o objeto irr
            const newIrr = { ...irr };
            Object.keys(irr).forEach(key => {
                (newIrr as any)[key] = input[`irr_${key}`] === 'on';
            });
            setIrr(newIrr);

            setCurrentSimulationId(sim.id);
            setResult(sim.resultData);
        }
        setLoading(false);
        setTimeout(() => document.getElementById('resultados-rescisao')?.scrollIntoView({ behavior: 'smooth' }), 100);
    }

    async function handleDeleteSimulation(id: number) {
        if (!confirm('Deseja realmente excluir este cálculo?')) return;
        const res = await deleteSimulation(id);
        if (res.success) {
            if (currentSimulationId === id) {
                setCurrentSimulationId(undefined);
                setResult(null);
            }
            loadHistory();
        }
    }

    function handleNewCalculation() {
        setCurrentSimulationId(undefined);
        setResult(null);
        setIrr({
            horasExtras: false, intervalo: false, adicionalNoturno: false,
            insalubridade: false, desvioFuncao: false, fgts: false,
            ferias: false, salarioPorFora: false, assedio: false,
            acidente: false, possuiProvas: false, reincidente: false,
        });
        // Outros resets de estado se necessário
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        fd.set('tipoRescisao', tipoRescisao);
        fd.set('dataAdmissao', dataAdmissao);
        fd.set('dataDemissao', dataDemissao);
        fd.set('tipoTrabalhador', tipoTrabalhador);
        fd.set('minutosExtrasCard', String(resumoCartao?.minutosExtrasTotal || 0));
        fd.set('temIntervalomaco', temIntervalomaco ? 'on' : '');
        fd.set('localIntervaloAlmoco', localIntervalomaco);
        fd.set('cargaHorariaDiaria', cargaHorariaDiaria);
        if (ajuizou) fd.set('ajuizou', 'on');
        if (recebeSeguro) fd.set('recebeSeguro', 'on');
        // Flags de irregularidade
        Object.entries(irr).forEach(([k, v]) => {
            if (v) fd.set(`irr_${k}`, 'on');
        });
        const data = await calculateLaborAction(fd, currentSimulationId);
        setResult(data);
        if ((data as any).id) setCurrentSimulationId((data as any).id);
        loadHistory();
        setLoading(false);
        // Scroll para resultados
        setTimeout(() => document.getElementById('resultados-rescisao')?.scrollIntoView({ behavior: 'smooth' }), 100);
    }

    return (
        <div className="container mx-auto py-8 space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Rescisão Trabalhista</h1>
                    <p className="text-sm text-slate-500 mt-1">Ficha de atendimento · Cálculo completo · Score de risco · CLT</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleNewCalculation}
                        className="h-9 border-dashed border-slate-300 hover:border-orange-500 hover:text-orange-600 font-bold gap-2 text-xs"
                    >
                        <Plus className="w-3.5 h-3.5" /> Novo Cálculo
                    </Button>
                    <Badge className="bg-orange-600 text-white border-0 uppercase tracking-wide text-xs px-3 py-1.5">
                        Módulo Trabalhista Pro
                    </Badge>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                    {/* ── COLUNA ESQUERDA: FICHA DE ATENDIMENTO ──────────── */}
                    <div className="xl:col-span-3 space-y-3">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 px-1">Ficha de Atendimento</p>

                        {/* 1. Identificação */}
                        <Accordion title="1. Identificação do Cliente" icon={<User className="w-4 h-4 text-orange-500" />} defaultOpen>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Nome Completo</Label>
                                    <Input name="nomeCliente" placeholder="Ex: João da Silva" className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">CPF</Label>
                                    <Input name="cpfCliente" placeholder="000.000.000-00" className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Dependentes (IRRF)</Label>
                                    <Input name="numeroDependentes" type="number" min="0" defaultValue="0" className="h-9" />
                                </div>
                            </div>
                            <div className="space-y-2 text-xs">
                                {/* Já ajuizou — afeta score e estratégia */}
                                <div
                                    onClick={() => setAjuizou(v => !v)}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${ajuizou ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'
                                        }`}
                                >
                                    <span className={`font-medium ${ajuizou ? 'text-amber-800' : 'text-slate-600'}`}>
                                        Já ajuizou ação trabalhista?
                                    </span>
                                    <Switch checked={ajuizou} onCheckedChange={setAjuizou} />
                                </div>
                                {ajuizou && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[10px] text-amber-800">
                                        ⚠ Ação anterior pode impactar litispendência, coisa julgada ou estratégia de acordo.
                                    </div>
                                )}

                                {/* Está recebendo seguro-desemprego */}
                                <div
                                    onClick={() => setRecebeSeguro(v => !v)}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${recebeSeguro ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'
                                        }`}
                                >
                                    <span className={`font-medium ${recebeSeguro ? 'text-blue-800' : 'text-slate-600'}`}>
                                        Está recebendo seguro-desemprego?
                                    </span>
                                    <Switch checked={recebeSeguro} onCheckedChange={setRecebeSeguro} />
                                </div>
                                {recebeSeguro && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[10px] text-blue-800">
                                        ℹ Recebimento do seguro-desemprego suspende em caso de reemprego ou ação judicial de reintegração.
                                    </div>
                                )}
                            </div>
                        </Accordion>

                        {/* 2. Contrato */}
                        <Accordion title="2. Dados do Contrato" icon={<Building2 className="w-4 h-4 text-blue-500" />} defaultOpen>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Empresa</Label>
                                    <Input name="nomeEmpresa" placeholder="Razão social" className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">CNPJ</Label>
                                    <Input name="cnpjEmpresa" placeholder="00.000.000/0001-00" className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Cargo Registrado</Label>
                                    <Input name="cargoRegistrado" placeholder="Conforme CTPS" className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Função Real Exercida</Label>
                                    <Input name="funcaoReal" placeholder="Função efetiva" className="h-9" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Data de Admissão</Label>
                                    <DatePicker name="dataAdmissao" value={dataAdmissao} onChange={setDataAdmissao} />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Data de Demissão</Label>
                                    <DatePicker name="dataDemissao" value={dataDemissao} onChange={setDataDemissao} />
                                </div>
                            </div>
                        </Accordion>

                        {/* 3. Tipo de Rescisão */}
                        <Accordion title="3. Tipo de Rescisão" icon={<ReceiptText className="w-4 h-4 text-emerald-500" />} defaultOpen>
                            <div className="space-y-2">
                                {Object.entries(LABEL_RESCISAO).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setTipoRescisao(value)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${tipoRescisao === value ? 'bg-orange-50 border-orange-400 text-orange-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                    >
                                        {tipoRescisao === value ? '● ' : '○ '}{label}
                                    </button>
                                ))}
                            </div>
                            {tipoRescisao === 'PEDIDO_DEMISSAO' && (
                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                                    <span className="font-medium text-amber-800">Aviso prévio será cumprido?</span>
                                    <Switch name="avisoTrabalhado" />
                                </div>
                            )}
                        </Accordion>

                        {/* 4. Irregularidades */}
                        <Accordion title="4. Irregularidades Identificadas" icon={<AlertTriangle className="w-4 h-4 text-red-500" />}>
                            <div className="space-y-2">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Jornada e Remuneração</p>
                                <IrrCheck name="irr_horasExtras" label="Horas extras não pagas" peso={18} checked={irr.horasExtras} onChange={v => setI('horasExtras', v)} />
                                <IrrCheck name="irr_intervalo" label="Intervalo intrajornada curtado" peso={10} checked={irr.intervalo} onChange={v => setI('intervalo', v)} />
                                <IrrCheck name="irr_adicionalNoturno" label="Adicional noturno não pago" peso={6} checked={irr.adicionalNoturno} onChange={v => setI('adicionalNoturno', v)} />
                                <IrrCheck name="irr_insalubridade" label="Insalubridade/periculosidade não paga" peso={6} checked={irr.insalubridade} onChange={v => setI('insalubridade', v)} />
                                <IrrCheck name="irr_desvioFuncao" label="Desvio ou acúmulo de função" peso={10} checked={irr.desvioFuncao} onChange={v => setI('desvioFuncao', v)} />
                                <IrrCheck name="irr_salarioPorFora" label="Salário pago por fora (informal)" peso={10} checked={irr.salarioPorFora} onChange={v => setI('salarioPorFora', v)} />

                                <Separator />
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Rescisão e Contrato</p>
                                <IrrCheck name="irr_fgts" label="FGTS não depositado / irregular" peso={18} checked={irr.fgts} onChange={v => setI('fgts', v)} />
                                <IrrCheck name="irr_ferias" label="Férias concedidas fora do prazo" peso={14} checked={irr.ferias} onChange={v => setI('ferias', v)} />
                                <IrrCheck name="irr_assedio" label="Assédio moral" peso={14} checked={irr.assedio} onChange={v => setI('assedio', v)} />
                                <IrrCheck name="irr_acidente" label="Acidente de trabalho" peso={10} checked={irr.acidente} onChange={v => setI('acidente', v)} />

                                <Separator />
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Agravantes</p>
                                <IrrCheck name="irr_possuiProvas" label="Possui provas documentais (+15%)" checked={irr.possuiProvas} onChange={v => setI('possuiProvas', v)} />
                                <IrrCheck name="irr_reincidente" label="Empregador com histórico de ações (+10%)" checked={irr.reincidente} onChange={v => setI('reincidente', v)} />
                            </div>
                        </Accordion>

                        {/* 5. Relato Livre */}
                        <Accordion title="5. Relato Livre do Cliente" icon={<ScrollText className="w-4 h-4 text-slate-500" />}>
                            <textarea
                                name="relatoLivre"
                                className="w-full min-h-[100px] rounded-lg border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
                                placeholder="Descreva a situação do cliente com suas próprias palavras..."
                            />
                        </Accordion>

                        <Accordion title="6. Cartão de Ponto" icon={<Clock className="w-4 h-4 text-indigo-500" />}>
                            <CartaoPonto
                                key={currentSimulationId}
                                initialSimulationId={currentSimulationId}
                                jornadaDiaria={parseFloat(cargaHorariaDiaria) || 8}
                                tipoTrabalhador={tipoTrabalhador}
                                dataAdmissao={dataAdmissao}
                                dataDemissao={dataDemissao}
                                onChange={setResumoCartao}
                            />
                        </Accordion>

                        {/* 7. Histórico de Cálculos */}
                        <Accordion title="7. Histórico de Cálculos Salvos" icon={<History className="w-4 h-4 text-slate-500" />}>
                            {history.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-xs italic">
                                    Nenhum cálculo salvo ainda.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {history.map(sim => (
                                        <div
                                            key={sim.id}
                                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${currentSimulationId === sim.id ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div
                                                className="flex-1 cursor-pointer"
                                                onClick={() => handleLoadSimulation(sim.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-700 text-sm">
                                                        {sim.resultData?.nomeCliente || 'Cliente s/ nome'}
                                                    </span>
                                                    {currentSimulationId === sim.id && (
                                                        <Badge variant="outline" className="text-[9px] bg-orange-100 text-orange-700 border-orange-200">em edição</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(sim.createdAt).toLocaleDateString('pt-BR')}</span>
                                                    <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> R$ {sim.resultData?.totalLiquido || '0,00'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-orange-600"
                                                    onClick={() => handleLoadSimulation(sim.id)}
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                    onClick={() => handleDeleteSimulation(sim.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Accordion>

                        {/* Parâmetros do Cálculo — Integrados à Ficha */}
                        <div className="pt-4">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 px-1 mb-2">Parâmetros do Cálculo</p>
                        </div>

                        <Card>
                            <CardContent className="p-4 space-y-4">
                                {/* ── Salário ── */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Último Salário Base (R$)</Label>
                                    <Input
                                        name="salarioBase"
                                        type="number" step="0.01"
                                        value={salarioBase}
                                        onChange={e => setSalarioBase(parseFloat(e.target.value) || 0)}
                                        className="h-9 font-mono" required
                                    />
                                    {/* Salário-família automático */}
                                    {temDireitoSalarioFamilia && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[10px] text-emerald-800 flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                            <span><strong>Salário-Família:</strong> Salário ≤ R$ 1.869,10 — direito a cota por dependente (Art. 65 CLT). Informe ao INSS.</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Dias trabalhados no mês</Label>
                                        <Input name="diasTrabalhosNoMes" type="number" min="1" max="31" defaultValue="30" className="h-9" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Saldo FGTS (R$)</Label>
                                        <Input name="saldoFGTS" type="number" step="0.01" defaultValue="0" className="h-9 font-mono" />
                                    </div>
                                </div>

                                {/* ── Férias ── */}
                                <Separator />
                                <p className="text-[10px] uppercase font-bold text-slate-400">Férias</p>

                                <div
                                    onClick={() => setTemFeriasVencidas(v => !v)}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${temFeriasVencidas ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200'
                                        }`}
                                >
                                    <span className="text-xs font-medium text-slate-700">Possui férias vencidas (período completo não gozado)?</span>
                                    <Switch checked={temFeriasVencidas} onCheckedChange={setTemFeriasVencidas} />
                                </div>

                                {temFeriasVencidas && (
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Períodos vencidos</Label>
                                        <Select name="mesesFeriasVencidas" defaultValue="12">
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3].map(p => (
                                                    <SelectItem key={p} value={String(p * 12)}>{p} período{p > 1 ? 's' : ''} ({p} ano{p > 1 ? 's' : ''})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[9px] text-orange-600">⚠ Férias em dobro após 2 anos (Art. 137 CLT)</p>
                                    </div>
                                )}

                                {/* ── Jornada ── */}
                                <Separator />
                                <p className="text-[10px] uppercase font-bold text-slate-400">Jornada de Trabalho</p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-slate-400">Carga horária diária</Label>
                                        <Select value={cargaHorariaDiaria} onValueChange={setCargaHorariaDiaria} name="cargaHorariaDiaria">
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="6">6h (turno)</SelectItem>
                                                <SelectItem value="7.33">7h20 (turno + 1h)</SelectItem>
                                                <SelectItem value="8">8h (padrão CLT)</SelectItem>
                                                <SelectItem value="10">10h (conf. acordo)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[9px] text-slate-400">Limite CLT: 8h/dia + 2h extras</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-slate-400">Tipo de trabalhador</Label>
                                        <div className="flex gap-1 h-9">
                                            <button type="button" onClick={() => setTipoTrabalhador('URBANO')}
                                                className={`flex-1 rounded-lg border text-xs font-bold transition-colors ${tipoTrabalhador === 'URBANO'
                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                🏙 Urbano
                                            </button>
                                            <button type="button" onClick={() => setTipoTrabalhador('RURAL')}
                                                className={`flex-1 rounded-lg border text-xs font-bold transition-colors ${tipoTrabalhador === 'RURAL'
                                                    ? 'bg-emerald-700 text-white border-emerald-700'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                🌿 Rural
                                            </button>
                                        </div>
                                        {tipoTrabalhador === 'RURAL' && (
                                            <p className="text-[9px] text-emerald-700">Noturno rural: a partir das 21h (adicional de 25% — Art. 7º, XXIII CF)</p>
                                        )}
                                        {tipoTrabalhador === 'URBANO' && (
                                            <p className="text-[9px] text-slate-400">Noturno urbano: 22h às 5h (adicional de 20% — Art. 73 CLT)</p>
                                        )}
                                    </div>
                                </div>

                                {/* Intervalo de almoço */}
                                <div className="space-y-2">
                                    <div
                                        onClick={() => setTemIntervaloAlmoco(v => !v)}
                                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${temIntervalomaco ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'
                                            }`}
                                    >
                                        <span className="text-xs font-medium text-slate-700">Tinha intervalo de almoço?</span>
                                        <Switch checked={temIntervalomaco} onCheckedChange={setTemIntervaloAlmoco} />
                                    </div>
                                    {!temIntervalomaco && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-[10px] text-red-800">
                                            ⚠ Supressão do intervalo → hora extra + adicional por intervalo não concedido (Art. 71, §4º CLT + Súmula 437 TST)
                                        </div>
                                    )}
                                    {temIntervalomaco && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-slate-400 uppercase">Horário do intervalo</Label>
                                                <Input name="horarioIntervalo" placeholder="Ex: 12:00" className="h-8 text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-slate-400 uppercase">Local de realização</Label>
                                                <Select value={localIntervalomaco} onValueChange={setLocalIntervaloAlmoco} name="localIntervaloAlmoco">
                                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="empresa">Refeitório da empresa</SelectItem>
                                                        <SelectItem value="fora">Fora da empresa</SelectItem>
                                                        <SelectItem value="posto">No próprio posto de trabalho</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {localIntervalomaco === 'posto' && (
                                                    <p className="text-[9px] text-red-600">⚠ Intervalo no posto = não considerado válido (Súmula 437, I TST)</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Horas Extras ── */}
                                <Separator />
                                <p className="text-[10px] uppercase font-bold text-slate-400">Horas Extras</p>
                                <div className="space-y-2">
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => setPercentualHE('50')}
                                            className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${percentualHE === '50'
                                                ? 'bg-orange-50 border-orange-400 text-orange-800 shadow-sm'
                                                : 'bg-slate-50 border-slate-200 text-slate-500'
                                                }`}>
                                            50% — Padrão CLT
                                        </button>
                                        <button type="button" onClick={() => setPercentualHE('100')}
                                            className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${percentualHE === '100'
                                                ? 'bg-red-50 border-red-400 text-red-800 shadow-sm'
                                                : 'bg-slate-50 border-slate-200 text-slate-500'
                                                }`}>
                                            100% — DSR/Feriado
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[10px] text-slate-600 space-y-1">
                                        <p className={`${percentualHE === '50' ? 'font-bold text-orange-700' : 'text-slate-400'}`}>▸ 50% — Hora extra em dia útil (Art. 59 §1º CLT). Base: salário + adicionais habituais.</p>
                                        <p className={`${percentualHE === '100' ? 'font-bold text-red-700' : 'text-slate-400'}`}>▸ 100% — Hora extra em DSR, feriado ou folga compensatória não concedida (Art. 9º Lei 605/49).</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-slate-400">Média Horas Extras / mês (R$)</Label>
                                        <Input name="mediaHorasExtras" type="number" step="0.01" defaultValue="0" className="h-9 font-mono" />
                                    </div>
                                </div>

                                {/* ── Outras variáveis ── */}
                                <Separator />
                                <p className="text-[10px] uppercase font-bold text-slate-400">Outras Médias (12 meses)</p>
                                <div className="space-y-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-slate-400">
                                            Média Adicional Noturno / mês (R$)
                                            <span className="ml-1 text-slate-300">— {tipoTrabalhador === 'URBANO' ? '20%' : '25%'} ({tipoTrabalhador === 'URBANO' ? '22h–05h' : 'a partir das 21h'})</span>
                                        </Label>
                                        <Input name="mediaAdicionalNoturno" type="number" step="0.01" defaultValue="0" className="h-9 font-mono" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-slate-400">Média Comissões / mês (R$)</Label>
                                        <Input name="mediaComissoes" type="number" step="0.01" defaultValue="0" className="h-9 font-mono" />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-4 pt-0">
                                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 h-11 font-bold gap-2" disabled={loading}>
                                    <Scale className="w-4 h-4" />
                                    {loading ? 'Calculando...' : 'Calcular Rescisão Completa'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* — PAINEL DE RESULTADOS — */}
                    <div id="resultados-rescisao" className="xl:col-span-2 space-y-4 xl:sticky xl:top-6 self-start">
                        {result ? (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">

                                {/* KPIs */}
                                <Card className="bg-slate-900 text-white border-0">
                                    <CardHeader className="pb-2 pt-4 px-4">
                                        <CardDescription className="text-slate-400 text-xs uppercase tracking-wide">Total Líquido Estimado</CardDescription>
                                        <CardTitle className="text-3xl font-black italic">R$ {result.totalLiquido}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 space-y-1.5 text-sm">
                                        <div className="flex justify-between text-slate-300">
                                            <span>Verbas calculadas</span>
                                            <span className="font-mono">R$ {result.totalBruto}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 text-[10px] italic">
                                            <span>Sem deduções tributárias</span>
                                            <span>—</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Tempo de serviço */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Card className="p-3 text-center">
                                        <p className="text-[9px] uppercase font-bold text-slate-400">Tempo de Serviço</p>
                                        <p className="font-black text-xl text-slate-900">{result.anosCompletos}a {result.mesesCompletos % 12}m</p>
                                    </Card>
                                    <Card className="p-3 text-center">
                                        <p className="text-[9px] uppercase font-bold text-slate-400">Aviso Prévio</p>
                                        <p className="font-black text-xl text-slate-900">{result.diasAvisoPrevio} dias</p>
                                    </Card>
                                </div>

                                {/* Score de risco */}
                                <Card className={`border-l-4 ${result.risco.nivel === 'BAIXO' ? 'border-l-emerald-500' : result.risco.nivel === 'MÉDIO' ? 'border-l-amber-500' : 'border-l-red-500'}`}>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {result.risco.nivel === 'BAIXO' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : result.risco.nivel === 'MÉDIO' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <ShieldAlert className="w-5 h-5 text-red-500" />}
                                                <div>
                                                    <p className="text-[9px] uppercase font-bold text-slate-400">Score de Risco Trabalhista</p>
                                                    <p className={`font-black text-lg leading-none ${result.risco.cor}`}>{result.risco.total}/100</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={`${result.risco.cor} border-current text-xs font-bold`}>{result.risco.nivel}</Badge>
                                        </div>
                                        {/* Barra de progresso */}
                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${result.risco.nivel === 'BAIXO' ? 'bg-emerald-500' : result.risco.nivel === 'MÉDIO' ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${result.risco.total}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-600">{result.risco.observacao}</p>
                                        {result.risco.irregularidadesAtivas.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-[9px] uppercase font-bold text-slate-400">Alertas identificados</p>
                                                {result.risco.irregularidadesAtivas.map((a: string) => (
                                                    <p key={a} className="text-[10px] text-red-600 flex items-center gap-1">
                                                        <span>⚠</span>{a}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 text-xs">
                                            <p className="text-[9px] uppercase font-bold text-orange-400 mb-0.5">Estimativa valor da causa</p>
                                            <p className="font-bold text-orange-700 text-base">{result.risco.estimativaValorCausa}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Seguro-desemprego */}
                                {result.seguroDesemprego && (
                                    <Card className="bg-blue-50 border-blue-100">
                                        <CardContent className="p-3 space-y-1">
                                            <p className="text-[9px] uppercase font-bold text-blue-400">Seguro-Desemprego (Estimativa)</p>
                                            <p className="font-bold text-blue-800">{result.seguroDesemprego.parcelas} parcelas de ≈ R$ {result.seguroDesemprego.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            <p className="text-[9px] text-blue-500">Valor sujeito à tabela oficial do SD</p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Alerta de rescisão */}
                                {result.alerta && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                                        <p className="font-bold text-[10px] uppercase mb-1">⚠ Atenção</p>
                                        <p>{result.alerta}</p>
                                    </div>
                                )}

                                {/* Direitos ativados */}
                                <Card>
                                    <CardContent className="p-3">
                                        <p className="text-[9px] uppercase font-bold text-slate-400 mb-2">Direitos — {LABEL_RESCISAO[result.tipoRescisao]}</p>
                                        <div className="space-y-1 text-xs">
                                            {[
                                                ['Saldo de salário', result.direitos?.saldoSalario],
                                                ['Aviso prévio indenizado', result.direitos?.avisoPrevioIndenizado],
                                                ['Férias vencidas', result.direitos?.feriasVencidas],
                                                ['Férias proporcionais', result.direitos?.feriasProporcionais],
                                                ['13º proporcional', result.direitos?.decimoTerceiro],
                                                ['Multa FGTS 40%', result.direitos?.multa40],
                                                ['Multa FGTS 20%', result.direitos?.multa20],
                                                ['Liberação FGTS', result.direitos?.liberacaoFGTS],
                                                ['Seguro-desemprego', result.direitos?.seguroDesemprego],
                                            ].map(([label, ativo]) => (
                                                <div key={label as string} className="flex items-center justify-between">
                                                    <span className="text-slate-600">{label}</span>
                                                    {ativo ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">✗</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Button
                                    type="button"
                                    className="w-full gap-2 h-11 border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold"
                                    onClick={() => setShowGuia(true)}
                                >
                                    <FileText className="w-4 h-4" />
                                    Gerar Guia Final
                                </Button>
                            </div>
                        ) : (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-slate-50 text-center p-8 opacity-60">
                                <BriefcaseBusiness className="w-14 h-14 text-orange-200 mb-3" />
                                <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">Resultados</h3>
                                <p className="text-slate-400 text-sm mt-2 max-w-xs">Preencha a ficha e os parâmetros de cálculo para gerar a análise completa.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── TABELA DETALHADA DE VERBAS (abaixo do fold) ──────── */}
                {result && (
                    <Card className="mt-6 border-2 animate-in fade-in duration-500">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                <ReceiptText className="w-4 h-4 text-orange-500" />
                                Memorial de Cálculo Completo — {LABEL_RESCISAO[result.tipoRescisao]}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="text-xs uppercase">Rubrica</TableHead>
                                        <TableHead className="text-xs uppercase">Base Legal</TableHead>
                                        <TableHead className="text-right text-xs uppercase">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[
                                        { label: 'Saldo de Salário', legal: 'Art. 477 CLT', val: result.saldoSalario, cor: '' },
                                        { label: `Aviso Prévio (${result.diasAvisoPrevio} dias)`, legal: 'Art. 487 CLT + Lei 12.506/11', val: result.avisoPrevio, cor: parseFloat(result.avisoPrevio) < 0 ? 'text-red-500' : '' },
                                        { label: 'Férias Vencidas + 1/3', legal: 'Art. 146 CLT', val: result.feriasVencidas, cor: '' },
                                        { label: 'Férias Proporcionais + 1/3', legal: 'Art. 147 CLT', val: result.feriasProporcionais, cor: '' },
                                        { label: '13º Salário Proporcional', legal: 'Lei 4.090/62', val: result.decimoTerceiro, cor: '' },
                                        ...(parseFloat(result.valorHECard) > 0 ? [
                                            { label: 'Horas Extras (Cartão de Ponto)', legal: 'Art. 59 CLT', val: result.valorHECard, cor: 'text-orange-600' },
                                        ] : []),
                                        ...(parseFloat(result.mediaVariaveisTotal) > 0 ? [
                                            { label: 'Reflexo Variáveis — Férias Vencidas', legal: 'Súmula 253 TST', val: result.reflexoVariaveisFeriasVencidas, cor: '' },
                                            { label: 'Reflexo Variáveis — Férias Proporcionais', legal: 'Súmula 253 TST', val: result.reflexoVariaveisFeriasProporcionais, cor: '' },
                                            { label: 'Reflexo Variáveis — 13º', legal: 'Súmula 253 TST', val: result.reflexoVariaveisDecimo, cor: '' },
                                        ] : []),
                                        { label: 'Multa Rescisória FGTS', legal: 'Art. 18 Lei 8.036/90', val: result.multaFGTS, cor: 'text-blue-600' },
                                    ].map((row, i) => (
                                        <TableRow key={i} className="hover:bg-slate-50/60">
                                            <TableCell className="font-medium text-sm">{row.label}</TableCell>
                                            <TableCell className="text-xs text-slate-400">{row.legal}</TableCell>
                                            <TableCell className={`text-right font-mono font-bold ${row.cor}`}>
                                                R$ {row.val}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Subtotal bruto */}
                                    <TableRow className="bg-slate-50 font-bold border-t-2">
                                        <TableCell>TOTAL BRUTO</TableCell>
                                        <TableCell className="text-xs text-slate-400">Soma das verbas</TableCell>
                                        <TableCell className="text-right font-mono text-base">R$ {result.totalBruto}</TableCell>
                                    </TableRow>
                                    {/* Total líquido */}
                                    <TableRow className="bg-slate-900 text-white font-black h-16">
                                        <TableCell className="text-sm uppercase tracking-wide rounded-bl-lg">TOTAL FINAL</TableCell>
                                        <TableCell className="text-slate-400 text-xs text-center">Soma de todas as verbas</TableCell>
                                        <TableCell className="text-right text-xl italic font-black">R$ {result.totalLiquido}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </form>

            {/* Modal: Guia Final */}
            {showGuia && result && (
                <GuiaFinal
                    result={result}
                    resumoCartao={resumoCartao}
                    onClose={() => setShowGuia(false)}
                />
            )}
        </div>
    );
}
