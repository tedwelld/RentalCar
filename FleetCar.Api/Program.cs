using System.Text;
using FleetCar.Core;
using FleetCar.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "FleetCar API",
        Version = "v1",
        Description = "Multi-office car rental management API for FleetCar."
    });

    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference
        {
            Id = "Bearer",
            Type = ReferenceType.SecurityScheme
        }
    };

    options.AddSecurityDefinition("Bearer", scheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [scheme] = Array.Empty<string>()
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("fleetcar-web", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("JWT configuration is missing.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddDbContext<FleetCarDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddFleetCarData();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FleetCarDbContext>();
    await db.Database.EnsureCreatedAsync();

    await db.Database.ExecuteSqlRawAsync("""
        IF OBJECT_ID('dbo.Customers', 'U') IS NOT NULL AND COL_LENGTH('dbo.Customers', 'Country') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Customers ADD Country nvarchar(80) NULL;');
            EXEC('UPDATE dbo.Customers SET Country = ''Zimbabwe'' WHERE Country IS NULL;');
            EXEC('ALTER TABLE dbo.Customers ALTER COLUMN Country nvarchar(80) NOT NULL;');
        END

        IF OBJECT_ID('dbo.Customers', 'U') IS NOT NULL AND COL_LENGTH('dbo.Customers', 'IsInternational') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Customers ADD IsInternational bit NULL;');
            EXEC('UPDATE dbo.Customers SET IsInternational = 0 WHERE IsInternational IS NULL;');
            EXEC('ALTER TABLE dbo.Customers ALTER COLUMN IsInternational bit NOT NULL;');
        END

        IF OBJECT_ID('dbo.Customers', 'U') IS NOT NULL AND COL_LENGTH('dbo.Customers', 'IsActive') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Customers ADD IsActive bit NULL;');
            EXEC('UPDATE dbo.Customers SET IsActive = 1 WHERE IsActive IS NULL;');
            EXEC('ALTER TABLE dbo.Customers ALTER COLUMN IsActive bit NOT NULL;');
        END

        IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL AND COL_LENGTH('dbo.Payments', 'Status') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Payments ADD Status nvarchar(20) NULL;');
        END

        IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL AND COL_LENGTH('dbo.Payments', 'CreatedByUserId') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Payments ADD CreatedByUserId uniqueidentifier NULL;');
            EXEC('UPDATE p SET CreatedByUserId = ISNULL(b.CreatedByUserId, ''59BD1BF6-B184-44D9-8B96-0A4B3676A001'') FROM dbo.Payments p INNER JOIN dbo.Bookings b ON b.Id = p.BookingId WHERE p.CreatedByUserId IS NULL;');
        END

        IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL AND COL_LENGTH('dbo.Payments', 'TaxAmount') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Payments ADD TaxAmount decimal(18,2) NULL;');
            EXEC('UPDATE dbo.Payments SET TaxAmount = 0 WHERE TaxAmount IS NULL;');
        END

        IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL AND COL_LENGTH('dbo.Payments', 'VatAmount') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Payments ADD VatAmount decimal(18,2) NULL;');
            EXEC('UPDATE dbo.Payments SET VatAmount = 0 WHERE VatAmount IS NULL;');
        END

        IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL AND COL_LENGTH('dbo.Payments', 'TotalAmount') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Payments ADD TotalAmount decimal(18,2) NULL;');
            EXEC('UPDATE dbo.Payments SET TotalAmount = Amount WHERE TotalAmount IS NULL;');
        END

        IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL AND COL_LENGTH('dbo.Payments', 'Status') IS NOT NULL
        BEGIN
            EXEC('UPDATE dbo.Payments SET Status = ''Processed'' WHERE Status IS NULL;');
            EXEC('ALTER TABLE dbo.Payments ALTER COLUMN Status nvarchar(20) NOT NULL;');
            EXEC('ALTER TABLE dbo.Payments ALTER COLUMN CreatedByUserId uniqueidentifier NOT NULL;');
            EXEC('ALTER TABLE dbo.Payments ALTER COLUMN TaxAmount decimal(18,2) NOT NULL;');
            EXEC('ALTER TABLE dbo.Payments ALTER COLUMN VatAmount decimal(18,2) NOT NULL;');
            EXEC('ALTER TABLE dbo.Payments ALTER COLUMN TotalAmount decimal(18,2) NOT NULL;');
            EXEC('UPDATE dbo.Payments SET TotalAmount = Amount + TaxAmount + VatAmount WHERE TotalAmount = 0;');

            IF OBJECT_ID('DF_Payments_Status', 'D') IS NULL
            BEGIN
                EXEC('ALTER TABLE dbo.Payments ADD CONSTRAINT DF_Payments_Status DEFAULT ''Processed'' FOR Status;');
            END
        END

        IF OBJECT_ID('dbo.CashSessions', 'U') IS NOT NULL AND COL_LENGTH('dbo.CashSessions', 'ClosedByUserId') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.CashSessions ADD ClosedByUserId uniqueidentifier NULL;');
        END

        IF OBJECT_ID('dbo.CashSessions', 'U') IS NOT NULL AND COL_LENGTH('dbo.CashSessions', 'ClosedAtUtc') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.CashSessions ADD ClosedAtUtc datetime2 NULL;');
        END

        IF OBJECT_ID('dbo.CashSessions', 'U') IS NOT NULL AND COL_LENGTH('dbo.CashSessions', 'Notes') IS NULL
        BEGIN
            EXEC('ALTER TABLE dbo.CashSessions ADD Notes nvarchar(300) NULL;');
        END

        IF OBJECT_ID('dbo.CreditNotes', 'U') IS NULL
        BEGIN
            EXEC('
                CREATE TABLE dbo.CreditNotes (
                    Id uniqueidentifier NOT NULL PRIMARY KEY,
                    CreatedAtUtc datetime2 NOT NULL,
                    BookingId uniqueidentifier NOT NULL,
                    OfficeId uniqueidentifier NOT NULL,
                    CreatedByUserId uniqueidentifier NOT NULL,
                    Reference nvarchar(40) NOT NULL,
                    Reason nvarchar(240) NOT NULL,
                    Amount decimal(18,2) NOT NULL,
                    Currency nvarchar(3) NOT NULL,
                    Status nvarchar(20) NOT NULL,
                    IssuedAtUtc datetime2 NOT NULL
                );
                CREATE UNIQUE INDEX IX_CreditNotes_Reference ON dbo.CreditNotes (Reference);
            ');
        END
        """);

    var seeder = scope.ServiceProvider.GetRequiredService<IDbSeeder>();
    await seeder.SeedAsync(CancellationToken.None);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("fleetcar-web");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
