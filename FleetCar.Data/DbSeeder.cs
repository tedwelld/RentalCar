using FleetCar.Core;
using Microsoft.EntityFrameworkCore;

namespace FleetCar.Data;

internal sealed class DbSeeder(FleetCarDbContext dbContext) : IDbSeeder
{
    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        await dbContext.Database.EnsureCreatedAsync(cancellationToken);

        if (await dbContext.Offices.AnyAsync(cancellationToken))
        {
            return;
        }

        var anchor = new DateTime(2026, 3, 10, 8, 0, 0, DateTimeKind.Utc);

        var harare = new Office { Id = Guid.Parse("7E3FAD8A-40EA-4EE0-8D03-0B2F7FA0A001"), Name = "Harare", Code = "HRE", City = "Harare" };
        var victoriaFalls = new Office { Id = Guid.Parse("7E3FAD8A-40EA-4EE0-8D03-0B2F7FA0A002"), Name = "Victoria Falls", Code = "VFA", City = "Victoria Falls" };
        var bulawayo = new Office { Id = Guid.Parse("7E3FAD8A-40EA-4EE0-8D03-0B2F7FA0A003"), Name = "Bulawayo", Code = "BUQ", City = "Bulawayo" };

        var hreAirport = new Location { Id = Guid.Parse("8F65389A-B5E3-4A21-9A28-514F9E51A001"), OfficeId = harare.Id, Code = "HRE-APT", Name = "Harare International Airport", OperatingHours = "06:00 - 22:00" };
        var hreCity = new Location { Id = Guid.Parse("8F65389A-B5E3-4A21-9A28-514F9E51A002"), OfficeId = harare.Id, Code = "HRE-CTY", Name = "Harare City Centre", OperatingHours = "08:00 - 18:00" };
        var vfaAirport = new Location { Id = Guid.Parse("8F65389A-B5E3-4A21-9A28-514F9E51A003"), OfficeId = victoriaFalls.Id, Code = "VFA-APT", Name = "Victoria Falls Airport", OperatingHours = "06:00 - 22:00" };
        var byoCity = new Location { Id = Guid.Parse("8F65389A-B5E3-4A21-9A28-514F9E51A004"), OfficeId = bulawayo.Id, Code = "BUQ-CTY", Name = "Bulawayo City", OperatingHours = "08:00 - 17:00" };

        var users = new[]
        {
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A001"), "admin", "System Administrator", "admin@fleetcar.local", UserRole.Admin, null),
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A002"), "fleetmgr", "Harare Fleet Manager", "fleetmgr@fleetcar.local", UserRole.FleetManager, harare.Id),
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A003"), "booker", "Harare Booker", "booker@fleetcar.local", UserRole.Booker, harare.Id),
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A004"), "counter", "Harare Counter", "counter@fleetcar.local", UserRole.Counter, harare.Id),
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A005"), "manager", "Harare Office Manager", "manager@fleetcar.local", UserRole.Manager, harare.Id),
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A006"), "finance", "Harare Finance Manager", "finance@fleetcar.local", UserRole.FinanceManager, harare.Id),
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A007"), "vfamanager", "Victoria Falls Manager", "vfamanager@fleetcar.local", UserRole.Manager, victoriaFalls.Id),
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A008"), "vfacounter", "Victoria Falls Counter", "vfacounter@fleetcar.local", UserRole.Counter, victoriaFalls.Id),
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A009"), "byomanager", "Bulawayo Manager", "byomanager@fleetcar.local", UserRole.Manager, bulawayo.Id),
            CreateUser(Guid.Parse("59BD1BF6-B184-44D9-8B96-0A4B3676A010"), "byocounter", "Bulawayo Counter", "byocounter@fleetcar.local", UserRole.Counter, bulawayo.Id)
        };

        var customers = new[]
        {
            new Customer { Id = Guid.Parse("9A9E3D7E-2E5B-4EE0-A0D8-929C7981A001"), FirstName = "Tariro", LastName = "Moyo", Email = "tariro.moyo@example.com", Phone = "+263771111111", NationalId = "63-123456-A-12", DriverLicenseNumber = "HRE-DL-1001", Country = "Zimbabwe", IsInternational = false, IsActive = true },
            new Customer { Id = Guid.Parse("9A9E3D7E-2E5B-4EE0-A0D8-929C7981A002"), FirstName = "Blessing", LastName = "Ncube", Email = "blessing.ncube@example.com", Phone = "+263772222222", NationalId = "12-654321-B-34", DriverLicenseNumber = "BYO-DL-2001", Country = "Zimbabwe", IsInternational = false, IsActive = true },
            new Customer { Id = Guid.Parse("9A9E3D7E-2E5B-4EE0-A0D8-929C7981A003"), FirstName = "Tendai", LastName = "Dube", Email = "tendai.dube@example.com", Phone = "+263774444444", NationalId = "22-222222-D-66", DriverLicenseNumber = "VFA-DL-4001", Country = "South Africa", IsInternational = true, IsActive = true }
        };

