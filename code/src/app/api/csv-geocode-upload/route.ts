/**
 * CSV geocode DRY-RUN endpoint (no external API calls).
 *
 * POST multipart/form-data with field "file" (CSV)
 *
 * Pipeline:
 *  CSV -> parse -> filter -> collect kept addresses -> dedupe & count (NO geocoding)
 *
 * Response:
 *  - ok
 *  - filename
 *  - totalRows
 *  - keptRows
 *  - droppedRows
 *  - duplicateRows           (keptRows - uniqueToSend)
 *  - uniqueToSend            (# of unique addresses that WOULD be sent to LocationIQ)
 *  - sample: [{ address, count }]
 */
import { NextRequest, NextResponse } from "next/server";
import { parseCSV } from "./parse";
import { filterAndFormatAddressWithWhy } from "./filters";
import { buildAddressCounts } from "./aggregate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No CSV uploaded" }, { status: 400 });
    }

    // Load CSV into memory
    const bytes = await (file as File).arrayBuffer();
    const text = new TextDecoder().decode(bytes);

    // Parse CSV rows
    const rows = parseCSV(text);

    // Filter -> collect kept addresses; count dropped
    const kept: string[] = [];
    let dropped = 0;

    for (const row of rows) {
      const res = filterAndFormatAddressWithWhy(row);
      if (res.ok) {
        kept.push(res.address);
      } else {
        dropped++;
      }
    }

    // Dedupe & count (what would be sent to the API)
    const counts = buildAddressCounts(kept, false);
    const uniqueToSend = counts.size;
    const duplicateRows = kept.length - uniqueToSend;

    // sample of what is sent to API + number of occurances per address
    const sample = Array.from(counts.entries())
      .sort((a, b) => {
        const c = b[1] - a[1];
        if (c !== 0) return c;
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 100)
      .map(([address, count]) => ({ address, count }));

    return NextResponse.json({
      ok: true,
      filename: (file as File).name,
      totalRows: rows.length,
      keptRows: kept.length,
      droppedRows: dropped,
      duplicateRows,
      uniqueToSend, // number of requests to LocationIQ
      sample,       // address strings + how many times they appeared
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Dry-run failed" },
      { status: 500 }
    );
  }
}