using FleetCar.Core;
using Microsoft.EntityFrameworkCore;

namespace FleetCar.Data;

internal sealed class CreditNoteService(FleetCarDbContext dbContext) : ServiceBase(dbContext), ICreditNoteService
{
    public async Task<IReadOnlyList<CreditNoteDto>> GetCreditNotesAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken)
    {
        var effectiveOfficeId = ResolveOfficeId(userContext, officeId);
        var notes = await DbContext.CreditNotes
            .Include(x => x.Booking)
            .Include(x => x.Office)
            .Include(x => x.CreatedByUser)
            .AsNoTracking()
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId)
            .OrderByDescending(x => x.IssuedAtUtc)
            .ToListAsync(cancellationToken);

        return notes.Select(MapCreditNote).ToList();
    }

    public async Task<OperationResult<CreditNoteDto>> CreateCreditNoteAsync(UserContext userContext, CreateCreditNoteRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanManagePayments)
        {
            return OperationResult<CreditNoteDto>.Failure("You do not have permission to create credit notes.");
        }

        var booking = await DbContext.Bookings
            .Include(x => x.Office)
            .SingleOrDefaultAsync(x => x.Id == request.BookingId, cancellationToken);

        if (booking is null)
        {
            return OperationResult<CreditNoteDto>.Failure("Booking not found.");
        }

        if (!IsOfficeAllowed(userContext, booking.OfficeId))
        {
            return OperationResult<CreditNoteDto>.Failure("You cannot create a credit note for another office.");
        }

        var note = new CreditNote
        {
            BookingId = booking.Id,
            OfficeId = booking.OfficeId,
            CreatedByUserId = userContext.UserId,
            Reference = FinancialRules.GenerateReference("CRN"),
            Reason = request.Reason.Trim(),
            Amount = request.Amount,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? booking.Currency : request.Currency.Trim().ToUpperInvariant(),
            Status = CreditNoteStatus.Issued,
            IssuedAtUtc = DateTime.UtcNow
        };

        DbContext.CreditNotes.Add(note);
        await DbContext.SaveChangesAsync(cancellationToken);

        return OperationResult<CreditNoteDto>.Success(await LoadCreditNoteDtoAsync(note.Id, cancellationToken));
    }

    private async Task<CreditNoteDto> LoadCreditNoteDtoAsync(Guid id, CancellationToken cancellationToken)
    {
        var note = await DbContext.CreditNotes
            .Include(x => x.Booking)
            .Include(x => x.Office)
            .Include(x => x.CreatedByUser)
            .AsNoTracking()
            .SingleAsync(x => x.Id == id, cancellationToken);

        return MapCreditNote(note);
    }

    private static CreditNoteDto MapCreditNote(CreditNote note) =>
        new(
            note.Id,
            note.BookingId,
            note.Booking?.Reference ?? string.Empty,
            note.OfficeId,
            note.Office?.Name ?? string.Empty,
            note.Reference,
            note.Reason,
            note.Amount,
            note.Currency,
            note.Status.ToString(),
            note.IssuedAtUtc,
            note.CreatedByUser?.Username ?? string.Empty);
}

internal sealed class CashupService(FleetCarDbContext dbContext) : ServiceBase(dbContext), ICashupService
{
    public async Task<IReadOnlyList<CashupDto>> GetCashupsAsync(UserContext userContext, Guid? officeId, CancellationToken cancellationToken)
    {
        if (!userContext.CanUseCashup)
        {
            return [];
        }

        var effectiveOfficeId = ResolveOfficeId(userContext, officeId);
        var query = DbContext.CashSessions
            .Include(x => x.Office)
            .Include(x => x.User)
            .Include(x => x.ClosedByUser)
            .AsNoTracking()
            .Where(x => effectiveOfficeId == null || x.OfficeId == effectiveOfficeId);

        if (!userContext.IsAdmin && !userContext.IsManagerLike && userContext.Role != UserRole.FinanceManager)
        {
            query = query.Where(x => x.UserId == userContext.UserId);
        }

        var sessions = await query
            .OrderByDescending(x => x.SessionDateUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return await MapCashupsAsync(sessions, cancellationToken);
    }

    public async Task<OperationResult<CashupDto>> OpenCashupAsync(UserContext userContext, OpenCashupRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanUseCashup)
        {
            return OperationResult<CashupDto>.Failure("You do not have permission to open cashups.");
        }

        if (!IsOfficeAllowed(userContext, request.OfficeId))
        {
            return OperationResult<CashupDto>.Failure("You cannot open a cashup for another office.");
        }

        var sessionDate = DateTime.UtcNow.Date;
        var existing = await DbContext.CashSessions.AnyAsync(
            x => x.OfficeId == request.OfficeId &&
                 x.UserId == userContext.UserId &&
                 x.SessionDateUtc == sessionDate &&
                 x.Status == CashSessionStatus.Open,
            cancellationToken);

        if (existing)
        {
            return OperationResult<CashupDto>.Failure("You already have an open cashup for today.");
        }

        var cashup = new CashSession
        {
            OfficeId = request.OfficeId,
            UserId = userContext.UserId,
            SessionDateUtc = sessionDate,
            OpeningBalance = request.OpeningBalance,
            ClosingBalance = request.OpeningBalance,
            Status = CashSessionStatus.Open
        };

        DbContext.CashSessions.Add(cashup);
        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<CashupDto>.Success(await LoadCashupDtoAsync(cashup.Id, cancellationToken));
    }

