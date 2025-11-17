import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddClientDialog from "./AddClientDialog";
import ClientEditDialog from "./ClientEditDialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, Pencil } from "lucide-react";
import QRCode from "qrcode";
import { generateCSV, downloadCSV, parseCSV } from "@/lib/csvUtils";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';

const ClientsTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = profile?.role === "admin";
  const isMobile = Capacitor.isNativePlatform();

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id,name,industry,address,qr_code,contact_person,contact_number,mt_requirement,collection_days,collection_shift")
      .order("name");
    if (error) setError(error.message);
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

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

  const downloadTemplate = () => {
    const csv = generateCSV([], ['name', 'industry', 'address', 'contact_info', 'contact_person', 'contact_number']);
    downloadCSV(csv, 'clients-template.csv');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const clientsToInsert = rows.map(row => ({
        name: row.name,
        industry: row.industry,
        address: row.address || null,
        contact_info: row.contact_info || null,
        contact_person: row.contact_person || null,
        contact_number: row.contact_number || null,
        qr_code: `CLIENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));

      const { error } = await supabase.from("clients").insert(clientsToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${clientsToInsert.length} clients` });
      fetchClients();
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Manage your client database</CardDescription>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {!isMobile && (
                <>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />Template
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />Import CSV
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImport}
                    className="hidden"
                  />
                </>
              )}
              <AddClientDialog profile={profile} onAdded={fetchClients} />
            </div>
          )}
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
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>QR Code</TableHead>
                  {!isMobile && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.industry}</TableCell>
                    <TableCell>{client.contact_person || "—"}</TableCell>
                    <TableCell>{client.contact_number || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => downloadQR(client.qr_code, client.name)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setEditingClient(client)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
      </CardContent>
      {editingClient && (
        <ClientEditDialog 
          client={editingClient}
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
          onUpdated={fetchClients}
        />
      )}
    </Card>
  );
};

export default ClientsTab;
