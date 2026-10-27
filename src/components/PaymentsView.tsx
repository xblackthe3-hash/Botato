import React, { useState } from 'react';
import { Payment } from '../types/index.ts';
import { formatCurrency } from '../utils/accounting.ts';
import {
  Wallet,
  Search,
  Filter,
  Printer,
  Plus,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

interface PaymentsViewProps {
  payments: Payment[];
  onOpenNewPayment: () => void;
  onPrintPayment: (payment: Payment) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  onOpenNewPayment,
  onPrintPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.vodafoneRef && p.vodafoneRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMethod =
      methodFilter === 'all' || p.paymentMethod === methodFilter;

    const matchesDate = !dateFilter || p.date === dateFilter;

    return matchesSearch && matchesMethod && matchesDate;
  });

  const totalFilteredSum = filtered.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            سجل المدفوعات وسندات الصرف
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل التدقيق لكافة المبالغ المسددة للمورد (نقداً وفودافون كاش) مع إيصالات الدفع
          </p>
        </div>

        <button
          onClick={onOpenNewPayment}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل دفعة جديدة</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الدفعة، رقم مرجع فودافون، أو الملاحظات..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع طرق الدفع</option>
            <option value="cash">نقدي فقط (كاش)</option>
            <option value="vodafone_cash">فودافون كاش فقط</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            title="تصفية حسب التاريخ"
          />
        </div>
      </div>

      {/* Summary strip */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-950">
        <span>عدد الحركات: {filtered.length} دفعة</span>
        <span className="font-mono text-sm font-bold">
          إجمالي المبالغ المسددة: {formatCurrency(totalFilteredSum)}
        </span>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-3">رقم الدفعة</th>
                <th className="py-3 px-3">التاريخ والوقت</th>
                <th className="py-3 px-3">المورد</th>
                <th className="py-3 px-3">مبلغ الدفعة</th>
                <th className="py-3 px-3">طريقة الدفع</th>
                <th className="py-3 px-3">رقم مرجع فودافون كاش</th>
                <th className="py-3 px-3">فواتير مخصصة</th>
                <th className="py-3 px-3">ملاحظات</th>
                <th className="py-3 px-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                    لا توجد دفعات مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {p.paymentNumber}
                    </td>

                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      <span className="font-semibold block">{p.date}</span>
                      {p.time && <span className="text-[10px] text-slate-400 block">{p.time}</span>}
                    </td>

                    <td className="py-3 px-3 font-sans font-semibold text-slate-800">
                      {p.supplierName}
                    </td>

                    <td className="py-3 px-3 font-bold text-emerald-700 text-sm">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="py-3 px-3 font-sans">
                      {p.paymentMethod === 'vodafone_cash' ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                          فودافون كاش
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-800 font-semibold">
                          نقدي (خزينة)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      {p.vodafoneRef || '—'}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-sans">
                      {p.linkedDeliveryIds && p.linkedDeliveryIds.length > 0 ? (
                        <span className="text-amber-800 font-bold">
                          {p.linkedDeliveryIds.length} فواتير
                        </span>
                      ) : (
                        <span className="text-slate-400">حساب عام</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-sans text-slate-600 max-w-[200px] truncate">
                      {p.notes || '—'}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => onPrintPayment(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                        title="طباعة إيصال الدفع"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>إيصال</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
