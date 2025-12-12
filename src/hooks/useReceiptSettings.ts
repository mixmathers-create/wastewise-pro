import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReceiptSettings = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('receipt_settings')
        .select('logo_url')
        .single();
      
      if (error) throw error;
      setLogoUrl(data?.logo_url || null);
    } catch (error) {
      console.error('Error fetching receipt settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLogo = async (logoUrl: string | null) => {
    try {
      const { error } = await supabase
        .from('receipt_settings')
        .update({ logo_url: logoUrl })
        .eq('id', (await supabase.from('receipt_settings').select('id').single()).data?.id);
      
      if (error) throw error;
      setLogoUrl(logoUrl);
    } catch (error) {
      console.error('Error updating receipt logo:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { logoUrl, updateLogo, loading };
};