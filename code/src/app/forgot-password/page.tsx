"use client";
import { useState, ChangeEvent, FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { Container, Row, Col, Form, Button, Alert, Card } from "react-bootstrap";
import Link from "next/link";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Password reset email sent. Please check your inbox.");
        } catch (err) {
            setError("Failed to send password reset email. Please try again.");
        }
    };

    return (
        <Container fluid className="auth-page">
            <Row className="h-100 w-100">
                <Col md={6} className="auth-left d-flex align-items-center justify-content-end">
                    <h1>Satisfeed Statistics Dashboard</h1>
                </Col>
                <Col md={6} className="auth-right d-flex align-items-center justify-content-center">
                    <Card className="auth-card p-4">
                        <h2 className="text-center mb-4">Forgot Password</h2>
                        {message && <Alert variant="success">{message}</Alert>}
                        {error && <Alert variant="danger">{error}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Email Address</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    required
                                />
                            </Form.Group>
                            <div className="d-flex justify-content-center">
                                <Button type="submit" variant="primary">Send Reset Link</Button>
                            </div>
                        </Form>

                        <p className="mt-3 text-center">
                            <Link href="/login">Back to Login</Link>
                        </p>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}
