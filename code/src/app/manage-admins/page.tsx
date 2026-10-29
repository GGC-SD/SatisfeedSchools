"use client";

import { useEffect, useState } from "react";
import { Container, Row, Col, Table, Form, Spinner, Alert, Button } from "react-bootstrap";
import SidebarNav from "@/components/ui/sidebar";
import { useAuth } from "@/firebase/authContext";
import { useRouter } from "next/navigation";
import { canManageAdmins } from "@/firebase/roles";

export default function ManageAdminsPage() {
    const { user, loading: authLoading, role, roleLoading, roleError } = useAuth();
    const isSuperAdmin = !authLoading && !roleLoading && !roleError
        && !!user?.emailVerified && canManageAdmins(role);

    const router = useRouter();
    const [email, setEmail] = useState("");

    const [lookup, setLookup] = useState<{
        email: string;
        callerUid: string;
        eligible: boolean;
        message: string;
    } | null>(null);

    const currentLookup = lookup?.email === email.trim().toLowerCase()
        && lookup.callerUid === user?.uid ? lookup : null;

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/login");
        }
    }, [user, authLoading, router]);

        useEffect(() => {
        setLookup(null);
        const address = email.trim().toLowerCase();

        if (!isSuperAdmin || !user || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(address)) return;

        const account = user;
        let active = true;

        // Wait until typing pauses.
        const timer = setTimeout(async () => {
            let eligible = false;
            let message = "Unable to check account.";

            try {
                const token = await account.getIdToken();
                const response = await fetch("/api/admin/lookup", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email: address })
                });

                const data = await response.json();
                eligible = response.ok && data.eligible === true;
                message = data.message || message;
            } catch {
                message = "Unable to check account.";
            }

            // Ignore results for an old email or account.
            if (active) {
                setLookup({ email: address, callerUid: account.uid, eligible, message });
            }
        }, 600);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [email, isSuperAdmin, user]);

    if (authLoading || roleLoading || !user) {
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
            <Row className="m-0 vh-100">
                <Col md={3} lg={2} className="p-0">
                    <SidebarNav />
                </Col>
                <Col md={9} lg={10} className="p-4">
                    <h2 className="mb-4">👥 Manage Admins</h2>

                    <Row className="mb-4">
                        <Col md={8}>
                            <Form.Group controlId="admin-email">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={email}
                                    onChange={(event) => { setEmail(event.target.value); setLookup(null); }}
                                    placeholder="Enter email"
                                />
                                { currentLookup && ( <Form.Text role="status"> {currentLookup.message} </Form.Text> ) }
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="admin-role">
                                <Form.Label>Role</Form.Label>
                                <Form.Select defaultValue="admin">
                                    <option value="admin">Admin</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    {currentLookup?.eligible && (
                        <Button className="mb-4" disabled>Add Admin</Button>
                    )}

                    <Table striped bordered hover responsive>
                        <thead>
                        <tr>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td colSpan={3} className="text-center text-muted">
                                Admin management is not connected yet.
                            </td>
                        </tr>
                        </tbody>
                    </Table>
                </Col>
            </Row>
        </Container>
    );
}