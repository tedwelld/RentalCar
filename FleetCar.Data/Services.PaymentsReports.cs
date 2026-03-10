using FleetCar.Core;
using Microsoft.EntityFrameworkCore;

namespace FleetCar.Data;

internal sealed class PaymentService(FleetCarDbContext dbContext) : ServiceBase(dbContext), IPaymentService
{
    public async Task<IReadOnlyList<PaymentDto>> GetPaymentsAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken)
    {
        var effectiveOfficeId = ResolveOfficeId(userContext, officeId);
        var payments = await DbContext.Payments
            .Include(x => x.Booking)
            .ThenInclude(x => x!.Customer)
            .Include(x => x.Office)
            .Include(x => x.CreatedByUser)
            .AsNoTracking()
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .OrderByDescending(x => x.PaidAtUtc)
            .ToListAsync(cancellationToken);

        return payments.Select(MapPayment).ToList();
    }

    public async Task<OperationResult<PaymentDto>> CreatePaymentAsync(UserContext userContext, CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanCapturePayments)
        {
            return OperationResult<PaymentDto>.Failure("You do not have permission to capture payments.");
        }

        if (!Enum.TryParse<PaymentMethod>(request.Method.Replace(" ", string.Empty), true, out var method))
        {
            return OperationResult<PaymentDto>.Failure("Invalid payment method.");
        }

        var status = ParsePaymentStatus(request.Status);
        if (status is null)
        {
            return OperationResult<PaymentDto>.Failure("Invalid payment status.");
        }

        if (!userContext.IsAdmin && status == PaymentStatus.Held)
        {
            return OperationResult<PaymentDto>.Failure("Only administrators can create held payments.");
        }

        var booking = await DbContext.Bookings
            .Include(x => x.Payments)
            .Include(x => x.Customer)
            .SingleOrDefaultAsync(x => x.Id == request.BookingId, cancellationToken);

        if (booking is null || booking.Customer is null)
        {
            return OperationResult<PaymentDto>.Failure("Booking not found.");
        }

        if (!IsOfficeAllowed(userContext, booking.OfficeId))
        {
            return OperationResult<PaymentDto>.Failure("You cannot post payments for another office.");
        }

        if (booking.Customer.IsActive is false)
        {
            return OperationResult<PaymentDto>.Failure("Payments cannot be captured for inactive customers.");
        }

        var normalizedCurrency = NormalizeCurrency(request.Currency, booking.Currency);
        if (FinancialRules.RequiresPaynowForLocalZimbabwePayment(booking.Customer.IsInternational, normalizedCurrency) && method != PaymentMethod.Paynow)
        {
            return OperationResult<PaymentDto>.Failure("Local USD and ZWL payments must be processed through Paynow.");
        }

        var (taxAmount, vatAmount, totalAmount) = FinancialRules.CalculateTotals(request.Amount, booking.Customer.IsInternational);

        var payment = new Payment
        {
            BookingId = booking.Id,
            OfficeId = booking.OfficeId,
            CreatedByUserId = userContext.UserId,
            Amount = request.Amount,
            Currency = normalizedCurrency,
            Method = method,
            Status = status.Value,
            IsDeposit = request.IsDeposit,
            TaxAmount = taxAmount,
            VatAmount = vatAmount,
            TotalAmount = totalAmount,
            Reference = NormalizeReference(request.Reference, method),
            FiscalInvoiceNumber = string.IsNullOrWhiteSpace(request.FiscalInvoiceNumber) ? null : request.FiscalInvoiceNumber.Trim(),
            PaidAtUtc = DateTime.UtcNow
        };

        DbContext.Payments.Add(payment);
        await DbContext.SaveChangesAsync(cancellationToken);
        await RecalculateBookingFinancialsAsync(booking.Id, cancellationToken);

        return OperationResult<PaymentDto>.Success(await LoadPaymentDtoAsync(payment.Id, cancellationToken));
    }

    public async Task<OperationResult<PaymentDto>> UpdatePaymentAsync(UserContext userContext, Guid paymentId, UpdatePaymentRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanManagePayments)
        {
            return OperationResult<PaymentDto>.Failure("You do not have permission to update payments.");
        }

        if (!Enum.TryParse<PaymentMethod>(request.Method.Replace(" ", string.Empty), true, out var method))
        {
            return OperationResult<PaymentDto>.Failure("Invalid payment method.");
        }

        var status = ParsePaymentStatus(request.Status);
        if (status is null)
        {
            return OperationResult<PaymentDto>.Failure("Invalid payment status.");
        }

        var payment = await DbContext.Payments
            .Include(x => x.Booking)
            .ThenInclude(x => x!.Customer)
            .SingleOrDefaultAsync(x => x.Id == paymentId, cancellationToken);

        if (payment is null || payment.Booking is null || payment.Booking.Customer is null)
        {
            return OperationResult<PaymentDto>.Failure("Payment not found.");
        }

        if (!IsOfficeAllowed(userContext, payment.OfficeId))
        {
            return OperationResult<PaymentDto>.Failure("You cannot update payments for another office.");
        }

        var normalizedCurrency = NormalizeCurrency(request.Currency, payment.Booking.Currency);
        if (FinancialRules.RequiresPaynowForLocalZimbabwePayment(payment.Booking.Customer.IsInternational, normalizedCurrency) && method != PaymentMethod.Paynow)
        {
            return OperationResult<PaymentDto>.Failure("Local USD and ZWL payments must be processed through Paynow.");
        }

        var (taxAmount, vatAmount, totalAmount) = FinancialRules.CalculateTotals(request.Amount, payment.Booking.Customer.IsInternational);

        payment.Amount = request.Amount;
        payment.Currency = normalizedCurrency;
        payment.Method = method;
        payment.Status = status.Value;
        payment.IsDeposit = request.IsDeposit;
        payment.TaxAmount = taxAmount;
        payment.VatAmount = vatAmount;
        payment.TotalAmount = totalAmount;
        payment.Reference = NormalizeReference(request.Reference, method, payment.Reference);
        payment.FiscalInvoiceNumber = string.IsNullOrWhiteSpace(request.FiscalInvoiceNumber) ? null : request.FiscalInvoiceNumber.Trim();

        await DbContext.SaveChangesAsync(cancellationToken);
        await RecalculateBookingFinancialsAsync(payment.BookingId, cancellationToken);

        return OperationResult<PaymentDto>.Success(await LoadPaymentDtoAsync(payment.Id, cancellationToken));
    }

    public async Task<OperationResult<bool>> DeletePaymentAsync(UserContext userContext, Guid paymentId, CancellationToken cancellationToken)
    {
        if (!userContext.IsAdmin)
        {
            return OperationResult<bool>.Failure("Only administrators can delete payments.");
        }

        var payment = await DbContext.Payments.SingleOrDefaultAsync(x => x.Id == paymentId, cancellationToken);
        if (payment is null)
        {
            return OperationResult<bool>.Failure("Payment not found.");
        }

        if (!IsOfficeAllowed(userContext, payment.OfficeId))
        {
            return OperationResult<bool>.Failure("You cannot delete payments for another office.");
        }

        var bookingId = payment.BookingId;
        DbContext.Payments.Remove(payment);
        await DbContext.SaveChangesAsync(cancellationToken);
        await RecalculateBookingFinancialsAsync(bookingId, cancellationToken);

        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<PaymentDto>> HoldPaymentAsync(UserContext userContext, Guid paymentId, CancellationToken cancellationToken)
    {
        if (!userContext.CanManagePayments)
        {
            return OperationResult<PaymentDto>.Failure("You do not have permission to hold payments.");
        }

        var payment = await DbContext.Payments.SingleOrDefaultAsync(x => x.Id == paymentId, cancellationToken);
        if (payment is null)
        {
            return OperationResult<PaymentDto>.Failure("Payment not found.");
        }

        payment.Status = PaymentStatus.Held;
        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<PaymentDto>.Success(await LoadPaymentDtoAsync(payment.Id, cancellationToken));
    }

    public async Task<OperationResult<PaymentDto>> ProcessPaymentAsync(UserContext userContext, Guid paymentId, CancellationToken cancellationToken)
    {
        if (!userContext.CanManagePayments)
        {
            return OperationResult<PaymentDto>.Failure("You do not have permission to process held payments.");
        }

        var payment = await DbContext.Payments.SingleOrDefaultAsync(x => x.Id == paymentId, cancellationToken);
        if (payment is null)
        {
            return OperationResult<PaymentDto>.Failure("Payment not found.");
        }

        payment.Status = PaymentStatus.Processed;
        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<PaymentDto>.Success(await LoadPaymentDtoAsync(payment.Id, cancellationToken));
    }

    private async Task RecalculateBookingFinancialsAsync(Guid bookingId, CancellationToken cancellationToken)
    {
        var booking = await DbContext.Bookings
            .Include(x => x.Payments)
            .SingleAsync(x => x.Id == bookingId, cancellationToken);

        var processedPayments = booking.Payments.Where(x => x.Status == PaymentStatus.Processed).ToList();
        var totalPaid = processedPayments.Sum(x => x.TotalAmount);
        booking.DepositAmount = processedPayments.Where(x => x.IsDeposit).Sum(x => x.TotalAmount);
        booking.BalanceAmount = Math.Max(0, booking.TotalAmount - totalPaid);
        if (booking.BalanceAmount == 0 && booking.Status == BookingStatus.Pending)
        {
            booking.Status = BookingStatus.Confirmed;
        }

        await DbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<PaymentDto> LoadPaymentDtoAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await DbContext.Payments
            .Include(x => x.Booking)
            .ThenInclude(x => x!.Customer)
            .Include(x => x.Office)
            .Include(x => x.CreatedByUser)
            .AsNoTracking()
            .SingleAsync(x => x.Id == paymentId, cancellationToken);

        return MapPayment(payment);
    }

    private static string NormalizeCurrency(string currency, string fallback) =>
        string.IsNullOrWhiteSpace(currency) ? fallback : currency.Trim().ToUpperInvariant();

    private static string NormalizeReference(string? reference, PaymentMethod method, string? existingReference = null)
    {
        if (!string.IsNullOrWhiteSpace(reference))
        {
            return reference.Trim().ToUpperInvariant();
        }

        return string.IsNullOrWhiteSpace(existingReference)
            ? FinancialRules.GenerateReference(method == PaymentMethod.Paynow ? "PYN" : "PAY")
            : existingReference;
    }

    private static PaymentStatus? ParsePaymentStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return PaymentStatus.Processed;
        }

        return Enum.TryParse<PaymentStatus>(value, true, out var status) ? status : null;
    }

    private static PaymentDto MapPayment(Payment payment) =>
        new(
            payment.Id,
            payment.BookingId,
            payment.Booking?.Reference ?? string.Empty,
            payment.OfficeId,
            payment.Office?.Name ?? string.Empty,
            payment.Amount,
            payment.Currency,
            payment.Method.ToString(),
            payment.Status.ToString(),
            payment.IsDeposit,
            payment.TaxAmount,
            payment.VatAmount,
            payment.TotalAmount,
            payment.Reference,
            payment.FiscalInvoiceNumber,
            payment.PaidAtUtc,
            payment.CreatedByUser?.Username ?? string.Empty);
}

