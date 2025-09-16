"use client";
import SchoolDisplay from "./school-display";

type PanelProps = {
    currentTab: number;
}

export default function Panel({currentTab}: PanelProps) {

    return(
        <div className="w-full h-fit bg-neutral-200 drop-shadow-lg">
            {currentTab == 1 ? 
            (
            <SchoolDisplay />
            ) : (
            <div className="h-96">
                
            </div>
            )}
        </div>
    );
}