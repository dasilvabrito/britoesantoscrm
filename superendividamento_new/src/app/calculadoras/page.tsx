'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    Gavel,
    Landmark,
    BriefcaseBusiness,
    Heart,
    Scale,
    ShieldCheck,
    ArrowRight,
    TrendingUp,
    FileText,
    Sparkles
} from 'lucide-react';

const calculadoras = [
    {
        title: 'Superendividamento',
        description: 'Análise completa de mínimo existencial e plano de pagamento judicial.',
        href: '/clientes/novo',
        icon: Scale,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        tag: 'Lei 14.181'
    },
    {
        title: 'Atualização Judicial',
        description: 'Correção monetária e juros seguindo Tema 810 STF e EC 113/2021.',
        href: '/calculadoras/judicial/atualizacao',
        icon: Gavel,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        tag: 'Judicial'
    },
    {
        title: 'Revisão Bancária',
        description: 'Análise de abusividade em juros de empréstimos e financiamentos.',
        href: '/calculadoras/bancario/revisao',
        icon: Landmark,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        tag: 'Bancário'
    },
    {
        title: 'Rescisão Trabalhista',
        description: 'Cálculo completo de verbas rescisórias, aviso e multa FGTS.',
        href: '/calculadoras/trabalhista/rescisao',
        icon: BriefcaseBusiness,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        tag: 'Trabalhista'
    },
    {
        title: 'Pensão Alimentícia',
        description: 'Cálculo de binômio necessidade/possibilidade e rateio por filhos.',
        href: '/calculadoras/familia/pensao',
        icon: Heart,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
        tag: 'Família'
    },
    {
        title: 'Exclusão do ICMS (PIS/COFINS)',
        description: 'Tese do Século para recuperação de créditos tributários.',
        href: '/calculadoras/tributario/icms-piscofins',
        icon: Scale,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        tag: 'Tributário'
    },
    {
        title: 'GPS INSS Trimestral',
        description: 'Cálculo de contribuição trimestral para autônomos com multa e juros.',
        href: '/calculadoras/previdenciario/gps-trimestral',
        icon: TrendingUp,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
        tag: 'Previdenciário'
    },
    {
        title: 'GPS INSS Mensal',
        description: 'Recolhimento mensal com assistente de recomendação de código (1007, 1406, etc).',
        href: '/calculadoras/previdenciario/gps-mensal',
        icon: Sparkles,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
        tag: 'Previdenciário'
    },
    {
        title: 'Atraso Previdenciário',
        description: 'Cálculo de guias GPS/DARF em atraso com multa e SELIC.',
        href: '/calculadoras/previdenciario/atraso',
        icon: ShieldCheck,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        tag: 'Previdenciário'
    },
    {
        title: 'Inventário Sucessório',
        description: 'Monte-mor, meação, quinhões, ITCMD por estado, comoriência e decisor judicial/extrajudicial.',
        href: '/calculadoras/familia/inventario',
        icon: Scale,
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        tag: 'Família'
    }
];

export default function CalculadorasDashboard() {
    return (
        <div className="container mx-auto py-12 space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900">
                    Hub de Calculadoras <span className="text-primary italic">Jurídicas</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Ferramentas de alta precisão baseadas em precedentes dos tribunais superiores e legislação vigente.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {calculadoras.map((calc) => (
                    <Card key={calc.title} className="group hover:shadow-xl transition-all duration-300 border-slate-200">
                        <CardHeader>
                            <div className={`w-12 h-12 rounded-xl ${calc.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                <calc.icon className={`w-6 h-6 ${calc.color}`} />
                            </div>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-xl font-bold">{calc.title}</CardTitle>
                                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{calc.tag}</Badge>
                            </div>
                            <CardDescription className="text-sm mt-2 leading-relaxed">
                                {calc.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    Alta Precisão
                                </div>
                                <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    Gera PDF
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full group-hover:translate-x-1 transition-transform">
                                <Link href={calc.href} className="flex items-center justify-center gap-2">
                                    Acessar Calculadora
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Card className="bg-slate-900 text-slate-50 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32 rounded-full" />
                <CardContent className="p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <h2 className="text-3xl font-bold">Precisa de um Cálculo Customizado?</h2>
                        <p className="text-slate-400 max-w-lg">
                            Nossa equipe de engenharia jurídica pode desenvolver módulos sob demanda para seu escritório.
                        </p>
                    </div>
                    <Button size="lg" variant="outline" className="text-slate-900 bg-white border-white hover:bg-slate-100 min-w-[200px]">
                        Falar com Especialista
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
