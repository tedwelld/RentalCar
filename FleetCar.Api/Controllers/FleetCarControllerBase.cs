using FleetCar.Api.Extensions;
using FleetCar.Core;
using Microsoft.AspNetCore.Mvc;

namespace FleetCar.Api.Controllers;

[ApiController]
public abstract class FleetCarControllerBase : ControllerBase
{
    protected UserContext CurrentUser => User.ToUserContext();

    protected static ActionResult BadRequestError(string message) =>
        new BadRequestObjectResult(new { error = message });
}
