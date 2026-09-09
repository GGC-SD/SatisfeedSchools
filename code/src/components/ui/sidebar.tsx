"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { getAuth, signOut } from "firebase/auth"
import { Button, Nav, Navbar, Offcanvas } from "react-bootstrap"

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
    /* Side Bar Navigation*/
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [showDesktopMenu, setShowDesktopMenu] = useState(false)
    const [language, setLanguage] = useState("en")
    const pathname = usePathname()


    const translations = {
    en: {
        navigation: "Navigation",
        dashboard: "Dashboard Summary",
        insights: "Dashboard Insights",
        summary: "Summary Detail",
        upload: "Upload Raw Data",
        versions: "Manage Versions",
        logout: "Log Out",
        spanish: "Español",
    },

    es: {
        navigation: "Navegación",
        dashboard: "Resumen del Dashboard",
        insights: "Perspectivas del Dashboard",
        summary: "Detalle del Resumen",
        upload: "Subir Datos sin Procesar",
        versions: "Administrar Versiones",
        logout: "Cerrar Sesión",
        english: "English",
    },
    
    
    
}
   const t = translations[language]
    
    const navItems = [
    { path: "/dashboard", label: "dashboard" },
    { path: "/dashboard-insights", label: "insights" },
    { path: "/summary", label: "summary" },
    { path: "/upload", label: "upload" },
    { path: "/manage-versions", label: "versions" },
]

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
        <Button
            variant="dark"
            className="d-none d-md-block position-fixed top-0 m-2"
            style={{
                left: showDesktopMenu ? "var(--sidebar-width)" : "0px",
                zIndex: 9999,
                transition: "left 0.3s ease"
            }}
            onClick={() => setShowDesktopMenu(!showDesktopMenu)}
            aria-label="Toggle navigation menu"
        >
            ☰
        </Button>

            {/* Desktop Sidebar */}
            <div className={`position-fixed top-0 start-0 sidebar-container ${showDesktopMenu ? "sidebar-open" : "sidebar-closed"}`}>
                <Navbar bg="dark" variant="dark" className="flex-column align-items-start"style={{ width: "100%", height: "100%" }}>
                    <div className = "w-100 text-center">
                        <img
                            src = "/Satisfeed logo white.png"
                            alt = "Satisfeed logo"
                            className = "satisfeed-sidebar-logo img-fluid mb-3"
                        />
                    </div>
                    <Navbar.Brand className="sidebar-navigation-title mb-4 w-100">Navigation</Navbar.Brand>
                    <Nav className="flex-column w-100">
                        {navItems.map((item) => (
                            <NavLink key={item.path} href={item.path} active={pathname === item.path}>
                                {t[item.label]}
                            </NavLink>
                        ))}
                        <Button variant="outline-light" className="mt-2" onClick={() => setLanguage(language === "en" ? "es" : "en")}>
                            {language === "en" ? "Español" : "English"}
                        </Button>
                        <Button variant="outline-light" className="mt-4" onClick={handleLogout}>
                            Log Out
                        </Button>
                        

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
                    <div>
                        <img
                        src = "/Satisfeed logo white.png"
                        alt = "Satisfeed logo"
                        className = "satisfeed-sidebar-logo img-fluid mb-2"
                        />
                    </div>
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
                    </Nav>
                </Offcanvas.Body>
            </Offcanvas>
        </>
    )
}
