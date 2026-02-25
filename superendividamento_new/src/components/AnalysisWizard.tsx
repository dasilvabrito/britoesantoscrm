'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import DiagnosisStep from './steps/DiagnosisStep';
import DebtStep from './steps/DebtStep';
import SimulationStep from './steps/SimulationStep';

type Props = {
    cliente: any; // Type accurately if possible
};

export default function AnalysisWizard({ cliente }: Props) {
    const [step, setStep] = useState(1);

    const steps = [
        { id: 1, title: 'Diagnóstico Financeiro', component: DiagnosisStep },
        { id: 2, title: 'Gestão de Dívidas', component: DebtStep },
        { id: 3, title: 'Simulação Judicial', component: SimulationStep },
    ];

    const progress = (step / steps.length) * 100;
    const CurrentComponent = steps[step - 1].component;

    return (
        <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-slate-500">
                    <span>Etapa {step} de {steps.length}: {steps[step - 1].title}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Step Content */}
            <Card className="min-h-[500px] border-t-4 border-t-amber-500">
                <CardContent className="p-6">
                    <CurrentComponent
                        cliente={cliente}
                        onNext={() => setStep(s => Math.min(s + 1, 3))}
                        onBack={() => setStep(s => Math.max(s - 1, 1))}
                    />
                </CardContent>
            </Card>

            {/* Navigation Buttons are handled inside steps or here if global */}
        </div>
    );
}
