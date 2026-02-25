"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { useTransition } from "react";

export function LogoutButton() {
    const [isPending, startTransition] = useTransition();

    return (
        <button
            onClick={() => startTransition(() => logout())}
            disabled={isPending}
            className={`flex w-full items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white ${isPending ? "opacity-50 cursor-not-allowed" : ""
                }`}
        >
            <LogOut className="h-4 w-4" />
            {isPending ? "Saindo..." : "Sair"}
        </button>
    );
}
