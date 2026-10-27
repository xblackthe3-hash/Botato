export type PaymentMethod = 'cash' | 'vodafone_cash' | 'unpaid';

export type DeliveryStatus = 'paid' | 'partial' | 'unpaid' | 'cancelled';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  supplierId: string;
  supplierName: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  weightKg: number;
  pricePerKg: number;
  totalAmount: number;
  initialPaid: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  vodafoneRef?: string;
  status: DeliveryStatus;
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  supplierId: string;
  supplierName: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  amount: number;
  paymentMethod: 'cash' | 'vodafone_cash';
  vodafoneRef?: string;
  linkedDeliveryIds?: string[];
  notes?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface Deduction {
  id: string;
  deductionNumber: string; // e.g. DED-1001
  supplierId: string;
  supplierName: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  amount: number;
  reason: string; // سبب الخصم (إلزامي)
  linkedDeliveryId?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action:
    | 'create_delivery'
    | 'update_delivery'
    | 'cancel_delivery'
    | 'create_payment'
    | 'create_deduction'
    | 'delete_supplier'
    | 'restore_backup'
    | 'system_reset';
  entityType: 'delivery' | 'payment' | 'deduction' | 'supplier' | 'backup';
  entityId: string;
  details: string;
}

export interface StatementMovement {
  id: string;
  timestamp: string;
  date: string;
  time?: string;
  type: 'delivery' | 'payment' | 'deduction';
  refNumber: string;
  weightKg?: number;
  pricePerKg?: number;
  debit: number; // المبلغ المستحق (قيمة التوريدة)
  credit: number; // المبلغ المدفوع أو المخصوم
  balanceAfter: number; // الرصيد التراكمي بعد الحركة
  paymentMethod?: string;
  vodafoneRef?: string;
  reason?: string;
  notes?: string;
  status?: string;
}

export interface StatementSummary {
  openingBalance: number;
  totalWeightKg: number;
  totalDeliveryValue: number;
  totalCashPaid: number;
  totalVodafoneCashPaid: number;
  totalPaid: number;
  totalDiscounts: number;
  closingBalance: number;
  weightedAvgPrice: number;
  movementsCount: number;
  deliveriesCount: number;
  paymentsCount: number;
  deductionsCount: number;
}

export interface DashboardStats {
  todayDeliveryValue: number;
  todayPotatoWeightKg: number;
  todayDeliveriesCount: number;
  todayPaid: number;
  todayRemaining: number;
  totalCurrentDebt: number;
  totalCashPaidAllTime: number;
  totalVodafonePaidAllTime: number;
  totalDiscountsAllTime: number;
  totalWeightAllTime: number;
  lastDelivery?: Delivery;
  lastPayment?: Payment;
  lastDeduction?: Deduction;
}

export interface AppDatabase {
  suppliers: Supplier[];
  deliveries: Delivery[];
  payments: Payment[];
  deductions: Deduction[];
  auditLogs: AuditLog[];
  nextDeliverySeq: number;
  nextPaymentSeq: number;
  nextDeductionSeq: number;
}
