"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LabelList } from "recharts"
import { Container, Row, Col, Card, Button } from "react-bootstrap"
import html2canvas from "html2canvas";

// Custom color palette to match the design
const RACE_COLOR_MAP = {
    "Hispanic, Latino, or Spanish Origin": "#F7CA18",
    "Black or African-American": "#36b700",
    "White": "#003a7d",
    "Asian": "#008dff",
    "Middle Eastern or North African": "#d83034",
    "American Indian": "#ff9d3a",
    "Multiracial": "#c701ff",
    "Unknown": "#c8c8c8",
    "Prefers not to answer": "#8fd7d7"
};
const EDUCATION_COLOR_MAP = {
    "Unknown": "#c8c8c8",
    "Highschool/GED": "#F7CA18",
    "College": "#36b700",
    "Highschool-Incomplete": "#003a7d",
    "Prefers not to answer": "#8fd7d7",
    "Some college": "#d83034",
    "High School Grad": "#ff9d3a",
};

export default function DemographicCharts({ data, selectedZip, selectedCounty, timeframe, specificTime }) {
    let stats = { Race: [], Income: [], Education: [], Employment: [] }

    const normalize = (s) => s?.toLowerCase().trim();

    if (selectedCounty) {
        if (timeframe === "monthly") {
            const countyList = data.county_monthly?.monthly?.[specificTime] || [];
            const match = countyList.find((c) => normalize(c.County) === normalize(selectedCounty));
            if (match) {
                stats = {
                    Race: match.Race || [],
                    Income: match.Income || [],
                    Education: match.Education || [],
                    Employment: match.Employment || [],
                };
            }
        } else if (timeframe === "yearly") {
            const countyList = data.county_yearly?.yearly?.[specificTime] || [];
            const match = countyList.find((c) => normalize(c.County) === normalize(selectedCounty));
            if (match) {
                stats = {
                    Race: match.Race || [],
                    Income: match.Income || [],
                    Education: match.Education || [],
                    Employment: match.Employment || [],
                };
            }
        } else {
            const match = data.county_summary?.find((c) => normalize(c.County) === normalize(selectedCounty));
            if (match) {
                stats = {
                    Race: match.Race || [],
                    Income: match.Income || [],
                    Education: match.Education || [],
                    Employment: match.Employment || [],
                };
            }
        }
    } else if (selectedZip) {
        if (timeframe === "monthly") {
            const zipList = data.zip_monthly?.monthly?.[specificTime] || []
            const match = zipList.find((z) => z.ZipCode === selectedZip)
            if (match) {
                stats = {
                    Race: match.Race || [],
                    Income: match.Income || [],
                    Education: match.Education || [],
                    Employment: match.Employment || [],
                }
            }
        } else if (timeframe === "yearly") {
            const zipList = data.zip_yearly?.yearly?.[specificTime] || []
            const match = zipList.find((z) => z.ZipCode === selectedZip)
            if (match) {
                stats = {
                    Race: match.Race || [],
                    Income: match.Income || [],
                    Education: match.Education || [],
                    Employment: match.Employment || [],
                }
            }
        } else {
            const match = data.zip_summary?.find((z) => z["Zip code"] === selectedZip)
            if (match) {
                stats = {
                    Race: match.Race || [],
                    Income: match.Income || [],
                    Education: match.Education || [],
                    Employment: match.Employment || [],
                }
            }
        }
    } else {
        if (timeframe === "monthly") {
            const match = data.monthly_summary?.find((m) => m.YearMonth === specificTime)
            if (match) {
                stats = {
                    Race: match.Race || [],
                    Income: match.Income || [],
                    Education: match.Education || [],
                    Employment: match.Employment || [],
                }
            }
        } else if (timeframe === "yearly") {
            const match = data.yearly_summary?.find((y) => y.Year === specificTime)
            if (match) {
                stats = {
                    Race: match.Race || [],
                    Income: match.Income || [],
                    Education: match.Education || [],
                    Employment: match.Employment || [],
                }
            }
        } else {
            // Default to all stats aggregated
            const aggregate = (field) => {
                const countMap = {}
                data.zip_summary?.forEach((zip) => {
                    ;(zip[field] || []).forEach((item) => {
                        countMap[item.label] = (countMap[item.label] || 0) + item.count
                    })
                })
                return Object.entries(countMap).map(([label, count]) => ({label, count}))
            }

            stats = {
                Race: aggregate("Race"),
                Income: aggregate("Income"),
                Education: aggregate("Education"),
                Employment: aggregate("Employment"),
            }
        }
    }

    return (
        <Container fluid className="mt-4">
            <Row className="g-4">
                <Col md={6}>
                    <RaceDistributionChart data={stats.Race}/>
                </Col>
                <Col md={6}>
                    <EducationAchievedChart data={stats.Education} />
                </Col>
                <Col md={12}>
                    <EmploymentStatusChart data={stats.Employment}/>
                </Col>
                <Col md={12}>
                    <IncomeDistributionChart data={stats.Income}/>
                </Col>

            </Row>
        </Container>
    )
}

