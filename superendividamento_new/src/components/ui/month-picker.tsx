'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS = [
    { value: '01', label: 'Jan' }, { value: '02', label: 'Fev' },
    { value: '03', label: 'Mar' }, { value: '04', label: 'Abr' },
    { value: '05', label: 'Mai' }, { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' }, { value: '08', label: 'Ago' },
    { value: '09', label: 'Set' }, { value: '10', label: 'Out' },
    { value: '11', label: 'Nov' }, { value: '12', label: 'Dez' },
];

function getYears(back = 10, forward = 2) {
    const y = new Date().getFullYear();
    return Array.from({ length: back + forward + 1 }, (_, i) => y - back + i);
}

interface MonthPickerProps {
    name: string;
    value: string; // "YYYY-MM"
    onChange: (val: string) => void;
    className?: string;
}

export function MonthPicker({ name, value, onChange, className }: MonthPickerProps) {
    const [year, month] = value ? value.split('-') : ['', ''];

    const handle = (part: 'year' | 'month', val: string) => {
        const y = part === 'year' ? val : (year || String(new Date().getFullYear()));
        const m = part === 'month' ? val : (month || '01');
        onChange(`${y}-${m}`);
    };

    return (
        <div className={`flex gap-1.5 ${className}`}>
            {/* Hidden real input for form submission */}
            <input type="hidden" name={name} value={value} />

            <Select value={month} onValueChange={v => handle('month', v)}>
                <SelectTrigger className="h-9 flex-1 text-sm font-medium bg-white">
                    <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                    {MONTHS.map(m => (
                        <SelectItem key={m.value} value={m.value} className="text-sm">
                            {m.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={year} onValueChange={v => handle('year', v)}>
                <SelectTrigger className="h-9 w-[90px] text-sm font-medium bg-white">
                    <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                    {getYears().map(y => (
                        <SelectItem key={y} value={String(y)} className="text-sm">
                            {y}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
