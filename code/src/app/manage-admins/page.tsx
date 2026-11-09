"use client";

import { useEffect, useState } from "react";
import {
    Container, Row, Col, Table, Form,
    Spinner, Alert, Button, Modal
} from "react-bootstrap";
import {
    collection, query, where, onSnapshot,
    orderBy, limit, type Timestamp
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import SidebarNav from "@/components/ui/sidebar";
import { useAuth } from "@/firebase/authContext";
import { canManageAdmins } from "@/firebase/roles";
import { db } from "@/firebase/firebaseConfig";

interface AdminRecord {
    email: string;
    role: "admin" | "super_admin";
}

interface RoleChange {
    id: string;
    action: "add_admin" | "remove_admin";
    actorEmail: string;
    targetEmail: string;
    createdAt: Timestamp | null;
}

async function adminRequest(
    token: string,
    email: string,
    action: "check" | "add" | "remove",
    signal?: AbortSignal
) {
    const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, action }),
        signal
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
        throw new Error(data?.message || "Unable to manage admins.");
    }
}

export default function ManageAdminsPage() {
    const {
        user, loading: authLoading, role, roleLoading, roleError
    } = useAuth();

    const router = useRouter();

    const [search, setSearch] = useState("");
    const [admins, setAdmins] = useState<AdminRecord[]>([]);
    const [adminsLoading, setAdminsLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [selectedAdmin, setSelectedAdmin] = useState<AdminRecord | null>(null);
    const [removing, setRemoving] = useState(false);
    const [message, setMessage] = useState("");
    const [removeError, setRemoveError] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [eligible, setEligible] = useState<{
        email: string;
        uid: string;
    } | null>(null);
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState("");
    const [history, setHistory] = useState<RoleChange[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState("");

    const isSuperAdmin = !authLoading && !roleLoading && !roleError
        && !!user?.emailVerified && canManageAdmins(role);

    // keeps admins and members out
    useEffect(() => {
        if (!authLoading && !roleLoading && !isSuperAdmin) {
            router.replace("/login");
        }
    }, [authLoading, roleLoading, isSuperAdmin, router]);

    // keep the admin list up to date
    useEffect(() => {
        setAdmins([]);
        setListError("");

        if (!isSuperAdmin || !user) return;

        setAdminsLoading(true);

        const rolesQuery = query(
            collection(db, "user_roles"),
            where("role", "in", ["admin", "super_admin"])
        );

        return onSnapshot(rolesQuery, snapshot => {
            const records = snapshot.docs.map(record => ({
                email: record.id,
                role: record.get("role")
            })) as AdminRecord[];

            setAdmins(records.sort((a, b) => a.email.localeCompare(b.email)));
            setAdminsLoading(false);
        }, () => {
            setAdmins([]);
            setListError("Unable to load admins. Check Firestore permissions.");
            setAdminsLoading(false);
        });
    }, [isSuperAdmin, user]);

    // show the latest access changes
    useEffect(() => {
        setHistory([]);
        setHistoryError("");

        if (!isSuperAdmin || !user) return;

        setHistoryLoading(true);

        const historyQuery = query(
            collection(db, "role_changes"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        return onSnapshot(historyQuery, snapshot => {
            setHistory(snapshot.docs.map(record => ({
                id: record.id,
                ...record.data()
            }) as RoleChange));

            setHistoryLoading(false);
        }, () => {
            setHistory([]);
            setHistoryError("Unable to load admin role logs.");
            setHistoryLoading(false);
        });
    }, [isSuperAdmin, user]);

    const filteredAdmins = admins.filter(admin =>
        admin.email.toLowerCase().includes(search.trim().toLowerCase())
    );

    const email = newEmail.trim().toLowerCase();
    const canAdd = eligible?.email === email && eligible.uid === user?.uid;

    // check the email before showing add admin
    useEffect(() => {
        setEligible(null);
        setAddError("");

        if (!isSuperAdmin || !user
            || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) return;

        const account = user;
        const controller = new AbortController();

        const timer = setTimeout(async () => {
            try {
                const token = await account.getIdToken();
                await adminRequest(token, email, "check", controller.signal);

                if (!controller.signal.aborted) {
                    setEligible({ email, uid: account.uid });
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setAddError(
                        error instanceof Error
                            ? error.message
                            : "Unable to check email."
                    );
                }
            }
        }, 400);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [email, user, isSuperAdmin]);

    async function addAdmin() {
        if (!user || !isSuperAdmin || !canAdd || adding) return;

        setAdding(true);
        setAddError("");
        setMessage("");

        try {
            const token = await user.getIdToken();
            await adminRequest(token, email, "add");

            setMessage(`Admin access added for ${email}.`);
            setNewEmail("");
            setEligible(null);
        } catch (error) {
            setEligible(null);
            setAddError(
                error instanceof Error ? error.message : "Unable to add admin."
            );
        } finally {
            setAdding(false);
        }
    }

    async function removeAdmin() {
        if (!user || !isSuperAdmin || !selectedAdmin || removing) return;

        const target = selectedAdmin;
        setRemoving(true);
        setMessage("");
        setRemoveError("");

        try {
            // let the server remove access and save history
            const token = await user.getIdToken();
            await adminRequest(token, target.email, "remove");

            setMessage(`Admin access removed for ${target.email}.`);
            setSelectedAdmin(null);
        } catch (error) {
            setRemoveError(
                error instanceof Error
                    ? error.message
                    : "Unable to remove access."
            );
        } finally {
            setRemoving(false);
        }
    }

    if (authLoading || roleLoading || !isSuperAdmin) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" />
            </div>
        );
    }

    return (
        <Container fluid className="p-0">
            <Row className="m-0 min-vh-100">
                <Col md={3} lg={2} className="p-0">
                    <SidebarNav />
                </Col>

                <Col md={9} lg={10} className="p-4">
                    <h2 className="mb-4">👥 Manage Admins</h2>

                    {message && <Alert variant="success">{message}</Alert>}

                    <Form
                        className="mb-4"
                        onSubmit={event => {
                            event.preventDefault();
                            void addAdmin();
                        }}
                    >
                        <Form.Label htmlFor="new-admin-email">
                            Add an admin
                        </Form.Label>

                        <Form.Control
                            id="new-admin-email"
                            type="email"
                            placeholder="Enter their account email"
                            value={newEmail}
                            disabled={adding}
                            onChange={event => {
                                const value = event.target.value;
                                setNewEmail(value);

                                if (value.trim().toLowerCase() !== email) {
                                    setEligible(null);
                                    setAddError("");
                                }
                            }}
                        />

                        {addError && (
                            <div className="text-danger mt-2">{addError}</div>
                        )}

                        {canAdd && (
                            <Button
                                type="submit"
                                className="mt-2"
                                disabled={adding}
                            >
                                {adding ? "Adding..." : "Add Admin"}
                            </Button>
                        )}
                    </Form>

                    <Form.Group controlId="admin-search" className="mb-4">
                        <Form.Label>Search by email</Form.Label>
                        <Form.Control
                            type="search"
                            placeholder="Enter email"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                        />
                    </Form.Group>

                    <Table striped bordered responsive>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminsLoading ? (
                                <tr><td colSpan={3}>Loading admins...</td></tr>
                            ) : listError ? (
                                <tr>
                                    <td colSpan={3} className="text-danger">
                                        {listError}
                                    </td>
                                </tr>
                            ) : filteredAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan={3}>No matching admins found.</td>
                                </tr>
                            ) : filteredAdmins.map(admin => (
                                <tr key={admin.email}>
                                    <td>{admin.email}</td>
                                    <td>
                                        {admin.role === "super_admin"
                                            ? "Superadmin"
                                            : "Admin"}
                                    </td>
                                    <td>
                                        {admin.role === "super_admin" ? (
                                            "Unremovable"
                                        ) : (
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                disabled={removing}
                                                onClick={() => {
                                                    setRemoveError("");
                                                    setSelectedAdmin(admin);
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    <h5 className="mt-4">Admin Role Logs</h5>

                    <Table striped bordered responsive>
                        <thead>
                            <tr>
                                <th>Changed by</th>
                                <th>Account</th>
                                <th>Action</th>
                                <th>When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyLoading ? (
                                <tr><td colSpan={4}>Loading history...</td></tr>
                            ) : historyError ? (
                                <tr>
                                    <td colSpan={4} className="text-danger">
                                        {historyError}
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={4}>No recorded changes.</td>
                                </tr>
                            ) : history.map(change => (
                                <tr key={change.id}>
                                    <td>{change.actorEmail}</td>
                                    <td>{change.targetEmail}</td>
                                    <td>
                                        {change.action === "add_admin"
                                            ? "Added"
                                            : "Removed"}
                                    </td>
                                    <td>
                                        {change.createdAt
                                            ?.toDate().toLocaleString() || "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Col>
            </Row>

            <Modal
                show={selectedAdmin !== null}
                onHide={() => {
                    if (!removing) setSelectedAdmin(null);
                }}
                backdrop={removing ? "static" : true}
                keyboard={!removing}
                centered
            >
                <Modal.Header>
                    <Modal.Title>Remove admin access?</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <p>
                        Remove admin access for{" "}
                        <strong>{selectedAdmin?.email}</strong>?
                    </p>
                    <p className="mb-0">
                        Their login account will not be deleted.
                    </p>

                    {removeError && (
                        <Alert variant="danger" className="mt-3">
                            {removeError}
                        </Alert>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        disabled={removing}
                        onClick={() => setSelectedAdmin(null)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="danger"
                        disabled={removing}
                        onClick={removeAdmin}
                    >
                        {removing ? "Removing..." : "Remove access"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}