"use client"

import { SchoolRecord } from "@/data/schoolTypes";

/**
 * Props for the DataCard.
 *
 * @property title     Display name of the currently selected school. When empty, the
 *                     "Select a School To Begin" placeholder is shown instead of the card body.
 * @property value     Number of households within the map’s current selected radius.
 * @property onClear   Optional handler invoked when the "Clear Selected School" button is clicked.
 *                     Intended to call the map's imperative `clearSelection()` from the parent.
 */
type DataCardProps = {
  title: string;
  value: number;
  record: SchoolRecord | null;
  type: string;
  onClear?: () => void;
};

/**
 * DataCard
 *
 * Presentation-only component that displays the current school selection summary.
 * When a school is selected, shows its name and the computed household count.
 * The "Clear Selected School" button (if `onClear` is provided) triggers the parent’s
 * clear logic (e.g., calls the map’s `clearSelection()` via ref). No internal state here.
 *
 * @returns A card reflecting the selected school's data, or a placeholder when none is selected.
 */
export default function DataCard({ title, value, record, type, onClear }: DataCardProps) {

     if (!record && !title) {
    return (
      <div className="min-w-[150px] min-h-96 lg:min-h-[20rem] bg-white child-component-borders flex justify-center items-center">
        <h1 className="text-lg text-neutral-700">Select a {type} To Begin</h1>
      </div>
    );
  }

  const displayOrder: string[] = [
    "address",
    "city",
    "county",
    "zip",
    "enrollment",
    "phone",
  ];

  // Human-readable labels for display
  const fieldLabels: Record<string, string> = {
    address: "Address",
    city: "City",
    county: "County",
    zip: "ZIP Code",
    enrollment: "Enrollment",
    phone: "Phone Number",
  };

    return (
    <div className="min-w-[150px] min-h-36 lg:min-h-[20rem] bg-white child-component-borders">
      <div className="p-3 w-full h-full flex flex-col">
        <h3 className="text-2xl font-bold text-center">{title}</h3>

        <div className="flex mt-2 text-md flex-col xl:flex-row xl:justify-between">
            <div className="font-medium uppercase">Households: </div>
            <div className="flex mb-1">
              <div className="">{value}</div>
              <div className="text-sm text-neutral-500 flex place-self-end">&nbsp;(approximate)</div>
            </div> 
        </div>

        {/* Rendering fields in the desired order with labels*/}
        {record ? (
          <div className="text-md">
            {displayOrder.map((key) => {
              const val = (record as Record<string, unknown>)[key];
              if (!val) return null;
              return (
                <div key={key} className="flex flex-col xl:flex-row xl:justify-between mb-1">
                    <div className="font-medium uppercase">{fieldLabels[key] || key}:</div>
                    <div>{String(val)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-neutral-500 mt-4">No additional data found.</p>
        )}

        <div className="mt-2 self-end flex">
          <button
            type="button"
            onClick={onClear}
            className="button-insights"
            aria-label="Clear selected school"
          >
            Clear Selected {type}
          </button>
        </div>
      </div>
    </div>
  );
}