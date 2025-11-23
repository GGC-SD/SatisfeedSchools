"use client";

/**
 * Represents a county or ZIP selection from the dropdown.
 */
type Selection =
  | { type: "county"; countyName: string }
  | { type: "zip"; countyName: string; zcta: string }
  | null;

/** Existing school breakdown shape (unchanged). */
type SchoolsBreakdown = {
  total: number;
  elementary: number;
  middle: number;
  high: number;
  other: number;
};

/**
 * Optional, fully generic section format for future metrics.
 * Example:
 * sections={[
 *   { title: "Hospitals", rows: [{ label: "Total", value: 5 }] },
 *   { title: "Parks", rows: [{ label: "Regional", value: 3 }, { label: "Local", value: 12 }] }
 * ]}
 */
type GenericSection = {
  title: string;
  rows: Array<{ label: string; value: number | string | null | undefined }>;
};

/**
 * Props accepted by CountyStatsCard
 *
 * @property selection       Active county/ZIP selection (or null if none)
 * @property households      Total households within the area (nullable)
 * @property schools         Optional school breakdown — shown if provided
 * @property librariesTotal  Optional total number of libraries — shown if provided
 * @property sections        Optional extra generic sections — shown if provided
 */
type Props = {
  selection: Selection;
  households: number | null;
  schools?: SchoolsBreakdown | null;
  librariesTotal?: number | null;
  sections?: GenericSection[];
};

/**
 * CountyStatsCard (generic)
 *
 * Shows:
 *  - Header (County + ZIP)
 *  - Statistics: Households
 *  - Schools (if provided)
 *  - Libraries (total only, if provided)
 *  - Any additional generic sections (if provided)
 */
export default function CountyStatsCard({
  selection,
  households,
  schools,
  librariesTotal,
  sections = [],
}: Props) {
  // Determine header content
  const heading =
    selection?.type === "zip"
      ? { county: selection.countyName, zip: selection.zcta }
      : selection?.type === "county"
      ? { county: selection.countyName, zip: "" }
      : null;

  // Empty state
  if (!heading) {
    return (
      <div className="min-w-[150px] min-h-44 lg:min-h-[10rem] bg-white child-component-borders flex items-center justify-center">
        <h1 className="text-lg text-neutral-700">Select a County To Begin</h1>
      </div>
    );
  }

  // Format helper (numbers with commas; strings passthrough; null → "—")
  const fmt = (v: number | string | null | undefined) => {
    if (typeof v === "number" && Number.isFinite(v)) return v.toLocaleString();
    if (typeof v === "string") return v;
    return "—";
  };

  return (
    <div className="min-w-[150px] min-h-44 lg:min-h-[10rem] bg-white child-component-borders">
      <div className="p-3 w-full h-full flex flex-col uppercase">
        {/* Header Section: County + ZIP */}
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

        {/* Core Stats */}
        <div className="flex flex-col w-full text-md">
          {/* Households */}
          <span className="font-bold text-xl mb-1">Statistics</span>
          <div className="flex justify-between mb-2">
            <div className="font-medium">Households:</div>
            <div className="normal-case">{fmt(households)}</div>
          </div>

          {/* Schools (optional) */}
          {schools && (
            <>
              <span className="font-bold text-xl mb-1">Schools</span>
              <div className="flex justify-between">
                <div className="font-medium">Total Schools:</div>
                <div className="normal-case">{fmt(schools.total)}</div>
              </div>
              <div className="flex justify-between">
                <div className="font-medium">Elementary:</div>
                <div className="normal-case">{fmt(schools.elementary)}</div>
              </div>
              <div className="flex justify-between">
                <div className="font-medium">Middle:</div>
                <div className="normal-case">{fmt(schools.middle)}</div>
              </div>
              <div className="flex justify-between">
                <div className="font-medium">High:</div>
                <div className="normal-case">{fmt(schools.high)}</div>
              </div>
              <div className="flex justify-between">
                <div className="font-medium">Other:</div>
                <div className="normal-case">{fmt(schools.other)}</div>
              </div>
            </>
          )}

          {/* Libraries (optional, total only) */}
          {typeof librariesTotal !== "undefined" && (
            <>
              <span className="font-bold text-xl mb-1 mt-2">Libraries</span>
              <div className="flex justify-between">
                <div className="font-medium">Total Libraries:</div>
                <div className="normal-case">{fmt(librariesTotal)}</div>
              </div>
            </>
          )}

          {/* Additional generic sections (optional) */}
          {sections.map((sec, idx) => (
            <div key={`${sec.title}-${idx}`} className="mt-2">
              <span className="font-bold text-xl mb-1">{sec.title}</span>
              {sec.rows.map((row, i) => (
                <div key={i} className="flex justify-between">
                  <div className="font-medium">{row.label}:</div>
                  <div className="normal-case">{fmt(row.value)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}