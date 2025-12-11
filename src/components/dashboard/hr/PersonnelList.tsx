import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, WifiOff } from "lucide-react";

interface Personnel {
  id: string;
  name: string;
  type: string;
  contact_number: string | null;
  status: string | null;
  birthdate: string | null;
}

interface CachedPersonnel {
  id: string;
  name: string;
  contact_number?: string | null;
  status?: string | null;
  birthdate?: string | null;
}

interface PersonnelListProps {
  isOnline?: boolean;
  // Cached data from hrSync (passed from parent)
  cachedDrivers?: CachedPersonnel[];
  cachedHelpers?: CachedPersonnel[];
  cachedMechanics?: CachedPersonnel[];
  cachedRecyclers?: CachedPersonnel[];
  cachedManagement?: CachedPersonnel[];
}

const PersonnelList = ({ 
  isOnline = true,
  cachedDrivers = [],
  cachedHelpers = [],
  cachedMechanics = [],
  cachedRecyclers = [],
  cachedManagement = [],
}: PersonnelListProps) => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingCachedData, setUsingCachedData] = useState(false);

  useEffect(() => {
    if (isOnline) {
      fetchPersonnel();
    } else {
      // Use cached data when offline
      loadCachedPersonnel();
    }
  }, [isOnline, cachedDrivers, cachedHelpers, cachedMechanics, cachedRecyclers, cachedManagement]);

  const loadCachedPersonnel = () => {
    const allCached: Personnel[] = [
      ...cachedDrivers.map(d => ({ 
        id: d.id, 
        name: d.name, 
        type: "Driver", 
        contact_number: d.contact_number || null,
        status: d.status || null,
        birthdate: d.birthdate || null,
      })),
      ...cachedHelpers.map(h => ({ 
        id: h.id, 
        name: h.name, 
        type: "Helper",
        contact_number: h.contact_number || null,
        status: h.status || null,
        birthdate: h.birthdate || null,
      })),
      ...cachedMechanics.map(m => ({ 
        id: m.id, 
        name: m.name, 
        type: "Mechanic",
        contact_number: m.contact_number || null,
        status: m.status || null,
        birthdate: m.birthdate || null,
      })),
      ...cachedRecyclers.map(r => ({ 
        id: r.id, 
        name: r.name, 
        type: "Recycler",
        contact_number: r.contact_number || null,
        status: r.status || null,
        birthdate: r.birthdate || null,
      })),
      ...cachedManagement.map(mg => ({ 
        id: mg.id, 
        name: mg.name, 
        type: "Management",
        contact_number: mg.contact_number || null,
        status: mg.status || null,
        birthdate: mg.birthdate || null,
      })),
    ];

    if (allCached.length > 0) {
      setPersonnel(allCached);
      setUsingCachedData(true);
      setError(null);
    } else {
      setError("No cached data available. Go online to sync personnel data.");
    }
    setLoading(false);
  };

  const fetchPersonnel = async () => {
    try {
      setLoading(true);
      setError(null);
      setUsingCachedData(false);
      
      // Fetch drivers
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, name, contact_number, status, birthdate")
        .order("name");

      // Fetch helpers
      const { data: helpers } = await supabase
        .from("helpers")
        .select("id, name, contact_number, status, birthdate")
        .order("name");

      // Fetch mechanics
      const { data: mechanics } = await supabase
        .from("mechanics")
        .select("id, name, contact_number, status, birthdate")
        .order("name");

      // Fetch recyclers
      const { data: recyclers } = await supabase
        .from("recyclers")
        .select("id, name, contact_number, status, birthdate")
        .order("name");

      // Fetch management
      const { data: management } = await supabase
        .from("management")
        .select("id, name, contact_number, status, birthdate")
        .order("name");

      const allPersonnel: Personnel[] = [
        ...(drivers?.map(d => ({ ...d, type: "Driver" })) || []),
        ...(helpers?.map(h => ({ ...h, type: "Helper" })) || []),
        ...(mechanics?.map(m => ({ ...m, type: "Mechanic" })) || []),
        ...(recyclers?.map(r => ({ ...r, type: "Recycler" })) || []),
        ...(management?.map(mg => ({ ...mg, type: "Management" })) || []),
      ];

      setPersonnel(allPersonnel);
    } catch (error) {
      console.error("Error fetching personnel:", error);
      setError("Failed to load personnel");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Personnel</CardTitle>
          {usingCachedData && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>
        {usingCachedData && (
          <p className="text-xs text-muted-foreground">
            Showing cached data. Go online to get latest updates.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="rounded-full bg-muted p-3 mb-3">
              <WifiOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center font-medium">{error}</p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Connect to internet to sync personnel data first.
            </p>
          </div>
        ) : personnel.length === 0 ? (
          <p className="text-muted-foreground">No personnel found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Birthdate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personnel.map((person) => (
                <TableRow key={`${person.type}-${person.id}`}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{person.type}</Badge>
                  </TableCell>
                  <TableCell>{person.contact_number || "N/A"}</TableCell>
                  <TableCell>{person.birthdate || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={person.status === "available" ? "default" : "secondary"}>
                      {person.status || "N/A"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonnelList;