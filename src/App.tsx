import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { isNativePlatform } from "@/lib/capacitorUtils";
import { Recycle } from "lucide-react";
import { useBlockCommaInput } from "@/hooks/useBlockCommaInput";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MobileDashboard = lazy(() => import("./pages/MobileDashboard"));
const ReceiptPreview = lazy(() => import("./pages/ReceiptPreview"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PastSchedules = lazy(() => import("./pages/PastSchedules"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - keep data fresh much longer for LTE
      gcTime: 30 * 60 * 1000, // 30 minutes cache - aggressive caching for slow networks
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch on reconnect
      retry: 1, // Reduce retries for faster failure
      networkMode: 'offlineFirst', // Try cache first on network issues
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <Recycle className="mx-auto h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Use HashRouter on native (Capacitor) to avoid blank screens on file:// routes
const RouterComponent = isNativePlatform() ? HashRouter : BrowserRouter;
const App = () => {
  useBlockCommaInput();
  
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
          <Suspense fallback={<LoadingFallback />}>
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
          </Suspense>
        </RouterComponent>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
