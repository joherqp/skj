import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || (!session.user.roles.includes("admin") && !session.user.roles.includes("owner"))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { userId, newPassword } = await req.json();

        if (!userId || !newPassword) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Use Better Auth Admin API to set password
        await auth.api.setUserPassword({
            headers: await headers(),
            body: {
                userId,
                newPassword
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error resetting password:", error);
        return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 500 });
    }
}
