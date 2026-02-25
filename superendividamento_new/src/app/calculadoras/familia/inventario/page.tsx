'use client';

const STORAGE_KEY = 'inventario_history';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Scale, ChevronRight, ChevronLeft, Plus, Trash2, Download, History,
    Users, FileText, Building2, Car, Landmark, Banknote,
    Package, AlertTriangle, CheckCircle2, Calculator,
    Shield, Clock, TrendingUp, Info, ListChecks, Gavel, DollarSign,
} from 'lucide-react';
import { calcularInventarioAction } from './actions';
import {
    Falecido, Herdeiro, BemInventario, Divida,
    InventarioConfig, ResultadoInventario,
    RegimeBens, OrigemBem, TipoBem, GrauHerdeiro, TipoFilho,
    ALIQUOTAS_ITCMD,
} from '@/modules/family/inventarioEngine';
import { gerarPDFInventario } from '@/lib/inventarioPdfGenerator';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
function uid() { return Math.random().toString(36).slice(2, 9); }

const TIPOS_BEM: { value: TipoBem; label: string; icon: React.ReactNode }[] = [
    { value: 'imovel', label: 'Imóvel', icon: <Building2 className="w-3 h-3" /> },
    { value: 'veiculo', label: 'Veículo', icon: <Car className="w-3 h-3" /> },
    { value: 'aplicacao_financeira', label: 'Aplicação', icon: <Banknote className="w-3 h-3" /> },
    { value: 'empresa', label: 'Empresa', icon: <Landmark className="w-3 h-3" /> },
    { value: 'rural', label: 'Rural', icon: <TrendingUp className="w-3 h-3" /> },
    { value: 'bem_movel', label: 'Bem Móvel', icon: <Package className="w-3 h-3" /> },
    { value: 'credito', label: 'Crédito', icon: <DollarSign className="w-3 h-3" /> },
    { value: 'outro', label: 'Outro', icon: <FileText className="w-3 h-3" /> },
];

const GRAUS: { value: GrauHerdeiro; label: string }[] = [
    { value: 'conjuge', label: 'Cônjuge' },
    { value: 'companheiro', label: 'Companheiro(a)' },
    { value: 'filho', label: 'Filho(a)' },
    { value: 'filho_exclusivo', label: 'Filho(a) Exclusivo' },
    { value: 'neto', label: 'Neto(a)' },
    { value: 'pai', label: 'Pai' },
    { value: 'mae', label: 'Mãe' },
    { value: 'irmao', label: 'Irmão/Irmã' },
    { value: 'outro_colateral', label: 'Outro Colateral' },
    { value: 'testamentario', label: 'Legatário/Testamentário' },
];

// ── Sub-componentes ───────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
    const steps = ['Falecidos', 'Herdeiros', 'Bens & Dívidas', 'Resultado'];
    return (
        <div className="flex items-center gap-1 mb-4">
            {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                    <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${i + 1 <= step ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{i + 1}</div>
                    <span className={`text-[9px] font-medium truncate ${i + 1 === step ? 'text-amber-700' : 'text-slate-400'}`}>{s}</span>
                    {i < steps.length - 1 && <div className="h-px flex-1 bg-slate-200 mx-1" />}
                </div>
            ))}
        </div>
    );
}

