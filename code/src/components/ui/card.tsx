import { Card as BootstrapCard } from "react-bootstrap";

export function Card({ children }: { children: React.ReactNode }) {
    return <BootstrapCard className="shadow-sm p-3">{children}</BootstrapCard>;
}

export function CardContent({ children }: { children: React.ReactNode }) {
    return <BootstrapCard.Body>{children}</BootstrapCard.Body>;
}
