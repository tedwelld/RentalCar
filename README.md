# FleetCar Car Rental Management System

FleetCar is a multi-office car rental management platform for Zimbabwean rental operations. This repository contains a working full-stack implementation using `.NET 10`, `Angular 21`, and `SQL Server LocalDB`.

It supports:

- Office-scoped operations for Harare, Victoria Falls, and Bulawayo
- Fleet visibility with vehicle status tracking
- Booking capture with extras and agent bookings
- Payment capture for deposits and balance settlements
- JWT-based authentication and role-based access
- Revenue, utilization, and agent commission reporting
- PDF report export with FleetCar branding
- Seeded demo data for immediate local use

## Solution Structure

```text
RentalCar/
├── FleetCar.Api/   # ASP.NET Core Web API
├── FleetCar.Core/  # Domain models, DTOs, enums, service contracts
├── FleetCar.Data/  # EF Core DbContext, services, seeding
├── FleetCar.Web/   # Angular 21 frontend
└── FleetCar.slnx   # Solution file
```

## Technology Stack

### Backend

- `.NET SDK 10`
- `ASP.NET Core Web API`
- `Entity Framework Core`
- `SQL Server LocalDB`
- `JWT Bearer Authentication`
- `Swagger / Swashbuckle`
- `BCrypt` password hashing

### Frontend

- `Angular 21`
- `TypeScript`
- `Standalone components`
- `Reactive Forms`
- `Angular Router`

## Implemented Modules

### Authentication

- Username/password login
- JWT access tokens
- Refresh token issuing
- Current user endpoint
- Role claim and office claim handling

### Office Management

- Harare
- Victoria Falls
- Bulawayo
- Office-scoped data filtering for non-admin users

### Fleet Management

- Vehicle inventory
- Vehicle category, registration, transmission, seat count, color
- Statuses:
  - `Available`
  - `Reserved`
  - `Rented`
  - `Maintenance`
- Fuel, mileage, insurance expiry, registration expiry

### Bookings

- Counter, online, and agent channels
- Pickup and return location support
- Flight number support
- Optional extras:
  - GPS
  - Child seat
  - Additional insurance
  - Extra driver
- Availability validation for conflicting bookings

### Payments

- Deposit and balance payment capture
- Supported methods:
  - Cash
  - Card
  - Paynow
  - InnBucks
  - Bank Transfer
- Fiscal invoice reference storage

### Agents

- Seeded partner/agent records
- Commission percentages
- Preferred office association
- Commission reporting

### Reports

- Dashboard summary
- Revenue by office
- Vehicle utilization
- Agent commission reporting

## Seeded Demo Data

The API seeds demo data automatically on first run.

Included data:

- `3` offices
- `4` office locations
- `10` staff users
- `3` customers
- `2` agents
- `6` vehicles
- `3` bookings
- `3` payments
- `2` invoices
- `3` cash sessions
- `1` maintenance record

## Demo Credentials

All demo users use this password:

```text
Admin@123
```

### Available Users

| Username | Role | Office |
|---|---|---|
| `admin` | Admin | All Offices |
| `fleetmgr` | FleetManager | Harare |
| `booker` | Booker | Harare |
| `counter` | Counter | Harare |
| `manager` | Manager | Harare |
| `finance` | FinanceManager | Harare |
| `vfamanager` | Manager | Victoria Falls |
| `vfacounter` | Counter | Victoria Falls |
| `byomanager` | Manager | Bulawayo |
| `byocounter` | Counter | Bulawayo |

## Offices and Locations

### Harare

- `HRE-APT` - Harare International Airport
- `HRE-CTY` - Harare City Centre

### Victoria Falls

- `VFA-APT` - Victoria Falls Airport

### Bulawayo

- `BUQ-CTY` - Bulawayo City

## Development Prerequisites

Install:

- `.NET 10 SDK`
- `Node.js 20+`
- `npm`
- `Angular CLI 21`
- `SQL Server LocalDB`

## Database Setup

FleetCar uses SQL Server LocalDB in development.

Current API connection string:

```json
"ConnectionStrings": {
  "DefaultConnection": "Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog=FleetCarDb;MultipleActiveResultSets=true;TrustServerCertificate=true;"
}
```

Current behavior:

- The database is created automatically on first API startup.
- Seed data is inserted automatically if the database is empty.
- This implementation currently uses `EnsureCreated()` at startup, not migrations.

## How To Start The Backend

Open a terminal at the repository root:

```powershell
cd c:\Users\tedwell_d\source\repos\RentalCar
```

Restore and build:

```powershell
dotnet restore
dotnet build FleetCar.slnx
```

Run the API:

```powershell
dotnet run --project FleetCar.Api --launch-profile http
```

Backend URLs:

- `http://localhost:5288`
- `https://localhost:7064`

Swagger:

- `http://localhost:5288/swagger`

## How To Start The Frontend

Open another terminal:

```powershell
cd c:\Users\tedwell_d\source\repos\RentalCar\FleetCar.Web
```

Install dependencies:

```powershell
npm install
```

Run the Angular dev server:

```powershell
npm start
```

Frontend URL:

- `http://localhost:4200`

The frontend is configured to call the API at:

- `http://localhost:5288/api`

Important note:

- The frontend and backend are now aligned on `http://localhost:5288`.
- This avoids local HTTPS certificate issues during sign-in in development.

## Recommended Local Startup Flow

1. Start the backend:

```powershell
dotnet run --project FleetCar.Api --launch-profile http
```

2. Start the frontend:

```powershell
cd FleetCar.Web
npm start
```

3. Open:

```text
http://localhost:4200
```

4. Sign in with:

```text
admin / Admin@123
```

## API Endpoints

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### Reference Data

- `GET /api/offices`
- `GET /api/customers`
- `GET /api/agents`

### Operations

- `GET /api/cars`
- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/payments`
- `POST /api/payments`

### Reporting

- `GET /api/reports/dashboard`
- `GET /api/reports/revenue`
- `GET /api/reports/utilization`
- `GET /api/reports/agent-commissions`

## Office Scoping Rules

- `Admin` users can see all offices.
- Non-admin users are restricted to their assigned office.
- The restriction is enforced in the backend service layer using the user’s JWT claims.

## Key Backend Files

- [Program.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Api/Program.cs)
- [Domain.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Core/Domain.cs)
- [Contracts.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Core/Contracts.cs)
- [FleetCarDbContext.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Data/FleetCarDbContext.cs)
- [DbSeeder.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Data/DbSeeder.cs)

## Key Frontend Files

- [app.routes.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/app.routes.ts)
- [auth.service.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/core/auth.service.ts)
- [api.service.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/core/api.service.ts)
- [login-page.component.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/pages/login-page.component.ts)

## Build Verification

The current implementation was verified with:

```powershell
dotnet build FleetCar.slnx
cd FleetCar.Web
npm run build
```

The API was also smoke-tested locally for:

- Swagger availability
- Successful login
- Authenticated office retrieval

## Current Limitations

- No automated backend test project has been added yet
- EF Core migrations are not yet set up; startup currently relies on automatic creation and seeding

## License

Proprietary software.

FleetCar Car Rental System - Zimbabwe.
