import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeliveryTotal,
  calculateDeliveryRemaining,
  getDeliveryStatus,
  calculateRollover,
  calculateWeightedAveragePrice,
  buildChronologicalStatement,
  round2,
} from './accounting.ts';
import { Delivery, Payment } from '../types/index.ts';

test('calculateDeliveryTotal correctly calculates weight * price', () => {
  // Example from prompt: 150 kg * 25 EGP = 3750 EGP
  assert.equal(calculateDeliveryTotal(150, 25), 3750);

  // Decimal calculations: 200 kg * 23.50 EGP = 4700 EGP
  assert.equal(calculateDeliveryTotal(200, 23.5), 4700);

  // Fractions: 125.75 kg * 24.25 EGP = 3049.4375 -> rounded to 3049.44
  assert.equal(calculateDeliveryTotal(125.75, 24.25), 3049.44);

  // Non-positive returns 0
  assert.equal(calculateDeliveryTotal(0, 25), 0);
  assert.equal(calculateDeliveryTotal(-10, 25), 0);
});

test('calculateDeliveryRemaining computes remaining balance', () => {
  // 3750 total, 2000 initial paid -> 1750 remaining
  assert.equal(calculateDeliveryRemaining(3750, 2000), 1750);
  // fully paid
  assert.equal(calculateDeliveryRemaining(3750, 3750), 0);
  // unpaid
  assert.equal(calculateDeliveryRemaining(3750, 0), 3750);
});

test('getDeliveryStatus determines status accurately', () => {
  assert.equal(getDeliveryStatus(3750, 3750), 'paid');
  assert.equal(getDeliveryStatus(3750, 2000), 'partial');
  assert.equal(getDeliveryStatus(3750, 0), 'unpaid');
  assert.equal(getDeliveryStatus(3750, 0, true), 'cancelled');
});

test('calculateRollover handles debt carryover and overpayments', () => {
  // Prompt example:
  // Previous balance: 1,750
  // New delivery: 200 kg @ 23.50 = 4,700
  // Total due: 1,750 + 4,700 = 6,450
  // Paid: 3,000
  // Remaining: 3,450
  const res = calculateRollover(1750, 4700, 3000);
  assert.equal(res.previousBalance, 1750);
  assert.equal(res.newDeliveryValue, 4700);
  assert.equal(res.totalDue, 6450);
  assert.equal(res.paidNow, 3000);
  assert.equal(res.finalRemaining, 3450);
  assert.equal(res.isCreditor, false);
  assert.equal(res.creditorBalance, 0);

  // Test overpayment scenario: total due 1,000, paid 1,500 -> creditor 500
  const overpay = calculateRollover(0, 1000, 1500);
  assert.equal(overpay.totalDue, 1000);
  assert.equal(overpay.finalRemaining, -500);
  assert.equal(overpay.isCreditor, true);
  assert.equal(overpay.creditorBalance, 500);
});

test('calculateWeightedAveragePrice calculates weight-proportional price accurately', () => {
  // Prompt requirement: Weighted average, not simple arithmetic average
  // Delivery 1: 100 kg @ 24 = 2,400
  // Delivery 2: 150 kg @ 25 = 3,750
  // Delivery 3: 200 kg @ 23.50 = 4,700
  // Total weight: 450 kg
  // Total value: 10,850 EGP
  // Weighted avg = 10,850 / 450 = 24.1111... -> 24.11
  const deliveries: Delivery[] = [
    {
      id: 'd1',
      deliveryNumber: 'DEL-1',
      supplierId: 's1',
      supplierName: 'مورد',
      date: '2026-10-20',
      weightKg: 100,
      pricePerKg: 24,
      totalAmount: 2400,
      initialPaid: 0,
      remainingAmount: 2400,
      paymentMethod: 'unpaid',
      status: 'unpaid',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'd2',
      deliveryNumber: 'DEL-2',
      supplierId: 's1',
      supplierName: 'مورد',
      date: '2026-10-21',
      weightKg: 150,
      pricePerKg: 25,
      totalAmount: 3750,
      initialPaid: 0,
      remainingAmount: 3750,
      paymentMethod: 'unpaid',
      status: 'unpaid',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'd3',
      deliveryNumber: 'DEL-3',
      supplierId: 's1',
      supplierName: 'مورد',
      date: '2026-10-22',
      weightKg: 200,
      pricePerKg: 23.5,
      totalAmount: 4700,
      initialPaid: 0,
      remainingAmount: 4700,
      paymentMethod: 'unpaid',
      status: 'unpaid',
      createdAt: '',
      updatedAt: '',
    },
  ];

  const weightedAvg = calculateWeightedAveragePrice(deliveries);
  assert.equal(weightedAvg, 24.11);
});

