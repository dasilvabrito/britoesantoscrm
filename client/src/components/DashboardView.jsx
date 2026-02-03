import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LayoutDashboard, Users, Scale, FileText, CheckCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export function DashboardView() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/dashboard/stats');
            setStats(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando Dashboard...</div>;
    if (!stats) return <div className="p-8 text-center">Erro ao carregar dados.</div>;

    // Data for Charts
    const stageData = stats.dealsPerStage.map(s => ({ name: s.name, value: s.count }));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="flex-1 p-6 overflow-hidden flex flex-col h-full bg-background/50 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="text-primary" size={32} /> Visão Geral
                </h2>
                <div className="text-sm text-muted-foreground">
                    Atualizado em: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Total de Clientes</p>
                        <h3 className="text-2xl font-bold">{stats.totalClients}</h3>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                        <Scale size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Processos Ativos</p>
                        <h3 className="text-2xl font-bold">{stats.totalDeals}</h3>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full">
                        <span className="font-bold text-lg">R$</span>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Valor Estimado</p>
                        <h3 className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalValue)}</h3>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Publicações Pendentes</p>
                        <h3 className="text-2xl font-bold">{stats.pendingPublications}</h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-xl border shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-primary" /> Distribuição de Processos
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stageData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                                <YAxis allowDecimals={false} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f3f4f6' }}
                                />
                                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <CheckCircle size={18} className="text-primary" /> Resumo de Produtividade
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium">Taxa de Conversão (Estimada)</span>
                            <span className="text-sm font-bold text-green-600">-- %</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium">Processos Concluídos (Este Mês)</span>
                            <span className="text-sm font-bold text-foreground">--</span>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-xs text-muted-foreground mt-4">
                            Em breve: Métricas detalhadas de produtividade e conversão baseadas no histórico de movimentações.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
