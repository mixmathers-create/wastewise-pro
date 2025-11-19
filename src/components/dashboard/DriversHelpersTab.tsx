import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import AddDriverDialog from "./AddDriverDialog";
import AddHelperDialog from "./AddHelperDialog";
import DriverEditDialog from "./DriverEditDialog";
import HelperEditDialog from "./HelperEditDialog";
import LicensePreviewDialog from "./LicensePreviewDialog";
import ExpiringLicensesAlert from "./ExpiringLicensesAlert";
import { Button } from "@/components/ui/button";
import { Download, Upload, Pencil, Eye, Trash2 } from "lucide-react";
import { generateCSV, downloadCSV, parseCSV } from "@/lib/csvUtils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DriversHelpersTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const driverFileRef = useRef<HTMLInputElement>(null);
  const helperFileRef = useRef<HTMLInputElement>(null);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [editingHelper, setEditingHelper] = useState<any>(null);
  const [driverEditOpen, setDriverEditOpen] = useState(false);
  const [helperEditOpen, setHelperEditOpen] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [selectedHelpers, setSelectedHelpers] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'drivers' | 'helpers' | null>(null);
  const [previewDriver, setPreviewDriver] = useState<any>(null);
  const [licensePreviewOpen, setLicensePreviewOpen] = useState(false);
  const isAdmin = profile?.role === "admin";

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: d, error: de }, { data: h, error: he }] = await Promise.all([
      supabase.from("drivers").select("*").order("name"),
      supabase.from("helpers").select("*").order("name"),
    ]);
    if (de) setError(de.message);
    else if (he) setError(he.message);
    setDrivers(d || []);
    setHelpers(h || []);
    setLoading(false);
  };

  const formatAvailability = (availability: any) => {
    if (!availability) return "Not set";
    const days = availability.days?.join(", ") || "No days";
    const shifts = availability.shifts?.join(", ") || "No shifts";
    const doubleShift = availability.doubleShift ? "✓ Double" : "";
    return `${days} | ${shifts} ${doubleShift}`;
  };

  const getLicenseStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { label: "Not Set", variant: "secondary" as const };
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { label: "Expired", variant: "destructive" as const };
    if (daysUntilExpiry <= 30) return { label: `${daysUntilExpiry}d left`, variant: "destructive" as const };
    if (daysUntilExpiry <= 60) return { label: `${daysUntilExpiry}d left`, variant: "default" as const };
    return { label: "Valid", variant: "default" as const };
  };

  const toggleSelectDriver = (id: string) => {
    setSelectedDrivers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectHelper = (id: string) => {
    setSelectedHelpers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAllDrivers = () => {
    if (selectedDrivers.size === drivers.length) {
      setSelectedDrivers(new Set());
    } else {
      setSelectedDrivers(new Set(drivers.map(d => d.id)));
    }
  };

  const toggleSelectAllHelpers = () => {
    if (selectedHelpers.size === helpers.length) {
      setSelectedHelpers(new Set());
    } else {
      setSelectedHelpers(new Set(helpers.map(h => h.id)));
    }
  };

  const handleMassDelete = async () => {
    const idsToDelete = deleteType === 'drivers' 
      ? Array.from(selectedDrivers) 
      : Array.from(selectedHelpers);
    
    if (idsToDelete.length === 0) return;

    try {
      const table = deleteType === 'drivers' ? 'drivers' : 'helpers';
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Deleted ${idsToDelete.length} ${deleteType}` 
      });
      
      if (deleteType === 'drivers') {
        setSelectedDrivers(new Set());
      } else {
        setSelectedHelpers(new Set());
      }
      
      fetchAll();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteType(null);
    }
  };

  const downloadDriverTemplate = () => {
    const csv = generateCSV([], ['name', 'license_number', 'id_number', 'birthdate', 'contact_number']);
    downloadCSV(csv, 'drivers-template.csv');
  };

  const downloadHelperTemplate = () => {
    const csv = generateCSV([], ['name', 'id_number', 'birthdate', 'contact_number']);
    downloadCSV(csv, 'helpers-template.csv');
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
        id_number: row.id_number || `DRV-${Date.now().toString().slice(-6)}`,
        birthdate: row.birthdate || null,
        contact_number: row.contact_number || null
      }));

      const { error } = await supabase.from("drivers").insert(driversToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${driversToInsert.length} drivers` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    }

    if (driverFileRef.current) driverFileRef.current.value = '';
  };

  const handleHelperImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const helpersToInsert = rows.map(row => ({
        name: row.name,
        id_number: row.id_number || `HLP-${Date.now().toString().slice(-6)}`,
        birthdate: row.birthdate || null,
        contact_number: row.contact_number || null
      }));

      const { error } = await supabase.from("helpers").insert(helpersToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${helpersToInsert.length} helpers` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    }

    if (helperFileRef.current) helperFileRef.current.value = '';
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <>
      <ExpiringLicensesAlert />
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Drivers</CardTitle>
                <CardDescription>Licensed vehicle operators</CardDescription>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  {selectedDrivers.size > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        setDeleteType('drivers');
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedDrivers.size})
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={downloadDriverTemplate}>
                    <Download className="h-4 w-4 mr-2" />Template
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => driverFileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />Import CSV
                  </Button>
                  <input
                    ref={driverFileRef}
                    type="file"
                    accept=".csv"
                    onChange={handleDriverImport}
                    className="hidden"
                  />
                  <AddDriverDialog profile={profile} onAdded={fetchAll} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : error ? (
              <p className="text-destructive">{error}</p>
            ) : drivers.length === 0 ? (
              <p className="text-muted-foreground">No drivers yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedDrivers.size === drivers.length}
                          onCheckedChange={toggleSelectAllDrivers}
                        />
                      </TableHead>
                    )}
                    <TableHead>Name</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>License Status</TableHead>
                    <TableHead>Availability</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d) => {
                    const licenseStatus = getLicenseStatus(d.license_expiry_date);
                    return (
                      <TableRow key={d.id}>
                        {isAdmin && (
                          <TableCell>
                            <Checkbox
                              checked={selectedDrivers.has(d.id)}
                              onCheckedChange={() => toggleSelectDriver(d.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{d.license_number || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={licenseStatus.variant}>
                            {licenseStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatAvailability(d.availability)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              {d.license_file_url && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setPreviewDriver(d);
                                    setLicensePreviewOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEditingDriver(d);
                                  setDriverEditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Helpers</CardTitle>
                <CardDescription>Collection assistants</CardDescription>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  {selectedHelpers.size > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        setDeleteType('helpers');
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedHelpers.size})
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={downloadHelperTemplate}>
                    <Download className="h-4 w-4 mr-2" />Template
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => helperFileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />Import CSV
                  </Button>
                  <input
                    ref={helperFileRef}
                    type="file"
                    accept=".csv"
                    onChange={handleHelperImport}
                    className="hidden"
                  />
                  <AddHelperDialog profile={profile} onAdded={fetchAll} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : error ? (
              <p className="text-destructive">{error}</p>
            ) : helpers.length === 0 ? (
              <p className="text-muted-foreground">No helpers yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedHelpers.size === helpers.length}
                          onCheckedChange={toggleSelectAllHelpers}
                        />
                      </TableHead>
                    )}
                    <TableHead>Name</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Availability</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {helpers.map((h) => (
                    <TableRow key={h.id}>
                      {isAdmin && (
                        <TableCell>
                          <Checkbox
                            checked={selectedHelpers.has(h.id)}
                            onCheckedChange={() => toggleSelectHelper(h.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>{h.id_number || "N/A"}</TableCell>
                      <TableCell>{h.contact_number || "N/A"}</TableCell>
                      <TableCell className="text-sm">{formatAvailability(h.availability)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingHelper(h);
                              setHelperEditOpen(true);
                            }}
                          >
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
        </Card>
      </div>

      {editingDriver && (
        <DriverEditDialog
          driver={editingDriver}
          open={driverEditOpen}
          onOpenChange={setDriverEditOpen}
          onUpdated={fetchAll}
        />
      )}

      {editingHelper && (
        <HelperEditDialog
          helper={editingHelper}
          open={helperEditOpen}
          onOpenChange={setHelperEditOpen}
          onUpdated={fetchAll}
        />
      )}

      {previewDriver && (
        <LicensePreviewDialog
          licenseUrl={previewDriver.license_file_url}
          driverName={previewDriver.name}
          open={licensePreviewOpen}
          onOpenChange={setLicensePreviewOpen}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Mass Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteType === 'drivers' ? selectedDrivers.size : selectedHelpers.size} {deleteType}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMassDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DriversHelpersTab;
