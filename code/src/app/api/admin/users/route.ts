import { NextResponse } from "next/server";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/firebase/permissions";
import { getServerAdmin } from "@/firebase/serverAdmin";
import { getRoleFromRecord } from "@/firebase/roles";

export const runtime = "nodejs";

function reply(data: object, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: { "Cache-Control": "private, no-store" }
    });
}

// Only superadmins can list admins.
export async function GET(request: Request) {
    const permission = await requireRole(request, ["super_admin"]);
    if (!permission.allowed) return permission.response;

    const after = new URL(request.url).searchParams.get("after");

    if (after && (after.includes("/") || after.length > 254)) {
        return reply({ message: "Invalid list position." }, 400);
    }

    try {
        const { db } = getServerAdmin();
        let query = db.collection("user_roles")
            .where("role", "==", "admin")
            .orderBy(FieldPath.documentId()).limit(50);

        if (after) query = query.startAfter(after);

        const records = await query.get();

        return reply({
            admins: records.docs.map(record => ({
                email: record.id,
                uid: record.get("uid"),
                role: "admin"
            })),
            next: records.size === 50 ? records.docs[49].id : null
        });
    } catch {
        return reply({ message: "Unable to load admins." }, 503);
    }
}

// Add admin access without changing existing roles.
export async function POST(request: Request) {
    const permission = await requireRole(request, ["super_admin"]);
    if (!permission.allowed) return permission.response;

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (body?.role !== "admin" || email.length > 254
        || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) {
        return reply({ message: "A valid email and admin role are required." }, 400);
    }

    try {
        const { auth, db } = getServerAdmin();
        const account = await auth.getUserByEmail(email);

        if (account.disabled || !account.emailVerified) {
            return reply({ message: "Account must be verified and enabled." }, 403);
        }

        if (account.email?.trim().toLowerCase() !== email) {
            return reply({ message: "Look up the account again." }, 409);
        }

        const roles = db.collection("user_roles");
        const target = roles.doc(email);

        // Recheck permission and duplicates before saving.
        return await db.runTransaction(async (transaction) => {
            const caller = await transaction.get(roles.doc(permission.email));
            const existing = await transaction.get(target);
            const grants = await transaction.get(
                roles.where("uid", "==", account.uid).limit(1)
            );

            if (getRoleFromRecord(caller.data(), permission.uid) !== "super_admin") {
                return reply({ message: "You don't have permission." }, 403);
            }

            if (existing.exists || !grants.empty) {
                return reply({ message: "This account already has a role." }, 409);
            }

            transaction.create(target, {
                email,
                uid: account.uid,
                role: "admin",
                createdBy: permission.uid,
                createdAt: FieldValue.serverTimestamp()
            });

            // Keep a record of who granted access.
            transaction.create(db.collection("role_changes").doc(), {
                action: "add_admin",
                actorUid: permission.uid,
                targetUid: account.uid,
                targetEmail: email,
                createdAt: FieldValue.serverTimestamp()
            });

            return reply({ message: "Admin added." }, 201);
        });
    } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
            if (error.code === "auth/user-not-found") {
                return reply({ message: "Account not found." }, 404);
            }
            if (error.code === "auth/invalid-email") {
                return reply({ message: "Invalid email." }, 400);
            }
        }

        return reply({ message: "Unable to add admin." }, 503);
    }
}