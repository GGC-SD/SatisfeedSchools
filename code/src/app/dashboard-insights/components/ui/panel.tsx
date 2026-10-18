"use client";
import LibraryDisplay from "../displays/library-display";
import SchoolDisplay from "../displays/school-display";

type PanelProps = {
  currentTab: number;
};

export default function Panel({ currentTab }: PanelProps) {
  return (
    <div className="w-full h-fit rounded-b-md rounded-r-md bg-neutral-200 drop-shadow-lg">
      <div hidden={currentTab != 1}>
        <SchoolDisplay />
      </div>

      <div hidden={currentTab != 2}>
        <LibraryDisplay />
      </div>
    </div>
  );
}
