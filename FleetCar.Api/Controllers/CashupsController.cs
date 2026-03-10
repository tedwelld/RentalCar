using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class CashupsController(ICashupService cashupService) : FleetCarControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CashupDto>>> Get([FromQuery] Guid? officeId, CancellationToken cancellationToken) =>
        Ok(await cashupService.GetCashupsAsync(CurrentUser, officeId, cancellationToken));

    [HttpPost("open")]
    public async Task<ActionResult<CashupDto>> Open([FromBody] OpenCashupRequest request, CancellationToken cancellationToken)
    {
        var result = await cashupService.OpenCashupAsync(CurrentUser, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Cashup could not be opened.");
        }

        return Ok(result.Value);
    }

    [HttpPost("{id:guid}/close")]
    public async Task<ActionResult<CashupDto>> Close(Guid id, [FromBody] CloseCashupRequest request, CancellationToken cancellationToken)
    {
        var result = await cashupService.CloseCashupAsync(CurrentUser, id, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Cashup could not be closed.");
        }

        return Ok(result.Value);
    }
}