    public async Task<OperationResult<CashupDto>> CloseCashupAsync(UserContext userContext, Guid cashupId, CloseCashupRequest request, CancellationToken cancellationToken)
    {
        if (!userContext.CanUseCashup)
        {
            return OperationResult<CashupDto>.Failure("You do not have permission to close cashups.");
        }

        var cashup = await DbContext.CashSessions.SingleOrDefaultAsync(x => x.Id == cashupId, cancellationToken);
        if (cashup is null)
        {
            return OperationResult<CashupDto>.Failure("Cashup not found.");
        }

        var canClose = userContext.IsAdmin || userContext.IsManagerLike || userContext.Role == UserRole.FinanceManager || cashup.UserId == userContext.UserId;
        if (!canClose || !IsOfficeAllowed(userContext, cashup.OfficeId))
        {
            return OperationResult<CashupDto>.Failure("You cannot close this cashup.");
        }

        cashup.ClosingBalance = request.ClosingBalance;
        cashup.ClosedAtUtc = DateTime.UtcNow;
        cashup.ClosedByUserId = userContext.UserId;
        cashup.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        cashup.Status = CashSessionStatus.Closed;

        await DbContext.SaveChangesAsync(cancellationToken);
        return OperationResult<CashupDto>.Success(await LoadCashupDtoAsync(cashup.Id, cancellationToken));
    }

    private async Task<IReadOnlyList<CashupDto>> MapCashupsAsync(IReadOnlyList<CashSession> sessions, CancellationToken cancellationToken)
    {
        if (sessions.Count == 0)
        {
            return [];
        }

        var result = new List<CashupDto>(sessions.Count);
        foreach (var session in sessions)
        {
            result.Add(await MapCashupAsync(session, cancellationToken));
        }

        return result;
    }

    private async Task<CashupDto> LoadCashupDtoAsync(Guid id, CancellationToken cancellationToken)
    {
        var session = await DbContext.CashSessions
            .Include(x => x.Office)
            .Include(x => x.User)
            .Include(x => x.ClosedByUser)
            .SingleAsync(x => x.Id == id, cancellationToken);

        return await MapCashupAsync(session, cancellationToken);
    }

    private async Task<CashupDto> MapCashupAsync(CashSession session, CancellationToken cancellationToken)
    {
        var nextDay = session.SessionDateUtc.AddDays(1);
        var processedPayments = await DbContext.Payments
            .Where(x => x.OfficeId == session.OfficeId)
            .Where(x => x.CreatedByUserId == session.UserId)
            .Where(x => x.PaidAtUtc >= session.SessionDateUtc && x.PaidAtUtc < nextDay)
            .Where(x => x.Status == PaymentStatus.Processed)
            .ToListAsync(cancellationToken);

        var creditNotes = await DbContext.CreditNotes
            .Where(x => x.OfficeId == session.OfficeId)
            .Where(x => x.CreatedByUserId == session.UserId)
            .Where(x => x.IssuedAtUtc >= session.SessionDateUtc && x.IssuedAtUtc < nextDay)
            .ToListAsync(cancellationToken);

        return new CashupDto(
            session.Id,
            session.OfficeId,
            session.Office?.Name ?? string.Empty,
            session.UserId,
            session.User?.Username ?? string.Empty,
            session.ClosedByUser?.Username,
            session.SessionDateUtc,
            session.OpeningBalance,
            session.ClosingBalance,
            processedPayments.Sum(x => x.TotalAmount),
            processedPayments.Where(x => x.IsDeposit).Sum(x => x.TotalAmount),
            creditNotes.Sum(x => x.Amount),
            processedPayments.Count,
            session.Status.ToString(),
            session.ClosedAtUtc,
            session.Notes);
    }
}

internal sealed class DocumentService(FleetCarDbContext dbContext) : ServiceBase(dbContext), IDocumentService
{
    public async Task<OperationResult<PrintableDocumentDto>> GetQuotationAsync(UserContext userContext, Guid bookingId, CancellationToken cancellationToken)
    {
        var booking = await DbContext.Bookings
            .Include(x => x.Office)
            .Include(x => x.Customer)
            .Include(x => x.Car)
            .Include(x => x.Extras)
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == bookingId, cancellationToken);

        if (booking is null || booking.Customer is null || booking.Car is null)
        {
            return OperationResult<PrintableDocumentDto>.Failure("Booking not found.");
        }

