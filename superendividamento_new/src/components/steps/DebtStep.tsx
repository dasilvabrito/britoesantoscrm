import { useState, useEffect, useActionState } from 'react';
// import { useFormState } from 'react-dom'; // Removed

import { manageDebt, removeDebt } from '@/app/analise/[id]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { verificarAbusividade, obterSelicMensal, SELIC_ANUAL_ATUAL } from '@/lib/lei14181';

export default function DebtStep({ cliente, onNext, onBack }: any) {
    const dividas = cliente.dividas || [];
    const totalDividas = dividas.reduce((acc: number, d: any) => acc + Number(d.saldoAtual), 0);

    // Editing State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        credor: '',
        tipo: '',
        numeroContrato: '',
        saldoAtual: '',
        taxaMediaMercado: ''
    });

    // @ts-ignore
    const [state, dispatch] = useActionState(manageDebt.bind(null, cliente.id), { message: '', success: false });

    // UI State for Interest Type
    const [interestType, setInterestType] = useState<"MANUAL" | "SELIC">("MANUAL");
    const [interestValue, setInterestValue] = useState("");

    const selicMensal = obterSelicMensal();

    useEffect(() => {
        if (state.success) {
            resetForm();
        }
    }, [state]);

    useEffect(() => {
        if (interestType === "SELIC") {
            setInterestValue(selicMensal.toString());
        } else if (interestType === "MANUAL" && !editingId) {
            setInterestValue("");
        }
    }, [interestType, selicMensal, editingId]);

    const resetForm = () => {
        setEditingId(null);
        setFormData({ credor: '', tipo: '', numeroContrato: '', saldoAtual: '', taxaMediaMercado: '' });
        setInterestType("MANUAL");
        setInterestValue("");
    };

    const handleEdit = (d: any) => {
        setEditingId(d.id);
        setFormData({
            credor: d.credor,
            tipo: d.tipo,
            numeroContrato: d.numeroContrato || '',
            saldoAtual: Number(d.saldoAtual).toString(),
            taxaMediaMercado: d.taxaMediaMercado ? Number(d.taxaMediaMercado).toString() : ''
        });

        if (d.taxaJurosMensal) {
            setInterestValue(Number(d.taxaJurosMensal).toString());
            // Check if it matches SELIC roughly or just set to Manual
            setInterestType("MANUAL");
        } else {
            setInterestValue("");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold font-serif text-slate-800">Passivo do Consumidor</h3>
                    <p className="text-sm text-slate-500">Cadastre todas as dívidas de consumo exigíveis.</p>
                    {state?.message && (
                        <p className={`text-sm mt-2 ${state.success ? 'text-emerald-600' : 'text-red-600'}`}>
                            {state.message}
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-500">Total Devido</div>
                    <div className="text-2xl font-bold text-red-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDividas)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1 space-y-4">
                    <div className={`p-4 border rounded-lg shadow-sm ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'}`}>
                        <h4 className="font-bold mb-4 text-slate-700">{editingId ? 'Editar Dívida' : 'Nova Dívida'}</h4>
                        <form action={dispatch} className="space-y-4">
                            {editingId && <input type="hidden" name="id" value={editingId} />}

                            <div className="space-y-2">
                                <Label>Credor</Label>
                                <Input
                                    name="credor" required placeholder="Ex: Banco X"
                                    value={formData.credor}
                                    onChange={e => setFormData({ ...formData, credor: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nº Contrato</Label>
                                <Input
                                    name="numeroContrato" placeholder="Opcional"
                                    value={formData.numeroContrato}
                                    onChange={e => setFormData({ ...formData, numeroContrato: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    name="tipo" required
                                    value={formData.tipo}
                                    onValueChange={v => setFormData({ ...formData, tipo: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CONSIGNADO">Consignado</SelectItem>
                                        <SelectItem value="CARTAO">Cartão de Crédito</SelectItem>
                                        <SelectItem value="PESSOAL">Empréstimo Pessoal</SelectItem>
                                        <SelectItem value="CHEQUE">Cheque Especial</SelectItem>
                                        <SelectItem value="FINANCIAMENTO">Financiamento</SelectItem>
                                        <SelectItem value="OUTRO">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Saldo Atual (R$)</Label>
                                <Input
                                    name="saldoAtual" type="number" step="0.01" required placeholder="0,00"
                                    value={formData.saldoAtual}
                                    onChange={e => setFormData({ ...formData, saldoAtual: e.target.value })}
                                />
                            </div>

                            {/* Interest Rate Section */}
                            <div className="space-y-3 pt-2 border-t text-sm">
                                <Label>Taxa de Juros do Contrato</Label>
                                <RadioGroup value={interestType} onValueChange={(v) => setInterestType(v as any)} className="flex space-x-4 mb-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="MANUAL" id="r1" />
                                        <Label htmlFor="r1" className="font-normal cursor-pointer">Manual</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="SELIC" id="r2" />
                                        <Label htmlFor="r2" className="font-normal cursor-pointer">Selic (Atual)</Label>
                                    </div>
                                </RadioGroup>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Taxa Mensal (%)</Label>
                                        <Input
                                            name="taxaJurosMensal"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.0"
                                            value={interestValue}
                                            onChange={(e) => setInterestValue(e.target.value)}
                                            readOnly={interestType === "SELIC"}
                                            className={interestType === "SELIC" ? "bg-slate-100 text-slate-500" : ""}
                                        />
                                        {interestType === "SELIC" && (
                                            <p className="text-[10px] text-slate-500">
                                                Base: Selic {SELIC_ANUAL_ATUAL}% a.a.
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Média Mercado (%)</Label>
                                        <Input
                                            name="taxaMediaMercado" type="number" step="0.01" placeholder="0.0"
                                            value={formData.taxaMediaMercado}
                                            onChange={e => setFormData({ ...formData, taxaMediaMercado: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full">
                                {editingId ? 'Salvar Alterações' : 'Adicionar Dívida'}
                            </Button>
                            {editingId && (
                                <Button type="button" variant="outline" className="w-full" onClick={resetForm}>
                                    Cancelar
                                </Button>
                            )}
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    <div className="border rounded-lg overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Credor/Contrato</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Saldo</TableHead>
                                    <TableHead>Taxas</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dividas.map((d: any) => {
                                    const abusivo = verificarAbusividade(Number(d.taxaJurosMensal), Number(d.taxaMediaMercado));
                                    return (
                                        <TableRow key={d.id} className={abusivo ? "bg-red-50" : ""}>
                                            <TableCell className="font-medium">
                                                <div>{d.credor}</div>
                                                {d.numeroContrato && <div className="text-[10px] text-slate-500">Ctr: {d.numeroContrato}</div>}
                                            </TableCell>
                                            <TableCell className="text-xs">{d.tipo}</TableCell>
                                            <TableCell>{Number(d.saldoAtual).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                            <TableCell>
                                                {d.taxaJurosMensal ? (
                                                    <div className="text-xs">
                                                        <div>Contrato: {d.taxaJurosMensal}%</div>
                                                        {d.taxaMediaMercado && <div className="text-slate-500">Média: {d.taxaMediaMercado}%</div>}
                                                        {abusivo && <Badge variant="destructive" className="mt-1 text-[10px]">Abusivo</Badge>}
                                                    </div>
                                                ) : <span className="text-slate-400">-</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(d)} className="text-blue-500 hover:text-blue-700">✎</Button>
                                                    <form action={async () => {
                                                        await removeDebt(cliente.id, d.id);
                                                    }}>
                                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">✕</Button>
                                                    </form>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {dividas.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                                            Nenhuma dívida cadastrada.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t mt-6">
                <Button onClick={onBack} variant="outline" size="lg">
                    &larr; Voltar
                </Button>
                <Button onClick={onNext} size="lg" className="bg-slate-900">
                    Simular Plano &rarr;
                </Button>
            </div>
        </div>
    );
}
