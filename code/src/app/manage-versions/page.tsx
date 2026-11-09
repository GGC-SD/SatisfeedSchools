"use client";

import { useEffect, useState } from "react";
import { Container, Row, Col, Table, Button, Spinner, Modal, Alert } from "react-bootstrap";
import SidebarNav from "@/components/ui/sidebar";
import { collection, getDocs, runTransaction, serverTimestamp, doc, orderBy, query, onSnapshot, limit, type Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { useAuth } from "@/firebase/authContext";
import { useRouter } from "next/navigation";
import { canUseAdminPages } from "@/firebase/roles";

interface VersionLog {
    id: string;
    action: "upload" | "delete";
    actorEmail: string;
    versionId: string;
    filename: string;
    createdAt: Timestamp | null;
}

export default function ManageVersionsPage() {
    const { user, loading: authLoading, role, roleLoading, roleError } = useAuth();
    const isAdmin = !authLoading && !roleLoading && !roleError && !!user?.emailVerified && canUseAdminPages(role);

    const router = useRouter();
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [versionToDelete, setVersionToDelete] = useState<any>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [logs, setLogs] = useState<VersionLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logsError, setLogsError] = useState("");

    useEffect(() => {
        if (!authLoading && !roleLoading && !isAdmin) {
            router.replace("/login");
        }
    }, [authLoading, roleLoading, isAdmin, router]);

    // Fetch all versions from csv_results
    useEffect(() => {
        const fetchVersions = async () => {
            try {
                const q = query(collection(db, "csv_results"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                const versionList = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));
                setVersions(versionList);
            } catch (error) {
                console.error("Error fetching versions:", error);
            } finally {
                setLoading(false);
            }
        };

        if (isAdmin) {
            fetchVersions();
        } else {
            setVersions([]);
        }
    }, [user, isAdmin]);

    // show the latest uploads and deletions
    useEffect(() => {
        setLogs([]);
        setLogsError("");

        if (!user || !isAdmin) return;

        setLogsLoading(true);

        const logsQuery = query(
            collection(db, "version_logs"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        return onSnapshot(logsQuery, snapshot => {
            setLogs(snapshot.docs.map(record => ({
                id: record.id,
                ...record.data()
            }) as VersionLog));
            setLogsLoading(false);
        }, error => {
            console.error("version logs failed:", error);
            setLogs([]);
            setLogsError("Unable to load version logs.");
            setLogsLoading(false);
        });
    }, [user, isAdmin]);

    // keeps the version list hidden while checking access
    if (authLoading || roleLoading || !isAdmin) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <Alert variant="danger" className="m-4">
                You do not have permission to manage versions.
            </Alert>
        );
    }

    const handleDeleteClick = (version: any) => {
        setVersionToDelete(version);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (!user?.email || !isAdmin || !versionToDelete || deletingId) return;

        const target = versionToDelete;
        const actorUid = user.uid;
        const actorEmail = user.email.trim().toLowerCase();
        setDeletingId(target.id);

        try {
            const versionRef = doc(db, "csv_results", target.id);
            const logRef = doc(db, "version_logs", target.id + "_delete");

            // delete the version and record who did it
            await runTransaction(db, async transaction => {
                const snapshot = await transaction.get(versionRef);

                if (!snapshot.exists()) {
                    throw new Error("Version no longer exists.");
                }

                transaction.delete(versionRef);
                transaction.set(logRef, {
                    action: "delete",
                    actorUid,
                    actorEmail,
                    versionId: target.id,
                    filename: snapshot.data().filename || "",
                    createdAt: serverTimestamp()
                });
            });

            setVersions(prev => prev.filter(version => version.id !== target.id));
            setMessage("Version deleted successfully.");
        } catch (error) {
            console.error("version deletion failed:", error);
            setMessage("Failed to delete version.");
        } finally {
            setDeletingId(null);
            setShowConfirm(false);
        }
    };

    return (
        <Container fluid className="p-0">
            <Row className="m-0 vh-100">
                <Col md={3} lg={2} className="d-none d-md-block p-0">
                    <SidebarNav />
                </Col>
                <Col md={9} lg={10} className="p-4">
                    <h2 className="mb-4">🗑 Manage Data Versions</h2>

                    {message && <Alert variant="info">{message}</Alert>}

                    {loading ? (
                        <Spinner animation="border" />
                    ) : versions.length === 0 ? (
                        <p>No data versions available.</p>
                    ) : (
                        <Table striped bordered hover responsive>
                            <thead>
                            <tr>
                                <th>Version ID</th>
                                <th>Created At</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Record Count</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {versions.map(version => (
                                <tr key={version.id}>
                                    <td>{version.id}</td>
                                    <td>
                                        {version.createdAt?.toDate
                                            ? version.createdAt.toDate().toLocaleString()
                                            : "N/A"}
                                    </td>
                                    <td>{version.data.dataset_info?.startDate || "N/A"}</td>
                                    <td>{version.data.dataset_info?.endDate || "N/A"}</td>
                                    <td>{version.data.dataset_info?.recordCount ?? "N/A"}</td>
                                    <td>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            disabled={deletingId === version.id}
                                            onClick={() => handleDeleteClick(version)}
                                        >
                                            {deletingId === version.id ? (
                                                <Spinner animation="border" size="sm" />
                                            ) : (
                                                "Delete"
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    )}

                    <h5 className="mt-4">Version Logs</h5>
                    <p className="text-muted">Latest 50 changes</p>

                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>Changed by</th>
                                <th>Action</th>
                                <th>File</th>
                                <th>Version ID</th>
                                <th>When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logsLoading ? (
                                <tr><td colSpan={5}>Loading logs...</td></tr>
                            ) : logsError ? (
                                <tr>
                                    <td colSpan={5} className="text-danger">{logsError}</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5}>No recorded changes.</td></tr>
                            ) : logs.map(entry => (
                                <tr key={entry.id}>
                                    <td>{entry.actorEmail}</td>
                                    <td>{entry.action === "upload" ? "Uploaded" : "Deleted"}</td>
                                    <td>{entry.filename || "N/A"}</td>
                                    <td>{entry.versionId}</td>
                                    <td>{entry.createdAt?.toDate().toLocaleString() || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    {/* confirm the deletion */}
                    <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Confirm Delete</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            Are you sure you want to permanently delete this version? This action cannot be undone.
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmDelete} disabled={deletingId !== null}>
                                Delete
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </Col>
            </Row>
        </Container>
    );
}
