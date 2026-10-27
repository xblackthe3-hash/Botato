import {
  Supplier,
  Delivery,
  Payment,
  StatementMovement,
  StatementSummary,
  DashboardStats,
  AuditLog,
  AppDatabase,
} from '../types/index.ts';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    let errMessage = 'حدث خطأ في الاتصال بالخادم';
    try {
      const err = await res.json();
      if (err.error) errMessage = err.error;
    } catch {
      errMessage = `خطأ ${res.status}: ${res.statusText}`;
    }
    throw new Error(errMessage);
  }
  return res.json();
}

export const api = {
  // Suppliers
  getSuppliers: () => fetchJson<Supplier[]>('/api/suppliers'),
  addSupplier: (data: Partial<Supplier>) =>
    fetchJson<Supplier>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSupplier: (id: string, data: Partial<Supplier>) =>
    fetchJson<Supplier>(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSupplier: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/suppliers/${id}`, {
      method: 'DELETE',
    }),

  // Deductions (الخصومات)
  getDeductions: (supplierId?: string) =>
    fetchJson<any[]>(
      supplierId ? `/api/deductions?supplierId=${encodeURIComponent(supplierId)}` : '/api/deductions'
    ),
  createDeduction: (data: {
    supplierId: string;
    amount: number;
    reason: string;
    date: string;
    time?: string;
    linkedDeliveryId?: string;
    notes?: string;
  }) =>
    fetchJson<any>('/api/deductions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Deliveries
  getDeliveries: (supplierId?: string) =>
    fetchJson<Delivery[]>(
      supplierId ? `/api/deliveries?supplierId=${encodeURIComponent(supplierId)}` : '/api/deliveries'
    ),
  createDelivery: (data: {
    supplierId: string;
    date: string;
    time?: string;
    weightKg: number;
    pricePerKg: number;
    initialPaid?: number;
    paymentMethod: 'cash' | 'vodafone_cash' | 'unpaid';
    vodafoneRef?: string;
    notes?: string;
  }) =>
    fetchJson<Delivery>('/api/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDelivery: (
    id: string,
    updates: {
      weightKg?: number;
      pricePerKg?: number;
      notes?: string;
      date?: string;
      time?: string;
    }
  ) =>
    fetchJson<Delivery>(`/api/deliveries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  cancelDelivery: (id: string, reason: string) =>
    fetchJson<Delivery>(`/api/deliveries/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Payments
  getPayments: (supplierId?: string) =>
    fetchJson<Payment[]>(
      supplierId ? `/api/payments?supplierId=${encodeURIComponent(supplierId)}` : '/api/payments'
    ),
  createPayment: (data: {
    supplierId: string;
    amount: number;
    paymentMethod: 'cash' | 'vodafone_cash';
    date: string;
    time?: string;
    vodafoneRef?: string;
    linkedDeliveryIds?: string[];
    notes?: string;
    idempotencyKey?: string;
  }) =>
    fetchJson<{ payment: Payment; isDuplicate: boolean }>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Statement
  getStatement: (supplierId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (supplierId) params.append('supplierId', supplierId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchJson<{ movements: StatementMovement[]; summary: StatementSummary }>(
      `/api/statement?${params.toString()}`
    );
  },

  // Dashboard
  getDashboard: (supplierId?: string) =>
    fetchJson<DashboardStats>(
      supplierId ? `/api/dashboard?supplierId=${encodeURIComponent(supplierId)}` : '/api/dashboard'
    ),

  // Reports
  getReports: (supplierId?: string) =>
    fetchJson<{
      dailyBreakdown: { date: string; totalWeight: number; totalValue: number; count: number; paid: number }[];
      unpaidDeliveries: Delivery[];
      weightedAvgPrice: number;
      summary: StatementSummary;
      totalDeliveriesCount: number;
      totalPaymentsCount: number;
    }>(
      supplierId ? `/api/reports?supplierId=${encodeURIComponent(supplierId)}` : '/api/reports'
    ),

  // Audit Logs
  getAuditLogs: () => fetchJson<AuditLog[]>('/api/audit-logs'),

  // Backup & Reset
  getBackupUrl: () => '/api/backup',
  restoreBackup: (data: AppDatabase) =>
    fetchJson<{ success: boolean; message: string }>('/api/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resetDemoData: () =>
    fetchJson<{ success: boolean; message: string }>('/api/reset-demo', {
      method: 'POST',
    }),
  clearDataForProduction: () =>
    fetchJson<{ success: boolean; message: string }>('/api/clear-demo', {
      method: 'POST',
    }),
};