internal sealed class AgentService(FleetCarDbContext dbContext) : ServiceBase(dbContext), IAgentService
{
    public async Task<IReadOnlyList<AgentDto>> GetAgentsAsync(UserContext userContext, CancellationToken cancellationToken)
    {
        var agents = await DbContext.Agents
            .Include(x => x.PreferredOffice)
            .AsNoTracking()
            .Where(x => userContext.IsAdmin || x.PreferredOfficeId == userContext.OfficeId)
            .OrderBy(x => x.CompanyName)
            .ToListAsync(cancellationToken);

        return agents.Select(MapAgent).ToList();
    }

    public async Task<OperationResult<AgentDto>> CreateAgentAsync(UserContext userContext, CreateAgentRequest request, CancellationToken cancellationToken)
    {
        if (!IsOfficeAllowed(userContext, request.PreferredOfficeId))
        {
            return OperationResult<AgentDto>.Failure("You cannot create agents for another office.");
        }

        if (!await ValidateAgentRequestAsync(request.PreferredOfficeId, request.Code, null, cancellationToken))
        {
            return OperationResult<AgentDto>.Failure("Agent details are invalid.");
        }

        var agent = new Agent
        {
            PreferredOfficeId = request.PreferredOfficeId,
            Code = request.Code.Trim().ToUpperInvariant(),
            CompanyName = request.CompanyName.Trim(),
            CommissionRate = request.CommissionRate,
            CreditLimit = request.CreditLimit,
            Email = request.Email.Trim(),
            Phone = request.Phone.Trim()
        };

        DbContext.Agents.Add(agent);
        await DbContext.SaveChangesAsync(cancellationToken);

        return OperationResult<AgentDto>.Success(await LoadAgentDtoAsync(agent.Id, cancellationToken));
    }

