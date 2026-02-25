'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { AlertTriangle, Copy, Save, Clock, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { upsertCartaoPonto } from './actions';

/* ==========================================================================
   TIPOS
   ========================================================================== */
export type TipoDia = 'UTIL' | 'SABADO' | 'DOMINGO' | 'FERIADO' | 'FOLGA' | 'FALTA' | 'DSR';

export type LinhaCartao = {
    dia: number;
    diaSemana: string;
    tipo: TipoDia;
    entrada: string;     // "HH:MM"
    saidaAlmoco: string; // "HH:MM"
    retornoAlmoco: string; // "HH:MM"
    saida: string;       // "HH:MM"
};

/** Verbas apuradas a partir do cartão de ponto */
export type VerbasCartao = {
    heMinutos50: number;
    heMinutos100: number;
    criterioUsado: 'DIARIO' | 'SEMANAL' | 'NENHUM';
    minutosExtrasTotal: number;
    feriadosTrabalhados: { dia: number; minutos: number }[];
    sabadosTrabalhados: { dia: number; minutos: number }[];
    domingosTrabalhados: { dia: number; minutos: number }[];
    violacoesInterjornada: { dia: number; intervaloMin: number }[];
    violacoesIntersemanal: { semana: number; intervaloMin: number }[];
    horasNoturnasMin: number;
    totalTrabalhadoMin: number;
    diasComRegistro: number;
    diasFalta: number;
    linhas: LinhaCartao[];
};

/* ==========================================================================
   CONSTANTES E UTILITÁRIOS
   ========================================================================== */
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const TIPO_LABEL: Record<TipoDia, string> = {
    UTIL: 'Útil', SABADO: 'Sáb', DOMINGO: 'Dom',
    FERIADO: 'Feriado', FOLGA: 'Folga', FALTA: 'Falta', DSR: 'DSR',
};

const TIPO_COR: Record<TipoDia, string> = {
    UTIL: 'bg-white',
    SABADO: 'bg-blue-50',
    DOMINGO: 'bg-red-50',
    FERIADO: 'bg-rose-100',
    FOLGA: 'bg-green-50',
    FALTA: 'bg-orange-50',
    DSR: 'bg-purple-50',
};

const FERIADOS_NACIONAIS = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']);

