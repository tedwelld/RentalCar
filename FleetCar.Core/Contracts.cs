namespace FleetCar.Core;

public sealed record LoginRequest(string Username, string Password);

public sealed record RefreshTokenRequest(string RefreshToken);

public sealed record UserDto(
    Guid Id,
    string Username,
    string FullName,
    string Email,
    string Role,
    Guid? OfficeId,
    string OfficeName);

public sealed record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAtUtc,
    UserDto User);

public sealed record OfficeDto(Guid Id, string Name, string Code, string City, IReadOnlyList<LocationDto> Locations);

public sealed record LocationDto(Guid Id, Guid OfficeId, string Code, string Name, string OperatingHours);

public sealed record CarDto(
    Guid Id,
    Guid OfficeId,
    string OfficeName,
    Guid CurrentLocationId,
    string CurrentLocationName,
    string RegistrationNumber,
    string Make,
    string Model,
    string Category,
    int Year,
    decimal DailyRate,
    string Status,
    int FuelLevelPercent,
    int MileageKm,
    DateTime InsuranceExpiryDateUtc,
    DateTime RegistrationExpiryDateUtc,
    string Transmission,
    int Seats,
    string Color);

public sealed record CustomerDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string NationalId,
    string DriverLicenseNumber,
    string Country,
    bool IsInternational,
    bool IsActive);

public sealed record AgentDto(
    Guid Id,
    string Code,
    string CompanyName,
    decimal CommissionRate,
    decimal CreditLimit,
    string Email,
    string Phone,
    Guid PreferredOfficeId,
    string PreferredOfficeName);

public sealed record BookingExtraDto(Guid Id, string Name, decimal Price);

public sealed record BookingDto(
    Guid Id,
    string Reference,
    Guid OfficeId,
    string OfficeName,
    Guid PickupLocationId,
    Guid ReturnLocationId,
    Guid CarId,
    string CarDisplayName,
    Guid CustomerId,
    string CustomerName,
    Guid? AgentId,
    string? AgentName,
    string Channel,
    string Status,
    DateTime PickupDateUtc,
    DateTime ReturnDateUtc,
    string PickupLocationName,
    string ReturnLocationName,
    decimal DailyRate,
    decimal ExtrasTotal,
    decimal TotalAmount,
    decimal DepositAmount,
    decimal BalanceAmount,
    string Currency,
    string? FlightNumber,
    string CreatedByUsername,
    IReadOnlyList<BookingExtraDto> Extras);

public sealed record PaymentDto(
    Guid Id,
    Guid BookingId,
    string BookingReference,
    Guid OfficeId,
    string OfficeName,
    decimal Amount,
    string Currency,
    string Method,
    string Status,
    bool IsDeposit,
    decimal TaxAmount,
    decimal VatAmount,
    decimal TotalAmount,
    string Reference,
    string? FiscalInvoiceNumber,
    DateTime PaidAtUtc,
    string CapturedByUsername);

public sealed record InvoiceDto(
    Guid Id,
    Guid BookingId,
    string BookingReference,
    string InvoiceNumber,
    decimal TotalAmount,
    string Currency,
    DateTime IssuedAtUtc,
    DateTime DueAtUtc,
    string Status);

public sealed record CreditNoteDto(
    Guid Id,
    Guid BookingId,
    string BookingReference,
    Guid OfficeId,
    string OfficeName,
    string Reference,
    string Reason,
    decimal Amount,
    string Currency,
    string Status,
    DateTime IssuedAtUtc,
    string CreatedByUsername);

public sealed record CashupDto(
    Guid Id,
    Guid OfficeId,
    string OfficeName,
    Guid UserId,
    string OpenedByUsername,
    string? ClosedByUsername,
    DateTime SessionDateUtc,
    decimal OpeningBalance,
    decimal ClosingBalance,
    decimal SalesTotal,
    decimal DepositTotal,
    decimal CreditNotesTotal,
    int PaymentsCount,
    string Status,
    DateTime? ClosedAtUtc,
    string? Notes);

public sealed record DocumentLineDto(string Description, decimal Quantity, decimal UnitPrice, decimal Amount);

public sealed record PrintableDocumentDto(
    string DocumentType,
    string DocumentNumber,
    string OfficeName,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string CustomerCountry,
    string Currency,
    string GeneratedByUsername,
    DateTime IssuedAtUtc,
    decimal Subtotal,
    decimal TaxAmount,
    decimal VatAmount,
    decimal TotalAmount,
    string Notes,
    IReadOnlyList<DocumentLineDto> Lines);

public sealed record DashboardSummaryDto(
    decimal TotalRevenue,
    int ActiveBookings,
    int AvailableCars,
    int CarsInMaintenance,
    int PendingReturns,
    int ActiveAgents,
    decimal OutstandingBalances);

public sealed record RevenueBreakdownDto(string OfficeName, decimal Revenue, int PaymentsCount);

