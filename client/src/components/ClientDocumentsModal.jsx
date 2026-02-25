import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Printer, FileText, Calendar, User, Send, PenTool, Trash2 } from 'lucide-react';

export function ClientDocumentsModal({ isOpen, onClose, client }) {
    const [documents, setDocuments] = useState([]);
    const [sendingId, setSendingId] = useState(null);
    const [lawyers, setLawyers] = useState([]);
    const [docSigning, setDocSigning] = useState(null);
    const [selectedLawyerIds, setSelectedLawyerIds] = useState([]);

    useEffect(() => {
        if (isOpen && client) {
            fetchDocuments();
            fetchLawyers();
        }
    }, [isOpen, client]);

    const fetchLawyers = async () => {
        try {
            const res = await axios.get('/api/users');
            // Filter lawyers and admins. API returns { data: [...] }
            const users = res.data.data || [];
            const list = users.filter(u => u.role === 'admin' || u.role === 'lawyer');
            setLawyers(list);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchDocuments = async () => {
        try {
            const response = await axios.get(`/api/clients/${client.id}/documents`);
            // Ensure we always have an array
            setDocuments(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (error) {
            console.error("Error fetching documents:", error);
            setDocuments([]); // Fallback to empty array
        }
    };

    const initiateZapSign = (doc) => {
        setDocSigning(doc);
        setSelectedLawyerIds([]); // Reset selection
    };

    const confirmSendZapSign = async () => {
        if (!docSigning) return;

        if (!client.email) {
            alert("O cliente não possui e-mail cadastrado. Atualize o cadastro primeiro.");
            return;
        }

        const additionalSigners = lawyers
            .filter(l => selectedLawyerIds.includes(l.id))
            .map(l => ({
                name: l.name,
                email: l.email,
                phone_number: l.phone
            }));

        setSendingId(docSigning.id);
        try {
            const response = await axios.post(`/api/documents/${docSigning.id}/sign`, {
                signerEmail: client.email,
                signerName: client.name,
                signerPhone: client.phone,
                additionalSigners: additionalSigners
            }, { timeout: 60000 }); // 60s timeout for Puppeteer generation
            alert(`Documento enviado! \nLink: ${response.data.signer_link}`);
            fetchDocuments(); // Refresh to show link
            setDocSigning(null); // Close modal
        } catch (error) {
            console.error("Erro ZapSign:", error);
            const errorMsg = error.response?.data?.details
                ? JSON.stringify(error.response.data.details)
                : (error.response?.data?.error || error.message);
            alert("Erro ao enviar para ZapSign: " + errorMsg);
        } finally {
            setSendingId(null);
        }
    };

    const handlePrint = async (doc) => {
        try {
            const response = await axios.get(`/api/documents/${doc.id}/content`);
            const htmlContent = response.data;

            const win = window.open('', '_blank');
            win.document.write(`
                <html>
                    <head>
                        <title>${doc.title}</title>
                        <style>
                            body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; }
                            @media print {
                                .no-print { display: none !important; }
                                body { margin: 0; padding: 0; }
                            }
                            .print-btn {
                                background: #000; color: #fff; border: none; padding: 10px 20px; 
                                border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;
                                margin: 20px auto; font-family: sans-serif;
                            }
                            .print-btn:hover { background: #333; }
                        </style>
                    </head>
                    <body>
                        <div class="no-print" style="text-align: center; padding: 20px; background: #f4f4f5; border-bottom: 1px solid #ddd;">
                            <button onclick="window.print()" class="print-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2-2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                Imprimir / Salvar como PDF
                            </button>
                            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                                Gerado em: ${new Date(doc.created_at).toLocaleString('pt-BR')} por ${doc.creator_name || 'Sistema'}
                            </div>
                        </div>
                        ${htmlContent}
                    </body>
                </html>
            `);
            win.document.close();
        } catch (error) {
            console.error("Error loading document:", error);
            alert("Erro ao carregar o documento.");
        }
    };

    if (!isOpen || !client) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            {/* Main Modal */}
            <div className={`bg-background rounded-lg shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh] ${docSigning ? 'brightness-50 pointer-events-none' : ''}`}>
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="text-primary" />
                        Histórico de Documentos - {client.name}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {documents.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">
                            Nenhum documento gerado para este cliente.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-foreground">{doc.title}</h3>
                                            {doc.description && (
                                                <div className="text-sm text-muted-foreground mt-1 mb-1 line-clamp-2" title={doc.description}>
                                                    {doc.description}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(doc.created_at).toLocaleString('pt-BR')}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <User size={12} />
                                                    {doc.creator_name || 'Desconhecido'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handlePrint(doc)}
                                            className="p-2 hover:bg-primary hover:text-primary-foreground rounded-md transition-colors"
                                            title="Reimprimir/Salvar"
                                        >
                                            <Printer size={18} />
                                        </button>


                                        {doc.signer_link ? (
                                            <div className="relative group">
                                                <a
                                                    href={doc.signer_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 hover:bg-green-600 hover:text-white text-green-600 rounded-md transition-colors flex items-center gap-1"
                                                    title={doc.signers_data ? "Ver Links de Assinatura" : "Assinar (Cliente)"}
                                                >
                                                    <PenTool size={18} />
                                                </a>

                                                {/* Multi-Signer Dropdown Tooltip */}
                                                {doc.signers_data && (
                                                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-white border border-gray-200 shadow-xl rounded-md p-2 z-10 text-xs">
                                                        <div className="font-bold text-gray-700 mb-2 px-1">Links de Assinatura:</div>
                                                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                                                            {(() => {
                                                                try {
                                                                    const signers = JSON.parse(doc.signers_data);
                                                                    return signers.map((s, idx) => (
                                                                        <a
                                                                            key={idx}
                                                                            href={s.sign_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="block p-2 hover:bg-green-50 rounded border border-transparent hover:border-green-100 text-gray-600 hover:text-green-700 truncate"
                                                                            title={`${s.name} (${s.email})`}
                                                                        >
                                                                            <span className="font-semibold block">{s.name}</span>
                                                                            <span className="text-[10px] opacity-75">{s.email}</span>
                                                                        </a>
                                                                    ));
                                                                } catch (e) {
                                                                    return <div className="text-red-500">Erro ao carregar assinantes</div>;
                                                                }
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => initiateZapSign(doc)}
                                                className="p-2 hover:bg-orange-500 hover:text-white text-orange-500 rounded-md transition-colors"
                                                title="Enviar para ZapSign"
                                            >
                                                <Send size={18} />
                                            </button>
                                        )}

                                        <button
                                            onClick={async () => {
                                                if (!confirm("Tem certeza que deseja excluir este documento?")) return;

                                                try {
                                                    // Plain DELETE, no body/password
                                                    await axios.delete(`/api/documents/${doc.id}`);
                                                    alert('Documento excluído com sucesso!');
                                                    fetchDocuments();
                                                } catch (err) {
                                                    console.error(err);
                                                    const msg = err.response?.data?.error || 'Erro ao excluir documento';
                                                    alert(msg);
                                                }
                                            }}
                                            className="p-2 hover:bg-destructive hover:text-white text-destructive rounded-md transition-colors"
                                            title="Excluir Documento"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Signer Selection Modal Overlay */}
            {docSigning && (
                <div className="absolute inset-0 flex items-center justify-center z-[60]">
                    <div className="bg-background rounded-lg shadow-xl border border-border w-full max-w-md p-6 animate-in zoom-in-50 duration-200">
                        <h3 className="text-lg font-bold mb-4">Enviar para Assinatura</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            O documento será enviado para o cliente <strong>{client.name}</strong> ({client.email}).
                        </p>

                        <div className="mb-6">
                            <label className="text-sm font-medium block mb-2">Quem mais deve assinar? (Opcional)</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded p-2">
                                {lawyers.map(l => (
                                    <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={selectedLawyerIds.includes(l.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedLawyerIds([...selectedLawyerIds, l.id]);
                                                else setSelectedLawyerIds(selectedLawyerIds.filter(id => id !== l.id));
                                            }}
                                            className="rounded border-gray-300"
                                        />
                                        {l.name}
                                    </label>
                                ))}
                                {lawyers.length === 0 && <p className="text-xs text-muted-foreground">Nenhum advogado cadastrado.</p>}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setDocSigning(null)}
                                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmSendZapSign}
                                disabled={sendingId === docSigning.id}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center gap-2"
                            >
                                {sendingId === docSigning.id ? "Enviando..." : (
                                    <>
                                        <Send size={16} /> Enviar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
