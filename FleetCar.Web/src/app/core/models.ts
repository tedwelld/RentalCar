export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  officeId: string | null;
  officeName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: User;
}

export interface Location {
  id: string;
  officeId: string;
  code: string;
  name: string;
  operatingHours: string;
}

export interface Office {
  id: string;
  name: string;
  code: string;
  city: string;
  locations: Location[];
}

export interface Car {
  id: string;
  officeId: string;
  officeName: string;
  currentLocationId: string;
  currentLocationName: string;
  registrationNumber: string;
  make: string;
  model: string;
  category: string;
  year: number;
  dailyRate: number;
  status: string;
  fuelLevelPercent: number;
  mileageKm: number;
  insuranceExpiryDateUtc: string;
  registrationExpiryDateUtc: string;
  transmission: string;
  seats: number;
  color: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId: string;
  driverLicenseNumber: string;
  country: string;
  isInternational: boolean;
  isActive: boolean;
}

export interface Agent {
  id: string;
  code: string;
  companyName: string;
  commissionRate: number;
  creditLimit: number;
  email: string;
  phone: string;
  preferredOfficeId: string;
  preferredOfficeName: string;
}

export interface BookingExtra {
  id: string;
  name: string;
  price: number;
}

export interface Booking {
  id: string;
  reference: string;
  officeId: string;
  officeName: string;
  pickupLocationId: string;
  returnLocationId: string;
  carId: string;
  carDisplayName: string;
  customerId: string;
  customerName: string;
  agentId: string | null;
  agentName: string | null;
  channel: string;
  status: string;
  pickupDateUtc: string;
  returnDateUtc: string;
  pickupLocationName: string;
  returnLocationName: string;
  dailyRate: number;
  extrasTotal: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  currency: string;
  flightNumber: string | null;
  createdByUsername: string;
  extras: BookingExtra[];
}

export interface Payment {
  id: string;
  bookingId: string;
  bookingReference: string;
  officeId: string;
  officeName: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  isDeposit: boolean;
  taxAmount: number;
  vatAmount: number;
  totalAmount: number;
  reference: string;
  fiscalInvoiceNumber: string | null;
  paidAtUtc: string;
  capturedByUsername: string;
}

export interface CreditNote {
  id: string;
  bookingId: string;
  bookingReference: string;
  officeId: string;
  officeName: string;
  reference: string;
  reason: string;
  amount: number;
  currency: string;
  status: string;
  issuedAtUtc: string;
  createdByUsername: string;
}

export interface Cashup {
  id: string;
  officeId: string;
  officeName: string;
  userId: string;
  openedByUsername: string;
  closedByUsername: string | null;
  sessionDateUtc: string;
  openingBalance: number;
  closingBalance: number;
  salesTotal: number;
  depositTotal: number;
  creditNotesTotal: number;
  paymentsCount: number;
  status: string;
  closedAtUtc: string | null;
  notes: string | null;
}

export interface DocumentLine {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PrintableDocument {
  documentType: string;
  documentNumber: string;
  officeName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCountry: string;
  currency: string;
  generatedByUsername: string;
  issuedAtUtc: string;
  subtotal: number;
  taxAmount: number;
  vatAmount: number;
  totalAmount: number;
  notes: string;
  lines: DocumentLine[];
}

export interface DashboardSummary {
  totalRevenue: number;
  activeBookings: number;
  availableCars: number;
  carsInMaintenance: number;
  pendingReturns: number;
  activeAgents: number;
  outstandingBalances: number;
}

export interface RevenueBreakdown {
  officeName: string;
  revenue: number;
  paymentsCount: number;
}

export interface UtilizationReport {
  officeName: string;
  totalCars: number;
  rentedCars: number;
  reservedCars: number;
  utilizationPercent: number;
}

export interface AgentCommissionReport {
  agentCode: string;
  companyName: string;
  bookingsCount: number;
  grossValue: number;
  commissionAmount: number;
}

export interface CreateBookingRequest {
  officeId: string;
  pickupLocationId: string;
  returnLocationId: string;
  carId: string;
  customerId: string;
  agentId: string | null;
  channel: string;
  pickupDateUtc: string;
  returnDateUtc: string;
  currency: string;
  flightNumber: string | null;
  notes: string | null;
  extras: Array<{ name: string; price: number }>;
}

export interface UpdateBookingRequest extends CreateBookingRequest {
  status: string;
}

export interface CreatePaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  method: string;
  status?: string | null;
  isDeposit: boolean;
  reference?: string | null;
  fiscalInvoiceNumber: string | null;
}

export interface UpdatePaymentRequest {
  amount: number;
  currency: string;
  method: string;
  status?: string | null;
  isDeposit: boolean;
  reference?: string | null;
  fiscalInvoiceNumber: string | null;
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId: string;
  driverLicenseNumber: string;
  country: string;
  isInternational: boolean;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  isActive: boolean;
}

export interface CreateCarRequest {
  officeId: string;
  currentLocationId: string;
  registrationNumber: string;
  make: string;
  model: string;
  category: string;
  year: number;
  dailyRate: number;
  status: string;
  fuelLevelPercent: number;
  mileageKm: number;
  insuranceExpiryDateUtc: string;
  registrationExpiryDateUtc: string;
  transmission: string;
  seats: number;
  color: string;
}

export interface UpdateCarRequest extends CreateCarRequest {}

export interface CreateAgentRequest {
  preferredOfficeId: string;
  code: string;
  companyName: string;
  commissionRate: number;
  creditLimit: number;
  email: string;
  phone: string;
}

export interface UpdateAgentRequest extends CreateAgentRequest {}

export interface CreateCreditNoteRequest {
  bookingId: string;
  amount: number;
  currency: string;
  reason: string;
}

export interface OpenCashupRequest {
  officeId: string;
  openingBalance: number;
}

export interface CloseCashupRequest {
  closingBalance: number;
  notes: string | null;
}
