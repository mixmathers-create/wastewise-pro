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
import { Checkbox } from "@/components/ui/checkbox";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const ClientsTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roleAccess = useRoleAccess(profile?.user_type || 'admin');
  const isMobile = Capacitor.isNativePlatform();
  
  const ITEMS_PER_PAGE = 10;

  const fetchClients = async (page = 1) => {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error, count } = await supabase
      .from("clients")
      .select("id,name,industry,address,qr_code,contact_person,contact_number,mt_requirement,collection_days,collection_shift,status,contract_file_url,contract_expiry_date", { count: 'exact' })
      .order("name")
      .range(from, to);
    
    if (error) setError(error.message);
    setClients(data || []);
    setTotalClients(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients(currentPage);
  }, [currentPage]);

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
    const exampleData = [{
      name: 'Sample Restaurant',
      latitude: '10.3157',
      longitude: '123.8854',
      contact_info: 'manager@samplerestaurant.com',
      contact_number: '+63 912 345 6789',
      contact_person: 'John Doe'
    }];
    const csv = generateCSV(exampleData, ['name', 'latitude', 'longitude', 'contact_info', 'contact_number', 'contact_person']);
    downloadCSV(csv, 'clients-template.csv');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      // Validate that required fields are present
      const invalidRows = rows.filter(row => 
        !row.name || !row.latitude || !row.longitude || !row.contact_info || !row.contact_number || !row.contact_person
      );

      if (invalidRows.length > 0) {
        toast({ 
          title: "Import Error", 
          description: "All rows must have name, latitude, longitude, contact_info, contact_number, and contact_person", 
          variant: "destructive" 
        });
        return;
      }

      const clientsToInsert = rows.map(row => ({
        name: row.name,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        contact_info: row.contact_info,
        contact_number: row.contact_number,
        contact_person: row.contact_person,
        industry: 'General', // Default value, to be updated via desktop app
        mt_requirement: 0, // Default value, to be updated via desktop app
        collection_shift: 'AM', // Default value, to be updated via desktop app
        collection_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], // Default value, to be updated via desktop app
        qr_code: `CLIENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));

      const { error } = await supabase.from("clients").insert(clientsToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${clientsToInsert.length} clients` });
      fetchClients(currentPage);
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelectClient = (clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(clients.map(c => c.id)));
    }
  };

  const handleMassDelete = async () => {
    if (selectedClients.size === 0) return;

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .in("id", Array.from(selectedClients));

      if (error) throw error;

      toast({ title: "Success", description: `Deleted ${selectedClients.size} clients` });
      setSelectedClients(new Set());
      fetchClients(currentPage);
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
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
          {roleAccess.canEditClients && (
            <div className="flex gap-2 items-center">
              {selectedClients.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleMassDelete}
                >
                  Delete ({selectedClients.size})
                </Button>
              )}
              {!isMobile && roleAccess.canImportExport && (
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
              <AddClientDialog profile={profile} onAdded={() => fetchClients(currentPage)} />
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
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {roleAccess.canEditClients && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedClients.size === clients.length && clients.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>QR Code</TableHead>
                  {!isMobile && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    {roleAccess.canEditClients && (
                      <TableCell>
                        <Checkbox
                          checked={selectedClients.has(client.id)}
                          onCheckedChange={() => toggleSelectClient(client.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.industry}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        client.status === 'active' ? 'bg-green-100 text-green-800' :
                        client.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {client.status || 'active'}
                      </span>
                    </TableCell>
                    <TableCell>{client.contact_person || "—"}</TableCell>
                    <TableCell>{client.contact_number || "—"}</TableCell>
                    <TableCell>
                      {client.contract_file_url ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={async () => {
                            const { data } = await supabase.storage
                              .from('client-contracts')
                              .createSignedUrl(client.contract_file_url.split('/').pop()!, 60);
                            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                          }}
                        >
                          View
                        </Button>
                      ) : "—"}
                      {client.contract_expiry_date && (
                        <div className="text-xs text-muted-foreground">
                          Exp: {new Date(client.contract_expiry_date).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => downloadQR(client.qr_code, client.name)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    {!isMobile && roleAccess.canEditClients && (
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
            {totalClients > ITEMS_PER_PAGE && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(totalClients / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalClients / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage >= Math.ceil(totalClients / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
      {editingClient && (
        <ClientEditDialog 
          client={editingClient}
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
          onUpdated={() => fetchClients(currentPage)}
        />
      )}
    </Card>
  );
};

export default ClientsTab;