    public async Task<OperationResult<AgentDto>> UpdateAgentAsync(UserContext userContext, Guid agentId, UpdateAgentRequest request, CancellationToken cancellationToken)
    {
        var agent = await DbContext.Agents.SingleOrDefaultAsync(x => x.Id == agentId, cancellationToken);
        if (agent is null)
        {
            return OperationResult<AgentDto>.Failure("Agent not found.");
        }

        if (!IsOfficeAllowed(userContext, agent.PreferredOfficeId) || !IsOfficeAllowed(userContext, request.PreferredOfficeId))
        {
            return OperationResult<AgentDto>.Failure("You cannot update agents for another office.");
        }

        if (!await ValidateAgentRequestAsync(request.PreferredOfficeId, request.Code, agentId, cancellationToken))
        {
            return OperationResult<AgentDto>.Failure("Agent details are invalid.");
        }

        agent.PreferredOfficeId = request.PreferredOfficeId;
        agent.Code = request.Code.Trim().ToUpperInvariant();
        agent.CompanyName = request.CompanyName.Trim();
        agent.CommissionRate = request.CommissionRate;
        agent.CreditLimit = request.CreditLimit;
        agent.Email = request.Email.Trim();
        agent.Phone = request.Phone.Trim();

        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<AgentDto>.Success(await LoadAgentDtoAsync(agent.Id, cancellationToken));
    }

