"use client";
import React, { useEffect, useState } from "react";
import SidebarNav from "@/components/ui/sidebar";
import { Container, Row, Col } from "react-bootstrap";
import VersionSelector from "@/components/VersionSelector";
import ZipMap from "@/components/ZipMap";
import {useAuth} from "@/firebase/authContext";
import {useRouter} from "next/navigation";
import DemographicCharts from "@/components/ui/DemographicCharts";
import CountyMap from "@/components/CountyMap";
import {Button, ButtonGroup} from "react-bootstrap";

interface Metrics {
    totalPeopleHelped: number;
    totalFoodDelivered: number;
}

export default function Dashboard() {
    //Add logic to navigate the user back to the login page if user does not sign in
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading]);

    const [totalMetrics, setTotalMetrics] = useState<Metrics | null>(null);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [selectedTimeCreated, setSelectedTimeCreated] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const [selectedZip, setSelectedZip] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState("latest");
    const [specificTime, setSpecificTime] = useState("");
    const [versionData, setVersionData] = useState<any>(null);
    const [mapView, setMapView] = useState<"zip" | "county">("zip");
    const [selectedCounty, setSelectedCounty] = useState<string | null>(null);

    const fetchData = async (versionId: string) => {
        if (!versionId) return

        setIsLoading(true)
        setError(null)

        try {
            console.log(`Fetching data for version: ${versionId}`)
            const response = await fetch(`/api/getResults?id=${versionId}`)

            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.statusText}`)
            }

            const {data} = await response.json()
            setVersionData(data);
            console.log("Fetched Data:", data)

            // Extract metrics from the nested data structure
            const metrics: Metrics = {
                totalPeopleHelped: data?.total_people_helped || 0,
                totalFoodDelivered: data?.total_food_delivered || 0,
            }

            setTotalMetrics(metrics)
        } catch (error) {
            console.error("Error fetching data:", error)
            setError(error.message || "Failed to load dashboard data")
        } finally {
            setIsLoading(false)
        }
    }

    // Handle version selection
    const handleVersionSelect = (versionId: string, timeCreated: Date) => {
        setSelectedVersionId(versionId)
        setSelectedTimeCreated(timeCreated)
    }


    useEffect(() => {
        if (selectedVersionId) {
            fetchData(selectedVersionId)
        }
    }, [selectedVersionId])

    return (
        <Container fluid className="p-0">
            <Row className="m-0">
                <Col md={2} className="d-none d-md-block p-0" style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
                    <SidebarNav />
                </Col>

                <Col md={10} lg={10} className="pt-5 pb-2 d-flex flex-column min-vh-100">
                    <div style={{margin: "0 auto"}}>
                        {/* Dashboard Header */}
                        <div className="text-center py-6">
                            <h1 className="text-4xl font-bold text-gray-800">Satisfeed Dashboard</h1>
                        </div>

                        {/* Version Selector */}
                        <VersionSelector onVersionSelect={handleVersionSelect} selectedId={selectedVersionId}/>

                        {/* Status Message */}
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                <p>{error}</p>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="text-center py-8">
                                <p className="text-gray-600">Loading dashboard data...</p>
                            </div>
                        ) : (
                            <>
                                {versionData?.dataset_info && (
                                    <p className="text-center text-sm text-gray-600 mb-4">
                                        Data collected from <b>{versionData.dataset_info.startDate}</b> to
                                        <b>{versionData.dataset_info.endDate}</b> — {versionData.dataset_info.recordCount} records
                                    </p>
                                )}

                                <Row>
                                    <Col md={7}>
                                        {versionData && (
                                            <DemographicCharts
                                                data={versionData}
                                                selectedZip={selectedZip}
                                                selectedCounty={selectedCounty}
                                                timeframe={timeframe}
                                                specificTime={specificTime}
                                            />
                                        )}
                                    </Col>
                                    <Col>
                                        <ButtonGroup className="mb-3">
                                            <Button
                                                variant="custom"
                                                className={`border border-dark px-4 py-2 ${mapView === "zip" ? "bg-warning text-dark border border-dark" : "btn-secondary"}`}
                                                onClick={() => {
                                                    setMapView("zip");
                                                    setSelectedCounty(null);
                                                    setSelectedZip(null);
                                                    setTimeframe("latest");
                                                    setSpecificTime("");
                                                }}
                                            >
                                                ZIP Map
                                            </Button>
                                            <Button
                                                variant="custom"
                                                className={`border border-dark px-4 py-2 ${mapView === "county" ? "bg-warning text-dark border border-dark" : "btn-secondary"}`}
                                                onClick={() => {
                                                    setMapView("county");
                                                    setSelectedZip(null);
                                                    setSelectedCounty(null);
                                                    setTimeframe("latest");
                                                    setSpecificTime("");
                                                }}
                                            >
                                                County Map
                                            </Button>
                                        </ButtonGroup>
                                        {mapView === "zip" ? (
                                            <ZipMap
                                                versionId={selectedVersionId}
                                                selectedZip={selectedZip}
                                                setSelectedZip={setSelectedZip}
                                                timeframe={timeframe}
                                                specificTime={specificTime}
                                                setTimeframe={setTimeframe}
                                                setSpecificTime={setSpecificTime}
                                            />
                                        ) : (
                                            <CountyMap
                                                versionId={selectedVersionId}
                                                timeframe={timeframe}
                                                specificTime={specificTime}
                                                setTimeframe={setTimeframe}
                                                setSpecificTime={setSpecificTime}
                                                setSelectedCounty={setSelectedCounty}
                                            />
                                        )}
                                    </Col>
                                </Row>
                            </>
                        )}
                    </div>
                    <footer className="mt-auto text-center text-muted small pt-3">
                        © 2025 Georgia Gwinnett College – Team Satisfeed
                    </footer>
                </Col>
            </Row>
        </Container>
    );
}
