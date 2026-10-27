import { Delivery, Payment, StatementMovement, StatementSummary, Deduction } from '../types/index.ts';

/**
 * Rounds a number to two decimal places accurately to avoid floating point drift.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate total value for a delivery.
 * Equation: Total = Weight (KG) × Price per KG
 */
export function calculateDeliveryTotal(weightKg: number, pricePerKg: number): number {
  if (weightKg <= 0 || pricePerKg <= 0) return 0;
  return round2(weightKg * pricePerKg);
}

/**
 * Calculate remaining amount on delivery.
 */
export function calculateDeliveryRemaining(totalAmount: number, initialPaid: number): number {
  return round2(Math.max(0, totalAmount - Math.max(0, initialPaid)));
}

/**
 * Determine delivery payment status.
 */
export function getDeliveryStatus(totalAmount: number, paidAmount: number, isCancelled = false): 'paid' | 'partial' | 'unpaid' | 'cancelled' {
  if (isCancelled) return 'cancelled';
  if (totalAmount <= 0) return 'paid';
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'unpaid';
}

/**
 * Debt Rollover Calculation (ترحيل المديونيات):
 * Previous Balance + New Delivery Value = Total Due
 * Total Due - Paid Now = Final Remaining
 */
export interface RolloverCalculation {
  previousBalance: number;
  newDeliveryValue: number;
  totalDue: number;
  paidNow: number;
  finalRemaining: number;
  isCreditor: boolean; // إذا كان المدفوع أكبر من المستحق (رصيد دائن للمطعم أو للمورد)
  creditorBalance: number;
}

export function calculateRollover(
  previousBalance: number,
  newDeliveryValue: number,
  paidNow: number
): RolloverCalculation {
  const safePrev = round2(previousBalance);
  const safeDelivery = round2(newDeliveryValue);
  const safePaid = round2(paidNow);
  const totalDue = round2(safePrev + safeDelivery);
  const finalRemaining = round2(totalDue - safePaid);

  const isCreditor = finalRemaining < 0;
  const creditorBalance = isCreditor ? Math.abs(finalRemaining) : 0;

  return {
    previousBalance: safePrev,
    newDeliveryValue: safeDelivery,
    totalDue,
    paidNow: safePaid,
    finalRemaining,
    isCreditor,
    creditorBalance,
  };
}

/**
 * Weighted Average Price per KG:
 * Formula: Total Value of Deliveries ÷ Total Potato Weight
 * Crucial: Does NOT use simple arithmetic mean when weights differ.
 */
export function calculateWeightedAveragePrice(deliveries: Delivery[]): number {
  const activeDeliveries = deliveries.filter((d) => d.status !== 'cancelled' && d.weightKg > 0);
  if (activeDeliveries.length === 0) return 0;

  const totalValue = activeDeliveries.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalWeight = activeDeliveries.reduce((sum, d) => sum + d.weightKg, 0);

  if (totalWeight <= 0) return 0;
  return round2(totalValue / totalWeight);
}

/**
 * Builds chronological ledger & account statement for a supplier.
 */
