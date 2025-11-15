import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TrucksTab = ({ profile }: { profile: any }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trucks</CardTitle>
        <CardDescription>Manage your fleet of waste collection trucks</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Truck management coming soon...</p>
      </CardContent>
    </Card>
  );
};

export default TrucksTab;
