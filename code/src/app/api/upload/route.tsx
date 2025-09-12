import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import {NextResponse} from "next/server";
import { db } from '@/firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(req: Request) {
    if (req.method !== 'POST') {
        return NextResponse.json({error: 'Method not allowed'}, {status: 405});
    }

    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
        return NextResponse.json({message: "Invalid content type"}, {status: 400});
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
        return NextResponse.json({message: "No valid CSV file uploaded"}, {status: 400});
    }

    if (!file.type.includes("csv")) {
        return NextResponse.json({message: "Only CSV files are allowed"}, {status: 400});
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
        const csvText = buffer.toString();

        let records = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        records = records.filter(row =>
            row['Case #'] || parseFloat(row['Amount']) || (row['Zip code'] && row['Zip code'].trim())
        );

        const zipRefPath = path.join(process.cwd(), 'public/data/Zip-City_Mapping.csv');
        const zipMapCsv = fs.readFileSync(zipRefPath, 'utf8');
        const zipMap = parse(zipMapCsv, {columns: true}).reduce((acc, row) => {
            const zip = row.zip.padStart(5, '0').trim();
            acc[zip] = row.City.trim();
            return acc;
        }, {});

        const raceColumns = [
            "Asian", "Black or African-American", "Hispanic, Latino, or Spanish Origin",
            "Middle Eastern or North African", "White", "American Indian", "Multiracial",
            "Pacific Islander", "Other", "Prefers not to answer", "Undisclosed",
            "A race/ethnicity not listed here"
        ];
        const employmentColumns = [
            "Full time", "Part time", "Unemployed-Seeking", "Unemployed-Not Seeking",
            "Disabled", "Retired", "Prefer not to answer", "College Student",
            "Not applicable", "Unemployed"
        ];

        //totalHelped = # of families Help
        let totalHelped = 0, totalAmount = 0, totalReached = 0;
        const unmatchedZip = {};
        const validDates = [];

        records.forEach(row => {
            const zip = (row['Zip code'] || '').padStart(5, '0');
            row['Zip code'] = zip;
            row.City = zipMap[zip] || 'Unmatched Zip';

            const amount = parseFloat(row['Amount']) || 0;
            totalAmount += amount;
            const householdSize = parseInt(row['Household Size']) || 0;
            totalReached += householdSize;
            if (row['Case #']) totalHelped++;

            if (row.City === 'Unmatched Zip') {
                unmatchedZip[zip] = (unmatchedZip[zip] || 0) + 1;
            }

            let race = 'Unknown';
            for (const col of raceColumns) {
                if ((row[col] || '').trim().toUpperCase() === 'YES') {
                    race = col;
                    break;
                }
            }
            row.Race = race;

            const income = parseFloat(row['Household Income']);
            row['Income Bin'] = isNaN(income) ? 'Unknown' :
                income < 25000 ? '0-25K' :
                    income < 50000 ? '25K-50K' :
                        income < 75000 ? '50K-75K' :
                            income < 100000 ? '75K-100K' :
                                income < 125000 ? '100K-125K' : '125K+';

            row['Education'] = row['Education'] || 'Unknown';

            let employment = 'Unknown';
            for (const col of employmentColumns) {
                if ((row[col] || '').trim().toUpperCase() === 'YES') {
                    employment = col;
                    break;
                }
            }
            row['Employment Status'] = employment;

            const date = row['Assistance Date'] ? new Date(row['Assistance Date']) : null;
            row._date = isNaN(date?.getTime()) ? null : date;
            if (row._date) validDates.push(row._date);

            if (row._date) {
                const y = row._date.getFullYear();
                const weekNum = Math.floor((row._date - new Date(y, 0, 1)) / (7 * 86400000));
                row.Year = y.toString();
                row.YearMonth = `${y}-${(row._date.getMonth() + 1).toString().padStart(2, '0')}`;
                row.Week = `Week ${weekNum}, ${y}`;
            } else {
                row.Year = row.YearMonth = row.Week = 'Unknown';
            }
        });

        function groupBy(records, key) {
            const result = {};
            for (const row of records) {
                const k = row[key] || 'Unknown';
                result[k] ??= {[key]: k, amountDelivered: 0, peopleHelped: 0, peopleReached: 0};
                result[k].amountDelivered += parseFloat(row['Amount']) || 0;
                if (row['Case #']) result[k].peopleHelped++;
                result[k].peopleReached += parseInt(row['Household Size']) || 0;
            }
            return Object.values(result);
        }

        function groupDemographicsByPeriod(records, periodField, demographicField) {
            const grouped = {};
            for (const row of records) {
                const period = row[periodField] || 'Unknown';
                const label = row[demographicField] || 'Unknown';
                grouped[period] ??= {};
                grouped[period][label] = (grouped[period][label] || 0) + 1;
            }

            const result = {};
            for (const period in grouped) {
                result[period] = Object.entries(grouped[period]).map(([label, count]) => ({ label, count }));
            }
            return result;
        }

        function buildSummaryWithDemographics(records, periodField) {
            const demoFields = {
                Race: 'Race',
                Income: 'Income Bin',
                Education: 'Education',
                Employment: 'Employment Status'
            };

            //group amountDelivered and peopleHelped
            const summary = groupBy(records, periodField);

            //group demographics
            const demoGrouped = {};
            for (const label in demoFields) {
                demoGrouped[label] = groupDemographicsByPeriod(records, periodField, demoFields[label]);
            }

            //attach demographics
            return Object.values(summary).map(row => {
                const period = { ...row };
                for (const field in demoGrouped) {
                    period[field] = demoGrouped[field][row[periodField]] || [];
                }
                return period;
            });
        }

        const weekly_summary = groupBy(records, 'Week');
        const monthly_summary = buildSummaryWithDemographics(records, 'YearMonth');
        const yearly_summary = buildSummaryWithDemographics(records, 'Year');

        function groupZipWithField(data, field) {
            const grouped = {};
            data.forEach(row => {
                const zip = row['Zip code'];
                const label = row[field] || 'Unknown';
                grouped[zip] ??= {};
                grouped[zip][label] = (grouped[zip][label] || 0) + 1;
            });
            const result = {};
            for (const zip in grouped) {
                result[zip] = Object.entries(grouped[zip]).map(([label, count]) => ({label, count}));
            }
            return result;
        }

        const zipSummaryMap = {};
        records.forEach(row => {
            const zip = row['Zip code'];
            zipSummaryMap[zip] ??= {
                'Zip code': zip,
                City: row.City,
                Amount: 0,
                peopleHelped: 0,
                peopleReached:0,
            };
            zipSummaryMap[zip].Amount += parseFloat(row['Amount']) || 0;
            if (row['Case #']) zipSummaryMap[zip].peopleHelped++;
            zipSummaryMap[zip].peopleReached += parseInt(row['Household Size']) || 0;
        });

        const zipRace = groupZipWithField(records, 'Race');
        const zipIncome = groupZipWithField(records, 'Income Bin');
        const zipEducation = groupZipWithField(records, 'Education');
        const zipEmployment = groupZipWithField(records, 'Employment Status');

        const zipSummary = Object.values(zipSummaryMap).map(entry => {
            const zip = entry['Zip code'];
            return {
                ...entry,
                Race: zipRace[zip] || [],
                Income: zipIncome[zip] || [],
                Education: zipEducation[zip] || [],
                Employment: zipEmployment[zip] || []
            };
        });

        function groupZipPeriod(data, field) {
            const result = {};

            const demoFields = {
                Race: 'Race',
                Income: 'Income Bin',
                Education: 'Education',
                Employment: 'Employment Status'
            };

            const demos = {};
            for (const key in demoFields) {
                demos[key] = {};
            }

            //Aggregate zip-level data and demographic counts
            data.forEach(row => {
                const period = row[field] || 'Unknown';
                const zip = row['Zip code'];
                const city = row.City;

                result[period] ??= {};
                result[period][zip] ??= {
                    ZipCode: zip,
                    City: city,
                    Amount: 0,
                    peopleHelped: 0,
                    peopleReached: 0,
                    Race: [],
                    Income: [],
                    Education: [],
                    Employment: []
                };

                result[period][zip].Amount += parseFloat(row['Amount']) || 0;
                result[period][zip].peopleReached += parseInt(row['Household Size']) || 0;
                if (row['Case #']) result[period][zip].peopleHelped++;

                // Count demographics
                for (const key in demoFields) {
                    const column = demoFields[key];
                    const label = row[column] || 'Unknown';

                    demos[key][period] ??= {};
                    demos[key][period][zip] ??= {};
                    demos[key][period][zip][label] = (demos[key][period][zip][label] || 0) + 1;
                }
            });

            //Attach demographic summaries to zip-period entries
            for (const period in result) {
                for (const zip in result[period]) {
                    for (const key in demoFields) {
                        const counts = demos[key][period]?.[zip] || {};
                        result[period][zip][key] = Object.entries(counts).map(([label, count]) => ({
                            label,
                            count
                        }));
                    }
                }
            }

            //Convert the nested result to a structured object
            const structured = {};
            for (const period in result) {
                structured[period] = Object.values(result[period]);
            }

            return structured;
        }

        const zip_monthly = groupZipPeriod(records, 'YearMonth');
        const zip_yearly = groupZipPeriod(records, 'Year');

        // Helper to standardize county names
        function normalizeCountyName(county) {
            const map = {
                'gwinett': 'gwinnett',
                'gwinette': 'gwinnett',
                'gwinnette': 'gwinnett',
                '0': 'unknown',
                'other': 'unknown',
            };
            const cleaned = county.toLowerCase().trim();
            return map[cleaned] || cleaned;
        }

        function groupCountyPeriod(records, periodField) {
            const result = {};
            const demoFields = {
                Race: 'Race',
                Income: 'Income Bin',
                Education: 'Education',
                Employment: 'Employment Status'
            };

            const demos = {};
            for (const key in demoFields) {
                demos[key] = {};
            }

            records.forEach(row => {
                const period = row[periodField] || 'Unknown';
                const county = normalizeCountyName(row['County'] || 'Unknown');

                result[period] ??= {};
                result[period][county] ??= {
                    County: county,
                    Amount: 0,
                    peopleHelped: 0,
                    peopleReached: 0,
                    Race: [],
                    Income: [],
                    Education: [],
                    Employment: []
                };

                result[period][county].Amount += parseFloat(row['Amount']) || 0;
                result[period][county].peopleReached += parseInt(row['Household Size']) || 0;
                if (row['Case #']) result[period][county].peopleHelped++;

                for (const key in demoFields) {
                    const label = row[demoFields[key]] || 'Unknown';
                    demos[key][period] ??= {};
                    demos[key][period][county] ??= {};
                    demos[key][period][county][label] = (demos[key][period][county][label] || 0) + 1;
                }
            });

            for (const period in result) {
                for (const county in result[period]) {
                    for (const key in demoFields) {
                        const counts = demos[key][period]?.[county] || {};
                        result[period][county][key] = Object.entries(counts).map(([label, count]) => ({label, count}));
                    }
                }
            }

            const structured = {};
            for (const period in result) {
                structured[period] = Object.values(result[period]);
            }
            return structured;
        }

        const countyMap = {};
        records.forEach(row => {
            const countyRaw = row['County'] || 'Unknown';
            const county = normalizeCountyName(countyRaw);

            countyMap[county] ??= {County: county, Amount: 0, peopleHelped: 0, peopleReached: 0};
            countyMap[county].Amount += parseFloat(row['Amount']) || 0;
            countyMap[county].peopleReached += parseInt(row['Household Size']) || 0;
            if (row['Case #']) countyMap[county].peopleHelped++;
        });

        function groupCountyWithField(data, field) {
            const grouped = {};
            data.forEach(row => {
                const county = normalizeCountyName(row['County'] || 'Unknown');
                const label = row[field] || 'Unknown';
                grouped[county] ??= {};
                grouped[county][label] = (grouped[county][label] || 0) + 1;
            });
            const result = {};
            for (const county in grouped) {
                result[county] = Object.entries(grouped[county]).map(([label, count]) => ({label, count}));
            }
            return result;
        }

        const countyRace = groupCountyWithField(records, 'Race');
        const countyIncome = groupCountyWithField(records, 'Income Bin');
        const countyEducation = groupCountyWithField(records, 'Education');
        const countyEmployment = groupCountyWithField(records, 'Employment Status');

        const county_summary = Object.values(countyMap).map(entry => {
            const county = entry.County;
            return {
                ...entry,
                Race: countyRace[county] || [],
                Income: countyIncome[county] || [],
                Education: countyEducation[county] || [],
                Employment: countyEmployment[county] || []
            };
        });

        const county_monthly = groupCountyPeriod(records, 'YearMonth');
        const county_yearly = groupCountyPeriod(records, 'Year');

        const dataset_info = {
            startDate: validDates.length ? new Date(Math.min(...validDates)).toISOString().split('T')[0] : null,
            endDate: validDates.length ? new Date(Math.max(...validDates)).toISOString().split('T')[0] : null,
            recordCount: validDates.length
        };

        const result = {
            dataset_info,
            total_people_helped: totalHelped,
            total_food_delivered: totalAmount,
            total_people_reached: totalReached,
            county_summary,
            county_monthly: {monthly: county_monthly},
            county_yearly: {yearly: county_yearly},
            zip_summary: zipSummary,
            zip_monthly: {monthly: zip_monthly},
            zip_yearly: {yearly: zip_yearly},
            monthly_summary,
            weekly_summary,
            yearly_summary,
            unmatched_zip_summary: Object.entries(unmatchedZip).map(([zip, count]) => ({
                zip, peopleHelped: count
            }))
        };

        await addDoc(collection(db, 'csv_results'), {
            createdAt: serverTimestamp(),
            data: result,
        });

        return NextResponse.json({message: 'File processed and stored in Firestore'}, {status: 200});
    } catch (e) {
        console.error('Processing error:', e);
        return NextResponse.json({error: 'Failed to process CSV'}, {status: 500});
    }
}
