"use client";
import CountyZIPDropdown from "./CountyZIPDropdown";
import DataCard from "./DataCard";
import DashboardSchoolsMap from "./dashboard-schools-map";

export default function SchoolDisplay() {

    return(
        <div className="p-4">
            <div className="flex flex-row gap-4">
                <div className="w-8/12">
                    <div className="h-full">
                        <DashboardSchoolsMap className="w-full h-full"></DashboardSchoolsMap>
                    </div>
                </div>
                <div className="w-4/12 flex flex-col gap-4">
                    <CountyZIPDropdown />
                    <DataCard />
                </div>
            </div>
        </div>
    );
}

