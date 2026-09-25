"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { getAuth, signOut } from "firebase/auth"
import { Button, Nav, Navbar, Offcanvas } from "react-bootstrap"
import { useAuth } from "@/firebase/authContext"

// This component wraps React Bootstrap's Nav.Link with Next.js Link for client-side navigation
const NavLink = ({ href, active, children, onClick = () => {} }) => {
    return (
        <Nav.Link
            as={Link}
            href={href}
            active={active}
            onClick={onClick}
            className={active ? "bg-secondary" : ""}
            style={{ borderRadius: "5px", padding: "10px 15px" }}
        >
            {children}
        </Nav.Link>
    )
}

export default function SidebarNav() {
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const pathname = usePathname()
    const { user, loading } = useAuth()

    const publicNavItems = [
        { path: "/dashboard", label: "Dashboard Summary" },
        {path: "/dashboard-insights", label: "Dashboard Insights" },
        { path: "/summary", label: "Summary Detail" },
    ]

    const protectedNavItems = [
        { path: "/upload", label: "Upload Raw Data" },
        { path: "/manage-versions", label: "Manage Versions" },
    ]

    const navItems = user
        ? [...publicNavItems, ...protectedNavItems]
        : publicNavItems

    const handleLogout = async () => {
        const auth = getAuth()
        try {
            await signOut(auth)
            window.location.href = "/"
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="d-none d-md-block bg-dark text-white p-3" style={{ minHeight: "100vh", width: "240px" }}>
                <Navbar bg="dark" variant="dark" className="flex-column align-items-start">
                    <Navbar.Brand className="mb-4">Navigation</Navbar.Brand>
                    <Nav className="flex-column w-100">
                        {navItems.map((item) => (
                            <NavLink key={item.path} href={item.path} active={pathname === item.path}>
                                {item.label}
                            </NavLink>
                        ))}
                        {!loading && (user ? (
                            <Button variant="outline-light" className="mt-4" onClick={handleLogout}>
                                Log Out
                            </Button>
                        ) : (
                            <Button variant="outline-light" className="mt-4" onClick={() => { window.location.href = "/login" }}>
                                Log In
                            </Button>
                        ))}
                    </Nav>
                </Navbar>
            </div>

            {/* Mobile Toggle Button */}
            <Button
                variant="dark"
                className="d-md-none position-fixed top-0 start-0 m-2 z-3"
                onClick={() => setShowMobileMenu(true)}
                aria-label="Open navigation menu"
            >
                ☰
            </Button>

            {/* Mobile Offcanvas Sidebar */}
            <Offcanvas
                show={showMobileMenu}
                onHide={() => setShowMobileMenu(false)}
                className="bg-dark text-white"
                placement="start"
            >
                <Offcanvas.Header closeButton closeVariant="white">
                    <Offcanvas.Title>Navigation</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <Nav className="flex-column">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                href={item.path}
                                active={pathname === item.path}
                                onClick={() => setShowMobileMenu(false)}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                        {!loading && (user ? (
                            <Button
                                variant="outline-light"
                                className="mt-4"
                                onClick={() => {
                                    setShowMobileMenu(false)
                                    handleLogout()
                                }}
                            >
                                Log Out
                            </Button>
                        ) : (
                            <Button
                                variant="outline-light"
                                className="mt-4"
                                onClick={() => { window.location.href = "/login" }}
                            >
                                Log In
                            </Button>
                        ))}
                    </Nav>
                </Offcanvas.Body>
            </Offcanvas>
        </>
    )
}
