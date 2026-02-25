import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Loader2, UserPlus } from 'lucide-react';
import { NewClientModal } from './NewClientModal';

export function NewDealModal({ isOpen, onClose, stages, onDealCreated, currentUser }) {
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        client_id: '',
        client_name: '',
        deadline: '',
        priority: 'Normal',
        responsible_id: '',
        folder_path: '',
        description: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchClients();
            fetchUsers();
            // Default responsible to current user if they are admin/lawyer, else empty
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'lawyer')) {
                setFormData(prev => ({ ...prev, responsible_id: currentUser.id }));
            }
        }
    }, [isOpen]);

    const fetchClients = async () => {
        try {
            const response = await axios.get('/api/clients');
            setClients(response.data.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/users');
            // Filter only Admins and Lawyers as responsible
            const eligibleUsers = response.data.data.filter(u => u.role === 'admin' || u.role === 'lawyer');
            setUsers(eligibleUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalClientName = formData.client_name;
            if (formData.client_id) {
                const client = clients.find(c => c.id === parseInt(formData.client_id));
                if (client) finalClientName = client.name;
            }

            const payload = {
                ...formData,
                client_name: finalClientName,
                created_by_name: currentUser ? currentUser.name : 'Unknown',
                responsible_id: parseInt(formData.responsible_id) || null
                // stage_id is handled by backend default 'Nova Atividade'
            };

            const response = await axios.post('/api/deals', payload);
            onDealCreated(response.data.data);
            onClose();
            // Reset form
            setFormData({
                title: '',
                client_id: '',
                client_name: '',
                deadline: '',
                priority: 'Normal',
                responsible_id: currentUser?.id || '',
                folder_path: '',
                description: ''
            });
        } catch (error) {
            console.error('Error creating deal:', error);
            alert('Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    const handleNewClientCreated = (newClient) => {
        setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData(prev => ({ ...prev, client_id: newClient.id, client_name: newClient.name }));
        setIsClientModalOpen(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-md rounded-lg shadow-lg border border-border p-6 relative animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-semibold mb-4">Nova Tarefa</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Título da Tarefa</label>
                        <input
                            required
                            className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="ex: Audiência Inicial"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Número do Processo (CNJ)</label>
                        <input
                            className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                            placeholder="0000000-00.0000.0.00.0000"
                            value={formData.process_number}
                            onChange={e => {
                                // Simple numeric mask + dots/dashes implied or just raw text?
                                // User asked for mask in plan but simple text is safer for now.
                                // Let's allow raw text but maybe we can format it later
                                setFormData({ ...formData, process_number: e.target.value })
                            }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Cliente</label>
                        <div className="flex gap-2">
                            <select
                                className="flex-1 h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring"
                                value={formData.client_id}
                                onChange={e => {
                                    const id = e.target.value;
                                    setFormData(prev => {
                                        const client = clients.find(c => c.id == id);
                                        const cleanName = client ? client.name.replace(/[^a-zA-Z0-9]/g, '') : '';
                                        // Default to Network Share path requested by user: \\WILLIAN\antigravity
                                        const defaultPath = client ? `\\\\WILLIAN\\antigravity\\uploads\\clients\\${cleanName}` : '';

                                        return {
                                            ...prev,
                                            client_id: id,
                                            client_name: client ? client.name : '',
                                            folder_path: defaultPath // Auto-fill network path
                                        };
                                    });
                                }}
                                required
                            >
                                <option value="">Selecione um cliente...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setIsClientModalOpen(true)}
                                className="h-10 px-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md flex items-center justify-center"
                                title="Novo Cliente"
                            >
                                <UserPlus size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Data Fatal</label>
                            <input
                                type="date"
                                required
                                className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring"
                                value={formData.deadline}
                                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Prioridade</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="Normal">Normal</option>
                                <option value="Média">Média</option>
                                <option value="Alta">Alta</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Responsável</label>
                        <select
                            required
                            className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring"
                            value={formData.responsible_id}
                            onChange={e => setFormData({ ...formData, responsible_id: e.target.value })}
                        >
                            <option value="">Selecione...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'Adm' : 'Adv'})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Caminho da Pasta (Servidor)</label>
                        <input
                            required
                            className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs"
                            placeholder="\\\\WILLIAN\\antigravity\\uploads\\clients\\NomeCliente"
                            value={formData.folder_path}
                            onChange={e => setFormData({ ...formData, folder_path: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Descrição</label>
                        <textarea
                            className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Detalhes da tarefa..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary text-primary-foreground h-10 px-4 py-2 rounded-md hover:bg-primary/90 flex items-center font-medium disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Criar Tarefa
                        </button>
                    </div>
                </form>

                <NewClientModal
                    isOpen={isClientModalOpen}
                    onClose={() => setIsClientModalOpen(false)}
                    onClientCreated={handleNewClientCreated}
                />
            </div>
        </div>
    );
}
