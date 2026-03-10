using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FleetCar.Data;

public sealed class FleetCarDbContextFactory : IDesignTimeDbContextFactory<FleetCarDbContext>
{
    public FleetCarDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<FleetCarDbContext>();
        optionsBuilder.UseSqlServer(
            "Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog=FleetCarDb;MultipleActiveResultSets=true;TrustServerCertificate=true;");

        return new FleetCarDbContext(optionsBuilder.Options);
    }
}
