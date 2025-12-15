import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Upload, Save, Image } from 'lucide-react';

export const AppSettingsTab = () => {
  const { settings, loading, updateSetting, uploadLogo } = useAppSettings();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(settings);
  const { toast } = useToast();

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const logoUrl = await uploadLogo(file);
      setFormData(prev => ({ ...prev, company_logo: logoUrl }));
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(formData).map(([key, value]) =>
        updateSetting(key as keyof typeof settings, value)
      );
      
      await Promise.all(promises);
      
      toast({
        title: 'Success',
        description: 'Settings saved successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">App Settings</h2>
        <p className="text-muted-foreground">Manage company information and branding</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Company Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-muted">
              {formData.company_logo ? (
                <img 
                  src={formData.company_logo} 
                  alt="Company Logo" 
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <Image className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo-upload">Upload New Logo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: PNG or JPG, max 2MB
              </p>
            </div>
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4 animate-pulse" />
              Uploading logo...
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_email">Email</Label>
              <Input
                id="company_email"
                type="email"
                value={formData.company_email}
                onChange={(e) => setFormData(prev => ({ ...prev, company_email: e.target.value }))}
                placeholder="Enter company email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_phone">Phone</Label>
              <Input
                id="company_phone"
                value={formData.company_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, company_phone: e.target.value }))}
                placeholder="Enter company phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_address">Address</Label>
              <Input
                id="company_address"
                value={formData.company_address}
                onChange={(e) => setFormData(prev => ({ ...prev, company_address: e.target.value }))}
                placeholder="Enter company address"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};