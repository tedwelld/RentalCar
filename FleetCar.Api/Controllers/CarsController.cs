using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class CarsController(IFleetService fleetService) : FleetCarControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CarDto>>> Get([FromQuery] Guid? officeId, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        CarStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<CarStatus>(status, true, out var enumValue))
            {
                return BadRequestError("Invalid car status.");
            }

            parsedStatus = enumValue;
        }

        return Ok(await fleetService.GetCarsAsync(CurrentUser, officeId, parsedStatus, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<CarDto>> Create([FromBody] CreateCarRequest request, CancellationToken cancellationToken)
    {
        var result = await fleetService.CreateCarAsync(CurrentUser, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Vehicle could not be created.");
        }

        return CreatedAtAction(nameof(Get), new { id = result.Value.Id }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CarDto>> Update(Guid id, [FromBody] UpdateCarRequest request, CancellationToken cancellationToken)
    {
        var result = await fleetService.UpdateCarAsync(CurrentUser, id, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Vehicle could not be updated.");
        }

        return Ok(result.Value);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await fleetService.DeleteCarAsync(CurrentUser, id, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequestError(result.Error ?? "Vehicle could not be deleted.");
        }

        return NoContent();
    }
}
