import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WasteTypeData {
  [key: string]: number;
}

interface IndustryData {
  [key: string]: number;
}

const AnalyticsTab = ({ profile }: { profile: any }) => {
  const [stats, setStats] = useState({ clients: 0, trucks: 0, drivers: 0, helpers: 0, receipts: 0 });
  const [wasteByType, setWasteByType] = useState<WasteTypeData>({});
  const [collectionsByIndustry, setCollectionsByIndustry] = useState<IndustryData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Analyze waste types
        const wasteData: WasteTypeData = {};
        receipts.data?.forEach((r: any) => {
          if (r.waste_types && Array.isArray(r.waste_types)) {
            r.waste_types.forEach((type: string) => {
              wasteData[type] = (wasteData[type] || 0) + 1;
            });
          }
        });
        setWasteByType(wasteData);

        // Analyze collections by industry
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
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Clients</p><p className="text-2xl font-bold">{stats.clients}</p></div>
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Trucks</p><p className="text-2xl font-bold">{stats.trucks}</p></div>
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Drivers</p><p className="text-2xl font-bold">{stats.drivers}</p></div>
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Helpers</p><p className="text-2xl font-bold">{stats.helpers}</p></div>
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Receipts</p><p className="text-2xl font-bold">{stats.receipts}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collections by Waste Type</CardTitle>
          <CardDescription>Breakdown of waste types collected</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : Object.keys(wasteByType).length === 0 ? (
            <p className="text-muted-foreground">No collection data yet</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(wasteByType).map(([type, count]) => (
                <div key={type} className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">{type}</p>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">collections</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collections by Industry</CardTitle>
          <CardDescription>Which industries generate the most collections</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : Object.keys(collectionsByIndustry).length === 0 ? (
            <p className="text-muted-foreground">No collection data yet</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(collectionsByIndustry)
                .sort(([, a], [, b]) => b - a)
                .map(([industry, count]) => (
                  <div key={industry} className="rounded-md border p-4">
                    <p className="text-sm text-muted-foreground">{industry}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">collections</p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsTab;
