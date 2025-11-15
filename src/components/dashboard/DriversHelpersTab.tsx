import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DriversHelpersTab = ({ profile }: { profile: any }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Drivers & Helpers</CardTitle>
        <CardDescription>Manage your team of drivers and collection helpers</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Staff management coming soon...</p>
      </CardContent>
    </Card>
  );
};

export default DriversHelpersTab;