        if (!IsOfficeAllowed(userContext, booking.OfficeId))
        {
            return OperationResult<PrintableDocumentDto>.Failure("You cannot view quotation data for another office.");
        }

        var subtotal = CalculateBookingSubtotal(booking);
        var (taxAmount, vatAmount, totalAmount) = FinancialRules.CalculateTotals(subtotal, booking.Customer.IsInternational);

        return OperationResult<PrintableDocumentDto>.Success(
            BuildDocument(
                "Quotation",
                $"QTN-{booking.Reference}",
                booking.Office?.Name ?? string.Empty,
                booking.Customer,
                booking.Currency,
                userContext.Username,
                DateTime.UtcNow,
                subtotal,
                taxAmount,
                vatAmount,
                totalAmount,
                booking.Notes ?? string.Empty,
                BuildBookingLines(booking)));
    }

    public async Task<OperationResult<PrintableDocumentDto>> GetReceiptAsync(UserContext userContext, Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await DbContext.Payments
            .Include(x => x.Office)
            .Include(x => x.Booking)
            .ThenInclude(x => x!.Customer)
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == paymentId, cancellationToken);

        if (payment is null || payment.Booking is null || payment.Booking.Customer is null)
        {
            return OperationResult<PrintableDocumentDto>.Failure("Payment not found.");
        }

        if (!IsOfficeAllowed(userContext, payment.OfficeId))
        {
            return OperationResult<PrintableDocumentDto>.Failure("You cannot view receipt data for another office.");
        }

        return OperationResult<PrintableDocumentDto>.Success(
            BuildDocument(
                "Receipt",
                payment.Reference,
                payment.Office?.Name ?? string.Empty,
                payment.Booking.Customer,
                payment.Currency,
                userContext.Username,
                payment.PaidAtUtc,
                payment.Amount,
                payment.TaxAmount,
                payment.VatAmount,
                payment.TotalAmount,
                $"{payment.Method} payment for booking {payment.Booking.Reference}",
                [new DocumentLineDto($"{(payment.IsDeposit ? "Deposit" : "Balance")} payment", 1, payment.Amount, payment.Amount)]));
    }

    public async Task<OperationResult<PrintableDocumentDto>> GetCreditNoteDocumentAsync(UserContext userContext, Guid creditNoteId, CancellationToken cancellationToken)
    {
        var note = await DbContext.CreditNotes
            .Include(x => x.Office)
            .Include(x => x.Booking)
            .ThenInclude(x => x!.Customer)
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == creditNoteId, cancellationToken);

        if (note is null || note.Booking is null || note.Booking.Customer is null)
        {
            return OperationResult<PrintableDocumentDto>.Failure("Credit note not found.");
        }

        if (!IsOfficeAllowed(userContext, note.OfficeId))
        {
            return OperationResult<PrintableDocumentDto>.Failure("You cannot view credit note data for another office.");
        }

        return OperationResult<PrintableDocumentDto>.Success(
            BuildDocument(
                "Credit Note",
                note.Reference,
                note.Office?.Name ?? string.Empty,
                note.Booking.Customer,
                note.Currency,
                userContext.Username,
                note.IssuedAtUtc,
                note.Amount,
                0m,
                0m,
                note.Amount,
                note.Reason,
                [new DocumentLineDto("Credit note adjustment", 1, note.Amount, note.Amount)]));
    }

    private static decimal CalculateBookingSubtotal(Booking booking)
    {
        var rentalDays = Math.Max(1, (int)Math.Ceiling((booking.ReturnDateUtc - booking.PickupDateUtc).TotalDays));
        return (rentalDays * booking.DailyRate) + booking.Extras.Sum(x => x.Price);
    }

    private static IReadOnlyList<DocumentLineDto> BuildBookingLines(Booking booking)
    {
        var rentalDays = Math.Max(1, (int)Math.Ceiling((booking.ReturnDateUtc - booking.PickupDateUtc).TotalDays));
        var lines = new List<DocumentLineDto>
        {
            new($"{booking.Car!.Make} {booking.Car.Model} rental", rentalDays, booking.DailyRate, rentalDays * booking.DailyRate)
        };

        lines.AddRange(booking.Extras.Select(x => new DocumentLineDto(x.Name, 1, x.Price, x.Price)));
        return lines;
    }

    private static PrintableDocumentDto BuildDocument(
        string documentType,
        string documentNumber,
        string officeName,
        Customer customer,
        string currency,
        string generatedByUsername,
        DateTime issuedAtUtc,
        decimal subtotal,
        decimal taxAmount,
        decimal vatAmount,
        decimal totalAmount,
        string notes,
        IReadOnlyList<DocumentLineDto> lines) =>
        new(
            documentType,
            documentNumber,
            officeName,
            $"{customer.FirstName} {customer.LastName}",
            customer.Email,
            customer.Phone,
            customer.Country,
            currency,
            generatedByUsername,
            issuedAtUtc,
            subtotal,
            taxAmount,
            vatAmount,
            totalAmount,
            notes,
            lines);
}
