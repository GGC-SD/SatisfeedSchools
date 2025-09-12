"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Container, Row, Col, ButtonGroup, Button, Form, Card } from "react-bootstrap";

interface CountyData {
    County: string;
    Amount: number;
    peopleHelped: number;
    peopleReached: number;
}

interface GeoFeature extends GeoJSON.Feature<GeoJSON.Geometry> {
    properties: {
        NAME?: string;
        STATE?: string;
    };
}

interface Props {
    versionId: string | null;
    timeframe: string;
    specificTime: string;
    setTimeframe: (tf: string) => void;
    setSpecificTime: (t: string) => void;
    setSelectedCounty: (county: string | null) => void;
}

export default function CountyMap({ versionId, timeframe, specificTime, setTimeframe, setSpecificTime, setSelectedCounty }: Props) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [geoPaths, setGeoPaths] = useState<{ [key: string]: string }>({});
    const [viewBox, setViewBox] = useState("0 0 800 600");

    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [mapData, setMapData] = useState<CountyData[]>([]);
    const [fullData, setFullData] = useState<any>(null);
    const [selectedCounty, setLocalSelectedCounty] = useState<string | null>(null);

    useEffect(() => {
        const fetchGeoJSON = async () => {
            try {
                const response = await fetch("/data/gz_2010_us_050_00_5m.json");
                const geojson = await response.json();

                const georgiaFeatures = geojson.features.filter(
                    (feature: GeoFeature) => feature.properties?.STATE === "13"
                );

                const projection = d3.geoMercator().scale(5400).translate([8300, 3600]);
                const pathGenerator = d3.geoPath().projection(projection);

                const paths: { [key: string]: string } = {};
                georgiaFeatures.forEach((feature: GeoFeature) => {
                    const countyName = feature.properties?.NAME?.toLowerCase();
                    if (!countyName) return;
                    const path = pathGenerator(feature);
                    if (path) paths[countyName] = path;
                });

                setGeoPaths(paths);

                const bounds = pathGenerator.bounds({ type: "FeatureCollection", features: georgiaFeatures });
                const [x0, y0] = bounds[0];
                const [x1, y1] = bounds[1];
                const width = x1 - x0;
                const height = y1 - y0;
                setViewBox(`${x0} ${y0} ${width} ${height}`);
            } catch (error) {
                console.error("Error fetching GeoJSON:", error);
            }
        };

        fetchGeoJSON();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!versionId) return;

            try {
                const response = await fetch(`/api/getResults?id=${versionId}`);
                const { data } = await response.json();

                if (!data) return;
                setFullData(data);

                if (timeframe === "latest") {
                    setMapData(data.county_summary || []);
                } else if (timeframe === "monthly") {
                    const months = Object.keys(data.county_monthly?.monthly || {}).sort();
                    setAvailableMonths(months);
                    const selected = specificTime || months[0];
                    setSpecificTime(selected);
                    setMapData(data.county_monthly?.monthly?.[selected] || []);
                } else if (timeframe === "yearly") {
                    const years = Object.keys(data.county_yearly?.yearly || {}).sort();
                    setAvailableYears(years);
                    const selected = specificTime || years[0];
                    setSpecificTime(selected);
                    setMapData(data.county_yearly?.yearly?.[selected] || []);
                }
            } catch (err) {
                console.error("Error loading data from Firebase API:", err);
            }
        };

        loadData();
    }, [versionId, timeframe, specificTime]);

    useEffect(() => {
        if (Object.keys(geoPaths).length > 0) {
            const svg = d3.select(svgRef.current);
            const g = svg.select("g.map-group");

            if (!g.empty()) {
                svg.call(
                    d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 8]).on("zoom", (event) => {
                        g.attr("transform", event.transform);
                    })
                );
            }
        }
    }, [geoPaths]);

    const getCountyData = (county: string) =>
        mapData.find((c) => (c.County || c.county)?.toLowerCase() === county.toLowerCase()) || {
            Amount: 0,
            peopleHelped: 0,
            peopleReached: 0,
        };

    const getFillColor = (peopleReached: number) => {
        const maxPeopleReached = Math.max(...mapData.map((county) => county.peopleReached || 0));
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
        const options = timeframe === "monthly" ? availableMonths : availableYears;
        if (!options.length) return null;
        const currentIndex = options.indexOf(specificTime);

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
        );
    };

    const summaryData = (() => {
        if (!fullData) return null;

        const normalize = (str: string) => str?.toLowerCase().trim();

        if (selectedCounty) {
            if (timeframe === "monthly") {
                const records = fullData.county_monthly?.monthly?.[specificTime] || [];
                const county = records.find((r: any) => normalize(r.County) === normalize(selectedCounty));
                return county ? { peopleHelped: county.peopleHelped, peopleReached: county.peopleReached } : null;
            } else if (timeframe === "yearly") {
                const records = fullData.county_yearly?.yearly?.[specificTime] || [];
                const county = records.find((r: any) => normalize(r.County) === normalize(selectedCounty));
                return county ? { peopleHelped: county.peopleHelped, peopleReached: county.peopleReached } : null;
            } else {
                const county = fullData.county_summary?.find((r: any) => normalize(r.County) === normalize(selectedCounty));
                return county ? { peopleHelped: county.peopleHelped, peopleReached: county.peopleReached } : null;
            }
        }

        // fallback if no county is selected
        if (timeframe === "monthly") {
            const summary = fullData.monthly_summary?.find((r: any) => r.YearMonth === specificTime);
            return summary ? { peopleHelped: summary.peopleHelped, peopleReached: summary.peopleReached } : null;
        } else if (timeframe === "yearly") {
            const summary = fullData.yearly_summary?.find((r: any) => r.Year === specificTime);
            return summary ? { peopleHelped: summary.peopleHelped, peopleReached: summary.peopleReached } : null;
        } else {
            return {
                peopleHelped: fullData.total_people_helped || 0,
                peopleReached: fullData.total_people_reached || 0
            };
        }
    })();

    return (
        <Container fluid className="p-4">
            <Row className="justify-content-center mb-4">
                    <>
                        <Col lg={6}>
                            <Card className="text-center mb-1" style={{ border: "3px solid #F7CA18", boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)" }}>
                                <Card.Body>
                                    <Card.Subtitle className="mb-1 text-bold">Total Family Reached</Card.Subtitle>
                                    <Card.Title className="fw-bold fs-3">{summaryData? summaryData.peopleHelped : "0"}</Card.Title>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={6}>
                            <Card className="text-center mb-1" style={{ border: "3px solid #F7CA18", boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)" }}>
                                <Card.Body>
                                    <Card.Subtitle className="mb-1 text-bold">Total People Helped</Card.Subtitle>
                                    <Card.Title className="fw-bold fs-3">{summaryData? summaryData.peopleReached : "0"}</Card.Title>
                                </Card.Body>
                            </Card>
                        </Col>
                    </>
            </Row>

            <Row className="text-center justify-content-center">
                <Col lg={8}>
                    <h2 className="mb-0 fw-bold fs-3 text-center text-lg-start">
                        {selectedCounty
                            ? `${selectedCounty.toUpperCase()}`
                            : "Food Distribution By County"}
                    </h2>
                </Col>
                <Col lg={3} className="text-center text-lg-end">
                    <Button
                        size="sm"
                        onClick={() => {
                            setSelectedCounty(null);
                            setLocalSelectedCounty(null);
                            setTimeframe("latest");
                            setSpecificTime("");
                        }}
                        disabled={!selectedCounty}
                        style={{
                            backgroundColor: selectedCounty ? "#E67E22" : "#F5CBA7",
                            color: selectedCounty ? "#fff" : "#555",
                            border: "2px solid black",
                            cursor: selectedCounty ? "pointer" : "not-allowed",
                            opacity: selectedCounty ? 1 : 0.6,
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

                    <div
                        className="position-relative d-flex justify-content-center align-items-center bg-light p-3 rounded shadow-lg"
                        style={{minHeight: "400px", border: "3px solid #F7CA18",
                            boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)",
                            borderRadius: "12px"}}>
                        <svg ref={svgRef} width="100%" height="auto" viewBox={viewBox}
                             preserveAspectRatio="xMidYMid meet">
                            <g className="map-group">
                                {Object.entries(geoPaths).map(([county, path], index) => {
                                    const {peopleReached, peopleHelped} = getCountyData(county);
                                    return (
                                        <path
                                            key={index}
                                            d={path}
                                            fill={getFillColor(peopleReached)}
                                            stroke={selectedCounty === county ? "#000" : "#fff"}
                                            strokeWidth={selectedCounty === county ? 1.5 : 0.5}
                                            className="cursor-pointer hover:fill-opacity-70 transition duration-200"
                                            onClick={() => {
                                                setSelectedCounty(county);
                                                setLocalSelectedCounty(county);
                                            }}
                                        />
                                    );
                                })}
                            </g>
                        </svg>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}