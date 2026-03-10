import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Agent,
  AgentCommissionReport,
  Booking,
  Car,
  Cashup,
  CloseCashupRequest,
  CreateCreditNoteRequest,
  CreateAgentRequest,
  CreateBookingRequest,
  CreateCarRequest,
  CreateCustomerRequest,
  CreatePaymentRequest,
  CreditNote,
  Customer,
  DashboardSummary,
  Office,
  OpenCashupRequest,
  Payment,
  PrintableDocument,
  RevenueBreakdown,
  UpdateAgentRequest,
  UpdateBookingRequest,
  UpdateCarRequest,
  UpdateCustomerRequest,
  UpdatePaymentRequest,
  UtilizationReport
} from './models';
import { apiBaseUrl } from './api.config';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getOffices() {
    return this.http.get<Office[]>(`${apiBaseUrl}/offices`);
  }

  getCars(officeId?: string, status?: string) {
    return this.http.get<Car[]>(`${apiBaseUrl}/cars`, { params: this.params({ officeId, status }) });
  }

  createCar(payload: CreateCarRequest) {
    return this.http.post<Car>(`${apiBaseUrl}/cars`, payload);
  }

  updateCar(id: string, payload: UpdateCarRequest) {
    return this.http.put<Car>(`${apiBaseUrl}/cars/${id}`, payload);
  }

  deleteCar(id: string) {
    return this.http.delete<void>(`${apiBaseUrl}/cars/${id}`);
  }

  getCustomers() {
    return this.http.get<Customer[]>(`${apiBaseUrl}/customers`);
  }

  createCustomer(payload: CreateCustomerRequest) {
    return this.http.post<Customer>(`${apiBaseUrl}/customers`, payload);
  }

  updateCustomer(id: string, payload: UpdateCustomerRequest) {
    return this.http.put<Customer>(`${apiBaseUrl}/customers/${id}`, payload);
  }

  activateCustomer(id: string) {
    return this.http.post<Customer>(`${apiBaseUrl}/customers/${id}/activate`, {});
  }

  disableCustomer(id: string) {
    return this.http.post<Customer>(`${apiBaseUrl}/customers/${id}/disable`, {});
  }

  deleteCustomer(id: string) {
    return this.http.delete<void>(`${apiBaseUrl}/customers/${id}`);
  }

  getBookings(officeId?: string, status?: string) {
    return this.http.get<Booking[]>(`${apiBaseUrl}/bookings`, { params: this.params({ officeId, status }) });
  }

  createBooking(payload: CreateBookingRequest) {
    return this.http.post<Booking>(`${apiBaseUrl}/bookings`, payload);
  }

  updateBooking(id: string, payload: UpdateBookingRequest) {
    return this.http.put<Booking>(`${apiBaseUrl}/bookings/${id}`, payload);
  }

  deleteBooking(id: string) {
    return this.http.delete<void>(`${apiBaseUrl}/bookings/${id}`);
  }

  getPayments(officeId?: string) {
    return this.http.get<Payment[]>(`${apiBaseUrl}/payments`, { params: this.params({ officeId }) });
  }

  createPayment(payload: CreatePaymentRequest) {
    return this.http.post<Payment>(`${apiBaseUrl}/payments`, payload);
  }

  updatePayment(id: string, payload: UpdatePaymentRequest) {
    return this.http.put<Payment>(`${apiBaseUrl}/payments/${id}`, payload);
  }

  deletePayment(id: string) {
    return this.http.delete<void>(`${apiBaseUrl}/payments/${id}`);
  }

  holdPayment(id: string) {
    return this.http.post<Payment>(`${apiBaseUrl}/payments/${id}/hold`, {});
  }

  processPayment(id: string) {
    return this.http.post<Payment>(`${apiBaseUrl}/payments/${id}/process`, {});
  }

  getReceipt(paymentId: string) {
    return this.http.get<PrintableDocument>(`${apiBaseUrl}/documents/receipt/${paymentId}`);
  }

  getQuotation(bookingId: string) {
    return this.http.get<PrintableDocument>(`${apiBaseUrl}/documents/quotation/${bookingId}`);
  }

  getCreditNoteDocument(creditNoteId: string) {
    return this.http.get<PrintableDocument>(`${apiBaseUrl}/documents/credit-note/${creditNoteId}`);
  }

  getCreditNotes(officeId?: string) {
    return this.http.get<CreditNote[]>(`${apiBaseUrl}/creditnotes`, { params: this.params({ officeId }) });
  }

  createCreditNote(payload: CreateCreditNoteRequest) {
    return this.http.post<CreditNote>(`${apiBaseUrl}/creditnotes`, payload);
  }

  getCashups(officeId?: string) {
    return this.http.get<Cashup[]>(`${apiBaseUrl}/cashups`, { params: this.params({ officeId }) });
  }

  openCashup(payload: OpenCashupRequest) {
    return this.http.post<Cashup>(`${apiBaseUrl}/cashups/open`, payload);
  }

  closeCashup(id: string, payload: CloseCashupRequest) {
    return this.http.post<Cashup>(`${apiBaseUrl}/cashups/${id}/close`, payload);
  }

  getAgents() {
    return this.http.get<Agent[]>(`${apiBaseUrl}/agents`);
  }

  createAgent(payload: CreateAgentRequest) {
    return this.http.post<Agent>(`${apiBaseUrl}/agents`, payload);
  }

  updateAgent(id: string, payload: UpdateAgentRequest) {
    return this.http.put<Agent>(`${apiBaseUrl}/agents/${id}`, payload);
  }

  deleteAgent(id: string) {
    return this.http.delete<void>(`${apiBaseUrl}/agents/${id}`);
  }

  getDashboard(officeId?: string) {
    return this.http.get<DashboardSummary>(`${apiBaseUrl}/reports/dashboard`, { params: this.params({ officeId }) });
  }

  getRevenueReport(officeId?: string) {
    return this.http.get<RevenueBreakdown[]>(`${apiBaseUrl}/reports/revenue`, { params: this.params({ officeId }) });
  }

  getUtilizationReport(officeId?: string) {
    return this.http.get<UtilizationReport[]>(`${apiBaseUrl}/reports/utilization`, { params: this.params({ officeId }) });
  }

  getAgentCommissionReport(officeId?: string) {
    return this.http.get<AgentCommissionReport[]>(`${apiBaseUrl}/reports/agent-commissions`, {
      params: this.params({ officeId })
    });
  }

  private params(values: Record<string, string | undefined>) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value) {
        params = params.set(key, value);
      }
    }

    return params;
  }
}
