using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class CreditNotesController(ICreditNoteService creditNoteService) : FleetCarControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CreditNoteDto>>> Get([FromQuery] Guid? officeId, CancellationToken cancellationToken) =>
        Ok(await creditNoteService.GetCreditNotesAsync(CurrentUser, officeId, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<CreditNoteDto>> Create([FromBody] CreateCreditNoteRequest request, CancellationToken cancellationToken)
    {
        var result = await creditNoteService.CreateCreditNoteAsync(CurrentUser, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Credit note could not be created.");
        }

        return Ok(result.Value);
    }
}
