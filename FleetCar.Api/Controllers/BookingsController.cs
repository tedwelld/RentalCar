using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class BookingsController(IBookingService bookingService) : FleetCarControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BookingDto>>> Get([FromQuery] Guid? officeId, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        BookingStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<BookingStatus>(status, true, out var enumValue))
            {
                return BadRequestError("Invalid booking status.");
            }

            parsedStatus = enumValue;
        }

        return Ok(await bookingService.GetBookingsAsync(CurrentUser, officeId, parsedStatus, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<BookingDto>> Create([FromBody] CreateBookingRequest request, CancellationToken cancellationToken)
    {
        var result = await bookingService.CreateBookingAsync(CurrentUser, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Booking could not be created.");
        }

        return CreatedAtAction(nameof(Get), new { id = result.Value.Id }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BookingDto>> Update(Guid id, [FromBody] UpdateBookingRequest request, CancellationToken cancellationToken)
    {
        var result = await bookingService.UpdateBookingAsync(CurrentUser, id, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Booking could not be updated.");
        }

        return Ok(result.Value);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await bookingService.DeleteBookingAsync(CurrentUser, id, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequestError(result.Error ?? "Booking could not be deleted.");
        }

        return NoContent();
    }
}
