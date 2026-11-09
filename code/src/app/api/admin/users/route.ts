import { NextResponse } from "next/server";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getRoleFromRecord } from "@/firebase/roles";

export const runtime = "nodejs";

function reply(message: string, status = 200) {
    return NextResponse.json(
        { message },
        { status, headers: { "Cache-Control": "private, no-store" } }
    );
}

function errorCode(error: unknown) {
    return error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
}

export async function POST(request: Request) {
    const token = request.headers.get("authorization")
        ?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token) return reply("Please sign in.", 401);

    try {
        const app = getApps().find(app => app.name === "manage-admins")
            ?? initializeApp({
                credential: applicationDefault(),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
            }, "manage-admins");

        const auth = getAuth(app);
        const db = getFirestore(app);
        const roles = db.collection("user_roles");

        // check who is making the request
        const decoded = await auth.verifyIdToken(token, true);
        const caller = await auth.getUser(decoded.uid);
        const callerEmail = caller.email?.trim().toLowerCase();

        if (!callerEmail || callerEmail.includes("/") || caller.disabled
            || !caller.emailVerified || !decoded.email_verified
            || callerEmail !== decoded.email?.trim().toLowerCase()) {
            return reply("Access denied.", 403);
        }

        const callerRef = roles.doc(callerEmail);
        const callerRole = await callerRef.get();

        if (getRoleFromRecord(callerRole.data(), caller.uid) !== "super_admin") {
            return reply("Only superadmins can manage admins.", 403);
        }

        const body = await request.json().catch(() => null);
        const action = body?.action;
        const email = typeof body?.email === "string"
            ? body.email.trim().toLowerCase()
            : "";

        if (action !== "check" && action !== "add" && action !== "remove") {
            return reply("Invalid request.", 400);
        }

        if (email.length > 254 || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) {
            return reply("Enter a valid email.", 400);
        }

        // check the account before granting access
        if (action !== "remove") {
            const account = await auth.getUserByEmail(email).catch(error => {
                if (errorCode(error) === "auth/user-not-found") return null;
                throw error;
            });

            if (!account) return reply("No account found for that email.", 404);

            if (account.disabled || !account.emailVerified
                || account.email?.trim().toLowerCase() !== email) {
                return reply("Use an active account with a verified email.", 400);
            }
        }

        const targetRef = roles.doc(email);

        if (action === "check") {
            const existing = await targetRef.get();

            return existing.exists
                ? reply("This account already has a role.", 409)
                : reply("Account is ready to add.");
        }

        const changeRef = db.collection("role_changes").doc();

        // save the access change and history together
        const status = await db.runTransaction(async transaction => {
            const currentCaller = await transaction.get(callerRef);
            const existing = await transaction.get(targetRef);

            if (getRoleFromRecord(currentCaller.data(), caller.uid) !== "super_admin") {
                return 403;
            }

            if (action === "remove") {
                // only regular admin access can be removed
                if (!existing.exists || existing.get("role") !== "admin") {
                    return 409;
                }

                transaction.delete(targetRef);
            } else {
                if (existing.exists) return 409;

                transaction.create(targetRef, { email, role: "admin" });
            }

            transaction.create(changeRef, {
                action: action === "remove" ? "remove_admin" : "add_admin",
                actorUid: caller.uid,
                actorEmail: callerEmail,
                targetEmail: email,
                createdAt: FieldValue.serverTimestamp()
            });

            return action === "remove" ? 200 : 201;
        });

        if (status === 403) return reply("Access denied.", 403);

        if (status === 409) {
            return reply(
                action === "remove"
                    ? "The role changed. Refresh the list."
                    : "This account already has a role.",
                409
            );
        }

        return reply(
            action === "remove" ? "Admin access removed." : "Admin added.",
            status
        );
    } catch (error) {
        const code = errorCode(error);

        if ([
            "auth/argument-error", "auth/invalid-id-token",
            "auth/id-token-expired", "auth/id-token-revoked",
            "auth/user-disabled", "auth/user-not-found"
        ].includes(code)) {
            return reply("Please sign in again.", 401);
        }

        console.error("Admin request failed:", code || "service-error");
        return reply("Unable to manage admins.", 503);
    }
}