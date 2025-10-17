"use client"

import {useState} from "react";

const counties= {
    Gwinnett: ["30024", "30043", "30044", "30045"],
    Fulton: ["30303", "30305", "30306"],
    Dekalb: ["30030", "30033", "30034"],
};

/**
 * This component creates two dropdown menus: County and ZIP code
 * Uses selected county to display list of ZIP codes within the selected county in the ZIP code
 * dropdown menu.
 * 
 * @returns two dropdown menus: County and ZIP code
 */
export default function CountyZIPDropdown() {
    const [selectedCounty , setSelectedCounty] = useState("Gwinnett");
    const [selectedZIP, setSelectedZIP] = useState(counties["Gwinnett"][0]);
    
    
    const zipCodes = counties[selectedCounty] || [];

    const handleCountyChange =(e) => {
        const newCounty = e.target.value;
        setSelectedCounty(newCounty);
        setSelectedZIP(counties[newCounty][0]); //resets zip when county changes
    };

    return (
        <div className="w-full">
        <div className="dropdown-container w-full">
            <label className="w-1/3 font-bold text-xl">County</label> 
            <select
                value={selectedCounty}
                onChange={handleCountyChange}
                className="w-2/3 text-lg px-1 py-0.5 child-component-borders"
            >
            {Object.keys(counties).map((county) => (
                <option key={county} value={county}>
                    {county}
                </option>
            ))}
            </select>
        </div>

        <div className="dropdown-container mt-2 w-full">
        <label className="w-1/3 font-bold text-xl">ZIP Code</label>
        <select
        value={selectedZIP}
        onChange={(e) => setSelectedZIP(e.target.value)}
        className="w-2/3 text-lg px-1 py-0.5 child-component-borders"
        >
            {zipCodes.map((zip) => (
                <option key={zip} value={zip}>
                    {zip}
                </option>
            ))}
        </select>
        </div>
        </div>
    );
}
