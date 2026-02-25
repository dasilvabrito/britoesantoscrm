import { manageExpense, removeExpense } from '@/app/analise/[id]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcularMinimoExistencial, calcularCapacidadePagamento } from '@/lib/lei14181';
import { useState, useEffect, useActionState } from 'react';
// import { useFormState } from 'react-dom'; // Removed

export default function DiagnosisStep({ cliente, onNext }: any) {
    const renda = Number(cliente.rendaLiquida);
    const gastos = cliente.gastos || [];

    // Calculations
    const totalGastos = calcularMinimoExistencial(gastos);
    const capacidade = calcularCapacidadePagamento(renda, totalGastos);

    // Editing State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        tipo: '',
        customTipo: '',
        valor: ''
    });

    // @ts-ignore
    const [state, dispatch] = useActionState(manageExpense.bind(null, cliente.id), { message: '', success: false, error: '' });

    useEffect(() => {
        if (state?.success) {
            resetForm();
        }
    }, [state]);

    const resetForm = () => {
        setEditingId(null);
        setFormData({ tipo: '', customTipo: '', valor: '' });
    };

    const handleEdit = (g: any) => {
        setEditingId(g.id);

        const knownTypes = ['MORADIA', 'ALIMENTACAO', 'SAUDE', 'ENERGIA', 'TRANSPORTE'];
        const isKnown = knownTypes.includes(g.tipo);

        setFormData({
            tipo: isKnown ? g.tipo : 'OUTROS',
            customTipo: isKnown ? '' : g.tipo,
            valor: Number(g.valor).toString()
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-lg border">
                    <div className="text-sm text-slate-500">Renda Líquida</div>
                    <div className="text-xl font-bold text-slate-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(renda)}
                    </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="text-sm text-amber-700">Mínimo Existencial (Gastos)</div>
                    <div className="text-xl font-bold text-amber-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGastos)}
                    </div>
                </div>
                <div className={capacidade > 0 ? "p-4 bg-emerald-50 rounded-lg border border-emerald-100" : "p-4 bg-red-50 rounded-lg border border-red-100"}>
                    <div className={capacidade > 0 ? "text-sm text-emerald-700" : "text-sm text-red-700"}>Capacidade de Pagamento</div>
                    <div className={capacidade > 0 ? "text-xl font-bold text-emerald-900" : "text-xl font-bold text-red-900"}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(capacidade)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form */}
                <div className="space-y-4">
                    <div className={`p-4 border rounded-lg shadow-sm ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'}`}>
                        <h3 className="font-bold text-lg mb-4">{editingId ? 'Editar Gasto' : 'Adicionar Gasto Essencial'}</h3>
                        <form action={dispatch} className="space-y-4">
                            {editingId && <input type="hidden" name="id" value={editingId} />}

                            <div className="space-y-2">
                                <Label>Tipo de Despesa</Label>
                                {/* If custom type, use customTipo as the value sent to server. Otherwise use the selected value. */}
                                <input
                                    type="hidden"
                                    name="tipo"
                                    value={formData.tipo === 'OUTROS' ? formData.customTipo : formData.tipo}
                                />
                                <Select
                                    name="tipo_select" required
                                    value={formData.tipo}
                                    onValueChange={v => {
                                        setFormData(prev => ({
                                            ...prev,
                                            tipo: v,
                                            customTipo: v === 'OUTROS' ? '' : ''
                                        }));
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MORADIA">Moradia (Aluguel/Condomínio)</SelectItem>
                                        <SelectItem value="ALIMENTACAO">Alimentação</SelectItem>
                                        <SelectItem value="SAUDE">Saúde / Medicamentos</SelectItem>
                                        <SelectItem value="ENERGIA">Luz / Água / Gás</SelectItem>
                                        <SelectItem value="TRANSPORTE">Transporte</SelectItem>
                                        <SelectItem value="OUTROS">Outros (Digitar...)</SelectItem>
                                    </SelectContent>
                                </Select>

                                {formData.tipo === 'OUTROS' && (
                                    <Input
                                        placeholder="Digite o tipo de despesa..."
                                        value={formData.customTipo}
                                        onChange={e => setFormData({ ...formData, customTipo: e.target.value })}
                                        className="mt-2"
                                        required
                                    />
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Valor (R$)</Label>
                                <Input
                                    name="valor" type="number" step="0.01" required placeholder="0,00"
                                    value={formData.valor}
                                    onChange={e => setFormData({ ...formData, valor: e.target.value })}
                                />
                            </div>

                            {state?.error && (
                                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                                    {state.error}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button type="submit" className="w-full">
                                    {editingId ? 'Salvar Alteração' : 'Adicionar'}
                                </Button>
                                {editingId && (
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div>
                    <h3 className="font-bold text-lg mb-2">Despesas Registradas</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gastos.map((g: any) => (
                                    <TableRow key={g.id}>
                                        <TableCell>{g.tipo}</TableCell>
                                        <TableCell>{Number(g.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(g)} className="text-blue-500 hover:text-blue-700">✎</Button>
                                                <form action={async () => {
                                                    await removeExpense(cliente.id, g.id);
                                                }}>
                                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">🗑️</Button>
                                                </form>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {gastos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-slate-400 py-4">Nenhum gasto lançado.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t mt-6">
                <Button onClick={onNext} size="lg" className="bg-slate-900">
                    Avançar para Dívidas &rarr;
                </Button>
            </div>
        </div>
    );
}
