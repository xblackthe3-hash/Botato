import { AppDatabase, Delivery, Payment, Supplier, AuditLog, Deduction } from '../types/index.ts';
import {
  round2,
  calculateDeliveryTotal,
  calculateDeliveryRemaining,
  getDeliveryStatus,
  buildChronologicalStatement,
  calculateWeightedAveragePrice,
} from './accounting.ts';

const STORAGE_KEY = 'al_shami_potato_accounting_v1';

export function getDefaultClientDatabase(): AppDatabase {
  const defaultSupplier: Supplier = {
    id: 'sup-1',
    name: 'الحاج رضوان - مورد بطاطس الشامي',
    phone: '01012345678',
    address: 'سوق الجملة المركزي - عنبر الخضار',
    notes: 'المورد المعتمد لتوريد بطاطس التحمير (سبونتا وهيرميس) لمطعم الشامي',
    startDate: '2026-10-15',
    createdAt: new Date('2026-10-15T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-15T08:00:00Z').toISOString(),
  };

  const sampleDeliveries: Delivery[] = [
    {
      id: 'del-1',
      deliveryNumber: 'DEL-1001',
      supplierId: 'sup-1',
      supplierName: defaultSupplier.name,
      date: '2026-10-24',
      time: '07:30',
      weightKg: 100,
      pricePerKg: 24.0,
      totalAmount: 2400.0,
      initialPaid: 2400.0,
      remainingAmount: 0,
      paymentMethod: 'cash',
      status: 'paid',
      notes: 'توريدة صباحية - بطاطس تحمير فرز أول',
      createdAt: new Date('2026-10-24T07:30:00Z').toISOString(),
      updatedAt: new Date('2026-10-24T07:30:00Z').toISOString(),
    },
    {
      id: 'del-2',
      deliveryNumber: 'DEL-1002',
      supplierId: 'sup-1',
      supplierName: defaultSupplier.name,
      date: '2026-10-25',
      time: '08:00',
      weightKg: 150,
      pricePerKg: 25.0,
      totalAmount: 3750.0,
      initialPaid: 2000.0,
      remainingAmount: 1750.0,
      paymentMethod: 'cash',
      status: 'partial',
      notes: 'توريدة العصر - تم سداد 2000 نقداً والباقي آجل',
      createdAt: new Date('2026-10-25T08:00:00Z').toISOString(),
      updatedAt: new Date('2026-10-25T08:00:00Z').toISOString(),
    },
    {
      id: 'del-3',
      deliveryNumber: 'DEL-1003',
      supplierId: 'sup-1',
      supplierName: defaultSupplier.name,
      date: '2026-10-26',
      time: '09:15',
      weightKg: 200,
      pricePerKg: 23.5,
      totalAmount: 4700.0,
      initialPaid: 3000.0,
      remainingAmount: 1700.0,
      paymentMethod: 'vodafone_cash',
      vodafoneRef: 'VF-998812',
      status: 'partial',
      notes: 'توريدة اليوم بسعر 23.50 للكيلو - محولة فودافون كاش',
      createdAt: new Date('2026-10-26T09:15:00Z').toISOString(),
      updatedAt: new Date('2026-10-26T09:15:00Z').toISOString(),
    },
  ];

  const samplePayments: Payment[] = [
    {
      id: 'pay-1',
      paymentNumber: 'PAY-1001',
      supplierId: 'sup-1',
      supplierName: defaultSupplier.name,
      date: '2026-10-26',
      time: '13:00',
      amount: 1000.0,
      paymentMethod: 'vodafone_cash',
      vodafoneRef: 'VF-771239',
      linkedDeliveryIds: ['del-2'],
      notes: 'دفعة سداد حساب من المتبقي السابق لفاتورة DEL-1002',
      idempotencyKey: 'init-pay-1',
      createdAt: new Date('2026-10-26T13:00:00Z').toISOString(),
    },
  ];

  const sampleDeductions: Deduction[] = [
    {
      id: 'ded-1',
      deductionNumber: 'DED-1001',
      supplierId: 'sup-1',
      supplierName: defaultSupplier.name,
      date: '2026-10-26',
      time: '14:00',
      amount: 250,
      reason: 'بطاطس تالفة ومعيبة بالفرز 10 كجم',
      notes: 'تم الاتفاق مع المورد بعد الفحص',
      createdAt: new Date('2026-10-26T14:00:00Z').toISOString(),
    },
  ];

  const initialAudit: AuditLog[] = [
    {
      id: 'aud-1',
      timestamp: new Date('2026-10-24T07:30:00Z').toISOString(),
      action: 'create_delivery',
      entityType: 'delivery',
      entityId: 'del-1',
      details: 'تسجيل توريدة رقم DEL-1001 بوزن 100 كجم وقيمة 2400 ج.م',
    },
    {
      id: 'aud-2',
      timestamp: new Date('2026-10-25T08:00:00Z').toISOString(),
      action: 'create_delivery',
      entityType: 'delivery',
      entityId: 'del-2',
      details: 'تسجيل توريدة رقم DEL-1002 بوزن 150 كجم وقيمة 3750 ج.م ومدفوع 2000 ج.م',
    },
    {
      id: 'aud-3',
      timestamp: new Date('2026-10-26T09:15:00Z').toISOString(),
      action: 'create_delivery',
      entityType: 'delivery',
      entityId: 'del-3',
      details: 'تسجيل توريدة رقم DEL-1003 بوزن 200 كجم وقيمة 4700 ج.م ومدفوع 3000 ج.م',
    },
    {
      id: 'aud-4',
      timestamp: new Date('2026-10-26T13:00:00Z').toISOString(),
      action: 'create_payment',
      entityType: 'payment',
      entityId: 'pay-1',
      details: 'تسجيل دفعة رقم PAY-1001 بمبلغ 1000 ج.م فودافون كاش',
    },
  ];

  return {
    suppliers: [defaultSupplier],
    deliveries: sampleDeliveries,
    payments: samplePayments,
    deductions: sampleDeductions,
    auditLogs: initialAudit,
    nextDeliverySeq: 1004,
    nextPaymentSeq: 1002,
    nextDeductionSeq: 1002,
  };
}

