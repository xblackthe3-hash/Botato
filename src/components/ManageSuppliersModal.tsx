import React, { useState } from 'react';
import { Supplier } from '../types/index.ts';
import { api } from '../api/client.ts';
import {
  Building2,
  X,
  Plus,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

interface ManageSuppliersModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  activeSupplierId: string;
  onSetActiveSupplier: (id: string) => void;
  onOpenAddSupplier: () => void;
  onOpenEditSupplier: (supplier: Supplier) => void;
  onSupplierDeleted: (deletedId: string) => void;
}

export const ManageSuppliersModal: React.FC<ManageSuppliersModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  activeSupplierId,
  onSetActiveSupplier,
  onOpenAddSupplier,
  onOpenEditSupplier,
  onSupplierDeleted,
}) => {
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteSupplier(supplierToDelete.id);
      onSupplierDeleted(supplierToDelete.id);
      setSupplierToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'حدث خطأ أثناء حذف المورد');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إدارة تجار وموردي البطاطس</h3>
              <p className="text-xs text-slate-400">
                إضافة، تعديل، حذف، وتحديد التاجر النشط لمطعم الشامي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenAddSupplier();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تاجر جديد</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {suppliers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">لا يوجد أي موردين مسجلين حالياً</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                قم بإضافة تاجر البطاطس الأول لمطعم الشامي لتتمكن من تسجيل التوريدات ومتابعة المدفوعات والديون.
              </p>
              <button
                onClick={onOpenAddSupplier}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة تاجر بطاطس جديد الآن</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier) => {
                const isActive = supplier.id === activeSupplierId;
                return (
                  <div
                    key={supplier.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'border-amber-400 bg-amber-50/50 shadow-xs ring-2 ring-amber-400/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{supplier.name}</h4>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                              <UserCheck className="w-3 h-3" />
                              التاجر النشط
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          {supplier.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {supplier.phone}
                            </span>
                          )}
                          {supplier.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {supplier.address}
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                            <Calendar className="w-3 h-3" />
                            بدء التعامل: {supplier.startDate}
                          </span>
                        </div>

                        {supplier.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-1.5 bg-slate-100/70 px-2 py-1 rounded">
                            {supplier.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {!isActive && (
                          <button
                            onClick={() => onSetActiveSupplier(supplier.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            تحديد كنشط
                          </button>
                        )}

                        <button
                          onClick={() => onOpenEditSupplier(supplier)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                          title="تعديل بيانات التاجر"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          onClick={() => setSupplierToDelete(supplier)}
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف التاجر وسجلاته"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Alert Sub-modal */}
        {supplierToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-center text-slate-900">
                تأكيد حذف التاجر ({supplierToDelete.name})
              </h3>
              <p className="text-xs text-slate-600 text-center leading-relaxed">
                تحذير محاسبي: سيؤدي حذف هذا التاجر إلى حذف جميع التوريدات، والدفعات، والخصومات، والفواتير الخاصة به نهائياً وتوثيق ذلك في سجل التدقيق. هل أنت متأكد من الحذف؟
              </p>

              {deleteError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs text-center">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setSupplierToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteConfirm}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف نهائياً'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