export function exportCardAsImage(id: string, fileName: string, exportWidth: number, exportHeight?: number) {
    const original = document.getElementById(id);
    if (!original) return;

    // Clone the original element
    const clone = original.cloneNode(true) as HTMLElement;

    // Clean export styles
    clone.style.width = `${exportWidth}px`;
    if (exportHeight) {
        clone.style.height = `${exportHeight}px`;
        clone.style.overflow = "hidden";
    }
    clone.style.position = "absolute";
    clone.style.top = "0";
    clone.style.left = "-9999px";
    clone.style.zIndex = "9999";
    clone.style.backgroundColor = "#ffffff";
    clone.style.overflow = "visible";
    clone.style.fontSize = "0.9rem";

    // Remove the export button
    const exportBtn = clone.querySelector(".export-button") as HTMLElement;
    if (exportBtn) exportBtn.remove();

    // Add the clone to the DOM
    document.body.appendChild(clone);

    // Allow layout to settle
    setTimeout(() => {
        html2canvas(clone, {
            backgroundColor: "#ffffff",
            scale: 2,
            useCORS: true,
            scrollX: 0,
            scrollY: -window.scrollY,
            windowWidth: exportWidth,
            windowHeight: exportHeight ?? clone.scrollHeight,
        }).then((canvas) => {
            document.body.removeChild(clone);

            const link = document.createElement("a");
            link.download = `${fileName}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        });
    }, 50);
}


// Custom label component for pie charts that shows percentages
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius * 1.1
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    // Only show labels for segments that are large enough
    if (percent < 0.03) return null

    return (
        <text x={x} y={y} fill="#333333" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12}>
            {`${(percent * 100).toFixed(2)}%`}
        </text>
    )
}

// Race Distribution Chart
function RaceDistributionChart({ data }) {
    const chartData = data.map((item) => ({
        name: item.label,
        value: item.count,
    }))

    const total = chartData.reduce((sum, item) => sum + item.value, 0)
    const dataWithPercentage = chartData.map((item) => ({
        ...item,
        percentage: ((item.value / total) * 100).toFixed(2),
    }))

    return (
        <Card id="race-chart" className="d-flex" style={{ border: "3px solid #F7CA18", boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)" }}>
            <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h3 className="fs-5 fw-bold mb-3">Race Distribution</h3>
                    <Button
                        className="export-button"
                        variant="outline-dark"
                        size="sm"
                        onClick={() => exportCardAsImage("race-chart", "RaceDistribution", 480, 620)}
                    >
                        📥 Export
                    </Button>
                </div>
                    <div className="d-flex flex-wrap gap-4" style={{minHeight: "250px", height: "auto"}}>
                        <div style={{width: "100%"}}>
                            <ResponsiveContainer width="100%" aspect={1.5}>
                                <PieChart>
                                    <Pie
                                        data={dataWithPercentage}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius="90%"
                                        labelLine={true}
                                        label={CustomPieLabel}
                                    >
                                        {dataWithPercentage.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={RACE_COLOR_MAP[entry.name] || "#CCCCCC"}/>
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => [`${value} (${((value / total) * 100).toFixed(2)}%)`, name]}
                                        labelFormatter={() => ""}
                                        contentStyle={{borderRadius: "8px", border: "1px solid #e2e8f0"}}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="ms-3 d-flex flex-column justify-content-center"
                             style={{width: "100%",
                                     overflow: "visible",
                                     paddingBottom: "1rem",         // Extra space at bottom
                                     lineHeight: "1.4",             // Prevent cropped lines
                                     fontSize: "0.875rem",          // Match Bootstrap small text
                                     fontFamily: "Arial, sans-serif"}}>
                            {dataWithPercentage.map((entry, index) => (
                                <div key={`legend-${index}`} className="d-flex align-items-center mb-1">
                                    <div
                                        className="me-2 rounded-circle"
                                        style={{
                                            backgroundColor: RACE_COLOR_MAP[entry.name] || "#CCCCCC",
                                            width: "12px",
                                            height: "12px",
                                        }}
                                    />
                                    <span className="text-wrap"
                                          style={{maxWidth: "360px", wordBreak: "break-word",   // prevent horizontal overflow
                                        whiteSpace: "normal"    }}>
                  {entry.name}
                </span>
                                </div>
                            ))}
                        </div>
                    </div>
            </Card.Body>
        </Card>
    )
}

// Employment Status Chart
function EmploymentStatusChart({data}) {
    const chartData = data.map((item) => ({
        name: item.label,
        value: item.count,
    }))

    const total = chartData.reduce((sum, item) => sum + item.value, 0)
    const dataWithPercentage = chartData
        .map((item) => ({
            ...item,
            percentage: ((item.value / total) * 100).toFixed(2),
        }))
        .sort((a, b) => b.value - a.value)

    return (
        <Card id="employment-chart" className="h-100" style={{ border: "3px solid #F7CA18", boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)" }}>
            <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h3 className="fs-5 fw-bold mb-3">Employment Status</h3>
                    <Button
                        className="export-button"
                        variant="outline-dark"
                        size="sm"
                        onClick={() => exportCardAsImage("employment-chart", "EmploymentStatus", 600, 320)}
                    >
                        📥 Export
                    </Button>
                </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                            data={dataWithPercentage}
                            layout="vertical"
                            margin={{top: 5, right: 30, left: 20, bottom: 5}}
                            barSize={25}
                        >
                            <XAxis type="number" domain={[0, 40]} tickFormatter={(value) => `${value}%`}/>
                            <YAxis dataKey="name" type="category" width={140} interval={0} tick={{fontSize: 12}}/>
                            <Tooltip
                                formatter={(value, name, props) => [`${props.payload.percentage}%`, name]}
                                contentStyle={{borderRadius: "8px", border: "1px solid #e2e8f0"}}
                            />
                            <Bar dataKey="percentage" fill="#F7CA18" radius={[0, 4, 4, 0]}>
                                <LabelList
                                    dataKey="percentage"
                                    position="right"
                                    formatter={(value) => `${value}%`}
                                    style={{fontSize: "12px"}}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
            </Card.Body>
        </Card>
    )
}

// Income Distribution Bar Chart
function IncomeDistributionChart({ data }) {
    const sortedData = [...data].sort((a, b) => {
        const getMinValue = (str) => {
            if (str === "Unknown") return Number.POSITIVE_INFINITY - 1;
            if (str === "Total") return Number.POSITIVE_INFINITY
            const match = str.match(/^(\d+)/)
            return match ? Number.parseInt(match[1]) : 0
        }

        return getMinValue(a.label) - getMinValue(b.label)
    })

    const chartData = sortedData.filter((item) => item.label !== "Total")

    return (
        <Card id="income-bin" className="h-100" style={{ border: "3px solid #F7CA18", boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)" }}>
            <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h3 className="fs-5 fw-bold mb-3">Income Distribution by Bins</h3>
                    <Button
                        className="export-button"
                        variant="outline-dark"
                        size="sm"
                        onClick={() => exportCardAsImage("income-bin", "IncomeDistributionBin", 600, 320)}
                    >
                        📥 Export
                    </Button>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{top: 5, right: 30, left: 40, bottom: 5}}
                        barSize={25}
                    >
                        <XAxis type="number"/>
                        <YAxis dataKey="label" type="category" width={80} interval={0} tick={{fontSize: 12}}/>
                        <Tooltip
                            formatter={(value) => [`${value} cases`, "Count"]}
                            contentStyle={{borderRadius: "8px", border: "1px solid #e2e8f0"}}
                        />
                        <Bar dataKey="count" fill="#F7CA18" radius={[0, 4, 4, 0]}>
                            <LabelList dataKey="count" position="right" style={{fontSize: "12px"}}/>
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Card.Body>
        </Card>
    )
}

// Education Achieved Chart
function EducationAchievedChart({data}) {
    const chartData = data.map((item) => ({
        name: item.label,
        value: item.count,
    }))

    const total = chartData.reduce((sum, item) => sum + item.value, 0)
    const dataWithPercentage = chartData.map((item) => ({
        ...item,
        percentage: ((item.value / total) * 100).toFixed(2),
    }))

    return (
        <Card id="education-achieved" className="h-100"
              style={{border: "3px solid #F7CA18", boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)" }}>
            <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h3 className="fs-5 fw-bold mb-3">Education Achieved</h3>
                    <Button
                        className="export-button"
                        variant="outline-dark"
                        size="sm"
                        onClick={() => exportCardAsImage("education-achieved", "EducationAchieved", 480, 620)}
                    >
                        📥 Export
                    </Button>
                </div>
                <div className="d-flex flex-wrap align-items-start gap-4" style={{minHeight: "200px", height: "auto"}}>
                    <div style={{width: "100%"}}>
                        <ResponsiveContainer width="100%" aspect={1.5}>
                            <PieChart>
                                <Pie
                                    data={dataWithPercentage}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="50%"
                                    outerRadius="90%"
                                    labelLine={true}
                                    label={CustomPieLabel}
                                >
                                    {dataWithPercentage.map((entry, index) => (
                                        <Cell key={`cell-${index}`}
                                              fill={EDUCATION_COLOR_MAP[entry.name] || "#CCCCCC"}/>
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [`${value} (${((value / total) * 100).toFixed(2)}%)`, name]}
                                    contentStyle={{borderRadius: "8px", border: "1px solid #e2e8f0"}}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="ms-3 d-flex flex-column justify-content-center"
                         style={{width: "100%",
                             overflow: "visible",
                             paddingBottom: "1rem",
                             lineHeight: "1.4",
                             fontSize: "0.875rem",
                             fontFamily: "Arial, sans-serif"
                    }}>
                        {dataWithPercentage.map((entry, index) => (
                            <div key={`legend-${index}`} className="d-flex align-items-center mb-1">
                                <div
                                    className="me-2 rounded-circle"
                                    style={{
                                        backgroundColor: EDUCATION_COLOR_MAP[entry.name] || "#CCCCCC",
                                        width: "12px",
                                        height: "12px",
                                    }}
                                />
                                <span className="text-wrap" style={{maxWidth: "360px", wordBreak: "break-word", whiteSpace: "normal"}}>
                                    {entry.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </Card.Body>
        </Card>
    )
}

