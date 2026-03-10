using FleetCar.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public sealed class ReportsController(IReportService reportService) : FleetCarControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardSummaryDto>> Dashboard([FromQuery] Guid? officeId, CancellationToken cancellationToken) =>
        Ok(await reportService.GetDashboardSummaryAsync(CurrentUser, officeId, cancellationToken));

    [HttpGet("revenue")]
    public async Task<ActionResult<IReadOnlyList<RevenueBreakdownDto>>> Revenue([FromQuery] Guid? officeId, CancellationToken cancellationToken) =>
        Ok(await reportService.GetRevenueReportAsync(CurrentUser, officeId, cancellationToken));

    [HttpGet("utilization")]
    public async Task<ActionResult<IReadOnlyList<UtilizationReportDto>>> Utilization([FromQuery] Guid? officeId, CancellationToken cancellationToken) =>
        Ok(await reportService.GetUtilizationReportAsync(CurrentUser, officeId, cancellationToken));

    [HttpGet("agent-commissions")]
    public async Task<ActionResult<IReadOnlyList<AgentCommissionReportDto>>> AgentCommissions([FromQuery] Guid? officeId, CancellationToken cancellationToken) =>
        Ok(await reportService.GetAgentCommissionReportAsync(CurrentUser, officeId, cancellationToken));
}
