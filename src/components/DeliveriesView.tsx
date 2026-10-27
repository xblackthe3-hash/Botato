import React, { useState } from 'react';
import { Delivery } from '../types/index.ts';
import {
  formatCurrency,
  formatWeight,
  formatDateArabic,
} from '../utils/accounting.ts';
import {
  Search,
  Filter,
  Printer,
  Edit3,
  XCircle,
  Truck,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface DeliveriesViewProps {
  deliveries: Delivery[];
  onOpenNewDelivery: () => void;
  onPrintDelivery: (delivery: Delivery) => void;
  onEditDelivery: (delivery: Delivery) => void;
  onCancelDelivery: (delivery: Delivery) => void;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({
  deliveries,
  onOpenNewDelivery,
  onPrintDelivery,
  onEditDelivery,
  onCancelDelivery,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  const filtered = deliveries.filter((d) => {
    const matchesSearch =
      d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.notes && d.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || d.status === statusFilter;

    const matchesDate = !dateFilter || d.date === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: Delivery['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            مدفوعة بالكامل
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            مدفوعة جزئياً
          </span>
        );
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" />
            غير مدفوعة (آجل)
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-300 line-through">
            ملغاة
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" />
            سجل توريدات البطاطس
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            عرض وتتبع جميع التوريدات المستلمة بالكيلو مع أسعارها المستقلة وحالات السداد
          </p>
        </div>

        <button
          onClick={onOpenNewDelivery}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل توريدة جديدة</span>
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
            placeholder="بحث برقم التوريدة، اسم المورد، أو الملاحظات..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">جميع حالات السداد</option>
            <option value="paid">مدفوعة بالكامل</option>
            <option value="partial">مدفوعة جزئياً</option>
            <option value="unpaid">غير مدفوعة (آجل)</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            title="تصفية حسب التاريخ"
          />
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-3">رقم التوريدة</th>
                <th className="py-3 px-3">التاريخ والوقت</th>
                <th className="py-3 px-3">المورد</th>
                <th className="py-3 px-3">الوزن بالكيلو</th>
                <th className="py-3 px-3">سعر الكيلو</th>
                <th className="py-3 px-3">إجمالي التوريدة</th>
                <th className="py-3 px-3">المدفوع</th>
                <th className="py-3 px-3">المتبقي</th>
                <th className="py-3 px-3">حالة السداد</th>
                <th className="py-3 px-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    لا توجد توريدات مطابقة لمعايير البحث
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr
                    key={d.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      d.status === 'cancelled' ? 'opacity-60 bg-slate-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {d.deliveryNumber}
                    </td>

                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-mono">
                      <span>{d.date}</span>
                      {d.time && <span className="text-[10px] text-slate-400 block">{d.time}</span>}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {d.supplierName}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-amber-900">
                      {formatWeight(d.weightKg)}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-800">
                      {d.pricePerKg} ج.م
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {formatCurrency(d.totalAmount)}
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-emerald-700">
                      {formatCurrency(d.initialPaid)}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-rose-700">
                      {formatCurrency(d.remainingAmount)}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(d.status)}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onPrintDelivery(d)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="طباعة الفاتورة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {d.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => onEditDelivery(d)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="تعديل التوريدة"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onCancelDelivery(d)}
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="إلغاء التوريدة"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
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
