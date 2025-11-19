import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

const LicensePreviewDialog = ({ 
  licenseUrl, 
  driverName,
  open, 
  onOpenChange 
}: { 
  licenseUrl: string | null; 
  driverName: string;
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) => {
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!licenseUrl || !open) return;
      
      setLoading(true);
      try {
        const filePath = licenseUrl.split('/').pop();
        if (!filePath) return;

        const { data, error } = await supabase.storage
          .from('driver-licenses')
          .createSignedUrl(filePath, 3600);

        if (error) throw error;
        
        setSignedUrl(data.signedUrl);
        
        // Determine file type from extension
        const extension = filePath.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') {
          setFileType('pdf');
        } else if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) {
          setFileType('image');
        }
      } catch (error) {
        console.error('Error fetching license:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [licenseUrl, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{driverName}'s Driver's License</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[70vh] overflow-auto">
          {loading ? (
            <Skeleton className="w-full h-full" />
          ) : signedUrl ? (
            fileType === 'pdf' ? (
              <iframe 
                src={signedUrl} 
                className="w-full h-full border-0"
                title="Driver's License PDF"
              />
            ) : fileType === 'image' ? (
              <img 
                src={signedUrl} 
                alt={`${driverName}'s License`}
                className="w-full h-auto"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-16 w-16 mb-4" />
                <p>Unable to preview this file type</p>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No license file available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LicensePreviewDialog;
