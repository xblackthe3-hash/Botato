import React, { useState, useEffect } from 'react';
import { Supplier, Delivery, StatementSummary } from '../types/index.ts';
import { api } from '../api/client.ts';
import {
  formatCurrency,
  formatWeight,
  formatDateArabic,
} from '../utils/accounting.ts';
import {
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Scale,
  DollarSign,
  AlertCircle,
  Truck,
  CheckCircle2,
} from 'lucide-react';

interface ReportsViewProps {
  supplier: Supplier | undefined;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ supplier }) => {
  const [data, setData] = useState<{
    dailyBreakdown: { date: string; totalWeight: number; totalValue: number; count: number; paid: number }[];
    unpaidDeliveries: Delivery[];
    weightedAvgPrice: number;
    summary: StatementSummary;
    totalDeliveriesCount: number;
    totalPaymentsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supplier) return;
    setLoading(true);
    api
      .getReports(supplier.id)
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load reports:', err))
      .finally(() => setLoading(false));
  }, [supplier?.id]);

  const handleExportDailyCSV = () => {
    if (!data?.dailyBreakdown.length) return;
    const headers = ['التاريخ', 'عدد التوريدات', 'إجمالي الوزن (كجم)', 'إجمالي القيمة (ج.م)', 'المدفوع (ج.م)'];
    const rows = data.dailyBreakdown.map((d) => [
      d.date,
      String(d.count),
      String(d.totalWeight),
      String(d.totalValue),
      String(d.paid),
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير-توريدات-يومي-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return (
      <div className="py-12 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">جارٍ تجميع التقارير التحليلية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            التقارير التحليلية لمحاسبة البطاطس
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            متوسط الأسعار الموزونة، تحليلات التوريد اليومية، وقائمة الفواتير غير المسددة
          </p>
        </div>

        <button
          onClick={handleExportDailyCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>تصدير التقرير اليومي CSV</span>
        </button>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block mb-1">متوسط سعر الكيلو الموزون</span>
          <div className="text-2xl font-bold text-amber-800 font-mono">
            {data.weightedAvgPrice ? `${data.weightedAvgPrice} ج.م` : '0.00 ج.م'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            إجمالي القيمة ({formatCurrency(data.summary.totalDeliveryValue)}) ÷ إجمالي الوزن ({formatWeight(data.summary.totalWeightKg)})
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block mb-1">إجمالي المديونية الحالية</span>
          <div
            className={`text-2xl font-bold font-mono ${
              data.summary.closingBalance > 0
                ? 'text-rose-700'
                : data.summary.closingBalance < 0
                ? 'text-cyan-700'
                : 'text-emerald-700'
            }`}
          >
            {data.summary.closingBalance < 0
              ? `+${formatCurrency(Math.abs(data.summary.closingBalance))} (دائن)`
              : formatCurrency(data.summary.closingBalance)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">المتبقي على المطعم للمورد</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block mb-1">المدفوع نقداً مقابل فودافون كاش</span>
          <div className="text-sm font-bold text-slate-900 font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans font-normal text-xs">نقدي:</span>
              <span>{formatCurrency(data.summary.totalCashPaid)}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span className="text-slate-500 font-sans font-normal text-xs">فودافون كاش:</span>
              <span>{formatCurrency(data.summary.totalVodafoneCashPaid)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block mb-1">الفواتير المعلقة غير المسددة</span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {data.unpaidDeliveries.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            بإجمالي متبقي:{' '}
            {formatCurrency(data.unpaidDeliveries.reduce((sum, d) => sum + d.remainingAmount, 0))}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Daily Breakdown + Unpaid Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Breakdown Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              تقرير التوريدات المجمعة لكل يوم
            </h3>
            <span className="text-xs text-slate-500">{data.dailyBreakdown.length} أيام مسجلة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">عدد الشحنات</th>
                  <th className="py-2.5 px-3">إجمالي الوزن</th>
                  <th className="py-2.5 px-3">إجمالي القيمة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {data.dailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 font-sans">
                      لا توجد بيانات
                    </td>
                  </tr>
                ) : (
                  data.dailyBreakdown.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{row.date}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{row.count} توريدة</td>
                      <td className="py-2.5 px-3 font-bold text-amber-900">{formatWeight(row.totalWeight)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatCurrency(row.totalValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unpaid Deliveries List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              قائمة التوريدات غير المسددة بالكامل
            </h3>
            <span className="text-xs text-slate-500">{data.unpaidDeliveries.length} فاتورة</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {data.unpaidDeliveries.length === 0 ? (
              <div className="py-8 text-center text-emerald-600 text-xs font-semibold flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                جميع الفواتير السابقة مسددة بالكامل أو الحساب مصفى
              </div>
            ) : (
              data.unpaidDeliveries.map((del) => (
                <div
                  key={del.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{del.deliveryNumber}</span>
                      <span className="text-[11px] text-slate-500 font-sans">({del.date})</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-sans mt-0.5">
                      {del.weightKg} كجم × {del.pricePerKg} ج.م = {formatCurrency(del.totalAmount)}
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-[11px] text-slate-400 font-sans block">المتبقي:</span>
                    <span className="font-bold text-rose-700 text-sm">
                      {formatCurrency(del.remainingAmount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