function MetricCard({ label, value, sub, accent, warn }: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean }) {
    return (
        <div className={`rounded-xl p-3 border ${accent ? 'bg-amber-600 border-amber-700 text-white' : warn ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
            <p className={`text-[9px] uppercase font-semibold tracking-wide ${accent ? 'text-amber-100' : warn ? 'text-red-500' : 'text-slate-400'}`}>{label}</p>
            <p className={`text-lg font-extrabold mt-0.5 ${accent ? 'text-white' : warn ? 'text-red-700' : 'text-slate-800'}`}>{value}</p>
            {sub && <p className={`text-[8px] mt-0.5 ${accent ? 'text-amber-200' : 'text-slate-400'}`}>{sub}</p>}
        </div>
    );
}

function ComplexidadeBadge({ score, classe }: { score: number; classe: string }) {
    const cl = score <= 30 ? 'bg-emerald-600' : score <= 60 ? 'bg-amber-500' : score <= 90 ? 'bg-orange-600' : 'bg-red-700';
    return <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold ${cl}`}><Shield className="w-3.5 h-3.5" />Score {score} — {classe}</div>;
}

function RiscoBadge({ nivel }: { nivel: string }) {
    const cl = nivel === 'Baixo' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : nivel === 'Médio' ? 'bg-amber-100 text-amber-700 border-amber-200'
            : nivel === 'Alto' ? 'bg-orange-100 text-orange-700 border-orange-200'
                : 'bg-red-100 text-red-700 border-red-200';
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cl}`}>{nivel}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface HistoricoItem {
    id: string;
    criadoEm: string;
    falecidos: string[];           // nomes
    monteMorTotal: number;
    resultado: ResultadoInventario[];
    config: InventarioConfig;
}
export default function InventarioPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultadoInventario[] | null>(null);
    const [resultIdx, setResultIdx] = useState(0);
    const [activeTab, setActiveTab] = useState<'resultado' | 'alertas' | 'fluxo' | 'honorarios'>('resultado');
    const [history, setHistory] = useState<HistoricoItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setHistory(JSON.parse(saved));
        } catch { }
    }, []);

    function saveToHistory(res: ResultadoInventario[], cfg: InventarioConfig) {
        const item: HistoricoItem = {
            id: uid(),
            criadoEm: new Date().toISOString(),
            falecidos: cfg.falecidos.map(f => f.nome || 'Sem nome'),
            monteMorTotal: res.reduce((a, r) => a + r.monteMor, 0),
            resultado: res,
            config: cfg,
        };
        setHistory(prev => {
            const updated = [item, ...prev].slice(0, 20);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { }
            return updated;
        });
    }

    function loadFromHistory(item: HistoricoItem) {
        setFalecidos(item.config.falecidos);
        setHerdeiros(item.config.herdeiros);
        setBens(item.config.bens);
        setDividas(item.config.dividas);
        setLitigio(item.config.litiogio);
        setResult(item.resultado);
        setResultIdx(0);
        setStep(4);
        setShowHistory(false);
    }

    function deleteFromHistory(id: string) {
        setHistory(prev => {
            const updated = prev.filter(h => h.id !== id);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { }
            return updated;
        });
    }

    // ── Falecidos ─────────────────────────────────────────────────────────────
    const [falecidos, setFalecidos] = useState<Falecido[]>([{
        id: uid(), nome: '', dataObito: '', estadoCivil: 'casado',
        regimeBens: 'comunhao_parcial', ultimoDomicilio: '', uf: 'SP',
        temTestamento: false, herdouDeIds: [],
    }]);

    function addFalecido() { setFalecidos(p => [...p, { id: uid(), nome: '', dataObito: '', estadoCivil: 'casado', regimeBens: 'comunhao_parcial', ultimoDomicilio: '', uf: 'SP', temTestamento: false, herdouDeIds: [] }]); }
    function updF(id: string, f: keyof Falecido, v: any) { setFalecidos(p => p.map(x => x.id === id ? { ...x, [f]: v } : x)); }
    function delF(id: string) { setFalecidos(p => p.filter(x => x.id !== id)); }

    // ── Herdeiros ─────────────────────────────────────────────────────────────
    const [herdeiros, setHerdeiros] = useState<Herdeiro[]>([]);
    const [litigio, setLitigio] = useState(false);

    function addH(fid: string) { setHerdeiros(p => [...p, { id: uid(), nome: '', grau: 'filho', tipoFilho: 'comum', incapaz: false, premorto: false, pertenceAFalecidoId: fid }]); }
    function updH(id: string, f: keyof Herdeiro, v: any) { setHerdeiros(p => p.map(x => x.id === id ? { ...x, [f]: v } : x)); }
    function delH(id: string) { setHerdeiros(p => p.filter(x => x.id !== id)); }

    // ── Bens / Dívidas ────────────────────────────────────────────────────────
    const [bens, setBens] = useState<BemInventario[]>([]);
    const [dividas, setDividas] = useState<Divida[]>([]);

    function addB(fid: string) { setBens(p => [...p, { id: uid(), tipo: 'imovel', descricao: '', valorMercado: 0, valorFiscal: 0, percentualPropriedade: 1, origem: 'apos_casamento', adquiridoAntesDoCasamento: false, onusOuGravame: false, dividasVinculadas: 0, pertenceAFalecidoId: fid }]); }
    function updB(id: string, f: keyof BemInventario, v: any) { setBens(p => p.map(x => x.id === id ? { ...x, [f]: v } : x)); }
    function delB(id: string) { setBens(p => p.filter(x => x.id !== id)); }
    function addD(fid: string) { setDividas(p => [...p, { id: uid(), descricao: '', valor: 0, pertenceAFalecidoId: fid }]); }
    function updD(id: string, f: keyof Divida, v: any) { setDividas(p => p.map(x => x.id === id ? { ...x, [f]: v } : x)); }
    function delD(id: string) { setDividas(p => p.filter(x => x.id !== id)); }

    // ── Cálculo ───────────────────────────────────────────────────────────────
    const calcular = useCallback(async () => {
        setLoading(true);
        try {
            const cfg: InventarioConfig = { falecidos, herdeiros, bens, dividas, litiogio: litigio };
            const res = await calcularInventarioAction(cfg);
            setResult(res); setResultIdx(0); setStep(4); setActiveTab('resultado');
            saveToHistory(res, cfg);
        } finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [falecidos, herdeiros, bens, dividas, litigio]);

    const r = result?.[resultIdx];

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50">
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-stone-800">Inventário Sucessório</h1>
                        <p className="text-sm text-stone-500">CC/2002 • CPC/2015 • Família Recomposta • Honorários</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6">

                    {/* ═══════ PAINEL ESQUERDO — FORMULÁRIO ═══════ */}
                    <div>
                        <Card className="border-amber-100">
                            <CardHeader className="pb-2"><StepIndicator step={step} /></CardHeader>
                            <CardContent className="space-y-4">

                                {/* ─── ETAPA 1: FALECIDOS ─── */}
                                {step === 1 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-sm font-bold text-stone-700">Dados dos Falecidos</h2>
                                            <div className="flex gap-2">
                                                {history.length > 0 && (
                                                    <Button size="sm" variant="outline" onClick={() => setShowHistory(v => !v)}
                                                        className="h-7 text-xs gap-1 border-slate-200 text-slate-500">
                                                        <History className="w-3 h-3" /> {history.length}
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={addFalecido} className="h-7 text-xs gap-1 border-amber-200 text-amber-700"><Plus className="w-3 h-3" /> Adicionar</Button>
                                            </div>
                                        </div>

                                        {/* Painel de Histórico */}
                                        {showHistory && (
                                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                <div className="bg-slate-50 px-3 py-2 flex items-center justify-between">
                                                    <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Histórico de Cálculos</p>
                                                    <button onClick={() => { if (confirm('Apagar todo o histórico?')) { setHistory([]); localStorage.removeItem(STORAGE_KEY); } }} className="text-[10px] text-red-400 hover:text-red-600">Limpar tudo</button>
                                                </div>
                                                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                                                    {history.map(item => (
                                                        <div key={item.id} className="flex items-center gap-2 px-3 py-2 hover:bg-amber-50 transition-colors group">
                                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadFromHistory(item)}>
                                                                <p className="text-xs font-medium text-slate-700 truncate">{item.falecidos.join(', ')}</p>
                                                                <p className="text-[10px] text-slate-400">{new Date(item.criadoEm).toLocaleString('pt-BR')} · {item.monteMorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                            </div>
                                                            <button onClick={() => deleteFromHistory(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {falecidos.map((f, i) => (
                                            <div key={f.id} className="border border-amber-100 rounded-xl p-4 space-y-3 bg-amber-50/40">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-amber-700">Falecido {i + 1}</span>
                                                    {falecidos.length > 1 && <button onClick={() => delF(f.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="col-span-2 space-y-1">
                                                        <Label className="text-[10px] text-slate-400">Nome Completo</Label>
                                                        <Input className="h-9" value={f.nome} onChange={e => updF(f.id, 'nome', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] text-slate-400">Data do Óbito</Label>
                                                        <Input type="date" className="h-9" value={f.dataObito} onChange={e => updF(f.id, 'dataObito', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] text-slate-400">UF</Label>
                                                        <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={f.uf} onChange={e => updF(f.id, 'uf', e.target.value)}>
                                                            {Object.keys(ALIQUOTAS_ITCMD).map(u => <option key={u} value={u}>{u}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] text-slate-400">Estado Civil</Label>
                                                        <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={f.estadoCivil} onChange={e => updF(f.id, 'estadoCivil', e.target.value as any)}>
                                                            <option value="casado">Casado(a)</option>
                                                            <option value="solteiro">Solteiro(a)</option>
                                                            <option value="viuvo">Viúvo(a)</option>
                                                            <option value="divorciado">Divorciado(a)</option>
                                                            <option value="uniao_estavel">União Estável</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] text-slate-400">Regime de Bens</Label>
                                                        <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={f.regimeBens} onChange={e => updF(f.id, 'regimeBens', e.target.value as RegimeBens)}>
                                                            <option value="comunhao_parcial">Comunhão Parcial</option>
                                                            <option value="comunhao_universal">Comunhão Universal</option>
                                                            <option value="separacao_total">Separação Total</option>
                                                            <option value="separacao_obrigatoria">Separação Obrigatória</option>
                                                            <option value="participacao_final">Participação Final</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2 space-y-1">
                                                        <Label className="text-[10px] text-slate-400">Último Domicílio</Label>
                                                        <Input className="h-9" value={f.ultimoDomicilio} onChange={e => updF(f.id, 'ultimoDomicilio', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between border-t border-amber-100 pt-2">
                                                    <Label className="text-xs text-slate-500">Testamento?</Label>
                                                    <Switch checked={f.temTestamento} onCheckedChange={v => updF(f.id, 'temTestamento', v)} />
                                                </div>
                                                {falecidos.length > 1 && (
                                                    <div className="grid grid-cols-2 gap-2 border-t border-dashed border-amber-200 pt-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] text-slate-400">Grupo Comoriência</Label>
                                                            <Input className="h-8" placeholder="ex: A" value={f.comorienteGrupoId ?? ''} onChange={e => updF(f.id, 'comorienteGrupoId', e.target.value || undefined)} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] text-slate-400">Ordem do Óbito</Label>
                                                            <Input type="number" className="h-8" placeholder="1, 2..." value={f.ordemObito ?? ''} onChange={e => updF(f.id, 'ordemObito', e.target.value ? +e.target.value : undefined)} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <Button className="w-full bg-amber-600 hover:bg-amber-700 gap-2" onClick={() => setStep(2)}>Próximo — Herdeiros <ChevronRight className="w-4 h-4" /></Button>
                                    </div>
                                )}

                                {/* ─── ETAPA 2: HERDEIROS ─── */}
                                {step === 2 && (
                                    <div className="space-y-4">
                                        <h2 className="text-sm font-bold text-stone-700">Herdeiros</h2>
                                        <div className="flex items-center justify-between p-2 border rounded-lg">
                                            <Label className="text-xs">Litígio / Conflito?</Label>
                                            <Switch checked={litigio} onCheckedChange={setLitigio} />
                                        </div>
                                        {/* Família Recomposta info */}
                                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-700">Para família recomposta, classifique o filho como <strong>comum</strong> (dos dois), <strong>exclusivo do pai</strong> ou <strong>exclusivo da mãe</strong>.</p>
                                        </div>

                                        {falecidos.map(f => (
                                            <div key={f.id} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-amber-700">{f.nome || `Falecido (${f.id.slice(0, 4)})`}</p>
                                                    <Button size="sm" variant="outline" onClick={() => addH(f.id)} className="h-6 text-[10px] gap-1 border-amber-200 text-amber-700"><Plus className="w-2.5 h-2.5" /> Herdeiro</Button>
                                                </div>
                                                {herdeiros.filter(h => h.pertenceAFalecidoId === f.id).map(h => (
                                                    <div key={h.id} className="border border-slate-100 rounded-xl p-3 space-y-2 bg-white">
                                                        <div className="flex items-center gap-2">
                                                            <Input className="h-8 text-sm flex-1" placeholder="Nome" value={h.nome} onChange={e => updH(h.id, 'nome', e.target.value)} />
                                                            <button onClick={() => delH(h.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <select className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm" value={h.grau} onChange={e => updH(h.id, 'grau', e.target.value as GrauHerdeiro)}>
                                                                {GRAUS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                                            </select>
                                                            {(h.grau === 'filho' || h.grau === 'filho_exclusivo') && (
                                                                <select className="w-full h-8 rounded-md border border-amber-200 bg-amber-50 px-2 text-sm text-amber-800" value={h.tipoFilho ?? 'comum'} onChange={e => updH(h.id, 'tipoFilho', e.target.value as TipoFilho)}>
                                                                    <option value="comum">Filho Comum</option>
                                                                    <option value="exclusivo_pai">Exclusivo do Pai</option>
                                                                    <option value="exclusivo_mae">Exclusivo da Mãe</option>
                                                                </select>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                                                <input type="checkbox" checked={h.incapaz} onChange={e => updH(h.id, 'incapaz', e.target.checked)} className="accent-amber-600" /> Incapaz
                                                            </label>
                                                            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                                                <input type="checkbox" checked={h.premorto} onChange={e => updH(h.id, 'premorto', e.target.checked)} className="accent-amber-600" /> Pré-morto
                                                            </label>
                                                        </div>
                                                        {h.grau === 'testamentario' && (
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] text-slate-400">% do testamento (ex: 0.25 = 25%)</Label>
                                                                <Input type="number" step="0.01" className="h-8" value={h.percentualTestamento ?? ''} onChange={e => updH(h.id, 'percentualTestamento', +e.target.value)} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4" /> Voltar</Button>
                                            <Button className="flex-1 bg-amber-600 hover:bg-amber-700 gap-2" onClick={() => setStep(3)}>Próximo — Bens <ChevronRight className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                )}

                                {/* ─── ETAPA 3: BENS & DÍVIDAS ─── */}
                                {step === 3 && (
                                    <div className="space-y-4">
                                        <h2 className="text-sm font-bold text-stone-700">Bens & Dívidas</h2>
                                        {falecidos.map(f => (
                                            <div key={f.id} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-amber-700">{f.nome || `Falecido (${f.id.slice(0, 4)})`}</p>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => addB(f.id)} className="h-6 text-[10px] gap-1 border-amber-200 text-amber-700"><Plus className="w-2.5 h-2.5" /> Bem</Button>
                                                        <Button size="sm" variant="outline" onClick={() => addD(f.id)} className="h-6 text-[10px] gap-1 border-red-200 text-red-600"><Plus className="w-2.5 h-2.5" /> Dívida</Button>
                                                    </div>
                                                </div>

                                                {bens.filter(b => b.pertenceAFalecidoId === f.id).map(b => (
                                                    <div key={b.id} className="border border-amber-100 rounded-xl p-3 space-y-3 bg-amber-50/30">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex gap-1 flex-wrap">
                                                                {TIPOS_BEM.map(t => (
                                                                    <button key={t.value} onClick={() => updB(b.id, 'tipo', t.value)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${b.tipo === t.value ? 'bg-amber-600 text-white border-amber-700' : 'bg-white text-slate-500 border-slate-200'}`}>{t.icon}{t.label}</button>
                                                                ))}
                                                            </div>
                                                            <button onClick={() => delB(b.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="col-span-2 space-y-1">
                                                                <Label className="text-[10px] text-slate-400">Descrição</Label>
                                                                <Input className="h-8" value={b.descricao} onChange={e => updB(b.id, 'descricao', e.target.value)} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] text-slate-400">Valor de Mercado (R$)</Label>
                                                                <Input type="number" className="h-8" value={b.valorMercado} onChange={e => updB(b.id, 'valorMercado', +e.target.value)} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] text-slate-400">% Propriedade</Label>
                                                                <Input type="number" step="0.01" min="0.01" max="1" className="h-8" value={b.percentualPropriedade} onChange={e => updB(b.id, 'percentualPropriedade', +e.target.value)} />
                                                            </div>
                                                            <div className="col-span-2 space-y-1">
                                                                <Label className="text-[10px] text-slate-400">Origem do Bem</Label>
                                                                <select className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm" value={b.origem} onChange={e => updB(b.id, 'origem', e.target.value as OrigemBem)}>
                                                                    <option value="apos_casamento">Adquirido após casamento (oneroso)</option>
                                                                    <option value="antes_casamento">Adquirido antes do casamento</option>
                                                                    <option value="doacao">Doação recebida</option>
                                                                    <option value="heranca">Herança recebida</option>
                                                                    <option value="sub_rogacao">Sub-rogação</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4 pt-1 border-t border-amber-100">
                                                            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                                                <input type="checkbox" checked={b.adquiridoAntesDoCasamento ?? false} onChange={e => updB(b.id, 'adquiridoAntesDoCasamento', e.target.checked)} className="accent-amber-600" /> Antes do casamento
                                                            </label>
                                                            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                                                <input type="checkbox" checked={b.possuiClausulaIncomunicabilidade ?? false} onChange={e => updB(b.id, 'possuiClausulaIncomunicabilidade', e.target.checked)} className="accent-amber-600" /> Cláusula incomunic.
                                                            </label>
                                                            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                                                <input type="checkbox" checked={b.onusOuGravame} onChange={e => updB(b.id, 'onusOuGravame', e.target.checked)} className="accent-amber-600" /> Ônus/Gravame
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}

                                                {dividas.filter(d => d.pertenceAFalecidoId === f.id).map(d => (
                                                    <div key={d.id} className="border border-red-100 rounded-xl p-3 bg-red-50/30 flex items-center gap-2">
                                                        <Input className="h-8 flex-1" placeholder="Descrição da dívida" value={d.descricao} onChange={e => updD(d.id, 'descricao', e.target.value)} />
                                                        <Input type="number" className="h-8 w-32" placeholder="Valor R$" value={d.valor} onChange={e => updD(d.id, 'valor', +e.target.value)} />
                                                        <button onClick={() => delD(d.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4" /> Voltar</Button>
                                            <Button className="flex-1 bg-amber-600 hover:bg-amber-700 gap-2" onClick={calcular} disabled={loading}>
                                                <Calculator className="w-4 h-4" />{loading ? 'Calculando...' : 'Calcular Inventário'}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* ─── ETAPA 4: RESUMO LATERAL ─── */}
                                {step === 4 && result && r && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-sm font-bold text-stone-700">Resultado</h2>
                                            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-200 text-amber-700" onClick={() => { setResult(null); setStep(1); }}>Novo</Button>
                                        </div>
                                        {result.length > 1 && (
                                            <div className="flex gap-1 flex-wrap">
                                                {result.map((r2, i) => (
                                                    <button key={r2.falecidoId} onClick={() => setResultIdx(i)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${i === resultIdx ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{r2.falecidoNome || `Falecido ${i + 1}`}</button>
                                                ))}
                                            </div>
                                        )}
                                        {r.comoriencia && (
                                            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                <p className="text-[10px] text-amber-700 font-medium">Comoriência — CC art. 8º: sem transmissão entre comorientes</p>
                                            </div>
                                        )}
                                        <div className={`flex items-start gap-2 p-2 rounded-lg border ${r.modalidade === 'extrajudicial' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                            {r.modalidade === 'extrajudicial' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Gavel className="w-4 h-4 text-red-600 shrink-0" />}
                                            <p className={`text-xs font-bold ${r.modalidade === 'extrajudicial' ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {r.modalidade === 'extrajudicial' ? '✔ Extrajudicial (Cartório)' : '⚖ Judicial Obrigatório'}
                                            </p>
                                        </div>
                                        <ComplexidadeBadge score={r.scoreComplexidade} classe={r.classificacaoComplexidade} />
                                        <Button onClick={() => setStep(3)} variant="outline" className="w-full h-7 text-xs border-amber-200 text-amber-700"><ChevronLeft className="w-3.5 h-3.5" /> Editar</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ═══════ PAINEL DIREITO — DASHBOARD ═══════ */}
                    <div>
                        {step < 4 && (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center gap-3 opacity-40">
                                <Scale className="w-14 h-14 text-amber-300" />
                                <p className="text-stone-500 font-medium text-sm">Preencha os dados ao lado</p>
                            </div>
                        )}

                        {step === 4 && result && r && (
                            <div className="space-y-4">

                                {/* Tabs */}
                                <div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
                                    {([
                                        { key: 'resultado', label: 'Resultado', icon: <TrendingUp className="w-3 h-3" /> },
                                        { key: 'alertas', label: 'Alertas', icon: <AlertTriangle className="w-3 h-3" /> },
                                        { key: 'fluxo', label: 'Fluxograma', icon: <ListChecks className="w-3 h-3" /> },
                                        { key: 'honorarios', label: 'Honorários', icon: <DollarSign className="w-3 h-3" /> },
                                    ] as const).map(t => (
                                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? 'bg-white shadow text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                            {t.icon}{t.label}
                                        </button>
                                    ))}
                                </div>

                                {/* ── ABA: RESULTADO ── */}
                                {activeTab === 'resultado' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="grid grid-cols-2 gap-3">
                                            <MetricCard label="Monte-Mor" value={fmt(r.monteMor)} accent />
                                            <MetricCard label="Herança Líquida" value={fmt(r.herancaLiquida)} />
                                            <MetricCard label="Meação do Cônjuge" value={fmt(r.meacao)} />
                                            <MetricCard label="ITCMD Total" value={fmt(r.itcmdTotal)} warn={r.itcmdTotal > 0} />
                                        </div>

                                        {/* Bens comuns vs particulares */}
                                        <Card className="border-slate-100">
                                            <CardHeader className="pb-2"><CardTitle className="text-sm">Separação Patrimonial</CardTitle></CardHeader>
                                            <CardContent className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Bens Comuns ({r.bensComuns?.length ?? 0})</span>
                                                    <span className="font-bold">{fmt(r.bensComuns?.reduce((a, b) => a + b.valorMercado * b.percentualPropriedade, 0) ?? 0)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />Bens Particulares ({r.bensParticulares?.length ?? 0})</span>
                                                    <span className="font-bold">{fmt(r.bensParticulares?.reduce((a, b) => a + b.valorMercado * b.percentualPropriedade, 0) ?? 0)}</span>
                                                </div>
                                                {r.bensComuns && r.bensComuns.length + (r.bensParticulares?.length ?? 0) > 0 && (
                                                    <div className="flex h-2 rounded-full overflow-hidden mt-1">
                                                        {(() => {
                                                            const total = (r.bensComuns?.reduce((a, b) => a + b.valorMercado * b.percentualPropriedade, 0) ?? 0) + (r.bensParticulares?.reduce((a, b) => a + b.valorMercado * b.percentualPropriedade, 0) ?? 0);
                                                            const pct = total > 0 ? ((r.bensComuns?.reduce((a, b) => a + b.valorMercado * b.percentualPropriedade, 0) ?? 0) / total * 100) : 50;
                                                            return (<><div className="bg-amber-400" style={{ width: `${pct}%` }} /><div className="bg-slate-300 flex-1" /></>);
                                                        })()}
                                                    </div>
                                                )}
                                                <p className="text-[9px] text-slate-400">Meação calculada sobre bens comuns (CC art. 1.658)</p>
                                            </CardContent>
                                        </Card>

                                        {/* Memória de cálculo */}
                                        <Card className="border-slate-100">
                                            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500" />Memória</CardTitle></CardHeader>
                                            <CardContent>
                                                <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                                    {r.memoriaCalculo.map((m, i) => (
                                                        <li key={i} className={`text-xs flex gap-1.5 ${m.startsWith('──') ? 'text-amber-700 font-bold mt-1' : 'text-slate-500'}`}>
                                                            {!m.startsWith('──') && <span className="text-amber-400 shrink-0">›</span>}{m}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>

                                        {/* Quinhões */}
                                        {r.quinhoes.length > 0 && (
                                            <Card className="border-slate-100">
                                                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-amber-500" />Quinhões</CardTitle></CardHeader>
                                                <CardContent className="space-y-2">
                                                    {r.quinhoes.map(q => (
                                                        <div key={q.herdeiroId} className="flex items-center gap-3">
                                                            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                                <span className="text-[10px] font-bold text-amber-700">{q.herdeiroNome.charAt(0)}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="font-medium text-slate-700 truncate">{q.herdeiroNome}
                                                                        {q.tipoFilho && <span className="ml-1 text-[9px] text-amber-600">({q.tipoFilho.replace('exclusivo_', 'excl. ')})</span>}
                                                                    </span>
                                                                    <span className="font-bold ml-2">{fmt(q.quinhao)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${q.percentual * 100}%` }} />
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 shrink-0">{fmtPct(q.percentual)}</span>
                                                                </div>
                                                                <p className="text-[9px] text-red-400">ITCMD: {fmt(q.itcmd)}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        )}

                                        <Button className="w-full bg-amber-700 hover:bg-amber-800 gap-2" onClick={() => gerarPDFInventario(result, { falecidos, herdeiros, bens, dividas, litiogio: litigio })}>
                                            <Download className="w-4 h-4" /> Baixar PDF Completo
                                        </Button>
                                    </div>
                                )}

                                {/* ── ABA: ALERTAS ── */}
                                {activeTab === 'alertas' && (
                                    <div className="space-y-3 animate-in fade-in duration-200">
                                        <p className="text-xs text-slate-500">{r.alertasJuridicos.length} alertas jurídicos gerados automaticamente</p>
                                        {r.alertasJuridicos.map((alerta, i) => {
                                            const isWarn = alerta.startsWith('⚠');
                                            const isInfo = alerta.startsWith('ℹ');
                                            return (
                                                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${isWarn ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                                                    {isWarn ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                                                    <p className={`text-xs leading-relaxed ${isWarn ? 'text-amber-800' : 'text-blue-800'}`}>{alerta.replace(/^[⚠ℹ]\s*/, '')}</p>
                                                </div>
                                            );
                                        })}
                                        {r.motivoJudicial.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-red-600">Motivos para Judicialização:</p>
                                                {r.motivoJudicial.map((m, i) => (
                                                    <div key={i} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                        <Gavel className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                                                        <p className="text-xs text-red-700">{m}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── ABA: FLUXOGRAMA ── */}
                                {activeTab === 'fluxo' && (
                                    <div className="space-y-2 animate-in fade-in duration-200">
                                        <p className="text-xs text-slate-500">Fluxograma Decisório — 12 Etapas Jurídicas</p>
                                        {r.etapasDecisao.map((e, i) => {
                                            const num = i + 1;
                                            const isJudicial = e.includes('Judicial');
                                            const isWarn = e.toLowerCase().includes('comoriência') || e.toLowerCase().includes('exclusivo');
                                            return (
                                                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${isJudicial ? 'border-red-200 bg-red-50' : isWarn ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white'}`}>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${num <= 3 ? 'bg-slate-700 text-white' : num <= 6 ? 'bg-amber-500 text-white' : num <= 9 ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'}`}>{num}</div>
                                                    <p className="text-xs text-slate-700 leading-relaxed">{e.replace(/^Etapa \d+ — /, '')}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* ── ABA: HONORÁRIOS ── */}
                                {activeTab === 'honorarios' && r.honorarios && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="grid grid-cols-2 gap-3">
                                            <MetricCard label="Honorários Estimados" value={fmt(r.honorarios.valorHonorarios)} accent sub={`${fmtPct(r.honorarios.percentualAplicado)} s/ monte-mor`} />
                                            <MetricCard label="Faixa" value={`${fmt(r.honorarios.valorMinimo)}`} sub={`até ${fmt(r.honorarios.valorMaximo)}`} />
                                        </div>

                                        <Card className="border-slate-100">
                                            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-500" />Detalhamento</CardTitle></CardHeader>
                                            <CardContent className="space-y-2">
                                                {[
                                                    ['Modalidade', r.honorarios.modalidade === 'extrajudicial' ? 'Extrajudicial' : 'Judicial'],
                                                    ['% Base', fmtPct(r.honorarios.percentualBase)],
                                                    ['% Aplicado (com complexidade)', fmtPct(r.honorarios.percentualAplicado)],
                                                    ['Score Complexidade', String(r.honorarios.scoreComplexidade)],
                                                    ['Horas estimadas', `${r.honorarios.horasEstimadas.min}–${r.honorarios.horasEstimadas.max}h`],
                                                ].map(([l, v]) => (
                                                    <div key={l} className="flex justify-between text-sm border-b pb-1 last:border-0">
                                                        <span className="text-slate-500">{l}</span>
                                                        <span className="font-bold">{v}</span>
                                                    </div>
                                                ))}
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-sm text-slate-500">Risco Operacional</span>
                                                    <RiscoBadge nivel={r.honorarios.nivelRisco} />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-amber-100 bg-amber-50">
                                            <CardContent className="pt-4 space-y-3">
                                                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Modelos de Cobrança</p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs border-b border-amber-100 pb-1">
                                                        <span className="text-amber-800">Percentual Puro</span>
                                                        <span className="font-bold text-amber-900">{fmt(r.honorarios.modelosCobranca.percentualPuro)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs border-b border-amber-100 pb-1">
                                                        <span className="text-amber-800">Entrada (Perc.+Êxito)</span>
                                                        <span className="font-bold text-amber-900">{fmt(r.honorarios.modelosCobranca.percentualMaisExito.entrada)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs border-b border-amber-100 pb-1">
                                                        <span className="text-amber-800">Êxito</span>
                                                        <span className="font-bold text-amber-900">{fmt(r.honorarios.modelosCobranca.percentualMaisExito.exito)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-amber-800">Fixo Mínimo</span>
                                                        <span className="font-bold text-amber-900">{fmt(r.honorarios.modelosCobranca.fixoMinimo)}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="p-3 bg-slate-900 rounded-xl">
                                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1">Recomendação Estratégica</p>
                                            <p className="text-xs text-slate-300 leading-relaxed">{r.honorarios.recomendacaoEstrategica}</p>
                                        </div>

                                        <Button className="w-full bg-amber-700 hover:bg-amber-800 gap-2" onClick={() => gerarPDFInventario(result, { falecidos, herdeiros, bens, dividas, litiogio: litigio })}>
                                            <Download className="w-4 h-4" /> Baixar PDF com Honorários
                                        </Button>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
