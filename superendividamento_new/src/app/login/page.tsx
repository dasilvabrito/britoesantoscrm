"use client";

import { login } from "./actions";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import Image from "next/image";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className={`relative flex w-full justify-center rounded-md bg-[#c09d5e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#a0834c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c09d5e] ${pending ? "opacity-70 cursor-not-allowed" : ""
                }`}
        >
            {pending ? "Entrando..." : "Entrar"}
        </button>
    );
}

export default function LoginPage() {
    return (
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-zinc-900 h-screen">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="rounded-full bg-white/5 p-4 ring-1 ring-white/10">
                            <Lock className="h-10 w-10 text-[#c09d5e]" />
                        </div>
                    </div>
                </div>
                <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-white">
                    Acesso Restrito
                </h2>
                <p className="mt-2 text-center text-sm text-gray-400">
                    Esta aplicação é de uso exclusivo interno.
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form action={login} className="space-y-6">
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium leading-6 text-white"
                        >
                            Senha de Acesso
                        </label>
                        <div className="mt-2">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-[#c09d5e] sm:text-sm sm:leading-6 pl-3"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <SubmitButton />
                    </div>
                </form>
            </div>
        </div>
    );
}
