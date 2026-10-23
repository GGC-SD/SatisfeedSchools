export type UserRole = "member" | "admin" | "super_admin";

// Only recognize a role when the record belongs to this account.
export function getRoleFromRecord(record: unknown, uid: string): UserRole {
    if (!uid || !record || typeof record !== "object") {
        return "member";
    }

    if (!("uid" in record) || record.uid !== uid) {
        return "member";
    }

    if (!("role" in record)) {
        return "member";
    }

    if (record.role === "admin" || record.role === "super_admin") {
        return record.role;
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