test('buildChronologicalStatement generates movements and summary correctly', () => {
  const deliveries: Delivery[] = [
    {
      id: 'd1',
      deliveryNumber: 'DEL-1001',
      supplierId: 's1',
      supplierName: 'مورد',
      date: '2026-10-20',
      time: '08:00',
      weightKg: 150,
      pricePerKg: 25,
      totalAmount: 3750,
      initialPaid: 2000,
      remainingAmount: 1750,
      paymentMethod: 'cash',
      status: 'partial',
      createdAt: '',
      updatedAt: '',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'p1',
      paymentNumber: 'PAY-1001',
      supplierId: 's1',
      supplierName: 'مورد',
      date: '2026-10-21',
      time: '14:00',
      amount: 1000,
      paymentMethod: 'vodafone_cash',
      vodafoneRef: 'VF-99882',
      createdAt: '',
    },
  ];

  const { movements, summary } = buildChronologicalStatement(deliveries, payments);

  // Movements should contain:
  // 1. Delivery DEL-1001 debit 3,750 (balance: 3,750)
  // 2. Initial payment credit 2,000 (balance: 1,750)
  // 3. Payment PAY-1001 credit 1,000 (balance: 750)
  assert.equal(movements.length, 3);
  assert.equal(movements[0].debit, 3750);
  assert.equal(movements[0].balanceAfter, 3750);
  assert.equal(movements[1].credit, 2000);
  assert.equal(movements[1].balanceAfter, 1750);
  assert.equal(movements[2].credit, 1000);
  assert.equal(movements[2].balanceAfter, 750);

  // Summary checks
  assert.equal(summary.openingBalance, 0);
  assert.equal(summary.totalWeightKg, 150);
  assert.equal(summary.totalDeliveryValue, 3750);
  assert.equal(summary.totalCashPaid, 2000);
  assert.equal(summary.totalVodafoneCashPaid, 1000);
  assert.equal(summary.totalPaid, 3000);
  assert.equal(summary.closingBalance, 750);
  assert.equal(summary.weightedAvgPrice, 25);
});

test('deductions reduce supplier debt and document reason correctly', () => {
  const deliveries: Delivery[] = [
    {
      id: 'd1',
      deliveryNumber: 'DEL-1',
      supplierId: 's1',
      supplierName: 'مورد',
      date: '2026-10-20',
      weightKg: 100,
      pricePerKg: 25,
      totalAmount: 2500,
      initialPaid: 0,
      remainingAmount: 2500,
      paymentMethod: 'unpaid',
      status: 'unpaid',
      createdAt: '',
      updatedAt: '',
    },
  ];

  const deductions = [
    {
      id: 'ded-1',
      deductionNumber: 'DED-1001',
      supplierId: 's1',
      supplierName: 'مورد',
      date: '2026-10-21',
      amount: 250,
      reason: 'خصم 10 كجم بطاطس تالفة',
      createdAt: '',
    },
  ];

  const { movements, summary } = buildChronologicalStatement(deliveries, [], undefined, undefined, deductions);

  // Delivery: 2,500 debt
  // Deduction: 250 credit
  // Final balance: 2,250
  assert.equal(movements.length, 2);
  assert.equal(movements[1].type, 'deduction');
  assert.equal(movements[1].credit, 250);
  assert.equal(movements[1].reason, 'خصم 10 كجم بطاطس تالفة');
  assert.equal(movements[1].balanceAfter, 2250);
  assert.equal(summary.totalDiscounts, 250);
  assert.equal(summary.closingBalance, 2250);
});

