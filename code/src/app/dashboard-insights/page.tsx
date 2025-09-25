"use client";
import SidebarNav from "@/components/ui/sidebar";
import Header from "@/app/dashboard-insights/components/header"
import DashboardContentDisplay from "./components/dashboard-content-display";
import React, { useEffect, useState } from "react";


export default function DashboardSchools() {

    return(
        <div className="flex">
            <SidebarNav />
            <div className="flex flex-col w-full">
                <Header />
                <DashboardContentDisplay />
            </div>
        </div>
    );
}