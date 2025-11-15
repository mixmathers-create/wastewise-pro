import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CollectionsTab = ({ profile }: { profile: any }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Collections</CardTitle>
        <CardDescription>Scan QR codes to generate collection receipts</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Collection receipt generation coming soon...</p>
      </CardContent>
    </Card>
  );
};

export default CollectionsTab;
