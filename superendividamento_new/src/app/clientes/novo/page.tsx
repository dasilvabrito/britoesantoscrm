'use client';

import { useFormState } from 'react-dom';
import { createClient } from '../actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';

// Initial state for the form action
const initialState = {
    message: '',
    errors: undefined,
};

export default function NewClientPage() {
    // @ts-ignore
    const [state, dispatch] = useFormState(createClient, initialState);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="mb-4">
                <Link href="/clientes" className="text-sm text-slate-500 hover:text-slate-800">
                    &larr; Voltar para Lista
                </Link>
                <h2 className="text-3xl font-serif font-bold text-slate-900 mt-2">Novo Prontuário</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dados do Consumidor</CardTitle>
                    <CardDescription>
                        Informações iniciais para o cálculo do mínimo existencial.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={dispatch} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome Completo</Label>
                            <Input id="nome" name="nome" placeholder="Ex: Maria da Silva" required />
                            {state?.errors?.nome && <p className="text-red-500 text-sm">{state.errors.nome}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cpf">CPF</Label>
                                <Input id="cpf" name="cpf" placeholder="000.000.000-00" required />
                                {state?.errors?.cpf && <p className="text-red-500 text-sm">{state.errors.cpf}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="numeroDependentes">Nº Dependentes</Label>
                                <Input id="numeroDependentes" name="numeroDependentes" type="number" defaultValue="0" min="0" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="rendaLiquida">Renda Líquida Mensal (R$)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-500">R$</span>
                                <Input id="rendaLiquida" name="rendaLiquida" type="number" step="0.01" className="pl-10" placeholder="0,00" required />
                            </div>
                            <p className="text-xs text-slate-500">Considerar valor líquido (após descontos legais).</p>
                            {state?.errors?.rendaLiquida && <p className="text-red-500 text-sm">{state.errors.rendaLiquida}</p>}
                        </div>

                        {state?.message && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                                {state.message}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <Link href="/clientes">
                                <Button variant="ghost" type="button">Cancelar</Button>
                            </Link>
                            <Button type="submit">Salvar Cadastro</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
