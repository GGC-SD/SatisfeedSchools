import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, ComboboxButton } from '@headlessui/react'
import { useState, useEffect } from 'react'
import Papa from "papaparse";

type CountyData = Record<string, string[]>;

export default function SearchableDropdown() {
    const [data, setData] = useState<CountyData>({});
    const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
    const [countyQuery, setCountyQuery] = useState('')
    const [selectedZip, setSelectedZip] = useState<string | null>(null);
    const [zipQuery, setZipQuery] = useState('')


    useEffect(() => {
        fetch("/data/Zip_City_Mapping.csv")
            .then((res) => res.text())
            .then((csvText) => {
                const parse = Papa.parse(csvText, { header: true });
                const grouped: CountyData = {};

                parse.data.forEach((row: any) => {
                    const county = row.county?.trim();
                    const zip = row.zip?.trim();
                    if (county && zip) {
                        if (!grouped[county]) grouped[county] = [];
                        grouped[county].push(zip);
                    }
                });
                console.log("Grouped counties:", grouped);

                setData(grouped);
            })
            .catch((err) => console.error("Error loadinig CSV:", err));
    }, []);

    //countyNames reads the JSON object keys as names.
    const countyNames = Object.keys(data);
    const filteredCounty = countyNames
        .filter((c) => c.toLowerCase().includes(countyQuery.toLowerCase()))
        .slice(0, 300);

    const zipOptions = selectedCounty ? data[selectedCounty] : [];
    const filteredZips = zipOptions
        .filter((z) => z.includes(zipQuery));


    return (
        <div className="p-4 space-y-4">
            {/* County dropdown */}
            <Combobox value={selectedCounty} onChange={setSelectedCounty}>
                <div className="relative">
                    <ComboboxInput
                        className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2"
                        displayValue={(c) => (c as string) || ""}
                        onChange={(e) => setCountyQuery(e.target.value)}
                        onFocus={() => setCountyQuery("")}
                        placeholder="Select a county..."
                    />
                    <ComboboxButton className="absolute right-2 text-gray-500 hover:text-gray-700">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </ComboboxButton>
                    <ComboboxOptions className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                        {filteredCounty.map((county) => (
                            <ComboboxOption
                                key={county}
                                value={county}
                                className={({ active }) =>
                                    `cursor-pointer px-3 py-2 ${active ? "bg-blue-100" : ""
                                    }`
                                }
                            >
                                {county}
                            </ComboboxOption>
                        ))}
                    </ComboboxOptions>
                </div>
            </Combobox>

            {/* ZIP dropdown */}
            <Combobox value={selectedZip} onChange={setSelectedZip}>
                <div className="relative">
                    <ComboboxInput
                        className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2"
                        displayValue={(z) => (z as string) || ""}
                        onChange={(e) => setZipQuery(e.target.value)}
                        onFocus={() => setZipQuery("")}
                        placeholder="Select a ZIP code"
                    />
                    <ComboboxButton className="absolute right-2 text-gray-500 hover:text-gray-700">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </ComboboxButton>
                    <ComboboxOptions className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                        {filteredZips.map((zip) => (
                            <ComboboxOption
                                key={zip}
                                value={zip}
                                className={({ active }) =>
                                    `cursor-pointer px-3 py-2 ${active ? "bg-blue-100" : ""
                                    }`
                                }
                            >
                                {zip}
                            </ComboboxOption>
                        ))}
                    </ComboboxOptions>
                </div>
            </Combobox>
        </div>
    );
}