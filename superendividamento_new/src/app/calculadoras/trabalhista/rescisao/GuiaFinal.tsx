'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X, Scale, ShieldAlert, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { type VerbasCartao } from './CartaoPonto';

const LABEL_RESCISAO: Record<string, string> = {
    SEM_JUSTA_CAUSA: 'Sem Justa Causa',
    COM_JUSTA_CAUSA: 'Com Justa Causa',
    PEDIDO_DEMISSAO: 'Pedido de Demissão',
    RESCISAO_INDIRETA: 'Rescisão Indireta',
    ACORDO_484A: 'Acordo (Art. 484-A)',
    FIM_EXPERIENCIA: 'Fim de Contrato de Experiência',
    FIM_DETERMINADO: 'Fim de Contrato Determinado',
};

function min2hhmm(m: number): string {
    if (!m || m <= 0) return '—';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h${min.toString().padStart(2, '0')}`;
}

interface GuiaFinalProps {
    result: any;
    resumoCartao?: VerbasCartao | null;
    onClose: () => void;
}

export function GuiaFinal({ result, resumoCartao, onClose }: GuiaFinalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    function handlePrint() {
        window.print();
    }

    const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        // Overlay
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4">
            {/* Barra de ação (não impressa) */}
            <div className="fixed top-4 right-4 flex gap-2 z-50 no-print">
                <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 gap-2 shadow-xl">
                    <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
                </Button>
                <Button variant="outline" onClick={onClose} className="gap-2 shadow-xl bg-white">
                    <X className="w-4 h-4" /> Fechar
                </Button>
            </div>

            {/* Documento imprimível */}
            <div
                ref={printRef}
                className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none"
            >
                {/* Cabeçalho */}
                <div className="bg-slate-900 text-white px-8 py-6 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Scale className="w-6 h-6 text-orange-400" />
                            <h1 className="text-xl font-black tracking-tight">Guia de Atendimento Trabalhista</h1>
                        </div>
                        <p className="text-slate-400 text-sm">Documento gerado em {dataHoje} · Uso interno do escritório</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-400 text-xs uppercase tracking-wider">Total Líquido</p>
                        <p className="text-3xl font-black italic text-white">R$ {result.totalLiquido}</p>
                    </div>
                </div>

                <div className="p-8 space-y-8">

                    {/* ── SEÇÃO 1: IDENTIFICAÇÃO DO CLIENTE ─────────────────── */}
                    <section>
                        <SectionTitle icon={<FileText className="w-4 h-4" />} title="1. Identificação do Cliente" />
                        <GridInfo items={[
                            { l: 'Nome', v: result.nomeCliente || '—' },
                            { l: 'CPF', v: result.cpfCliente || '—' },
                            { l: 'Empresa', v: result.nomeEmpresa || '—' },
                            { l: 'Cargo Registrado', v: result.cargoRegistrado || '—' },
                            { l: 'Função Real Exercida', v: result.funcaoReal || '—' },
                            { l: 'Tipo de Rescisão', v: LABEL_RESCISAO[result.tipoRescisao] || result.tipoRescisao },
                            { l: 'Data de Admissão', v: result.dataAdmissao ? new Date(result.dataAdmissao + 'T12:00').toLocaleDateString('pt-BR') : '—' },
                            { l: 'Data de Demissão', v: result.dataDemissao ? new Date(result.dataDemissao + 'T12:00').toLocaleDateString('pt-BR') : '—' },
                            { l: 'Tempo de Serviço', v: `${result.anosCompletos} ano(s) e ${result.mesesCompletos % 12} mês(es)` },
                            { l: 'Aviso Prévio', v: `${result.diasAvisoPrevio} dias (proporcional)` },
                        ]} />
                        {result.relatoLivre && (
                            <div className="mt-3">
                                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Relato do Cliente</p>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 italic">
                                    "{result.relatoLivre}"
                                </div>
                            </div>
                        )}
                    </section>

                    <Divider />

                    {/* ── SEÇÃO 2: MEMORIAL DE CÁLCULO ──────────────────────── */}
                    <section>
                        <SectionTitle icon={<Scale className="w-4 h-4" />} title="2. Memorial de Cálculo das Verbas Rescisórias" />
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="text-left px-3 py-2 text-xs uppercase font-bold text-slate-500 rounded-tl-lg">Rubrica</th>
                                    <th className="text-left px-3 py-2 text-xs uppercase font-bold text-slate-500">Base Legal</th>
                                    <th className="text-right px-3 py-2 text-xs uppercase font-bold text-slate-500 rounded-tr-lg">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getVerbas(result).map((row, i) => (
                                    <tr key={i} className={`border-b border-slate-100 ${row.destaque ? 'font-bold bg-slate-50' : ''} ${row.deducao ? 'text-red-600' : ''}`}>
                                        <td className="px-3 py-2">{row.label}</td>
                                        <td className="px-3 py-2 text-xs text-slate-400">{row.legal}</td>
                                        <td className="px-3 py-2 text-right font-mono">{row.deducao ? '−' : ''} R$ {row.val}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-900 text-white font-black text-base">
                                    <td className="px-3 py-3 rounded-bl-lg">TOTAL FINAL</td>
                                    <td className="px-3 py-3 text-slate-400 text-xs">Soma de todas as verbas</td>
                                    <td className="px-3 py-3 text-right font-mono italic text-xl rounded-br-lg">R$ {result.totalLiquido}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* ── SEÇÃO 3: CARTÃO DE PONTO ──────────────────────────── */}
                    {resumoCartao && (resumoCartao.heMinutos50 > 0 || resumoCartao.heMinutos100 > 0 || resumoCartao.horasNoturnasMin > 0 || resumoCartao.violacoesInterjornada.length > 0) && (
                        <>
                            <Divider />
                            <section>
                                <SectionTitle icon={<FileText className="w-4 h-4" />} title="3. Apuração do Cartão de Ponto" />
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <StatBox label="Total trabalhado" val={min2hhmm(resumoCartao.totalTrabalhadoMin)} />
                                    <StatBox label="HE 50%" val={min2hhmm(resumoCartao.heMinutos50)} cor="text-orange-600" destaque />
                                    <StatBox label="HE 100% Especiais" val={min2hhmm(resumoCartao.heMinutos100)} cor="text-red-600" destaque />
                                    <StatBox label="Horas noturnas" val={min2hhmm(resumoCartao.horasNoturnasMin)} cor="text-blue-600" destaque />
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                    <StatBox label="Viol. interjornada" val={resumoCartao.violacoesInterjornada.length > 0 ? `${resumoCartao.violacoesInterjornada.length}x` : '—'} cor="text-red-500" destaque={resumoCartao.violacoesInterjornada.length > 0} />
                                    <StatBox label="Viol. intersemanal" val={resumoCartao.violacoesIntersemanal.length > 0 ? `${resumoCartao.violacoesIntersemanal.length}x` : '—'} cor="text-red-500" destaque={resumoCartao.violacoesIntersemanal.length > 0} />
                                    <StatBox label="Feriados trabalhados" val={resumoCartao.feriadosTrabalhados.length > 0 ? `${resumoCartao.feriadosTrabalhados.length} dia(s)` : '—'} cor="text-rose-600" destaque={resumoCartao.feriadosTrabalhados.length > 0} />
                                </div>
                                {resumoCartao.criterioUsado !== 'NENHUM' && (
                                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                        <strong>Critério {resumoCartao.criterioUsado === 'DIARIO' ? 'diário' : 'semanal'} utilizado (mais favorável)</strong> — Súmula 338, II TST
                                    </div>
                                )}
                                {resumoCartao.violacoesInterjornada.length > 0 && (
                                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                                        <strong>Interjornada violada ({resumoCartao.violacoesInterjornada.length}x):</strong> Intervalo mínimo de 11h entre jornadas (Art. 66 CLT + Súmula 110 TST).
                                    </div>
                                )}
                                {resumoCartao.violacoesIntersemanal.length > 0 && (
                                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                                        <strong>Repouso semanal insuficiente ({resumoCartao.violacoesIntersemanal.length}x):</strong> Mínimo de 35h entre semanas (Art. 67 CLT).
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    <Divider />

                    {/* ── SEÇÃO 4: SCORE DE RISCO ────────────────────────────── */}
                    <section>
                        <SectionTitle icon={<ShieldAlert className="w-4 h-4" />} title={`${resumoCartao ? '4' : '3'}. Score de Risco Trabalhista`} />
                        <div className="flex items-center gap-6 mb-4">
                            <div className={`text-5xl font-black tabular-nums ${result.risco.cor}`}>
                                {result.risco.total}<span className="text-2xl text-slate-300">/100</span>
                            </div>
                            <div>
                                <p className={`text-xl font-black ${result.risco.cor}`}>{result.risco.nivel}</p>
                                <p className="text-sm text-slate-600 max-w-sm">{result.risco.observacao}</p>
                            </div>
                        </div>
                        {/* Barra */}
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                            <div
                                className={`h-full rounded-full ${result.risco.nivel === 'BAIXO' ? 'bg-emerald-500' : result.risco.nivel === 'MÉDIO' ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${result.risco.total}%` }}
                            />
                        </div>
                        {result.risco.irregularidadesAtivas?.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[9px] uppercase font-bold text-slate-400 mb-2">Irregularidades identificadas</p>
                                {result.risco.irregularidadesAtivas.map((a: string) => (
                                    <div key={a} className="flex items-center gap-2 text-sm text-red-700">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{a}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <p className="text-[9px] uppercase font-bold text-orange-400 mb-1">Estimativa de Valor da Causa</p>
                            <p className="text-2xl font-black text-orange-700">{result.risco.estimativaValorCausa}</p>
                            <p className="text-[9px] text-orange-400 mt-1">Estimativa heurística — não constitui garantia de resultado judicial. Sujeita aos critérios do magistrado.</p>
                        </div>
                    </section>

                    {/* ── SEÇÃO 5: DIREITOS E RECOMENDAÇÕES ─────────────────── */}
                    <Divider />
                    <section>
                        <SectionTitle icon={<CheckCircle2 className="w-4 h-4" />} title={`${resumoCartao ? '5' : '4'}. Direitos Ativados — ${LABEL_RESCISAO[result.tipoRescisao] || ''}`} />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                                ['Saldo de salário', result.direitos?.saldoSalario],
                                ['Aviso prévio indenizado', result.direitos?.avisoPrevioIndenizado],
                                ['Férias vencidas + 1/3', result.direitos?.feriasVencidas],
                                ['Férias proporcionais + 1/3', result.direitos?.feriasProporcionais],
                                ['13º salário proporcional', result.direitos?.decimoTerceiro],
                                ['Multa FGTS 40%', result.direitos?.multa40],
                                ['Multa FGTS 20%', result.direitos?.multa20],
                                ['Liberação do FGTS', result.direitos?.liberacaoFGTS],
                                ['Seguro-desemprego', result.direitos?.seguroDesemprego],
                            ].map(([label, ativo]) => (
                                <div key={label as string} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${ativo ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-400'}`}>
                                    <span className={`text-base ${ativo ? 'text-emerald-500' : 'text-slate-300'}`}>{ativo ? '✓' : '✗'}</span>
                                    <span className="font-medium">{label}</span>
                                </div>
                            ))}
                        </div>

                        {result.seguroDesemprego && (
                            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-[9px] uppercase font-bold text-blue-400 mb-1">Seguro-Desemprego (Estimativa)</p>
                                <p className="text-lg font-bold text-blue-800">{result.seguroDesemprego.parcelas} parcelas de ≈ R$ {result.seguroDesemprego.valorEstimado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <p className="text-[9px] text-blue-400">Sujeito a confirmação pela tabela oficial do MTE.</p>
                            </div>
                        )}
                    </section>

                    {/* Rodapé */}
                    <Divider />
                    <footer className="text-center text-[9px] text-slate-400 space-y-1">
                        <p>Este documento é de uso exclusivo do advogado e não substitui orientação jurídica formal.</p>
                        <p>Gerado automaticamente em {dataHoje} · Módulo Trabalhista Pro</p>
                    </footer>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body > *:not(.print-root) { display: none !important; }
                    .no-print { display: none !important; }
                    .fixed.inset-0 { position: static !important; background: white !important; padding: 0 !important; }
                    @page { margin: 1.5cm; }
                }
            `}</style>
        </div>
    );
}

/* ── Sub-componentes ────────────────────────────────────────────────────────── */
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <div className="text-orange-500">{icon}</div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">{title}</h2>
        </div>
    );
}

function Divider() {
    return <div className="border-t border-slate-100" />;
}

function GridInfo({ items }: { items: { l: string; v: string }[] }) {
    return (
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {items.map(({ l, v }) => (
                <div key={l}>
                    <p className="text-[9px] uppercase font-bold text-slate-400">{l}</p>
                    <p className="text-sm text-slate-800 font-medium">{v}</p>
                </div>
            ))}
        </div>
    );
}

function StatBox({ label, val, cor = 'text-slate-700', destaque = false }: {
    label: string; val: string; cor?: string; destaque?: boolean;
}) {
    return (
        <div className={`rounded-xl border p-3 text-center ${destaque ? 'border-current/20 bg-white shadow-sm' : 'border-slate-200 bg-slate-50'}`}>
            <p className="text-[9px] uppercase font-bold text-slate-400">{label}</p>
            <p className={`font-black text-lg font-mono ${cor}`}>{val}</p>
        </div>
    );
}

/* ── Verbas para o memorial ─────────────────────────────────────────────────── */
type VerbaRow = { label: string; legal: string; val: string; destaque?: boolean; deducao?: boolean; };

function getVerbas(r: any): VerbaRow[] {
    const rows: VerbaRow[] = [
        { label: 'Saldo de Salário', legal: 'Art. 477 CLT', val: r.saldoSalario },
        { label: `Aviso Prévio (${r.diasAvisoPrevio} dias)`, legal: 'Art. 487 CLT + Lei 12.506/11', val: r.avisoPrevio },
        { label: 'Férias Vencidas + 1/3', legal: 'Art. 146 CLT', val: r.feriasVencidas },
        { label: 'Férias Proporcionais + 1/3', legal: 'Art. 147 CLT', val: r.feriasProporcionais },
        { label: '13º Salário Proporcional', legal: 'Lei 4.090/62', val: r.decimoTerceiro },
    ];

    if (parseFloat(r.reflexoVariaveisFeriasVencidas) > 0)
        rows.push({ label: 'Reflexo Variáveis — Férias Vencidas', legal: 'Súmula 253 TST', val: r.reflexoVariaveisFeriasVencidas });
    if (parseFloat(r.reflexoVariaveisFeriasProporcionais) > 0)
        rows.push({ label: 'Reflexo Variáveis — Férias Proporcionais', legal: 'Súmula 253 TST', val: r.reflexoVariaveisFeriasProporcionais });
    if (parseFloat(r.reflexoVariaveisDecimo) > 0)
        rows.push({ label: 'Reflexo Variáveis — 13º', legal: 'Súmula 253 TST', val: r.reflexoVariaveisDecimo });

    if (parseFloat(r.valorHECard) > 0)
        rows.push({ label: 'Horas Extras (Cartão de Ponto)', legal: 'Art. 59 CLT', val: r.valorHECard, destaque: true });

    rows.push({ label: 'Multa Rescisória FGTS', legal: 'Art. 18 Lei 8.036/90', val: r.multaFGTS });
    rows.push({ label: 'TOTAL FINAL', legal: 'Soma das verbas', val: r.totalBruto, destaque: true });

    return rows;
}
