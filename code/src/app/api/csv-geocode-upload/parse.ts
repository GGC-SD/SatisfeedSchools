/**
 * CSV Parser Module
 *
 * Responsibilities:
 *  - Converts raw CSV text into an array of row objects.
 *  - Uses Papa Parse for reliable header-based parsing.
 *  - Skips empty lines and trims extra spaces.
 *  - Ensures all values are strings (trimmed) or undefined.
 *
 * Output:
 *  - Each row is a Record<string, string|undefined>
 *    keyed by the original column headers (trimmed).
 *
 * This is intentionally generic: it doesn’t know anything
 * about addresses – it just parses the CSV into usable rows.
 */
import Papa from "papaparse";   // npm i papaparse

export type RawRow = Record<string, string | undefined>;

export function parseCSV(text: string): RawRow[] {
  const { data, errors } = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (errors?.length) {
    // TODO: handle parse errors
  }

  const cleaned = (data as RawRow[]).map((row) => {
    const out: RawRow = {};
    for (const k of Object.keys(row)) {
      const v = row[k];
      out[k] = typeof v === "string" ? v.trim() : undefined;
    }
    return out;
  });

  // drop rows with no values
  return cleaned.filter((row, i) =>
    Object.values(row).some((v) => v && v.length > 0)
  );
}