import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Plus, Trash2, Building, Users } from 'lucide-react';

export function SettingsView() {
    const [activeTab, setActiveTab] = useState('office'); // 'office' or 'users'
    const [loading, setLoading] = useState(false);
    const [officeData, setOfficeData] = useState({
        company_name: '',
        cnpj: '',
        oab_company: '',
        address: '',
        attorney_name: '',
        oab_attorney: '',
        attorney_qualification: '',
        zapsign_token: '',
        datajud_url: '',
        datajud_key: ''
    });
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'collaborator', cpf: '', phone: '', login: '' });

    // Edit State
    const [editingUser, setEditingUser] = useState(null);
    const [editData, setEditData] = useState({ name: '', email: '', role: '', cpf: '', phone: '', login: '', currentPassword: '', newPassword: '' });

    useEffect(() => {
        fetchOfficeData();
        fetchUsers();
    }, []);

    const fetchOfficeData = async () => {
        try {
            const res = await axios.get('/api/settings');
            if (res.data.data) {
                const safeData = {};
                Object.keys(res.data.data).forEach(k => safeData[k] = res.data.data[k] || '');
                setOfficeData(prev => ({ ...prev, ...safeData }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users');
            setUsers(res.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleOfficeSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.put('/api/settings', officeData);
            alert('Dados do escritório salvos com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/users', newUser);
            setUsers([...users, res.data.data]);
            setNewUser({ name: '', email: '', role: 'collaborator', cpf: '', phone: '', login: '' });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
        try {
            await axios.delete(`/api/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditUser = (user) => {
        const currentUser = JSON.parse(localStorage.getItem('user'));

        setEditingUser(user);
        setEditData({
            name: user.name,
            email: user.email,
            login: user.login || '',
            role: user.role,
            cpf: user.cpf || '',
            phone: user.phone || '',
            oab: user.oab || '',
            oab_uf: user.oab_uf || '',
            nationality: user.nationality || '',
            marital_status: user.marital_status || '',
            office_address: user.office_address || '',
            currentPassword: '',
            newPassword: '',
            isSelfEdit: user.id === currentUser.id
        });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/users/${editingUser.id}`, editData);
            alert('Usuário atualizado com sucesso!');
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar: ' + (error.response?.data?.error || error.message));
        }
    };

    const formatCPF = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatPhone = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto">
            {/* Modal for Editing */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl border border-input">
                        <h3 className="text-xl font-bold mb-4">Editar Usuário: {editingUser.name}</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nome</label>
                                    <input className="w-full h-10 px-3 border rounded-md" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Login (Usuário)</label>
                                    <input className="w-full h-10 px-3 border rounded-md" value={editData.login} onChange={e => setEditData({ ...editData, login: e.target.value })} placeholder="Ex: joao.silva" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input className="w-full h-10 px-3 border rounded-md" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">CPF</label>
                                    <input className="w-full h-10 px-3 border rounded-md" value={editData.cpf} onChange={e => setEditData({ ...editData, cpf: formatCPF(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Telefone</label>
                                    <input className="w-full h-10 px-3 border rounded-md" value={editData.phone} onChange={e => setEditData({ ...editData, phone: formatPhone(e.target.value) })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Função</label>
                                    <select className="w-full h-10 px-3 border rounded-md" value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })}>
                                        <option value="admin">Administrador</option>
                                        <option value="lawyer">Advogado</option>
                                        <option value="collaborator">Colaborador</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="font-semibold text-sm mb-3">Segurança</h4>
                                <div className="space-y-3">
                                    {editData.isSelfEdit && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Senha Atual (Obrigatório)</label>
                                            <input className="w-full h-10 px-3 border rounded-md" type="password" value={editData.currentPassword} onChange={e => setEditData({ ...editData, currentPassword: e.target.value })} />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nova Senha {editData.isSelfEdit ? "(Opcional)" : "(Deixe em branco para manter)"}</label>
                                        <input className="w-full h-10 px-3 border rounded-md" type="password" value={editData.newPassword} onChange={e => setEditData({ ...editData, newPassword: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Lawyer Specific Fields */}
                            {(editData.role === 'lawyer' || editData.role === 'admin') && (
                                <div className="pt-4 border-t border-gray-100">
                                    <h4 className="font-semibold text-sm mb-3">Dados Profissionais</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">OAB</label>
                                            <input
                                                className="w-full h-10 px-3 border rounded-md"
                                                value={editData.oab || ''}
                                                onChange={e => setEditData({ ...editData, oab: e.target.value })}
                                                placeholder="Ex: 12345"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">UF OAB</label>
                                            <input
                                                className="w-full h-10 px-3 border rounded-md"
                                                value={editData.oab_uf || ''}
                                                onChange={e => setEditData({ ...editData, oab_uf: e.target.value })}
                                                placeholder="Ex: PA"
                                                maxLength={2}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Nacionalidade</label>
                                            <input
                                                className="w-full h-10 px-3 border rounded-md"
                                                value={editData.nationality || ''}
                                                onChange={e => setEditData({ ...editData, nationality: e.target.value })}
                                                placeholder="Brasileiro"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Estado Civil</label>
                                            <select
                                                className="w-full h-10 px-3 border rounded-md"
                                                value={editData.marital_status || ''}
                                                onChange={e => setEditData({ ...editData, marital_status: e.target.value })}
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="Solteiro">Solteiro</option>
                                                <option value="Solteira">Solteira</option>
                                                <option value="Casado">Casado</option>
                                                <option value="Casada">Casada</option>
                                                <option value="Divorciado">Divorciado</option>
                                                <option value="Divorciada">Divorciada</option>
                                                <option value="Viúvo">Viúvo</option>
                                                <option value="Viúva">Viúva</option>
                                                <option value="Separado Judicialmente">Separado Judicialmente</option>
                                                <option value="Separada Judicialmente">Separada Judicialmente</option>
                                                <option value="União Estável">União Estável</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">Endereço do Escritório</label>
                                            <input
                                                className="w-full h-10 px-3 border rounded-md"
                                                value={editData.office_address || ''}
                                                onChange={e => setEditData({ ...editData, office_address: e.target.value })}
                                                placeholder="Endereço completo da filial/escritório"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold mb-6">Configurações</h2>

            <div className="flex gap-4 mb-8 border-b border-border">
                <button
                    onClick={() => setActiveTab('office')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'office' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <div className="flex items-center gap-2">
                        <Building size={18} />
                        Dados do Escritório
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <div className="flex items-center gap-2">
                        <Users size={18} />
                        Usuários do Sistema
                    </div>
                </button>
            </div>

            {activeTab === 'office' && (
                <form onSubmit={handleOfficeSave} className="max-w-2xl space-y-6">
                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
                        <h3 className="text-lg font-semibold mb-4">Informações da Sociedade</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Razão Social</label>
                                <input
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={officeData.company_name}
                                    onChange={e => setOfficeData({ ...officeData, company_name: e.target.value })}
                                    placeholder="Ex: SILVA SOCIEDADE INDIVIDUAL DE ADVOCACIA"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">CNPJ</label>
                                <input
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={officeData.cnpj}
                                    onChange={e => setOfficeData({ ...officeData, cnpj: e.target.value })}
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Registro OAB (Sociedade)</label>
                                <input
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={officeData.oab_company}
                                    onChange={e => setOfficeData({ ...officeData, oab_company: e.target.value })}
                                    placeholder="Ex: 2262"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Endereço Completo</label>
                                <input
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={officeData.address}
                                    onChange={e => setOfficeData({ ...officeData, address: e.target.value })}
                                    placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
                        <h3 className="text-lg font-semibold mb-4">Advogado Responsável</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Nome Completo</label>
                                <input
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={officeData.attorney_name}
                                    onChange={e => setOfficeData({ ...officeData, attorney_name: e.target.value })}
                                    placeholder="Dr. Fulano de Tal"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">OAB (Advogado)</label>
                                <input
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={officeData.oab_attorney}
                                    onChange={e => setOfficeData({ ...officeData, oab_attorney: e.target.value })}
                                    placeholder="Ex: PA 31136"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Qualificação Civil</label>
                                <textarea
                                    className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background"
                                    value={officeData.attorney_qualification}
                                    onChange={e => setOfficeData({ ...officeData, attorney_qualification: e.target.value })}
                                    placeholder="ex: brasileiro, casado, com endereço profissional à..."
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Texto que aparecerá na procuração após o nome do advogado.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
                        <h3 className="text-lg font-semibold mb-4">Integrações</h3>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Token da API ZapSign</label>
                                <input
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono text-sm"
                                    value={officeData.zapsign_token || ''}
                                    onChange={e => setOfficeData({ ...officeData, zapsign_token: e.target.value })}
                                    placeholder="Cole seu token aqui"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Necessário para enviar documentos para assinatura digital.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-border mt-2">
                                <h4 className="font-medium text-sm mb-3">Integração PJE (DataJud)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">URL da API (DataJud)</label>
                                        <input
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono text-sm"
                                            value={officeData.datajud_url || ''}
                                            onChange={e => setOfficeData({ ...officeData, datajud_url: e.target.value })}
                                            placeholder="https://datajud.cnj.jus.br/..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Chave da API (Key)</label>
                                        <input
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono text-sm"
                                            value={officeData.datajud_key || ''}
                                            onChange={e => setOfficeData({ ...officeData, datajud_key: e.target.value })}
                                            placeholder="API Key..."
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Utilizado para buscar movimentações processuais. Mantenha os valores padrão a menos que a API mude.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
                        >
                            <Save size={18} />
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'users' && (
                <div className="max-w-4xl space-y-6">
                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Adicionar Usuário</h3>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Nome</label>
                                    <input
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={newUser.name}
                                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                        required
                                        placeholder="Nome do usuário"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Login (Usuário)</label>
                                    <input
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={newUser.login || ''}
                                        onChange={e => setNewUser({ ...newUser, login: e.target.value })}
                                        placeholder="Ex: joao.silva"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                        required
                                        type="email"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-sm font-medium mb-1">Função</label>
                                    <select
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    >
                                        <option value="admin">Administrador</option>
                                        <option value="lawyer">Advogado</option>
                                        <option value="collaborator">Colaborador</option>
                                    </select>
                                </div>
                            </div>

                            {(newUser.role === 'lawyer' || newUser.role === 'admin') && (
                                <div className="p-4 bg-muted/30 rounded border border-border grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">OAB</label>
                                        <input
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                            value={newUser.oab || ''}
                                            onChange={e => setNewUser({ ...newUser, oab: e.target.value })}
                                            placeholder="Nº OAB"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">UF</label>
                                        <input
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                            value={newUser.oab_uf || ''}
                                            onChange={e => setNewUser({ ...newUser, oab_uf: e.target.value })}
                                            placeholder="UF"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nacionalidade</label>
                                        <input
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                            value={newUser.nationality || ''}
                                            onChange={e => setNewUser({ ...newUser, nationality: e.target.value })}
                                            placeholder="Brasileiro"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Estado Civil</label>
                                        <select
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                            value={newUser.marital_status || ''}
                                            onChange={e => setNewUser({ ...newUser, marital_status: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="Solteiro">Solteiro</option>
                                            <option value="Solteira">Solteira</option>
                                            <option value="Casado">Casado</option>
                                            <option value="Casada">Casada</option>
                                            <option value="Divorciado">Divorciado</option>
                                            <option value="Divorciada">Divorciada</option>
                                            <option value="Viúvo">Viúvo</option>
                                            <option value="Viúva">Viúva</option>
                                            <option value="Separado Judicialmente">Separado Judicialmente</option>
                                            <option value="Separada Judicialmente">Separada Judicialmente</option>
                                            <option value="União Estável">União Estável</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1">End. Escritório</label>
                                        <input
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                            value={newUser.office_address || ''}
                                            onChange={e => setNewUser({ ...newUser, office_address: e.target.value })}
                                            placeholder="Endereço profissional..."
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="h-10 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Adicionar
                                </button>
                            </div>
                        </form>

                    </div>

                    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Nome</th>
                                    <th className="px-6 py-3 font-medium">Login</th>
                                    <th className="px-6 py-3 font-medium">Email</th>
                                    <th className="px-6 py-3 font-medium">CPF</th>
                                    <th className="px-6 py-3 font-medium">Telefone</th>
                                    <th className="px-6 py-3 font-medium">Função</th>
                                    <th className="px-6 py-3 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map(user => (
                                    <tr key={user.id} className="bg-background hover:bg-muted/30 cursor-pointer" onDoubleClick={() => handleEditUser(user)}>
                                        <td className="px-6 py-4 font-medium">{user.name}</td>
                                        <td className="px-6 py-4 font-mono text-xs bg-muted/30 rounded">{user.login || '-'}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{user.cpf || '-'}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{user.phone || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                ${user.role === 'admin' ? 'bg-primary/10 text-primary' :
                                                    user.role === 'lawyer' ? 'bg-blue-100 text-blue-800' : 'bg-secondary text-secondary-foreground'}`}>
                                                {user.role === 'admin' ? 'Administrador' : user.role === 'lawyer' ? 'Advogado' : 'Colaborador'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-muted-foreground">
                                            Nenhum usuário cadastrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }
        </div >
    );
}
