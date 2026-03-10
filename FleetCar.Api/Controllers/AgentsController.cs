using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class AgentsController(IAgentService agentService) : FleetCarControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AgentDto>>> Get(CancellationToken cancellationToken) =>
        Ok(await agentService.GetAgentsAsync(CurrentUser, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<AgentDto>> Create([FromBody] CreateAgentRequest request, CancellationToken cancellationToken)
    {
        var result = await agentService.CreateAgentAsync(CurrentUser, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Agent could not be created.");
        }

        return CreatedAtAction(nameof(Get), new { id = result.Value.Id }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AgentDto>> Update(Guid id, [FromBody] UpdateAgentRequest request, CancellationToken cancellationToken)
    {
        var result = await agentService.UpdateAgentAsync(CurrentUser, id, request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestError(result.Error ?? "Agent could not be updated.");
        }

        return Ok(result.Value);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await agentService.DeleteAgentAsync(CurrentUser, id, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequestError(result.Error ?? "Agent could not be deleted.");
        }

        return NoContent();
    }
}
