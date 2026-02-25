import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/LogoutButton";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-merriweather"
});

export const metadata: Metadata = {
  title: "JusCalc - Superendividamento",
  description: "Calculadora Judicial baseada na Lei 14.181/2021",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={cn(
        "min-h-screen bg-slate-50 font-sans antialiased",
        inter.variable,
        merriweather.variable
      )}>
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-xl z-50">
            <div className="p-6 border-b border-slate-800">
              <h1 className="font-serif text-xl font-bold text-amber-500 flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
                JusCalc
              </h1>
              <p className="text-xs text-slate-400 mt-1">Lei 14.181/2021</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              <Link href="/">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
                  🏠 Dashboard
                </Button>
              </Link>

              <div className="pt-4 pb-2 px-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Módulos de Cálculo
              </div>

              <Link href="/clientes/novo">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  ⚖️ Superendividamento
                </Button>
              </Link>
              <Link href="/calculadoras/judicial/atualizacao">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  🔨 Atualização Judicial
                </Button>
              </Link>
              <Link href="/calculadoras/bancario/revisao">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  🏦 Revisão Bancária
                </Button>
              </Link>
              <Link href="/calculadoras/trabalhista/rescisao">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  💼 Rescisão Trabalhista
                </Button>
              </Link>
              <Link href="/calculadoras/familia/pensao">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  ❤️ Pensão Alimentícia
                </Button>
              </Link>
              <Link href="/calculadoras/familia/inventario">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  ⚖️ Inventário Sucessório
                </Button>
              </Link>
              <Link href="/calculadoras/tributario/icms-piscofins">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  ⚖️ ICMS (PIS/COFINS)
                </Button>
              </Link>
              <Link href="/calculadoras/previdenciario/atraso">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  🛡️ INSS em Atraso
                </Button>
              </Link>
              <Link href="/calculadoras/previdenciario/gps-mensal">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  📊 GPS INSS Mensal
                </Button>
              </Link>
              <Link href="/calculadoras/previdenciario/gps-trimestral">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 text-xs py-1 h-auto">
                  📊 GPS INSS Trimestral
                </Button>
              </Link>

              <div className="pt-4 pb-2 px-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Gestão
              </div>
              <Link href="/clientes">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
                  👥 Clientes (Financeiro)
                </Button>
              </Link>

              <Link href="/calculadoras">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
                  🧮 Hub Completo
                </Button>
              </Link>
              <Link href="/relatorios">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50">
                  📄 Relatórios
                </Button>
              </Link>
              <Link href="/configuracoes/salarios">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
                  ⚙️ Configurações
                </Button>
              </Link>
            </nav>


            <div className="p-4 border-t border-slate-800">
              <LogoutButton />
            </div>

            <div className="p-4 pt-0 text-xs text-slate-500 text-center">
              v2.0.1 - Next.js Edition
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 ml-64 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