        var agents = new[]
        {
            new Agent { Id = Guid.Parse("AA731B7C-33C4-4AF1-92D5-CCEF58A5A001"), PreferredOfficeId = victoriaFalls.Id, Code = "VFATOURS", CompanyName = "Victoria Falls Tours & Travels", CommissionRate = 12m, CreditLimit = 2500m, Email = "ops@vfatours.co.zw", Phone = "+263712000002" },
            new Agent { Id = Guid.Parse("AA731B7C-33C4-4AF1-92D5-CCEF58A5A002"), PreferredOfficeId = bulawayo.Id, Code = "BULTRIP", CompanyName = "Bulawayo Trip Planners", CommissionRate = 10m, CreditLimit = 1800m, Email = "bookings@bultrip.co.zw", Phone = "+263712000003" }
        };

        var cars = new[]
        {
            CreateCar(Guid.Parse("3A1D9A61-14B5-4D4F-AB72-89DCE7A9A001"), harare.Id, hreAirport.Id, "AFQ3490", "Toyota", "Corolla", "Compact", 2024, 65m, CarStatus.Available, 82, 15210, anchor.AddMonths(5), anchor.AddMonths(9), "Automatic", 5, "White"),
            CreateCar(Guid.Parse("3A1D9A61-14B5-4D4F-AB72-89DCE7A9A002"), harare.Id, hreAirport.Id, "AFQ3491", "Honda", "Fit", "Economy", 2023, 45m, CarStatus.Rented, 51, 28100, anchor.AddMonths(3), anchor.AddMonths(7), "Automatic", 5, "Blue"),
            CreateCar(Guid.Parse("3A1D9A61-14B5-4D4F-AB72-89DCE7A9A003"), victoriaFalls.Id, vfaAirport.Id, "AFQ4490", "Toyota", "Prado", "Luxury SUV", 2024, 180m, CarStatus.Available, 86, 13100, anchor.AddMonths(6), anchor.AddMonths(12), "Automatic", 7, "Black"),
            CreateCar(Guid.Parse("3A1D9A61-14B5-4D4F-AB72-89DCE7A9A004"), victoriaFalls.Id, vfaAirport.Id, "AFQ4491", "Toyota", "RAV4", "SUV", 2023, 95m, CarStatus.Reserved, 70, 22080, anchor.AddMonths(5), anchor.AddMonths(8), "Automatic", 5, "Silver"),
            CreateCar(Guid.Parse("3A1D9A61-14B5-4D4F-AB72-89DCE7A9A005"), bulawayo.Id, byoCity.Id, "AFQ5490", "Toyota", "Corolla", "Compact", 2023, 65m, CarStatus.Available, 76, 30220, anchor.AddMonths(4), anchor.AddMonths(8), "Automatic", 5, "White"),
            CreateCar(Guid.Parse("3A1D9A61-14B5-4D4F-AB72-89DCE7A9A006"), bulawayo.Id, byoCity.Id, "AFQ5491", "Honda", "Fit", "Economy", 2022, 45m, CarStatus.Maintenance, 38, 41040, anchor.AddMonths(2), anchor.AddMonths(5), "Automatic", 5, "Grey")
        };

        var counter = users.Single(x => x.Username == "counter");
        var vfaCounter = users.Single(x => x.Username == "vfacounter");
        var byoCounter = users.Single(x => x.Username == "byocounter");

