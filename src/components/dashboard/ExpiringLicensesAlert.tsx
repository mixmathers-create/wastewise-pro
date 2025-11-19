import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpiringLicense {
  id: string;
  name: string;
  license_number: string;
  license_expiry_date: string;
  days_until_expiry: number;
}

const ExpiringLicensesAlert = () => {
  const [expiringLicenses, setExpiringLicenses] = useState<ExpiringLicense[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchExpiringLicenses = async () => {
      const { data, error } = await supabase.rpc('get_expiring_licenses');
      if (!error && data) {
        setExpiringLicenses(data);
      }
    };

    fetchExpiringLicenses();
    
    // Check every hour
    const interval = setInterval(fetchExpiringLicenses, 3600000);
    return () => clearInterval(interval);
  }, []);

  const visibleLicenses = expiringLicenses.filter(l => !dismissed.has(l.id));

  if (visibleLicenses.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visibleLicenses.map((license) => (
        <Alert key={license.id} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>License Expiring Soon</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {license.name}'s driver's license (#{license.license_number}) expires in{' '}
              {license.days_until_expiry} {license.days_until_expiry === 1 ? 'day' : 'days'}
              {' '}on {new Date(license.license_expiry_date).toLocaleDateString()}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setDismissed(prev => new Set(prev).add(license.id))}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default ExpiringLicensesAlert;
