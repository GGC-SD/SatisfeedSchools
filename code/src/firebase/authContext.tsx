"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { getRoleFromRecord } from "./roles";
import type { UserRole } from "./roles";

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    role: UserRole;
    roleLoading: boolean;
    roleError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    role: "member",
    roleLoading: true,
    roleError: null
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<UserRole>("member");
    const [roleLoading, setRoleLoading] = useState(true);
    const [roleError, setRoleError] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribeRole: (() => void) | undefined;
        let accountVersion = 0;

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            const currentVersion = ++accountVersion;

            // Clear the previous account's role and listener.
            unsubscribeRole?.();
            unsubscribeRole = undefined;

            // Only treat verified accounts as logged in within the app.
            setUser(firebaseUser?.emailVerified ? firebaseUser : null);
            setLoading(false);
            setRole("member");
            setRoleError(null);
            setRoleLoading(true);

            if (!firebaseUser || !firebaseUser.emailVerified || !firebaseUser.email) {
                setRoleLoading(false);
                return;
            }

            const email = firebaseUser.email.trim().toLowerCase();
            const roleRef = doc(db, "user_roles", email);

            // Read this account's role and watch for changes.
            unsubscribeRole = onSnapshot(roleRef, (snapshot) => {
                if (currentVersion !== accountVersion) return;

                setRole(getRoleFromRecord(snapshot.data(), firebaseUser.uid));
                setRoleError(null);
                setRoleLoading(false);
            }, (error) => {
                if (currentVersion !== accountVersion) return;

                // Never grant admin access when the role cannot be checked.
                console.error("Unable to load account role:", error);
                setRole("member");
                setRoleError("Unable to check account permissions.");
                setRoleLoading(false);
            });
        });

        return () => {
            accountVersion++;
            unsubscribe();
            unsubscribeRole?.();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, role, roleLoading, roleError }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);