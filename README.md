# 🚛 FleetFlow

### Smart Fleet & Logistics Management Platform

**FleetFlow** is a full-stack fleet management system built to help organizations efficiently manage **vehicles, drivers, shipments, trips, maintenance, fuel records, real-time GPS tracking, and operational analytics** through a centralized platform.

---

## ✨ Features

* 🔐 **Authentication & RBAC** — Secure JWT authentication with Admin, Fleet Manager, Dispatcher, and Driver roles.
* 🚚 **Fleet Management** — Manage vehicles, drivers, assignments, and vehicle lifecycle.
* 📦 **Shipment & Trip Management** — Track shipments from `Created → Assigned → In Transit → Delivered`.
* 🗺️ **Route Optimization** — Geographic routing using Nominatim and OSRM.
* 📍 **Real-Time GPS Tracking** — Monitor vehicle locations using WebSockets and interactive maps.
* ⏱️ **ETA & Delay Alerts** — Track estimated arrival times and identify delays.
* 🔧 **Maintenance Management** — Schedule and maintain vehicle service records.
* ⛽ **Fuel Management** — Record fuel usage and analyze fuel trends.
* 📊 **Operational Analytics** — Monitor driver performance, maintenance costs, fuel trends, and fleet utilization.

---

## 🛠️ Tech Stack

### Backend

| Technology     | Purpose                        |
| -------------- | ------------------------------ |
| **FastAPI**    | REST API framework             |
| **PostgreSQL** | Primary database               |
| **SQLAlchemy** | ORM                            |
| **Alembic**    | Database migrations            |
| **JWT**        | Authentication & authorization |
| **WebSockets** | Real-time GPS tracking         |
| **Redis**      | Message broker                 |
| **Celery**     | Background tasks               |

### Frontend

| Technology        | Purpose           |
| ----------------- | ----------------- |
| **React**         | User interface    |
| **Vite**          | Build tool        |
| **Tailwind CSS**  | Styling           |
| **React Leaflet** | Interactive maps  |
| **Axios**         | API communication |

### External Services

* **Nominatim** — Location and geocoding
* **OSRM** — Geographic routing
* **OpenStreetMap** — Map data

---

## 📁 Project Structure

```text
fleetflow/
│
├── backend/
│   ├── alembic/            # Database migrations
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Configuration & security
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── tasks/          # Celery tasks
│   │
│   ├── gps_simulator.py    # GPS simulation
│   └── requirements.txt    # Backend dependencies
│
├── frontend/
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── api/            # API configuration
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React contexts
│   │   ├── pages/          # Application pages
│   │   └── services/       # API services
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure the following are installed:

* Python 3.x
* Node.js & npm
* PostgreSQL
* Redis
* Git

### 1. Backend

```bash
cd backend

python -m venv venv
```

**Windows:**

```bash
venv\Scripts\activate
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run database migrations:

```bash
alembic upgrade head
```

Start the API:

```bash
uvicorn app.main:app --reload
```

---

### 2. Redis & Celery

Start Redis on the default port:

```text
6379
```

In a new terminal, start the Celery worker:

```bash
cd backend
venv\Scripts\activate
celery -A app.celery_app worker -l info --pool=solo
```

Start Celery Beat in another terminal:

```bash
cd backend
venv\Scripts\activate
celery -A app.celery_app beat -l info
```

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📍 Live GPS Tracking

FleetFlow includes a GPS simulator for testing real-time vehicle tracking.

Make sure the backend is running, then execute:

```bash
cd backend
python gps_simulator.py
```

The simulator generates vehicle movement along geographic routes obtained through **OSRM**.

The dashboard can display:

* 📍 Live vehicle locations
* 🛣️ Active routes
* 🚗 Vehicle speed
* 📏 Distance travelled
* ⏱️ Live ETA
* 🚨 Delay alerts
* 📌 Geofence events

---

## 🗺️ Route & Map Integration

FleetFlow combines:

**Nominatim → OSRM → React Leaflet**

```text
Location
   ↓
Nominatim
   ↓
Coordinates
   ↓
OSRM
   ↓
Optimized Route
   ↓
React Leaflet
   ↓
Interactive Fleet Map
```

---

## 👥 User Roles

| Role              | Responsibilities                               |
| ----------------- | ---------------------------------------------- |
| **Admin**         | System and user management                     |
| **Fleet Manager** | Fleet, vehicles, maintenance & operations      |
| **Dispatcher**    | Shipments, trips, routes & driver coordination |
| **Driver**        | Assigned trips and vehicle activities          |

---

## 🎯 Purpose

FleetFlow provides a centralized solution for modern fleet and logistics operations by combining **fleet management, real-time tracking, route optimization, maintenance, fuel monitoring, and operational analytics** into a single platform.

---

## 📄 License

This project is licensed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
