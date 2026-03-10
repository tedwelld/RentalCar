# FleetCar Car Rental Management System

FleetCar is a multi-office car rental management platform for Zimbabwean operations. This repository contains a working full-stack implementation built with `.NET 10`, `Angular 21`, and `SQL Server LocalDB`.

The system currently supports office-scoped fleet, bookings, payments, customers, agents, reporting, document generation, and daily cashup workflows.

## Current Scope

FleetCar currently includes:

- multi-office operation for Harare, Victoria Falls, and Bulawayo
- JWT authentication with role-based access
- office-scoped data isolation for non-admin users
- fleet management with vehicle status tracking
- booking management with extras and office/location assignment
- payment capture with tax, VAT, generated references, and hold/process flow
- customer administration with activate, disable, edit, and delete actions
- agent management and commission reporting
- quotation, receipt, credit note, and filtered report PDF generation
- daily cashup open/close workflow with sales, deposits, and credit note totals

## Solution Structure

```text
RentalCar/
|-- FleetCar.Api/    ASP.NET Core Web API
|-- FleetCar.Core/   Domain models, DTOs, enums, contracts
|-- FleetCar.Data/   EF Core DbContext, services, seed data
|-- FleetCar.Web/    Angular 21 frontend
`-- FleetCar.slnx    Solution file
```

## Technology Stack

### Backend

- .NET 10 SDK
- ASP.NET Core Web API
- Entity Framework Core
- SQL Server LocalDB
- JWT Bearer Authentication
- Swagger
- BCrypt password hashing

### Frontend

- Angular 21
- TypeScript
- Standalone components
- Reactive Forms
- Angular Router
- jsPDF / jsPDF-AutoTable for branded PDF output

## Implemented Modules

### Authentication

- username/password sign-in
- JWT access token issuing
- refresh token issuing
- current user resolution from claims
- office and role claims used in backend service authorization

### Office and Role Model

Configured offices:

- Harare
- Victoria Falls
- Bulawayo

Implemented roles:

- Admin
- Manager
- FleetManager
- Booker
- Counter
- FinanceManager

Role behavior currently enforced in the backend and frontend:

- `Admin` has full access across all offices
- `Manager` has broad operational access for their office, including customers, payments, cashups, and reports
- `FleetManager` focuses on fleet operations
- `Booker` focuses on bookings
- `Counter` focuses on bookings, payments, and cashups
- `FinanceManager` focuses on payments, cashups, and reports

### Fleet

- vehicle CRUD
- office and location assignment
- status tracking:
  - `Available`
  - `Reserved`
  - `Rented`
  - `Maintenance`
- fuel level, mileage, insurance expiry, registration expiry

### Bookings

- booking CRUD
- office/location-aware pickup and return
- booking channels:
  - `Online`
  - `Counter`
  - `Agent`
- optional extras:
  - GPS
  - Child Seat
  - Additional Insurance
  - Extra Driver
- vehicle conflict validation
- booking ownership tracking through `CreatedByUser`
- quotation preview and print

### Customers

- customer CRUD for admin/manager roles
- customer activation and disable flow
- local vs international customer flag
- country tracking
- pagination on the customer admin page

### Payments

- payment capture against bookings
- deposit and balance payment support
- payment update, delete, hold, and process actions
- payment reference support:
  - user-supplied bank/wallet reference
  - system-generated fallback reference when omitted
- fiscal invoice number storage
- receipt preview and print

Supported payment methods:

- Cash
- Card
- Paynow
- InnBucks
- Bank Transfer

Implemented currency options in the UI:

- USD
- ZWL
- GBP
- ZAR
- EUR

Current payment rule implemented:

- local Zimbabwe customer payments in `USD` and `ZWL` must use `Paynow`

### Tax and VAT

Current financial rules in the backend:

- tax: `0.45%` on the base amount
- VAT: additional `2%` for international customers

These rules are applied in:

- booking total calculation
- payment total calculation
- generated receipts
- generated quotations

### Credit Notes

- create credit notes from the payments workflow
- credit note document preview and print
- credit notes included in daily cashup totals

### Agents

- agent CRUD
- preferred office mapping
- commission rate and credit limit tracking
- agent commission reporting

### Cashups

- open daily cashup
- close daily cashup
- per-day totals for:
  - processed sales
  - deposits
  - credit notes
- admin and authorized roles can review cashups

### Reporting

- dashboard summary
- revenue report
- utilization report
- agent commission report
- bookings export
- payments export
- fleet export
- branded PDF export with generator username included

### Documents and Printing

Branded PDF outputs currently supported:

- quotations
- receipts
- credit notes
- filtered reports

All generated PDFs include FleetCar branding details:

- company logo
- address: `123 Main Str Victorial Falls`
- phone: `+273774700574`
- email: `tedwellzwane34@gmail.com`

## Demo Data

The API seeds demo data automatically on first run when the database is empty.

Current seed set includes:

- 3 offices
- 4 locations
- 10 staff users
- 3 customers
- 2 agents
- 6 vehicles
- 3 seeded bookings
- 3 seeded payments
- 2 seeded invoices
- 3 seeded cash sessions
- 1 maintenance record

Note:

- smoke testing may add extra operational records such as additional bookings, payments, or credit notes in your local database

## Demo Credentials

All demo users use the same password:

```text
Admin@123
```

### Demo Users

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

- .NET 10 SDK
- Node.js 20+
- npm
- Angular CLI 21
- SQL Server LocalDB

## Database Setup

FleetCar uses SQL Server LocalDB for development.

Current API connection string:

```json
"ConnectionStrings": {
  "DefaultConnection": "Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog=FleetCarDb;MultipleActiveResultSets=true;TrustServerCertificate=true;"
}
```

Current behavior:

- the database is created automatically on first API startup
- seed data is inserted automatically if the database is empty
- startup includes schema patch logic for older local databases
- the implementation currently uses `EnsureCreated()` and raw compatibility patches, not EF migrations

## Startup

### Start the Backend

From the repository root:

```powershell
cd c:\Users\tedwell_d\source\repos\RentalCar
dotnet restore
dotnet build FleetCar.slnx
dotnet run --project FleetCar.Api --launch-profile http
```

Backend URLs:

- `http://localhost:5288`
- `https://localhost:7064`

