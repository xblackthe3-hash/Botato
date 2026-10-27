import React, { useState, useEffect } from 'react';
import { Supplier, Deduction, Delivery } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatCurrency, round2 } from '../utils/accounting.ts';
import { X, Scissors, Printer, AlertCircle, Sparkles } from 'lucide-react';

interface RecordDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  activeSupplierId: string;
  onDeductionRecorded: (deduction: Deduction, openPrint: boolean) => void;
}

export const RecordDeductionModal: React.FC<RecordDeductionModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  activeSupplierId,
  onDeductionRecorded,
}) => {
  const [supplierId, setSupplierId] = useState(activeSupplierId || (suppliers[0]?.id || ''));
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [linkedDeliveryId, setLinkedDeliveryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [currentDebt, setCurrentDebt] = useState<number>(0);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSupplierId) setSupplierId(activeSupplierId);
  }, [activeSupplierId]);

  useEffect(() => {
    if (!isOpen || !supplierId) return;
    setError(null);

    api
      .getStatement(supplierId)
      .then((res) => {
        setCurrentDebt(res.summary.closingBalance);
      })
      .catch((err) => console.error(err));

    api
      .getDeliveries(supplierId)
      .then((all) => {
        setDeliveries(all.filter((d) => d.status !== 'cancelled'));
      })
      .catch((err) => console.error(err));
  }, [isOpen, supplierId]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const balanceAfterDeduction = round2(currentDebt - numAmount);

  const presetReasons = [
    'بطاطس تالفة ومعيبة بالفرز',
    'خصم شوائب وأتربة وزن زائد',
    'خصم كسر وزن وهالك استلام',
    'خصم فرق سعر متفق عليه',
    'خصم تعويض تأخير أو جودة',
  ];

  const handleSubmit = async (openPrint: boolean) => {
    setError(null);
    if (numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح للخصم أكبر من الصفر');
      return;
    }
    if (!reason.trim()) {
      setError('يرجى كتابة سبب الخصم (إلزامي للرقابة والتوثيق المحاسبي)');
      return;
    }

    setLoading(true);
    try {
      const deduction = await api.createDeduction({
        supplierId,
        amount: numAmount,
        reason: reason.trim(),
        date,
        time,
        linkedDeliveryId: linkedDeliveryId || undefined,
        notes: notes.trim() || undefined,
      });

      onDeductionRecorded(deduction, openPrint);
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل في حفظ الخصم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">تسجيل خصم مالي من المورد</h2>
              <p className="text-xs text-slate-500">
                خصم تالف أو فرق سعر مع توثيق السبب وإشعار الخصم
              </p>
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
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier & Current Debt Card */}
          <div className="p-3.5 bg-slate-100 rounded-xl flex items-center justify-between border border-slate-200">
            <div>
              <span className="text-slate-500 block">المورد</span>
              <span className="font-bold text-slate-900 text-sm">
                {suppliers.find((s) => s.id === supplierId)?.name || 'مورد البطاطس'}
              </span>
            </div>
            <div className="text-left font-mono">
              <span className="text-slate-500 block">المديونية الحالية المستحقة</span>
              <span className="text-base font-bold text-amber-800">
                {formatCurrency(currentDebt)}
              </span>
            </div>
          </div>

          {/* Deduction Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">مبلغ الخصم (جنيه مصري)</label>
              <span className="text-[11px] text-rose-700 font-semibold">يُخصم من رصيد المورد</span>
            </div>
            <input
              type="number"
              step="1"
              min="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="أدخل مبلغ الخصم..."
              className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2.5 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
            />
          </div>

          {/* Reason for deduction (Mandatory) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">سبب الخصم (إلزامي للتوثيق المالي)</label>
              <span className="text-[10px] text-slate-400">أسباب شائعة</span>
            </div>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب الخصم بالتفصيل..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 mb-2"
            />

            {/* Quick reason presets */}
            <div className="flex flex-wrap gap-1.5">
              {presetReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-800 border border-slate-200 rounded-md text-[11px] text-slate-700 cursor-pointer transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">تاريخ الخصم</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">وقت الخصم</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Optional: Link to a specific delivery */}
          {deliveries.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ربط الخصم بفاتورة معينة (اختياري)
              </label>
              <select
                value={linkedDeliveryId}
                onChange={(e) => setLinkedDeliveryId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
              >
                <option value="">خصم عام من رصيد الحساب</option>
                {deliveries.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.deliveryNumber} ({d.date}) — {d.weightKg} كجم ({formatCurrency(d.totalAmount)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Balance Preview */}
          {numAmount > 0 && (
            <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono text-xs">
              <span>الرصيد المتبقي بعد هذا الخصم:</span>
              <span
                className={`text-sm font-bold ${
                  balanceAfterDeduction <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {balanceAfterDeduction < 0
                  ? `+${formatCurrency(Math.abs(balanceAfterDeduction))} (رصيد دائن للمطعم)`
                  : formatCurrency(balanceAfterDeduction)}
              </span>
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">ملاحظات إضافية (اختياري)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل أخرى تم الاتفاق عليها مع المورد..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-100 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            يُخفض رصيد المورد ويُسجل كحركة خصم معتمدة في كشف الحساب
          </div>
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
              {loading ? 'جارٍ الحفظ...' : 'حفظ الخصم'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>حفظ وطباعة إشعار الخصم</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
