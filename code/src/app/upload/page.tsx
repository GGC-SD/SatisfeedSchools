"use client";

import { useState } from "react";
import { Container, Form, Button, Alert, Spinner, Row, Col } from "react-bootstrap";
import SidebarNav from "@/components/ui/sidebar";

export default function UploadPage() {
    const [files, setFiles] = useState<FileList | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFiles(event.target.files);
    };

    const handleUpload = async () => {
        if (!files) {
            setMessage("Please select at least one CSV file.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", files[0]);

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            setMessage(result.message.startsWith("File") ? ` ${result.message}` : ` ${result.message}`);
        } catch (error) {
            setMessage("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Container fluid className="p-0">
            <Row className="m-0 vh-100">
                <Col md={3} lg={2} className="d-none d-md-block p-0">
                    <SidebarNav />
                </Col>
                <Col md={9} lg={10} className="d-flex justify-content-center align-items-center">
                    <div className="text-center w-100" style={{maxWidth: "500px"}}>
                        <h2 className="text-center">📂 Upload CSV Files</h2>
                        <Form>
                            <Form.Group controlId="formFileMultiple" className="mb-3">
                                <Form.Label>Select CSV Files</Form.Label>
                                <Form.Control type="file" accept=".csv" onChange={handleFileChange}/>
                            </Form.Group>
                            <Button variant="primary" onClick={handleUpload} disabled={isUploading} className="w-100">
                                {isUploading ? <Spinner animation="border" size="sm"/> : "Upload & Process"}
                            </Button>
                        </Form>
                        {message && (
                            <Alert variant={message.startsWith("") ? "success" : "danger"} className="mt-3">
                                {message}
                            </Alert>
                        )}
                    </div>
                </Col>
            </Row>
        </Container>
);
}
