"use client";
import Tabs from "./tabs";
import Panel from "./panel";

export default function DashboardContentDisplay() {

    return(
        <div className="flex flex-col px-10 py-6">
            <Tabs />
            <Panel />
        </div>
    );
}