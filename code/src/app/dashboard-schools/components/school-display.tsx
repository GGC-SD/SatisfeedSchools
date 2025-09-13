"use client";
import DashboardSchoolsMap from "./dashboard-schools-map";

export default function SchoolDisplay() {
  return (
    <div className="h-full p-4">
      <div className="h-full">
        <DashboardSchoolsMap className="w-[65%] h-full"></DashboardSchoolsMap>
      </div>
    </div>
  );
}
