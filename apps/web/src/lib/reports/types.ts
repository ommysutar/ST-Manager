export type ReportPeriodType = "date" | "month" | "year" | "range";

export interface ReportFilters {
  periodType: ReportPeriodType;
  /** YYYY-MM-DD */
  date?: string;
  month?: number;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
  clientName?: string;
  projectId?: string;
  studioId?: string;
}

export interface ProjectReportRow {
  projectId: string;
  projectNumber: string;
  projectName: string;
  clientName: string;
  projectValue: number;
  paymentsReceived: number;
  pendingPayments: number;
  projectExpenses: number;
  netProfit: number;
  assignedEngineer: string;
  bookingCount: number;
  filesShared: boolean;
  completionDate?: string;
  createdAt: string;
}

export interface RevenueReportSummary {
  monthlyRevenue: { key: string; label: string; amount: number }[];
  yearlyRevenue: { year: number; amount: number }[];
  collectedPayments: number;
  pendingPayments: number;
  averageProjectValue: number;
}

export interface ExpenseReportRow {
  expenseId: string;
  category: string;
  projectId: string;
  projectName: string;
  amount: number;
  expenseDate: string;
}

export interface ExpenseReportSummary {
  rows: ExpenseReportRow[];
  totalExpense: number;
}

export interface ProfitReportSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface ClientReportRow {
  clientName: string;
  projectCount: number;
  totalRevenue: number;
  totalReceived: number;
  bookingCount: number;
}

export interface BookingReportRow {
  bookingId: string;
  projectName: string;
  clientName: string;
  studioName: string;
  date: string;
  slotLabel: string;
  bookingFor: string;
  status: string;
}

export interface PaymentReportRow {
  paymentId: string;
  projectName: string;
  clientName: string;
  amount: number;
  method: string;
  date: string;
}
