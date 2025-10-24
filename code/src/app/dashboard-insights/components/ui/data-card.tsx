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
export default function DataCard({ title, value, record, onClear }: DataCardProps) {

     if (!record && !title) {
    return (
      <div className="min-w-[150px] min-h-96 lg:min-h-[40rem] bg-white child-component-borders flex justify-center items-center">
        <h1 className="text-lg text-neutral-700">Select a School To Begin</h1>
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
    <div className="min-w-[150px] min-h-96 lg:min-h-[40rem] bg-white child-component-borders">
      <div className="p-4 w-full h-full flex flex-col">
        <h3 className="text-2xl font-bold text-center">{title}</h3>

        <div className="flex">
          <p className="mt-3 text-xl">Households: {value}</p>
          <p className="text-sm text-neutral-500 flex place-self-end">&nbsp;(approximate)</p>
        </div>

        {/* Rendering fields in the desired order with labels*/}
        {record ? (
          <div className="mt-3 text-xl">
            {displayOrder.map((key) => {
              const val = record[key];
              if (!val) return null;
              return (
                <p key={key} className="text-neutral-700">
                  <strong>{fieldLabels[key] || key}:</strong> {String(val)}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="text-neutral-500 mt-4">No additional data found.</p>
        )}

        <div className="mt-auto self-end flex">
          <button
            type="button"
            onClick={onClear}
            className="button-insights"
            aria-label="Clear selected school"
          >
            Clear Selected School
          </button>
        </div>
      </div>
    </div>
  );
}