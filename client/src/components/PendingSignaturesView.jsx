import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PenTool, CheckCircle, Clock } from 'lucide-react';

export function PendingSignaturesView() {
    const [docs, setDocs] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingDocs();
    }, []);

    const fetchPendingDocs = async () => {
        try {
            const res = await axios.get('/api/documents/pending');
            setDocs(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (error) {
            console.error("Error fetching pending docs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await axios.post('/api/documents/sync-status');
            fetchPendingDocs(); // Refresh list after sync
        } catch (error) {
            alert("Erro ao sincronizar: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex-1 p-6 overflow-hidden flex flex-col h-full bg-background/50">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <PenTool className="text-primary" /> Assinaturas Pendentes
                </h2>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
                >
                    {syncing ? <Clock className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                    Sincronizar Status
                </button>
            </div>

            <div className="bg-card rounded-lg border shadow-sm flex flex-col overflow-hidden h-full">
                <div className="overflow-y-auto flex-1 p-0">
                    {loading ? (
                        <div className="text-center py-10">Carregando...</div>
                    ) : (!docs || docs.length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-50">
                            <CheckCircle size={48} className="mb-2" />
                            <p>Todas as assinaturas estão em dia.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {docs.map(doc => {
                                let signers = [];
                                try {
                                    signers = doc.signers_data ? JSON.parse(doc.signers_data) : [];
                                } catch (e) { }

                                return (
                                    <div key={doc.id} className="p-4 hover:bg-muted/30 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-lg">{doc.title}</h3>
                                                <p className="text-sm text-muted-foreground">Cliente: {doc.client_name}</p>
                                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                    <Clock size={12} /> Criado em: {new Date(doc.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    {doc.status === 'signed' ? (
                                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                                            Assinado
                                                        </span>
                                                    ) : (
                                                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                                                            Pendente
                                                        </span>
                                                    )}

                                                    {doc.folder && (
                                                        <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full">
                                                            {doc.folder}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Signers List */}
                                            <div className="mt-3 bg-muted/50 p-3 rounded-md border border-border/50">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                                    <PenTool size={12} /> Links para Assinatura (Clique para abrir):
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {signers.length > 0 ? (
                                                        signers.map((s, idx) => (
                                                            <a key={idx} href={s.sign_url} target="_blank" rel="noreferrer"
                                                                className={`flex items-center gap-3 p-2 rounded border transition-all group ${s.status === 'signed'
                                                                    ? 'bg-green-50/50 border-green-200 hover:bg-green-50'
                                                                    : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-sm'}`}>

                                                                <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${s.status === 'signed' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} title={s.status === 'signed' ? "Assinado" : "Pendente"}></div>

                                                                <div className="overflow-hidden flex-1">
                                                                    <div className="font-medium text-sm truncate text-foreground">{s.name}</div>
                                                                    <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                                                                </div>

                                                                {s.status !== 'signed' && (
                                                                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 text-xs font-medium bg-blue-50 px-2 py-1 rounded">
                                                                        Abrir Link
                                                                    </div>
                                                                )}
                                                            </a>
                                                        ))
                                                    ) : doc.signer_link ? (
                                                        <a href={doc.signer_link} target="_blank" rel="noreferrer"
                                                            className="flex items-center gap-2 p-2 bg-background border rounded hover:border-primary/50 hover:bg-primary/5 transition-colors group text-blue-600">
                                                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                                            <div className="font-medium text-sm">Link de Assinatura Principal</div>
                                                        </a>
                                                    ) : (
                                                        <div className="text-sm text-red-500">Sem dados de assinantes.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                    }
                </div>
            </div>
        </div>
    );
}
