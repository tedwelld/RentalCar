using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class OfficesController(IOfficeService officeService) : FleetCarControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OfficeDto>>> Get(CancellationToken cancellationToken) =>
        Ok(await officeService.GetOfficesAsync(CurrentUser, cancellationToken));
}
