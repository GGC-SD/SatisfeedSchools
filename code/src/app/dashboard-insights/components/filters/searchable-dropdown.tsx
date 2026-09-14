"use client";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxButton,
} from "@headlessui/react";
import { useState, useEffect } from "react";
import { parse } from "csv-parse/browser/esm/sync";

type CountyData = Record<string, string[]>;

// prop to notify parent of selection 
type Props = {
  onBoundarySelect?: (
    sel:
      | { type: "county"; countyName: string }
      | { type: "zip"; countyName: string; zcta: string }
  ) => void;
  onClearBoundary?: () => void;
};

export default function SearchableDropdown({ onBoundarySelect, onClearBoundary }: Props) {
  const [data, setData] = useState<CountyData>({});
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [countyQuery, setCountyQuery] = useState("");
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [zipQuery, setZipQuery] = useState("");

  useEffect(() => {
    fetch("/data/Zip_City_Mapping.csv")
      .then((res) => res.text())
      .then((csvText) => {
        const response = parse(csvText, {
          columns: true,
          skip_empty_lines: true,
        });
        const grouped: CountyData = {};

        response.forEach((row: any) => {
          const county = row.county?.trim();
          const zip = row.zip?.trim();
          if (county && zip) {
            if (!grouped[county]) grouped[county] = [];
            grouped[county].push(zip);
          }
        });

        // Sort county’s ZIPs numerically
        Object.keys(grouped).forEach(
          (county) =>
            (grouped[county] = grouped[county].sort(
              (a, b) => parseInt(a) - parseInt(b)
            ))
        );

        console.log("Grouped counties:", grouped);

        setData(grouped);
      })
      .catch((err) => console.error("Error loadinig CSV:", err));
  }, []);

  useEffect(() => {
    setSelectedZip(null);
    setZipQuery(""); // clears the ZIP input box
  }, [selectedCounty]);

  // notify parent on county-only selection
  useEffect(() => {
    if (selectedCounty && !selectedZip) {
      onBoundarySelect?.({ type: "county", countyName: selectedCounty });
    }
  }, [selectedCounty, selectedZip, onBoundarySelect]);

  // notify parent on zip selection (with its county)
  useEffect(() => {
    if (selectedCounty && selectedZip) {
      onBoundarySelect?.({
        type: "zip",
        countyName: selectedCounty,
        zcta: String(selectedZip).padStart(5, "0"),
      });
    }
  }, [selectedCounty, selectedZip, onBoundarySelect]);

  // Sort counties alphabetically (A → Z)
  const countyNames = Object.keys(data).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );

  const filteredCounty = countyNames
    .filter((c) => c.toLowerCase().includes(countyQuery.toLowerCase()))
    .slice(0, 300);

  const zipOptions = selectedCounty ? data[selectedCounty] : [];
  const filteredZips = zipOptions.filter((z) => z.includes(zipQuery));

  // handlers for Clear buttons
  const clearZip = () => {
    // clearing ZIP falls back to county selection (triggers county effect above)
    setSelectedZip(null);
    setZipQuery("");
  };

  const clearCounty = () => {
    // clearing county wipes both, and tells parent to clear the map overlay
    setSelectedZip(null);
    setZipQuery("");
    setSelectedCounty(null);
    setCountyQuery("");
    onClearBoundary?.(); // parent sets boundarySelection -> null
  };

  return (
    <div className="flex flex-col gap-4">
      {/* County dropdown */}
      <div className="flex flex-col xl:flex-row gap-3 xl:gap-0 w-full items-stretch">
        <div className="w-full 3xl:w-10/12">
          <Combobox value={selectedCounty} onChange={setSelectedCounty}>
            <div className="relative">
              <ComboboxInput
                className="dropdown-basic"
                displayValue={(c) => (c as string) || ""}
                onChange={(e) => setCountyQuery(e.target.value)}
                onFocus={() => setCountyQuery("")}
                placeholder="Select a county..."
              />
              <ComboboxButton className="absolute right-4 top-3 text-neutral-500 hover:text-neutral-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </ComboboxButton>
              <ComboboxOptions className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                {filteredCounty.map((county) => (
                  <ComboboxOption
                    key={county}
                    value={county}
                    className={({ active }) =>
                      `cursor-pointer px-3 py-2 ${active ? "bg-[#FF9700]" : ""}`
                    }
                  >
                    {county}
                  </ComboboxOption>
                ))}
              </ComboboxOptions>
            </div>
          </Combobox>
        </div>
        <div className="flex items-center justify-end xl:w-[12rem]">
              <button className="button-insights w-full h-full text-nowrap overflow-hidden" onClick={clearCounty}>Clear County</button>
        </div>
      </div>

      {/* ZIP dropdown */}
      <div className="flex flex-col xl:flex-row gap-3 xl:gap-0 w-full items-stretch">
        <div className="w-full 3xl:w-10/12">
          <Combobox value={selectedZip} onChange={setSelectedZip}>
            <div className="relative">
              <ComboboxInput
                className="dropdown-basic"
                displayValue={(z) => (z as string) || ""}
                onChange={(e) => setZipQuery(e.target.value)}
                onFocus={() => setZipQuery("")}
                placeholder="Select a ZIP code"
              />
              <ComboboxButton className="absolute right-4 top-3 text-neutral-500 hover:text-neutral-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </ComboboxButton>
              <ComboboxOptions className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                {filteredZips.map((zip) => (
                  <ComboboxOption
                    key={zip}
                    value={zip}
                    className={({ active }) =>
                      `cursor-pointer px-3 py-2 ${active ? "bg-yellow-400" : ""}`
                    }
                  >
                    {zip}
                  </ComboboxOption>
                ))}
              </ComboboxOptions>
            </div>
          </Combobox>
        </div>
        <div className="flex items-center justify-end xl:w-[12rem]">
              <button className="button-insights w-full h-full text-nowrap overflow-hidden" onClick={clearZip}>Clear ZIP</button>
        </div>
      </div>
    </div>
  );
}