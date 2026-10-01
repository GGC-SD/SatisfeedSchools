"use client";

import { useState } from "react";

type TabsProp = {
    onSelect: (tab: number) => void;
};

export default function Tabs({onSelect}: TabsProp) {
    
    const [selectedTab, setSelectedTab] = useState(1);

    const handleSelectedTab = (e: any) => {
        const tab = e.target.id;
        setSelectedTab(tab);
        onSelect(tab);
    }

    return(
        <div className="flex text-lg">
            <button 
                id="1"
                className={`tab-basic
                    ${selectedTab == 1 ? 'tab-selected' : 'tab-unselected' }`}
                onClick={handleSelectedTab}
            >
                Schools
            </button>
            <button 
                id="2"
                className={`tab-basic
                    ${selectedTab == 2 ? 'tab-selected' : 'tab-unselected' }`}
                onClick={handleSelectedTab}
            >
                Libraries
            </button>
            <button
             /*Placeholder for pantry tab, make sure to add functionality for this tab in the future */
             /* Currently just redirect to libary map tab with all it functionality, */
             /* Create pantry-display.tsk, dashboard-pantry-map.tsk, PantryClusterOverlay.tsk*/
                id="3"
                className={`tab-basic
                    ${selectedTab == 3 ? 'tab-selected' : 'tab-unselected' }`} 
                onClick={handleSelectedTab}
            >
                Pantry
            </button>
        </div>
        
    );
}