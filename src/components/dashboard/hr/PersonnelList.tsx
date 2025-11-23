import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Personnel {
  id: string;
  name: string;
  type: string;
  contact_number: string | null;
  status: string | null;
  birthdate: string | null;
}

const PersonnelList = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const fetchPersonnel = async () => {
    try {
      setLoading(true);
      
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

      const allPersonnel: Personnel[] = [
        ...(drivers?.map(d => ({ ...d, type: "Driver" })) || []),
        ...(helpers?.map(h => ({ ...h, type: "Helper" })) || []),
        ...(mechanics?.map(m => ({ ...m, type: "Mechanic" })) || []),
      ];

      setPersonnel(allPersonnel);
    } catch (error) {
      console.error("Error fetching personnel:", error);
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
        <CardTitle>All Personnel</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};

export default PersonnelList;