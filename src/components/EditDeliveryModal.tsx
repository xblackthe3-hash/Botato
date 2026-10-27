import React, { useState } from 'react';
import { Delivery } from '../types/index.ts';
import { api } from '../api/client.ts';
import { calculateDeliveryTotal, formatCurrency } from '../utils/accounting.ts';
import { X, Edit3, AlertCircle } from 'lucide-react';

interface EditDeliveryModalProps {
  delivery: Delivery | null;
  onClose: () => void;
  onDeliveryUpdated: (updated: Delivery) => void;
}

export const EditDeliveryModal: React.FC<EditDeliveryModalProps> = ({
  delivery,
  onClose,
  onDeliveryUpdated,
}) => {
  if (!delivery) return null;

  const [weightKg, setWeightKg] = useState<string>(String(delivery.weightKg));
  const [pricePerKg, setPricePerKg] = useState<string>(String(delivery.pricePerKg));
  const [date, setDate] = useState<string>(delivery.date);
  const [time, setTime] = useState<string>(delivery.time || '');
  const [notes, setNotes] = useState<string>(delivery.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numWeight = parseFloat(weightKg) || 0;
  const numPrice = parseFloat(pricePerKg) || 0;
  const newTotal = calculateDeliveryTotal(numWeight, numPrice);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numWeight <= 0) {
      setError('يرجى إدخال وزن صحيح بالكيلو');
      return;
    }
    if (numPrice <= 0) {
      setError('يرجى إدخال سعر صحيح للكيلو');
      return;
    }

    setLoading(true);
    try {
      const updated = await api.updateDelivery(delivery.id, {
        weightKg: numWeight,
        pricePerKg: numPrice,
        date,
        time,
        notes,
      });
      onDeliveryUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل في تحديث بيانات التوريدة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">
              تعديل بيانات التوريدة ({delivery.deliveryNumber})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">الوزن بالكيلو (كجم)</label>
              <input
                type="number"
                step="0.25"
                min="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">سعر الكيلو (ج.م)</label>
              <input
                type="number"
                step="0.25"
                min="0.1"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl text-center border border-amber-200 font-mono">
            <span className="text-[11px] text-amber-800 block">إجمالي القيمة بعد التعديل:</span>
            <span className="text-base font-bold text-amber-950">
              {formatCurrency(newTotal)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">الوقت</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ملاحظات التوريدة</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
