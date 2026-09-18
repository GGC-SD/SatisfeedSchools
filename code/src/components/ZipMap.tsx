"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { Row, Col, Container, Button, ButtonGroup, Form, Card } from "react-bootstrap"

interface ZipData {
    ZipCode: string
    City: string
    Amount: number
    peopleHelped: number
    peopleReached: number
}

interface TooltipData {
    zip: string
    x: number
    y: number
    Amount: number
    peopleHelped: number
    peopleReached: number
    City: string
}

interface ZipMapProps {
    versionId: string | null;
    selectedZip: string | null;
    setSelectedZip: (zip: string | null) => void;
    timeframe: string;
    specificTime: string;
    setTimeframe: (tf: string) => void;
    setSpecificTime: (t: string) => void;
}

const ZipMap = ({ versionId, selectedZip, setSelectedZip, timeframe, specificTime, setTimeframe, setSpecificTime }: ZipMapProps) => {
    const svgRef = useRef<SVGSVGElement | null>(null)
    const [geoPaths, setGeoPaths] = useState<Record<string, string>>({})
    const [tooltip, setTooltip] = useState<TooltipData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [mapData, setMapData] = useState<ZipData[]>([])
    const [unmatchedZipData, setUnmatchedZipData] = useState<any[]>([])
    const [availableMonths, setAvailableMonths] = useState<string[]>([])
    const [availableYears, setAvailableYears] = useState<string[]>([])
    const [fullData, setFullData] = useState<any>(null);
    const [showUnmatched, setShowUnmatched] = useState(false);
    const [viewBox, setViewBox] = useState("0 0 960 600");

    const getZipData = (zip: string) => {
        const normalizedZip = zip.padStart(5, "0");
        return (
            mapData.find(z => (z["ZipCode"] || z["Zip code"]) === normalizedZip) || {
                Amount: 0,
                peopleHelped: 0,
                peopleReached: 0,
                City: ""
            }
        );
    }

    useEffect(() => {
        const loadData = async () => {
            if (!versionId) return
            setLoading(true);
            try {
                const response = await fetch(`/api/getResults?id=${versionId}`)
                const { data } = await response.json()

                if (!data) return
                setFullData(data);

                if (timeframe === "latest") {
                    setMapData(data.zip_summary || [])
                } else if (timeframe === "monthly") {
                    const months = Object.keys(data.zip_monthly?.monthly || {}).sort();
                    setAvailableMonths(months);
                    const selected = specificTime || months[0]
                    setSpecificTime(selected)
                    setMapData(data.zip_monthly?.monthly?.[selected] || [])
                } else if (timeframe === "yearly") {
                    const years = Object.keys(data.zip_yearly?.yearly || {}).sort();
                    setAvailableYears(years);
                    const selected = specificTime || years[0]
                    setSpecificTime(selected)
                    setMapData(data.zip_yearly?.yearly?.[selected] || [])
                }
                setUnmatchedZipData(data.unmatched_zip_summary || [])
                console.log("API data:", data);
            } catch (err) {
                console.error("Error loading zip data:", err)
                setError(err instanceof Error ? err.message : String(err))
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [versionId, timeframe, specificTime])

    useEffect(() => {
        const loadMap = async () => {
            try {
                const response = await fetch("/data/ga_georgia_zip_codes_geo.min.json")
                const geoData = await response.json()

                const projection = d3.geoMercator().scale(8000).center([-83.5, 32.8]).translate([480, 300])
                const pathGenerator = d3.geoPath().projection(projection)

                const paths: Record<string, string> = {}
                geoData.features?.forEach((feature: any) => {
                    const zipCode = feature.properties.ZCTA5CE10
                    if (zipCode) {
                        const path = pathGenerator(feature)
                        if (path) paths[zipCode] = path
                    }
                })

                setGeoPaths(paths)

                const bounds = pathGenerator.bounds(geoData);
                const [x0, y0] = bounds[0];
                const [x1, y1] = bounds[1];
                const width = x1 - x0;
                const height = y1 - y0;
                setViewBox(`${x0} ${y0} ${width} ${height}`);
            } catch (err) {
                console.error("Error loading map geojson:", err)
            }
        }

        loadMap()
    }, [])

    useEffect(() => {
        if (Object.keys(geoPaths).length > 0) {
            const svg = d3.select(svgRef.current)
            const g = svg.select("g.map-group")

            if (!g.empty()) {
                svg.call(
                    d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 8]).on("zoom", (event) => {
                        g.attr("transform", event.transform)
                    })
                )
            }
        }
    }, [geoPaths])

    const getFillColor = (peopleReached: number) => {
        const maxPeopleReached = Math.max(...mapData.map((z) => z.peopleReached || 0));
        if (maxPeopleReached > 0) {
            const percentage = peopleReached / maxPeopleReached;
            if (percentage >= 0.9) return "#0D1F03";
            if (percentage >= 0.8) return "#1D2C0F";
            if (percentage >= 0.7) return "#253E0A";
            if (percentage >= 0.6) return "#315508";
            if (percentage >= 0.5) return "#3D6711";
            if (percentage >= 0.4) return "#48711B";
            if (percentage >= 0.3) return "#5A8231";
            if (percentage >= 0.2) return "#719354";
            if (percentage >= 0.1) return "#93B07E";
            if (percentage > 0) return "#B1CAA6";
        }
        return "#E8F5E9";
    };

    const renderSlider = () => {
        const options = timeframe === "monthly" ? availableMonths : availableYears
        if (!options.length) return null
        const currentIndex = options.indexOf(specificTime)

        return (
            <div className="mb-3">
                <Form.Range
                    min={0}
                    max={options.length - 1}
                    step={1}
                    value={currentIndex >= 0 ? currentIndex : 0}
                    onChange={(e) => setSpecificTime(options[parseInt(e.target.value)])}
                />
                <div className="fw-semibold">Selected: {specificTime}</div>
            </div>
        )
    }

    const zipData = selectedZip ? getZipData(selectedZip) : null;
    const fallbackSummary = () => {
        if (timeframe === "monthly") {
            const summary = fullData?.monthly_summary?.find((r) => r.YearMonth === specificTime);
            return summary
            ? {peopleReached: summary.peopleReached, peopleHelped: summary.peopleHelped,} : null;
        } else if (timeframe === "yearly") {
            const summary = fullData?.yearly_summary?.find((r) => r.Year === specificTime);
            return summary
                ? {peopleReached: summary.peopleReached, peopleHelped: summary.peopleHelped,} : null;
        } else {
            return {
                peopleHelped: fullData?.total_people_helped,
                peopleReached: fullData?.total_people_reached
            };
        }
    };

    const summaryData = zipData || fallbackSummary();

    return (
        <Container fluid className="p-4">
            <Row className="justify-content-center">
                {summaryData && (
                    <>
                        <Col lg={6}>
                            <Card className="text-center mb-1" style={{ border: "3px solid #F7CA18", boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)" }}>
                                <Card.Body>
                                    <Card.Subtitle className="mb-1 text-bold">Total Family Reached</Card.Subtitle>
                                    <Card.Title className="fw-bold fs-3">{summaryData.peopleHelped}</Card.Title>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={6}>
                            <Card className="text-center mb-1" style={{ border: "3px solid #F7CA18", boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)" }}>
                                <Card.Body>
                                    <Card.Subtitle className="mb-1 text-bold">Total People Helped</Card.Subtitle>
                                    <Card.Title className="fw-bold fs-3">{summaryData.peopleReached}</Card.Title>
                                </Card.Body>
                            </Card>
                        </Col>
                    </>
                )}
            </Row>

            <Row className="my-4 align-items-center">
                <Col lg={9} className="d-flex align-items-center mb-3 mb-md-0">
                    <h2 className="mb-0 fw-bold fs-3 text-center text-lg-start">
                        {selectedZip
                            ? `${selectedZip} — ${zipData?.City}`
                            : "Food Distribution By Zip Code"}
                    </h2>
                </Col>
                <Col lg={3} className="text-center text-lg-end">
                    <Button
                        size="sm"
                        onClick={() => {
                            setSelectedZip(null);
                            // setTimeframe("latest");
                            // setSpecificTime("");
                        }}
                        disabled={!selectedZip}
                        style={{
                            backgroundColor: selectedZip ? "#E67E22" : "#F5CBA7",
                            color: selectedZip ? "#fff" : "#555",
                            border: "2px solid black",
                            cursor: selectedZip ? "pointer" : "not-allowed",
                            opacity: selectedZip ? 1 : 0.6,
                        }}
                    >
                        Clear Selection
                    </Button>
                </Col>
            </Row>

            <Row>
                <Col lg={12} className="text-center">
                    <ButtonGroup className="mb-3">
                        <Button variant="custom"
                                className={timeframe === "latest" ? "bg-warning text-dark border border-dark" : "btn-secondary"}
                                onClick={() => { setTimeframe("latest"); setSpecificTime("") }}>All Time</Button>
                        <Button variant="custom"
                                className={timeframe === "monthly" ? "bg-warning text-dark border border-dark" : "btn-secondary"}
                                onClick={() => { setTimeframe("monthly"); setSpecificTime("") }}>Monthly</Button>
                        <Button variant="custom"
                                className={timeframe === "yearly" ? "bg-warning text-dark border border-dark" : "btn-secondary"}
                                onClick={() => { setTimeframe("yearly"); setSpecificTime("") }}>Yearly</Button>
                    </ButtonGroup>
                    {(timeframe === "monthly" || timeframe === "yearly") && renderSlider()}

                    <div className="position-relative d-flex justify-content-center align-items-center bg-light p-3 rounded shadow-lg"
                         style={{ minHeight: "400px", border: "3px solid #F7CA18",
                             boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)",
                             borderRadius: "12px" }}>
                        <svg ref={svgRef} width="100%" height="auto" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
                            <g className="map-group">
                                {Object.entries(geoPaths).map(([zip, path], index) => {
                                    const { peopleReached, peopleHelped, City } = getZipData(zip)
                                    return (
                                        <path
                                            key={index}
                                            d={path}
                                            fill={getFillColor(peopleReached)}
                                            stroke={selectedZip === zip ? "#000000" : "#ffffff"}
                                            strokeWidth={selectedZip === zip ? 1.5 : 0.5}
                                            className="cursor-pointer hover:fill-opacity-70 transition duration-200"
                                            onClick={() => setSelectedZip(zip)}
                                            onMouseEnter={(e) => {
                                                const { clientX, clientY } = e
                                                setTooltip({ zip, x: clientX, y: clientY, peopleReached, peopleHelped, City })
                                            }}
                                            onMouseLeave={() => setTooltip(null)}
                                        />
                                    )
                                })}
                            </g>
                        </svg>
                    </div>

                    {unmatchedZipData.length > 0 && (
                        <div className="mt-4">
                            <Button
                                variant="warning text-dark border border-dark"
                                size="sm"
                                onClick={() => setShowUnmatched(!showUnmatched)}
                            >
                                {showUnmatched ? "Hide Unmatched ZIPs" : "Show Unmatched ZIPs"}
                            </Button>

                            {showUnmatched && (
                                <div className="mt-3 text-start bg-warning bg-opacity-25 p-3 rounded">
                                    <h5>Unmatched ZIP Codes</h5>
                                    <p>These ZIP codes could not be mapped to a city and are not displayed on the map:</p>
                                    <ul>
                                        {unmatchedZipData.map((item, idx) => (
                                            <li key={idx}>{item["Zip code"]} — {item.peopleHelped} people helped</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </Col>
            </Row>
        </Container>
    )
}

export default ZipMap
