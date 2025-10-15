"use client";
import CountyZIPDropdown from "../county-zip-dropdown";
import DataCard from "../data-card";
import SearchableDropdown from "../searchable-dropdown";
import DashboardSchoolsMap from "./dashboard-schools-map";

export default function SchoolDisplay() {

  return(
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-3/5">
          <div className="min-h-[40rem] lg:min-h-fit h-full child-component-borders">
            <DashboardSchoolsMap className="w-full min-h-[40rem] lg:min-h-fit h-full" />
          </div>
        </div>
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          <SearchableDropdown/>
          <DataCard />
        </div>
      </div>
    </div>
  );
}
