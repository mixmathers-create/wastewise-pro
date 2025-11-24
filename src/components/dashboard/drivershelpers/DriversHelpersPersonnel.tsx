import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Upload, Edit, Trash2, Users, UserCog, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { generateCSV, downloadCSV, parseCSV } from "@/lib/csvUtils";
import AddDriverDialog from "../AddDriverDialog";
import AddHelperDialog from "../AddHelperDialog";
import DriverEditDialog from "../DriverEditDialog";
import HelperEditDialog from "../HelperEditDialog";
import PersonnelEditDialog from "../PersonnelEditDialog";
import LicensePreviewDialog from "../LicensePreviewDialog";

export default function DriversHelpersPersonnel({ profile }: { profile: any }) {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [recyclers, setRecyclers] = useState<any[]>([]);
  const [management, setManagement] = useState<any[]>([]);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [editingHelper, setEditingHelper] = useState<any>(null);
  const [editingRecycler, setEditingRecycler] = useState<any>(null);
  const [editingManagement, setEditingManagement] = useState<any>(null);
  const [viewingLicense, setViewingLicense] = useState<{url: string; name: string} | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{url: string; name: string} | null>(null);
  const [selectedHelpers, setSelectedHelpers] = useState<string[]>([]);
  const [selectedRecyclers, setSelectedRecyclers] = useState<string[]>([]);
  const [selectedManagement, setSelectedManagement] = useState<string[]>([]);
  const driverFileInputRef = useRef<HTMLInputElement>(null);
  const helperFileInputRef = useRef<HTMLInputElement>(null);
  const recyclerFileInputRef = useRef<HTMLInputElement>(null);
  const managementFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDrivers();
    fetchHelpers();
    fetchRecyclers();
    fetchManagement();
  }, []);

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDrivers(data || []);
    }
  };

  const fetchHelpers = async () => {
    const { data, error } = await supabase
      .from("helpers")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setHelpers(data || []);
    }
  };

  const fetchRecyclers = async () => {
    const { data, error } = await supabase
      .from("recyclers")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRecyclers(data || []);
    }
  };

  const fetchManagement = async () => {
    const { data, error } = await supabase
      .from("management")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setManagement(data || []);
    }
  };

  const exportDrivers = () => {
    const csv = generateCSV(drivers, [
      "name", "license_number", "id_number", "birthdate", 
      "contact_number", "status", "license_expiry_date",
      "suspension_start_date", "suspension_end_date"
    ]);
    downloadCSV(csv, "drivers-export.csv");
  };

  const exportHelpers = () => {
    const csv = generateCSV(helpers, [
      "name", "contact_number", "address", "leaves_available"
    ]);
    downloadCSV(csv, "helpers-export.csv");
  };

  const downloadHelperTemplate = () => {
    const headers = ['name', 'contact_number', 'address', 'leaves_available'];
    const templateRow = {
      name: 'Juan Dela Cruz',
      contact_number: '09171234567',
      address: '123 Main St, Cebu City',
      leaves_available: '15'
    };
    const csv = generateCSV([templateRow], headers);
    downloadCSV(csv, 'helpers_import_template.csv');
  };

  const exportRecyclers = () => {
    const csv = generateCSV(recyclers, [
      "name", "contact_number", "address", "leaves_available"
    ]);
    downloadCSV(csv, "recyclers-export.csv");
  };

  const downloadRecyclerTemplate = () => {
    const headers = ['name', 'contact_number', 'address', 'leaves_available'];
    const templateRow = {
      name: 'Maria Santos',
      contact_number: '09171234567',
      address: '456 Main St, Cebu City',
      leaves_available: '15'
    };
    const csv = generateCSV([templateRow], headers);
    downloadCSV(csv, 'recyclers_import_template.csv');
  };

  const exportManagement = () => {
    const csv = generateCSV(management, [
      "name", "contact_number", "address", "leaves_available"
    ]);
    downloadCSV(csv, "management-export.csv");
  };

  const downloadManagementTemplate = () => {
    const headers = ['name', 'contact_number', 'address', 'leaves_available'];
    const templateRow = {
      name: 'Pedro Reyes',
      contact_number: '09171234567',
      address: '789 Main St, Cebu City',
      leaves_available: '15'
    };
    const csv = generateCSV([templateRow], headers);
    downloadCSV(csv, 'management_import_template.csv');
  };

  const handleDriverImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const driversToInsert = rows.map(row => ({
        name: row.name,
        license_number: row.license_number || null,
        id_number: row.id_number || null,
        birthdate: row.birthdate || null,
        contact_number: row.contact_number || null,
        status: row.status || "available",
        license_expiry_date: row.license_expiry_date || null,
        suspension_start_date: row.suspension_start_date || null,
        suspension_end_date: row.suspension_end_date || null,
      }));

      const { error } = await supabase.from("drivers").insert(driversToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${rows.length} drivers` });
      fetchDrivers();
    } catch (error: any) {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
    }

    if (driverFileInputRef.current) driverFileInputRef.current.value = "";
  };

  const handleHelperImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);
    
    if (rows.length === 0) {
      toast({ title: "No data found in CSV", variant: "destructive" });
      return;
    }

    try {
      const helpersToInsert = rows.map(row => ({
        name: row.name || row.Name,
        contact_number: row.contact_number || row.contact_number,
        address: row.address || row.Address || null,
        leaves_available: parseInt(row.leaves_available || row.leaves_available || '15'),
        status: "available"
      }));

      const { error } = await supabase.from("helpers").insert(helpersToInsert);
      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Imported ${rows.length} helper(s)` 
      });
      fetchHelpers();
    } catch (error: any) {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
    }

    if (helperFileInputRef.current) helperFileInputRef.current.value = "";
  };

  const handleRecyclerImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);
    
    if (rows.length === 0) {
      toast({ title: "No data found in CSV", variant: "destructive" });
      return;
    }

    try {
      const recyclersToInsert = rows.map(row => ({
        name: row.name || row.Name,
        contact_number: row.contact_number || row.contact_number,
        address: row.address || row.Address || null,
        leaves_available: parseInt(row.leaves_available || row.leaves_available || '15'),
        status: "available"
      }));

      const { error } = await supabase.from("recyclers").insert(recyclersToInsert);
      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Imported ${rows.length} recycler(s)` 
      });
      fetchRecyclers();
    } catch (error: any) {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
    }

    if (recyclerFileInputRef.current) recyclerFileInputRef.current.value = "";
  };

  const handleManagementImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);
    
    if (rows.length === 0) {
      toast({ title: "No data found in CSV", variant: "destructive" });
      return;
    }

    try {
      const managementToInsert = rows.map(row => ({
        name: row.name || row.Name,
        contact_number: row.contact_number || row.contact_number,
        address: row.address || row.Address || null,
        leaves_available: parseInt(row.leaves_available || row.leaves_available || '15'),
        status: "available"
      }));

      const { error } = await supabase.from("management").insert(managementToInsert);
      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Imported ${rows.length} management personnel` 
      });
      fetchManagement();
    } catch (error: any) {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
    }

    if (managementFileInputRef.current) managementFileInputRef.current.value = "";
  };

  const deleteDriver = async (id: string) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;

    try {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Driver deleted" });
      fetchDrivers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteHelper = async (id: string) => {
    if (!confirm("Are you sure you want to delete this helper?")) return;

    try {
      const { error } = await supabase.from("helpers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Helper deleted" });
      fetchHelpers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteRecycler = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recycler?")) return;

    try {
      const { error } = await supabase.from("recyclers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Recycler deleted" });
      fetchRecyclers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteManagement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this management personnel?")) return;

    try {
      const { error } = await supabase.from("management").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Management personnel deleted" });
      fetchManagement();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleSelectHelper = (helperId: string) => {
    setSelectedHelpers(prev =>
      prev.includes(helperId)
        ? prev.filter(id => id !== helperId)
        : [...prev, helperId]
    );
  };

  const toggleSelectAllHelpers = () => {
    if (selectedHelpers.length === helpers.length) {
      setSelectedHelpers([]);
    } else {
      setSelectedHelpers(helpers.map(h => h.id));
    }
  };

  const handleMassDeleteHelpers = async () => {
    if (selectedHelpers.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedHelpers.length} helper(s)?`)) return;

    try {
      const { error } = await supabase
        .from("helpers")
        .delete()
        .in("id", selectedHelpers);
      
      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: `${selectedHelpers.length} helper(s) deleted` 
      });
      setSelectedHelpers([]);
      fetchHelpers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleSelectRecycler = (recyclerId: string) => {
    setSelectedRecyclers(prev =>
      prev.includes(recyclerId)
        ? prev.filter(id => id !== recyclerId)
        : [...prev, recyclerId]
    );
  };

  const toggleSelectAllRecyclers = () => {
    if (selectedRecyclers.length === recyclers.length) {
      setSelectedRecyclers([]);
    } else {
      setSelectedRecyclers(recyclers.map(r => r.id));
    }
  };

  const handleMassDeleteRecyclers = async () => {
    if (selectedRecyclers.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedRecyclers.length} recycler(s)?`)) return;

    try {
      const { error } = await supabase
        .from("recyclers")
        .delete()
        .in("id", selectedRecyclers);
      
      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: `${selectedRecyclers.length} recycler(s) deleted` 
      });
      setSelectedRecyclers([]);
      fetchRecyclers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleSelectManagement = (managementId: string) => {
    setSelectedManagement(prev =>
      prev.includes(managementId)
        ? prev.filter(id => id !== managementId)
        : [...prev, managementId]
    );
  };

  const toggleSelectAllManagement = () => {
    if (selectedManagement.length === management.length) {
      setSelectedManagement([]);
    } else {
      setSelectedManagement(management.map(m => m.id));
    }
  };

  const handleMassDeleteManagement = async () => {
    if (selectedManagement.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedManagement.length} management personnel?`)) return;

    try {
      const { error } = await supabase
        .from("management")
        .delete()
        .in("id", selectedManagement);
      
      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: `${selectedManagement.length} management personnel deleted` 
      });
      setSelectedManagement([]);
      fetchManagement();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Tabs defaultValue="drivers" className="w-full">
      <TabsList>
        <TabsTrigger value="drivers">
          <UserCog className="h-4 w-4 mr-2" />
          Drivers
        </TabsTrigger>
        <TabsTrigger value="helpers">
          <Users className="h-4 w-4 mr-2" />
          Helpers
        </TabsTrigger>
        <TabsTrigger value="recyclers">
          <Users className="h-4 w-4 mr-2" />
          Recyclers
        </TabsTrigger>
        <TabsTrigger value="management">
          <Users className="h-4 w-4 mr-2" />
          Management
        </TabsTrigger>
      </TabsList>

      <TabsContent value="drivers">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Drivers</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportDrivers}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => driverFileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <input
                  ref={driverFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleDriverImport}
                  className="hidden"
                />
                <AddDriverDialog profile={profile} onAdded={fetchDrivers} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>License #</TableHead>
                  <TableHead>ID #</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>License Expiry</TableHead>
                  <TableHead>License File</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.license_number || "—"}</TableCell>
                    <TableCell>{driver.id_number || "—"}</TableCell>
                    <TableCell>{driver.contact_number || "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        driver.status === "available" ? "bg-green-100 text-green-800" :
                        driver.status === "on_duty" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {driver.status?.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {driver.license_expiry_date
                        ? new Date(driver.license_expiry_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {driver.license_file_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingLicense({url: driver.license_file_url, name: driver.name})}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {driver.photo_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingPhoto({url: driver.photo_url, name: driver.name})}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingDriver(driver)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDriver(driver.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="helpers">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Helpers</CardTitle>
              <div className="flex gap-2">
                {selectedHelpers.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleMassDeleteHelpers}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedHelpers.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={downloadHelperTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
                <Button variant="outline" size="sm" onClick={exportHelpers}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => helperFileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <input
                  ref={helperFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleHelperImport}
                  className="hidden"
                />
                <AddHelperDialog profile={profile} onAdded={fetchHelpers} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedHelpers.length === helpers.length && helpers.length > 0}
                      onCheckedChange={toggleSelectAllHelpers}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Leaves Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {helpers.map((helper) => (
                  <TableRow key={helper.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedHelpers.includes(helper.id)}
                        onCheckedChange={() => toggleSelectHelper(helper.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{helper.name}</TableCell>
                    <TableCell>{helper.contact_number || "—"}</TableCell>
                    <TableCell>{helper.address || "—"}</TableCell>
                    <TableCell>{helper.leaves_available ?? 15}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        helper.status === "available" ? "bg-green-100 text-green-800" :
                        helper.status === "on_duty" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {helper.status?.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {helper.photo_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingPhoto({url: helper.photo_url, name: helper.name})}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingHelper(helper)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteHelper(helper.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="recyclers">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recyclers</CardTitle>
              <div className="flex gap-2">
                {selectedRecyclers.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleMassDeleteRecyclers}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedRecyclers.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={downloadRecyclerTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
                <Button variant="outline" size="sm" onClick={exportRecyclers}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => recyclerFileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <input
                  ref={recyclerFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleRecyclerImport}
                  className="hidden"
                />
                <AddHelperDialog profile={profile} onAdded={fetchRecyclers} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRecyclers.length === recyclers.length && recyclers.length > 0}
                      onCheckedChange={toggleSelectAllRecyclers}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Leaves Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recyclers.map((recycler) => (
                  <TableRow key={recycler.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRecyclers.includes(recycler.id)}
                        onCheckedChange={() => toggleSelectRecycler(recycler.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{recycler.name}</TableCell>
                    <TableCell>{recycler.contact_number || "—"}</TableCell>
                    <TableCell>{recycler.address || "—"}</TableCell>
                    <TableCell>{recycler.leaves_available ?? 15}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        recycler.status === "available" ? "bg-green-100 text-green-800" :
                        recycler.status === "on_duty" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {recycler.status?.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {recycler.photo_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingPhoto({url: recycler.photo_url, name: recycler.name})}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRecycler(recycler)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecycler(recycler.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="management">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Management</CardTitle>
              <div className="flex gap-2">
                {selectedManagement.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleMassDeleteManagement}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedManagement.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={downloadManagementTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
                <Button variant="outline" size="sm" onClick={exportManagement}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => managementFileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <input
                  ref={managementFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleManagementImport}
                  className="hidden"
                />
                <AddHelperDialog profile={profile} onAdded={fetchManagement} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedManagement.length === management.length && management.length > 0}
                      onCheckedChange={toggleSelectAllManagement}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Leaves Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {management.map((mgmt) => (
                  <TableRow key={mgmt.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedManagement.includes(mgmt.id)}
                        onCheckedChange={() => toggleSelectManagement(mgmt.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{mgmt.name}</TableCell>
                    <TableCell>{mgmt.contact_number || "—"}</TableCell>
                    <TableCell>{mgmt.address || "—"}</TableCell>
                    <TableCell>{mgmt.leaves_available ?? 15}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        mgmt.status === "available" ? "bg-green-100 text-green-800" :
                        mgmt.status === "on_duty" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {mgmt.status?.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {mgmt.photo_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingPhoto({url: mgmt.photo_url, name: mgmt.name})}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingManagement(mgmt)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteManagement(mgmt.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {editingDriver && (
        <DriverEditDialog
          driver={editingDriver}
          open={!!editingDriver}
          onOpenChange={(open) => !open && setEditingDriver(null)}
          onUpdated={fetchDrivers}
        />
      )}

      {editingHelper && (
        <HelperEditDialog
          helper={editingHelper}
          open={!!editingHelper}
          onOpenChange={(open) => !open && setEditingHelper(null)}
          onUpdated={fetchHelpers}
        />
      )}

      {editingRecycler && (
        <PersonnelEditDialog
          personnel={editingRecycler}
          open={!!editingRecycler}
          onOpenChange={(open) => !open && setEditingRecycler(null)}
          onUpdated={fetchRecyclers}
          table="recyclers"
          title="Recycler"
        />
      )}

      {editingManagement && (
        <PersonnelEditDialog
          personnel={editingManagement}
          open={!!editingManagement}
          onOpenChange={(open) => !open && setEditingManagement(null)}
          onUpdated={fetchManagement}
          table="management"
          title="Management"
        />
      )}

      {viewingLicense && (
        <LicensePreviewDialog
          licenseUrl={viewingLicense.url}
          driverName={viewingLicense.name}
          open={!!viewingLicense}
          onOpenChange={(open) => !open && setViewingLicense(null)}
        />
      )}

      {viewingPhoto && (
        <LicensePreviewDialog
          licenseUrl={viewingPhoto.url}
          driverName={viewingPhoto.name}
          open={!!viewingPhoto}
          onOpenChange={(open) => !open && setViewingPhoto(null)}
        />
      )}
    </Tabs>
  );
}
