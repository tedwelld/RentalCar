using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FleetCar.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FleetCar.Data;

internal abstract class ServiceBase(FleetCarDbContext dbContext)
{
    protected FleetCarDbContext DbContext => dbContext;

    protected Guid? ResolveOfficeId(UserContext userContext, Guid? requestedOfficeId) =>
        userContext.IsAdmin ? requestedOfficeId : userContext.OfficeId;

    protected static bool IsOfficeAllowed(UserContext userContext, Guid officeId) =>
        userContext.IsAdmin || userContext.OfficeId == officeId;

    protected static bool CanViewOffice(UserContext userContext, Guid officeId) =>
        userContext.IsAdmin || userContext.OfficeId == officeId;
}

internal sealed class AuthService(FleetCarDbContext dbContext, IOptions<JwtSettings> jwtOptions) : ServiceBase(dbContext), IAuthService
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;

    public async Task<OperationResult<AuthResponseDto>> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await DbContext.Users
            .Include(x => x.Office)
            .Include(x => x.RefreshTokens)
            .SingleOrDefaultAsync(x => x.Username == request.Username && x.IsActive, cancellationToken);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return OperationResult<AuthResponseDto>.Failure("Invalid username or password.");
        }

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<OperationResult<AuthResponseDto>> RefreshAsync(string refreshToken, CancellationToken cancellationToken)
    {
        var token = await DbContext.RefreshTokens
            .Include(x => x.User)
            .ThenInclude(x => x!.Office)
            .SingleOrDefaultAsync(x => x.Token == refreshToken, cancellationToken);

        if (token is null || token.RevokedAtUtc is not null || token.ExpiresAtUtc <= DateTime.UtcNow || token.User is null)
        {
            return OperationResult<AuthResponseDto>.Failure("Refresh token is invalid or expired.");
        }

        token.RevokedAtUtc = DateTime.UtcNow;
        return await IssueTokensAsync(token.User, cancellationToken);
    }

    public async Task<UserDto?> GetUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await DbContext.Users
            .Include(x => x.Office)
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken);

        return user is null ? null : MapUser(user);
    }

    private async Task<OperationResult<AuthResponseDto>> IssueTokensAsync(User user, CancellationToken cancellationToken)
    {
        foreach (var expiredToken in user.RefreshTokens.Where(x => x.RevokedAtUtc is null && x.ExpiresAtUtc <= DateTime.UtcNow))
        {
            expiredToken.RevokedAtUtc = DateTime.UtcNow;
        }

        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenMinutes);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("officeId", user.OfficeId?.ToString() ?? string.Empty)
            ]),
            Expires = expiresAtUtc,
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key)),
                SecurityAlgorithms.HmacSha256)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var accessToken = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenDays)
        };

        DbContext.RefreshTokens.Add(refreshToken);
        await DbContext.SaveChangesAsync(cancellationToken);

        return OperationResult<AuthResponseDto>.Success(
            new AuthResponseDto(accessToken, refreshToken.Token, expiresAtUtc, MapUser(user)));
    }

    private static UserDto MapUser(User user) =>
        new(user.Id, user.Username, user.FullName, user.Email, user.Role.ToString(), user.OfficeId, user.Office?.Name ?? "All Offices");
}

internal sealed class OfficeService(FleetCarDbContext dbContext) : ServiceBase(dbContext), IOfficeService
{
    public async Task<IReadOnlyList<OfficeDto>> GetOfficesAsync(UserContext userContext, CancellationToken cancellationToken)
    {
        var offices = await DbContext.Offices
            .Include(x => x.Locations)
            .AsNoTracking()
            .Where(x => userContext.IsAdmin || x.Id == userContext.OfficeId)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return offices.Select(office => new OfficeDto(
            office.Id,
            office.Name,
            office.Code,
            office.City,
            office.Locations
                .OrderBy(x => x.Name)
                .Select(x => new LocationDto(x.Id, x.OfficeId, x.Code, x.Name, x.OperatingHours))
                .ToList()))
            .ToList();
    }
}

