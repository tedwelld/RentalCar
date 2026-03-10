using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class DocumentsController(IDocumentService documentService) : FleetCarControllerBase
{
    [HttpGet("quotation/{bookingId:guid}")]
    public async Task<ActionResult<PrintableDocumentDto>> GetQuotation(Guid bookingId, CancellationToken cancellationToken)
    {
        var result = await documentService.GetQuotationAsync(CurrentUser, bookingId, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Quotation could not be generated.");
        }

        return Ok(result.Value);
    }

    [HttpGet("receipt/{paymentId:guid}")]
    public async Task<ActionResult<PrintableDocumentDto>> GetReceipt(Guid paymentId, CancellationToken cancellationToken)
    {
        var result = await documentService.GetReceiptAsync(CurrentUser, paymentId, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Receipt could not be generated.");
        }

        return Ok(result.Value);
    }

    [HttpGet("credit-note/{creditNoteId:guid}")]
    public async Task<ActionResult<PrintableDocumentDto>> GetCreditNote(Guid creditNoteId, CancellationToken cancellationToken)
    {
        var result = await documentService.GetCreditNoteDocumentAsync(CurrentUser, creditNoteId, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Credit note could not be generated.");
        }

        return Ok(result.Value);
    }
}
