"use client";
import React, { useEffect, useState } from "react";
import SidebarNav from "../../components/ui/sidebar";
import VersionSelector from "@/components/VersionSelector";
import { Container, Row, Col, Table, Button } from "react-bootstrap";
import {MonthlyChart, WeeklyChart, YearlyChart} from "@/components/ui/chart";

const summarySections = [
    { name: "Yearly Summary", key: "yearly_summary" },
    { name: "Monthly Summary", key: "monthly_summary" },
    { name: "Weekly Summary", key: "weekly_summary" },
    { name: "County Summary", key: "county_summary" }
];

const columnMappings = {
    YearMonth: "Month",
    amountDelivered: "Amount Delivered (Box/Bag)",
    Amount: "Amount Delivered (Box/Bag)",
    peopleReached: "Total People Helped",
    peopleHelped: "Total Family Reached",
    Year: "Year",
    Week: "Week"
};

const sectionKeyOrders: Record<string, string[]> = {
    county_summary: ["County", "peopleHelped", "peopleReached"],
    monthly_summary: ["YearMonth", "peopleReached", "peopleHelped"],
    weekly_summary: ["Week", "peopleReached", "peopleHelped"],
    yearly_summary: ["Year", "peopleReached", "peopleHelped"]
};

export default function Page() {
    const [data, setData] = useState<{ [key: string]: any[] }>({});
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [selectedTimeCreated, setSelectedTimeCreated] = useState<Date | null>(null);

    const [showYearly, setShowYearly] = useState(true);
    const [showMonthly, setShowMonthly] = useState(true);
    const [showWeekly, setShowWeekly] = useState(true);
    const [showCountyTable, setShowCountyTable] = useState(true);


    const fetchSummaryData = async (versionId: string) => {
        try {
            const response = await fetch(`/api/getResults?id=${versionId}`);
            const json = await response.json();
            const summaries: { [key: string]: any[] } = {
                county_summary: json.data?.county_summary || [],
                monthly_summary: json.data?.monthly_summary || [],
                weekly_summary: json.data?.weekly_summary || [],
                yearly_summary: json.data?.yearly_summary || []
            };
            setData(summaries);
        } catch (error) {
            console.error("Error fetching versioned summary data:", error);
        }
    };

    const handleVersionSelect = (versionId: string, timeCreated: Date) => {
        setSelectedVersionId(versionId);
        setSelectedTimeCreated(timeCreated);
    };

    useEffect(() => {
        if (selectedVersionId) {
            fetchSummaryData(selectedVersionId);
        }
    }, [selectedVersionId]);

    return (
        <Container fluid>
            <Row>
                <Col md={1} className="d-none d-md-block p-0" style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", minWidth: "240px" }}>
                    <SidebarNav />
                </Col>
                <Col className="p-4 max-w-[70vw] mx-auto">
                    <div className="text-center py-6">
                        <h1 className="text-4xl font-bold text-gray-800">Summary Overview</h1>
                    </div>
                    {/* Version Selector */}
                    <VersionSelector onVersionSelect={handleVersionSelect} selectedId={selectedVersionId}/>

                    {selectedTimeCreated && (
                        <p className="text-muted">
                            Showing summary generated on <strong>{selectedTimeCreated.toLocaleString()}</strong>
                        </p>
                    )}

                    <Row className="g-4 mt-4">
                        <Col>
                            <Button
                                variant="warning"
                                className="mb-2"
                                onClick={() => setShowYearly(!showYearly)}
                            >
                                {showYearly ? "▼ Hide Yearly Summary" : "▶ Show Yearly Summary"}
                            </Button>
                            {showYearly && selectedVersionId && <YearlyChart versionId={selectedVersionId}/>}
                        </Col>
                    </Row>

                    <Row className="g-4 mt-4">
                        <Col>
                            <Button
                                variant="warning"
                                className="mb-2"
                                onClick={() => setShowMonthly(!showMonthly)}
                            >
                                {showMonthly ? "▼ Hide Monthly Summary" : "▶ Show Monthly Summary"}
                            </Button>
                            {showMonthly && selectedVersionId && <MonthlyChart versionId={selectedVersionId}/>}
                        </Col>
                    </Row>

                    <Row className="g-4 mt-4">
                        <Col>
                            <Button
                                variant="warning"
                                className="mb-2"
                                onClick={() => setShowWeekly(!showWeekly)}
                            >
                                {showWeekly ? "▼ Hide Weekly Summary" : "▶ Show Weekly Summary"}
                            </Button>
                            {showWeekly && selectedVersionId && <WeeklyChart versionId={selectedVersionId}/>}
                        </Col>
                    </Row>
                    <Row className="g-4 mt-4">
                        <Col>
                            {data.county_summary && (
                                <>
                                    <Button
                                        variant="warning"
                                        className="mb-2"
                                        onClick={() => setShowCountyTable(!showCountyTable)}
                                    >
                                        {showCountyTable ? "▼ Hide County Summary" : "▶ Show County Summary"}
                                    </Button>

                                    {showCountyTable && (
                                        <>
                                            <h2 className="mb-3">County Summary</h2>
                                            <div className="bg-white p-3 rounded shadow-sm">
                                                <Table striped bordered hover responsive style={{ width: "80%", margin: "0 auto" }}>
                                                    <thead>
                                                    <tr>
                                                        {sectionKeyOrders.county_summary.map((key) => (
                                                            <th key={key}>{columnMappings[key] || key}</th>
                                                        ))}
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {data.county_summary.sort((a, b) => a.County.localeCompare(b.County)).map((item, index) => (
                                                        <tr key={index}>
                                                            {sectionKeyOrders.county_summary.map((key, idx) => (
                                                                <td key={idx}>
                                                                    {key === "County"
                                                                        ? item[key]?.charAt(0).toUpperCase() + item[key]?.slice(1)
                                                                        : item[key]}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Container>
    );
}
