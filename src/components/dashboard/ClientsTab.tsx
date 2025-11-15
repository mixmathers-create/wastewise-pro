import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddClientDialog from "./AddClientDialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import QRCode from "qrcode";

const ClientsTab = ({ profile }: { profile: any }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = profile?.role === "admin";

  const fetchClients = async () => {
    if (!profile?.team_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id,name,industry,address,contact_info,qr_code")
      .eq("team_id", profile.team_id)
      .order("name");
    if (error) setError(error.message);
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [profile?.team_id]);

  const downloadQR = async (qrCode: string, clientName: string) => {
    try {
      const url = await QRCode.toDataURL(qrCode, { width: 300 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientName}-QR.png`;
      a.click();
    } catch (err) {
      console.error("QR generation error:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Manage your client database</CardDescription>
          </div>
          {isAdmin && <AddClientDialog profile={profile} onAdded={fetchClients} />}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : clients.length === 0 ? (
          <p className="text-muted-foreground">No clients yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.industry}</TableCell>
                  <TableCell>{c.address}</TableCell>
                  <TableCell>{c.contact_info}</TableCell>
                  <TableCell className="font-mono text-xs">{c.qr_code}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => downloadQR(c.qr_code, c.name)}>
                      <Download className="h-4 w-4" />
                    </Button>
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

export default ClientsTab;
