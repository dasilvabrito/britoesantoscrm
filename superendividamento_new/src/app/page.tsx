import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import db from "@/lib/db";

export default async function Home() {
  // Stats
  const totalClientes = await db.cliente.count();
  const totalDividas = await db.divida.count();
  const totalSimulacoes = await db.planoPagamento.count();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-900">Painel de Controle</h2>
          <p className="text-slate-500">Visão geral do sistema de superendividamento.</p>
        </div>
        <div className="text-sm text-slate-400">
          {new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-amber-500 font-serif">Nova Análise</CardTitle>
            <CardDescription className="text-slate-300">
              Iniciar diagnóstico financeiro para um novo consumidor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/clientes/novo">
              <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold">
                ➕ Iniciar Cadastro
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              👥 Base de Clientes
            </CardTitle>
            <CardDescription>
              Gerencie prontuários e acompanhe processos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{totalClientes}</div>
            <p className="text-xs text-muted-foreground mb-4">Clientes cadastrados</p>
            <Link href="/clientes">
              <Button variant="outline" className="w-full">Acessar Lista</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 Estatísticas</CardTitle>
            <CardDescription>Resumo operacional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dívidas Analisadas</span>
              <span className="font-bold">{totalDividas}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Planos Gerados</span>
              <span className="font-bold">{totalSimulacoes}</span>
            </div>
            <Button variant="ghost" className="w-full mt-2 text-xs" disabled>Ver Relatórios</Button>
          </CardContent>
        </Card>
      </div>

      {/* Law 14.181 Summary */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-900 font-serif text-lg">⚖️ Parâmetros Legais (Lei 14.181/2021)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-700">
          <div>
            <h4 className="font-bold mb-1">Mínimo Existencial (Art. 54-A)</h4>
            <p>Deve ser preservado na repactuação de dívidas. O cálculo considera despesas básicas como moradia e alimentação.</p>
          </div>
          <div>
            <h4 className="font-bold mb-1">Plano Judicial Compulsório (Art. 104-B)</h4>
            <p>Aplicável se a conciliação falhar. Prazo máximo de 5 anos (60 meses) com primeira parcela em até 180 dias. Exclusão de encargos abusivos.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
