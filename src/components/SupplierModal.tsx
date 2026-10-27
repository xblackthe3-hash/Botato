import React, { useState, useEffect } from 'react';
import { Supplier } from '../types/index.ts';
import { api } from '../api/client.ts';
import { Building2, X, Phone, MapPin, Calendar, FileText, Check } from 'lucide-react';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
  onSupplierSaved: (supplier: Supplier, isNew: boolean) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSupplierSaved,
}) => {
  const isEdit = !!supplierToEdit;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || '');
      setPhone(supplierToEdit.phone || '');
      setAddress(supplierToEdit.address || '');
      setNotes(supplierToEdit.notes || '');
      setStartDate(supplierToEdit.startDate || new Date().toISOString().split('T')[0]);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setStartDate(new Date().toISOString().split('T')[0]);
    }
    setErrorMessage(null);
  }, [supplierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('يرجى إدخال اسم تاجر البطاطس');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEdit && supplierToEdit) {
        const updated = await api.updateSupplier(supplierToEdit.id, {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
          startDate,
        });
        onSupplierSaved(updated, false);
      } else {
        const created = await api.addSupplier({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
          startDate,
        });
        onSupplierSaved(created, true);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ بيانات التاجر');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEdit ? 'تعديل بيانات تاجر البطاطس' : 'إضافة تاجر بطاطس جديد'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit ? `تعديل السجل الخاص بـ (${supplierToEdit.name})` : 'تسجيل مورد جديد لربط التوريدات والدفعات به'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم التاجر / المورد <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: الحاج رضوان - مورد بطاطس الشامي"
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                رقم الهاتف (اختياري)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono placeholder:text-slate-400 text-right transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                تاريخ بدء التعامل
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              العنوان أو موقع السوق (اختياري)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="مثال: سوق الجملة المركزي - عنبر الخضار"
              className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              ملاحظات وشروط التوريد (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="نوع البطاطس (سبونتا، هيرميس)، شروط السداد، طريقة التوصيل، إلخ"
              className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة التاجر الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
