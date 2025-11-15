import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ClientsTab = ({ profile }: { profile: any }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clients</CardTitle>
        <CardDescription>Manage your client database</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Client management coming soon...</p>
      </CardContent>
    </Card>
  );
};

export default ClientsTab;
