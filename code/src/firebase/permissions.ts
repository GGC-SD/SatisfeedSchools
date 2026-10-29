import "server-only";
import { NextResponse } from "next/server";
import { getServerAdmin } from "./serverAdmin";
import { getRoleFromRecord } from "./roles";

type AdminRole = "admin" | "super_admin";

// Return a safe error and prevent caching.
function deny(message: string, status: number) {
    return {
        allowed: false as const,
        response: NextResponse.json({ message }, {
            status,
            headers: { "Cache-Control": "private, no-store" }
        })
    };
}

export async function requireRole(request: Request, allowedRoles: AdminRole[]) {
    // Get the login token sent by the browser.
    const header = request.headers.get("authorization");

    if (!header?.toLowerCase().startsWith("bearer ")) {
        return deny("Please sign in.", 401);
    }

    const token = header.slice(7).trim();
    if (!token) return deny("Please sign in.", 401);

    try {
        const { auth, db } = getServerAdmin();

        // Check the token and whether the session was revoked.
        const login = await auth.verifyIdToken(token, true);
        const account = await auth.getUser(login.uid);

        // Only allow verified, enabled accounts.
        if (account.disabled || !account.emailVerified || !login.email_verified) {
            return deny("A verified, enabled account is required.", 403);
        }

        const email = account.email?.trim().toLowerCase();

        // Require a fresh login if the account email changed.
        if (!email || email !== login.email?.trim().toLowerCase()) {
            return deny("Please sign in again.", 403);
        }

        // Read the current role and check that its UID matches.
        const record = await db.collection("user_roles").doc(email).get();
        const role = getRoleFromRecord(record.data(), account.uid);

        // Check whether this role can perform the requested action.
        if (role === "member" || !allowedRoles.includes(role)) {
            return deny("You don't have permission.", 403);
        }

        return { allowed: true as const, uid: account.uid, email, role };
    } catch (error) {
        const loginErrors = [
            "auth/argument-error", "auth/invalid-id-token",
            "auth/id-token-expired", "auth/id-token-revoked",
            "auth/user-disabled", "auth/user-not-found"
        ];

        // Invalid or expired sessions need a new login.
        if (error && typeof error === "object" && "code" in error
            && typeof error.code === "string" && loginErrors.includes(error.code)) {
            return deny("Please sign in again.", 401);
        }

        // Show the cause locally while troubleshooting.
        console.error(
            "Permission check failed:",
            error instanceof Error ? error.message : "Unknown server error"
        );

        // Don't allow access if permissions cannot be checked.
        return deny("Unable to check permissions.", 503);
    }
}