import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Loader2, Save, Trash2, User, Search, FileText, MapPin, Mail, Phone } from 'lucide-react';
import { isValidCPF } from '../utils/validators';

export function NewClientModal({ isOpen, onClose, onClientCreated, clientToEdit }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        nationality: '',
        marital_status: '',
        profession: '',
        rg: '',
        rg_issuer: '',
        rg_uf: '',
        birth_date: '',
        cpf: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: ''
    });

    // State for calculated age
    const [age, setAge] = useState(null);

    useEffect(() => {
        if (clientToEdit) {
            setFormData({
                name: clientToEdit.name || '',
                nationality: clientToEdit.nationality || '',
                marital_status: clientToEdit.marital_status || '',
                profession: clientToEdit.profession || '',
                rg: clientToEdit.rg || '',
                rg_issuer: clientToEdit.rg_issuer || '',
                rg_uf: clientToEdit.rg_uf || '',
                birth_date: clientToEdit.birth_date || '',
                cpf: clientToEdit.cpf || '',
                street: clientToEdit.street || '',
                number: clientToEdit.number || '',
                neighborhood: clientToEdit.neighborhood || '',
                city: clientToEdit.city || '',
                state: clientToEdit.state || '',
                zip: clientToEdit.zip || '',
                phone: clientToEdit.phone || '',
                email: clientToEdit.email || '',
                gender: clientToEdit.gender || '',
                legal_representative_name: clientToEdit.legal_representative_name || '',
                legal_representative_cpf: clientToEdit.legal_representative_cpf || '',
                is_emancipated: !!clientToEdit.is_emancipated
            });
        } else {
            setFormData({
                name: '', nationality: '', marital_status: '', profession: '',
                rg: '', rg_issuer: '', rg_uf: '', birth_date: '', cpf: '', street: '', number: '', neighborhood: '',
                city: '', state: '', zip: '', phone: '', email: '',
                gender: '', legal_representative_name: '', legal_representative_cpf: '', is_emancipated: false
            });
        }
    }, [clientToEdit, isOpen]);

    // Calculate Age
    useEffect(() => {
        if (formData.birth_date) {
            const birth = new Date(formData.birth_date);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                calculatedAge--;
            }
            setAge(calculatedAge);
        } else {
            setAge(null);
        }
    }, [formData.birth_date]);

    // Auto-Set Nationality based on Gender
    useEffect(() => {
        if (formData.gender && !clientToEdit) { // Only auto-set for new or if intended
            if (formData.gender === 'Masculino' && (!formData.nationality || formData.nationality === 'Brasileira')) {
                setFormData(prev => ({ ...prev, nationality: 'Brasileiro' }));
            } else if (formData.gender === 'Feminino' && (!formData.nationality || formData.nationality === 'Brasileiro')) {
                setFormData(prev => ({ ...prev, nationality: 'Brasileira' }));
            }
        }
    }, [formData.gender]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let response;
            if (clientToEdit) {
                response = await axios.put(`/api/clients/${clientToEdit.id}`, formData);
            } else {
                response = await axios.post('/api/clients', formData);
            }
            onClientCreated(response.data.data, !!clientToEdit);
            onClose();
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Falha ao salvar cliente');
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;

        setLoading(true);
        try {
            await axios.delete(`/api/clients/${clientToEdit.id}`);
            onClientCreated(clientToEdit, false, true); // (data, isEdit, isDelete)
            onClose();
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Falha ao excluir cliente');
        } finally {
            setLoading(false);
        }
    }

    const formatCPF = (value) => {
        return value
            .replace(/\D/g, '') // Remove non-digits
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1'); // Limit size
    };

    const formatPhone = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const formatCEP = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{3})\d+?$/, '$1');
    };

    const fetchAddress = async (cep) => {
        try {
            const cleanCep = cep.replace(/\D/g, '');
            const res = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);
            if (!res.data.erro) {
                setFormData(prev => ({
                    ...prev,
                    street: res.data.logradouro || '',
                    neighborhood: res.data.bairro || '',
                    city: res.data.localidade || '',
                    state: res.data.uf || '',
                    // Keep other fields
                }));
            }
        } catch (error) {
            console.error("Erro busca CEP", error);
        }
    };

    const handleChange = (e) => {
        let { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            value = checked;
        } else if (name === 'cpf' || name === 'legal_representative_cpf') {
            value = formatCPF(value);
        } else if (name === 'phone') {
            value = formatPhone(value);
        } else if (name === 'zip') {
            value = formatCEP(value);
            if (value.length === 9) {
                fetchAddress(value);
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (name === 'name' || name === 'legal_representative_name') {
            setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" translate="no">
            <div className="bg-background w-full max-w-2xl rounded-lg shadow-lg border border-border p-6 relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] notranslate">
                <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <span className="bg-primary/10 p-1.5 rounded-md text-primary"><Save size={18} /></span>
                    {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* SECTION: BUSCA E IDENTIFICAÇÃO */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-4">
                            <User size={18} className="text-primary" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">Identificação</h3>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">CPF do Cliente</label>
                                <div className="flex gap-2">
                                    <input
                                        name="cpf"
                                        className="flex-1 h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm"
                                        placeholder="000.000.000-00"
                                        value={formData.cpf}
                                        onChange={handleChange}
                                        maxLength={14}
                                        autoFocus
                                        onBlur={async (e) => {
                                            const val = e.target.value;
                                            if (!val) return;

                                            if (!isValidCPF(val)) {
                                                alert('CPF Inválido!');
                                                return;
                                            }

                                            // Check Duplicate
                                            try {
                                                const res = await axios.get(`/api/clients/check-cpf?cpf=${val}`);
                                                if (res.data.exists && (!clientToEdit || res.data.client.id !== clientToEdit.id)) {
                                                    alert(`CPF já cadastrado para: ${res.data.client.name}`);
                                                    setFormData(prev => ({ ...prev, cpf: '' })); // Clear
                                                }
                                            } catch (err) {
                                                console.error("Erro ao verificar CPF", err);
                                            }
                                        }}
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = e.target.value;
                                                if (!val) return;

                                                if (!isValidCPF(val)) {
                                                    alert('CPF Inválido!');
                                                    return;
                                                }

                                                // Check Duplicate
                                                try {
                                                    const res = await axios.get(`/api/clients/check-cpf?cpf=${val}`);
                                                    if (res.data.exists && (!clientToEdit || res.data.client.id !== clientToEdit.id)) {
                                                        alert(`CPF já cadastrado para: ${res.data.client.name}`);
                                                        setFormData(prev => ({ ...prev, cpf: '' }));
                                                    } else {
                                                        // Focus next
                                                        const form = e.target.form;
                                                        const index = Array.prototype.indexOf.call(form, e.target);
                                                        if (form.elements[index + 1]) form.elements[index + 1].focus();
                                                    }
                                                } catch (err) {
                                                    console.error("Erro ao verificar CPF", err);
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="bg-primary/10 hover:bg-primary/20 text-primary h-10 px-3 rounded-md transition-colors"
                                        title="Consultar CPF (Requer configuração de Certificado)"
                                        onClick={() => alert("Funcionalidade de Certificado Digital requer configuração de API.")}
                                    >
                                        <Search size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-8">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Nome Completo</label>
                                <input
                                    required
                                    name="name"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                    placeholder="Ex: JOÃO DA SILVA"
                                    value={formData.name}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                />
                            </div>

                            {/* Line 2: Birth Date - moved here per request */}
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Data Nascimento</label>
                                <input
                                    type="date"
                                    name="birth_date"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.birth_date}
                                    onChange={handleChange}
                                />
                                {age !== null && (
                                    <p className={`text-[10px] mt-1 ${age < 18 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
                                        Idade: {age} anos {age < 18 && !formData.is_emancipated ? '(Menor)' : ''}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION: DOCUMENTAÇÃO E CIVIL */}
                    <div className="p-1">
                        <div className="flex items-center gap-2 mb-4 mt-2">
                            <FileText size={18} className="text-primary" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">Documentação & Dados Civis</h3>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            {/* Line 1: Basic Civil Info - Birth Date moved up */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Gênero</label>
                                <select
                                    name="gender"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.gender || ''}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                </select>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Nacionalidade</label>
                                <input
                                    name="nationality"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Brasileiro(a)"
                                    value={formData.nationality}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Estado Civil</label>
                                <select
                                    name="marital_status"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.marital_status}
                                    onChange={handleChange}
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
                                    <option value="União Estável">União Estável</option>
                                </select>
                            </div>



                            {/* Line 2: RG & Issuer */}
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">RG</label>
                                <input
                                    name="rg"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                                    placeholder="Apenas números"
                                    value={formData.rg}
                                    onChange={handleChange}
                                    maxLength={20}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Orgão Emissor</label>
                                <input
                                    name="rg_issuer"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Ex: SSP/PA"
                                    value={formData.rg_issuer}
                                    onChange={handleChange}
                                    maxLength={10}
                                />
                            </div>

                            {/* Line 3: Profession */}
                            <div className="col-span-12">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Profissão</label>
                                <input
                                    name="profession"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Ex: Advogado"
                                    value={formData.profession}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Representative Logic */}
                            {age !== null && age < 18 && (
                                <div className="col-span-12 bg-amber-500/10 border border-amber-500/20 rounded-md p-3 mt-2 grid grid-cols-12 gap-4">
                                    <div className="col-span-12">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-2">
                                                <User size={16} />
                                                Representante Legal (Obrigatório para Menores)
                                            </h4>

                                            {age >= 16 && (
                                                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        name="is_emancipated"
                                                        checked={formData.is_emancipated}
                                                        onChange={handleChange}
                                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <span>Emancipado?</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {!formData.is_emancipated && (
                                        <>
                                            <div className="col-span-12 md:col-span-8">
                                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Nome do Representante</label>
                                                <input
                                                    required
                                                    name="legal_representative_name"
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    placeholder="Nome do Pai/Mãe/Tutor"
                                                    value={formData.legal_representative_name}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                />
                                            </div>
                                            <div className="col-span-12 md:col-span-4">
                                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">CPF do Representante</label>
                                                <input
                                                    required
                                                    name="legal_representative_cpf"
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                                                    placeholder="CPF"
                                                    value={formData.legal_representative_cpf}
                                                    onChange={handleChange}
                                                    maxLength={14}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}


                        </div>
                    </div>

                    {/* SECTION: CONTATO E ENDEREÇO */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin size={18} className="text-primary" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">Endereço e Contato</h3>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            {/* Line 1: Contact */}
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">E-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-muted-foreground opacity-50" size={14} />
                                    <input
                                        type="email"
                                        name="email"
                                        className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="cliente@email.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">WhatsApp / Telefone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-muted-foreground opacity-50" size={14} />
                                    <input
                                        name="phone"
                                        className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="(99) 99999-9999"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        maxLength={15}
                                    />
                                </div>
                            </div>

                            {/* Line 2: Address Start */}
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">CEP</label>
                                <input
                                    name="zip"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="00000-000"
                                    value={formData.zip || ''}
                                    onChange={handleChange}
                                    maxLength={9}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-7">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Cidade</label>
                                <input
                                    name="city"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Cidade"
                                    value={formData.city || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">UF</label>
                                <input
                                    name="state"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="UF"
                                    value={formData.state || ''}
                                    onChange={handleChange}
                                    maxLength={2}
                                />
                            </div>

                            {/* Line 3: Street */}
                            <div className="col-span-12 md:col-span-10">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Logradouro (Rua, Avenida)</label>
                                <input
                                    name="street"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Nome da Rua"
                                    value={formData.street || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Número</label>
                                <input
                                    name="number"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Nº"
                                    value={formData.number || ''}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Line 4: Neighborhood */}
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-medium mb-1.5 uppercase text-muted-foreground">Bairro</label>
                                <input
                                    name="neighborhood"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Bairro"
                                    value={formData.neighborhood || ''}
                                    onChange={handleChange}
                                />
                            </div>

                        </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-border mt-6">
                        {clientToEdit ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="px-4 py-2 rounded-md hover:bg-destructive/10 text-destructive font-medium flex items-center gap-2 transition-colors"
                            >
                                <Trash2 size={16} />
                                <span className="notranslate">Excluir</span>
                            </button>
                        ) : <div></div>}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-md hover:bg-muted text-muted-foreground font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary text-primary-foreground h-10 px-6 py-2 rounded-md hover:bg-primary/90 flex items-center font-medium disabled:opacity-50 shadow-sm"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                <span className="notranslate">Salvar Cliente</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