export function buildChronologicalStatement(
  deliveries: Delivery[],
  payments: Payment[],
  startDate?: string,
  endDate?: string,
  deductions: Deduction[] = []
): { movements: StatementMovement[]; summary: StatementSummary } {
  interface RawEvent {
    id: string;
    date: string;
    time: string;
    sortKey: string;
    type: 'delivery' | 'payment' | 'deduction';
    refNumber: string;
    weightKg?: number;
    pricePerKg?: number;
    debit: number;
    credit: number;
    paymentMethod?: string;
    vodafoneRef?: string;
    reason?: string;
    notes?: string;
    status?: string;
  }

  const events: RawEvent[] = [];

  // 1. Process Deliveries
  for (const d of deliveries) {
    if (d.status === 'cancelled') {
      continue;
    }

    const dTime = d.time || '10:00';
    const sortKey = `${d.date}T${dTime}:00_${d.deliveryNumber}_DEL`;

    // Delivery debit movement (debt incurred)
    events.push({
      id: `mov_del_${d.id}`,
      date: d.date,
      time: dTime,
      sortKey,
      type: 'delivery',
      refNumber: d.deliveryNumber,
      weightKg: d.weightKg,
      pricePerKg: d.pricePerKg,
      debit: d.totalAmount,
      credit: 0,
      paymentMethod: d.paymentMethod,
      vodafoneRef: d.vodafoneRef,
      notes: d.notes,
      status: d.status,
    });

    // If an initial payment was paid at delivery time
    if (d.initialPaid > 0) {
      events.push({
        id: `mov_initpay_${d.id}`,
        date: d.date,
        time: dTime,
        sortKey: `${d.date}T${dTime}:01_${d.deliveryNumber}_PAY`,
        type: 'payment',
        refNumber: `دفع-${d.deliveryNumber}`,
        debit: 0,
        credit: d.initialPaid,
        paymentMethod: d.paymentMethod,
        vodafoneRef: d.vodafoneRef,
        notes: `دفعة وقت التوريد (${d.deliveryNumber})`,
      });
    }
  }

  // 2. Process Independent Payments
  for (const p of payments) {
    const pTime = p.time || '12:00';
    const sortKey = `${p.date}T${pTime}:00_${p.paymentNumber}_PAY`;

    events.push({
      id: `mov_pay_${p.id}`,
      date: p.date,
      time: pTime,
      sortKey,
      type: 'payment',
      refNumber: p.paymentNumber,
      debit: 0,
      credit: p.amount,
      paymentMethod: p.paymentMethod,
      vodafoneRef: p.vodafoneRef,
      notes: p.notes,
    });
  }

  // 3. Process Deductions (الخصومات والتسويات الدائنة)
  for (const ded of deductions) {
    const dedTime = ded.time || '13:00';
    const sortKey = `${ded.date}T${dedTime}:00_${ded.deductionNumber}_DED`;

    events.push({
      id: `mov_ded_${ded.id}`,
      date: ded.date,
      time: dedTime,
      sortKey,
      type: 'deduction',
      refNumber: ded.deductionNumber,
      debit: 0,
      credit: ded.amount,
      reason: ded.reason,
      notes: ded.notes ? `${ded.reason} (${ded.notes})` : ded.reason,
    });
  }

  // Sort events chronologically
  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Calculate opening balance before startDate
  let runningBalance = 0;
  let openingBalance = 0;

  const filteredMovements: StatementMovement[] = [];

  let totalWeightKg = 0;
  let totalDeliveryValue = 0;
  let totalCashPaid = 0;
  let totalVodafoneCashPaid = 0;
  let totalPaid = 0;
  let totalDiscounts = 0;
  let deliveriesCount = 0;
  let paymentsCount = 0;
  let deductionsCount = 0;

  for (const ev of events) {
    runningBalance = round2(runningBalance + ev.debit - ev.credit);

    const isBeforeStart = startDate ? ev.date < startDate : false;
    const isAfterEnd = endDate ? ev.date > endDate : false;

    if (isBeforeStart) {
      openingBalance = runningBalance;
      continue;
    }

    if (isAfterEnd) {
      continue;
    }

    // Inside selected date window
    if (ev.type === 'delivery') {
      totalWeightKg = round2(totalWeightKg + (ev.weightKg || 0));
      totalDeliveryValue = round2(totalDeliveryValue + ev.debit);
      deliveriesCount++;
    } else if (ev.type === 'deduction') {
      totalDiscounts = round2(totalDiscounts + ev.credit);
      deductionsCount++;
    } else {
      totalPaid = round2(totalPaid + ev.credit);
      paymentsCount++;
      if (ev.paymentMethod === 'vodafone_cash') {
        totalVodafoneCashPaid = round2(totalVodafoneCashPaid + ev.credit);
      } else {
        totalCashPaid = round2(totalCashPaid + ev.credit);
      }
    }

    filteredMovements.push({
      id: ev.id,
      timestamp: ev.sortKey,
      date: ev.date,
      time: ev.time,
      type: ev.type,
      refNumber: ev.refNumber,
      weightKg: ev.weightKg,
      pricePerKg: ev.pricePerKg,
      debit: ev.debit,
      credit: ev.credit,
      balanceAfter: runningBalance,
      paymentMethod: ev.paymentMethod,
      vodafoneRef: ev.vodafoneRef,
      reason: ev.reason,
      notes: ev.notes,
      status: ev.status,
    });
  }

  const closingBalance = runningBalance;
  const weightedAvgPrice = totalWeightKg > 0 ? round2(totalDeliveryValue / totalWeightKg) : 0;

  const summary: StatementSummary = {
    openingBalance: round2(openingBalance),
    totalWeightKg: round2(totalWeightKg),
    totalDeliveryValue: round2(totalDeliveryValue),
    totalCashPaid: round2(totalCashPaid),
    totalVodafoneCashPaid: round2(totalVodafoneCashPaid),
    totalPaid: round2(totalPaid),
    totalDiscounts: round2(totalDiscounts),
    closingBalance: round2(closingBalance),
    weightedAvgPrice,
    movementsCount: filteredMovements.length,
    deliveriesCount,
    paymentsCount,
    deductionsCount,
  };

  return { movements: filteredMovements, summary };
}

/**
 * Format currency in Egyptian Pounds (ج.م)
 */
export function formatCurrency(amount: number): string {
  const rounded = round2(amount);
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
  return `${formatted} ج.م`;
}

/**
 * Format plain number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 2,
  }).format(round2(num));
}

/**
 * Format weight in Kilograms
 */
export function formatWeight(kg: number): string {
  return `${formatNumber(kg)} كجم`;
}

/**
 * Format date in Arabic string
 */
export function formatDateArabic(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}
