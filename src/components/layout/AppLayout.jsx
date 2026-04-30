import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";

export default function AppLayout() {
  return (
    <div className="app-shell flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="content-shell min-w-0 flex-1">
        <Navbar />
        <main className="main-content w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
