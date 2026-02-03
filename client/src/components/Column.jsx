import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DealCard } from './DealCard';

export function Column({ stage, deals = [], onDealClick }) {
    const { setNodeRef } = useDroppable({
        id: stage.id,
    });

    return (
        <div className="flex-shrink-0 w-80 flex flex-col h-full bg-muted/40 rounded-xl border border-border/50 ml-4 first:ml-0">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/20 rounded-t-xl">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {stage.name}
                    <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{deals.length}</span>
                </h3>
            </div>

            <div ref={setNodeRef} className="flex-1 p-2 overflow-y-auto custom-scrollbar">
                <SortableContext
                    items={deals.map(d => d.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {deals.map((deal) => (
                        <DealCard key={deal.id} deal={deal} onClick={() => onDealClick && onDealClick(deal)} />
                    ))}
                </SortableContext>
                {deals.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                        Arraste itens aqui
                    </div>
                )}
            </div>
        </div>
    );
}
