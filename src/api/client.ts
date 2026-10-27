import type {
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

export function isLocalDatabaseMode(): boolean {
  return true;
}

export const api = {
  // Recover from IndexedDB if LocalStorage was ever cleared
  recoverIfNeeded: async (): Promise<boolean> => {
    return clientDb.recoverFromIndexedDB();
  },

  getActiveSupplierId: (): string => {
    return clientDb.getActiveSupplierId();
  },

  setActiveSupplierId: (id: string): void => {
    clientDb.setActiveSupplierId(id);
  },

  // 1. Suppliers (Offline-First Authoritative)
  getSuppliers: async (): Promise<Supplier[]> => {
    return clientDb.getSuppliers();
  },

  addSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
    if (!data.name || !data.name.trim()) {
      throw new Error('يرجى إدخال اسم تاجر البطاطس');
    }
    return clientDb.addSupplier(data);
  },

  updateSupplier: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
    const updated = clientDb.updateSupplier(id, data);
    if (!updated) throw new Error('المورد غير موجود');
    return updated;
  },

  deleteSupplier: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = clientDb.deleteSupplier(id);
    if (!res.success) throw new Error(res.message);
    return res;
  },

  // 2. Deductions (الخصومات)
  getDeductions: async (supplierId?: string): Promise<Deduction[]> => {
    return clientDb.getDeductions(supplierId);
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
    if (!data.supplierId) throw new Error('يرجى اختيار المورد');
    if (!data.amount || Number(data.amount) <= 0) throw new Error('يجب أن يكون مبلغ الخصم أكبر من الصفر');
    if (!data.reason || !data.reason.trim()) throw new Error('سبب الخصم إلزامي للتوثيق المحاسبي');
    return clientDb.createDeduction(data);
  },

  // 3. Deliveries (التوريدات)
  getDeliveries: async (supplierId?: string): Promise<Delivery[]> => {
    return clientDb.getDeliveries(supplierId);
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
    if (!data.supplierId) throw new Error('يرجى اختيار المورد');
    if (!data.weightKg || Number(data.weightKg) <= 0) throw new Error('يجب أن يكون الوزن أكبر من الصفر');
    if (!data.pricePerKg || Number(data.pricePerKg) <= 0) throw new Error('يجب أن يكون سعر الكيلو أكبر من الصفر');
    return clientDb.createDelivery(data);
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
    const updated = clientDb.updateDelivery(id, updates);
    if (!updated) throw new Error('التوريدة غير موجودة');
    return updated;
  },

  cancelDelivery: async (id: string, reason: string): Promise<Delivery> => {
    if (!reason || !reason.trim()) throw new Error('يرجى كتابة سبب الإلغاء للتوثيق المحاسبي');
    const cancelled = clientDb.cancelDelivery(id, reason.trim());
    if (!cancelled) throw new Error('التوريدة غير موجودة');
    return cancelled;
  },

  // 4. Payments (الدفعات)
  getPayments: async (supplierId?: string): Promise<Payment[]> => {
    return clientDb.getPayments(supplierId);
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
    if (!data.supplierId) throw new Error('يرجى اختيار المورد');
    if (!data.amount || Number(data.amount) <= 0) throw new Error('يجب أن يكون مبلغ الدفعة أكبر من الصفر');
    return clientDb.createPayment(data);
  },

  // 5. Statement (كشف الحساب)
  getStatement: async (
    supplierId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ movements: StatementMovement[]; summary: StatementSummary }> => {
    const supId = supplierId || clientDb.getSuppliers()[0]?.id;
    if (!supId) {
      return buildChronologicalStatement([], [], startDate, endDate, []);
    }
    const dels = clientDb.getDeliveries(supId);
    const pays = clientDb.getPayments(supId);
    const deds = clientDb.getDeductions(supId);
    return buildChronologicalStatement(dels, pays, startDate, endDate, deds);
  },

  // 6. Dashboard (لوحة التحكم)
  getDashboard: async (supplierId?: string): Promise<DashboardStats> => {
    const supId = supplierId || clientDb.getSuppliers()[0]?.id;
    if (!supId) {
      return {
        todayDeliveryValue: 0,
        todayPotatoWeightKg: 0,
        todayDeliveriesCount: 0,
        todayPaid: 0,
        todayRemaining: 0,
        totalCurrentDebt: 0,
        totalCashPaidAllTime: 0,
        totalVodafonePaidAllTime: 0,
        totalDiscountsAllTime: 0,
        totalWeightAllTime: 0,
        lastDelivery: undefined,
        lastPayment: undefined,
        lastDeduction: undefined,
      };
    }

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
  },

  // 7. Reports (التقارير)
  getReports: async (supplierId?: string): Promise<{
    dailyBreakdown: { date: string; totalWeight: number; totalValue: number; count: number; paid: number }[];
    unpaidDeliveries: Delivery[];
    weightedAvgPrice: number;
    summary: StatementSummary;
    totalDeliveriesCount: number;
    totalPaymentsCount: number;
    totalDeductionsCount: number;
  }> => {
    const supId = supplierId || clientDb.getSuppliers()[0]?.id;
    if (!supId) {
      return {
        dailyBreakdown: [],
        unpaidDeliveries: [],
        weightedAvgPrice: 0,
        summary: buildChronologicalStatement([], [], undefined, undefined, []).summary,
        totalDeliveriesCount: 0,
        totalPaymentsCount: 0,
        totalDeductionsCount: 0,
      };
    }

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
  },

  // 8. Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    return clientDb.getAuditLogs();
  },

  // 9. Backup & Restore & Reset
  getBackupUrl: () => '#',

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
    return clientDb.restoreBackup(data);
  },

  resetDemoData: async (): Promise<{ success: boolean; message: string }> => {
    clientDb.resetToDemoData();
    return { success: true, message: 'تمت إعادة تعيين البيانات التجريبية بنجاح' };
  },

  clearDataForProduction: async (): Promise<{ success: boolean; message: string }> => {
    clientDb.clearAllDataForProduction();
    return { success: true, message: 'تم تصفير النظام بالكامل والبدء بحساب نظيف' };
  },
};
