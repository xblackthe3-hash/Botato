import {
  Supplier,
  Delivery,
  Payment,
  Deduction,
  StatementMovement,
  StatementSummary,
  DashboardStats,
  AuditLog,
  AppDatabase,
} from '../types/index.ts';
import { clientDb } from '../utils/clientDb.ts';
import {
  buildChronologicalStatement,
  calculateWeightedAveragePrice,
  round2,
} from '../utils/accounting.ts';

// Track connection mode
let isUsingLocalFallback = false;

export function isLocalDatabaseMode(): boolean {
  return isUsingLocalFallback;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers || {}),
    },
  });

  // Verify response is actually JSON and not an HTML 404 page (common in static Vercel deployments)
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    let errMessage = `خطأ ${res.status}: ${res.statusText}`;
    try {
      if (contentType.includes('application/json')) {
        const err = await res.json();
        if (err.error) errMessage = err.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  return res.json();
}

export const api = {
  // 1. Suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    try {
      const data = await fetchJson<Supplier[]>('/api/suppliers');
      isUsingLocalFallback = false;
      clientDb.syncFromRemote({ suppliers: data });
      return data;
    } catch (err) {
      console.warn('Backend unavailable, using persistent local database:', err);
      isUsingLocalFallback = true;
      return clientDb.getSuppliers();
    }
  },

  addSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
    try {
      const result = await fetchJson<Supplier>('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      clientDb.addSupplier(result);
      return result;
    } catch {
      isUsingLocalFallback = true;
      return clientDb.addSupplier(data);
    }
  },

  updateSupplier: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
    try {
      const result = await fetchJson<Supplier>(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      clientDb.updateSupplier(id, data);
      return result;
    } catch {
      isUsingLocalFallback = true;
      const updated = clientDb.updateSupplier(id, data);
      if (!updated) throw new Error('المورد غير موجود');
      return updated;
    }
  },

  deleteSupplier: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await fetchJson<{ success: boolean; message: string }>(`/api/suppliers/${id}`, {
        method: 'DELETE',
      });
      clientDb.deleteSupplier(id);
      return result;
    } catch {
      isUsingLocalFallback = true;
      return clientDb.deleteSupplier(id);
    }
  },

  // 2. Deductions (الخصومات)
  getDeductions: async (supplierId?: string): Promise<Deduction[]> => {
    try {
      const data = await fetchJson<Deduction[]>(
        supplierId ? `/api/deductions?supplierId=${encodeURIComponent(supplierId)}` : '/api/deductions'
      );
      return data;
    } catch {
      isUsingLocalFallback = true;
      return clientDb.getDeductions(supplierId);
    }
  },

  createDeduction: async (data: {
    supplierId: string;
    amount: number;
    reason: string;
    date: string;
    time?: string;
    linkedDeliveryId?: string;
    notes?: string;
  }): Promise<Deduction> => {
    try {
      const result = await fetchJson<Deduction>('/api/deductions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result;
    } catch {
      isUsingLocalFallback = true;
      return clientDb.createDeduction(data);
    }
  },

  // 3. Deliveries
  getDeliveries: async (supplierId?: string): Promise<Delivery[]> => {
    try {
      const data = await fetchJson<Delivery[]>(
        supplierId ? `/api/deliveries?supplierId=${encodeURIComponent(supplierId)}` : '/api/deliveries'
      );
      return data;
    } catch {
      isUsingLocalFallback = true;
      return clientDb.getDeliveries(supplierId);
    }
  },

  createDelivery: async (data: {
    supplierId: string;
    date: string;
    time?: string;
    weightKg: number;
    pricePerKg: number;
    initialPaid?: number;
    paymentMethod: 'cash' | 'vodafone_cash' | 'unpaid';
    vodafoneRef?: string;
    notes?: string;
  }): Promise<Delivery> => {
    try {
      const result = await fetchJson<Delivery>('/api/deliveries', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result;
    } catch {
      isUsingLocalFallback = true;
      return clientDb.createDelivery(data);
    }
  },

  updateDelivery: async (
    id: string,
    updates: {
      weightKg?: number;
      pricePerKg?: number;
      notes?: string;
      date?: string;
      time?: string;
    }
  ): Promise<Delivery> => {
    try {
      const result = await fetchJson<Delivery>(`/api/deliveries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return result;
    } catch {
      isUsingLocalFallback = true;
      const updated = clientDb.updateDelivery(id, updates);
      if (!updated) throw new Error('التوريدة غير موجودة');
      return updated;
    }
  },

  cancelDelivery: async (id: string, reason: string): Promise<Delivery> => {
    try {
      const result = await fetchJson<Delivery>(`/api/deliveries/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return result;
    } catch {
      isUsingLocalFallback = true;
      const cancelled = clientDb.cancelDelivery(id, reason);
      if (!cancelled) throw new Error('التوريدة غير موجودة');
      return cancelled;
    }
  },

  // 4. Payments
  getPayments: async (supplierId?: string): Promise<Payment[]> => {
    try {
      const data = await fetchJson<Payment[]>(
        supplierId ? `/api/payments?supplierId=${encodeURIComponent(supplierId)}` : '/api/payments'
      );
      return data;
    } catch {
      isUsingLocalFallback = true;
      return clientDb.getPayments(supplierId);
    }
  },

  createPayment: async (data: {
    supplierId: string;
    amount: number;
    paymentMethod: 'cash' | 'vodafone_cash';
    date: string;
    time?: string;
    vodafoneRef?: string;
    linkedDeliveryIds?: string[];
    notes?: string;
    idempotencyKey?: string;
  }): Promise<{ payment: Payment; isDuplicate: boolean }> => {
    try {
      const result = await fetchJson<{ payment: Payment; isDuplicate: boolean }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result;
    } catch {
      isUsingLocalFallback = true;
      return clientDb.createPayment(data);
    }
  },

  // 5. Statement
  getStatement: async (
    supplierId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ movements: StatementMovement[]; summary: StatementSummary }> => {
    try {
      const params = new URLSearchParams();
      if (supplierId) params.append('supplierId', supplierId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      return await fetchJson<{ movements: StatementMovement[]; summary: StatementSummary }>(
        `/api/statement?${params.toString()}`
      );
    } catch {
      isUsingLocalFallback = true;
      const supId = supplierId || clientDb.getSuppliers()[0]?.id;
      const dels = clientDb.getDeliveries(supId);
      const pays = clientDb.getPayments(supId);
      const deds = clientDb.getDeductions(supId);
      return buildChronologicalStatement(dels, pays, startDate, endDate, deds);
    }
  },

  // 6. Dashboard
  getDashboard: async (supplierId?: string): Promise<DashboardStats> => {
    try {
      return await fetchJson<DashboardStats>(
        supplierId ? `/api/dashboard?supplierId=${encodeURIComponent(supplierId)}` : '/api/dashboard'
      );
    } catch {
      isUsingLocalFallback = true;
      const supId = supplierId || clientDb.getSuppliers()[0]?.id;
      const deliveries = clientDb.getDeliveries(supId);
      const payments = clientDb.getPayments(supId);
      const deductions = clientDb.getDeductions(supId);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayDeliveries = deliveries.filter((d) => d.date === todayStr && d.status !== 'cancelled');
      const todayDeliveryValue = round2(todayDeliveries.reduce((sum, d) => sum + d.totalAmount, 0));
      const todayPotatoWeightKg = round2(todayDeliveries.reduce((sum, d) => sum + d.weightKg, 0));
      const todayDeliveriesCount = todayDeliveries.length;
      const todayInitialPaid = round2(todayDeliveries.reduce((sum, d) => sum + d.initialPaid, 0));

      const todayIndependentPayments = payments.filter((p) => p.date === todayStr);
      const todayPaymentsSum = round2(todayIndependentPayments.reduce((sum, p) => sum + p.amount, 0));
      const todayPaid = round2(todayInitialPaid + todayPaymentsSum);
      const todayRemaining = round2(Math.max(0, todayDeliveryValue - todayPaid));

      const statement = buildChronologicalStatement(deliveries, payments, undefined, undefined, deductions);
      const totalCurrentDebt = statement.summary.closingBalance;

      const lastDelivery = deliveries.find((d) => d.status !== 'cancelled');
      const lastPayment = payments[0];
      const lastDeduction = deductions[0];

      return {
        todayDeliveryValue,
        todayPotatoWeightKg,
        todayDeliveriesCount,
        todayPaid,
        todayRemaining,
        totalCurrentDebt,
        totalCashPaidAllTime: statement.summary.totalCashPaid,
        totalVodafonePaidAllTime: statement.summary.totalVodafoneCashPaid,
        totalDiscountsAllTime: statement.summary.totalDiscounts,
        totalWeightAllTime: statement.summary.totalWeightKg,
        lastDelivery,
        lastPayment,
        lastDeduction,
      };
    }
  },

  // 7. Reports
  getReports: async (supplierId?: string): Promise<{
    dailyBreakdown: { date: string; totalWeight: number; totalValue: number; count: number; paid: number }[];
    unpaidDeliveries: Delivery[];
    weightedAvgPrice: number;
    summary: StatementSummary;
    totalDeliveriesCount: number;
    totalPaymentsCount: number;
    totalDeductionsCount: number;
  }> => {
    try {
      return await fetchJson<{
        dailyBreakdown: { date: string; totalWeight: number; totalValue: number; count: number; paid: number }[];
        unpaidDeliveries: Delivery[];
        weightedAvgPrice: number;
        summary: StatementSummary;
        totalDeliveriesCount: number;
        totalPaymentsCount: number;
        totalDeductionsCount: number;
      }>(supplierId ? `/api/reports?supplierId=${encodeURIComponent(supplierId)}` : '/api/reports');
    } catch {
      isUsingLocalFallback = true;
      const supId = supplierId || clientDb.getSuppliers()[0]?.id;
      const deliveries = clientDb.getDeliveries(supId).filter((d) => d.status !== 'cancelled');
      const payments = clientDb.getPayments(supId);
      const deductions = clientDb.getDeductions(supId);

      const dateMap = new Map<
        string,
        { date: string; totalWeight: number; totalValue: number; count: number; paid: number }
      >();

      for (const d of deliveries) {
        const existing = dateMap.get(d.date) || {
          date: d.date,
          totalWeight: 0,
          totalValue: 0,
          count: 0,
          paid: 0,
        };
        existing.totalWeight = round2(existing.totalWeight + d.weightKg);
        existing.totalValue = round2(existing.totalValue + d.totalAmount);
        existing.paid = round2(existing.paid + d.initialPaid);
        existing.count += 1;
        dateMap.set(d.date, existing);
      }

      const dailyBreakdown = Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      const unpaidDeliveries = deliveries.filter((d) => d.remainingAmount > 0);
      const weightedAvgPrice = calculateWeightedAveragePrice(deliveries);
      const statement = buildChronologicalStatement(deliveries, payments, undefined, undefined, deductions);

      return {
        dailyBreakdown,
        unpaidDeliveries,
        weightedAvgPrice,
        summary: statement.summary,
        totalDeliveriesCount: deliveries.length,
        totalPaymentsCount: payments.length,
        totalDeductionsCount: deductions.length,
      };
    }
  },

  // 8. Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    try {
      return await fetchJson<AuditLog[]>('/api/audit-logs');
    } catch {
      isUsingLocalFallback = true;
      return clientDb.getAuditLogs();
    }
  },

  // 9. Backup & Restore & Reset
  getBackupUrl: () => '/api/backup',

  downloadLocalBackup: () => {
    const data = clientDb.getFullBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `al-shami-potato-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  restoreBackup: async (data: AppDatabase): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchJson<{ success: boolean; message: string }>('/api/restore', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      clientDb.restoreBackup(data);
      return res;
    } catch {
      isUsingLocalFallback = true;
      return clientDb.restoreBackup(data);
    }
  },

  resetDemoData: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchJson<{ success: boolean; message: string }>('/api/reset-demo', {
        method: 'POST',
      });
      clientDb.resetToDemoData();
      return res;
    } catch {
      isUsingLocalFallback = true;
      clientDb.resetToDemoData();
      return { success: true, message: 'تمت إعادة تعيين البيانات التجريبية بنجاح' };
    }
  },

  clearDataForProduction: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchJson<{ success: boolean; message: string }>('/api/clear-demo', {
        method: 'POST',
      });
      clientDb.clearAllDataForProduction();
      return res;
    } catch {
      isUsingLocalFallback = true;
      clientDb.clearAllDataForProduction();
      return { success: true, message: 'تم مسح البيانات بنجاح والبدء بحساب نظيف' };
    }
  },
};
