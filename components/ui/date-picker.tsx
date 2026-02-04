"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    placeholder?: string
    className?: string
}

export function DatePicker({ date, setDate, placeholder = "Chọn ngày", className }: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"ghost"}
                    className={cn(
                        "w-full bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 rounded-2xl px-5 py-4 text-white font-bold transition-all justify-between h-auto",
                        !date && "text-slate-500",
                        className
                    )}
                >
                    <span>{date ? format(date, "dd/MM/yyyy") : placeholder}</span>
                    <CalendarIcon className="size-5 text-slate-500 group-hover:text-primary transition-colors" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 shadow-2xl rounded-2xl z-[200]" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="bg-slate-900 text-white rounded-2xl"
                    classNames={{
                        day_selected: "bg-primary text-black font-black hover:bg-primary hover:text-black focus:bg-primary focus:text-black",
                        day_today: "bg-white/10 text-primary font-bold",
                        day_outside: "text-slate-600 opacity-50",
                        day_disabled: "text-slate-800",
                        head_cell: "text-slate-500 font-bold uppercase text-[10px] tracking-widest",
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
