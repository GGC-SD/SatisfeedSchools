"use client";
import Tabs from "./tabs";
import Panel from "./panel";
import { useState } from "react";

export default function DashboardContentDisplay() {
    const [selectedTab, setSelectedTab] = useState(1);

    const handleTabSelect = (tab: number) => {
        setSelectedTab(tab);
    };

    return(
        <div className="flex flex-col md:px-10 py-6">
            <Tabs onSelect={handleTabSelect} />
            <Panel currentTab={selectedTab} />
        </div>
    );
}