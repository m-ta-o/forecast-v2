
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { JourneyProvider } from "@/contexts/JourneyContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PLForecast from "./pages/PLForecast";
import Start from "./pages/Start";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <JourneyProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/start" element={<Start />} />
            <Route path="/" element={<Index />} />
            <Route path="/pl-forecast" element={<PLForecast />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </JourneyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