    public async Task<OperationResult<bool>> DeleteAgentAsync(UserContext userContext, Guid agentId, CancellationToken cancellationToken)
    {
        var agent = await DbContext.Agents
            .Include(x => x.Bookings)
            .SingleOrDefaultAsync(x => x.Id == agentId, cancellationToken);

        if (agent is null)
        {
            return OperationResult<bool>.Failure("Agent not found.");
        }

        if (!IsOfficeAllowed(userContext, agent.PreferredOfficeId))
        {
            return OperationResult<bool>.Failure("You cannot delete agents for another office.");
        }

        if (agent.Bookings.Count != 0)
        {
            return OperationResult<bool>.Failure("Agent cannot be deleted because it is linked to bookings.");
        }

        DbContext.Agents.Remove(agent);
        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    private async Task<bool> ValidateAgentRequestAsync(Guid officeId, string code, Guid? agentId, CancellationToken cancellationToken)
    {
        var officeExists = await DbContext.Offices.AnyAsync(x => x.Id == officeId, cancellationToken);
        if (!officeExists)
        {
            return false;
        }

        var normalizedCode = code.Trim().ToUpperInvariant();
        return !await DbContext.Agents.AnyAsync(
            x => x.Code == normalizedCode && (agentId == null || x.Id != agentId.Value),
            cancellationToken);
    }

    private async Task<AgentDto> LoadAgentDtoAsync(Guid agentId, CancellationToken cancellationToken)
    {
        var agent = await DbContext.Agents
            .Include(x => x.PreferredOffice)
            .AsNoTracking()
            .SingleAsync(x => x.Id == agentId, cancellationToken);

        return MapAgent(agent);
    }

    private static AgentDto MapAgent(Agent agent) =>
        new(
            agent.Id,
            agent.Code,
            agent.CompanyName,
            agent.CommissionRate,
            agent.CreditLimit,
            agent.Email,
            agent.Phone,
            agent.PreferredOfficeId,
            agent.PreferredOffice?.Name ?? string.Empty);
}

internal sealed class ReportService(FleetCarDbContext dbContext) : ServiceBase(dbContext), IReportService
{
    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken)
    {
        if (!userContext.CanViewReports)
        {
            return new DashboardSummaryDto(0, 0, 0, 0, 0, 0, 0);
        }

        var effectiveOfficeId = ResolveOfficeId(userContext, officeId);
        var totalRevenue = await DbContext.Payments
            .Where(x => x.Status == PaymentStatus.Processed)
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .SumAsync(x => (decimal?)x.TotalAmount, cancellationToken) ?? 0m;

        var activeBookings = await DbContext.Bookings
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .CountAsync(x => x.Status == BookingStatus.Active, cancellationToken);

        var availableCars = await DbContext.Cars
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .CountAsync(x => x.Status == CarStatus.Available, cancellationToken);

        var carsInMaintenance = await DbContext.Cars
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .CountAsync(x => x.Status == CarStatus.Maintenance, cancellationToken);

        var pendingReturns = await DbContext.Bookings
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .CountAsync(x => x.Status == BookingStatus.Active && x.ReturnDateUtc <= DateTime.UtcNow.AddDays(1), cancellationToken);

        var activeAgents = await DbContext.Bookings
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .Where(x => x.AgentId != null)
            .Select(x => x.AgentId)
            .Distinct()
            .CountAsync(cancellationToken);

        var outstandingBalances = await DbContext.Bookings
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .Where(x => x.Status != BookingStatus.Cancelled)
            .SumAsync(x => (decimal?)x.BalanceAmount, cancellationToken) ?? 0m;

        return new DashboardSummaryDto(totalRevenue, activeBookings, availableCars, carsInMaintenance, pendingReturns, activeAgents, outstandingBalances);
    }

