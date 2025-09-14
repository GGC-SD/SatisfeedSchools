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
                className={`w-fit px-2 py-1 rounded-t-md font-bold
                    ${selectedTab == 1 ? 'bg-neutral-200' : 'bg-neutral-400' }`}
                onClick={handleSelectedTab}
            >
                Schools
            </button>
            <button 
                id="2"
                className={`w-fit px-2 py-1 rounded-t-md text-neutral-600
                    ${selectedTab == 2 ? 'bg-neutral-200' : 'bg-neutral-400' }`}
                onClick={handleSelectedTab}
            >
                (Coming soon)
            </button>
        </div>
        
    );
}