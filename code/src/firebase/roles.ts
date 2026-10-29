export type UserRole = "member" | "admin" | "super_admin";

// Read this record using the signed-in user's verified email.
export function getRoleFromRecord(record: unknown, uid: string): UserRole {
    if (!uid || !record || typeof record !== "object" || !("role" in record)) {
        return "member";
    }

    // Regular admins use their email-based role record.
    if (record.role === "admin") return "admin";

    // Superadmins must also have a matching UID.
    if (record.role === "super_admin" && "uid" in record && record.uid === uid) {
        return "super_admin";
    }

    return "member";
}

// Admins and super admins can use the admin tools.
export function canUseAdminTools(role: UserRole): boolean {
    return role === "admin" || role === "super_admin";
}

// Only super admins can manage other admins.
export function canManageAdmins(role: UserRole): boolean {
    return role === "super_admin";
}