public sealed record UtilizationReportDto(string OfficeName, int TotalCars, int RentedCars, int ReservedCars, double UtilizationPercent);

public sealed record AgentCommissionReportDto(string AgentCode, string CompanyName, int BookingsCount, decimal GrossValue, decimal CommissionAmount);

public sealed record CreateBookingExtraRequest(string Name, decimal Price);

public sealed record CreateBookingRequest(
    Guid OfficeId,
    Guid PickupLocationId,
    Guid ReturnLocationId,
    Guid CarId,
    Guid CustomerId,
    Guid? AgentId,
    string Channel,
    DateTime PickupDateUtc,
    DateTime ReturnDateUtc,
    string Currency,
    string? FlightNumber,
    string? Notes,
    IReadOnlyList<CreateBookingExtraRequest> Extras);

public sealed record UpdateBookingRequest(
    Guid OfficeId,
    Guid PickupLocationId,
    Guid ReturnLocationId,
    Guid CarId,
    Guid CustomerId,
    Guid? AgentId,
    string Channel,
    string Status,
    DateTime PickupDateUtc,
    DateTime ReturnDateUtc,
    string Currency,
    string? FlightNumber,
    string? Notes,
    IReadOnlyList<CreateBookingExtraRequest> Extras);

public sealed record CreatePaymentRequest(
    Guid BookingId,
    decimal Amount,
    string Currency,
    string Method,
    string? Status,
    bool IsDeposit,
    string? Reference,
    string? FiscalInvoiceNumber);

public sealed record UpdatePaymentRequest(
    decimal Amount,
    string Currency,
    string Method,
    string? Status,
    bool IsDeposit,
    string? Reference,
    string? FiscalInvoiceNumber);

public sealed record CreateCustomerRequest(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string NationalId,
    string DriverLicenseNumber,
    string Country,
    bool IsInternational);

public sealed record UpdateCustomerRequest(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string NationalId,
    string DriverLicenseNumber,
    string Country,
    bool IsInternational,
    bool IsActive);

public sealed record CreateCarRequest(
    Guid OfficeId,
    Guid CurrentLocationId,
    string RegistrationNumber,
    string Make,
    string Model,
    string Category,
    int Year,
    decimal DailyRate,
    string Status,
    int FuelLevelPercent,
    int MileageKm,
    DateTime InsuranceExpiryDateUtc,
    DateTime RegistrationExpiryDateUtc,
    string Transmission,
    int Seats,
    string Color);

public sealed record UpdateCarRequest(
    Guid OfficeId,
    Guid CurrentLocationId,
    string RegistrationNumber,
    string Make,
    string Model,
    string Category,
    int Year,
    decimal DailyRate,
    string Status,
    int FuelLevelPercent,
    int MileageKm,
    DateTime InsuranceExpiryDateUtc,
    DateTime RegistrationExpiryDateUtc,
    string Transmission,
    int Seats,
    string Color);

public sealed record CreateAgentRequest(
    Guid PreferredOfficeId,
    string Code,
    string CompanyName,
    decimal CommissionRate,
    decimal CreditLimit,
    string Email,
    string Phone);

public sealed record UpdateAgentRequest(
    Guid PreferredOfficeId,
    string Code,
    string CompanyName,
    decimal CommissionRate,
    decimal CreditLimit,
    string Email,
    string Phone);

public sealed record CreateCreditNoteRequest(
    Guid BookingId,
    decimal Amount,
    string Currency,
    string Reason);

public sealed record OpenCashupRequest(Guid OfficeId, decimal OpeningBalance);

public sealed record CloseCashupRequest(decimal ClosingBalance, string? Notes);

public sealed record OperationResult<T>(bool Succeeded, T? Value, string? Error)
{
    public static OperationResult<T> Success(T value) => new(true, value, null);
    public static OperationResult<T> Failure(string error) => new(false, default, error);
}

public interface IAuthService
{
    Task<OperationResult<AuthResponseDto>> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<OperationResult<AuthResponseDto>> RefreshAsync(string refreshToken, CancellationToken cancellationToken);
    Task<UserDto?> GetUserAsync(Guid userId, CancellationToken cancellationToken);
}

public interface IOfficeService
{
    Task<IReadOnlyList<OfficeDto>> GetOfficesAsync(UserContext userContext, CancellationToken cancellationToken);
}

public interface IFleetService
{
    Task<IReadOnlyList<CarDto>> GetCarsAsync(UserContext userContext, Guid? officeId, CarStatus? status, CancellationToken cancellationToken);
    Task<OperationResult<CarDto>> CreateCarAsync(UserContext userContext, CreateCarRequest request, CancellationToken cancellationToken);
    Task<OperationResult<CarDto>> UpdateCarAsync(UserContext userContext, Guid carId, UpdateCarRequest request, CancellationToken cancellationToken);
    Task<OperationResult<bool>> DeleteCarAsync(UserContext userContext, Guid carId, CancellationToken cancellationToken);
}

