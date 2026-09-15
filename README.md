# FleetFlow

FleetFlow is a comprehensive Fleet Management System developed using FastAPI, React, and PostgreSQL. It empowers organizations to efficiently manage vehicles, drivers, shipments, trips, maintenance, fuel records, real-time GPS tracking, and operational analytics.

## Tech Stack

### Backend
- **FastAPI** (High-performance API framework)
- **PostgreSQL** (Primary database)
- **SQLAlchemy** (ORM) & **Alembic** (Migrations)
- **JWT Authentication** (Role-Based Access Control)
- **WebSockets** (Real-Time GPS Tracking)

### Frontend
- **React** (UI Library)
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **React Leaflet** (Live Maps)
- **Axios** (API Client)

---

## Project Structure

```text
fleetflow/
├── backend/                # FastAPI backend
│   ├── alembic/            # Database migrations
│   ├── app/                # Main application code
│   │   ├── api/            # API endpoints (routers)
│   │   ├── core/           # Core configuration & security
│   │   ├── models/         # SQLAlchemy database models
│   │   ├── schemas/        # Pydantic validation schemas
│   │   ├── services/       # Business logic & database operations
│   │   └── tasks/          # Celery background tasks
│   ├── gps_simulator.py    # Script for simulating GPS data
│   └── requirements.txt    # Python dependencies
├── frontend/               # React + Vite frontend
│   ├── public/             # Static assets
│   ├── src/                # React source code
│   │   ├── api/            # Axios configuration
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context providers
│   │   ├── pages/          # Page views
│   │   └── services/       # API service functions
│   ├── package.json        # Node dependencies
│   └── vite.config.js      # Vite configuration
└── README.md               # Project documentation
```

---

## How to Run the Project

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload
```

### 1.1 Running Redis and Celery (Required for WebSockets and Background Tasks)

Ensure you have a Redis server running locally (e.g., `redis-server` on port 6379).

Start the Celery worker (in a new terminal):
```bash
cd backend
venv\Scripts\activate
celery -A app.celery_app worker -l info --pool=solo
```

Start the Celery beat scheduler (in a new terminal):
```bash
cd backend
venv\Scripts\activate
celery -A app.celery_app beat -l info
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. Simulating Realistic Live GPS Tracking

To see the **Live Vehicle Tracking** map update with speed, distance, and geofence alerts, you must simulate a vehicle sending live coordinates to the WebSocket server. Our advanced GPS Simulator automatically pulls active trips and dynamically drives vehicles along their true geographic routes fetched from OSRM!

1. Ensure the backend is running (`uvicorn app.main:app --reload`).
2. Open a new terminal window.
3. Run the realistic simulator script:
```bash
cd backend
# Make sure your virtual environment is activated
python gps_simulator.py
```
The frontend map will instantly draw massive cross-country highway routes and begin driving the simulated vehicles precisely along their true routes, continuously updating the live ETA and triggering delay alerts if applicable!

---

## Features

- **Authentication & RBAC:** Secure JWT login for Admin, Fleet Manager, Dispatcher, and Driver roles.
- **Fleet Management:** Complete vehicle lifecycle and driver assignment.
- **Shipment & Trip Logistics:** Status tracking (Created -> Assigned -> In Transit -> Delivered).
- **Advanced Route Optimization:** True Geographic Routing via Nominatim & OSRM, generating hyper-accurate polyline routes.
- **Live Tracking & ETA Alerts:** Real-time WebSockets dynamically track vehicles moving across states, projecting real-time delays and live ETAs directly onto the fleet dashboard map.
- **Maintenance & Fuel:** Log fuel refills and schedule maintenance.
- **Analytics Dashboards:** Real-time data on driver performance, fuel trends, maintenance costs, and fleet utilization.

## License
This project is licensed under the [MIT License](LICENSE).
