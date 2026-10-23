import { describe, expect, it } from "vitest";
import {
    getRoleFromRecord,
    canUseAdminTools,
    canManageAdmins
} from "../src/firebase/roles";

describe("Account roles", () => {
    it("uses member access when no role record exists", () => {
        expect(getRoleFromRecord(null, "user-1")).toBe("member");
    });

    it("rejects a role belonging to another account", () => {
        expect(getRoleFromRecord({
            uid: "user-2",
            role: "super_admin"
        }, "user-1")).toBe("member");
    });

    it("rejects unknown roles", () => {
        expect(getRoleFromRecord({
            uid: "user-1",
            role: "owner"
        }, "user-1")).toBe("member");
    });

    it("rejects records without a UID", () => {
        expect(getRoleFromRecord({
            role: "admin"
        }, "user-1")).toBe("member");
    });

    it("recognizes an admin with a matching UID", () => {
        expect(getRoleFromRecord({
            uid: "user-1",
            role: "admin"
        }, "user-1")).toBe("admin");
    });

    it("recognizes a super admin with a matching UID", () => {
        expect(getRoleFromRecord({
            uid: "user-1",
            role: "super_admin"
        }, "user-1")).toBe("super_admin");
    });

    it("allows only admins and super admins to use admin tools", () => {
        expect(canUseAdminTools("member")).toBe(false);
        expect(canUseAdminTools("admin")).toBe(true);
        expect(canUseAdminTools("super_admin")).toBe(true);
    });

    it("allows only super admins to manage admins", () => {
        expect(canManageAdmins("member")).toBe(false);
        expect(canManageAdmins("admin")).toBe(false);
        expect(canManageAdmins("super_admin")).toBe(true);
    });
});