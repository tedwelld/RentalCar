using FleetCar.Core;
using Microsoft.EntityFrameworkCore;

namespace FleetCar.Data;

public sealed class FleetCarDbContext(DbContextOptions<FleetCarDbContext> options) : DbContext(options)
{
    public DbSet<Office> Offices => Set<Office>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Car> Cars => Set<Car>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingExtra> BookingExtras => Set<BookingExtra>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<CreditNote> CreditNotes => Set<CreditNote>();
    public DbSet<CashSession> CashSessions => Set<CashSession>();
    public DbSet<MaintenanceRecord> MaintenanceRecords => Set<MaintenanceRecord>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().Property(x => x.Role).HasConversion<string>();
        modelBuilder.Entity<Car>().Property(x => x.Status).HasConversion<string>();
        modelBuilder.Entity<Booking>().Property(x => x.Channel).HasConversion<string>();
        modelBuilder.Entity<Booking>().Property(x => x.Status).HasConversion<string>();
        modelBuilder.Entity<Payment>().Property(x => x.Method).HasConversion<string>();
        modelBuilder.Entity<Payment>().Property(x => x.Status).HasConversion<string>();
        modelBuilder.Entity<Invoice>().Property(x => x.Status).HasConversion<string>();
        modelBuilder.Entity<CreditNote>().Property(x => x.Status).HasConversion<string>();
        modelBuilder.Entity<CashSession>().Property(x => x.Status).HasConversion<string>();
        modelBuilder.Entity<MaintenanceRecord>().Property(x => x.Status).HasConversion<string>();

        ConfigureOffice(modelBuilder);
        ConfigureLocation(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureCar(modelBuilder);
        ConfigureCustomer(modelBuilder);
        ConfigureAgent(modelBuilder);
        ConfigureBooking(modelBuilder);
        ConfigureBookingExtra(modelBuilder);
        ConfigurePayment(modelBuilder);
        ConfigureInvoice(modelBuilder);
        ConfigureCreditNote(modelBuilder);
        ConfigureCashSession(modelBuilder);
        ConfigureMaintenanceRecord(modelBuilder);
        ConfigureRefreshToken(modelBuilder);
    }

    private static void ConfigureOffice(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Office>();
        entity.HasIndex(x => x.Code).IsUnique();
        entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
        entity.Property(x => x.Code).HasMaxLength(20).IsRequired();
        entity.Property(x => x.City).HasMaxLength(80).IsRequired();
    }