        var bookings = new[]
        {
            CreateBooking(Guid.Parse("D3950B90-1AF9-4D0C-B0D4-7C325C59A001"), harare.Id, hreAirport.Id, hreAirport.Id, cars[1], customers[0], null, counter.Id, "BKG-HRE-1001", BookingChannel.Counter, BookingStatus.Active, anchor.AddDays(-1), anchor.AddDays(2), 120m, 15m, "USD", null, ("GPS", 15m)),
            CreateBooking(Guid.Parse("D3950B90-1AF9-4D0C-B0D4-7C325C59A002"), victoriaFalls.Id, vfaAirport.Id, vfaAirport.Id, cars[3], customers[2], agents[0], vfaCounter.Id, "BKG-VFA-2001", BookingChannel.Agent, BookingStatus.Confirmed, anchor.AddDays(1), anchor.AddDays(4), 150m, 15m, "USD", "SA042", ("GPS", 15m)),
            CreateBooking(Guid.Parse("D3950B90-1AF9-4D0C-B0D4-7C325C59A003"), bulawayo.Id, byoCity.Id, byoCity.Id, cars[4], customers[1], agents[1], byoCounter.Id, "BKG-BYO-3001", BookingChannel.Agent, BookingStatus.Completed, anchor.AddDays(-6), anchor.AddDays(-3), 195m, 0m, "USD", null)
        };

        var payments = new[]
        {
            CreatePayment(Guid.Parse("EA83EF8B-FC1B-405D-83F7-965D8147A001"), bookings[0], customers[0].IsInternational, counter.Id, 120m, PaymentMethod.Paynow, true, "POS-HRE-001", "FI-HRE-001", anchor.AddDays(-1)),
            CreatePayment(Guid.Parse("EA83EF8B-FC1B-405D-83F7-965D8147A002"), bookings[1], customers[2].IsInternational, vfaCounter.Id, 150m, PaymentMethod.BankTransfer, true, "BANK-VFA-001", "FI-VFA-001", anchor.AddHours(-10)),
            CreatePayment(Guid.Parse("EA83EF8B-FC1B-405D-83F7-965D8147A003"), bookings[2], customers[1].IsInternational, byoCounter.Id, 195m, PaymentMethod.Paynow, false, "CASH-BYO-001", "FI-BYO-001", anchor.AddDays(-4))
        };

        var invoices = new[]
        {
            CreateInvoice(Guid.Parse("F612B1A7-0AB2-42EB-A7C2-6FA00BC2A001"), bookings[0], "INV-HRE-0001", anchor.AddDays(-1), anchor.AddDays(2), InvoiceStatus.Issued),
            CreateInvoice(Guid.Parse("F612B1A7-0AB2-42EB-A7C2-6FA00BC2A002"), bookings[1], "INV-VFA-0001", anchor.AddHours(-10), anchor.AddDays(4), InvoiceStatus.Issued)
        };

        var cashSessions = new[]
        {
            new CashSession { Id = Guid.Parse("BF6A2D6A-27D7-4998-8FF6-8DB78F16A001"), OfficeId = harare.Id, UserId = counter.Id, SessionDateUtc = anchor.Date, OpeningBalance = 120m, ClosingBalance = 120m, Status = CashSessionStatus.Open },
            new CashSession { Id = Guid.Parse("BF6A2D6A-27D7-4998-8FF6-8DB78F16A002"), OfficeId = victoriaFalls.Id, UserId = vfaCounter.Id, SessionDateUtc = anchor.Date, OpeningBalance = 200m, ClosingBalance = 350m, Status = CashSessionStatus.Open },
            new CashSession { Id = Guid.Parse("BF6A2D6A-27D7-4998-8FF6-8DB78F16A003"), OfficeId = bulawayo.Id, UserId = byoCounter.Id, SessionDateUtc = anchor.Date, OpeningBalance = 90m, ClosingBalance = 285m, Status = CashSessionStatus.Open }
        };

        var maintenanceRecords = new[]
        {
            new MaintenanceRecord { Id = Guid.Parse("C08C0B9E-F97C-4A48-8262-6B743941A001"), CarId = cars[5].Id, OfficeId = bulawayo.Id, ScheduledDateUtc = anchor.AddDays(-1), Description = "Routine service and diagnostics", Cost = 180m, Status = MaintenanceStatus.InProgress }
        };

        dbContext.AddRange(harare, victoriaFalls, bulawayo);
        dbContext.AddRange(hreAirport, hreCity, vfaAirport, byoCity);
        dbContext.AddRange(users);
        dbContext.AddRange(customers);
        dbContext.AddRange(agents);
        dbContext.AddRange(cars);
        dbContext.AddRange(bookings);
        dbContext.AddRange(bookings.SelectMany(x => x.Extras));
        dbContext.AddRange(payments);
        dbContext.AddRange(invoices);
        dbContext.AddRange(cashSessions);
        dbContext.AddRange(maintenanceRecords);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static User CreateUser(Guid id, string username, string fullName, string email, UserRole role, Guid? officeId) =>
        new()
        {
            Id = id,
            Username = username,
            FullName = fullName,
            Email = email,
            Role = role,
            OfficeId = officeId,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            IsActive = true
        };

