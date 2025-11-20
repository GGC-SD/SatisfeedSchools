"use client";
import LibraryDisplay from "../displays/library-display";
import SchoolDisplay from "../displays/school-display";

type PanelProps = {
  currentTab: number;
};

export default function Panel({ currentTab }: PanelProps) {
  return (
    <div className="w-full h-fit rounded-b-md rounded-r-md bg-neutral-200 drop-shadow-lg">
      {currentTab == 1 ? <SchoolDisplay /> : <LibraryDisplay />}
    </div>
  );
}
