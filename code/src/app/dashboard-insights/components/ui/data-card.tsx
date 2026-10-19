"use client"

import { SchoolRecord } from "@/data/schoolTypes";
import { LibraryDoc } from "@/data/libraryTypes";
import { PantryDoc } from "@/data/pantryTypes";

/**
 * Props for the DataCard.
 *
 * @property title     Display name of the currently selected school. When empty, the
 *                     "Select a School To Begin" placeholder is shown instead of the card body.
 * @property value     Number of households within the map’s current selected radius.
 * @property onClear   Optional handler invoked when the "Clear Selected School" button is clicked.
 *                     Intended to call the map's imperative `clearSelection()` from the parent.
 */
type DataCardProps ={
  title: string;
  value: number;
  record: SchoolRecord | LibraryDoc | PantryDoc | null;
  type: string;
  onClear?: () => void;
};

/**
 * DataCard
 *
 * Presentation-only component that displays the current school or library selection summary.
 * When a school or library is selected, shows its name and the computed household count.
 * The "Clear Selected School/Library" button (if `onClear` is provided) triggers the parent’s
 * clear logic (e.g., calls the map’s `clearSelection()` via ref). No internal state here.
 *
 * @returns A card reflecting the selected school's/librarie's data, or a placeholder when none is selected.
 */
export default function DataCard({ title, value, record, type, onClear }: DataCardProps) {

  const normalizedType = type.toLowerCase();

  const isSchool = normalizedType === "school";
  const isLibrary = normalizedType === "library";
  const isPantry = normalizedType === "pantry";

  const typeLabel = isSchool
    ? "School"
    : isLibrary
      ? "Library"
      : isPantry
        ? "Pantry"
        : type;

  if (!record && !title) {
    return (
      <div className="min-w-[150px] min-h-96 lg:min-h-[20rem] bg-white child-component-borders flex justify-center items-center p-4">
        <h1 className="text-lg text-neutral-700 text-center">
          Select a {typeLabel} To Begin
        </h1>
      </div>
    );
  }

  const displayOrder: string[] = isSchool
    ? [
        "address",
        "city",
        "county",
        "zip",
        "enrollment",
        "phone",
      ]
    : isLibrary
      ? [
          "address",
          "city",
          "county",
          "zip",
          "phone",
          "hours",
          "website",
        ]
      : [
          "organization",
          "address",
          "city",
          "state",
          "zip",
          "phone",
          "hours",
          "website",
          "resourceType",
          "dataSource",
          "lastVerifiedDate",
        ];

  const fieldLabels: Record<string, string> = {
    address: "Address",
    city: "City",
    county: "County",
    state: "State",
    zip: "ZIP Code",
    enrollment: "Enrollment",
    phone: "Phone Number",
    hours: "Hours",
    website: "Website",
    organization: "Organization",
    resourceType: "Resource Type",
    dataSource: "Data Source",
    lastVerifiedDate: "Last Verified",
  };

  const recordFields = record as unknown as Record<string, unknown>;

  return (
    <div className="min-w-[150px] min-h-36 lg:min-h-[20rem] bg-white child-component-borders">
      <div className="p-3 w-full h-full flex flex-col">
        <h3 className="text-2xl font-bold text-center">
          {title || `Selected ${typeLabel}`}
        </h3>

        <div className="flex mt-2 text-md flex-col xl:flex-row xl:justify-between">
          <div className="font-medium uppercase">Households:</div>

          <div className="flex mb-1">
            <div>{value.toLocaleString()}</div>
            <div className="text-sm text-neutral-500 flex place-self-end">
              &nbsp;(approximate)
            </div>
          </div>
        </div>

        {record ? (
          <div className="text-md">
            {displayOrder.map((key) => {
              const val = recordFields[key];

              return (
                <div
                  key={key}
                  className="flex flex-col xl:flex-row xl:justify-between mb-1 gap-x-2"
                >
                  <div className="font-medium uppercase">
                    {fieldLabels[key] || key}:
                  </div>

                  <div className="break-words">
                    {val === undefined || val === null || val === "" ? (
                      "Not Available"
                    ) : key === "website" && typeof val === "string" ? (
                      <a
                        href={
                          val.startsWith("http") ? val : `https://${val}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Visit Website
                      </a>
                    ) : key === "hours" && typeof val === "string" ? (
                      val
                    ) : (
                      String(val)
                    )}
                  </div>
                </div>
              );
            })}

            {isPantry && recordFields.sourceUrl ? (
              <div className="flex flex-col xl:flex-row xl:justify-between mb-1 gap-x-2">
                <div className="font-medium uppercase">Source:</div>
                <a
                  href={String(recordFields.sourceUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline break-words"
                >
                  View Source
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-neutral-500 mt-4">
            No additional data found.
          </p>
        )}

        <div className="mt-2 self-end flex">
          <button
            type="button"
            onClick={onClear}
            className="button-insights"
            aria-label={`Clear selected ${typeLabel.toLowerCase()}`}
          >
            Clear Selected {typeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}