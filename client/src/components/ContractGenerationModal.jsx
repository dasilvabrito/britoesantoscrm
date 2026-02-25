import React, { useState } from 'react';
import { X, FileText, Check } from 'lucide-react';

export function ContractGenerationModal({ isOpen, onClose, onConfirm, lawyers }) {
    const [step, setStep] = useState(1);
    const [selectedLawyerIds, setSelectedLawyerIds] = useState([]);
    const [contractData, setContractData] = useState({
        paymentDetails: '', // #VALOR,FORMADEPAGAMENTOEVENCIMENTO#
        serviceDetails: '', // #SERVICOCONTRATADO#
        contractValue: '', // #VALORDOCONTRATO# (Rescisão)
    });

    if (!isOpen) return null;

    const handleLawyerToggle = (id) => {
        setSelectedLawyerIds(prev =>
            prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
        );
    };

    const handleGenerate = () => {
        if (selectedLawyerIds.length === 0) {
            alert("Selecione pelo menos um advogado.");
            return;
        }
        const selectedLawyers = lawyers.filter(l => selectedLawyerIds.includes(l.id));
        onConfirm(selectedLawyers, contractData);
        // Reset state for next time
        setStep(1);
        setSelectedLawyerIds([]);
        setContractData({
            paymentDetails: '',
            serviceDetails: '',
            contractValue: ''
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <FileText className="text-primary" size={24} />
                        </div>
                        <h3 className="text-xl font-bold">Gerar Contrato de Honorários</h3>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-lg mb-2">1. Selecione os Advogados</h4>
                            <p className="text-sm text-muted-foreground mb-4">Escolha os advogados que constarão no contrato.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {lawyers.map(lawyer => (
                                    <div
                                        key={lawyer.id}
                                        onClick={() => handleLawyerToggle(lawyer.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedLawyerIds.includes(lawyer.id)
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedLawyerIds.includes(lawyer.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                                                }`}>
                                                {selectedLawyerIds.includes(lawyer.id) && <Check size={14} />}
                                            </div>
                                            <div>
                                                <div className="font-medium">{lawyer.name}</div>
                                                <div className="text-xs text-muted-foreground">OAB: {lawyer.oab || '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-lg mb-2">2. Dados do Contrato</h4>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Valor e Forma de Pagamento
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <textarea
                                    className="w-full h-24 p-3 rounded-md border border-input bg-background text-sm"
                                    placeholder="Ex: R$ 5.000,00 (cinco mil reais), pagos em 5 parcelas de R$ 1.000,00, com primeiro vencimento em 10/10/2026..."
                                    value={contractData.paymentDetails}
                                    onChange={e => setContractData({ ...contractData, paymentDetails: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Preenche a tag #VALOR,FORMADEPAGAMENTOEVENCIMENTO#</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Serviço Contratado
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <textarea
                                    className="w-full h-24 p-3 rounded-md border border-input bg-background text-sm"
                                    placeholder="Ex: Ajuizamento de Ação Previdenciária de Concessão de Benefício de Aposentadoria por Idade..."
                                    value={contractData.serviceDetails}
                                    onChange={e => setContractData({ ...contractData, serviceDetails: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Preenche a tag #SERVICOCONTRATADO#</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Valor para Rescisão (Total do Contrato)
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    placeholder="Ex: R$ 5.000,00 (apenas números e vírgula)"
                                    value={contractData.contractValue}
                                    onChange={e => setContractData({ ...contractData, contractValue: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Insira apenas o valor (ex: 5.000,00). O extenso será gerado automaticamente.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                        >
                            Voltar
                        </button>
                    )}
                    {step === 1 ? (
                        <button
                            onClick={() => setStep(2)}
                            disabled={selectedLawyerIds.length === 0}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Próximo
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            disabled={!contractData.paymentDetails || !contractData.serviceDetails || !contractData.contractValue}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            <FileText size={16} />
                            Gerar Contrato
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
