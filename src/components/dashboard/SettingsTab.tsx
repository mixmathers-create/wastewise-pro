import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const SettingsTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const teamName = profile?.teams?.name || profile?.team_id || "";
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem("receipt_logo");
    if (savedLogo) setLogoUrl(savedLogo);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLogoUrl(result);
        localStorage.setItem("receipt_logo", result);
        toast({ title: "Logo Updated", description: "Receipt logo saved successfully" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    setLogoFile(null);
    localStorage.removeItem("receipt_logo");
    toast({ title: "Logo Removed", description: "Receipt logo has been removed" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Team and user details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Team</p>
              <p className="text-lg font-semibold">{teamName}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Your role</p>
              <p className="text-lg font-semibold capitalize">{profile?.role}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Full name</p>
              <p className="text-lg font-semibold">{profile?.full_name}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-semibold">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Settings</CardTitle>
          <CardDescription>Customize collection receipt appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Receipt Logo</Label>
            <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} />
            {logoUrl && (
              <div className="mt-2">
                <img src={logoUrl} alt="Receipt Logo" className="h-20 w-auto border rounded-md" />
                <Button variant="destructive" size="sm" onClick={handleRemoveLogo} className="mt-2">
                  Remove Logo
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Upload a logo to appear on printed receipts</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
