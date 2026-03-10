using FleetCar.Core;
using Microsoft.Extensions.DependencyInjection;

namespace FleetCar.Data;

public static class DependencyInjection
{
    public static IServiceCollection AddFleetCarData(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOfficeService, OfficeService>();
        services.AddScoped<IFleetService, FleetService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IAgentService, AgentService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<ICreditNoteService, CreditNoteService>();
        services.AddScoped<ICashupService, CashupService>();
        services.AddScoped<IDocumentService, DocumentService>();
        services.AddScoped<IDbSeeder, DbSeeder>();
        return services;
    }
}