function hhmm2min(t: string): number {
    if (!t || !t.includes(':')) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function min2hhmm(m: number): string {
    if (!m || m <= 0) return '—';
    const h = Math.floor(m / 60);
    const mn = m % 60;
    return `${h}h${mn.toString().padStart(2, '0')}`;
}

function calcNoturnasMin(entMin: number, saiMin: number, tipoTrab: 'URBANO' | 'RURAL'): number {
    const inicio = tipoTrab === 'URBANO' ? 22 * 60 : 21 * 60;
    const fim = 29 * 60;
    const s = saiMin <= entMin ? saiMin + 24 * 60 : saiMin;
    const overlapStart = Math.max(entMin, inicio);
    const overlapEnd = Math.min(s, fim);
    return overlapEnd > overlapStart ? overlapEnd - overlapStart : 0;
}

function calcTrabalhado(l: LinhaCartao): number {
    const e1 = l.entrada?.includes(':') ? hhmm2min(l.entrada) : -1;
    const s2 = l.saidaAlmoco?.includes(':') ? hhmm2min(l.saidaAlmoco) : -1;
    const r3 = l.retornoAlmoco?.includes(':') ? hhmm2min(l.retornoAlmoco) : -1;
    const s4 = l.saida?.includes(':') ? hhmm2min(l.saida) : -1;
    let mins = 0;
    if (e1 >= 0 && s2 >= 0 && r3 < 0 && s4 < 0) mins = s2 - e1;
    else if (e1 >= 0 && s4 >= 0 && s2 < 0 && r3 < 0) mins = s4 - e1;
    else {
        if (e1 >= 0 && s2 >= 0) mins += (s2 - e1);
        if (r3 >= 0 && s4 >= 0) mins += (s4 - r3);
    }
    return Math.max(0, mins);
}

function getLimiteDia(tipo: TipoDia, jornadaDiaria: number): number {
    if (tipo === 'UTIL') return jornadaDiaria * 60;
    if (tipo === 'SABADO' && jornadaDiaria === 8) return 240;
    if (tipo === 'SABADO') return jornadaDiaria * 60;
    return 0;
}

function gerarLinhas(mes: number, ano: number): LinhaCartao[] {
    const diasInMonth = new Date(ano, mes, 0).getDate();
    return Array.from({ length: diasInMonth }, (_, i) => {
        const d = i + 1;
        const dow = new Date(ano, mes - 1, d).getDay();
        const mmdd = `${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const tipo: TipoDia = FERIADOS_NACIONAIS.has(mmdd) ? 'FERIADO' : dow === 0 ? 'DOMINGO' : dow === 6 ? 'SABADO' : 'UTIL';
        return { dia: d, diaSemana: DIAS_SEMANA[dow], tipo, entrada: '', saidaAlmoco: '', retornoAlmoco: '', saida: '' };
    });
}

function calcularVerbas(linhas: LinhaCartao[], jornadaDiaria: number, tipoTrabalhador: 'URBANO' | 'RURAL'): VerbasCartao {
    const jornadaSemanalMin = 44 * 60;
    const feriadosTrabalhados: { dia: number; minutos: number }[] = [];
    const sabadosTrabalhados: { dia: number; minutos: number }[] = [];
    const domingosTrabalhados: { dia: number; minutos: number }[] = [];
    const violacoesInterjornada: { dia: number; intervaloMin: number }[] = [];
    const violacoesIntersemanal: { semana: number; intervaloMin: number }[] = [];
    let horasNoturnasMin = 0, totalTrabalhadoMin = 0, diasComRegistro = 0, diasFalta = 0;

    const linhasCalc = (linhas || []).map(l => ({ ...l, trabalhado: calcTrabalhado(l) }));
    let ultimaSaida: { min: number; dia: number } | null = null;

    for (let i = 0; i < linhasCalc.length; i++) {
        const l = linhasCalc[i];
        if (l.tipo === 'FALTA') diasFalta++;
        if (!l.entrada || !l.saida || l.trabalhado <= 0) { ultimaSaida = null; continue; }
        const entMin = hhmm2min(l.entrada), saiMin = hhmm2min(l.saida);
        diasComRegistro++;
        totalTrabalhadoMin += l.trabalhado;
        horasNoturnasMin += calcNoturnasMin(entMin, saiMin, tipoTrabalhador);
        if (l.tipo === 'FERIADO') feriadosTrabalhados.push({ dia: l.dia, minutos: l.trabalhado });
        if (l.tipo === 'SABADO') sabadosTrabalhados.push({ dia: l.dia, minutos: l.trabalhado });
        if (l.tipo === 'DOMINGO') domingosTrabalhados.push({ dia: l.dia, minutos: l.trabalhado });
        if (ultimaSaida !== null) {
            const intervalo = ((l.dia - 1) * 24 * 60 + entMin) - ((ultimaSaida.dia - 1) * 24 * 60 + ultimaSaida.min);
            if (intervalo < 11 * 60) violacoesInterjornada.push({ dia: l.dia, intervaloMin: intervalo });
        }
        ultimaSaida = { min: saiMin, dia: l.dia };
    }

    for (let i = 0; i < linhasCalc.length - 1; i += 7) {
        const semanaArr = linhasCalc.slice(i, i + 7), proxSemanaArr = linhasCalc.slice(i + 7, i + 14);
        const u = [...semanaArr].reverse().find(l => l.entrada && l.saida), p = proxSemanaArr.find(l => l.entrada && l.saida);
        if (u && p) {
            const repouso = ((p.dia - 1) * 24 * 60 + hhmm2min(p.entrada)) - ((u.dia - 1) * 24 * 60 + hhmm2min(u.saida));
            if (repouso < 35 * 60) violacoesIntersemanal.push({ semana: Math.floor(i / 7) + 1, intervaloMin: repouso });
        }
    }

    let heMin50Diario = 0, heMin100Diario = 0, heMin50Semanal = 0, heMin100Semanal = 0;
    for (const l of linhasCalc) {
        const lim = getLimiteDia(l.tipo, jornadaDiaria);
        if (lim === 0) heMin100Diario += l.trabalhado;
        else if (l.trabalhado > lim) heMin50Diario += (l.trabalhado - lim);
    }
    for (let i = 0; i < linhasCalc.length; i += 7) {
        const semana = linhasCalc.slice(i, i + 7);
        let sNormais = 0, s100 = 0, s50Exc = 0;
        for (const l of semana) {
            const lim = getLimiteDia(l.tipo, jornadaDiaria);
            if (lim === 0) s100 += l.trabalhado;
            else { sNormais += Math.min(l.trabalhado, lim); s50Exc += Math.max(0, l.trabalhado - lim); }
        }
        heMin100Semanal += s100;
        heMin50Semanal += s50Exc + Math.max(0, sNormais - jornadaSemanalMin);
    }

    const totalD = heMin50Diario + heMin100Diario, totalS = heMin50Semanal + heMin100Semanal;
    let he50, he100, crit: 'DIARIO' | 'SEMANAL' | 'NENHUM';
    if (totalD === 0 && totalS === 0) { he50 = 0; he100 = 0; crit = 'NENHUM'; }
    else if (totalD >= totalS) { he50 = heMin50Diario; he100 = heMin100Diario; crit = 'DIARIO'; }
    else { he50 = heMin50Semanal; he100 = heMin100Semanal; crit = 'SEMANAL'; }

    return {
        heMinutos50: he50, heMinutos100: he100, criterioUsado: crit, minutosExtrasTotal: he50 + he100,
        feriadosTrabalhados, sabadosTrabalhados, domingosTrabalhados, violacoesInterjornada, violacoesIntersemanal,
        horasNoturnasMin, totalTrabalhadoMin, diasComRegistro, diasFalta, linhas: linhasCalc
    };
}

/* ==========================================================================
   COMPONENTE
   ========================================================================== */
export function CartaoPonto({
    jornadaDiaria, tipoTrabalhador, dataAdmissao, dataDemissao, onChange, initialSimulationId
}: {
    jornadaDiaria: number; tipoTrabalhador: 'URBANO' | 'RURAL';
    dataAdmissao: string; dataDemissao: string; onChange: (v: VerbasCartao) => void; initialSimulationId?: number;
}) {
    const defaultAno = new Date().getFullYear();
    const defaultMes = new Date().getMonth() + 1;

    const [mes, setMes] = useState(defaultMes);
    const [ano, setAno] = useState(defaultAno);
    const [simulationId, setSimulationId] = useState(initialSimulationId);
    const [isSaving, setIsSaving] = useState(false);

    const [linhas, setLinhas] = useState<LinhaCartao[]>([]);

    const [lote, setLote] = useState({
        e1: '08:00', s2: '12:00', r3: '13:00', s4: '18:00',
        dataIn: dataAdmissao || '',
        dataOut: dataDemissao || ''
    });
    const [loteSab, setLoteSab] = useState({ e1: '08:00', s2: '', r3: '', s4: '12:00', ativo: true });

    // Sincroniza Datas do Lote com Admissão/Demissão quando elas mudam (se vazio)
    useEffect(() => {
        if (!lote.dataIn) setLote(l => ({ ...l, dataIn: dataAdmissao }));
        if (!lote.dataOut) setLote(l => ({ ...l, dataOut: dataDemissao }));
    }, [dataAdmissao, dataDemissao]);

    const isDataBloqueada = useCallback((dia: number, m?: number, y?: number) => {
        const curM = m || mes;
        const curY = y || ano;
        const dStr = `${curY}-${String(curM).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        return dStr < dataAdmissao || dStr > dataDemissao;
    }, [ano, mes, dataAdmissao, dataDemissao]);

    const loadMonth = useCallback((m: number, y: number) => {
        const key = `ponto-${y}-${m}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try { return JSON.parse(saved) as LinhaCartao[]; } catch { return gerarLinhas(m, y); }
        }
        return gerarLinhas(m, y);
    }, []);

    // Inicialização e Troca de Mês
    useEffect(() => {
        setLinhas(loadMonth(mes, ano));
    }, [mes, ano, loadMonth]);

    const verbasMensais = useMemo(() => calcularVerbas(linhas, jornadaDiaria, tipoTrabalhador), [linhas, jornadaDiaria, tipoTrabalhador]);

    const globalVerbas = useMemo(() => {
        if (!dataAdmissao || !dataDemissao) return verbasMensais;

        const start = new Date(dataAdmissao + 'T12:00:00');
        const end = new Date(dataDemissao + 'T12:00:00');

        let totalHe50 = 0;
        let totalHe100 = 0;
        let totalNoturnas = 0;
        let totalMinutos = 0;
        let totalDiasGeral = 0;

        let cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const last = new Date(end.getFullYear(), end.getMonth(), 1);

        while (cur <= last) {
            const y = cur.getFullYear();
            const m = cur.getMonth() + 1;

            let mLinhas: LinhaCartao[];
            if (y === ano && m === mes) {
                mLinhas = linhas;
            } else {
                mLinhas = loadMonth(m, y);
            }

            const v = calcularVerbas(mLinhas, jornadaDiaria, tipoTrabalhador);
            totalHe50 += v.heMinutos50;
            totalHe100 += v.heMinutos100;
            totalNoturnas += v.horasNoturnasMin;
            totalMinutos += (v.heMinutos50 + v.heMinutos100);
            totalDiasGeral += v.diasComRegistro;

            cur.setMonth(cur.getMonth() + 1);
        }

        return {
            ...verbasMensais,
            heMinutos50: totalHe50,
            heMinutos100: totalHe100,
            horasNoturnasMin: totalNoturnas,
            minutosExtrasTotal: totalMinutos,
            diasComRegistro: totalDiasGeral,
        };
    }, [linhas, ano, mes, dataAdmissao, dataDemissao, jornadaDiaria, tipoTrabalhador, loadMonth, verbasMensais]);

    useEffect(() => {
        if (linhas.length > 0) {
            onChange(globalVerbas);
            localStorage.setItem(`ponto-${ano}-${mes}`, JSON.stringify(linhas));
        }
    }, [globalVerbas, onChange, ano, mes, linhas]);

    // Auto-save ao DB
    useEffect(() => {
        if (linhas.length === 0) return;
        const t = setTimeout(async () => {
            setIsSaving(true);
            const res = await upsertCartaoPonto({ simulationId, tenantId: 1, linhas, mes, ano });
            if (res.success && res.id) setSimulationId(res.id);
            setTimeout(() => setIsSaving(false), 500);
        }, 2000);
        return () => clearTimeout(t);
    }, [linhas, mes, ano, simulationId]);

    const atualizar = (idx: number, d: Partial<LinhaCartao>) => {
        if (isDataBloqueada(linhas[idx].dia)) return;
        setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, ...d } : l));
    };

    const copiarAcima = (idx: number) => {
        if (idx === 0 || isDataBloqueada(linhas[idx].dia)) return;
        const a = linhas[idx - 1];
        atualizar(idx, { entrada: a.entrada, saidaAlmoco: a.saidaAlmoco, retornoAlmoco: a.retornoAlmoco, saida: a.saida });
    };

    const aplicarLoteAvancado = () => {
        if (!lote.dataIn || !lote.dataOut) return;

        const start = new Date(lote.dataIn + 'T12:00:00');
        const end = new Date(lote.dataOut + 'T12:00:00');

        // Mapeia meses que serão afetados
        const mesesAfetados = new Map<string, LinhaCartao[]>();

        let cursor = new Date(start);
        while (cursor <= end) {
            const y = cursor.getFullYear();
            const m = cursor.getMonth() + 1;
            const d = cursor.getDate();
            const key = `${y}-${m}`;

            if (!mesesAfetados.has(key)) {
                // Se for o mês atual, usa o estado, senão carrega do localStorage
                if (y === ano && m === mes) {
                    mesesAfetados.set(key, [...linhas]);
                } else {
                    mesesAfetados.set(key, loadMonth(m, y));
                }
            }

            const mesLinhas = mesesAfetados.get(key)!;
            const diaIdx = d - 1;

            if (mesLinhas[diaIdx] && !isDataBloqueada(d, m, y)) {
                const l = mesLinhas[diaIdx];
                if (l.tipo === 'UTIL') {
                    mesLinhas[diaIdx] = { ...l, entrada: lote.e1, saidaAlmoco: lote.s2, retornoAlmoco: lote.r3, saida: lote.s4 };
                } else if (l.tipo === 'SABADO' && loteSab.ativo) {
                    mesLinhas[diaIdx] = { ...l, entrada: loteSab.e1, saidaAlmoco: loteSab.s2, retornoAlmoco: loteSab.r3, saida: loteSab.s4 };
                }
            }

            cursor.setDate(cursor.getDate() + 1);
        }

        // Persiste todos os meses afetados
        mesesAfetados.forEach((val, key) => {
            const [y, m] = key.split('-').map(Number);
            localStorage.setItem(`ponto-${y}-${m}`, JSON.stringify(val));
            if (y === ano && m === mes) {
                setLinhas(val);
            }
            // Sync assíncrono básico para o mestre se houver ID (simplificado)
            upsertCartaoPonto({ simulationId, tenantId: 1, linhas: val, mes: m, ano: y });
        });
    };

    const violacoesSet = new Set(verbasMensais.violacoesInterjornada.map(v => v.dia));

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-5 text-white shadow-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                    {isSaving ? <div className="flex items-center gap-1.5 text-[10px] text-orange-400 font-bold animate-pulse"><Clock className="w-3 h-3" /> Salvando...</div> : <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold"><Save className="w-3 h-3" /> Sincronizado</div>}
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Lançamento em Lote Avançado</h3>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                            <span>Jornada Semana (Seg–Sex)</span>
                            <div className="flex items-center gap-2">
                                <span>Período:</span>
                                <input type="date" value={lote.dataIn} onChange={e => setLote(v => ({ ...v, dataIn: e.target.value }))} className="h-7 bg-slate-800 border-slate-700 rounded text-[10px] px-1 text-white" />
                                <span>até</span>
                                <input type="date" value={lote.dataOut} onChange={e => setLote(v => ({ ...v, dataOut: e.target.value }))} className="h-7 bg-slate-800 border-slate-700 rounded text-[10px] px-1 text-white" />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            <TimeInput label="Entrada" value={lote.e1} onChange={v => setLote(l => ({ ...l, e1: v }))} />
                            <TimeInput label="Almoço" value={lote.s2} onChange={v => setLote(l => ({ ...l, s2: v }))} />
                            <TimeInput label="Retorno" value={lote.r3} onChange={v => setLote(l => ({ ...l, r3: v }))} />
                            <TimeInput label="Saída" value={lote.s4} onChange={v => setLote(l => ({ ...l, s4: v }))} />
                        </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-800 pl-6">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-400 uppercase">Sábado</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={loteSab.ativo} onChange={e => setLoteSab(l => ({ ...l, ativo: e.target.checked }))} className="rounded border-slate-700 bg-slate-800" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Ativar</span>
                            </label>
                        </div>
                        <div className={`grid grid-cols-4 gap-2 transition-opacity ${loteSab.ativo ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                            <TimeInput label="Entrada" value={loteSab.e1} onChange={v => setLoteSab(l => ({ ...l, e1: v }))} />
                            <TimeInput label="Almoço" value={loteSab.s2} onChange={v => setLoteSab(l => ({ ...l, s2: v }))} />
                            <TimeInput label="Retorno" value={loteSab.r3} onChange={v => setLoteSab(l => ({ ...l, r3: v }))} />
                            <TimeInput label="Saída" value={loteSab.s4} onChange={v => setLoteSab(l => ({ ...l, s4: v }))} />
                        </div>
                    </div>
                </div>

                <Button onClick={aplicarLoteAvancado} className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-[11px] font-black uppercase h-10 shadow-lg shadow-orange-950/20">Aplicar Jornada em Massa (Multimeses)</Button>
            </div>

            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                <button onClick={() => { let m = mes - 1, y = ano; if (m < 1) { m = 12; y-- } setMes(m); setAno(y); }} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">‹</button>
                <div className="text-center"><p className="font-black text-slate-800 text-sm tracking-tighter uppercase whitespace-nowrap">{MESES[mes - 1]} / {ano}</p><p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Visão Mensal</p></div>
                <button onClick={() => { let m = mes + 1, y = ano; if (m > 12) { m = 1; y++ } setMes(m); setAno(y); }} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">›</button>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
                <table className="w-full text-[10px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                        <tr>
                            <th className="px-3 py-3 text-left w-24">Dia</th>
                            <th className="px-2 py-3 text-center w-20">Tipo</th>
                            <th className="px-1 py-3 text-center">Entrada</th>
                            <th className="px-1 py-3 text-center">S.Alm</th>
                            <th className="px-1 py-3 text-center">R.Alm</th>
                            <th className="px-1 py-3 text-center">Saída</th>
                            <th className="px-3 py-3 text-center w-28 bg-slate-50/50">Total</th>
                            <th className="px-2 py-3 text-center w-10">↑</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {linhas.map((l, idx) => {
                            const trab = calcTrabalhado(l), bloq = isDataBloqueada(l.dia), disabled = bloq;
                            const lim = getLimiteDia(l.tipo, jornadaDiaria), extra = Math.max(0, trab - lim);
                            return (
                                <tr key={idx} className={`${bloq ? 'opacity-30 bg-slate-50' : TIPO_COR[l.tipo]} hover:bg-slate-50/50 transition-colors`}>
                                    <td className="px-3 py-2 font-bold text-slate-700">{l.dia} {l.diaSemana}</td>
                                    <td className="px-1 py-1">
                                        <select value={l.tipo} disabled={bloq} onChange={e => atualizar(idx, { tipo: e.target.value as TipoDia })} className="w-full text-[9px] border border-slate-200 rounded px-1 h-7 bg-white">
                                            {Object.entries(TIPO_LABEL).map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
                                        </select>
                                    </td>
                                    {['entrada', 'saidaAlmoco', 'retornoAlmoco', 'saida'].map((f) => (
                                        <td key={f} className="px-1 py-1">
                                            <Input type="time" value={(l as any)[f]} disabled={disabled} onChange={e => atualizar(idx, { [f]: e.target.value })} className="h-7 text-[10px] px-1 disabled:opacity-20 border-slate-200 focus:ring-1 ring-orange-100" />
                                        </td>
                                    ))}
                                    <td className="px-3 py-1 text-center font-mono font-black text-slate-800">
                                        {trab > 0 ? <span>{min2hhmm(trab)} {extra > 0 && <span className="text-[8px] text-orange-500 font-bold ml-1">+{min2hhmm(extra)}</span>}</span> : <span className="text-slate-200">—</span>}
                                        {violacoesSet.has(l.dia) && <span title="Interjornada < 11h" className="ml-1 text-red-500">⚠</span>}
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                        {idx > 0 && !disabled && <button onClick={() => copiarAcima(idx)} className="p-1.5 text-slate-400 hover:text-orange-600 transition-colors"><Copy className="w-3 h-3" /></button>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <VerbaSummary label="Total HE 50% (Geral)" val={min2hhmm(globalVerbas.heMinutos50)} col="text-orange-600" active={globalVerbas.heMinutos50 > 0} />
                <VerbaSummary label="Total HE 100% (Geral)" val={min2hhmm(globalVerbas.heMinutos100)} col="text-red-700" active={globalVerbas.heMinutos100 > 0} />
                <VerbaSummary label="Total Noturnas" val={min2hhmm(globalVerbas.horasNoturnasMin)} col="text-indigo-600" active={globalVerbas.horasNoturnasMin > 0} />
                <VerbaSummary label="Dias com Registro" val={globalVerbas.diasComRegistro.toString()} col="text-slate-600" active={globalVerbas.diasComRegistro > 0} />
            </div>
        </div>
    );
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="space-y-1">
            <label className="text-[8px] uppercase font-bold text-slate-600">{label}</label>
            <Input type="time" value={value} onChange={e => onChange(e.target.value)} className="h-8 bg-slate-800 border-slate-700 text-white text-[10px] p-1" />
        </div>
    );
}

function VerbaSummary({ label, val, col, active }: { label: string; val: string; col: string; active: boolean }) {
    return (
        <div className={`p-3 rounded-xl border ${active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
            <p className="text-[9px] font-bold text-slate-400 uppercase">{label}</p>
            <p className={`text-sm font-black font-mono ${col}`}>{val}</p>
        </div>
    );
}
