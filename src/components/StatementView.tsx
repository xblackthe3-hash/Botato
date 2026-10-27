import React, { useState, useEffect } from 'react';
import { Supplier, StatementMovement, StatementSummary } from '../types/index.ts';
import { api } from '../api/client.ts';
import {
  formatCurrency,
  formatWeight,
  formatDateArabic,
} from '../utils/accounting.ts';
import {
  Printer,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Scale,
} from 'lucide-react';

interface StatementViewProps {
  supplier: Supplier | undefined;
  onPrintStatement: (periodLabel: string) => void;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'custom' | 'all';

export const StatementView: React.FC<StatementViewProps> = ({
  supplier,
  onPrintStatement,
}) => {
  const [filter, setFilter] = useState<PeriodFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [movements, setMovements] = useState<StatementMovement[]>([]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatement = () => {
    if (!supplier) return;
    setLoading(true);

    let start: string | undefined = undefined;
    let end: string | undefined = undefined;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (filter === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (filter === 'week') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 7);
      start = past7.toISOString().split('T')[0];
      end = todayStr;
    } else if (filter === 'month') {
      start = `${todayStr.substring(0, 7)}-01`;
      end = todayStr;
    } else if (filter === 'custom') {
      start = customStart || undefined;
      end = customEnd || undefined;
    }

    api
      .getStatement(supplier.id, start, end)
      .then((res) => {
        setMovements(res.movements);
        setSummary(res.summary);
      })
      .catch((err) => console.error('Failed to load statement:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatement();
  }, [supplier?.id, filter, customStart, customEnd]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!movements.length) return;
    const headers = [
      'التاريخ',
      'الوقت',
      'نوع الحركة',
      'رقم المرجع',
      'الوزن (كجم)',
      'سعر الكيلو (ج.م)',
      'قيمة التوريدة (مدين)',
      'المدفوع (دائن)',
      'طريقة الدفع',
      'الرصيد بعد الحركة',
      'ملاحظات',
    ];

    const rows = movements.map((m) => [
      m.date,
      m.time || '',
      m.type === 'delivery' ? 'توريدة بطاطس' : 'دفعة سداد',
      m.refNumber,
      m.weightKg ? String(m.weightKg) : '',
      m.pricePerKg ? String(m.pricePerKg) : '',
      m.debit ? String(m.debit) : '0',
      m.credit ? String(m.credit) : '0',
      m.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : m.paymentMethod === 'cash' ? 'نقدي' : '',
      String(m.balanceAfter),
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كشف-حساب-${supplier?.name || 'مورد'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getPeriodLabel = (): string => {
    if (filter === 'today') return 'كشف حساب اليوم';
    if (filter === 'week') return 'كشف حساب آخر 7 أيام';
    if (filter === 'month') return 'كشف حساب هذا الشهر';
    if (filter === 'custom') return `كشف حساب من ${customStart} إلى ${customEnd}`;
    return 'كشف الحساب الكامل منذ بداية التعامل';
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">كشف حساب تاجر البطاطس</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            دفتر الأستاذ التفصيلي لحركات التوريد والمدفوعات بترتيب زمني ورصيد تراكمي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onPrintStatement(getPeriodLabel())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>طباعة كشف الحساب</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/70 rounded-xl">
        {[
          { id: 'all', label: 'كشف كامل' },
          { id: 'today', label: 'اليوم' },
          { id: 'week', label: 'أسبوعي' },
          { id: 'month', label: 'شهري' },
          { id: 'custom', label: 'فترة مخصصة' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as PeriodFilter)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {filter === 'custom' && (
          <div className="flex items-center gap-2 pr-2">
            <span className="text-xs text-slate-600">من:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
            />
            <span className="text-xs text-slate-600">إلى:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
            />
          </div>
        )}
      </div>

      {/* Period Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block mb-1">رصيد أول المدة</span>
            <div className="text-sm sm:text-base font-bold text-slate-800 font-mono">
              {formatCurrency(summary.openingBalance)}
            </div>
            <span className="text-[10px] text-slate-400">رصيد ما قبل الفترة</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block mb-1">إجمالي الوزن المستلم</span>
            <div className="text-sm sm:text-base font-bold text-amber-800 font-mono">
              {formatWeight(summary.totalWeightKg)}
            </div>
            <span className="text-[10px] text-slate-400">{summary.deliveriesCount} توريدات</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block mb-1">إجمالي التوريدات</span>
            <div className="text-sm sm:text-base font-bold text-slate-900 font-mono">
              {formatCurrency(summary.totalDeliveryValue)}
            </div>
            <span className="text-[10px] text-slate-400">قيمة البطاطس بالفترة</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block mb-1">متوسط سعر الكيلو</span>
            <div className="text-sm sm:text-base font-bold text-slate-900 font-mono">
              {summary.weightedAvgPrice ? `${summary.weightedAvgPrice} ج.م` : '—'}
            </div>
            <span className="text-[10px] text-slate-400">متوسط موزون دقيق</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block mb-1">مدفوعات نقدية</span>
            <div className="text-sm sm:text-base font-bold text-slate-800 font-mono">
              {formatCurrency(summary.totalCashPaid)}
            </div>
            <span className="text-[10px] text-slate-400">سداد نقدي</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block mb-1">فودافون كاش</span>
            <div className="text-sm sm:text-base font-bold text-rose-700 font-mono">
              {formatCurrency(summary.totalVodafoneCashPaid)}
            </div>
            <span className="text-[10px] text-slate-400">تحويلات محفظة</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block mb-1">إجمالي الخصومات</span>
            <div className="text-sm sm:text-base font-bold text-rose-800 font-mono">
              {formatCurrency(summary.totalDiscounts || 0)}
            </div>
            <span className="text-[10px] text-slate-400">تالف وهالك وفروق</span>
          </div>

          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] text-amber-900 font-bold block mb-1">
              الرصيد النهائي المستحق
            </span>
            <div
              className={`text-sm sm:text-base font-bold font-mono ${
                summary.closingBalance < 0
                  ? 'text-cyan-800'
                  : summary.closingBalance > 0
                  ? 'text-amber-900'
                  : 'text-emerald-700'
              }`}
            >
              {summary.closingBalance < 0
                ? `+${formatCurrency(Math.abs(summary.closingBalance))} (دائن)`
                : formatCurrency(summary.closingBalance)}
            </div>
            <span className="text-[10px] text-amber-700">صافي المديونية المتبقية</span>
          </div>
        </div>
      )}

      {/* Detailed Chronological Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-3">التاريخ والوقت</th>
                <th className="py-3 px-3">نوع الحركة</th>
                <th className="py-3 px-3">رقم المرجع</th>
                <th className="py-3 px-3">الوزن (كجم)</th>
                <th className="py-3 px-3">سعر الكيلو</th>
                <th className="py-3 px-3">قيمة التوريدة (مدين)</th>
                <th className="py-3 px-3">المدفوع (دائن)</th>
                <th className="py-3 px-3">طريقة الدفع</th>
                <th className="py-3 px-3 font-mono">الرصيد بعد الحركة</th>
                <th className="py-3 px-3">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Prior Opening Balance Row if applicable */}
              {summary && summary.openingBalance !== 0 && (
                <tr className="bg-slate-50/80 font-semibold text-slate-700">
                  <td className="py-2.5 px-3 font-mono text-slate-500">—</td>
                  <td className="py-2.5 px-3">رصيد سابق منقول</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">رصيد أول المدة</td>
                  <td className="py-2.5 px-3">—</td>
                  <td className="py-2.5 px-3">—</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">
                    {summary.openingBalance > 0 ? formatCurrency(summary.openingBalance) : '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700">
                    {summary.openingBalance < 0 ? formatCurrency(Math.abs(summary.openingBalance)) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">ترحيل سابق</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {formatCurrency(summary.openingBalance)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">صافي الحركات السابقة للفترة</td>
                </tr>
              )}

              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    جارٍ تحميل كشف الحساب...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    لا توجد حركات مالية مسجلة في هذه الفترة
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isDelivery = m.type === 'delivery';
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/80 transition-colors font-mono"
                    >
                      <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                        <span className="font-semibold block">{m.date}</span>
                        <span className="text-[10px] text-slate-400">{m.time}</span>
                      </td>

                      <td className="py-2.5 px-3 font-sans">
                        {m.type === 'delivery' ? (
                          <span className="inline-flex items-center gap-1 text-amber-800 font-bold">
                            <Scale className="w-3.5 h-3.5 text-amber-600" />
                            توريدة بطاطس
                          </span>
                        ) : m.type === 'deduction' ? (
                          <span className="inline-flex items-center gap-1 text-rose-800 font-bold">
                            <span className="text-sm font-bold">✂</span>
                            خصم مالي
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                            سداد دفعة
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {m.refNumber}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700">
                        {m.weightKg ? formatWeight(m.weightKg) : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700">
                        {m.pricePerKg ? `${m.pricePerKg} ج.م` : '—'}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-amber-900">
                        {m.debit > 0 ? formatCurrency(m.debit) : '—'}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-emerald-700">
                        {m.credit > 0 ? (
                          m.type === 'deduction' ? (
                            <span className="text-rose-700 font-bold">
                              -{formatCurrency(m.credit)}
                            </span>
                          ) : (
                            formatCurrency(m.credit)
                          )
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-sans">
                        {m.type === 'deduction' ? (
                          <span className="text-rose-800 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            تسوية خصم
                          </span>
                        ) : m.paymentMethod === 'vodafone_cash' ? (
                          <span className="text-rose-700 font-semibold">فودافون كاش</span>
                        ) : m.paymentMethod === 'cash' ? (
                          <span className="text-slate-800">نقدي</span>
                        ) : (
                          <span className="text-slate-400">آجل</span>
                        )}
                        {m.vodafoneRef && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {m.vodafoneRef}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/50">
                        <span
                          className={
                            m.balanceAfter > 0
                              ? 'text-amber-900'
                              : m.balanceAfter < 0
                              ? 'text-cyan-800'
                              : 'text-emerald-700'
                          }
                        >
                          {m.balanceAfter < 0
                            ? `+${formatCurrency(Math.abs(m.balanceAfter))} (دائن)`
                            : formatCurrency(m.balanceAfter)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-sans text-slate-600 max-w-[200px] truncate">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
