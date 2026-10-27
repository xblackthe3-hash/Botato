import React, { useState, useEffect } from 'react';
import { Supplier, AuditLog, AppDatabase } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatCurrency, formatDateArabic } from '../utils/accounting.ts';
import {
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Building2,
  Plus,
  ShieldAlert,
  History,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

interface SettingsBackupViewProps {
  suppliers: Supplier[];
  onSuppliersUpdated: () => void;
  activeSupplierId: string;
  setActiveSupplierId: (id: string) => void;
}

export const SettingsBackupView: React.FC<SettingsBackupViewProps> = ({
  suppliers,
  onSuppliersUpdated,
  activeSupplierId,
  setActiveSupplierId,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupNotes, setNewSupNotes] = useState('');
  const [newSupStartDate, setNewSupStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Restore states
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [pendingBackupFile, setPendingBackupFile] = useState<AppDatabase | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // Supplier deletion state
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState(false);

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setDeletingSupplier(true);
    try {
      await api.deleteSupplier(supplierToDelete.id);
      setSupplierToDelete(null);
      onSuppliersUpdated();
      api.getAuditLogs().then(setAuditLogs);
    } catch (err: any) {
      alert(err.message || 'فشل في حذف المورد');
    } finally {
      setDeletingSupplier(false);
    }
  };

  useEffect(() => {
    api.getAuditLogs().then(setAuditLogs).catch(console.error);
  }, []);

  const handleDownloadBackup = () => {
    api.downloadLocalBackup();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.suppliers || !json.deliveries) {
          alert('ملف النسخة الاحتياطية غير صالح أو تنقصه الجداول الأساسية.');
          return;
        }
        setPendingBackupFile(json);
        setRestoreConfirmOpen(true);
      } catch (err) {
        alert('حدث خطأ في قراءة ملف JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeRestore = async () => {
    if (!pendingBackupFile) return;
    try {
      const res = await api.restoreBackup(pendingBackupFile);
      setRestoreStatus(res.message);
      setRestoreConfirmOpen(false);
      setPendingBackupFile(null);
      onSuppliersUpdated();
      api.getAuditLogs().then(setAuditLogs);
    } catch (err: any) {
      alert(err.message || 'فشلت عملية الاستعادة.');
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('هل تريد بالتأكيد إعادة تعيين البيانات التجريبية لمطعم الشامي؟')) return;
    try {
      await api.resetDemoData();
      alert('تمت إعادة تعيين البيانات التجريبية بنجاح.');
      onSuppliersUpdated();
      api.getAuditLogs().then(setAuditLogs);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClearProduction = async () => {
    try {
      await api.clearDataForProduction();
      setClearConfirmOpen(false);
      alert('تم مسح البيانات التجريبية بنجاح وبدء الحساب الفعلي النظيف.');
      onSuppliersUpdated();
      api.getAuditLogs().then(setAuditLogs);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    try {
      const created = await api.addSupplier({
        name: newSupName.trim(),
        phone: newSupPhone.trim(),
        address: newSupAddress.trim(),
        notes: newSupNotes.trim(),
        startDate: newSupStartDate,
      });

      setShowAddSupplierModal(false);
      setNewSupName('');
      setNewSupPhone('');
      setNewSupAddress('');
      setNewSupNotes('');
      onSuppliersUpdated();
      setActiveSupplierId(created.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">إدارة الموردين والنسخ الاحتياطي والتدقيق</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            حفظ البيانات محلياً وسحابياً، استيراد وتصدير النسخ، وإدارة حسابات تجار البطاطس
          </p>
        </div>

        <button
          onClick={() => setShowAddSupplierModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تاجر بطاطس جديد</span>
        </button>
      </div>

      {restoreStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{restoreStatus}</span>
        </div>
      )}

      {/* Suppliers Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            بيانات تجار وموردي البطاطس المسجلين
          </h2>
          <span className="text-xs text-slate-500">{suppliers.length} مورد</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((s) => {
            const isActive = s.id === activeSupplierId;
            return (
              <div
                key={s.id}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-amber-400 bg-amber-50/40 shadow-xs ring-2 ring-amber-400/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                    {s.address && (
                      <p className="text-xs text-slate-500 mt-0.5">{s.address}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white">
                        المورد النشط
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveSupplierId(s.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        تحديد كنشط
                      </button>
                    )}

                    <button
                      onClick={() => setSupplierToDelete(s)}
                      className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف المورد وسجلاته"
                      aria-label={`حذف المورد ${s.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">الهاتف:</span>
                    <span className="font-mono">{s.phone || 'غير مسجل'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">تاريخ بدء التعامل:</span>
                    <span className="font-mono">{s.startDate}</span>
                  </div>
                </div>

                {s.notes && (
                  <p className="mt-2 text-[11px] text-slate-500 italic bg-slate-100/60 p-2 rounded">
                    {s.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Backup & Restore Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export & Download Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Download className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">تصدير وحفظ نسخة احتياطية</h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            قم بتحميل ملف نسخة احتياطية كاملة (JSON) يتضمن كافة الموردين، والتوريدات، وأوزان البطاطس، والدفعات، وسجل التدقيق. يمكنك استرجاع هذه البيانات في أي وقت أو نقلها لجهاز آخر.
          </p>

          <button
            onClick={handleDownloadBackup}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل النسخة الاحتياطية الكاملة (JSON)</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Upload className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">استعادة البيانات من نسخة سابقة</h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            استرجع ملف نسخة احتياطية محفوظ سابقاً. يقوم النظام تلقائياً بإنشاء نسخة أمان فورية من الوضع الحالي قبل تطبيق أي استرجاع.
          </p>

          <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>اختيار ملف النسخة الاحتياطية (.json)</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* System Maintenance & Clean Slate */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          خيارات الاختبار والتشغيل الفعلي
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة تعيين البيانات التجريبية (الشامي)</span>
          </button>

          <button
            onClick={() => setClearConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>تصفير الدفتر وبدء الاستخدام الفعلي النظيف</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            سجل التدقيق والمراجعة المحاسبي (Audit Trail)
          </h3>
          <span className="text-xs text-slate-500">{auditLogs.length} حركة مدققة</span>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs font-mono">
          {auditLogs.length === 0 ? (
            <p className="text-center py-6 text-slate-400 font-sans">لا توجد سجلات تدقيق</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <span className="text-slate-400 text-[10px] block">
                    {new Date(log.timestamp).toLocaleString('ar-EG')}
                  </span>
                  <span className="font-sans text-slate-800">{log.details}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {log.action}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">إضافة تاجر بطاطس جديد</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم المورد</label>
                <input
                  type="text"
                  required
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  placeholder="مثال: المعلم سمير - تاجر جملة"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">العنوان / السوق (اختياري)</label>
                <input
                  type="text"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  placeholder="سوق العبور، 6 أكتوبر، إلخ"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">تاريخ بدء التعامل</label>
                <input
                  type="date"
                  value={newSupStartDate}
                  onChange={(e) => setNewSupStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  value={newSupNotes}
                  onChange={(e) => setNewSupNotes(e.target.value)}
                  placeholder="شروط التوريد، نوع البطاطس، إلخ"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  إضافة وحفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Restore Modal */}
      {restoreConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900">
              تأكيد استعادة النسخة الاحتياطية
            </h3>
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              تحتوي هذه النسخة على {pendingBackupFile?.deliveries.length} توريدة و{' '}
              {pendingBackupFile?.payments.length} دفعة.
              سيتم استبدال البيانات الحالية بالبيانات الموجودة في الملف. سيقوم النظام بحفظ نسخة أمان احتياطية قبل الاستبدال مباشرة.
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRestoreConfirmOpen(false);
                  setPendingBackupFile(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={executeRestore}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                تأكيد الاستعادة الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear for Production Modal */}
      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900">
              بدء الاستخدام الفعلي ومسح البيانات التجريبية
            </h3>
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              هل أنت متأكد من مسح جميع التوريدات والدفعات التجريبية وبدء دفتر محاسبة جديد ونظيف لمطعم الشامي؟
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleClearProduction}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                تأكيد البدء النظيف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900">
              تأكيد حذف المورد ({supplierToDelete.name})
            </h3>
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              تحذير: سيؤدي حذف هذا المورد إلى حذف كافة التوريدات والدفعات والخصومات وسجل الحساب المرتبط به نهائياً وتوثيق ذلك في سجل التدقيق. هل تريد المتابعة؟
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={deletingSupplier}
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deletingSupplier}
                onClick={confirmDeleteSupplier}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {deletingSupplier ? 'جارٍ الحذف...' : 'تأكيد الحذف نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