class ClientDatabaseManager {
  private memoryDb: AppDatabase | null = null;

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private load(): AppDatabase {
    if (this.memoryDb) return this.memoryDb;

    if (this.isBrowser()) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.suppliers && parsed.deliveries) {
            if (!parsed.deductions) parsed.deductions = [];
            if (!parsed.nextDeductionSeq) parsed.nextDeductionSeq = 1001;
            this.memoryDb = parsed;
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Could not read from localStorage, using defaults:', e);
      }
    }

    const initial = getDefaultClientDatabase();
    this.memoryDb = initial;
    this.save(initial);
    return initial;
  }

  private save(data: AppDatabase) {
    this.memoryDb = data;
    if (this.isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }
    }
  }

  // Sync external database state (e.g. from server) into local storage
  syncFromRemote(remoteDb: Partial<AppDatabase>) {
    const current = this.load();
    const merged: AppDatabase = {
      suppliers: remoteDb.suppliers || current.suppliers,
      deliveries: remoteDb.deliveries || current.deliveries,
      payments: remoteDb.payments || current.payments,
      deductions: remoteDb.deductions || current.deductions,
      auditLogs: remoteDb.auditLogs || current.auditLogs,
      nextDeliverySeq: remoteDb.nextDeliverySeq || current.nextDeliverySeq,
      nextPaymentSeq: remoteDb.nextPaymentSeq || current.nextPaymentSeq,
      nextDeductionSeq: remoteDb.nextDeductionSeq || current.nextDeductionSeq,
    };
    this.save(merged);
  }

  getSuppliers(): Supplier[] {
    return this.load().suppliers;
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.load().suppliers.find((s) => s.id === id);
  }

  addSupplier(data: Partial<Supplier>): Supplier {
    const db = this.load();
    const id = `sup-${Date.now()}`;
    const now = new Date().toISOString();
    const newSup: Supplier = {
      id,
      name: data.name?.trim() || 'مورد جديد',
      phone: data.phone || '',
      address: data.address || '',
      notes: data.notes || '',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now,
    };
    db.suppliers.push(newSup);
    this.addAuditLog('create_delivery', 'supplier', id, `إضافة مورد جديد: ${newSup.name}`);
    this.save(db);
    return newSup;
  }

  updateSupplier(id: string, data: Partial<Supplier>): Supplier | null {
    const db = this.load();
    const idx = db.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    db.suppliers[idx] = {
      ...db.suppliers[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.save(db);
    return db.suppliers[idx];
  }

  deleteSupplier(id: string): { success: boolean; message: string } {
    const db = this.load();
    const idx = db.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) {
      return { success: false, message: 'المورد غير موجود' };
    }
    const supName = db.suppliers[idx].name;
    db.suppliers.splice(idx, 1);
    db.deliveries = db.deliveries.filter((d) => d.supplierId !== id);
    db.payments = db.payments.filter((p) => p.supplierId !== id);
    db.deductions = (db.deductions || []).filter((ded) => ded.supplierId !== id);

    this.addAuditLog('delete_supplier', 'supplier', id, `حذف المورد: ${supName} وحذف كافة سجلاته المالية`);
    this.save(db);
    return { success: true, message: `تم حذف المورد ${supName} بنجاح` };
  }

  getDeductions(supplierId?: string): Deduction[] {
    const db = this.load();
    let list = db.deductions || [];
    if (supplierId) {
      list = list.filter((d) => d.supplierId === supplierId);
    }
    return [...list].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return (b.deductionNumber || '').localeCompare(a.deductionNumber || '');
    });
  }

  createDeduction(data: {
    supplierId: string;
    amount: number;
    reason: string;
    date: string;
    time?: string;
    linkedDeliveryId?: string;
    notes?: string;
  }): Deduction {
    const db = this.load();
    const supplier = this.getSupplierById(data.supplierId) || db.suppliers[0];
    const seq = db.nextDeductionSeq || 1001;
    db.nextDeductionSeq = seq + 1;

    const deductionNumber = `DED-${seq}`;
    const id = `ded-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const amount = round2(Math.max(0.01, Number(data.amount) || 0));

    const newDeduction: Deduction = {
      id,
      deductionNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: data.date,
      time: data.time || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false }),
      amount,
      reason: data.reason.trim(),
      linkedDeliveryId: data.linkedDeliveryId,
      notes: data.notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    if (!db.deductions) db.deductions = [];
    db.deductions.unshift(newDeduction);
    this.addAuditLog(
      'create_deduction',
      'deduction',
      id,
      `تسجيل خصم مالي ${deductionNumber} بمبلغ ${amount} ج.م من حساب ${supplier.name} - السبب: ${data.reason}`
    );
    this.save(db);
    return newDeduction;
  }

  getDeliveries(supplierId?: string): Delivery[] {
    const db = this.load();
    let list = db.deliveries;
    if (supplierId) {
      list = list.filter((d) => d.supplierId === supplierId);
    }
    return [...list].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return (b.deliveryNumber || '').localeCompare(a.deliveryNumber || '');
    });
  }

  createDelivery(data: {
    supplierId: string;
    date: string;
    time?: string;
    weightKg: number;
    pricePerKg: number;
    initialPaid?: number;
    paymentMethod: 'cash' | 'vodafone_cash' | 'unpaid';
    vodafoneRef?: string;
    notes?: string;
  }): Delivery {
    const db = this.load();
    const supplier = this.getSupplierById(data.supplierId) || db.suppliers[0];
    const deliverySeq = db.nextDeliverySeq || 1001;
    db.nextDeliverySeq = deliverySeq + 1;

    const deliveryNumber = `DEL-${deliverySeq}`;
    const id = `del-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const weightKg = round2(Math.max(0.1, Number(data.weightKg) || 0));
    const pricePerKg = round2(Math.max(0.01, Number(data.pricePerKg) || 0));
    const totalAmount = calculateDeliveryTotal(weightKg, pricePerKg);
    const initialPaid = round2(Math.min(totalAmount, Math.max(0, Number(data.initialPaid) || 0)));
    const remainingAmount = calculateDeliveryRemaining(totalAmount, initialPaid);
    const status = getDeliveryStatus(totalAmount, initialPaid, false);

    const now = new Date().toISOString();
    const newDelivery: Delivery = {
      id,
      deliveryNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: data.date,
      time: data.time || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false }),
      weightKg,
      pricePerKg,
      totalAmount,
      initialPaid,
      remainingAmount,
      paymentMethod: data.paymentMethod,
      vodafoneRef: data.vodafoneRef || '',
      status,
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    db.deliveries.unshift(newDelivery);
    this.addAuditLog(
      'create_delivery',
      'delivery',
      id,
      `تسجيل توريدة ${deliveryNumber} بوزن ${weightKg} كجم بسعر ${pricePerKg} ج.م (إجمالي: ${totalAmount} ج.م، مدفوع: ${initialPaid} ج.م)`
    );
    this.save(db);
    return newDelivery;
  }

  updateDelivery(
    id: string,
    updates: {
      weightKg?: number;
      pricePerKg?: number;
      notes?: string;
      date?: string;
      time?: string;
    }
  ): Delivery | null {
    const db = this.load();
    const idx = db.deliveries.findIndex((d) => d.id === id);
    if (idx === -1) return null;

    const current = db.deliveries[idx];
    const weightKg = updates.weightKg !== undefined ? round2(updates.weightKg) : current.weightKg;
    const pricePerKg = updates.pricePerKg !== undefined ? round2(updates.pricePerKg) : current.pricePerKg;
    const totalAmount = calculateDeliveryTotal(weightKg, pricePerKg);
    const initialPaid = Math.min(totalAmount, current.initialPaid);
    const remainingAmount = calculateDeliveryRemaining(totalAmount, initialPaid);
    const status = getDeliveryStatus(totalAmount, initialPaid, current.status === 'cancelled');

    const updated: Delivery = {
      ...current,
      weightKg,
      pricePerKg,
      totalAmount,
      initialPaid,
      remainingAmount,
      status,
      notes: updates.notes !== undefined ? updates.notes : current.notes,
      date: updates.date || current.date,
      time: updates.time || current.time,
      updatedAt: new Date().toISOString(),
    };

    db.deliveries[idx] = updated;
    this.addAuditLog(
      'update_delivery',
      'delivery',
      id,
      `تعديل توريدة ${current.deliveryNumber}: وزن ${weightKg} كجم، سعر ${pricePerKg} ج.م، إجمالي جديد ${totalAmount} ج.م`
    );
    this.save(db);
    return updated;
  }

  cancelDelivery(id: string, reason: string): Delivery | null {
    const db = this.load();
    const idx = db.deliveries.findIndex((d) => d.id === id);
    if (idx === -1) return null;

    const current = db.deliveries[idx];
    const updated: Delivery = {
      ...current,
      status: 'cancelled',
      cancellationReason: reason,
      updatedAt: new Date().toISOString(),
    };

    db.deliveries[idx] = updated;
    this.addAuditLog('cancel_delivery', 'delivery', id, `إلغاء التوريدة ${current.deliveryNumber} بسبب: ${reason}`);
    this.save(db);
    return updated;
  }

  getPayments(supplierId?: string): Payment[] {
    const db = this.load();
    let list = db.payments;
    if (supplierId) {
      list = list.filter((p) => p.supplierId === supplierId);
    }
    return [...list].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return (b.paymentNumber || '').localeCompare(a.paymentNumber || '');
    });
  }

  createPayment(data: {
    supplierId: string;
    amount: number;
    paymentMethod: 'cash' | 'vodafone_cash';
    date: string;
    time?: string;
    vodafoneRef?: string;
    linkedDeliveryIds?: string[];
    notes?: string;
    idempotencyKey?: string;
  }): { payment: Payment; isDuplicate: boolean } {
    const db = this.load();
    if (data.idempotencyKey) {
      const existing = db.payments.find((p) => p.idempotencyKey === data.idempotencyKey);
      if (existing) {
        return { payment: existing, isDuplicate: true };
      }
    }

    const supplier = this.getSupplierById(data.supplierId) || db.suppliers[0];
    const paymentSeq = db.nextPaymentSeq || 1001;
    db.nextPaymentSeq = paymentSeq + 1;

    const paymentNumber = `PAY-${paymentSeq}`;
    const id = `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const amount = round2(Math.max(0.01, Number(data.amount) || 0));

    const newPayment: Payment = {
      id,
      paymentNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: data.date,
      time: data.time || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false }),
      amount,
      paymentMethod: data.paymentMethod,
      vodafoneRef: data.vodafoneRef || '',
      linkedDeliveryIds: data.linkedDeliveryIds || [],
      notes: data.notes || '',
      idempotencyKey: data.idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    db.payments.unshift(newPayment);
    this.addAuditLog(
      'create_payment',
      'payment',
      id,
      `تسجيل دفعة مالية ${paymentNumber} بمبلغ ${amount} ج.م طريقة (${data.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : 'نقدي'}) للمورد ${supplier.name}`
    );
    this.save(db);
    return { payment: newPayment, isDuplicate: false };
  }

  getAuditLogs(): AuditLog[] {
    return this.load().auditLogs;
  }

  private addAuditLog(
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string
  ) {
    const db = this.load();
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityId,
      details,
    };
    db.auditLogs.unshift(log);
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }
  }

  getFullBackup(): AppDatabase {
    return this.load();
  }

  restoreBackup(backupData: AppDatabase): { success: boolean; message: string } {
    if (!backupData || !Array.isArray(backupData.suppliers) || !Array.isArray(backupData.deliveries)) {
      return { success: false, message: 'ملف النسخة الاحتياطية غير صالح أو تالف.' };
    }
    const cleanDb: AppDatabase = {
      suppliers: backupData.suppliers,
      deliveries: backupData.deliveries,
      payments: backupData.payments || [],
      deductions: backupData.deductions || [],
      auditLogs: backupData.auditLogs || [],
      nextDeliverySeq: backupData.nextDeliverySeq || 1001,
      nextPaymentSeq: backupData.nextPaymentSeq || 1001,
      nextDeductionSeq: backupData.nextDeductionSeq || 1001,
    };
    this.save(cleanDb);
    this.addAuditLog('restore_backup', 'backup', 'restore', 'تمت استعادة نسخة احتياطية بنجاح.');
    return { success: true, message: 'تمت استعادة البيانات بنجاح.' };
  }

  resetToDemoData() {
    const initial = getDefaultClientDatabase();
    this.save(initial);
  }

  clearAllDataForProduction() {
    const current = this.load();
    const defaultSup = current.suppliers[0] || {
      id: 'sup-1',
      name: 'تاجر بطاطس الشامي الرئيسي',
      startDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const emptyDb: AppDatabase = {
      suppliers: [defaultSup],
      deliveries: [],
      payments: [],
      deductions: [],
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'system_reset',
          entityType: 'backup',
          entityId: 'clear',
          details: 'تم مسح البيانات التجريبية وبدء دفتر الحسابات النظيف للتشغيل الفعلي.',
        },
      ],
      nextDeliverySeq: 1001,
      nextPaymentSeq: 1001,
      nextDeductionSeq: 1001,
    };
    this.save(emptyDb);
  }
}

export const clientDb = new ClientDatabaseManager();
