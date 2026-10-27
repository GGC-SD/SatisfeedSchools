"use client";
import { useAuth } from "@/firebase/authContext";

export default function Header() {
    const { role, roleLoading, roleError } = useAuth();

    return(
        <div className="dashboard-header">
            {/* <img src="Satisfeed logo white.png" alt="Satisfeed Logo" className="flex justify-self-center sm:justify-self-start h-24 w-auto" /> */}
            <h1 className="text-5xl font-black">Satisfeed: Served Homes near Schools and Libraries</h1>
            <p>{roleLoading ? "Checking permissions..." : roleError || `Role: ${role}`}</p>
        </div>
    );
}