import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, User, Mail, Phone, MapPin, FileText, Clock, Copy, Check, Calendar } from 'lucide-react';
import { NewClientModal } from './NewClientModal';
import { LawyerSelectionModal } from './LawyerSelectionModal';
import { ContractGenerationModal } from './ContractGenerationModal';
import { ClientDocumentsModal } from './ClientDocumentsModal';

import { ZapSignModal } from './ZapSignModal';
import { valorPorExtenso } from '../utils/formatters';

function CopyButton({ text, title = "Copiar" }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`p-1 rounded transition-colors ${copied ? 'text-green-500 bg-green-50' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            title={copied ? "Copiado!" : title}
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
    );
}

function getFullAddress(client) {
    if (!client) return '-';

    // If we have individual components, use them
    const components = [];
    if (client.street) components.push(client.street);
    if (client.number) components.push(client.number);
    if (client.neighborhood) components.push(client.neighborhood);
    if (client.city) components.push(`${client.city}${client.state ? `-${client.state}` : ''}`);
    if (client.zip) components.push(`CEP ${client.zip}`);

    const structured = components.join(', ');

    // Return structured if we have it, otherwise fallback to the legacy address field
    return structured || client.address || '-';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    // dateString is YYYY-MM-DD
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

export function ClientsView() {
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    // ZapSign Modal State
    const [isZapModalOpen, setIsZapModalOpen] = useState(false);
    const [zapDocData, setZapDocData] = useState(null);

    // Proxy Generation State
    const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
    const [clientForProxy, setClientForProxy] = useState(null);

    // Contract Generation State
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [clientForContract, setClientForContract] = useState(null);
    const [lawyers, setLawyers] = useState([]);

    // Document History State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [clientForHistory, setClientForHistory] = useState(null);

    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchClients();
        fetchLawyers();
        checkLogin();
    }, []);

    const checkLogin = () => {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                setCurrentUser(JSON.parse(user));
            } catch (e) {
                console.error("Error parsing user from local storage", e);
            }
        }
    };

    const fetchLawyers = async () => {
        try {
            const response = await axios.get('/api/users');
            const allUsers = response.data.data || [];
            const lawyerUsers = allUsers.filter(u => u.role === 'lawyer' || u.role === 'admin');
            setLawyers(lawyerUsers);
        } catch (error) {
            console.error('Error fetching lawyers:', error);
        }
    };

    const fetchClients = async () => {
        try {
            const response = await axios.get('/api/clients');
            setClients(response.data.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const handleClientCreated = (clientData, isEdit, isDelete) => {
        if (isDelete) {
            setClients(prev => prev.filter(c => c.id !== clientData.id));
        } else if (isEdit) {
            setClients(prev => prev.map(c => c.id === clientData.id ? clientData : c).sort((a, b) => a.name.localeCompare(b.name)));
        } else {
            setClients(prev => [...prev, clientData].sort((a, b) => a.name.localeCompare(b.name)));
        }
    };

    const handleRowDoubleClick = (client) => {
        setSelectedClient(client);
        setIsModalOpen(true);
    };

    const openNewClient = () => {
        setSelectedClient(null);
        setIsModalOpen(true);
    };

    const openHistoryModal = (e, client) => {
        e.stopPropagation();
        setClientForHistory(client);
        setIsHistoryModalOpen(true);
    };

    const saveAndOpenDocument = async (client, type, title, htmlContent, description = null, signers = []) => {
        // 1. Save to backend
        try {
            await axios.post(`/api/clients/${client.id}/documents`, {
                type,
                title,
                htmlContent,
                createdBy: currentUser?.id,
                description
            });
        } catch (error) {
            console.error("Erro ao salvar documento no histórico:", error);
            // Non-blocking error, user can still print
        }

        // 2. Open for printing
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
                <head>
                    <title>${title}</title>
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
                    </div>
                    ${htmlContent}
                </body>
            </html>
        `);
        win.document.close();

        // 3. Open ZapSign Confirmation (NEW)
        if (signers && signers.length > 0) {
            setZapDocData({
                client,
                title,
                htmlContent,
                signers
            });
            setIsZapModalOpen(true);
        }
    };

    const openProxyModal = (e, client) => {
        e.stopPropagation();
        setClientForProxy(client);
        setIsProxyModalOpen(true);
    };

    const handleGenerateProxy = async (selectedLawyers) => {
        setIsProxyModalOpen(false);
        const client = clientForProxy;
        if (!client) return;

        const lawyerText = selectedLawyers.map((lawyer, index) => {
            const isLast = index === selectedLawyers.length - 1;
            const separation = index === 0 ? "" : isLast ? " e " : ", ";
            const nationality = lawyer.nationality || 'brasileiro(a)';
            const maritalStatus = lawyer.marital_status || 'casado(a)';
            const qualification = `${nationality.toLowerCase()}, ${maritalStatus.toLowerCase()}, advogado(a), inscrito(a) na OAB / ${lawyer.oab_uf || 'UF'} sob o nº ${lawyer.oab || '0000'}, com endereço profissional à ${lawyer.office_address || 'Endereço não informado'} `;
            return `${separation} <strong>${lawyer.name.toUpperCase()}</strong>, ${qualification} `;
        }).join('');

        const date = new Date();
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const dateCommon = `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()} `;

        const formatDate = (dateString) => {
            if (!dateString) return '__________';
            const [year, month, day] = dateString.split('-');
            return `${day} /${month}/${year} `;
        }
        const birthDate = formatDate(client.birth_date);

        // Uppercase Issuer
        const rgIssuerUpper = (client.rg_issuer || '').toUpperCase();
        const rgUfUpper = (client.rg_uf || '').toUpperCase();
        const rgFull = `${client.rg || '_______'} ${rgIssuerUpper}/${rgUfUpper}`;

        // Gendered "Nascido" & "Portador"
        const bornText = client.gender === 'Feminino' ? 'nascida' : 'nascido';
        const carrierText = client.gender === 'Feminino' ? 'portadora' : 'portador';

        // Representation Logic
        let representationText = "";
        let minorTerm = "";

        if (client.birth_date) {
            const birth = new Date(client.birth_date);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
            }

            if (age < 18 && !client.is_emancipated) {
                const repName = (client.legal_representative_name || '_______').toUpperCase();
                const repCpf = (client.legal_representative_cpf || '_______');
                representationText = `, neste ato representado(a) por seu/sua Representante Legal <strong>${repName}</strong>, CPF nº <strong>${repCpf}</strong>`;
                minorTerm = ", menor impúbere";
            }
        }

        const htmlContent = `
            <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; text-align: justify; color: black; padding: 20px;">
                <h3 style="text-align: center; text-transform: uppercase; margin-bottom: 2rem;">PROCURAÇÃO “AD JUDICIA ET EXTRA”</h3>
                <p>
                  <strong>${client.name.toUpperCase()}</strong>${minorTerm}, ${client.nationality || '_______'}, ${client.marital_status || '_______'}, ${client.profession || '_______'}, 
                  ${bornText} em ${birthDate}, ${carrierText} do RG nº ${rgFull.trim()} e do CPF sob n. ${client.cpf || '_______'}, 
                  residente e domiciliado na ${client.street || '_______'}, ${client.number || '___'}, ${client.neighborhood || '_______'}, ${client.city || '_______'}-${client.state || '__'}, CEP ${client.zip || '_______'}${representationText}, por este instrumento de procuração, 
                  nomeia e constitui seu bastante procurador, ${lawyerText}, a quem confere amplos e ilimitados poderes para o foro em geral, 
                  com a cláusula <em>ad judicia et extra</em> com poderes para o foro em general e mais os especiais para transigir, confessar, desistir, 
                  fazer acordos, firmar compromissos e termos, variar de ações, receberam da quitação de alvarás, podendo defender o outorgante 
                  nas ações que lhe forem proposta perante qualquer juízo ou tribunal, propor quaisquer medidas preliminares, preventivas ou 
                  assecuratórias dos seus direitos e interesses, representar o outorgante perante qual a quaisquer repartições públicas federais, estatuais, 
                  ou Municipais, Entidades Autárquicas, Sociedade de Economia Mista e Empresas Públicas ou privadas, Cartórios de registro civil, 
                  de registro de notas, de registro de imóveis e de títulos e documento e INSS, podendo ainda pedir correção de Cartório ou juízo, 
                  interpor recursos em qualquer grau de jurisdição, requerer inventario ou partilha de bens, habilitar créditos, assinar termos de 
                  inventariante, prestar as primeiras e ultimas declarações, prestar toda e qualquer declaração de praxe e qualquer e que se fizerem 
                  necessárias, substabelecer o presente com ou sem reserva de poderes, e representa-la em qualquer tipo de ação judicial ou extrajudicial, 
                  bem como acompanhar a receber fazer e quitação em bancos, bem como para atestar a hipossuficiência econômica, assinar qualquer DECLARAÇÃO DE ISENÇÃO, inclusive a de IRPF, declarar, requerer 
                  os benefícios da justiça gratuita e renunciar o excedente de valores de alçada dos juizados especiais se houver.
                </p>
                <p style="margin-top: 2rem;">Conceição do Araguaia - PA, ${dateCommon}.</p>
                <div style="margin-top: 4rem; text-align: center;">
                  <div style="border-top: 1px solid #000; width: 60%; margin: 0 auto; padding-top: 5px;">
                    <strong>${client.name.toUpperCase()}</strong>
                  </div>
                </div>
            </div>
        `;

        const signers = [
            { name: client.name, email: client.email, phone_number: client.phone, auth_mode: 'assinaturaTela', require_selfie: true },
            ...selectedLawyers.map(l => ({ name: l.name, email: l.email, phone_number: l.phone }))
        ];

        await saveAndOpenDocument(client, 'PROCURACAO', `Procuração - ${client.name}`, htmlContent, 'Procuração Ad Judicia', signers);
    };

    // --- Contract Generation ---
    const openContractModal = (e, client) => {
        e.stopPropagation();
        setClientForContract(client);
        setIsContractModalOpen(true);
    };

    const handleGenerateContract = async (selectedLawyers, contractData) => {
        setIsContractModalOpen(false);
        const client = clientForContract;
        if (!client) return;

        const date = new Date();
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const dateFull = `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;

        const formatDate = (dateString) => {
            if (!dateString) return '__________';
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }
        const birthDate = formatDate(client.birth_date);

        // Uppercase Issuer
        const rgIssuerUpper = (client.rg_issuer || '').toUpperCase();
        const rgUfUpper = (client.rg_uf || '').toUpperCase();
        const rgFull = `${client.rg || '_______'} ${rgIssuerUpper}/${rgUfUpper}`;

        // Gendered "Nascido" & "Portador"
        const bornText = client.gender === 'Feminino' ? 'nascida' : 'nascido';
        const carrierText = client.gender === 'Feminino' ? 'portadora' : 'portador';

        // Representation Logic
        let representationText = "";
        let minorTerm = "";

        if (client.birth_date) {
            const birth = new Date(client.birth_date);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
            }

            if (age < 18 && !client.is_emancipated) {
                const repName = (client.legal_representative_name || '_______').toUpperCase();
                const repCpf = (client.legal_representative_cpf || '_______');
                representationText = `, neste ato representado(a) por seu/sua Representante Legal <strong>${repName}</strong>, CPF nº <strong>${repCpf}</strong>`;
                minorTerm = ", menor impúbere";
            }
        }

        const lawyerText = selectedLawyers.map((lawyer) => {
            const nationality = lawyer.nationality || 'brasileiro(a)';
            const maritalStatus = lawyer.marital_status || 'casado(a)';
            return `${lawyer.name.toUpperCase()}, inscrito(a) na OAB/${lawyer.oab_uf || 'UF'} ${lawyer.oab || ''}, ${nationality}, ${maritalStatus}, com endereço profissional à ${lawyer.office_address || ''}`;
        }).join(', e ');

        // HTML Template
        const htmlContent = `
            <div style="font-family: 'Tahoma', sans-serif; font-size: 12pt; line-height: 1.0; text-align: justify; color: black; padding: 20px;">
                <h3 style="text-align: center; font-weight: bold; margin-bottom: 20px;">CONTRATO DE HONORÁRIOS ADVOCATÍCIOS</h3>

                <p style="margin-bottom: 15px;">
                    <strong>${client.name.toUpperCase()}</strong>${minorTerm}, ${client.nationality || 'Brasileiro(a)'}, ${client.profession || 'Profissão'}, ${client.marital_status || 'Estado Civil'}, 
                    ${bornText} em ${birthDate}, ${carrierText} do RG nº ${rgFull.trim()} e CPF/CNPJ ${client.cpf || client.cnpj || 'CPF/CNPJ'}, residente e domiciliado na ${client.street || 'Rua'}, ${client.number || 'Nº'}, ${client.neighborhood || 'Bairro'}, ${client.city || 'Cidade'}-${client.state || 'UF'}, CEP ${client.zip || 'CEP'}${representationText}, 
                    denominado simplesmente <strong>CONTRATANTE</strong>.
                </p>

                <p style="margin-bottom: 15px;">
                    De outro lado, denominado <strong>CONTRATADO</strong>: <br/>
                    ${lawyerText}.
                </p>

                <p style="margin-bottom: 15px;">Têm entre os mesmos, de maneira justa e acordada, o presente CONTRATO DE HONORÁRIOS ADVOCATÍCIOS, ficando desde já aceito, pelas cláusulas abaixo descritas.</p>

                <h4 style="margin-top: 15px; margin-bottom: 5px;">CLÁUSULA 1 - OBJETO DO CONTRATO</h4>
                <p style="margin-bottom: 10px;">O presente instrumento tem como objeto a prestação de serviços advocatícios a serem realizados em todas as Instância.</p>
                <p style="margin-bottom: 10px;">
                    PARÁGRAFO ÚNICO: ATIVIDADES: As atividades inclusas na prestação de serviço objeto deste instrumento, são todas aquelas inerentes à profissão, quais sejam:<br/>
                    a) Praticar quaisquer atos e medidas necessárias e inerentes à causa, junto a todas as repartições públicas da União, dos Estados ou dos Municípios, bem como órgãos a estes ligados direta ou indiretamente, seja por delegação, concessão ou outros meios, bem como de estabelecimentos particulares.<br/>
                    b) Praticar todos os atos inerentes ao exercício da advocacia e aqueles constantes no Estatuto da Ordem dos Advogados do Brasil, bem como os especificados no INSTRUMENTO PROCURATÓRIO.
                </p>

                <h4 style="margin-top: 15px; margin-bottom: 5px;">CLÁUSULA 2 - DOS ATOS PROCESSUAIS</h4>
                <p style="margin-bottom: 10px;">
                    Havendo necessidade de contratação de outros profissionais, no decurso do processo, o CONTRATADO elaborará substabelecimento. Indicando escritório de seu conhecimento, restando facultado ao CONTRATANTE aceitá-lo ou não. Aceitando, ficará sob a responsabilidade, única e exclusivamente do CONTRATANTE no que concerne aos honorários e atividades a serem exercidas.
                </p>
                <p style="margin-bottom: 10px;">
                    PARÁGRAFO ÚNICO: DOLO OU CULPA DO CONTRATANTE: Agindo o CONTRATANTE de forma dolosa ou culposa em face do CONTRATADO, restará facultado a este, substabelecer sem reserva de iguais e se exonerar de todas as obrigações.
                </p>

                <h4 style="margin-top: 15px; margin-bottom: 5px;">CLÁUSULA 3 - REMUNERAÇÃO</h4>
                <p style="margin-bottom: 10px;">
                    Fica acordado entre as partes que os honorários a título de prestação de serviços, <strong>${contractData.paymentDetails}</strong>, para as seguintes atividades: <strong>${contractData.serviceDetails}</strong>.
                </p>
                <p style="margin-bottom: 10px;">PARÁGRAFO PRIMEIRO: Deixando motivadamente, de ter o patrocínio deste causídico, ora contratado, o valor prestado inicialmente na propositura da Ação reverter-se-á em favor do mesmo, sem prejuízo de posteriores cobranças judiciais, em face do CONTRATANTE.</p>
                <p style="margin-bottom: 10px;">PARÁGRAFO SEGUNDO: Os honorários de sucumbência pertencem ao advogado, ora contratado. Caso haja morte ou incapacidade civil do mesmo, seus sucessores ou representante legal receberão os honorários na proporção do trabalho realizado.</p>
                <p style="margin-bottom: 10px;">PARÁGRAFO TERCEIRO: Havendo acordo entre o CONTRATANTE e a parte contrária, não prejudicará o recebimento dos honorários contratados e da sucumbência. Caso em que os horários iniciais e finais serão pagos ao CONTRATADO.</p>
                <p style="margin-bottom: 10px;">PARÁGRAGO QUARTO: DO ATRASO: As partes estabelecem que havendo atraso no pagamento dos honorários, serão cobrados juros de mora na proporção de 1% (um por cento) ao mês.</p>
                <p style="margin-bottom: 10px;">
                    PARÁGRAFO QUINTO: Para fins rescisórios, fica fixado o valor de <strong>${contractData.contractValue} (${valorPorExtenso(contractData.contractValue)})</strong>.
                </p>

                <h4 style="margin-top: 15px; margin-bottom: 5px;">CLÁUSULA 4 - DESPESAS</h4>
                <p style="margin-bottom: 10px;">Todas as despesas, efetuadas pelo CONTRATADO, ligadas direta ou indiretamente com o processo, incluindo-se fotocópias, emolumentos, viagens, custas, entre outros, ficarão a cargo do CONTRATANTE.</p>
                <p style="margin-bottom: 10px;">PARÁGRAFO ÚNICO: RECIBOS: Todas as despesas serão acompanhadas de RECIBO, devidamente preparado e assinado pelo CONTRATADO.</p>

                <h4 style="margin-top: 15px; margin-bottom: 5px;">CLÁUSULA 5 – RESCISÃO</h4>
                <p style="margin-bottom: 10px;">O presente contrato terá validade enquanto perdurar o presente contrato, havendo desistência, dentro ou fora do processo, por quaisquer circunstâncias não determinadas pelo advogado, ou ainda, se lhe for cassado o mandato sem culpa do CONTRATADO, será devido os honorários integralmente, que poderá ser exigido imediatamente.</p>

                <h4 style="margin-top: 15px; margin-bottom: 5px;">CLÁUSULA 6 – COBRANÇA</h4>
                <p style="margin-bottom: 10px;">As partes acordam que facultará ao advogado contratado, o direito de realizar a cobrança dos honorários por todos os meios admitidos em direito, elegendo o foro da Comarca de Conceição do Araguaia, Estado do Pará, para dirimirem quaisquer dúvidas concernentes ao presente instrumento.</p>

                <p style="margin-top: 30px;">Conceição do Araguaia - PA, ${dateFull}</p>

                <div style="margin-top: 60px; display: flex; flex-direction: column; gap: 40px; align-items: center;">
                    <div style="text-align: center; width: 60%; border-top: 1px solid black; padding-top: 5px;">
                        <strong>${client.name.toUpperCase()}</strong><br/>
                        Contratante
                    </div>
                    ${selectedLawyers.map(l => `
                        <div style="text-align: center; width: 60%; border-top: 1px solid black; padding-top: 5px;">
                            <strong>${l.name}</strong><br/>
                            Contratado
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const signers = [
            { name: client.name, email: client.email, phone_number: client.phone, auth_mode: 'assinaturaTela', require_selfie: true },
            ...selectedLawyers.map(l => ({ name: l.name, email: l.email, phone_number: l.phone }))
        ];

        await saveAndOpenDocument(client, 'CONTRATO', `Contrato - ${client.name}`, htmlContent, contractData.serviceDetails, signers);
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.cpf?.includes(search)
    );

    return (
        <div className="flex-1 p-6 overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Clientes</h2>
                <button
                    onClick={openNewClient}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 flex items-center gap-2 font-medium shadow-lg shadow-primary/20 transition-all hover:scale-105"
                >
                    <Plus size={18} />
                    Novo Cliente
                </button>
            </div>

            <div className="bg-card rounded-lg border border-border shadow-sm flex flex-col overflow-hidden h-full">
                {/* Search Bar */}
                <div className="p-4 border-b border-border bg-muted/20">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, email ou CPF..."
                            className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 p-0">
                    {filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <User size={48} className="mb-2 opacity-20" />
                            <p>Nenhum cliente encontrado</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Nome</th>
                                    <th className="px-6 py-3 font-medium">Contato</th>
                                    <th className="px-6 py-3 font-medium">Documento</th>
                                    <th className="px-6 py-3 font-medium">Cidade/UF</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredClients.map((client) => (
                                    <tr
                                        key={client.id}
                                        className="bg-background hover:bg-muted/50 transition-colors cursor-pointer select-none"
                                        onDoubleClick={() => handleRowDoubleClick(client)}
                                    >
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        {client.name}
                                                        <CopyButton text={client.name} title="Copiar Nome" />
                                                        {(() => {
                                                            if (client.birth_date) {
                                                                const birth = new Date(client.birth_date);
                                                                const today = new Date();
                                                                let age = today.getFullYear() - birth.getFullYear();
                                                                const m = today.getMonth() - birth.getMonth();
                                                                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                                                                    age--;
                                                                }
                                                                if (age < 18) {
                                                                    return (
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                                            MENOR
                                                                        </span>
                                                                    );
                                                                }
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground font-normal">{client.profession}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs">
                                                {client.email && (
                                                    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground group">
                                                        <Mail size={12} /> {client.email}
                                                        <CopyButton text={client.email} title="Copiar Email" />
                                                    </div>
                                                )}
                                                {client.phone && (
                                                    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                                                        <Phone size={12} /> {client.phone}
                                                        <CopyButton text={client.phone} title="Copiar Telefone" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-foreground">
                                                    {client.cpf || client.rg || '-'}
                                                    {(client.cpf || client.rg) && <CopyButton text={client.cpf || client.rg} title="Copiar Documento" />}
                                                </div>
                                                {client.birth_date && (
                                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                        <Calendar size={10} />
                                                        {formatDate(client.birth_date)}
                                                        <CopyButton text={formatDate(client.birth_date)} title="Copiar Data de Nasc." />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={12} className="shrink-0" />
                                                <span className="truncate max-w-[200px]" title={getFullAddress(client)}>{getFullAddress(client)}</span>
                                                {getFullAddress(client) !== '-' && <CopyButton text={getFullAddress(client)} title="Copiar Endereço" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => openProxyModal(e, client)}
                                                    className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors"
                                                    title="Gerar Procuração"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => openContractModal(e, client)}
                                                    className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors"
                                                    title="Gerar Contrato"
                                                >
                                                    <FileText size={18} className="text-secondary-foreground" />
                                                </button>
                                                <button
                                                    onClick={(e) => openHistoryModal(e, client)}
                                                    className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-blue-500 transition-colors"
                                                    title="Histórico de Documentos"
                                                >
                                                    <Clock size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <NewClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onClientCreated={handleClientCreated}
                clientToEdit={selectedClient}
            />

            <LawyerSelectionModal
                isOpen={isProxyModalOpen}
                onClose={() => setIsProxyModalOpen(false)}
                onConfirm={handleGenerateProxy}
            />

            <ContractGenerationModal
                isOpen={isContractModalOpen}
                onClose={() => setIsContractModalOpen(false)}
                onConfirm={handleGenerateContract}
                lawyers={lawyers}
            />

            <ClientDocumentsModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                client={clientForHistory}
            />

            <ZapSignModal
                isOpen={isZapModalOpen}
                onClose={() => setIsZapModalOpen(false)}
                docData={zapDocData}
            />
        </div>
    );
}
