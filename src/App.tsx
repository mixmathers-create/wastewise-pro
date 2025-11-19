import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MobileDashboard from "./pages/MobileDashboard";
import ReceiptPreview from "./pages/ReceiptPreview";
import NotFound from "./pages/NotFound";
import PastSchedules from "./pages/PastSchedules";
import { isNativePlatform } from "@/lib/capacitorUtils";

const queryClient = new QueryClient();

// Use HashRouter on native (Capacitor) to avoid blank screens on file:// routes
const RouterComponent = isNativePlatform() ? HashRouter : BrowserRouter;
const App = () => {
  // Automatically route to mobile dashboard on native platforms
  const DashboardComponent = isNativePlatform() ? MobileDashboard : Dashboard;
  
  // Bypass login on native platforms - go directly to dashboard
  const defaultRoute = isNativePlatform() ? "/dashboard" : "/login";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterComponent>
          <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<DashboardComponent />} />
            <Route path="/mobile" element={<MobileDashboard />} />
            <Route path="/receipt-preview" element={<ReceiptPreview />} />
            <Route path="/past-schedules" element={<PastSchedules />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RouterComponent>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
