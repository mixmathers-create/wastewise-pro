import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface WasteTypeData {
  [key: string]: number;
}

interface IndustryData {
  [key: string]: number;
}

const EnhancedAnalyticsTab = ({ profile }: { profile: any }) => {
  const [stats, setStats] = useState({ clients: 0, trucks: 0, drivers: 0, helpers: 0, receipts: 0 });
  const [wasteByType, setWasteByType] = useState<WasteTypeData>({});
  const [collectionsByIndustry, setCollectionsByIndustry] = useState<IndustryData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [clients, trucks, drivers, helpers, receipts, receiptsWithClient] = await Promise.all([
          supabase.from("clients").select("id"),
          supabase.from("trucks").select("id"),
          supabase.from("drivers").select("id"),
          supabase.from("helpers").select("id"),
          supabase.from("collection_receipts").select("id, waste_types, items"),
          supabase.from("collection_receipts").select("id, client_id, clients(industry)"),
        ]);

        setStats({
          clients: clients.data?.length || 0,
          trucks: trucks.data?.length || 0,
          drivers: drivers.data?.length || 0,
          helpers: helpers.data?.length || 0,
          receipts: receipts.data?.length || 0,
        });

        const wasteData: WasteTypeData = {};
        receipts.data?.forEach((r: any) => {
          if (r.waste_types && Array.isArray(r.waste_types)) {
            r.waste_types.forEach((type: string) => {
              wasteData[type] = (wasteData[type] || 0) + 1;
            });
          }
        });
        setWasteByType(wasteData);

        const industryData: IndustryData = {};
        receiptsWithClient.data?.forEach((r: any) => {
          const industry = r.clients?.industry || "Unknown";
          industryData[industry] = (industryData[industry] || 0) + 1;
        });
        setCollectionsByIndustry(industryData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const wasteChartData = Object.entries(wasteByType).map(([name, value]) => ({ name, value }));
  const industryChartData = Object.entries(collectionsByIndustry).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resource Overview</CardTitle>
          <CardDescription>Total counts of resources and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{stats.clients}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Trucks</p>
                <p className="text-2xl font-bold">{stats.trucks}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Drivers</p>
                <p className="text-2xl font-bold">{stats.drivers}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Helpers</p>
                <p className="text-2xl font-bold">{stats.helpers}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Receipts</p>
                <p className="text-2xl font-bold">{stats.receipts}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && !error && wasteChartData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Collections by Waste Type</CardTitle>
              <CardDescription>Distribution across waste categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={wasteChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collections by Industry</CardTitle>
              <CardDescription>Client industry breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={industryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {industryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Collections Assessment</CardTitle>
          <CardDescription>Insights from receipt data</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Waste Type Analysis</h4>
                {wasteChartData.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {wasteChartData.map((item) => (
                      <li key={item.name}>
                        <span className="font-medium">{item.name}</span>: {item.value} collections
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No waste type data available</p>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Industry Distribution</h4>
                {industryChartData.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {industryChartData.map((item) => (
                      <li key={item.name}>
                        <span className="font-medium">{item.name}</span>: {item.value} collections
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No industry data available</p>
                )}
              </div>

              <div className="rounded-md bg-muted p-4">
                <h4 className="font-semibold mb-2">Summary</h4>
                <p className="text-sm">
                  Total of <strong>{stats.receipts}</strong> collection receipts across <strong>{stats.clients}</strong> clients.
                  Operations supported by <strong>{stats.drivers}</strong> drivers, <strong>{stats.helpers}</strong> helpers, and{" "}
                  <strong>{stats.trucks}</strong> trucks.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAnalyticsTab;
