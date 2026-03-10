namespace FleetCar.Data;

internal static class FinancialRules
{
    public const decimal StandardTaxRate = 0.0045m;
    public const decimal InternationalVatRate = 0.02m;

    public static (decimal TaxAmount, decimal VatAmount, decimal TotalAmount) CalculateTotals(decimal subtotal, bool isInternational)
    {
        var taxAmount = Math.Round(subtotal * StandardTaxRate, 2, MidpointRounding.AwayFromZero);
        var vatAmount = isInternational
            ? Math.Round(subtotal * InternationalVatRate, 2, MidpointRounding.AwayFromZero)
            : 0m;
        var totalAmount = subtotal + taxAmount + vatAmount;
        return (taxAmount, vatAmount, totalAmount);
    }

    public static string GenerateReference(string prefix) =>
        $"{prefix}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";

    public static bool RequiresPaynowForLocalZimbabwePayment(bool isInternationalCustomer, string currency) =>
        !isInternationalCustomer && currency is "USD" or "ZWL";
}