internal sealed class FleetService(FleetCarDbContext dbContext) : ServiceBase(dbContext), IFleetService
{
    public async Task<IReadOnlyList<CarDto>> GetCarsAsync(UserContext userContext, Guid? officeId, CarStatus? status, CancellationToken cancellationToken)
    {
        var effectiveOfficeId = ResolveOfficeId(userContext, officeId);
        var cars = await DbContext.Cars
            .Include(x => x.Office)
            .Include(x => x.CurrentLocation)
            .AsNoTracking()
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .Where(x => status == null || x.Status == status)
            .OrderBy(x => x.Office!.Name)
            .ThenBy(x => x.Make)
            .ThenBy(x => x.Model)
            .ToListAsync(cancellationToken);

        return cars.Select(MapCar).ToList();
    }

    public async Task<OperationResult<CarDto>> CreateCarAsync(UserContext userContext, CreateCarRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanManageFleet)
        {
            return OperationResult<CarDto>.Failure("You do not have permission to create vehicles.");
        }

        if (!IsOfficeAllowed(userContext, request.OfficeId))
        {
            return OperationResult<CarDto>.Failure("You cannot create vehicles for another office.");
        }

        if (!await TryValidateCarRequestAsync(request.OfficeId, request.CurrentLocationId, request.RegistrationNumber, null, cancellationToken))
        {
            return OperationResult<CarDto>.Failure("Vehicle details are invalid for the selected office.");
        }

        if (!Enum.TryParse<CarStatus>(request.Status, true, out var status))
        {
            return OperationResult<CarDto>.Failure("Invalid car status.");
        }

        var car = new Car
        {
            OfficeId = request.OfficeId,
            CurrentLocationId = request.CurrentLocationId,
            RegistrationNumber = request.RegistrationNumber.Trim().ToUpperInvariant(),
            Make = request.Make.Trim(),
            Model = request.Model.Trim(),
            Category = request.Category.Trim(),
            Year = request.Year,
            DailyRate = request.DailyRate,
            Status = status,
            FuelLevelPercent = request.FuelLevelPercent,
            MileageKm = request.MileageKm,
            InsuranceExpiryDateUtc = request.InsuranceExpiryDateUtc,
            RegistrationExpiryDateUtc = request.RegistrationExpiryDateUtc,
            Transmission = request.Transmission.Trim(),
            Seats = request.Seats,
            Color = request.Color.Trim()
        };

        DbContext.Cars.Add(car);
        await DbContext.SaveChangesAsync(cancellationToken);

