import { NextResponse } from "next/server";
import { requireRole } from "@/firebase/permissions";
import { getServerAdmin } from "@/firebase/serverAdmin";

export const runtime = "nodejs";

function reply(eligible: boolean, message: string, status = 200) {
    return NextResponse.json({ eligible, message }, {
        status,
        headers: { "Cache-Control": "private, no-store" }
    });
}

export async function POST(request: Request) {
    const permission = await requireRole(request, ["super_admin"]);
    if (!permission.allowed) return permission.response;

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (email.length > 254 || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) {
        return reply(false, "Enter a valid email.", 400);
    }

    try {
        const { auth, db } = getServerAdmin();
        const account = await auth.getUserByEmail(email);

        if (account.disabled || !account.emailVerified) {
            return reply(false, "Account must be verified and enabled.");
        }

        // Check existing grants by email and account ID.
        const record = await db.collection("user_roles").doc(email).get();
        const grants = await db.collection("user_roles")
            .where("uid", "==", account.uid).limit(1).get();

        if (record.exists || !grants.empty) {
            return reply(false, "This account already has a role.");
        }

        return reply(true, "Account can be added as an admin.");
    } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
            if (error.code === "auth/user-not-found") {
                return reply(false, "Account not found.");
            }
            if (error.code === "auth/invalid-email") {
                return reply(false, "Enter a valid email.", 400);
            }
        }

        return reply(false, "Unable to check account.", 503);
    }
}