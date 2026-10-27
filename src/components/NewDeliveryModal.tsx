import React, { useState, useEffect } from 'react';
import { Supplier, Delivery } from '../types/index.ts';
import { api } from '../api/client.ts';
import {
  calculateDeliveryTotal,
  calculateRollover,
  formatCurrency,
  round2,
} from '../utils/accounting.ts';
import { X, Scale, Calculator, ArrowRight, Printer, AlertCircle } from 'lucide-react';

interface NewDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  activeSupplierId: string;
  onDeliveryCreated: (delivery: Delivery, openPrint: boolean) => void;
}

export const NewDeliveryModal: React.FC<NewDeliveryModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  activeSupplierId,
  onDeliveryCreated,
}) => {
  const [supplierId, setSupplierId] = useState(activeSupplierId || (suppliers[0]?.id || ''));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [weightKg, setWeightKg] = useState<string>('150');
  const [pricePerKg, setPricePerKg] = useState<string>('25');
  const [initialPaid, setInitialPaid] = useState<string>('2000');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vodafone_cash' | 'unpaid'>('cash');
  const [vodafoneRef, setVodafoneRef] = useState('');
  const [notes, setNotes] = useState('');
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync supplierId when activeSupplierId changes
  useEffect(() => {
    if (activeSupplierId) setSupplierId(activeSupplierId);
  }, [activeSupplierId]);

  // Fetch current previous balance for selected supplier
  useEffect(() => {
    if (!isOpen || !supplierId) return;
    api
      .getStatement(supplierId)
      .then((res) => {
        setPreviousBalance(res.summary.closingBalance);
      })
      .catch((err) => {
        console.error('Failed to load supplier statement for previous balance:', err);
      });
  }, [isOpen, supplierId]);

  if (!isOpen) return null;

  const numWeight = parseFloat(weightKg) || 0;
  const numPrice = parseFloat(pricePerKg) || 0;
  const deliveryTotal = calculateDeliveryTotal(numWeight, numPrice);
  const numPaid = parseFloat(initialPaid) || 0;

  // Calculate rollover with previous balance
  const rollover = calculateRollover(previousBalance, deliveryTotal, numPaid);

  const handleSubmit = async (openPrint: boolean) => {
    setError(null);
    if (numWeight <= 0) {
      setError('يرجى إدخال وزن صحيح بالكيلو');
      return;
    }
    if (numPrice <= 0) {
      setError('يرجى إدخال سعر صحيح للكيلو بالجنيه المصري');
      return;
    }

    setLoading(true);
    try {
      const created = await api.createDelivery({
        supplierId,
        date,
        time,
        weightKg: numWeight,
        pricePerKg: numPrice,
        initialPaid: numPaid,
        paymentMethod: numPaid > 0 ? paymentMethod : 'unpaid',
        vodafoneRef: paymentMethod === 'vodafone_cash' ? vodafoneRef : undefined,
        notes,
      });

      onDeliveryCreated(created, openPrint);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ التوريدة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">تسجيل توريدة بطاطس جديدة</h2>
              <p className="text-xs text-slate-500">حساب فوري للوزن وسعر الكيلو وترحيل المديونية</p>
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
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier, Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المورد</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ التوريد</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">وقت الاستلام</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Weight & Price inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">الوزن بالكيلو (كجم)</label>
                <span className="text-[11px] text-amber-700 font-medium">يقبل الكسور</span>
              </div>
              <input
                type="number"
                step="0.25"
                min="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="مثال: 150"
                className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2.5 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <div className="flex gap-1.5 mt-2">
                {[100, 150, 200, 250].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeightKg(String(w))}
                    className="px-2 py-1 bg-white border border-amber-200 hover:bg-amber-100 rounded text-xs font-mono font-medium text-slate-700 cursor-pointer"
                  >
                    {w} كجم
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">سعر الكيلو (جنيه مصري)</label>
                <span className="text-[11px] text-amber-700 font-medium">خاص بهذه التوريدة</span>
              </div>
              <input
                type="number"
                step="0.25"
                min="0.1"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="مثال: 25"
                className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2.5 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <div className="flex gap-1.5 mt-2">
                {['23.50', '24.00', '25.00', '26.00'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPricePerKg(p)}
                    className="px-2 py-1 bg-white border border-amber-200 hover:bg-amber-100 rounded text-xs font-mono font-medium text-slate-700 cursor-pointer"
                  >
                    {p} ج.م
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mathematical calculation breakdown */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Calculator className="w-4 h-4" />
                معادلة الحساب المالي
              </span>
              <span>{numWeight} كجم × {numPrice} ج.م</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <div className="text-[11px] text-slate-400">قيمة التوريدة</div>
                <div className="text-sm sm:text-base font-bold text-amber-300">
                  {formatCurrency(deliveryTotal)}
                </div>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <div className="text-[11px] text-slate-400">الرصيد السابق</div>
                <div className="text-sm sm:text-base font-bold text-slate-200">
                  {formatCurrency(previousBalance)}
                </div>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <div className="text-[11px] text-slate-400">إجمالي المستحق</div>
                <div className="text-sm sm:text-base font-bold text-emerald-400">
                  {formatCurrency(rollover.totalDue)}
                </div>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <div className="text-[11px] text-slate-400">المتبقي النهائي</div>
                <div className={`text-sm sm:text-base font-bold ${rollover.isCreditor ? 'text-cyan-300' : 'text-amber-400'}`}>
                  {rollover.isCreditor
                    ? `+${formatCurrency(rollover.creditorBalance)} (دائن)`
                    : formatCurrency(rollover.finalRemaining)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800">بيانات السداد وقت التوريد</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المبلغ المدفوع وقت الاستلام
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={initialPaid}
                  onChange={(e) => setInitialPaid(e.target.value)}
                  placeholder="0 إذا لم يتم الدفع"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <div className="flex gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setInitialPaid('0')}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[11px] text-slate-700 cursor-pointer"
                  >
                    0 (آجل)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialPaid(String(deliveryTotal))}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[11px] text-slate-700 cursor-pointer"
                  >
                    كامل الفاتورة
                  </button>
                  {rollover.totalDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setInitialPaid(String(rollover.totalDue))}
                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[11px] text-slate-700 cursor-pointer"
                    >
                      كامل المستحق
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  طريقة الدفع
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  disabled={numPaid <= 0}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                >
                  <option value="cash">نقدي (كاش)</option>
                  <option value="vodafone_cash">فودافون كاش</option>
                  <option value="unpaid">آجل (بدون سداد)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رقم مرجع فودافون كاش (اختياري)
                </label>
                <input
                  type="text"
                  value={vodafoneRef}
                  onChange={(e) => setVodafoneRef(e.target.value)}
                  disabled={paymentMethod !== 'vodafone_cash' || numPaid <= 0}
                  placeholder="رقم الحوالة أو العملية"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ملاحظات التوريدة (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: نوع البطاطس، الجودة، رقم السيارة، إلخ"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-100 border-t border-slate-200">
          <div className="text-xs text-slate-600">
            سيتم حفظ التوريدة وتحديث رصيد المورد وتوثيق الحركة في سجل التدقيق تلقائياً.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-1/3 sm:w-auto px-4 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="w-1/3 sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ فقط'}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="w-1/3 sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>حفظ وطباعة الفاتورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