    private static void ConfigureLocation(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Location>();
        entity.HasIndex(x => x.Code).IsUnique();
        entity.Property(x => x.Code).HasMaxLength(20).IsRequired();
        entity.Property(x => x.Name).HasMaxLength(160).IsRequired();
        entity.Property(x => x.OperatingHours).HasMaxLength(80).IsRequired();
        entity.HasOne(x => x.Office)
            .WithMany(x => x.Locations)
            .HasForeignKey(x => x.OfficeId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureUser(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<User>();
        entity.HasIndex(x => x.Username).IsUnique();
        entity.Property(x => x.Username).HasMaxLength(60).IsRequired();
        entity.Property(x => x.FullName).HasMaxLength(120).IsRequired();
        entity.Property(x => x.Email).HasMaxLength(160).IsRequired();
        entity.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
        entity.HasOne(x => x.Office)
            .WithMany(x => x.Staff)
            .HasForeignKey(x => x.OfficeId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureCar(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Car>();
        entity.HasIndex(x => x.RegistrationNumber).IsUnique();
        entity.Property(x => x.RegistrationNumber).HasMaxLength(30).IsRequired();
        entity.Property(x => x.Make).HasMaxLength(80).IsRequired();
        entity.Property(x => x.Model).HasMaxLength(80).IsRequired();
        entity.Property(x => x.Category).HasMaxLength(80).IsRequired();
        entity.Property(x => x.Transmission).HasMaxLength(40).IsRequired();
        entity.Property(x => x.Color).HasMaxLength(40).IsRequired();
        entity.Property(x => x.DailyRate).HasPrecision(18, 2);
        entity.HasOne(x => x.Office)
            .WithMany(x => x.Cars)
            .HasForeignKey(x => x.OfficeId)
            .OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.CurrentLocation)
            .WithMany()
            .HasForeignKey(x => x.CurrentLocationId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureCustomer(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Customer>();
        entity.Property(x => x.FirstName).HasMaxLength(80).IsRequired();
        entity.Property(x => x.LastName).HasMaxLength(80).IsRequired();
        entity.Property(x => x.Email).HasMaxLength(160).IsRequired();
        entity.Property(x => x.Phone).HasMaxLength(40).IsRequired();
        entity.Property(x => x.NationalId).HasMaxLength(30).IsRequired();
        entity.Property(x => x.DriverLicenseNumber).HasMaxLength(40).IsRequired();
        entity.Property(x => x.Country).HasMaxLength(80).IsRequired();
    }

    private static void ConfigureAgent(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Agent>();
        entity.HasIndex(x => x.Code).IsUnique();
        entity.Property(x => x.Code).HasMaxLength(30).IsRequired();
        entity.Property(x => x.CompanyName).HasMaxLength(160).IsRequired();
        entity.Property(x => x.Email).HasMaxLength(160).IsRequired();
        entity.Property(x => x.Phone).HasMaxLength(40).IsRequired();
        entity.Property(x => x.CommissionRate).HasPrecision(5, 2);
        entity.Property(x => x.CreditLimit).HasPrecision(18, 2);
        entity.HasOne(x => x.PreferredOffice)
            .WithMany()
            .HasForeignKey(x => x.PreferredOfficeId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureBooking(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Booking>();
        entity.HasIndex(x => x.Reference).IsUnique();
        entity.Property(x => x.Reference).HasMaxLength(40).IsRequired();
        entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        entity.Property(x => x.FlightNumber).HasMaxLength(40);
        entity.Property(x => x.Notes).HasMaxLength(500);
        entity.Property(x => x.DailyRate).HasPrecision(18, 2);
        entity.Property(x => x.ExtrasTotal).HasPrecision(18, 2);
        entity.Property(x => x.TotalAmount).HasPrecision(18, 2);
        entity.Property(x => x.DepositAmount).HasPrecision(18, 2);
        entity.Property(x => x.BalanceAmount).HasPrecision(18, 2);
        entity.HasOne(x => x.Office).WithMany(x => x.Bookings).HasForeignKey(x => x.OfficeId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.PickupLocation).WithMany().HasForeignKey(x => x.PickupLocationId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.ReturnLocation).WithMany().HasForeignKey(x => x.ReturnLocationId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Car).WithMany(x => x.Bookings).HasForeignKey(x => x.CarId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Customer).WithMany(x => x.Bookings).HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Agent).WithMany(x => x.Bookings).HasForeignKey(x => x.AgentId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureBookingExtra(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<BookingExtra>();
        entity.Property(x => x.Name).HasMaxLength(80).IsRequired();
        entity.Property(x => x.Price).HasPrecision(18, 2);
        entity.HasOne(x => x.Booking)
            .WithMany(x => x.Extras)
            .HasForeignKey(x => x.BookingId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigurePayment(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Payment>();
        entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        entity.Property(x => x.Reference).HasMaxLength(80).IsRequired();
        entity.Property(x => x.FiscalInvoiceNumber).HasMaxLength(80);
        entity.Property(x => x.Amount).HasPrecision(18, 2);
        entity.Property(x => x.TaxAmount).HasPrecision(18, 2);
        entity.Property(x => x.VatAmount).HasPrecision(18, 2);
        entity.Property(x => x.TotalAmount).HasPrecision(18, 2);
        entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
        entity.HasOne(x => x.Booking).WithMany(x => x.Payments).HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Office).WithMany().HasForeignKey(x => x.OfficeId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureInvoice(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Invoice>();
        entity.HasIndex(x => x.InvoiceNumber).IsUnique();
        entity.Property(x => x.InvoiceNumber).HasMaxLength(40).IsRequired();
        entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        entity.Property(x => x.TotalAmount).HasPrecision(18, 2);
        entity.HasOne(x => x.Booking).WithMany(x => x.Invoices).HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Office).WithMany().HasForeignKey(x => x.OfficeId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureCashSession(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<CashSession>();
        entity.Property(x => x.OpeningBalance).HasPrecision(18, 2);
        entity.Property(x => x.ClosingBalance).HasPrecision(18, 2);
        entity.Property(x => x.Notes).HasMaxLength(300);
        entity.HasOne(x => x.Office).WithMany().HasForeignKey(x => x.OfficeId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.ClosedByUser).WithMany().HasForeignKey(x => x.ClosedByUserId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureCreditNote(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<CreditNote>();
        entity.HasIndex(x => x.Reference).IsUnique();
        entity.Property(x => x.Reference).HasMaxLength(40).IsRequired();
        entity.Property(x => x.Reason).HasMaxLength(240).IsRequired();
        entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        entity.Property(x => x.Amount).HasPrecision(18, 2);
        entity.HasOne(x => x.Booking).WithMany().HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Office).WithMany().HasForeignKey(x => x.OfficeId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureMaintenanceRecord(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<MaintenanceRecord>();
        entity.Property(x => x.Description).HasMaxLength(200).IsRequired();
        entity.Property(x => x.Cost).HasPrecision(18, 2);
        entity.HasOne(x => x.Car).WithMany(x => x.MaintenanceRecords).HasForeignKey(x => x.CarId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Office).WithMany().HasForeignKey(x => x.OfficeId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureRefreshToken(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<RefreshToken>();
        entity.HasIndex(x => x.Token).IsUnique();
        entity.Property(x => x.Token).HasMaxLength(300).IsRequired();
        entity.HasOne(x => x.User)
            .WithMany(x => x.RefreshTokens)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
