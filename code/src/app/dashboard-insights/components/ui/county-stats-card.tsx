"use client";

/**
 * Represents a county or ZIP selection from the dropdown.
 * - `county`: always required
 * - `zcta`: only provided when a ZIP is selected
 * - `null`: when nothing has been selected yet
 */
type Selection =
  | { type: "county"; countyName: string }
  | { type: "zip"; countyName: string; zcta: string }
  | null;

/**
 * Breakdown of school counts for a given area.
 */
type SchoolsBreakdown = {
  total: number;
  elementary: number;
  middle: number;
  high: number;
  other: number;
};

/**
 * Props accepted by CountyStatsCard
 *
 * @property selection   The active county or ZIP selection (or null if none)
 * @property households  Total households within the selected area
 * @property schools     Breakdown of schools within the selected area
 */
type Props = {
  selection: Selection;
  households: number | null;
  schools: SchoolsBreakdown | null;
};

/**
 * CountyStatsCard
 *
 * Displays summary statistics for the currently selected county or ZIP:
 *  - County name and ZIP (if applicable)
 *  - Number of households
 *  - School breakdown (total + type categories)
 *
 * Behavior:
 *  - When no county/ZIP is selected → shows a "Select a County To Begin" placeholder.
 *  - When a county is selected → shows county-wide statistics.
 *  - When a ZIP within that county is selected → shows ZIP-specific statistics.
 */
export default function CountyStatsCard({ selection, households, schools }: Props) {
  /**
   * Determine what to show in the card header.
   * - For ZIP selections → include both county + ZIP
   * - For county-only → include just county
   * - For null → show placeholder state
   */
  const heading =
    selection?.type === "zip"
      ? { county: selection.countyName, zip: selection.zcta }
      : selection?.type === "county"
      ? { county: selection.countyName, zip: "" }
      : null;

  /**
   * Empty-state fallback: user hasn’t selected any county or ZIP yet.
   */
  if (!heading) {
    return (
      <div className="min-w-[150px] min-h-44 lg:min-h-[10rem] bg-white child-component-borders flex items-center justify-center">
        <h1 className="text-lg text-neutral-700">Select a County To Begin</h1>
      </div>
    );
  }

  /**
   * Helper to format numeric values safely.
   * - Adds commas for readability (e.g., 1234 → "1,234")
   * - Returns "—" when the value is null or undefined
   */
  const fmt = (n: number | null) =>
    typeof n === "number" && Number.isFinite(n) ? n.toLocaleString() : "—";


  return (
    <div className="min-w-[150px] min-h-44 lg:min-h-[10rem] bg-white child-component-borders">
      <div className="p-3 w-full h-full flex flex-col uppercase">
        {/* Header Section: County + ZIP info */}
        <div className="flex flex-col w-full mb-2 text-xl">
          <div className="flex flex-col xl:flex-row xl:justify-between">
            <div className="font-bold">County:</div>
            <div className="normal-case">{heading.county}</div>
          </div>
          <div className="flex flex-col xl:flex-row xl:justify-between">
            <div className="font-bold">ZIP:</div>
            <div className="normal-case">{heading.zip || "—"}</div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="flex flex-col w-full text-md">
          {/* Household count */}
          <span className="font-bold text-xl mb-1">Statistics</span>
          <div className="flex justify-between mb-2">
            <div className="font-medium">Households:</div>
            <div className="normal-case">{fmt(households)}</div>
          </div>

          {/* School breakdown */}
          <span className="font-bold text-xl mb-1">Schools</span>
          <div className="flex justify-between">
            <div className="font-medium">Total Schools:</div>
            <div className="normal-case">{fmt(schools?.total ?? null)}</div>
          </div>
          <div className="flex justify-between">
            <div className="font-medium">Elementary:</div>
            <div className="normal-case">{fmt(schools?.elementary ?? null)}</div>
          </div>
          <div className="flex justify-between">
            <div className="font-medium">Middle:</div>
            <div className="normal-case">{fmt(schools?.middle ?? null)}</div>
          </div>
          <div className="flex justify-between">
            <div className="font-medium">High:</div>
            <div className="normal-case">{fmt(schools?.high ?? null)}</div>
          </div>
          <div className="flex justify-between">
            <div className="font-medium">Other:</div>
            <div className="normal-case">{fmt(schools?.other ?? null)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}