    public async Task<IReadOnlyList<RevenueBreakdownDto>> GetRevenueReportAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken)
    {
        if (!userContext.CanViewReports)
        {
            return [];
        }

        var effectiveOfficeId = ResolveOfficeId(userContext, officeId);
        return await DbContext.Payments
            .Include(x => x.Office)
            .Where(x => x.Status == PaymentStatus.Processed)
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .GroupBy(x => x.Office!.Name)
            .Select(group => new RevenueBreakdownDto(group.Key, group.Sum(x => x.TotalAmount), group.Count()))
            .OrderByDescending(x => x.Revenue)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UtilizationReportDto>> GetUtilizationReportAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken)
    {
        if (!userContext.CanViewReports)
        {
            return [];
        }

        var effectiveOfficeId = ResolveOfficeId(userContext, officeId);
        var offices = await DbContext.Offices
            .Include(x => x.Cars)
            .AsNoTracking()
            .Where(x => effectiveOfficeId == null || x.Id == effectiveOfficeId)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return offices.Select(office =>
        {
            var totalCars = office.Cars.Count;
            var rentedCars = office.Cars.Count(x => x.Status == CarStatus.Rented);
            var reservedCars = office.Cars.Count(x => x.Status == CarStatus.Reserved);
            var utilizationPercent = totalCars == 0 ? 0d : Math.Round(((double)(rentedCars + reservedCars) / totalCars) * 100d, 1);
            return new UtilizationReportDto(office.Name, totalCars, rentedCars, reservedCars, utilizationPercent);
        }).ToList();
    }

    public async Task<IReadOnlyList<AgentCommissionReportDto>> GetAgentCommissionReportAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken)
    {
        if (!userContext.CanViewReports)
        {
            return [];
        }

        var effectiveOfficeId = ResolveOfficeId(userContext, officeId);
        return await DbContext.Bookings
            .Include(x => x.Agent)
            .Where(x => x.AgentId != null)
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .GroupBy(x => new { x.Agent!.Code, x.Agent.CompanyName, x.Agent.CommissionRate })
            .Select(group => new AgentCommissionReportDto(
                group.Key.Code,
                group.Key.CompanyName,
                group.Count(),
                group.Sum(x => x.TotalAmount),
                group.Sum(x => x.TotalAmount) * (group.Key.CommissionRate / 100m)))
            .OrderByDescending(x => x.CommissionAmount)
            .ToListAsync(cancellationToken);
    }
}
