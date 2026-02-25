/**
 * inventarioEngine.ts — v2.0
 * Engine completa de inventário sucessório com suporte a:
 *   - Família recomposta (filhos comuns × exclusivos)
 *   - Engine de comunicabilidade de bens
 *   - Alertas jurídicos automáticos
 *   - Fluxograma decisório de 12 etapas
 *   - Calculadora de honorários por complexidade
 *
 * Base normativa:
 *   CC/2002 arts. 8º, 1.658–1.666, 1.668, 1.784–2.027
 *   CPC/2015 arts. 610–673 | Resolução CNJ 35/2007
 */

import { fmtBRL, fmtPct } from './formatBR';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS BASE
// ═══════════════════════════════════════════════════════════════════════════════

export type RegimeBens =
    | 'comunhao_parcial'
    | 'comunhao_universal'
    | 'separacao_total'
    | 'separacao_obrigatoria'
    | 'participacao_final';

/** Origem do bem — determina comunicabilidade */
export type OrigemBem =
    | 'antes_casamento'       // adquirido antes do casamento → particular
    | 'apos_casamento'        // adquirido na constância → depende do regime
    | 'doacao'                // doação recebida → particular (salvo cláusula)
    | 'heranca'               // herança recebida → particular (salvo cláusula)
    | 'sub_rogacao';          // bem particular sub-rogado

export type TipoBem =
    | 'imovel'
    | 'veiculo'
    | 'aplicacao_financeira'
    | 'empresa'
    | 'bem_movel'
    | 'credito'
    | 'rural'
    | 'outro';

export type GrauHerdeiro =
    | 'conjuge'
    | 'companheiro'
    | 'filho'
    | 'filho_exclusivo'      // filho só do falecido (não do cônjuge)
    | 'neto'
    | 'pai'
    | 'mae'
    | 'irmao'
    | 'outro_colateral'
    | 'testamentario';

/** Tipo de filiação para família recomposta */
export type TipoFilho =
    | 'comum'                // filho dos dois falecidos
    | 'exclusivo_pai'        // filho apenas do pai falecido
    | 'exclusivo_mae';       // filho apenas da mãe falecida

export type ModalidadeHonorarios =
    | 'percentual_puro'
    | 'percentual_mais_exito'
    | 'valor_fixo'
    | 'parcelado';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BemInventario {
    id: string;
    tipo: TipoBem;
    subtipo?: string;
    descricao: string;
    matriculaRegistro?: string;
    localizacao?: string;
    uf?: string;
    valorMercado: number;
    valorFiscal?: number;
    dataAvaliacao?: string;
    dataAquisicao?: string;                 // NOVO: determina se antes/após casamento
    adquiridoAntesDoCasamento?: boolean;    // NOVO: complementa origem
    percentualPropriedade: number;          // 0–1 (ex: 1.0 = 100%)
    origem: OrigemBem;
    possuiClausulaIncomunicabilidade?: boolean; // NOVO
    onusOuGravame: boolean;
    descricaoOnus?: string;
    dividasVinculadas: number;
    pertenceAFalecidoId: string;
    // calculado pela engine
    classificacao?: 'comum' | 'particular' | 'analisar';
}

export interface Divida {
    id: string;
    descricao: string;
    valor: number;
    pertenceAFalecidoId: string;
    garantidaPorBemId?: string;
}

export interface Herdeiro {
    id: string;
    nome: string;
    grau: GrauHerdeiro;
    tipoFilho?: TipoFilho;                  // NOVO: para família recomposta
    incapaz: boolean;
    premorto: boolean;
    herdeirosDoPremorto?: Herdeiro[];
    pertenceAFalecidoId: string;
    testamento?: boolean;
    percentualTestamento?: number;          // 0–1
}

export interface Falecido {
    id: string;
    nome: string;
    dataObito: string;
    estadoCivil: 'solteiro' | 'casado' | 'viuvo' | 'divorciado' | 'uniao_estavel';
    regimeBens: RegimeBens;
    conjugeId?: string;                     // NOVO: ID do cônjuge (se também falecido)
    casamentoDataInicio?: string;           // NOVO
    casamentoDataFim?: string;              // NOVO
    ultimoDomicilio: string;
    uf: string;
    temTestamento: boolean;
    comorienteGrupoId?: string;
    ordemObito?: number;
    herdouDeIds?: string[];
}

export interface PartilhaItem {
    herdeiroId: string;
    herdeiroNome: string;
    bemId?: string;
    descricao: string;
    valor: number;
    compensacaoDevida: number;
    itcmd: number;
}

/** Resultado do cálculo de honorários */
export interface HonorariosResult {
    monteMorBase: number;
    modalidade: 'extrajudicial' | 'judicial';
    scoreComplexidade: number;
    percentualBase: number;
    percentualAplicado: number;
    valorHonorarios: number;
    valorMinimo: number;
    valorMaximo: number;
    nivelRisco: 'Baixo' | 'Médio' | 'Alto' | 'Muito Alto';
    recomendacaoEstrategica: string;
    horasEstimadas: { min: number; max: number };
    modelosCobranca: {
        percentualPuro: number;
        percentualMaisExito: { entrada: number; exito: number };
        fixoMinimo: number;
    };
}

