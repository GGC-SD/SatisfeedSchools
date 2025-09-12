"use client";

import { useEffect, useState } from "react";
import { Container, Row, Col, Table, Button, Spinner, Modal, Alert } from "react-bootstrap";
import SidebarNav from "@/components/ui/sidebar";
import { collection, getDocs, deleteDoc, doc, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export default function ManageVersionsPage() {
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [versionToDelete, setVersionToDelete] = useState<any>(null);
    const [message, setMessage] = useState<string | null>(null);

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

        fetchVersions();
    }, []);

    const handleDeleteClick = (version: any) => {
        setVersionToDelete(version);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (!versionToDelete) return;
        setDeletingId(versionToDelete.id);
        try {
            await deleteDoc(doc(db, "csv_results", versionToDelete.id));
            setVersions(prev => prev.filter(v => v.id !== versionToDelete.id));
            setMessage(`Version deleted successfully.`);
        } catch (error) {
            console.error("Error deleting version:", error);
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

                    {/* Confirmation Modal */}
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
                            <Button variant="danger" onClick={confirmDelete}>
                                Delete
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </Col>
            </Row>
        </Container>
    );
}