        return OperationResult<CarDto>.Success(await LoadCarDtoAsync(car.Id, cancellationToken));
    }

    public async Task<OperationResult<CarDto>> UpdateCarAsync(UserContext userContext, Guid carId, UpdateCarRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanManageFleet)
        {
            return OperationResult<CarDto>.Failure("You do not have permission to update vehicles.");
        }

        var car = await DbContext.Cars.SingleOrDefaultAsync(x => x.Id == carId, cancellationToken);
        if (car is null)
        {
            return OperationResult<CarDto>.Failure("Vehicle not found.");
        }

        if (!IsOfficeAllowed(userContext, car.OfficeId) || !IsOfficeAllowed(userContext, request.OfficeId))
        {
            return OperationResult<CarDto>.Failure("You cannot update vehicles for another office.");
        }

        if (!await TryValidateCarRequestAsync(request.OfficeId, request.CurrentLocationId, request.RegistrationNumber, carId, cancellationToken))
        {
            return OperationResult<CarDto>.Failure("Vehicle details are invalid for the selected office.");
        }

        if (!Enum.TryParse<CarStatus>(request.Status, true, out var status))
        {
            return OperationResult<CarDto>.Failure("Invalid car status.");
        }

        car.OfficeId = request.OfficeId;
        car.CurrentLocationId = request.CurrentLocationId;
        car.RegistrationNumber = request.RegistrationNumber.Trim().ToUpperInvariant();
        car.Make = request.Make.Trim();
        car.Model = request.Model.Trim();
        car.Category = request.Category.Trim();
        car.Year = request.Year;
        car.DailyRate = request.DailyRate;
        car.Status = status;
        car.FuelLevelPercent = request.FuelLevelPercent;
        car.MileageKm = request.MileageKm;
        car.InsuranceExpiryDateUtc = request.InsuranceExpiryDateUtc;
        car.RegistrationExpiryDateUtc = request.RegistrationExpiryDateUtc;
        car.Transmission = request.Transmission.Trim();
        car.Seats = request.Seats;
        car.Color = request.Color.Trim();

        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<CarDto>.Success(await LoadCarDtoAsync(car.Id, cancellationToken));
    }

    public async Task<OperationResult<bool>> DeleteCarAsync(UserContext userContext, Guid carId, CancellationToken cancellationToken)
    {
        if (!userContext.IsAdmin && userContext.Role != UserRole.Manager)
        {
            return OperationResult<bool>.Failure("Only administrators and managers can delete vehicles.");
        }

        var car = await DbContext.Cars
            .Include(x => x.Bookings)
            .Include(x => x.MaintenanceRecords)
            .SingleOrDefaultAsync(x => x.Id == carId, cancellationToken);

        if (car is null)
        {
            return OperationResult<bool>.Failure("Vehicle not found.");
        }

        if (!IsOfficeAllowed(userContext, car.OfficeId))
        {
            return OperationResult<bool>.Failure("You cannot delete vehicles for another office.");
        }

        if (car.Bookings.Count != 0 || car.MaintenanceRecords.Count != 0)
        {
            return OperationResult<bool>.Failure("Vehicle cannot be deleted because it already has related activity.");
        }

        DbContext.Cars.Remove(car);
        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    private async Task<bool> TryValidateCarRequestAsync(Guid officeId, Guid locationId, string registrationNumber, Guid? carId, CancellationToken cancellationToken)
    {
        var locationExists = await DbContext.Locations.AnyAsync(x => x.Id == locationId && x.OfficeId == officeId, cancellationToken);
        if (!locationExists)
        {
            return false;
        }

        var normalizedRegistration = registrationNumber.Trim().ToUpperInvariant();
        return !await DbContext.Cars.AnyAsync(
            x => x.RegistrationNumber == normalizedRegistration && (carId == null || x.Id != carId.Value),
            cancellationToken);
    }

    private async Task<CarDto> LoadCarDtoAsync(Guid carId, CancellationToken cancellationToken)
    {
        var car = await DbContext.Cars
            .Include(x => x.Office)
            .Include(x => x.CurrentLocation)
            .AsNoTracking()
            .SingleAsync(x => x.Id == carId, cancellationToken);

        return MapCar(car);
    }

    private static CarDto MapCar(Car car) =>
        new(
            car.Id,
            car.OfficeId,
            car.Office?.Name ?? string.Empty,
            car.CurrentLocationId,
            car.CurrentLocation?.Name ?? string.Empty,
            car.RegistrationNumber,
            car.Make,
            car.Model,
            car.Category,
            car.Year,
            car.DailyRate,
            car.Status.ToString(),
            car.FuelLevelPercent,
            car.MileageKm,
            car.InsuranceExpiryDateUtc,
            car.RegistrationExpiryDateUtc,
            car.Transmission,
            car.Seats,
            car.Color);
}

internal sealed class CustomerService(FleetCarDbContext dbContext) : ServiceBase(dbContext), ICustomerService
{
    public async Task<IReadOnlyList<CustomerDto>> GetCustomersAsync(UserContext userContext, CancellationToken cancellationToken)
    {
        if (!userContext.CanManageCustomers && !userContext.CanManageBookings && !userContext.CanCapturePayments)
        {
            return [];
        }

        var customers = await DbContext.Customers
            .AsNoTracking()
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .ToListAsync(cancellationToken);

        return customers.Select(MapCustomer).ToList();
    }

    public async Task<OperationResult<CustomerDto>> CreateCustomerAsync(UserContext userContext, CreateCustomerRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanManageCustomers)
        {
            return OperationResult<CustomerDto>.Failure("You do not have permission to create customers.");
        }

        if (!await ValidateCustomerRequestAsync(request.Email, request.DriverLicenseNumber, null, cancellationToken))
        {
            return OperationResult<CustomerDto>.Failure("Customer email or driver license already exists.");
        }