    private static Car CreateCar(Guid id, Guid officeId, Guid locationId, string registrationNumber, string make, string model, string category, int year, decimal dailyRate, CarStatus status, int fuelLevelPercent, int mileageKm, DateTime insuranceExpiryDateUtc, DateTime registrationExpiryDateUtc, string transmission, int seats, string color) =>
        new()
        {
            Id = id,
            OfficeId = officeId,
            CurrentLocationId = locationId,
            RegistrationNumber = registrationNumber,
            Make = make,
            Model = model,
            Category = category,
            Year = year,
            DailyRate = dailyRate,
            Status = status,
            FuelLevelPercent = fuelLevelPercent,
            MileageKm = mileageKm,
            InsuranceExpiryDateUtc = insuranceExpiryDateUtc,
            RegistrationExpiryDateUtc = registrationExpiryDateUtc,
            Transmission = transmission,
            Seats = seats,
            Color = color
        };

    private static Booking CreateBooking(Guid id, Guid officeId, Guid pickupLocationId, Guid returnLocationId, Car car, Customer customer, Agent? agent, Guid createdByUserId, string reference, BookingChannel channel, BookingStatus status, DateTime pickupDateUtc, DateTime returnDateUtc, decimal depositAmount, decimal extrasTotal, string currency, string? flightNumber, params (string Name, decimal Price)[] extras)
    {
        var subtotal = (Math.Max(1, (int)Math.Ceiling((returnDateUtc - pickupDateUtc).TotalDays)) * car.DailyRate) + extrasTotal;
        var (_, _, totalAmount) = FinancialRules.CalculateTotals(subtotal, customer.IsInternational);
        return new Booking
        {
            Id = id,
            OfficeId = officeId,
            PickupLocationId = pickupLocationId,
            ReturnLocationId = returnLocationId,
            CarId = car.Id,
            CustomerId = customer.Id,
            AgentId = agent?.Id,
            CreatedByUserId = createdByUserId,
            Reference = reference,
            Channel = channel,
            Status = status,
            PickupDateUtc = pickupDateUtc,
            ReturnDateUtc = returnDateUtc,
            DailyRate = car.DailyRate,
            ExtrasTotal = extrasTotal,
            TotalAmount = totalAmount,
            DepositAmount = depositAmount,
            BalanceAmount = Math.Max(0, totalAmount - depositAmount),
            Currency = currency,
            FlightNumber = flightNumber,
            Extras = extras.Select(x => new BookingExtra { Id = Guid.NewGuid(), BookingId = id, Name = x.Name, Price = x.Price }).ToList()
        };
    }

    private static Payment CreatePayment(Guid id, Booking booking, bool isInternationalCustomer, Guid createdByUserId, decimal amount, PaymentMethod method, bool isDeposit, string reference, string fiscalInvoiceNumber, DateTime paidAtUtc)
    {
        var (taxAmount, vatAmount, totalAmount) = FinancialRules.CalculateTotals(amount, isInternationalCustomer);
        return new Payment
        {
            Id = id,
            BookingId = booking.Id,
            OfficeId = booking.OfficeId,
            CreatedByUserId = createdByUserId,
            Amount = amount,
            Currency = booking.Currency,
            Method = method,
            Status = PaymentStatus.Processed,
            IsDeposit = isDeposit,
            TaxAmount = taxAmount,
            VatAmount = vatAmount,
            TotalAmount = totalAmount,
            Reference = reference,
            FiscalInvoiceNumber = fiscalInvoiceNumber,
            PaidAtUtc = paidAtUtc
        };
    }

    private static Invoice CreateInvoice(Guid id, Booking booking, string invoiceNumber, DateTime issuedAtUtc, DateTime dueAtUtc, InvoiceStatus status) =>
        new()
        {
            Id = id,
            BookingId = booking.Id,
            OfficeId = booking.OfficeId,
            InvoiceNumber = invoiceNumber,
            TotalAmount = booking.TotalAmount,
            Currency = booking.Currency,
            IssuedAtUtc = issuedAtUtc,
            DueAtUtc = dueAtUtc,
            Status = status
        };
}
