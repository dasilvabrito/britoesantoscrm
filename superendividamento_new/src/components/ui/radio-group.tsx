"use client"

import * as React from "react"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
} | null>(null)

const RadioGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        value?: string
        defaultValue?: string
        onValueChange?: (value: string) => void
    }
>(({ className, value: controlledValue, defaultValue, onValueChange, ...props }, ref) => {
    const [value, setValue] = React.useState(defaultValue || controlledValue)

    const handleValueChange = React.useCallback(
        (newValue: string) => {
            setValue(newValue)
            onValueChange?.(newValue)
        },
        [onValueChange]
    )


    return (
        <RadioGroupContext.Provider value={{ value: controlledValue ?? value, onValueChange: handleValueChange }}>
            <div className={cn("grid gap-2", className)} ref={ref} {...props} />
        </RadioGroupContext.Provider>
    )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        value: string
    }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)
    const isChecked = context?.value === value

    return (
        <button
            type="button"
            role="radio"
            aria-checked={isChecked}
            data-state={isChecked ? "checked" : "unchecked"}
            onClick={() => context?.onValueChange?.(value)}
            ref={ref}
            className={cn(
                "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                isChecked ? "bg-slate-900 border-slate-900" : "border-slate-400 bg-transparent",
                className
            )}
            {...props}
        >
            <span className="flex items-center justify-center">
                {isChecked && <Circle className="h-2.5 w-2.5 fill-current text-white" />}
            </span>
        </button>
    )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