        var customer = new Customer
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = request.Phone.Trim(),
            NationalId = request.NationalId.Trim(),
            DriverLicenseNumber = request.DriverLicenseNumber.Trim().ToUpperInvariant(),
            Country = string.IsNullOrWhiteSpace(request.Country) ? "Zimbabwe" : request.Country.Trim(),
            IsInternational = request.IsInternational,
            IsActive = true
        };

        DbContext.Customers.Add(customer);
        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<CustomerDto>.Success(MapCustomer(customer));
    }

    public async Task<OperationResult<CustomerDto>> UpdateCustomerAsync(UserContext userContext, Guid customerId, UpdateCustomerRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanManageCustomers)
        {
            return OperationResult<CustomerDto>.Failure("You do not have permission to update customers.");
        }

        var customer = await DbContext.Customers.SingleOrDefaultAsync(x => x.Id == customerId, cancellationToken);
        if (customer is null)
        {
            return OperationResult<CustomerDto>.Failure("Customer not found.");
        }

        if (!await ValidateCustomerRequestAsync(request.Email, request.DriverLicenseNumber, customerId, cancellationToken))
        {
            return OperationResult<CustomerDto>.Failure("Customer email or driver license already exists.");
        }

        customer.FirstName = request.FirstName.Trim();
        customer.LastName = request.LastName.Trim();
        customer.Email = request.Email.Trim().ToLowerInvariant();
        customer.Phone = request.Phone.Trim();
        customer.NationalId = request.NationalId.Trim();
        customer.DriverLicenseNumber = request.DriverLicenseNumber.Trim().ToUpperInvariant();
        customer.Country = string.IsNullOrWhiteSpace(request.Country) ? "Zimbabwe" : request.Country.Trim();
        customer.IsInternational = request.IsInternational;
        customer.IsActive = request.IsActive;

        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<CustomerDto>.Success(MapCustomer(customer));
    }

    public async Task<OperationResult<bool>> DeleteCustomerAsync(UserContext userContext, Guid customerId, CancellationToken cancellationToken)
    {
        if (!userContext.IsAdmin)
        {
            return OperationResult<bool>.Failure("Only administrators can delete customers.");
        }

        var customer = await DbContext.Customers
            .Include(x => x.Bookings)
            .SingleOrDefaultAsync(x => x.Id == customerId, cancellationToken);

        if (customer is null)
        {
            return OperationResult<bool>.Failure("Customer not found.");
        }

        if (customer.Bookings.Count != 0)
        {
            return OperationResult<bool>.Failure("Customer cannot be deleted because bookings exist.");
        }

        DbContext.Customers.Remove(customer);
        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<CustomerDto>> SetCustomerActiveStateAsync(UserContext userContext, Guid customerId, bool isActive, CancellationToken cancellationToken)
    {
        if (!userContext.CanManageCustomers)
        {
            return OperationResult<CustomerDto>.Failure("You do not have permission to change customer status.");
        }

        var customer = await DbContext.Customers.SingleOrDefaultAsync(x => x.Id == customerId, cancellationToken);
        if (customer is null)
        {
            return OperationResult<CustomerDto>.Failure("Customer not found.");
        }

        customer.IsActive = isActive;
        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<CustomerDto>.Success(MapCustomer(customer));
    }

    private async Task<bool> ValidateCustomerRequestAsync(string email, string driverLicenseNumber, Guid? customerId, CancellationToken cancellationToken)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var normalizedLicense = driverLicenseNumber.Trim().ToUpperInvariant();

        var emailExists = await DbContext.Customers.AnyAsync(
            x => x.Email == normalizedEmail && (customerId == null || x.Id != customerId.Value),
            cancellationToken);
        var licenseExists = await DbContext.Customers.AnyAsync(
            x => x.DriverLicenseNumber == normalizedLicense && (customerId == null || x.Id != customerId.Value),
            cancellationToken);

        return !emailExists && !licenseExists;
    }

    private static CustomerDto MapCustomer(Customer customer) =>
        new(
            customer.Id,
            customer.FirstName,
            customer.LastName,
            customer.Email,
            customer.Phone,
            customer.NationalId,
            customer.DriverLicenseNumber,
            customer.Country,
            customer.IsInternational,
            customer.IsActive);
}

internal sealed class BookingService(FleetCarDbContext dbContext) : ServiceBase(dbContext), IBookingService
{
    public async Task<IReadOnlyList<BookingDto>> GetBookingsAsync(UserContext userContext, Guid? officeId, BookingStatus? status, CancellationToken cancellationToken)
    {
        var effectiveOfficeId = ResolveOfficeId(userContext, officeId);
        var bookings = await DbContext.Bookings
            .Include(x => x.Office)
            .Include(x => x.Car)
            .Include(x => x.Customer)
            .Include(x => x.Agent)
            .Include(x => x.CreatedByUser)
            .Include(x => x.PickupLocation)
            .Include(x => x.ReturnLocation)
            .Include(x => x.Extras)
            .AsNoTracking()
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .Where(x => status == null || x.Status == status)
            .OrderByDescending(x => x.PickupDateUtc)
            .ToListAsync(cancellationToken);

        return bookings.Select(MapBooking).ToList();
    }

