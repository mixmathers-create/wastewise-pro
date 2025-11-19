import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [suspensionTarget, setSuspensionTarget] = useState<{ id: string; type: 'driver' | 'helper'; name: string } | null>(null);
  const [suspensionStartDate, setSuspensionStartDate] = useState("");
  const [suspensionEndDate, setSuspensionEndDate] = useState("");
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
    if (!expiryDate) return <Badge variant="secondary">Not Set</Badge>;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return <Badge variant="destructive">Expired</Badge>;
    if (daysUntilExpiry <= 30) return <Badge variant="destructive">{daysUntilExpiry}d left</Badge>;
    if (daysUntilExpiry <= 60) return <Badge variant="default">{daysUntilExpiry}d left</Badge>;
    return <Badge variant="default">Valid</Badge>;
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

  const toggleSelectAllDrivers = (checked: boolean) => {
    if (checked) {
      setSelectedDrivers(new Set(drivers.map(d => d.id)));
    } else {
      setSelectedDrivers(new Set());
    }
  };

  const toggleSelectAllHelpers = (checked: boolean) => {
    if (checked) {
      setSelectedHelpers(new Set(helpers.map(h => h.id)));
    } else {
      setSelectedHelpers(new Set());
    }
  };

  const handleMassDelete = async () => {
    try {
      if (deleteType === 'drivers' && selectedDrivers.size > 0) {
        const { error } = await supabase
          .from("drivers")
          .delete()
          .in("id", Array.from(selectedDrivers));
        
        if (error) throw error;
        toast({ title: `${selectedDrivers.size} driver(s) deleted successfully` });
        setSelectedDrivers(new Set());
      } else if (deleteType === 'helpers' && selectedHelpers.size > 0) {
        const { error } = await supabase
          .from("helpers")
          .delete()
          .in("id", Array.from(selectedHelpers));
        
        if (error) throw error;
        toast({ title: `${selectedHelpers.size} helper(s) deleted successfully` });
        setSelectedHelpers(new Set());
      }
      setDeleteDialogOpen(false);
      fetchAll();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, type: 'driver' | 'helper', name: string) => {
    if (newStatus === 'suspended') {
      setSuspensionTarget({ id, type, name });
      setSuspensionStartDate("");
      setSuspensionEndDate("");
      setSuspensionDialogOpen(true);
    } else {
      await updateStatus(id, newStatus, type, null, null);
    }
  };

  const handleSuspensionSubmit = async () => {
    if (!suspensionStartDate || !suspensionEndDate) {
      toast({ title: "Error", description: "Both suspension dates are required", variant: "destructive" });
      return;
    }
    if (new Date(suspensionEndDate) < new Date(suspensionStartDate)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    if (suspensionTarget) {
      await updateStatus(
        suspensionTarget.id,
        'suspended',
        suspensionTarget.type,
        suspensionStartDate,
        suspensionEndDate
      );
      setSuspensionDialogOpen(false);
      setSuspensionTarget(null);
    }
  };

  const updateStatus = async (
    id: string,
    status: string,
    type: 'driver' | 'helper',
    startDate: string | null,
    endDate: string | null
  ) => {
    try {
      const table = type === 'driver' ? 'drivers' : 'helpers';
      const { error } = await supabase
        .from(table)
        .update({
          status,
          suspension_start_date: status === 'suspended' ? startDate : null,
          suspension_end_date: status === 'suspended' ? endDate : null,
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: `${type === 'driver' ? 'Driver' : 'Helper'} status updated successfully` });
      fetchAll();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleDownloadDriverTemplate = () => {
    const headers = ['name', 'license_number', 'birthdate', 'contact_number', 'license_expiry_date'];
    const sampleData = [{
      'name': 'Juan Dela Cruz',
      'license_number': 'N01-12-345678',
      'birthdate': '1990-01-15',
      'contact_number': '09171234567',
      'license_expiry_date': '2026-12-31'
    }];
    const csv = generateCSV(sampleData, headers);
    downloadCSV(csv, 'drivers-import-template.csv');
    toast({ title: "Template Downloaded", description: "Driver import template with sample data downloaded" });
  };

  const handleDownloadHelperTemplate = () => {
    const headers = ['name', 'birthdate', 'contact_number'];
    const sampleData = [{
      'name': 'Maria Santos',
      'birthdate': '1995-03-20',
      'contact_number': '09181234567'
    }];
    const csv = generateCSV(sampleData, headers);
    downloadCSV(csv, 'helpers-import-template.csv');
    toast({ title: "Template Downloaded", description: "Helper import template with sample data downloaded" });
  };

  const handleExportDrivers = () => {
    const headers = ['name', 'license_number', 'id_number', 'birthdate', 'contact_number', 'license_expiry_date', 'status', 'suspension_start_date', 'suspension_end_date'];
    const csv = generateCSV(drivers, headers);
    downloadCSV(csv, `drivers-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "Success", description: "Drivers exported successfully" });
  };

  const handleExportHelpers = () => {
    const headers = ['name', 'id_number', 'birthdate', 'contact_number', 'status', 'suspension_start_date', 'suspension_end_date'];
    const csv = generateCSV(helpers, headers);
    downloadCSV(csv, `helpers-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "Success", description: "Helpers exported successfully" });
  };

  const handleImportDrivers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      const processedRows = rows.map(row => {
        // Auto-generate ID number
        const idNumber = `DRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          name: row.name,
          license_number: row.license_number,
          id_number: idNumber,
          birthdate: row.birthdate || null,
          contact_number: row.contact_number || null,
          license_expiry_date: row.license_expiry_date || null,
          status: 'available'
        };
      });

      const { error } = await supabase.from("drivers").insert(processedRows);
      if (error) throw error;
      toast({ title: "Drivers imported successfully" });
      fetchAll();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleImportHelpers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      const processedRows = rows.map(row => {
        // Auto-generate ID number
        const idNumber = `HLP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          name: row.name,
          id_number: idNumber,
          birthdate: row.birthdate || null,
          contact_number: row.contact_number || null,
          status: 'available'
        };
      });

      const { error } = await supabase.from("helpers").insert(processedRows);
      if (error) throw error;
      toast({ title: "Helpers imported successfully" });
      fetchAll();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) return <Skeleton className="h-96" />;
  if (error) return <div className="text-destructive">{error}</div>;

  return (
    <div className="space-y-6">
      <ExpiringLicensesAlert />
      
      <Card>
        <CardHeader>
          <CardTitle>Drivers</CardTitle>
          <CardDescription>Manage your drivers and their information</CardDescription>
          <div className="flex gap-2 mt-4">
            {isAdmin && (
              <>
                <AddDriverDialog profile={profile} onAdded={fetchAll} />
                <Button variant="outline" size="sm" onClick={handleDownloadDriverTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportDrivers}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={() => driverFileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <input
                  ref={driverFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportDrivers}
                />
                {selectedDrivers.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeleteType('drivers');
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedDrivers.size})
                  </Button>
                )}
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedDrivers.size === drivers.length && drivers.length > 0}
                      onCheckedChange={toggleSelectAllDrivers}
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>License</TableHead>
                <TableHead>License Status</TableHead>
                <TableHead>Employment Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedDrivers.has(driver.id)}
                        onCheckedChange={() => toggleSelectDriver(driver.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>{driver.name}</TableCell>
                  <TableCell>{driver.license_number || "N/A"}</TableCell>
                  <TableCell>
                    {getLicenseStatus(driver.license_expiry_date)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={driver.status || 'available'}
                      onValueChange={(value) => handleStatusChange(driver.id, value, 'driver', driver.name)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="fired">Fired</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {driver.license_file_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPreviewDriver(driver);
                            setLicensePreviewOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDriver(driver);
                            setDriverEditOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Helpers</CardTitle>
          <CardDescription>Manage your helpers and their information</CardDescription>
          <div className="flex gap-2 mt-4">
            {isAdmin && (
              <>
                <AddHelperDialog profile={profile} onAdded={fetchAll} />
                <Button variant="outline" size="sm" onClick={handleDownloadHelperTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportHelpers}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={() => helperFileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <input
                  ref={helperFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportHelpers}
                />
                {selectedHelpers.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeleteType('helpers');
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedHelpers.size})
                  </Button>
                )}
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedHelpers.size === helpers.length && helpers.length > 0}
                      onCheckedChange={toggleSelectAllHelpers}
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Employment Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {helpers.map((helper) => (
                <TableRow key={helper.id}>
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedHelpers.has(helper.id)}
                        onCheckedChange={() => toggleSelectHelper(helper.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>{helper.name}</TableCell>
                  <TableCell>
                    <Select
                      value={helper.status || 'available'}
                      onValueChange={(value) => handleStatusChange(helper.id, value, 'helper', helper.name)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="fired">Fired</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingHelper(helper);
                          setHelperEditOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DriverEditDialog
        driver={editingDriver}
        open={driverEditOpen}
        onOpenChange={setDriverEditOpen}
        onUpdated={fetchAll}
      />

      <HelperEditDialog
        helper={editingHelper}
        open={helperEditOpen}
        onOpenChange={setHelperEditOpen}
        onUpdated={fetchAll}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteType === 'drivers' ? selectedDrivers.size : selectedHelpers.size} {deleteType}. This action cannot be undone.
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

      <LicensePreviewDialog
        licenseUrl={previewDriver?.license_file_url || null}
        driverName={previewDriver?.name || ""}
        open={licensePreviewOpen}
        onOpenChange={setLicensePreviewOpen}
      />

      <Dialog open={suspensionDialogOpen} onOpenChange={setSuspensionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {suspensionTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="suspensionStart">Suspension Start Date</Label>
              <Input
                id="suspensionStart"
                type="date"
                value={suspensionStartDate}
                onChange={(e) => setSuspensionStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="suspensionEnd">Suspension End Date</Label>
              <Input
                id="suspensionEnd"
                type="date"
                value={suspensionEndDate}
                onChange={(e) => setSuspensionEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspensionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSuspensionSubmit}>
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriversHelpersTab;
