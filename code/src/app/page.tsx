"use client"
import { useState, ChangeEvent, FormEvent } from "react";
import { auth } from "@/firebase/firebaseConfig";
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Container, Row, Col, Form, Button, Alert, Card } from "react-bootstrap";
import Link from "next/link";
import "./globals.css";

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setError("Please verify your email before logging in.");
        setShowResend(true);
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleResendVerification = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser && !currentUser.emailVerified) {
        await sendEmailVerification(currentUser);
        await signOut(auth);
        setResendMessage("Verification email sent. Please check your inbox.");
      } else {
        setResendMessage("No user found or email already verified.");
      }
    } catch (err) {
      setResendMessage("Failed to send verification email.");
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
              <h2 className="text-center mb-4">Login</h2>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" name="email" onChange={handleChange} required/>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control type="password" name="password" onChange={handleChange} required/>
                </Form.Group>
                <div className="d-flex justify-content-center">
                  <Button type="submit" variant="primary">Login</Button>
                </div>
              </Form>

              {showResend && (
                  <div className="text-center mt-3">
                    <Button variant="warning" size="sm" onClick={handleResendVerification}>
                      Resend Verification Email
                    </Button>
                    {resendMessage && <p className="mt-2 text-success">{resendMessage}</p>}
                  </div>
              )}

              <p className="mt-3 text-center">
                <Link href="/register">Create Account</Link> | <Link href="/forgot-password">Forgot
                Password?</Link>
              </p>
            </Card>
          </Col>
        </Row>
      </Container>
  );
}
