import React, { useState, useEffect } from 'react';
import { Supplier, Payment, Delivery } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatCurrency, round2 } from '../utils/accounting.ts';
import { X, Wallet, Printer, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  activeSupplierId: string;
  onPaymentRecorded: (payment: Payment, openPrint: boolean) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  activeSupplierId,
  onPaymentRecorded,
}) => {
  const [supplierId, setSupplierId] = useState(activeSupplierId || (suppliers[0]?.id || ''));
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vodafone_cash'>('cash');
  const [vodafoneRef, setVodafoneRef] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [notes, setNotes] = useState('');
  const [currentDebt, setCurrentDebt] = useState<number>(0);
  const [unpaidDeliveries, setUnpaidDeliveries] = useState<Delivery[]>([]);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSupplierId) setSupplierId(activeSupplierId);
  }, [activeSupplierId]);

  // Generate unique idempotency key on open
  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(`pay_key_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
      setError(null);
    }
  }, [isOpen]);

  // Load current debt and unpaid deliveries for the selected supplier
  useEffect(() => {
    if (!isOpen || !supplierId) return;

    api
      .getStatement(supplierId)
      .then((res) => {
        setCurrentDebt(res.summary.closingBalance);
      })
      .catch((err) => console.error(err));

    api
      .getDeliveries(supplierId)
      .then((all) => {
        const unpaid = all.filter((d) => d.remainingAmount > 0 && d.status !== 'cancelled');
        setUnpaidDeliveries(unpaid);
      })
      .catch((err) => console.error(err));
  }, [isOpen, supplierId]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const remainingDebtAfterPayment = round2(currentDebt - numAmount);

  const toggleDeliverySelection = (delId: string) => {
    setSelectedDeliveryIds((prev) =>
      prev.includes(delId) ? prev.filter((id) => id !== delId) : [...prev, delId]
    );
  };

  const handleQuickAmount = (val: number) => {
    setAmount(String(round2(val)));
  };

  const handleSubmit = async (openPrint: boolean) => {
    setError(null);
    if (numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح للدفعة أكبر من الصفر');
      return;
    }

    if (paymentMethod === 'vodafone_cash' && !vodafoneRef.trim()) {
      // Prompt notes: Vodafone cash reference is optional or recorded if exists, but recommending it
    }

    setLoading(true);
    try {
      const res = await api.createPayment({
        supplierId,
        amount: numAmount,
        paymentMethod,
        date,
        time,
        vodafoneRef: vodafoneRef.trim(),
        linkedDeliveryIds: selectedDeliveryIds,
        notes: notes.trim(),
        idempotencyKey,
      });

      onPaymentRecorded(res.payment, openPrint);
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل في حفظ الدفعة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">تسجيل دفعة للمورد</h2>
              <p className="text-xs text-slate-500">سداد نقدي أو فودافون كاش مع تحديث الرصيد الفوري</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier & Current Debt Card */}
          <div className="p-3.5 bg-slate-100 rounded-xl flex items-center justify-between border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 block">المورد الحالي</span>
              <span className="text-sm font-bold text-slate-900">
                {suppliers.find((s) => s.id === supplierId)?.name || 'مورد البطاطس'}
              </span>
            </div>
            <div className="text-left font-mono">
              <span className="text-xs text-slate-500 block">المديونية الحالية المستحقة</span>
              <span className={`text-base font-bold ${currentDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(currentDebt)}
              </span>
            </div>
          </div>

          {/* Payment Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">مبلغ الدفعة (ج.م)</label>
                <span className="text-[11px] text-emerald-700 font-semibold">مبلغ السداد</span>
              </div>
              <input
                type="number"
                step="1"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="أدخل المبلغ..."
                className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2.5 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              {currentDebt > 0 && (
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(currentDebt)}
                    className="px-2 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded text-xs font-semibold text-emerald-800 cursor-pointer"
                  >
                    سداد كامل الدين ({formatCurrency(currentDebt)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(currentDebt / 2)}
                    className="px-2 py-1 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded text-xs text-slate-700 cursor-pointer"
                  >
                    نصف المبلغ
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">طريقة الدفع</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-2.5 border rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  نقدي (كاش)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('vodafone_cash')}
                  className={`p-2.5 border rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                    paymentMethod === 'vodafone_cash'
                      ? 'border-rose-600 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold text-rose-600">VF</span>
                  فودافون كاش
                </button>
              </div>

              {paymentMethod === 'vodafone_cash' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={vodafoneRef}
                    onChange={(e) => setVodafoneRef(e.target.value)}
                    placeholder="رقم مرجع الحوالة / العملية (اختياري)"
                    className="w-full bg-slate-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الدفعة</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">وقت الدفع</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Balance after payment preview */}
          {numAmount > 0 && (
            <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono text-xs">
              <span>الرصيد المتبقي بعد هذه الدفعة:</span>
              <span className={`text-sm font-bold ${remainingDebtAfterPayment <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {remainingDebtAfterPayment < 0
                  ? `+${formatCurrency(Math.abs(remainingDebtAfterPayment))} (رصيد دائن للمطعم)`
                  : formatCurrency(remainingDebtAfterPayment)}
              </span>
            </div>
          )}

          {/* Optional: Allocate to specific unpaid deliveries */}
          {unpaidDeliveries.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                تخصيص الدفعة لتوريدة معينة (اختياري):
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1.5">
                {unpaidDeliveries.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDeliveryIds.includes(d.id)}
                        onChange={() => toggleDeliverySelection(d.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-slate-800 font-mono">{d.deliveryNumber}</span>
                      <span className="text-slate-500">({d.date})</span>
                    </div>
                    <span className="font-mono text-rose-600 font-semibold">
                      متبقي: {formatCurrency(d.remainingAmount)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ملاحظات الدفعة (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: دفعة تحت الحساب، استلمها السائق، إلخ"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-100 border-t border-slate-200">
          <div className="text-xs text-slate-500">محمي ضد التكرار والضغط المزدوج</div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ الدفعة'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>حفظ وطباعة الإيصال</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
