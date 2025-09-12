"use client"

import { useState, ChangeEvent, FormEvent } from "react";
import { auth } from "@/firebase/firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Container, Row, Col, Form, Button, Alert, Card } from "react-bootstrap";
import Link from "next/link";
import "../globals.css";

interface FormState {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export default function Register() {
    const router = useRouter();
    const [form, setForm] = useState<FormState>({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const emailRegex = /^[a-zA-Z0-9._%+-]+@(satisfeed\.org|gmail\.com|ggc\.edu)$/;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

        if (!emailRegex.test(form.email)) {
            setError("Only @satisfeed.org, gmail.com, or ggc.edu email addresses are allowed.");
            return;
        }
        if (!passwordRegex.test(form.password)) {
            setError("Password must be at least 8 characters long and include both letters and numbers.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
            await updateProfile(userCredential.user, {
                displayName: `${form.firstName} ${form.lastName}`,
            });

            await sendEmailVerification(userCredential.user);
            alert("Verification email sent. Please check your inbox before logging in.");

            router.push("/");
        } catch (error) {
            setError((error as Error).message);
        }
    };

    return (
        <Container fluid className="auth-page">
            <Row className="h-100 w-100">
                <Col md={6} className="auth-left d-flex">
                <h1>Satisfeed Statistics Dashboard</h1>
                </Col>

                <Col md={6} className="auth-right d-flex align-items-center justify-content-center">
                <Card className="auth-card">
                    <h2 className="text-center mb-4">Register</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>First Name</Form.Label>
                            <Form.Control type="text" name="firstName" onChange={handleChange} required/>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control type="text" name="lastName" onChange={handleChange} required/>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" name="email" onChange={handleChange} required/>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" name="password" onChange={handleChange} required/>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Confirm Password</Form.Label>
                            <Form.Control type="password" name="confirmPassword" onChange={handleChange} required/>
                        </Form.Group>
                        <Button type="submit" variant="primary" className="w-100">Register</Button>
                    </Form>
                    <p className="mt-3 text-center">
                        Already have an account? <Link href="/">Login</Link>
                    </p>
                </Card>
            </Col>
            </Row>
        </Container>
    );
}
