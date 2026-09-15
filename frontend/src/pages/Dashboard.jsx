import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Sidebar from "../components/layout/Sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  
  const [fleetSummary, setFleetSummary] = useState(null);
  const [driverPerf, setDriverPerf] = useState(null);
  const [fuelTrends, setFuelTrends] = useState(null);
  
  const [shipments, setShipments] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const PIE_COLORS = ["#22c55e", "#eab308", "#3b82f6", "#ef4444"]; // Available, Maintenance, In Transit, Assigned

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        if (user?.role === "Admin" || user?.role === "FleetManager") {
            const [summaryRes, driverRes, fuelRes] = await Promise.all([
              api.get("/analytics/summary"),
              api.get("/analytics/driver-performance"),
              api.get("/analytics/fuel-trends"),
            ]);
            setFleetSummary(summaryRes.data);
            setDriverPerf(driverRes.data);
            setFuelTrends(fuelRes.data);
        } else if (user?.role === "Dispatcher") {
            const [summaryRes, shipmentsRes, driversRes] = await Promise.all([
                api.get("/analytics/summary"),
                api.get("/shipments/"),
                api.get("/drivers/"),
            ]);
            setFleetSummary(summaryRes.data);
            setShipments(shipmentsRes.data);
            setDrivers(driversRes.data);
        }

      } catch (err) {
        console.error("Dashboard analytics error:", err);
        setError("Unable to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  // Compute Pie Chart Data
  const pieData = fleetSummary
    ? [
        { name: "Available", value: fleetSummary.fleet.available },
        { name: "Maintenance", value: fleetSummary.fleet.maintenance },
        { name: "In Transit", value: fleetSummary.fleet.in_transit },
        { name: "Assigned", value: fleetSummary.fleet.assigned },
      ].filter(item => item.value > 0)
    : [];

  // Driver Performance Chart Data (top 5)
  const driverData = driverPerf?.drivers?.slice(0, 5).map(d => ({
    name: d.full_name,
    completed: d.completed_trips,
    rate: d.completion_rate_pct,
  })) || [];

  // Fuel Trends Data (top 5 by cost)
  const fuelData = fuelTrends?.vehicles?.slice(0, 5).map(v => ({
    name: v.registration_number,
    cost: v.total_fuel_cost,
    liters: v.total_fuel_liters,
  })) || [];

  // 1. ADMIN DASHBOARD
  const renderAdminDashboard = () => (
    <>
      {fleetSummary && (
        <div style={styles.cards}>
          <DashboardCard title="Total Vehicles" value={fleetSummary.fleet.total_vehicles} />
          <DashboardCard title="Total Drivers" value={fleetSummary.drivers.total_drivers} />
          <DashboardCard title="Shipments" value={fleetSummary.shipments.total} />
          <DashboardCard title="On-Time Rate" value={`${fleetSummary.shipments.on_time_rate_pct}%`} />
        </div>
      )}
      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h2 style={styles.chartTitle}>Fleet Health</h2>
          <div style={styles.chartWrapper}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={styles.noData}>No fleet data available.</div>}
          </div>
        </div>
        <div style={styles.chartCard}>
          <h2 style={styles.chartTitle}>Driver Performance (Top 5)</h2>
          <div style={styles.chartWrapper}>
            {driverData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driverData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completed Trips" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={styles.noData}>No driver data available.</div>}
          </div>
        </div>
      </div>
    </>
  );

  // 2. FLEET MANAGER DASHBOARD
  const renderFleetManagerDashboard = () => (
    <>
      {fleetSummary && (
        <div style={styles.cards}>
          <DashboardCard title="Vehicles In Transit" value={fleetSummary.fleet.in_transit} />
          <DashboardCard title="Vehicles in Maint." value={fleetSummary.fleet.maintenance} />
          <DashboardCard title="Fleet Utilization" value={`${fleetSummary.fleet.utilization_rate_pct}%`} />
          <DashboardCard title="Total Fuel Cost" value={`$${fleetSummary.operations.total_fuel_cost}`} />
        </div>
      )}
      <div style={styles.chartsGrid}>
         <div style={styles.chartCard}>
          <h2 style={styles.chartTitle}>Fleet Status</h2>
          <div style={styles.chartWrapper}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={styles.noData}>No fleet data available.</div>}
          </div>
        </div>
        <div style={styles.chartCard}>
          <h2 style={styles.chartTitle}>Fuel Costs (Top 5 Vehicles)</h2>
          <div style={styles.chartWrapper}>
            {fuelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cost" name="Fuel Cost ($)" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={styles.noData}>No fuel data available.</div>}
          </div>
        </div>
      </div>
    </>
  );

  // 3. DISPATCHER DASHBOARD
  const renderDispatcherDashboard = () => {
    const unassignedDrivers = drivers.filter(d => d.status === "Available" || d.status === "Unassigned").length;
    const delayedShipments = shipments.filter(s => s.status === "Delayed").length;
    const activeShipments = shipments.filter(s => s.status === "In Transit" || s.status === "Assigned").length;
    
    return (
      <>
        <div style={styles.cards}>
          <DashboardCard title="Active Shipments" value={activeShipments} />
          <DashboardCard title="Delayed Shipments" value={delayedShipments} />
          <DashboardCard title="Available Drivers" value={unassignedDrivers} />
          <DashboardCard title="Available Vehicles" value={fleetSummary?.fleet?.available || 0} />
        </div>
      </>
    );
  };

  // 4. DRIVER DASHBOARD
  const renderDriverDashboard = () => (
    <>
      <div style={styles.cards}>
        <DashboardCard title="My Trip Status" value={"Check Trips"} />
        <DashboardCard title="My Attendance" value={"Check Attendance"} />
      </div>
    </>
  );

  const renderDashboard = () => {
      switch(user?.role) {
          case "Admin": return renderAdminDashboard();
          case "FleetManager": return renderFleetManagerDashboard();
          case "Dispatcher": return renderDispatcherDashboard();
          case "Driver": return renderDriverDashboard();
          default: return renderDriverDashboard();
      }
  }

  return (
    <div style={styles.app}>
      <Sidebar />
      <div style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>FleetFlow {user?.role} Dashboard</h1>
            <p style={styles.welcome}>
              Welcome, <strong>{user?.full_name || "User"}</strong>
            </p>
          </div>
        </header>

        <main style={styles.main}>
          {error && <div style={styles.error}>{error}</div>}

          {loading ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>Loading analytics...</div>
          ) : (
            renderDashboard()
          )}
        </main>
      </div>
    </div>
  );
}

function DashboardCard({ title, value }) {
  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>
      <div style={styles.number}>{value}</div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f4f7fb",
  },
  content: {
    marginLeft: "250px",
    minHeight: "100vh",
  },
  header: {
    padding: "30px 50px",
    background: "white",
    borderBottom: "1px solid #e5e7eb",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    color: "#172554",
  },
  welcome: {
    fontSize: "17px",
    color: "#475569",
    marginTop: "10px",
  },
  main: {
    padding: "35px 50px",
  },
  error: {
    marginBottom: "25px",
    padding: "15px 20px",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
    fontSize: "14px",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "22px",
    marginBottom: "35px",
  },
  card: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },
  cardTitle: {
    margin: 0,
    fontSize: "18px",
    color: "#334155",
  },
  number: {
    fontSize: "38px",
    fontWeight: "700",
    color: "#2563eb",
    marginTop: "15px",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "25px",
  },
  chartCard: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },
  chartTitle: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "18px",
    color: "#172554",
  },
  chartWrapper: {
    width: "100%",
    height: "300px",
  },
  noData: {
    display: "flex",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
  },
};