Swagger:

- `http://localhost:5288/swagger`

### Start the Frontend

In a second terminal:

```powershell
cd c:\Users\tedwell_d\source\repos\RentalCar\FleetCar.Web
npm install
npm start
```

Frontend URL:

- `http://localhost:4200`

Frontend API base URL:

- `http://localhost:5288/api`

### Recommended Local Startup Flow

1. Start the API:

```powershell
dotnet run --project FleetCar.Api --launch-profile http
```

2. Start the Angular app:

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

## Routes

Public routes:

- `/`
- `/login`
- `/request-access`

Protected app routes:

- `/dashboard`
- `/fleet`
- `/bookings`
- `/payments`
- `/customers`
- `/cashups`
- `/agents`
- `/reports`

## API Surface

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### Reference and Admin Data

- `GET /api/offices`
- `GET /api/customers`
- `POST /api/customers`
- `PUT /api/customers/{id}`
- `POST /api/customers/{id}/activate`
- `POST /api/customers/{id}/disable`
- `DELETE /api/customers/{id}`
- `GET /api/agents`
- `POST /api/agents`
- `PUT /api/agents/{id}`
- `DELETE /api/agents/{id}`

### Operations

- `GET /api/cars`
- `POST /api/cars`
- `PUT /api/cars/{id}`
- `DELETE /api/cars/{id}`
- `GET /api/bookings`
- `POST /api/bookings`
- `PUT /api/bookings/{id}`
- `DELETE /api/bookings/{id}`
- `GET /api/payments`
- `POST /api/payments`
- `PUT /api/payments/{id}`
- `DELETE /api/payments/{id}`
- `POST /api/payments/{id}/hold`
- `POST /api/payments/{id}/process`

### Commercial Documents

- `GET /api/documents/quotation/{bookingId}`
- `GET /api/documents/receipt/{paymentId}`
- `GET /api/documents/credit-note/{creditNoteId}`
- `GET /api/creditnotes`
- `POST /api/creditnotes`

### Cashups

- `GET /api/cashups`
- `POST /api/cashups/open`
- `POST /api/cashups/{id}/close`

### Reporting

- `GET /api/reports/dashboard`
- `GET /api/reports/revenue`
- `GET /api/reports/utilization`
- `GET /api/reports/agent-commissions`

## UI Notes

The current frontend includes:

- separate landing page and login page
- branded top header with logo
- hover sidebar
- role-filtered navigation
- modal-based CRUD flows
- document preview modals for quotations, receipts, and credit notes
- white / blue / orange brand styling

## Key Files

### Backend

- [Program.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Api/Program.cs)
- [Domain.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Core/Domain.cs)
- [Contracts.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Core/Contracts.cs)
- [FleetCarDbContext.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Data/FleetCarDbContext.cs)
- [Services.AuthFleet.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Data/Services.AuthFleet.cs)
- [Services.PaymentsReports.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Data/Services.PaymentsReports.cs)
- [Services.DocumentsCashups.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Data/Services.DocumentsCashups.cs)
- [DbSeeder.cs](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Data/DbSeeder.cs)

### Frontend

- [app.routes.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/app.routes.ts)
- [app-shell.component.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/layout/app-shell.component.ts)
- [api.service.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/core/api.service.ts)
- [pdf-export.service.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/core/pdf-export.service.ts)
- [bookings-page.component.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/pages/bookings-page.component.ts)
- [payments-page.component.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/pages/payments-page.component.ts)
- [customers-page.component.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/pages/customers-page.component.ts)
- [cashups-page.component.ts](C:/Users/tedwell_d/source/repos/RentalCar/FleetCar.Web/src/app/pages/cashups-page.component.ts)

## Verification

Current implementation verified with:

```powershell
dotnet build FleetCar.slnx
cd FleetCar.Web
npm run build
```

Live API smoke test verified:

- admin login
- customers endpoint
- bookings endpoint
- payments endpoint
- cashups endpoint
- receipt generation
- quotation generation
- credit note creation
- credit note document generation

## Current Limitations

- no dedicated automated backend test project yet
- no EF migration workflow yet; startup still relies on compatibility patching plus `EnsureCreated()`
- customer page pagination is currently fixed at 10 rows per page
- report export is implemented for PDF only

## License

Proprietary software.

FleetCar Car Rental System - Zimbabwe.
