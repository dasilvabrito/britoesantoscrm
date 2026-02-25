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

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

function getYears(back = 5, forward = 1) {
    const y = new Date().getFullYear();
    return Array.from({ length: back + forward + 1 }, (_, i) => y - back + i);
}

interface DatePickerProps {
    name: string;
    value: string; // "YYYY-MM-DD"
    onChange: (val: string) => void;
    className?: string;
}

export function DatePicker({ name, value, onChange, className }: DatePickerProps) {
    const [year, month, day] = value ? value.split('-') : ['', '', ''];

    const daysInMonth = year && month
        ? getDaysInMonth(Number(year), Number(month))
        : 31;

    const days = Array.from({ length: daysInMonth }, (_, i) =>
        String(i + 1).padStart(2, '0')
    );

    const handle = (part: 'year' | 'month' | 'day', val: string) => {
        const y = part === 'year' ? val : (year || String(new Date().getFullYear()));
        const m = part === 'month' ? val : (month || '01');
        let d = part === 'day' ? val : (day || '01');

        // clamp day if month changed
        const maxDay = getDaysInMonth(Number(y), Number(m));
        if (Number(d) > maxDay) d = String(maxDay).padStart(2, '0');

        onChange(`${y}-${m}-${d}`);
    };

    return (
        <div className={`flex gap-1.5 ${className ?? ''}`}>
            <input type="hidden" name={name} value={value} />

            <Select value={day} onValueChange={v => handle('day', v)}>
                <SelectTrigger className="h-9 w-[68px] text-sm font-medium bg-white">
                    <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                    {days.map(d => (
                        <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

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
                        <SelectItem key={y} value={String(y)} className="text-sm">{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
