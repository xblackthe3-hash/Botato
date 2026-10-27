import React, { useState } from 'react';
import { Delivery } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatCurrency, formatWeight } from '../utils/accounting.ts';
import { AlertTriangle, X } from 'lucide-react';

interface CancelDeliveryModalProps {
  delivery: Delivery | null;
  onClose: () => void;
  onDeliveryCancelled: (cancelled: Delivery) => void;
}

export const CancelDeliveryModal: React.FC<CancelDeliveryModalProps> = ({
  delivery,
  onClose,
  onDeliveryCancelled,
}) => {
  if (!delivery) return null;

  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('يرجى كتابة سبب الإلغاء للتوثيق المالي والمحاسبي');
      return;
    }

    setLoading(true);
    try {
      const cancelled = await api.cancelDelivery(delivery.id, reason.trim());
      onDeliveryCancelled(cancelled);
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل في إلغاء التوريدة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold">إلغاء توريدة ({delivery.deliveryNumber})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          أنت على وشك إلغاء التوريدة رقم <strong>{delivery.deliveryNumber}</strong> بوزن{' '}
          <strong>{formatWeight(delivery.weightKg)}</strong> وقيمة{' '}
          <strong>{formatCurrency(delivery.totalAmount)}</strong>.
          سيتم استبعاد قيمتها من الحسابات دون حذف السجل المالي، مع توثيق سبب الإلغاء في سجل التدقيق.
        </p>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCancel} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              سبب الإلغاء (إلزامي للرقابة المالية)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تم إرجاع الشحنة لتلف البطاطس، خطأ في الإدخال، إلخ"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg cursor-pointer"
            >
              {loading ? 'جارٍ الإلغاء...' : 'تأكيد إلغاء التوريدة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
