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
        <div className="flex">
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
                (Coming soon)
            </button>
        </div>
        
    );
}