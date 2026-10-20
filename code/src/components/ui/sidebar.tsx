"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import type { ReactNode, Dispatch, SetStateAction } from "react"
import { getAuth, signOut } from "firebase/auth"
import { Button, Nav, Navbar, Offcanvas } from "react-bootstrap"
import { useAuth } from "@/firebase/authContext"

// This component wraps React Bootstrap's Nav.Link with Next.js Link for client-side navigation
const NavLink = ({ href, active, children, onClick = () => {} }: {
    href: string;
    active?: boolean;
    children: ReactNode;
    onClick?: () => void;
}) => {
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

interface SidebarNavProps {
    language?: "en" | "es";
    setLanguage?: Dispatch<SetStateAction<"en" | "es">>;
}

 /* Side Bar Navigation*/
export default function SidebarNav({language: providedLanguage,setLanguage: providedSetLanguage}: SidebarNavProps = {}) {
    const [localLanguage, setLocalLanguage] = useState<"en" | "es">("en")
    const useProvidedLanguage = providedLanguage !== undefined && providedSetLanguage !== undefined
    const language = useProvidedLanguage ? providedLanguage : localLanguage
    const setLanguage = useProvidedLanguage ? providedSetLanguage : setLocalLanguage
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [showDesktopMenu, setShowDesktopMenu] = useState(false)
    const pathname = usePathname()
    const { user, loading } = useAuth()

    const translations = {
    en: {
        navigation: "Navigation",
        dashboard: "Demographics",
        insights: "Schools and Libraries",
        summary: "Summary Overview",
        upload: "Upload Raw Data",
        versions: "Manage Versions",
        logout: "Log Out",
        login: "Log In",
        spanish: "Español",
    },

    es: {
        navigation: "Navegación",
        dashboard: "Datos demográficos",
        insights: "Escuelas y bibliotecas",
        summary: "Resumen general",
        upload: "Subir Datos sin Procesar",
        versions: "Administrar Versiones",
        logout: "Cerrar Sesión",
        login: "Iniciar Sesión",
        english: "English",
    },



}
   const t = translations[language]

    const publicNavItems = [
        { path: "/dashboard-insights", label: t.insights },
    ]

    const protectedNavItems = [
        { path: "/dashboard", label: t.dashboard },
        { path: "/summary", label: t.summary },
        { path: "/upload", label: t.upload },
        { path: "/manage-versions", label: t.versions },
    ]

    const navItems = !loading && user
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
            aria-expanded={showDesktopMenu}
            aria-controls="desktop-sidebar"
        >
            ☰
        </Button>

            {/* Desktop Sidebar */}
            <div id="desktop-sidebar" hidden={!showDesktopMenu} className={`d-none d-md-block position-fixed top-0 start-0 sidebar-container ${showDesktopMenu ? "sidebar-open" : "sidebar-closed"}`}>
                <Navbar bg="dark" variant="dark" className="flex-column align-items-start" style={{ width: "100%", height: "100%" }}>
                    <div className="w-100 text-center">
                        {/*https://www.satisfeed.org/ */}
                        <a href="https://www.satisfeed.org/" target="_blank" rel="noopener noreferrer" className="p-0 d-block">
                            <img
                                src="/Satisfeed logo white.png"
                                alt="Satisfeed logo"
                                className="satisfeed-sidebar-logo img-fluid mb-3"
                            />
                        </a>
                    </div>
                    <Navbar.Brand className="sidebar-navigation-title mb-4 w-100">{t.navigation}</Navbar.Brand>
                    <Nav className="flex-column w-100">
                        {navItems.map((item) => (
                            <NavLink key={item.path} href={item.path} active={pathname === item.path}>
                                {item.label}
                            </NavLink>
                        ))}
                        <Button variant="outline-light" className="mt-2" onClick={() => setLanguage(language === "en" ? "es" : "en")} >
                            {language === "en" ? "Español" : "English"}
                        </Button>
                        {!loading && (user ? (
                            <Button variant="outline-light" className="mt-4" onClick={handleLogout}>
                                {t.logout}
                            </Button>
                        ) : (
                            <Button variant="outline-light" className="mt-4" onClick={() => { window.location.href = "/login" }}>
                                {t.login}
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
                aria-expanded={showMobileMenu}
                aria-controls="mobile-sidebar"
            >
                ☰
            </Button>

            {/* Mobile Offcanvas Sidebar */}
            <Offcanvas
                id="mobile-sidebar"
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
                    <Offcanvas.Title>{t.navigation}</Offcanvas.Title>
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
                        <Button variant="outline-light" className="mt-2" onClick={() => setLanguage(language === "en" ? "es" : "en")} >
                            {language === "en" ? "Español" : "English"}
                        </Button>
                        {!loading && (user ? (
                            <Button
                                variant="outline-light"
                                className="mt-4"
                                onClick={() => {
                                    setShowMobileMenu(false)
                                    handleLogout()
                                }}
                            >
                                {t.logout}
                            </Button>
                        ) : (
                            <Button
                                variant="outline-light"
                                className="mt-4"
                                onClick={() => { window.location.href = "/login" }}
                            >
                                {t.login}
                            </Button>
                        ))}
                    </Nav>
                </Offcanvas.Body>
            </Offcanvas>
        </>
    )
}