    public async Task<OperationResult<BookingDto>> CreateBookingAsync(UserContext userContext, CreateBookingRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanManageBookings)
        {
            return OperationResult<BookingDto>.Failure("You do not have permission to create bookings.");
        }

        if (!userContext.IsAdmin && userContext.OfficeId != request.OfficeId)
        {
            return OperationResult<BookingDto>.Failure("You cannot create bookings for another office.");
        }

        if (!await ValidateBookingReferencesAsync(request.OfficeId, request.PickupLocationId, request.ReturnLocationId, request.CustomerId, request.AgentId, cancellationToken))
        {
            return OperationResult<BookingDto>.Failure("One or more booking references are invalid.");
        }

        if (!Enum.TryParse<BookingChannel>(request.Channel, true, out var channel))
        {
            return OperationResult<BookingDto>.Failure("Invalid booking channel.");
        }

        var status = request.PickupDateUtc <= DateTime.UtcNow ? BookingStatus.Active : BookingStatus.Confirmed;
        var car = await ValidateBookingCarAsync(request.CarId, request.OfficeId, request.PickupDateUtc, request.ReturnDateUtc, null, cancellationToken);
        if (car is null)
        {
            return OperationResult<BookingDto>.Failure("Vehicle is not available for the selected dates.");
        }

        var customer = await DbContext.Customers.SingleAsync(x => x.Id == request.CustomerId, cancellationToken);
        var subtotalAmount = CalculateBookingSubtotal(car.DailyRate, request.PickupDateUtc, request.ReturnDateUtc, request.Extras);
        var (_, _, totalAmount) = FinancialRules.CalculateTotals(subtotalAmount, customer.IsInternational);
        var booking = new Booking
        {
            OfficeId = request.OfficeId,
            PickupLocationId = request.PickupLocationId,
            ReturnLocationId = request.ReturnLocationId,
            CarId = request.CarId,
            CustomerId = request.CustomerId,
            AgentId = request.AgentId,
            CreatedByUserId = userContext.UserId,
            Reference = $"BKG-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 999)}",
            Channel = channel,
            Status = status,
            PickupDateUtc = request.PickupDateUtc,
            ReturnDateUtc = request.ReturnDateUtc,
            DailyRate = car.DailyRate,
            ExtrasTotal = request.Extras.Sum(x => x.Price),
            TotalAmount = totalAmount,
            DepositAmount = 0,
            BalanceAmount = totalAmount,
            Currency = NormalizeCurrency(request.Currency),
            FlightNumber = request.FlightNumber,
            Notes = request.Notes,
            Extras = request.Extras.Select(x => new BookingExtra { Name = x.Name, Price = x.Price }).ToList()
        };

        DbContext.Bookings.Add(booking);
        await DbContext.SaveChangesAsync(cancellationToken);
        await SyncCarStatusAsync(booking.CarId, cancellationToken);

