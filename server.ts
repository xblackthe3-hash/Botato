import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbManager } from './server/db.ts';
import {
  buildChronologicalStatement,
  calculateWeightedAveragePrice,
  round2,
} from './src/utils/accounting.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// --- API ROUTES ---

// 1. Suppliers
app.get('/api/suppliers', (_req, res) => {
  const suppliers = dbManager.getSuppliers();
  res.json(suppliers);
});

app.post('/api/suppliers', (req, res) => {
  const { name, phone, address, notes, startDate } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'اسم المورد مطلوب' });
  }
  const newSupplier = dbManager.addSupplier({
    name: name.trim(),
    phone: phone || '',
    address: address || '',
    notes: notes || '',
    startDate: startDate || new Date().toISOString().split('T')[0],
  });
  res.status(201).json(newSupplier);
});

app.put('/api/suppliers/:id', (req, res) => {
  const updated = dbManager.updateSupplier(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'المورد غير موجود' });
  }
  res.json(updated);
});

app.delete('/api/suppliers/:id', (req, res) => {
  const result = dbManager.deleteSupplier(req.params.id);
  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }
  res.json(result);
});

// 2. Deliveries
app.get('/api/deliveries', (req, res) => {
  const { supplierId } = req.query;
  const deliveries = dbManager.getDeliveries(supplierId ? String(supplierId) : undefined);
  res.json(deliveries);
});

app.post('/api/deliveries', (req, res) => {
  try {
    const {
      supplierId,
      date,
      time,
      weightKg,
      pricePerKg,
      initialPaid,
      paymentMethod,
      vodafoneRef,
      notes,
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ error: 'يرجى اختيار المورد' });
    }
    if (!weightKg || Number(weightKg) <= 0) {
      return res.status(400).json({ error: 'يجب أن يكون الوزن أكبر من الصفر' });
    }
    if (!pricePerKg || Number(pricePerKg) <= 0) {
      return res.status(400).json({ error: 'يجب أن يكون سعر الكيلو أكبر من الصفر' });
    }

    const delivery = dbManager.createDelivery({
      supplierId,
      date: date || new Date().toISOString().split('T')[0],
      time: time || undefined,
      weightKg: Number(weightKg),
      pricePerKg: Number(pricePerKg),
      initialPaid: initialPaid !== undefined ? Number(initialPaid) : 0,
      paymentMethod: paymentMethod || 'unpaid',
      vodafoneRef,
      notes,
    });

    res.status(201).json(delivery);
  } catch (err) {
    console.error('Error creating delivery:', err);
    res.status(500).json({ error: 'فشل في حفظ التوريدة' });
  }
});

app.put('/api/deliveries/:id', (req, res) => {
  const updated = dbManager.updateDelivery(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'التوريدة غير موجودة' });
  }
  res.json(updated);
});

app.post('/api/deliveries/:id/cancel', (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'يرجى كتابة سبب الإلغاء للتوثيق المحاسبي' });
  }
  const cancelled = dbManager.cancelDelivery(req.params.id, reason.trim());
  if (!cancelled) {
    return res.status(404).json({ error: 'التوريدة غير موجودة' });
  }
  res.json(cancelled);
});

// 3. Payments
app.get('/api/payments', (req, res) => {
  const { supplierId } = req.query;
  const payments = dbManager.getPayments(supplierId ? String(supplierId) : undefined);
  res.json(payments);
});

app.post('/api/payments', (req, res) => {
  try {
    const {
      supplierId,
      amount,
      paymentMethod,
      date,
      time,
      vodafoneRef,
      linkedDeliveryIds,
      notes,
      idempotencyKey,
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ error: 'يرجى اختيار المورد' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'يجب أن يكون مبلغ الدفعة أكبر من الصفر' });
    }
    if (!paymentMethod || !['cash', 'vodafone_cash'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'طريقة الدفع غير صالحة' });
    }

    const { payment, isDuplicate } = dbManager.createPayment({
      supplierId,
      amount: Number(amount),
      paymentMethod,
      date: date || new Date().toISOString().split('T')[0],
      time: time || undefined,
      vodafoneRef,
      linkedDeliveryIds,
      notes,
      idempotencyKey,
    });

    res.status(isDuplicate ? 200 : 201).json({ payment, isDuplicate });
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'فشل في حفظ الدفعة' });
  }
});

