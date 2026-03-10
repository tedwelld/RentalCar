using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class CustomersController(ICustomerService customerService) : FleetCarControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CustomerDto>>> Get(CancellationToken cancellationToken) =>
        Ok(await customerService.GetCustomersAsync(CurrentUser, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create([FromBody] CreateCustomerRequest request, CancellationToken cancellationToken)
    {
        var result = await customerService.CreateCustomerAsync(CurrentUser, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Customer could not be created.");
        }

        return Ok(result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> Update(Guid id, [FromBody] UpdateCustomerRequest request, CancellationToken cancellationToken)
    {
        var result = await customerService.UpdateCustomerAsync(CurrentUser, id, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Customer could not be updated.");
        }

        return Ok(result.Value);
    }

    [HttpPost("{id:guid}/activate")]
    public async Task<ActionResult<CustomerDto>> Activate(Guid id, CancellationToken cancellationToken)
    {
        var result = await customerService.SetCustomerActiveStateAsync(CurrentUser, id, true, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Customer could not be activated.");
        }

        return Ok(result.Value);
    }

    [HttpPost("{id:guid}/disable")]
    public async Task<ActionResult<CustomerDto>> Disable(Guid id, CancellationToken cancellationToken)
    {
        var result = await customerService.SetCustomerActiveStateAsync(CurrentUser, id, false, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Customer could not be disabled.");
        }

        return Ok(result.Value);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await customerService.DeleteCustomerAsync(CurrentUser, id, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequestError(result.Error ?? "Customer could not be deleted.");
        }

        return NoContent();
    }
}
