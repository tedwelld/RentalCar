using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class PaymentsController(IPaymentService paymentService) : FleetCarControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> Get([FromQuery] Guid? officeId, CancellationToken cancellationToken) =>
        Ok(await paymentService.GetPaymentsAsync(CurrentUser, officeId, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<PaymentDto>> Create([FromBody] CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        var result = await paymentService.CreatePaymentAsync(CurrentUser, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Payment could not be created.");
        }

        return CreatedAtAction(nameof(Get), new { id = result.Value.Id }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PaymentDto>> Update(Guid id, [FromBody] UpdatePaymentRequest request, CancellationToken cancellationToken)
    {
        var result = await paymentService.UpdatePaymentAsync(CurrentUser, id, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Payment could not be updated.");
        }

        return Ok(result.Value);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await paymentService.DeletePaymentAsync(CurrentUser, id, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequestError(result.Error ?? "Payment could not be deleted.");
        }

        return NoContent();
    }

    [HttpPost("{id:guid}/hold")]
    public async Task<ActionResult<PaymentDto>> Hold(Guid id, CancellationToken cancellationToken)
    {
        var result = await paymentService.HoldPaymentAsync(CurrentUser, id, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Payment could not be held.");
        }

        return Ok(result.Value);
    }

    [HttpPost("{id:guid}/process")]
    public async Task<ActionResult<PaymentDto>> Process(Guid id, CancellationToken cancellationToken)
    {
        var result = await paymentService.ProcessPaymentAsync(CurrentUser, id, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Payment could not be processed.");
        }

        return Ok(result.Value);
    }
}