// 4. Deductions (الخصومات والتسويات من المورد)
app.get('/api/deductions', (req, res) => {
  const { supplierId } = req.query;
  const deductions = dbManager.getDeductions(supplierId ? String(supplierId) : undefined);
  res.json(deductions);
});

app.post('/api/deductions', (req, res) => {
  try {
    const { supplierId, amount, reason, date, time, linkedDeliveryId, notes } = req.body;

    if (!supplierId) {
      return res.status(400).json({ error: 'يرجى اختيار المورد' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'يجب أن يكون مبلغ الخصم أكبر من الصفر' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'سبب الخصم إلزامي للرقابة والتوثيق المحاسبي' });
    }

    const deduction = dbManager.createDeduction({
      supplierId,
      amount: Number(amount),
      reason: reason.trim(),
      date: date || new Date().toISOString().split('T')[0],
      time: time || undefined,
      linkedDeliveryId,
      notes,
    });

    res.status(201).json(deduction);
  } catch (err) {
    console.error('Error creating deduction:', err);
    res.status(500).json({ error: 'فشل في حفظ الخصم' });
  }
});

// 5. Account Statement (كشف الحساب)
app.get('/api/statement', (req, res) => {
  const { supplierId, startDate, endDate } = req.query;
  const supId = supplierId ? String(supplierId) : dbManager.getSuppliers()[0]?.id;

  const deliveries = dbManager.getDeliveries(supId);
  const payments = dbManager.getPayments(supId);
  const deductions = dbManager.getDeductions(supId);

  const statement = buildChronologicalStatement(
    deliveries,
    payments,
    startDate ? String(startDate) : undefined,
    endDate ? String(endDate) : undefined,
    deductions
  );

  res.json(statement);
});

// 6. Dashboard Aggregations
app.get('/api/dashboard', (req, res) => {
  const { supplierId } = req.query;
  const supId = supplierId ? String(supplierId) : dbManager.getSuppliers()[0]?.id;

  const deliveries = dbManager.getDeliveries(supId);
  const payments = dbManager.getPayments(supId);
  const deductions = dbManager.getDeductions(supId);

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

  // Overall account statement for current total debt
  const statement = buildChronologicalStatement(deliveries, payments, undefined, undefined, deductions);
  const totalCurrentDebt = statement.summary.closingBalance;

  const lastDelivery = deliveries.find((d) => d.status !== 'cancelled');
  const lastPayment = payments[0];
  const lastDeduction = deductions[0];

  res.json({
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
  });
});

// 7. Reports (التقارير)
app.get('/api/reports', (req, res) => {
  const { supplierId, period } = req.query;
  const supId = supplierId ? String(supplierId) : dbManager.getSuppliers()[0]?.id;

  const deliveries = dbManager.getDeliveries(supId).filter((d) => d.status !== 'cancelled');
  const payments = dbManager.getPayments(supId);
  const deductions = dbManager.getDeductions(supId);

  // Group deliveries by date
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

  res.json({
    dailyBreakdown,
    unpaidDeliveries,
    weightedAvgPrice,
    summary: statement.summary,
    totalDeliveriesCount: deliveries.length,
    totalPaymentsCount: payments.length,
    totalDeductionsCount: deductions.length,
  });
});

// 7. Audit Logs
app.get('/api/audit-logs', (_req, res) => {
  res.json(dbManager.getAuditLogs());
});

// 8. Backup & Restore & Reset
app.get('/api/backup', (_req, res) => {
  const data = dbManager.getFullBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=al-shami-potato-backup-${new Date().toISOString().split('T')[0]}.json`
  );
  res.json(data);
});

app.post('/api/restore', (req, res) => {
  const result = dbManager.restoreBackup(req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/reset-demo', (_req, res) => {
  dbManager.resetToDemoData();
  res.json({ success: true, message: 'تمت إعادة تعيين البيانات التجريبية بنجاح' });
});

app.post('/api/clear-demo', (_req, res) => {
  dbManager.clearAllDataForProduction();
  res.json({ success: true, message: 'تم مسح البيانات بنجاح والبدء بحساب نظيف' });
});

// --- VITE & STATIC SERVING ---
const isProd = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;
if (!isProd && !isVercel) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

if (!isVercel) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Potato Supplier System listening on port ${PORT}`);
  });
}

export default app;
