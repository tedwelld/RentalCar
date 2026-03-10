namespace FleetCar.Core;

public abstract class EntityBase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public enum CarStatus
{
    Available = 1,
    Rented = 2,
    Maintenance = 3,
    Reserved = 4
}

public enum BookingStatus
{
    Pending = 1,
    Confirmed = 2,
    Active = 3,
    Completed = 4,
    Cancelled = 5
}

public enum PaymentMethod
{
    Cash = 1,
    Card = 2,
    Paynow = 3,
    InnBucks = 4,
    BankTransfer = 5
}

public enum PaymentStatus
{
    Processed = 1,
    Held = 2
}

public enum UserRole
{
    Admin = 1,
    FleetManager = 2,
    Booker = 3,
    Counter = 4,
    Manager = 5,
    FinanceManager = 6
}

public enum BookingChannel
{
    Online = 1,
    Counter = 2,
    Agent = 3
}

public enum InvoiceStatus
{
    Draft = 1,
    Issued = 2,
    Paid = 3,
    Overdue = 4
}

public enum CreditNoteStatus
{
    Draft = 1,
    Issued = 2,
    Applied = 3
}

public enum CashSessionStatus
{
    Open = 1,
    Closed = 2
}

public enum MaintenanceStatus
{
    Scheduled = 1,
    InProgress = 2,
    Completed = 3
}

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "FleetCar.Api";
    public string Audience { get; set; } = "FleetCar.Web";
    public string Key { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 120;
    public int RefreshTokenDays { get; set; } = 14;
}

public sealed class UserContext
{
    public Guid UserId { get; init; }
    public string Username { get; init; } = string.Empty;
    public UserRole Role { get; init; }
    public Guid? OfficeId { get; init; }

    public bool IsAdmin => Role == UserRole.Admin;
    public bool IsManagerLike => Role is UserRole.Admin or UserRole.Manager;
    public bool CanManageBookings => Role is UserRole.Admin or UserRole.Manager or UserRole.Booker or UserRole.Counter;
    public bool CanManageFleet => Role is UserRole.Admin or UserRole.Manager or UserRole.FleetManager;
    public bool CanCapturePayments => Role is UserRole.Admin or UserRole.Manager or UserRole.Counter or UserRole.FinanceManager;
    public bool CanManagePayments => Role is UserRole.Admin or UserRole.Manager or UserRole.FinanceManager;
    public bool CanManageCustomers => Role is UserRole.Admin or UserRole.Manager;
    public bool CanUseCashup => Role is UserRole.Admin or UserRole.Manager or UserRole.Counter or UserRole.FinanceManager;
    public bool CanViewReports => Role is UserRole.Admin or UserRole.Manager or UserRole.FinanceManager;
}

public sealed class Office : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<Location> Locations { get; set; } = new List<Location>();
    public ICollection<User> Staff { get; set; } = new List<User>();
    public ICollection<Car> Cars { get; set; } = new List<Car>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}

public sealed class Location : EntityBase
{
    public Guid OfficeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string OperatingHours { get; set; } = string.Empty;

    public Office? Office { get; set; }
}

public sealed class User : EntityBase
{
    public Guid? OfficeId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;

    public Office? Office { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

public sealed class Car : EntityBase
{
    public Guid OfficeId { get; set; }
    public Guid CurrentLocationId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Year { get; set; }
    public decimal DailyRate { get; set; }
    public CarStatus Status { get; set; }
    public int FuelLevelPercent { get; set; }
    public int MileageKm { get; set; }
    public DateTime InsuranceExpiryDateUtc { get; set; }
    public DateTime RegistrationExpiryDateUtc { get; set; }
    public string Transmission { get; set; } = string.Empty;
    public int Seats { get; set; }
    public string Color { get; set; } = string.Empty;

    public Office? Office { get; set; }
    public Location? CurrentLocation { get; set; }
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = new List<MaintenanceRecord>();
}

public sealed class Customer : EntityBase
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string NationalId { get; set; } = string.Empty;
    public string DriverLicenseNumber { get; set; } = string.Empty;
    public string Country { get; set; } = "Zimbabwe";
    public bool IsInternational { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}

public sealed class Agent : EntityBase
{
    public Guid PreferredOfficeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public decimal CommissionRate { get; set; }
    public decimal CreditLimit { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;

    public Office? PreferredOffice { get; set; }
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}

public sealed class Booking : EntityBase
{
    public Guid OfficeId { get; set; }
    public Guid PickupLocationId { get; set; }
    public Guid ReturnLocationId { get; set; }
    public Guid CarId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? AgentId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Reference { get; set; } = string.Empty;
    public BookingChannel Channel { get; set; }
    public BookingStatus Status { get; set; }
    public DateTime PickupDateUtc { get; set; }
    public DateTime ReturnDateUtc { get; set; }
    public decimal DailyRate { get; set; }
    public decimal ExtrasTotal { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public string Currency { get; set; } = "USD";
    public string? FlightNumber { get; set; }
    public string? Notes { get; set; }

    public Office? Office { get; set; }
    public Location? PickupLocation { get; set; }
    public Location? ReturnLocation { get; set; }
    public Car? Car { get; set; }
    public Customer? Customer { get; set; }
    public Agent? Agent { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<BookingExtra> Extras { get; set; } = new List<BookingExtra>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}

public sealed class BookingExtra : EntityBase
{
    public Guid BookingId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }

    public Booking? Booking { get; set; }
}

public sealed class Payment : EntityBase
{
    public Guid BookingId { get; set; }
    public Guid OfficeId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Processed;
    public bool IsDeposit { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string? FiscalInvoiceNumber { get; set; }
    public DateTime PaidAtUtc { get; set; }

    public Booking? Booking { get; set; }
    public Office? Office { get; set; }
    public User? CreatedByUser { get; set; }
}

public sealed class Invoice : EntityBase
{
    public Guid BookingId { get; set; }
    public Guid OfficeId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime IssuedAtUtc { get; set; }
    public DateTime DueAtUtc { get; set; }
    public InvoiceStatus Status { get; set; }

    public Booking? Booking { get; set; }
    public Office? Office { get; set; }
}

public sealed class CashSession : EntityBase
{
    public Guid OfficeId { get; set; }
    public Guid UserId { get; set; }
    public Guid? ClosedByUserId { get; set; }
    public DateTime SessionDateUtc { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal ClosingBalance { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public string? Notes { get; set; }
    public CashSessionStatus Status { get; set; }

    public Office? Office { get; set; }
    public User? User { get; set; }
    public User? ClosedByUser { get; set; }
}

public sealed class CreditNote : EntityBase
{
    public Guid BookingId { get; set; }
    public Guid OfficeId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public CreditNoteStatus Status { get; set; } = CreditNoteStatus.Issued;
    public DateTime IssuedAtUtc { get; set; }

    public Booking? Booking { get; set; }
    public Office? Office { get; set; }
    public User? CreatedByUser { get; set; }
}

public sealed class MaintenanceRecord : EntityBase
{
    public Guid CarId { get; set; }
    public Guid OfficeId { get; set; }
    public DateTime ScheduledDateUtc { get; set; }
    public DateTime? CompletedDateUtc { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public MaintenanceStatus Status { get; set; }

    public Car? Car { get; set; }
    public Office? Office { get; set; }
}

public sealed class RefreshToken : EntityBase
{
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }

    public User? User { get; set; }
}
