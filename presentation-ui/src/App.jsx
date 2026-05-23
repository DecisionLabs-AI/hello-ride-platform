import { useState } from "react";
import NavBar from "./components/shared/NavBar.jsx";
import OPSDashboard from "./pages/OPSDashboard.jsx";
import PassengerPortal from "./pages/PassengerPortal.jsx";
import DriverApp from "./pages/DriverApp.jsx";
import { DemoMatchingProvider } from "./context/DemoMatchingContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";

export default function App() {
  const [page, setPage] = useState("ops");

  return (
    <LanguageProvider>
      <DemoMatchingProvider>
        <div className="min-h-screen text-slate-900">
          <NavBar page={page} setPage={setPage} />
          <main>
            {page === "ops" && <OPSDashboard />}
            {page === "passenger" && <PassengerPortal />}
            {page === "driver" && <DriverApp />}
          </main>
        </div>
      </DemoMatchingProvider>
    </LanguageProvider>
  );
}
