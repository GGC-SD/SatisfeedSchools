/**
 * Full pipeline endpoint:
 *  CSV -> parse -> filter -> dedupe -> geocode unique -> round & bin -> GeoJSON (heatmap).
 *
 * Body: multipart/form-data with field "file" (CSV)
 * Env:  LOCATIONIQ_KEY must be set
 *
 * Options (query params – optional):
 *  - cap=1   : cap per-address weight to 1 before geocoding
 *  - rps=2   : requests per second throttle to LocationIQ (default 2)
 *  - k=5     : k-anonymity threshold; drop bins with weight < k (default: none)
 */
export const runtime = "nodejs"; // ensure fs is allowed (not Edge)

import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { parseCSV } from "../parse";
import { filterAndFormatAddressWithWhy } from "../filters";
import { buildAddressCounts, binByRounded, type Geocoded } from "../aggregate";
import { geocodeBatch } from "../locationiq";
import { toFeatureCollection } from "../geojson";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const cap = url.searchParams.get("cap") === "1";
    const rps = Number(url.searchParams.get("rps") || "2");
    const k   = url.searchParams.get("k");
    const kNum = k ? Number(k) : undefined;

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No CSV uploaded" }, { status: 400 });
    }

    // Read CSV
    const bytes = await file.arrayBuffer();
    const text = new TextDecoder().decode(bytes);

    // Parse rows
    const rows = parseCSV(text);

    // Clean -> addresses
    const cleaned: string[] = [];
    for (const row of rows) {
      const res = filterAndFormatAddressWithWhy(row);
      if (res.ok) cleaned.push(res.address);
    }

    // Dedupe before geocoding
    const counts = buildAddressCounts(cleaned, cap);

    // Geocode unique addresses
    const geocodedMap = await geocodeBatch(counts, rps);

    // Merge geocodes + counts WITHOUT keeping addresses (skip failures)
    const merged: Geocoded[] = [];
    for (const [addr, count] of counts.entries()) {
        const ll = geocodedMap.get(addr);
        if (!ll) continue; // failed geocode
        merged.push({ lat: ll.lat, lon: ll.lon, count });
    }
    // clear structures with PII (addresses)
    counts.clear();
    geocodedMap.clear();

    // Round & bin for heatmap
    const bins = binByRounded(merged, kNum);

    // Build GeoJSON
    const fc = toFeatureCollection(bins);

    // TODO: Change this to be used in Firebase DB ==================================
    // Persist GeoJSON locally under /public/data
    const outDir = path.join(process.cwd(), "public", "data");
    await fs.mkdir(outDir, { recursive: true });

    // build timestammped filename
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fname = `heatmap-${stamp}-k${kNum ?? 0}-r${rps}-cap${cap ? 1 : 0}.geojson`;
    const filePath = path.join(outDir, fname);

    // write file
    await fs.writeFile(filePath, JSON.stringify(fc));

    // public URL
    const geojsonUrl = `/data/${fname}`;

    // ================================================================================

    // Respond: minimal meta + FeatureCollection
    return NextResponse.json({
      ok: true,
      filename: (file as File).name,
      uniqueAddresses: counts.size,
      geocoded: merged.length,
      bins: bins.length,
      kAnonymity: kNum ?? null,
      geojsonUrl
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Pipeline failed" }, { status: 500 });
  }
}