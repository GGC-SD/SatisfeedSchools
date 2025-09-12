import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ChartTooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { useEffect, useState } from "react";
import { Card, Button, Table } from "react-bootstrap";

interface ChartData {
    [key: string]: any;
    amountDelivered: number;
    peopleHelped: number;
    peopleReached: number;
}

const customTooltipFormatter = (value: any, name: any) => {
    if (name === "peopleReached") return [`${value}`, "Total People Helped"];
    if (name === "peopleHelped") return [`${value}`, "Family Reached"];
    return [value, name];
};

function DataTable({ data, timeKey }: { data: ChartData[], timeKey: string }) {
    return (
        <Table striped bordered hover className="mt-3">
            <thead>
            <tr>
                <th>{timeKey}</th>
                <th>Total Family Reached</th>
                <th>Total People Helped</th>
            </tr>
            </thead>
            <tbody>
            {data.map((entry, index) => (
                <tr key={index}>
                    <td>{entry[timeKey]}</td>
                    <td>{entry.peopleHelped}</td>
                    <td>{entry.peopleReached}</td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

function ChartContainer({
                            title,
                            versionId,
                            chartType,
                            ChartComponent,
                            timeKey
                        }: {
    title: string;
    versionId: string;
    chartType: "yearly" | "monthly" | "weekly";
    ChartComponent: any;
    timeKey: string;
}) {
    const [data, setData] = useState<ChartData[]>([]);
    const [showTable, setShowTable] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!versionId) return;
            try {
                const response = await fetch(`/api/getResults?id=${versionId}`);
                const result = await response.json();
                const chartData = result?.data?.[`${chartType}_summary`] || [];
                setData(chartData.filter((entry: any) => entry[timeKey] !== "Unknown"));
            } catch (error) {
                console.error(`Error fetching ${chartType} data:`, error);
            }
        }
        fetchData();
    }, [versionId, chartType]);

    return (
        <Card className="shadow-sm p-3 mb-4">
            <Card.Body>
                <Card.Title className="text-center fw-bold">{title}</Card.Title>
                <div style={{display: "flex", justifyContent: "center"}}>
                    <ResponsiveContainer width="80%" aspect={2.5}>{ChartComponent({data})}</ResponsiveContainer>
                </div>
                <Button variant="secondary" className="mt-3" onClick={() => setShowTable(!showTable)}>
                    {showTable ? "Hide" : "Show"} Detailed Data
                </Button>
                {showTable && <DataTable data={data} timeKey={timeKey}/>}
            </Card.Body>
        </Card>
);
}

export function YearlyChart({
    versionId }: { versionId: string }) {
    return (
        <ChartContainer
            title="Yearly Summary"
            versionId={versionId}
            chartType="yearly"
            timeKey="Year"
            ChartComponent={({ data }: { data: ChartData[] }) => (
                <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="Year" />
                    <YAxis />
                    <ChartTooltip formatter={customTooltipFormatter} />
                    <Legend formatter={(value) => (value === "peopleReached" ? "Total People Helped" : "Family Reached")} />
                    <Bar dataKey="peopleReached" fill="#8884d8" barSize={30} />
                    <Bar dataKey="peopleHelped" fill="#82ca9d" barSize={30} />
                </BarChart>
            )}
        />
    );
}

export function MonthlyChart({ versionId }: { versionId: string }) {
    return (
        <ChartContainer
            title="Monthly Summary"
            versionId={versionId}
            chartType="monthly"
            timeKey="YearMonth"
            ChartComponent={({ data }: { data: ChartData[] }) => (
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="YearMonth" />
                    <YAxis />
                    <ChartTooltip formatter={customTooltipFormatter} />
                    <Legend formatter={(value) => (value === "peopleReached" ? "Total People Helped" : "Family Reached")} />
                    <Bar dataKey="peopleReached" fill="#82ca9d" barSize={30} />
                    <Bar dataKey="peopleHelped" fill="#8884d8" barSize={30} />
                </BarChart>
            )}
        />
    );
}

export function WeeklyChart({ versionId }: { versionId: string }) {
    return (
        <ChartContainer
            title="Weekly Summary"
            versionId={versionId}
            chartType="weekly"
            timeKey="Week"
            ChartComponent={({ data }: { data: ChartData[] }) => (
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="Week" tick={{ fontSize: 12, fill: "#333" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#333" }} />
                    <ChartTooltip
                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #ccc", borderRadius: "4px" }}
                        labelStyle={{ fontWeight: "bold", color: "#333" }}
                        formatter={customTooltipFormatter}
                    />
                    <Legend formatter={(value) => (value === "peopleReached" ? "Total People Helped" : "Family Reached")} />
                    <Line type="monotone" dataKey="peopleReached" stroke="#4A90E2" strokeWidth={3} />
                    <Line type="monotone" dataKey="peopleHelped" stroke="#8884d8" strokeWidth={3} />
                </LineChart>
            )}
        />
    );
}
