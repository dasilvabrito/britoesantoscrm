"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
    const password = formData.get("password");

    if (password === "@Willian10") {
        const cookieStore = await cookies();
        cookieStore.set("auth_token", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
        });
        redirect("/");
    } else {
        // In a real app we might want to return an error, but for simplicity we'll just reload
        // or you could redirect back to login with an error param
        redirect("/login?error=true");
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    redirect("/login");
}

