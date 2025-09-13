"use client";
import CountyZIPDropdown from "./CountyZIPDropdown";
import DataCard from "./DataCard";

export default function SchoolDisplay() {

    return(
        <div className="p-4">
            <div className="flex">
                <div className="w-2/3">
                    map
                </div>
                <div className="w-1/3 flex flex-col gap-4">
                    <CountyZIPDropdown />
                    <DataCard />
                </div>
            </div>
        </div>
    );
}