public interface ICustomerService
{
    Task<IReadOnlyList<CustomerDto>> GetCustomersAsync(UserContext userContext, CancellationToken cancellationToken);
    Task<OperationResult<CustomerDto>> CreateCustomerAsync(UserContext userContext, CreateCustomerRequest request, CancellationToken cancellationToken);
    Task<OperationResult<CustomerDto>> UpdateCustomerAsync(UserContext userContext, Guid customerId, UpdateCustomerRequest request, CancellationToken cancellationToken);
    Task<OperationResult<bool>> DeleteCustomerAsync(UserContext userContext, Guid customerId, CancellationToken cancellationToken);
    Task<OperationResult<CustomerDto>> SetCustomerActiveStateAsync(UserContext userContext, Guid customerId, bool isActive, CancellationToken cancellationToken);
}

public interface IBookingService
{
    Task<IReadOnlyList<BookingDto>> GetBookingsAsync(UserContext userContext, Guid? officeId, BookingStatus? status, CancellationToken cancellationToken);
    Task<OperationResult<BookingDto>> CreateBookingAsync(UserContext userContext, CreateBookingRequest request, CancellationToken cancellationToken);
    Task<OperationResult<BookingDto>> UpdateBookingAsync(UserContext userContext, Guid bookingId, UpdateBookingRequest request, CancellationToken cancellationToken);
    Task<OperationResult<bool>> DeleteBookingAsync(UserContext userContext, Guid bookingId, CancellationToken cancellationToken);
}

public interface IPaymentService
{
    Task<IReadOnlyList<PaymentDto>> GetPaymentsAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken);
    Task<OperationResult<PaymentDto>> CreatePaymentAsync(UserContext userContext, CreatePaymentRequest request, CancellationToken cancellationToken);
    Task<OperationResult<PaymentDto>> UpdatePaymentAsync(UserContext userContext, Guid paymentId, UpdatePaymentRequest request, CancellationToken cancellationToken);
    Task<OperationResult<bool>> DeletePaymentAsync(UserContext userContext, Guid paymentId, CancellationToken cancellationToken);
    Task<OperationResult<PaymentDto>> HoldPaymentAsync(UserContext userContext, Guid paymentId, CancellationToken cancellationToken);
    Task<OperationResult<PaymentDto>> ProcessPaymentAsync(UserContext userContext, Guid paymentId, CancellationToken cancellationToken);
}

public interface IAgentService
{
    Task<IReadOnlyList<AgentDto>> GetAgentsAsync(UserContext userContext, CancellationToken cancellationToken);
    Task<OperationResult<AgentDto>> CreateAgentAsync(UserContext userContext, CreateAgentRequest request, CancellationToken cancellationToken);
    Task<OperationResult<AgentDto>> UpdateAgentAsync(UserContext userContext, Guid agentId, UpdateAgentRequest request, CancellationToken cancellationToken);
    Task<OperationResult<bool>> DeleteAgentAsync(UserContext userContext, Guid agentId, CancellationToken cancellationToken);
}

public interface IReportService
{
    Task<DashboardSummaryDto> GetDashboardSummaryAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RevenueBreakdownDto>> GetRevenueReportAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken);
    Task<IReadOnlyList<UtilizationReportDto>> GetUtilizationReportAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken);
    Task<IReadOnlyList<AgentCommissionReportDto>> GetAgentCommissionReportAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken);
}

public interface ICreditNoteService
{
    Task<IReadOnlyList<CreditNoteDto>> GetCreditNotesAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken);
    Task<OperationResult<CreditNoteDto>> CreateCreditNoteAsync(UserContext userContext, CreateCreditNoteRequest request, CancellationToken cancellationToken);
}

public interface ICashupService
{
    Task<IReadOnlyList<CashupDto>> GetCashupsAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken);
    Task<OperationResult<CashupDto>> OpenCashupAsync(UserContext userContext, OpenCashupRequest request, CancellationToken cancellationToken);
    Task<OperationResult<CashupDto>> CloseCashupAsync(UserContext userContext, Guid cashupId, CloseCashupRequest request, CancellationToken cancellationToken);
}

public interface IDocumentService
{
    Task<OperationResult<PrintableDocumentDto>> GetQuotationAsync(UserContext userContext, Guid bookingId, CancellationToken cancellationToken);
    Task<OperationResult<PrintableDocumentDto>> GetReceiptAsync(UserContext userContext, Guid paymentId, CancellationToken cancellationToken);
    Task<OperationResult<PrintableDocumentDto>> GetCreditNoteDocumentAsync(UserContext userContext, Guid creditNoteId, CancellationToken cancellationToken);
}

public interface IDbSeeder
{
    Task SeedAsync(CancellationToken cancellationToken);
}