        return OperationResult<BookingDto>.Success(await LoadBookingDtoAsync(booking.Id, cancellationToken));
    }

    public async Task<OperationResult<BookingDto>> UpdateBookingAsync(UserContext userContext, Guid bookingId, UpdateBookingRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanManageBookings)
        {
            return OperationResult<BookingDto>.Failure("You do not have permission to update bookings.");
        }

        var booking = await DbContext.Bookings
            .Include(x => x.Extras)
            .Include(x => x.Payments)
            .Include(x => x.Invoices)
            .SingleOrDefaultAsync(x => x.Id == bookingId, cancellationToken);

        if (booking is null)
        {
            return OperationResult<BookingDto>.Failure("Booking not found.");
        }

        if (!IsOfficeAllowed(userContext, booking.OfficeId) || !IsOfficeAllowed(userContext, request.OfficeId))
        {
            return OperationResult<BookingDto>.Failure("You cannot update bookings for another office.");
        }

        if (!Enum.TryParse<BookingChannel>(request.Channel, true, out var channel) ||
            !Enum.TryParse<BookingStatus>(request.Status, true, out var status))
        {
            return OperationResult<BookingDto>.Failure("Booking status or channel is invalid.");
        }

        if (!await ValidateBookingReferencesAsync(request.OfficeId, request.PickupLocationId, request.ReturnLocationId, request.CustomerId, request.AgentId, cancellationToken))
        {
            return OperationResult<BookingDto>.Failure("One or more booking references are invalid.");
        }

        var car = await ValidateBookingCarAsync(request.CarId, request.OfficeId, request.PickupDateUtc, request.ReturnDateUtc, bookingId, cancellationToken);
        if (car is null)
        {
            return OperationResult<BookingDto>.Failure("Vehicle is not available for the selected dates.");
        }

        var previousCarId = booking.CarId;
        booking.OfficeId = request.OfficeId;
        booking.PickupLocationId = request.PickupLocationId;
        booking.ReturnLocationId = request.ReturnLocationId;
        booking.CarId = request.CarId;
        booking.CustomerId = request.CustomerId;
        booking.AgentId = request.AgentId;
        booking.Channel = channel;
        booking.Status = status;
        booking.PickupDateUtc = request.PickupDateUtc;
        booking.ReturnDateUtc = request.ReturnDateUtc;
        booking.DailyRate = car.DailyRate;
        booking.ExtrasTotal = request.Extras.Sum(x => x.Price);
        var customer = await DbContext.Customers.SingleAsync(x => x.Id == request.CustomerId, cancellationToken);
        var subtotalAmount = CalculateBookingSubtotal(car.DailyRate, request.PickupDateUtc, request.ReturnDateUtc, request.Extras);
        var (_, _, totalAmount) = FinancialRules.CalculateTotals(subtotalAmount, customer.IsInternational);
        booking.TotalAmount = totalAmount;
        booking.Currency = NormalizeCurrency(request.Currency);
        booking.FlightNumber = request.FlightNumber;
        booking.Notes = request.Notes;

        DbContext.BookingExtras.RemoveRange(booking.Extras);
        booking.Extras.Clear();
        foreach (var extra in request.Extras)
        {
            booking.Extras.Add(new BookingExtra { Name = extra.Name, Price = extra.Price });
        }

        RecalculateBookingFinancials(booking);
        await DbContext.SaveChangesAsync(cancellationToken);

        await SyncCarStatusAsync(booking.CarId, cancellationToken);
        if (previousCarId != booking.CarId)
        {
            await SyncCarStatusAsync(previousCarId, cancellationToken);
        }

        return OperationResult<BookingDto>.Success(await LoadBookingDtoAsync(booking.Id, cancellationToken));
    }

    public async Task<OperationResult<bool>> DeleteBookingAsync(UserContext userContext, Guid bookingId, CancellationToken cancellationToken)
    {
        if (!userContext.IsManagerLike)
        {
            return OperationResult<bool>.Failure("Only administrators and managers can delete bookings.");
        }

        var booking = await DbContext.Bookings
            .Include(x => x.Extras)
            .Include(x => x.Payments)
            .Include(x => x.Invoices)
            .SingleOrDefaultAsync(x => x.Id == bookingId, cancellationToken);

        if (booking is null)
        {
            return OperationResult<bool>.Failure("Booking not found.");
        }

        if (!IsOfficeAllowed(userContext, booking.OfficeId))
        {
            return OperationResult<bool>.Failure("You cannot delete bookings for another office.");
        }

        if (booking.Payments.Count != 0 || booking.Invoices.Count != 0)
        {
            return OperationResult<bool>.Failure("Booking cannot be deleted because it already has payments or invoices.");
        }

        var carId = booking.CarId;
        DbContext.BookingExtras.RemoveRange(booking.Extras);
        DbContext.Bookings.Remove(booking);
        await DbContext.SaveChangesAsync(cancellationToken);
        await SyncCarStatusAsync(carId, cancellationToken);

        return OperationResult<bool>.Success(true);
    }

    private async Task<bool> ValidateBookingReferencesAsync(
        Guid officeId,
        Guid pickupLocationId,
        Guid returnLocationId,
        Guid customerId,
        Guid? agentId,
        CancellationToken cancellationToken)
    {
        var customerExists = await DbContext.Customers.AnyAsync(x => x.Id == customerId && x.IsActive, cancellationToken);
        var pickupLocationExists = await DbContext.Locations.AnyAsync(x => x.Id == pickupLocationId && x.OfficeId == officeId, cancellationToken);
        var returnLocationExists = await DbContext.Locations.AnyAsync(x => x.Id == returnLocationId && x.OfficeId == officeId, cancellationToken);
        var agentExists = agentId is null || await DbContext.Agents.AnyAsync(x => x.Id == agentId.Value, cancellationToken);

        return customerExists && pickupLocationExists && returnLocationExists && agentExists;
    }

    private async Task<Car?> ValidateBookingCarAsync(Guid carId, Guid officeId, DateTime pickupDateUtc, DateTime returnDateUtc, Guid? bookingId, CancellationToken cancellationToken)
    {
        if (returnDateUtc <= pickupDateUtc)
        {
            return null;
        }

        var car = await DbContext.Cars
            .Include(x => x.Bookings)
            .SingleOrDefaultAsync(x => x.Id == carId, cancellationToken);

        if (car is null || car.OfficeId != officeId || car.Status == CarStatus.Maintenance)
        {
            return null;
        }

        var conflictingBookingExists = car.Bookings.Any(x =>
            x.Id != bookingId &&
            x.Status is BookingStatus.Pending or BookingStatus.Confirmed or BookingStatus.Active &&
            pickupDateUtc < x.ReturnDateUtc &&
            returnDateUtc > x.PickupDateUtc);

        return conflictingBookingExists ? null : car;
    }

    private async Task SyncCarStatusAsync(Guid carId, CancellationToken cancellationToken)
    {
        var car = await DbContext.Cars
            .Include(x => x.Bookings)
            .SingleOrDefaultAsync(x => x.Id == carId, cancellationToken);

        if (car is null || car.Status == CarStatus.Maintenance)
        {
            return;
        }

        var active = car.Bookings.Any(x => x.Status == BookingStatus.Active);
        var reserved = car.Bookings.Any(x => x.Status is BookingStatus.Pending or BookingStatus.Confirmed);
        car.Status = active ? CarStatus.Rented : reserved ? CarStatus.Reserved : CarStatus.Available;
        await DbContext.SaveChangesAsync(cancellationToken);
    }

    private static decimal CalculateBookingSubtotal(decimal dailyRate, DateTime pickupDateUtc, DateTime returnDateUtc, IReadOnlyList<CreateBookingExtraRequest> extras)
    {
        var rentalDays = Math.Max(1, (int)Math.Ceiling((returnDateUtc - pickupDateUtc).TotalDays));
        return (rentalDays * dailyRate) + extras.Sum(x => x.Price);
    }

    private static string NormalizeCurrency(string currency) =>
        string.IsNullOrWhiteSpace(currency) ? "USD" : currency.Trim().ToUpperInvariant();

    private static void RecalculateBookingFinancials(Booking booking)
    {
        var totalPaid = booking.Payments.Sum(x => x.Amount);
        booking.DepositAmount = booking.Payments.Where(x => x.IsDeposit).Sum(x => x.Amount);
        booking.BalanceAmount = Math.Max(0, booking.TotalAmount - totalPaid);
    }

    private async Task<BookingDto> LoadBookingDtoAsync(Guid bookingId, CancellationToken cancellationToken)
    {
        var booking = await DbContext.Bookings
            .Include(x => x.Office)
            .Include(x => x.Car)
            .Include(x => x.Customer)
            .Include(x => x.Agent)
            .Include(x => x.CreatedByUser)
            .Include(x => x.PickupLocation)
            .Include(x => x.ReturnLocation)
            .Include(x => x.Extras)
            .AsNoTracking()
            .SingleAsync(x => x.Id == bookingId, cancellationToken);

        return MapBooking(booking);
    }

    private static BookingDto MapBooking(Booking booking) =>
        new(
            booking.Id,
            booking.Reference,
            booking.OfficeId,
            booking.Office?.Name ?? string.Empty,
            booking.PickupLocationId,
            booking.ReturnLocationId,
            booking.CarId,
            booking.Car is null ? string.Empty : $"{booking.Car.Make} {booking.Car.Model} ({booking.Car.RegistrationNumber})",
            booking.CustomerId,
            booking.Customer is null ? string.Empty : $"{booking.Customer.FirstName} {booking.Customer.LastName}",
            booking.AgentId,
            booking.Agent?.CompanyName,
            booking.Channel.ToString(),
            booking.Status.ToString(),
            booking.PickupDateUtc,
            booking.ReturnDateUtc,
            booking.PickupLocation?.Name ?? string.Empty,
            booking.ReturnLocation?.Name ?? string.Empty,
            booking.DailyRate,
            booking.ExtrasTotal,
            booking.TotalAmount,
            booking.DepositAmount,
            booking.BalanceAmount,
            booking.Currency,
            booking.FlightNumber,
            booking.CreatedByUser?.Username ?? string.Empty,
            booking.Extras.Select(x => new BookingExtraDto(x.Id, x.Name, x.Price)).ToList());
}
