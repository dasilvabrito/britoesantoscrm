import React, { useState } from 'react';
import axios from 'axios';
import { Send, X, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export function ZapSignModal({ isOpen, onClose, docData }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    if (!isOpen || !docData) return null;

    const { client, title, htmlContent, signers } = docData;

    const handleSend = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                clientId: client.id,
                title: title,
                htmlContent: htmlContent,
                signers: signers,
                createdBy: 1 // TODO: Get from auth
            };

            const response = await axios.post('/api/zapsign/create', payload);
            setSuccess(response.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Erro ao enviar para o ZapSign");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-lg rounded-lg shadow-xl border border-border p-6 relative animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
                    <X size={20} />
                </button>

                <div className="mb-6 flex items-center gap-3">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <img src="https://zapsign.com.br/wp-content/uploads/2020/10/Favicon.png" alt="ZapSign" className="w-6 h-6 object-contain" onError={(e) => e.target.style.display = 'none'} />
                        <Send size={24} className="text-green-600 dark:text-green-400" style={{ display: 'none' }} />
                        {/* Fallback icon if image fails */}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Enviar para Assinatura</h2>
                        <p className="text-sm text-muted-foreground">Integração ZapSign</p>
                    </div>
                </div>

                {!success ? (
                    <>
                        <div className="space-y-4 mb-6">
                            <div className="bg-muted p-4 rounded-md flex items-start gap-3">
                                <FileText className="text-primary mt-1" size={18} />
                                <div>
                                    <h3 className="font-semibold text-sm">{title}</h3>
                                    <p className="text-xs text-muted-foreground">Este documento será convertido em PDF e enviado.</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold mb-2 uppercase text-muted-foreground text-xs">Signatários (WhatsApp/Email)</h4>
                                <ul className="space-y-2">
                                    {signers.map((s, idx) => (
                                        <li key={idx} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded border border-border/50">
                                            <span className="font-medium">{s.name}</span>
                                            <div className="text-xs text-muted-foreground text-right">
                                                {s.email && <div>{s.email}</div>}
                                                {s.phone && <div>{s.phone}</div>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-[10px] text-muted-foreground mt-2">
                                    * O link de assinatura será enviado automaticamente para o WhatsApp/E-mail cadastrado.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-md border border-input hover:bg-muted text-sm font-medium transition-colors"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSend}
                                className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
                                disabled={loading}
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                {loading ? 'Enviando...' : 'Enviar Agora'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Documento Enviado!</h3>
                        <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                            O documento foi criado no ZapSign e os links de assinatura foram disparados.
                        </p>

                        <div className="flex justify-center gap-3">
                            <a
                                href={success.link}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                            >
                                Assinar Agora (Link Principal)
                            </a>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-md border border-input hover:bg-muted text-sm font-medium"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
