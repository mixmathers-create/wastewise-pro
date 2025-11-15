import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SettingsTab = ({ profile }: { profile: any }) => {
  const teamName = profile?.teams?.name || profile?.team_id || "";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Team and account information</CardDescription>
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
  );
};

export default SettingsTab;
