using System.Security.Claims;
using FleetCar.Core;

namespace FleetCar.Api.Extensions;

internal static class ClaimsPrincipalExtensions
{
    public static UserContext ToUserContext(this ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var username = principal.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        var role = principal.FindFirstValue(ClaimTypes.Role);
        var officeId = principal.FindFirst("officeId")?.Value;

        if (!Guid.TryParse(userId, out var parsedUserId) || !Enum.TryParse<UserRole>(role, true, out var parsedRole))
        {
            throw new UnauthorizedAccessException("User claims are invalid.");
        }

        return new UserContext
        {
            UserId = parsedUserId,
            Username = username,
            Role = parsedRole,
            OfficeId = Guid.TryParse(officeId, out var parsedOfficeId) ? parsedOfficeId : null
        };
    }
}
