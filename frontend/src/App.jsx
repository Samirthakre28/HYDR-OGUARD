import React, { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import MobileTopBar from "./components/layout/MobileTopBar";
import AIGuide from "./components/layout/AIGuide";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import RiskMapPage from "./pages/RiskMapPage";
import OfflineSafeMap from "./pages/OfflineSafeMap";
import RiskAnalysis from "./pages/RiskAnalysis";
import Emergency from "./pages/Emergency";
import Alerts from "./pages/Alerts";
import { LocationProvider } from "./context/LocationContext";
import { NavigationProvider, useNavigation } from "./context/NavigationContext";

function AppContent() {
  const { currentPath } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Render active page component based on client route
  const renderPage = () => {
    switch (currentPath) {
      case "/":
        return <Home />;
      case "/dashboard":
        return (
          <main className="max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6">
            <Dashboard />
          </main>
        );
      case "/risk-analysis":
        return <RiskAnalysis />;
      case "/risk-map":
        return <RiskMapPage />;
      case "/offline-safe-map":
        return <OfflineSafeMap />;
      case "/emergency":
        return <Emergency />;
      case "/alerts":
        return <Alerts />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row antialiased max-w-full overflow-x-hidden">
      {/* Global Left Vertical Sidebar (Desktop Sticky, Mobile Slide-out Drawer from Left) */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace Area (To the Right of Sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        {/* Mobile Header with Hamburger Menu (Visible below 768px) */}
        <MobileTopBar onOpenMenu={() => setMobileMenuOpen(true)} />

        {/* Dynamic Page Content */}
        <div className="flex-1 min-w-0 max-w-full overflow-x-hidden">
          {renderPage()}
        </div>
      </div>

      {/* Global Floating AI Guide (Fixed Bottom-Right Corner) */}
      <AIGuide />
    </div>
  );
}

export default function App() {
  return (
    <LocationProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </LocationProvider>
  );
}
