import React, { useEffect, useState } from 'react';
import {
    DndContext,
    closestCorners,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import axios from 'axios';
import { Column } from './Column';
import { DealCard } from './DealCard';
import { Plus, User, Search, Settings, Scale } from 'lucide-react';
import { NewDealModal } from './NewDealModal';
import { EditDealModal } from './EditDealModal';

import { ClientsView } from './ClientsView';
import { SettingsView } from './SettingsView';
import { PendingSignaturesView } from './PendingSignaturesView';

import { DashboardView } from './DashboardView';

export default function PipelineBoard({ user, onLogout }) {
    const [stages, setStages] = useState([]);
    const [deals, setDeals] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDeal, setEditingDeal] = useState(null);
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'pipeline', 'clients', 'signatures', 'settings'

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    useEffect(() => {
        if (currentView === 'pipeline') {
            fetchData();
        }
    }, [currentView]);

    const fetchData = async () => {
        try {
            const [stagesRes, dealsRes] = await Promise.all([
                axios.get('/api/stages'),
                axios.get('/api/deals', {
                    params: {
                        user_id: user.id,
                        user_role: user.role
                    }
                })
            ]);
            console.log("Stages loaded:", stagesRes.data.data);
            console.log("Deals loaded:", dealsRes.data.data);
            setStages(stagesRes.data.data || []);
            setDeals(dealsRes.data.data || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
            setStages([]);
            setDeals([]);
        }
    };

    const onDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const onDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeDeal = deals.find(d => d.id === active.id);
        const overId = over.id;

        // Determine if dropped on a column or another deal
        let newStageId;
        const isOverColumn = stages.find(s => s.id === overId);

        if (isOverColumn) {
            newStageId = overId;
        } else {
            // Dropped over another deal, find that deal's stage
            const overDeal = deals.find(d => d.id === overId);
            newStageId = overDeal ? overDeal.stage_id : activeDeal.stage_id;
        }

        if (activeDeal.stage_id !== newStageId) {
            // Optimistic update
            setDeals((prev) =>
                prev.map(d =>
                    d.id === activeDeal.id ? { ...d, stage_id: newStageId } : d
                )
            );

            // API Call
            try {
                await axios.patch(`/api/deals/${activeDeal.id}`, { stage_id: newStageId });
            } catch (error) {
                console.error("Failed to update deal stage", error);
                // Revert on failure (optional, but good practice)
                fetchData();
            }
        }
    };

    const handleDealCreated = (newDeal) => {
        setDeals(prev => [newDeal, ...prev]);
    };

    const activeDeal = activeId ? deals.find(d => d.id === activeId) : null;

    return (
        <div className="flex h-screen flex-col bg-background">
            {/* Header */}
            <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-2.5 rounded-lg shadow-lg shadow-amber-500/20">
                            <Scale className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-serif font-bold text-foreground tracking-tight leading-none">
                                Brito <span className="text-amber-600">&</span> Santos
                            </h1>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-sans font-semibold tracking-widest uppercase text-muted-foreground">Advocacia</span>
                                <span className="text-xs text-muted-foreground font-medium mt-0.5 whitespace-nowrap">
                                    {(() => {
                                        const hour = new Date().getHours();
                                        const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
                                        return `${greeting}, ${user.name.split(' ')[0]}`;
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <nav className="ml-8 hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                        <button onClick={() => setCurrentView('dashboard')} className={currentView === 'dashboard' ? "text-foreground" : "hover:text-foreground"}>Visão Geral</button>
                        <button onClick={() => setCurrentView('pipeline')} className={currentView === 'pipeline' ? "text-foreground" : "hover:text-foreground"}>Processos</button>
                        <button onClick={() => setCurrentView('clients')} className={currentView === 'clients' ? "text-foreground" : "hover:text-foreground"}>Clientes</button>
                        <button onClick={() => setCurrentView('signatures')} className={currentView === 'signatures' ? "text-foreground" : "hover:text-foreground"}>Assinaturas Pendentes</button>
                    </nav>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="h-9 w-64 rounded-full bg-muted/50 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setCurrentView('settings')}
                        className={`h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors ${currentView === 'settings' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                    >
                        <Settings size={18} />
                    </button>
                    <button className="h-9 w-9 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title={`Usuário: ${user.name}`}>
                        <User size={18} />
                    </button>
                    <button
                        onClick={onLogout}
                        className="ml-2 px-3 py-1.5 rounded-md bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition-colors"
                        title="Sair do Sistema"
                    >
                        SAIR
                    </button>
                </div>
            </header>

            {/* Main Content */}
            {currentView === 'dashboard' ? (
                <DashboardView />
            ) : currentView === 'pipeline' ? (
                <main className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Pipeline de Processos</h2>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 flex items-center gap-2 font-medium shadow-lg shadow-primary/20 transition-all hover:scale-105"
                        >
                            <Plus size={18} />
                            Novo Processo
                        </button>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                    >
                        <div className="flex h-[calc(100%-4rem)] pb-4">
                            {(stages || []).map((stage) => (
                                <Column
                                    key={stage.id}
                                    stage={stage}
                                    deals={deals.filter(d => d.stage_id === stage.id)}
                                    onDealClick={(deal) => setEditingDeal(deal)}
                                />
                            ))}
                        </div>
                        <DragOverlay>
                            {activeDeal ? <DealCard deal={activeDeal} /> : null}
                        </DragOverlay>
                    </DndContext>
                    <NewDealModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        stages={stages}
                        onDealCreated={handleDealCreated}
                        currentUser={user}
                    />
                    {editingDeal && (
                        <EditDealModal
                            isOpen={!!editingDeal}
                            onClose={() => { setEditingDeal(null); fetchData(); }}
                            deal={editingDeal}
                            currentUser={user}
                            onUpdate={() => { setEditingDeal(null); fetchData(); }}
                        />
                    )}
                </main>
            ) : currentView === 'clients' ? (
                <ClientsView />
            ) : currentView === 'signatures' ? (
                <PendingSignaturesView />
            ) : (
                <SettingsView />
            )}
        </div>
    );
}
