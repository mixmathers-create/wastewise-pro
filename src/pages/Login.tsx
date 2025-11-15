import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Recycle } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Post-login bootstrap: Check and create missing profile/user_roles
        try {
          // Check if user_roles exists
          const { data: userRoleData } = await supabase
            .from("user_roles")
            .select("*")
            .eq("user_id", data.user.id)
            .maybeSingle();

          // If no user_role, this is likely a legacy account or incomplete signup
          if (!userRoleData) {
            // Get or create a default team for this user
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("team_id")
              .eq("user_id", data.user.id)
              .maybeSingle();

            let teamId = existingProfile?.team_id;

            if (!teamId) {
              // Create a new team for this user
              const { data: newTeam } = await supabase
                .from("teams")
                .insert({ name: `${data.user.email}'s Team` })
                .select()
                .single();
              
              teamId = newTeam?.id;
            }

            if (teamId) {
              // Create user_roles first
              await supabase.from("user_roles").insert({
                user_id: data.user.id,
                team_id: teamId,
                role: "admin", // Default to admin for bootstrap
              });

              // Create or update profile
              if (!existingProfile) {
                await supabase.from("profiles").insert({
                  user_id: data.user.id,
                  team_id: teamId,
                  full_name: data.user.email?.split("@")[0] || "User",
                  email: data.user.email || "",
                  role: "admin",
                });
              }
            }
          }
        } catch (bootstrapError) {
          console.error("Bootstrap error:", bootstrapError);
          // Continue login even if bootstrap fails
        }

        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Recycle className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">WasteWise</CardTitle>
          <CardDescription>Sign in to your waste management dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button
                type="button"
                variant="link"
                className="p-0"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