export interface ResultadoInventario {
    falecidoId: string;
    falecidoNome: string;
    // Patrimônio separado
    bensComuns: BemInventario[];            // NOVO
    bensParticulares: BemInventario[];      // NOVO
    totalBensBruto: number;
    totalDividas: number;
    monteMor: number;
    meacao: number;
    herancaLiquida: number;
    // Herdeiros
    herdeirosTotais: number;
    quinhoes: {
        herdeiroId: string;
        herdeiroNome: string;
        grau: GrauHerdeiro;
        tipoFilho?: TipoFilho;
        quinhao: number;
        percentual: number;
        itcmd: number;
        itcmdAliquota: number;
    }[];
    itcmdTotal: number;
    // Partilha
    partilhaSugerida: PartilhaItem[];
    saldoRestante: number;
    // Análise
    modalidade: 'extrajudicial' | 'judicial';
    motivoJudicial: string[];
    alertasJuridicos: string[];             // NOVO
    etapasDecisao: string[];                // NOVO: fluxograma decisório
    scoreComplexidade: number;
    classificacaoComplexidade: 'Simples' | 'Moderado' | 'Complexo' | 'Alta complexidade sucessória';
    tempoEstimadoMeses: { min: number; max: number };
    // Comoriência
    comoriencia: boolean;
    comorientesGrupo?: string;
    // Honorários
    honorarios: HonorariosResult;           // NOVO
    // Memória
    memoriaCalculo: string[];
}

