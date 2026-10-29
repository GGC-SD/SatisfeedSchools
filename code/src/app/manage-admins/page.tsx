"use client";

import { useEffect, useState } from "react";
import {
    Container, Row, Col, Table, Form,
    Spinner, Alert, Button, Modal
} from "react-bootstrap";
import { collection, query, where, onSnapshot, doc, runTransaction } from "firebase/firestore";
import { useRouter } from "next/navigation";
import SidebarNav from "@/components/ui/sidebar";
import { useAuth } from "@/firebase/authContext";
import { canManageAdmins } from "@/firebase/roles";
import { db } from "@/firebase/firebaseConfig";

interface AdminRecord {
    email: string;
    uid: string;
    role: "admin" | "super_admin";
}

export default function ManageAdminsPage() {
    const { user, loading: authLoading, role, roleLoading, roleError } = useAuth();
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [admins, setAdmins] = useState<AdminRecord[]>([]);
    const [adminsLoading, setAdminsLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [selectedAdmin, setSelectedAdmin] = useState<AdminRecord | null>(null);
    const [removing, setRemoving] = useState(false);
    const [message, setMessage] = useState("");
    const [removeError, setRemoveError] = useState("");

    const isSuperAdmin = !authLoading && !roleLoading && !roleError && !!user?.emailVerified && canManageAdmins(role);

    useEffect(() => {
        if (!authLoading && !roleLoading && !isSuperAdmin) {
            router.replace("/login");
        }
    }, [authLoading, roleLoading, isSuperAdmin, router]);

    // Keep the table updated when roles change.
    useEffect(() => {
        setAdmins([]);
        setListError("");

        if (!isSuperAdmin || !user) return;

        setAdminsLoading(true);

        const rolesQuery = query(
            collection(db, "user_roles"),
            where("role", "in", ["admin", "super_admin"])
        );

        return onSnapshot(rolesQuery, (snapshot) => {
            const records = snapshot.docs.map(record => ({
                email: record.id,
                uid: record.get("uid"),
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

    const filteredAdmins = admins.filter(admin =>
        admin.email.toLowerCase().includes(search.trim().toLowerCase())
    );

    async function removeAdmin() {
        if (!isSuperAdmin || !selectedAdmin || removing) return;

        const target = selectedAdmin;
        setRemoving(true);
        setMessage("");
        setRemoveError("");

        try {
            const reference = doc(db, "user_roles", target.email);

            await runTransaction(db, async transaction => {
                const record = await transaction.get(reference);

                // Stop if the selected account or role has changed.
                if (!record.exists()
                    || record.data().role !== "admin"
                    || record.data().uid !== target.uid) {
                    throw new Error("The role has changed.");
                }

                // Remove access, not the person's login account.
                transaction.delete(reference);
            });

            setMessage(`Admin access removed for ${target.email}.`);
            setSelectedAdmin(null);
        } catch {
            setRemoveError("Unable to remove access. Refresh the list and check permissions.");
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

    if (!isSuperAdmin) {
        return (
            <Alert variant="danger" className="m-4">
                {roleError || "You do not have permission to manage admins."}
            </Alert>
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
                                    <td colSpan={3} className="text-danger">{listError}</td>
                                </tr>
                            ) : filteredAdmins.length === 0 ? (
                                <tr><td colSpan={3}>No matching admins found.</td></tr>
                            ) : filteredAdmins.map(admin => (
                                <tr key={admin.email}>
                                    <td>{admin.email}</td>
                                    <td>
                                        {admin.role === "super_admin" ? "Superadmin" : "Admin"}
                                    </td>
                                    <td>
                                        {admin.role === "super_admin" ? "Unremovable" : (
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
                    <p>Remove admin access for <strong>{selectedAdmin?.email}</strong>?</p>
                    <p className="mb-0">Their login account will not be deleted.</p>
                    {removeError && (
                        <Alert variant="danger" className="mt-3">{removeError}</Alert>
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
                    <Button variant="danger" disabled={removing} onClick={removeAdmin}>
                        {removing ? "Removing..." : "Remove access"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}