export interface InventarioConfig {
    falecidos: Falecido[];
    herdeiros: Herdeiro[];
    bens: BemInventario[];
    dividas: Divida[];
    aliquotaITCMDOverride?: number;
    litiogio: boolean;
    partilhaPersonalizada?: { herdeiroId: string; bemId: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABELAS DE REFERÊNCIA
// ═══════════════════════════════════════════════════════════════════════════════

export type AliquotaITCMDPorUF = Record<string, number>;

export const ALIQUOTAS_ITCMD: AliquotaITCMDPorUF = {
    AC: 0.04, AL: 0.04, AM: 0.02, AP: 0.04, BA: 0.08,
    CE: 0.08, DF: 0.06, ES: 0.04, GO: 0.04, MA: 0.04,
    MG: 0.05, MS: 0.06, MT: 0.04, PA: 0.04, PB: 0.04,
    PE: 0.08, PI: 0.04, PR: 0.04, RJ: 0.08, RN: 0.03,
    RO: 0.04, RR: 0.04, RS: 0.06, SC: 0.01, SE: 0.08,
    SP: 0.04, TO: 0.02,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE DE COMUNICABILIDADE  (CC arts. 1.658–1.666, 1.668)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Define se um bem é comunicável (comum do casal) conforme o regime de bens.
 * Retorna: true = comum | false = particular | 'analisar' = requer análise
 */
export function definirComunicabilidade(
    bem: BemInventario,
    regime: RegimeBens,
): boolean | 'analisar' {
    // Cláusula de incomunicabilidade sempre prevalece
    if (bem.possuiClausulaIncomunicabilidade) return false;

    switch (regime) {
        case 'comunhao_universal':
            // CC art. 1.667 + 1.668: universalmente comuns, salvo herança/doação
            if (bem.origem === 'heranca' || bem.origem === 'doacao') return 'analisar';
            return true;

        case 'comunhao_parcial':
            // CC art. 1.658 + 1.659: comunicam bens adquiridos onerosamente na constância
            if (bem.origem === 'antes_casamento') return false;
            if (bem.adquiridoAntesDoCasamento === true) return false;
            if (bem.origem === 'doacao' || bem.origem === 'heranca') return false;
            if (bem.origem === 'sub_rogacao') return false;
            if (bem.origem === 'apos_casamento') return true;
            return 'analisar';

        case 'separacao_total':
        case 'separacao_obrigatoria':
            // CC art. 1.687: nenhum bem se comunica
            return false;

        case 'participacao_final':
            // CC art. 1.672: cada cônjuge administra seus bens; na dissolução divide aquestos
            if (bem.origem === 'antes_casamento') return false;
            if (bem.origem === 'doacao' || bem.origem === 'heranca') return false;
            return 'analisar'; // aquestos avaliados na dissolução

        default:
            return 'analisar';
    }
}

/** Classifica bem como 'comum' | 'particular' | 'analisar' */
export function classificarBem(
    bem: BemInventario,
    regime: RegimeBens,
): 'comum' | 'particular' | 'analisar' {
    const result = definirComunicabilidade(bem, regime);
    if (result === true) return 'comum';
    if (result === false) return 'particular';
    return 'analisar';
}

/**
 * Separa bens de um falecido em comuns e particulares conforme o regime.
 */
export function separarPatrimonio(
    bens: BemInventario[],
    regime: RegimeBens,
    falecidoId: string,
): { bensComuns: BemInventario[]; bensParticulares: BemInventario[]; bensAnalisar: BemInventario[] } {
    const bensFalecido = bens.filter(b => b.pertenceAFalecidoId === falecidoId);
    const bensComuns: BemInventario[] = [];
    const bensParticulares: BemInventario[] = [];
    const bensAnalisar: BemInventario[] = [];

    for (const b of bensFalecido) {
        const cls = classificarBem(b, regime);
        const bemComClassificacao = { ...b, classificacao: cls };
        if (cls === 'comum') bensComuns.push(bemComClassificacao);
        else if (cls === 'particular') bensParticulares.push(bemComClassificacao);
        else bensAnalisar.push(bemComClassificacao);
    }
    return { bensComuns, bensParticulares, bensAnalisar };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMORIÊNCIA  (CC art. 8º)
// ═══════════════════════════════════════════════════════════════════════════════

export function verificarComoriencia(falecidos: Falecido[]): Map<string, Falecido[]> {
    const grupos = new Map<string, Falecido[]>();
    for (const f of falecidos) {
        if (f.comorienteGrupoId) {
            if (!grupos.has(f.comorienteGrupoId)) grupos.set(f.comorienteGrupoId, []);
            grupos.get(f.comorienteGrupoId)!.push(f);
        }
    }
    for (const [k, v] of grupos) {
        if (v.length < 2) grupos.delete(k);
    }
    return grupos;
}

export function saoComorietes(a: Falecido, b: Falecido): boolean {
    if (!a.comorienteGrupoId || !b.comorienteGrupoId) return false;
    if (a.comorienteGrupoId !== b.comorienteGrupoId) return false;
    if (a.ordemObito != null && b.ordemObito != null) return false;
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTE-MOR
// ═══════════════════════════════════════════════════════════════════════════════

export function calcularMonteMor(
    bens: BemInventario[],
    dividas: Divida[],
    falecidoId: string,
    herancasRecebidas: number = 0,
): { totalBens: number; totalDividas: number; monteMor: number } {
    const totalBens = bens
        .filter(b => b.pertenceAFalecidoId === falecidoId)
        .reduce((acc, b) => acc + b.valorMercado * b.percentualPropriedade, 0)
        + herancasRecebidas;

    const totalDividas = dividas
        .filter(d => d.pertenceAFalecidoId === falecidoId)
        .reduce((acc, d) => acc + d.valor, 0);

    const monteMor = Math.max(0, totalBens - totalDividas);
    return { totalBens, totalDividas, monteMor };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEAÇÃO  (bens comuns / 2)
// ═══════════════════════════════════════════════════════════════════════════════

export function calcularMeacao(
    bensComuns: BemInventario[],
    regime: RegimeBens,
    temConjuge: boolean,
): number {
    if (!temConjuge) return 0;
    if (regime === 'separacao_total' || regime === 'separacao_obrigatoria') return 0;

    // Meação incide somente sobre bens comuns
    const totalComuns = bensComuns.reduce((acc, b) => acc + b.valorMercado * b.percentualPropriedade, 0);
    if (totalComuns === 0) return 0;
    return totalComuns / 2;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTAS JURÍDICOS AUTOMÁTICOS
// ═══════════════════════════════════════════════════════════════════════════════

export function gerarAlertasJuridicos(
    config: InventarioConfig,
    falecidoId: string,
    bensComuns: BemInventario[],
    bensParticulares: BemInventario[],
    herdeiros: Herdeiro[],
): string[] {
    const alertas: string[] = [];
    const falecido = config.falecidos.find(f => f.id === falecidoId);
    if (!falecido) return alertas;

    // Família recomposta — verificar conflito de filiação
    const filhosExclusivosPai = herdeiros.filter(h => h.tipoFilho === 'exclusivo_pai');
    const filhosExclusivosMae = herdeiros.filter(h => h.tipoFilho === 'exclusivo_mae');
    const filhosComuns = herdeiros.filter(h => h.tipoFilho === 'comum');

    if (filhosExclusivosPai.length > 0 && filhosExclusivosMae.length > 0) {
        alertas.push('⚠ Família recomposta detectada: filhos exclusivos de ambos os cônjuges. Herança deve ser individualizada por espólio.');
    }

    // Filho exclusivo não herda do padrasto/madrasta
    if ((filhosExclusivosPai.length > 0 || filhosExclusivosMae.length > 0) && config.falecidos.length > 1) {
        alertas.push('⚠ Filhos exclusivos herdam SOMENTE do genitor respectivo — não do cônjuge do genitor (CC art. 1.829).');
    }

    // Bem herdado/doado não deve compor base da meação
    const bensHerdadosNaBase = bensComuns.filter(b => b.origem === 'heranca' || b.origem === 'doacao');
    if (bensHerdadosNaBase.length > 0) {
        alertas.push('⚠ Bem recebido por herança/doação foi classificado como comum — verifique cláusulas de incomunicabilidade (CC art. 1.668, I).');
    }

    // Bem sub-rogado não se comunica (CC art. 1.659, II)
    const bensSubRogados = [...bensComuns, ...bensParticulares].filter(b => b.origem === 'sub_rogacao');
    if (bensSubRogados.length > 0) {
        alertas.push('⚠ Bem sub-rogado detectado — verificar se incide incomunicabilidade por sub-rogação (CC art. 1.659, II).');
    }

    // Empresa exige avaliação técnica
    const temEmpresa = config.bens.filter(b => b.pertenceAFalecidoId === falecidoId).some(b => b.tipo === 'empresa');
    if (temEmpresa) {
        alertas.push('ℹ Empresa/quota societária no patrimônio: exige avaliação técnica e pode requerer procedimento de apuração de haveres (Lei 6.404/76).');
    }

    // Herdeiro incapaz exige curador/MP
    const herdeiroIncapaz = herdeiros.some(h => h.incapaz);
    if (herdeiroIncapaz) {
        alertas.push('⚠ Herdeiro incapaz detectado: obrigatória intervenção do Ministério Público e nomeação de curador (CPC art. 178, II).');
    }

    // Meação calculada antes de herança — regra fundamental
    alertas.push('ℹ REGRA FUNDAMENTAL: separar meação ANTES de calcular herança. Meação não é herança (CC art. 1.784).');

    // Bem rural — pode envolver INCRA
    const temRural = config.bens.filter(b => b.pertenceAFalecidoId === falecidoId).some(b => b.tipo === 'rural');
    if (temRural) {
        alertas.push('ℹ Imóvel rural detectado: verificar obrigações com INCRA, ITR e possíveis restrições ao fracionamento (Lei 8.629/93).');
    }

    // Comoriência — sem transmissão entre comorientes
    const grupos = verificarComoriencia(config.falecidos);
    if (grupos.size > 0 && falecido.comorienteGrupoId) {
        const grupo = grupos.get(falecido.comorienteGrupoId) ?? [];
        if (grupo.length >= 2) {
            alertas.push('⚠ COMORIÊNCIA (CC art. 8º): sem transmissão de herança entre os comorientes. Partilha é feita em inventários separados.');
        }
    }

    return alertas;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOCAÇÃO HEREDITÁRIA  (CC arts. 1.829–1.844)
// ═══════════════════════════════════════════════════════════════════════════════

function resolverHerdeirosEfetivos(
    herdeiros: Herdeiro[],
    falecidoId: string,
    regime: RegimeBens,
    temConjuge: boolean,
): Herdeiro[] {
    const h = herdeiros.filter(
        hd => hd.pertenceAFalecidoId === falecidoId && !hd.premorto
    );

    // Filhos: comuns + exclusivos do falecido (excluir exclusivos do outro cônjuge)
    const filhos = h.filter(hd =>
        (hd.grau === 'filho' || hd.grau === 'filho_exclusivo') &&
        hd.tipoFilho !== 'exclusivo_mae'  // se estamos no inventário do pai
    );
    const netos = h.filter(hd => hd.grau === 'neto');
    const pais = h.filter(hd => hd.grau === 'pai' || hd.grau === 'mae');
    const conjuges = h.filter(hd => hd.grau === 'conjuge' || hd.grau === 'companheiro');
    const irmaos = h.filter(hd => hd.grau === 'irmao');
    const colaterais = h.filter(hd => hd.grau === 'outro_colateral');

    const descendentes = filhos.length > 0
        ? [...filhos]
        : netos.length > 0 ? [...netos] : [];

    const ascendentes = pais.length > 0 ? [...pais] : [];

    // Cônjuge concorre com descendentes (CC art. 1.829, I)
    const conjugeConcorreComDescendentes =
        regime !== 'comunhao_universal' &&
        regime !== 'separacao_obrigatoria';

    if (descendentes.length > 0) {
        if (conjugeConcorreComDescendentes && conjuges.length > 0) {
            return [...descendentes, ...conjuges];
        }
        return descendentes;
    }
    if (ascendentes.length > 0) {
        return conjuges.length > 0 ? [...ascendentes, ...conjuges] : ascendentes;
    }
    if (conjuges.length > 0) return conjuges;
    if (irmaos.length > 0) return irmaos;
    if (colaterais.length > 0) return colaterais;
    return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUINHÕES
// ═══════════════════════════════════════════════════════════════════════════════

export function calcularQuinhoes(
    herancaLiquida: number,
    herdeirosEfetivos: Herdeiro[],
    aliquotaITCMD: number,
): ResultadoInventario['quinhoes'] {
    if (herdeirosEfetivos.length === 0) return [];

    const quinhaoBase = herancaLiquida / herdeirosEfetivos.length;

    return herdeirosEfetivos.map(h => {
        const quinhao = h.percentualTestamento != null
            ? herancaLiquida * h.percentualTestamento
            : quinhaoBase;
        const itcmd = quinhao * aliquotaITCMD;
        return {
            herdeiroId: h.id,
            herdeiroNome: h.nome,
            grau: h.grau,
            tipoFilho: h.tipoFilho,
            quinhao: +quinhao.toFixed(2),
            percentual: +(quinhao / herancaLiquida).toFixed(4),
            itcmd: +itcmd.toFixed(2),
            itcmdAliquota: aliquotaITCMD,
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITCMD
// ═══════════════════════════════════════════════════════════════════════════════

export function getAliquotaITCMD(uf: string, override?: number): number {
    if (override != null) return override;
    return ALIQUOTAS_ITCMD[uf.toUpperCase()] ?? 0.04;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISOR JUDICIAL × EXTRAJUDICIAL  (Resolução CNJ 35/2007)
// ═══════════════════════════════════════════════════════════════════════════════

export function decidirModalidade(
    herdeiros: Herdeiro[],
    litigio: boolean,
    temTestamento: boolean,
    config: InventarioConfig,
): { modalidade: 'judicial' | 'extrajudicial'; motivos: string[] } {
    const motivos: string[] = [];

    if (litigio) motivos.push('Existência de litígio ou conflito entre herdeiros');
    if (herdeiros.some(h => h.incapaz)) motivos.push('Presença de herdeiro incapaz (art. 610 CPC)');
    if (temTestamento) motivos.push('Testamento não homologado exige via judicial');
    if (herdeiros.some(h => h.grau === 'testamentario' && !h.percentualTestamento))
        motivos.push('Herdeiro testamentário sem percentual definido');

    // Família recomposta com filhos exclusivos dos dois lados pode gerar litígio
    const filhosExclusivosPai = herdeiros.filter(h => h.tipoFilho === 'exclusivo_pai');
    const filhosExclusivosMae = herdeiros.filter(h => h.tipoFilho === 'exclusivo_mae');
    if (filhosExclusivosPai.length > 0 && filhosExclusivosMae.length > 0) {
        motivos.push('Família recomposta com filhos exclusivos de ambos os cônjuges — risco de conflito (recomendada via judicial)');
    }

    return {
        modalidade: motivos.length > 0 ? 'judicial' : 'extrajudicial',
        motivos,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLUXOGRAMA DECISÓRIO  (12 etapas)
// ═══════════════════════════════════════════════════════════════════════════════

export function gerarEtapasDecisao(
    config: InventarioConfig,
    falecidoId: string,
    modalidade: 'judicial' | 'extrajudicial',
    bensComuns: BemInventario[],
    bensParticulares: BemInventario[],
    herdeiros: Herdeiro[],
): string[] {
    const falecido = config.falecidos.find(f => f.id === falecidoId);
    if (!falecido) return [];

    const etapas: string[] = [];
    const grupos = verificarComoriencia(config.falecidos);
    const temComoriencia = grupos.size > 0 && !!falecido.comorienteGrupoId;
    const morteSucessiva = config.falecidos.some(f => (f.ordemObito ?? 0) > 0) && !temComoriencia;
    const filhosExclusivosPai = herdeiros.filter(h => h.tipoFilho === 'exclusivo_pai');
    const filhosExclusivosMae = herdeiros.filter(h => h.tipoFilho === 'exclusivo_mae');

    etapas.push(`Etapa 1 — Múltiplos óbitos: ${config.falecidos.length > 1 ? 'Sim → processar cada espólio' : 'Não → inventário individual'}`);
    etapas.push(`Etapa 2 — Comoriência: ${temComoriencia ? 'Sim → sem transmissão entre comorientes (CC art. 8º)' : 'Não detectada'}`);
    etapas.push(`Etapa 3 — Morte sucessiva: ${morteSucessiva ? 'Sim → herança integra próximo inventário' : 'Não aplicável'}`);
    etapas.push(`Etapa 4 — Regime de bens: ${falecido.regimeBens.replace(/_/g, ' ').toUpperCase()}`);
    etapas.push(`Etapa 5 — Bens comunicáveis: ${bensComuns.length} comuns / ${bensParticulares.length} particulares`);
    etapas.push(`Etapa 6 — Meação: calculada sobre bens comuns antes da herança`);

    const filhosStr = herdeiros.filter(h => h.grau === 'filho' || h.grau === 'filho_exclusivo').map(h => h.nome).join(', ') || 'Nenhum';
    etapas.push(`Etapa 7 — Herdeiros apurados: ${filhosStr}`);

    if (filhosExclusivosPai.length + filhosExclusivosMae.length > 0) {
        etapas.push(`Etapa 8 — Filiação (família recomposta): ${filhosExclusivosPai.length} exclusivos do pai / ${filhosExclusivosMae.length} exclusivos da mãe / ${herdeiros.filter(h => h.tipoFilho === 'comum').length} comuns`);
    } else {
        etapas.push(`Etapa 8 — Filiação: não aplicável (não há família recomposta)`);
    }

    const conjugeConcorre = (falecido.regimeBens !== 'comunhao_universal' && falecido.regimeBens !== 'separacao_obrigatoria');
    etapas.push(`Etapa 9 — Concorrência cônjuge: ${conjugeConcorre ? 'Sim (CC art. 1.829, I)' : 'Não neste regime'}`);
    etapas.push(`Etapa 10 — Distribuição herança líquida em quinhões proporcionais`);
    etapas.push(`Etapa 11 — Validações: filhos exclusivos bloqueados de herdar do padrasto/madrasta`);
    etapas.push(`Etapa 12 — Modalidade definida: ${modalidade === 'extrajudicial' ? '✔ Extrajudicial — Cartório' : '⚖ Judicial — Obrigatório'}`);

    return etapas;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATRIZ DE COMPLEXIDADE
// ═══════════════════════════════════════════════════════════════════════════════

export function calcularMatrizComplexidade(config: InventarioConfig): {
    score: number;
    classificacao: ResultadoInventario['classificacaoComplexidade'];
    tempoEstimado: { min: number; max: number };
} {
    let score = 0;
    const grupos = verificarComoriencia(config.falecidos);

    if (grupos.size > 0) score += 30;

    const temMorteSucessiva = config.falecidos.some(f => (f.herdouDeIds?.length ?? 0) > 0)
        || config.falecidos.some(f => (f.ordemObito ?? 0) > 0);
    if (temMorteSucessiva) score += 25;

    const temEmpresa = config.bens.some(b => b.tipo === 'empresa');
    if (temEmpresa) score += 20;

    const temIncapaz = config.herdeiros.some(h => h.incapaz);
    if (temIncapaz) score += 15;

    if (config.litiogio) score += 20;

    // Família recomposta com filhos exclusivos dos dois lados
    const temFilhosExclusivosPai = config.herdeiros.some(h => h.tipoFilho === 'exclusivo_pai');
    const temFilhosExclusivosMae = config.herdeiros.some(h => h.tipoFilho === 'exclusivo_mae');
    if (temFilhosExclusivosPai && temFilhosExclusivosMae) score += 20;
    else if (temFilhosExclusivosPai || temFilhosExclusivosMae) score += 10;

    if (config.bens.length > 10) score += 10;

    const temTestamento = config.falecidos.some(f => f.temTestamento);
    if (temTestamento) score += 10;

    const temBensAnalisar = config.bens.some(b => b.origem === 'sub_rogacao' || b.possuiClausulaIncomunicabilidade);
    if (temBensAnalisar) score += 5;

    let classificacao: ResultadoInventario['classificacaoComplexidade'];
    let tempoEstimado: { min: number; max: number };

    if (score <= 30) {
        classificacao = 'Simples';
        tempoEstimado = { min: 1, max: 4 };
    } else if (score <= 60) {
        classificacao = 'Moderado';
        tempoEstimado = { min: 4, max: 12 };
    } else if (score <= 90) {
        classificacao = 'Complexo';
        tempoEstimado = { min: 12, max: 36 };
    } else {
        classificacao = 'Alta complexidade sucessória';
        tempoEstimado = { min: 24, max: 60 };
    }

    return { score, classificacao, tempoEstimado };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULADORA DE HONORÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula honorários advocatícios considerando complexidade e modalidade.
 * Baseado em parâmetros referenciais OAB e práticas de mercado.
 */
export function calcularHonorarios(
    monteMor: number,
    modalidade: 'extrajudicial' | 'judicial',
    score: number,
    numHerdeiros: number,
    config: InventarioConfig,
): HonorariosResult {
    // Percentual base por modalidade
    const percBase = modalidade === 'extrajudicial' ? 0.05 : 0.07;

    // Ajuste de complexidade
    let ajuste = 0;
    if (score <= 20) ajuste = 0;
    else if (score <= 40) ajuste = 0.01;
    else if (score <= 60) ajuste = 0.02;
    else if (score <= 90) ajuste = 0.04;
    else ajuste = 0.06;

    // Ajuste por número de herdeiros
    if (numHerdeiros > 10) ajuste += 0.01;

    const percAplicado = percBase + ajuste;

    const valorHonorarios = monteMor * percAplicado;
    const valorMinimo = monteMor * percBase * 0.80;  // piso negociado (−20%)
    const valorMaximo = monteMor * (percAplicado + 0.02); // teto

    // Risco operacional
    let nivelRisco: HonorariosResult['nivelRisco'];
    if (score <= 30) nivelRisco = 'Baixo';
    else if (score <= 60) nivelRisco = 'Médio';
    else if (score <= 90) nivelRisco = 'Alto';
    else nivelRisco = 'Muito Alto';

    // Estimativa de horas técnicas
    const horasBase = modalidade === 'extrajudicial' ? 20 : 40;
    const horasMin = horasBase + Math.floor(score / 10) * 4;
    const horasMax = horasBase + Math.ceil(score / 10) * 8;

    // Recomendação estratégica
    let recomendacao: string;
    if (score > 90) {
        recomendacao = 'Caso de alta complexidade — recomendável cláusula de êxito (20–30% sobre diferença obtida) e honorários mínimos garantidos.';
    } else if (score > 60) {
        recomendacao = 'Complexidade elevada — considere honorários com entrada de 30% + saldo na partilha ou cláusula de êxito.';
    } else if (score > 30) {
        recomendacao = 'Complexidade moderada — percentual fixo sobre monte-mor é adequado. Detalhe cláusulas de reajuste em caso de litígio superveniente.';
    } else {
        recomendacao = 'Caso simples — percentual fixo sobre monte-mor é suficiente. Considere valor mínimo de R$ 5.000 para viabilidade financeira.';
    }

    // Modelos de cobrança
    const percExito = modalidade === 'judicial' ? 0.20 : 0.15;
    const percEntrada = percAplicado * 0.30;

    return {
        monteMorBase: +monteMor.toFixed(2),
        modalidade,
        scoreComplexidade: score,
        percentualBase: percBase,
        percentualAplicado: percAplicado,
        valorHonorarios: +valorHonorarios.toFixed(2),
        valorMinimo: +Math.max(valorMinimo, 5000).toFixed(2),
        valorMaximo: +valorMaximo.toFixed(2),
        nivelRisco,
        recomendacaoEstrategica: recomendacao,
        horasEstimadas: { min: horasMin, max: horasMax },
        modelosCobranca: {
            percentualPuro: +valorHonorarios.toFixed(2),
            percentualMaisExito: {
                entrada: +(monteMor * percEntrada).toFixed(2),
                exito: +(valorHonorarios * percExito).toFixed(2),
            },
            fixoMinimo: +Math.max(valorMinimo, 5000).toFixed(2),
        },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE PARTILHA
// ═══════════════════════════════════════════════════════════════════════════════

export function simularPartilha(
    quinhoes: ResultadoInventario['quinhoes'],
    bens: BemInventario[],
    falecidoId: string,
    partilhaPersonalizada?: { herdeiroId: string; bemId: string }[],
): PartilhaItem[] {
    const resultado: PartilhaItem[] = [];

    if (!partilhaPersonalizada || partilhaPersonalizada.length === 0) {
        for (const q of quinhoes) {
            resultado.push({
                herdeiroId: q.herdeiroId,
                herdeiroNome: q.herdeiroNome,
                descricao: `Quinhão equivalente (${fmtPct(q.percentual, 1)})`,
                valor: q.quinhao,
                compensacaoDevida: 0,
                itcmd: q.itcmd,
            });
        }
        return resultado;
    }

    const bensFalecido = bens.filter(b => b.pertenceAFalecidoId === falecidoId);
    const quinhaoBase = quinhoes[0]?.quinhao ?? 0;

    for (const q of quinhoes) {
        const bemAtribuido = partilhaPersonalizada.find(p => p.herdeiroId === q.herdeiroId);
        const bem = bemAtribuido ? bensFalecido.find(b => b.id === bemAtribuido.bemId) : undefined;

        if (bem) {
            const valorBem = bem.valorMercado * bem.percentualPropriedade;
            const diferenca = valorBem - quinhaoBase;
            resultado.push({
                herdeiroId: q.herdeiroId,
                herdeiroNome: q.herdeiroNome,
                bemId: bem.id,
                descricao: `${bem.tipo.toUpperCase()}: ${bem.descricao}`,
                valor: valorBem,
                compensacaoDevida: diferenca > 0 ? -diferenca : Math.abs(diferenca),
                itcmd: q.itcmd,
            });
        } else {
            resultado.push({
                herdeiroId: q.herdeiroId,
                herdeiroNome: q.herdeiroNome,
                descricao: `Quinhão em dinheiro / reserva`,
                valor: q.quinhao,
                compensacaoDevida: 0,
                itcmd: q.itcmd,
            });
        }
    }

    return resultado;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORQUESTRADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function calcularInventario(config: InventarioConfig): ResultadoInventario[] {
    const resultados: ResultadoInventario[] = [];

    const falecidosOrdenados = [...config.falecidos].sort((a, b) => {
        const oa = a.ordemObito ?? 999;
        const ob = b.ordemObito ?? 999;
        return oa - ob;
    });

    const herancasRecebidas = new Map<string, number>();

    for (const falecido of falecidosOrdenados) {
        const memoria: string[] = [];

        // ── Comoriência ──────────────────────────────────────────────────────
        const gruposComoriencia = verificarComoriencia(config.falecidos);
        const temComoriencia = gruposComoriencia.size > 0;
        const grupoId = falecido.comorienteGrupoId ?? '';

        memoria.push(`── INVENTÁRIO: ${falecido.nome} ──`);
        if (temComoriencia && grupoId) {
            const grupo = gruposComoriencia.get(grupoId) ?? [];
            const nomes = grupo.map(g => g.nome).filter(n => n !== falecido.nome).join(', ');
            memoria.push(`⚠ Comoriência com: ${nomes} (CC art. 8º — sem transmissão)`);
        }

        // ── Separação Patrimônio ─────────────────────────────────────────────
        const { bensComuns, bensParticulares, bensAnalisar } = separarPatrimonio(
            config.bens, falecido.regimeBens, falecido.id,
        );
        memoria.push(`── PATRIMÔNIO ──`);
        memoria.push(`Bens comuns (comunicáveis): ${bensComuns.length} bens`);
        memoria.push(`Bens particulares: ${bensParticulares.length} bens`);
        if (bensAnalisar.length > 0) {
            memoria.push(`⚠ Bens a analisar (comunicabilidade incerta): ${bensAnalisar.length} bens`);
        }

        // ── Monte-mor ────────────────────────────────────────────────────────
        const herancaRecebida = herancasRecebidas.get(falecido.id) ?? 0;
        if (herancaRecebida > 0) {
            memoria.push(`Herança recebida de cadeia anterior: ${fmtBRL(herancaRecebida)}`);
        }

        const { totalBens, totalDividas, monteMor } = calcularMonteMor(
            config.bens, config.dividas, falecido.id, herancaRecebida,
        );

        memoria.push(`── MONTE-MOR ──`);
        memoria.push(`Total de bens (valor de mercado × % propriedade): ${fmtBRL(totalBens)}`);
        memoria.push(`Total de dívidas: ${fmtBRL(totalDividas)}`);
        memoria.push(`Monte-mor líquido: ${fmtBRL(monteMor)}`);

        // ── Meação ───────────────────────────────────────────────────────────
        const herdeirosFalecido = config.herdeiros.filter(h => h.pertenceAFalecidoId === falecido.id);
        const temConjuge = herdeirosFalecido.some(h => h.grau === 'conjuge' || h.grau === 'companheiro');
        const meacao = calcularMeacao(bensComuns, falecido.regimeBens, temConjuge);
        const herancaLiquida = monteMor - meacao;

        memoria.push(`── MEAÇÃO ──`);
        if (meacao > 0) {
            const totalBensComuns = bensComuns.reduce((acc, b) => acc + b.valorMercado * b.percentualPropriedade, 0);
            memoria.push(`Total de bens comuns (base da meação): ${fmtBRL(totalBensComuns)}`);
            memoria.push(`Meação do cônjuge sobrevivente (50% dos bens comuns): ${fmtBRL(meacao)}`);
        } else {
            memoria.push(`Sem meação (regime: ${falecido.regimeBens} / cônjuge: ${temConjuge ? 'sim' : 'não'})`);
        }
        memoria.push(`Herança líquida para partilha: ${fmtBRL(herancaLiquida)}`);

        // ── Herdeiros efetivos ───────────────────────────────────────────────
        const herdeirosEfetivos = resolverHerdeirosEfetivos(
            herdeirosFalecido, falecido.id, falecido.regimeBens, temConjuge,
        );

        // Bloquear comorientes (CC art. 8º)
        const herdeirosValidos = herdeirosEfetivos.filter(h => {
            const herdeiroDado = config.falecidos.find(f => f.id === h.id);
            if (!herdeiroDado) return true;
            return !saoComorietes(falecido, herdeiroDado);
        });

        memoria.push(`── HERDEIROS ──`);
        memoria.push(`Herdeiros efetivos: ${herdeirosValidos.map(h => h.nome).join(', ') || 'Nenhum (herança jacente)'}`);

        // Família recomposta — log de filiação
        const filhosExclusivosPai = herdeirosValidos.filter(h => h.tipoFilho === 'exclusivo_pai');
        const filhosExclusivosMae = herdeirosValidos.filter(h => h.tipoFilho === 'exclusivo_mae');
        const filhosComuns = herdeirosValidos.filter(h => h.tipoFilho === 'comum');

        if (filhosExclusivosPai.length + filhosExclusivosMae.length > 0) {
            memoria.push(`Família recomposta: ${filhosComuns.length} filhos comuns, ${filhosExclusivosPai.length} exclusivos do pai, ${filhosExclusivosMae.length} exclusivos da mãe`);
        }

        // ── ITCMD ────────────────────────────────────────────────────────────
        const aliquota = getAliquotaITCMD(falecido.uf, config.aliquotaITCMDOverride);
        memoria.push(`Alíquota ITCMD (${falecido.uf}): ${fmtPct(aliquota)}`);

        // ── Quinhões ─────────────────────────────────────────────────────────
        const quinhoes = calcularQuinhoes(herancaLiquida, herdeirosValidos, aliquota);
        const itcmdTotal = quinhoes.reduce((a, q) => a + q.itcmd, 0);

        // ── Morte sucessiva: propagar herança ─────────────────────────────────
        for (const q of quinhoes) {
            const herdeiroComoFalecido = config.falecidos.find(f => f.id === q.herdeiroId);
            if (herdeiroComoFalecido) {
                const acumulado = herancasRecebidas.get(herdeiroComoFalecido.id) ?? 0;
                herancasRecebidas.set(herdeiroComoFalecido.id, acumulado + q.quinhao);
                memoria.push(`↪ Morte sucessiva: quinhão de ${q.herdeiroNome} (${fmtBRL(q.quinhao)}) integra inventário seguinte`);
            }
        }

        // ── Modalidade ───────────────────────────────────────────────────────
        const { modalidade, motivos } = decidirModalidade(
            herdeirosFalecido, config.litiogio, falecido.temTestamento, config,
        );

        // ── Complexidade ─────────────────────────────────────────────────────
        const { score, classificacao, tempoEstimado } = calcularMatrizComplexidade(config);

        // ── Alertas jurídicos ────────────────────────────────────────────────
        const alertas = gerarAlertasJuridicos(
            config, falecido.id, bensComuns, bensParticulares, herdeirosFalecido,
        );

        // ── Fluxograma decisório ─────────────────────────────────────────────
        const etapasDecisao = gerarEtapasDecisao(
            config, falecido.id, modalidade, bensComuns, bensParticulares, herdeirosFalecido,
        );

        // ── Honorários ───────────────────────────────────────────────────────
        const honorarios = calcularHonorarios(
            monteMor, modalidade, score, herdeirosValidos.length, config,
        );

        memoria.push(`── HONORÁRIOS ESTIMADOS (${fmtPct(honorarios.percentualAplicado)}) ──`);
        memoria.push(`Valor estimado: ${fmtBRL(honorarios.valorHonorarios)}`);
        memoria.push(`Faixa: ${fmtBRL(honorarios.valorMinimo)} – ${fmtBRL(honorarios.valorMaximo)}`);

        // ── Partilha ─────────────────────────────────────────────────────────
        const partilhaSugerida = simularPartilha(
            quinhoes, config.bens, falecido.id, config.partilhaPersonalizada,
        );

        const saldoRestante = partilhaSugerida.reduce((acc, p) => acc + p.compensacaoDevida, 0);

        resultados.push({
            falecidoId: falecido.id,
            falecidoNome: falecido.nome,
            bensComuns,
            bensParticulares,
            totalBensBruto: +totalBens.toFixed(2),
            totalDividas: +totalDividas.toFixed(2),
            monteMor: +monteMor.toFixed(2),
            meacao: +meacao.toFixed(2),
            herancaLiquida: +herancaLiquida.toFixed(2),
            herdeirosTotais: herdeirosValidos.length,
            quinhoes,
            itcmdTotal: +itcmdTotal.toFixed(2),
            partilhaSugerida,
            saldoRestante: +saldoRestante.toFixed(2),
            modalidade,
            motivoJudicial: motivos,
            alertasJuridicos: alertas,
            etapasDecisao,
            scoreComplexidade: score,
            classificacaoComplexidade: classificacao,
            tempoEstimadoMeses: tempoEstimado,
            comoriencia: temComoriencia,
            comorientesGrupo: grupoId || undefined,
            honorarios,
            memoriaCalculo: memoria,
        });
    }

    return resultados;
}
