import React from 'react';
import { DashboardStats, Supplier, Delivery, Payment } from '../types/index.ts';
import {
  formatCurrency,
  formatWeight,
  formatDateArabic,
} from '../utils/accounting.ts';
import {
  Scale,
  DollarSign,
  Wallet,
  Clock,
  Plus,
  ArrowUpRight,
  Printer,
  FileText,
  Truck,
  TrendingUp,
  Receipt,
  Download,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface DashboardViewProps {
  stats: DashboardStats | null;
  supplier: Supplier | undefined;
  onNavigate: (tab: string) => void;
  onOpenNewDelivery: () => void;
  onOpenNewPayment: () => void;
  onOpenNewDeduction: () => void;
  onPrintDelivery: (delivery: Delivery) => void;
  onPrintPayment: (payment: Payment) => void;
  onPrintStatement: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  supplier,
  onNavigate,
  onOpenNewDelivery,
  onOpenNewPayment,
  onOpenNewDeduction,
  onPrintDelivery,
  onPrintPayment,
  onPrintStatement,
}) => {
  if (!stats) {
    return (
      <div className="py-12 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">جارٍ تحميل بيانات لوحة التحكم...</p>
      </div>
    );
  }

  const isDebtor = stats.totalCurrentDebt > 0;
  const isCreditor = stats.totalCurrentDebt < 0;

  return (
    <div className="space-y-6">
      {/* Welcome & Primary Overview Banner */}
      <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
              <span>مطعم الشامي · إدارة حسابات المورد</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {supplier ? supplier.name : 'دفتر حسابات تاجر البطاطس'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              متابعة دقيقة لكل كيلو بطاطس مستلم، حساب تلقائي للفواتير، وترحيل آلي وفوري للمديونيات دون تداخل الحسابات.
            </p>
          </div>

          {/* Current Debt Highlight */}
          <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-xl p-4 min-w-[240px] text-left">
            <span className="text-xs text-slate-300 block mb-1">
              {isCreditor ? 'رصيد دائن للمطعم لدى المورد' : 'إجمالي المديونية الحالية المستحقة'}
            </span>
            <div
              className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                isCreditor ? 'text-emerald-300' : isDebtor ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              {isCreditor
                ? `+${formatCurrency(Math.abs(stats.totalCurrentDebt))}`
                : formatCurrency(stats.totalCurrentDebt)}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between">
              <span>الحالة: {isDebtor ? 'مستحق للمورد' : isCreditor ? 'فائض للمطعم' : 'الحساب مصفى'}</span>
              <button
                onClick={onPrintStatement}
                className="text-amber-300 hover:text-white underline cursor-pointer"
              >
                طباعة كشف
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2.5">
        <button
          onClick={onOpenNewDelivery}
          className="flex flex-col items-center justify-center p-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          <Plus className="w-5 h-5 mb-1 text-amber-200 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold whitespace-nowrap">توريدة جديدة</span>
        </button>

        <button
          onClick={onOpenNewPayment}
          className="flex flex-col items-center justify-center p-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          <Wallet className="w-5 h-5 mb-1 text-emerald-200 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold whitespace-nowrap">تسجيل دفعة</span>
        </button>

        <button
          onClick={onOpenNewDeduction}
          className="flex flex-col items-center justify-center p-3 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          <span className="text-lg font-bold mb-0.5 leading-none">✂</span>
          <span className="text-xs font-bold whitespace-nowrap">تسجيل خصم</span>
        </button>

        <button
          onClick={() => onNavigate('statement')}
          className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          <FileText className="w-5 h-5 mb-1 text-slate-500 group-hover:text-amber-600 transition-colors" />
          <span className="text-xs font-medium whitespace-nowrap">كشف الحساب</span>
        </button>

        <button
          onClick={() => onNavigate('deliveries')}
          className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          <Truck className="w-5 h-5 mb-1 text-slate-500 group-hover:text-amber-600 transition-colors" />
          <span className="text-xs font-medium whitespace-nowrap">سجل التوريدات</span>
        </button>

        <button
          onClick={() => onNavigate('payments')}
          className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          <Receipt className="w-5 h-5 mb-1 text-slate-500 group-hover:text-amber-600 transition-colors" />
          <span className="text-xs font-medium whitespace-nowrap">سجل المدفوعات</span>
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          <TrendingUp className="w-5 h-5 mb-1 text-slate-500 group-hover:text-amber-600 transition-colors" />
          <span className="text-xs font-medium whitespace-nowrap">التقارير المالية</span>
        </button>

        <button
          onClick={onPrintStatement}
          className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          <Printer className="w-5 h-5 mb-1 text-slate-500 group-hover:text-amber-600 transition-colors" />
          <span className="text-xs font-medium whitespace-nowrap">طباعة كشف</span>
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          <Download className="w-5 h-5 mb-1 text-slate-500 group-hover:text-amber-600 transition-colors" />
          <span className="text-xs font-medium whitespace-nowrap">النسخ الاحتياطي</span>
        </button>
      </div>

      {/* Today's Metrics Strip */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>حركة اليوم</span>
            <span className="text-xs font-normal text-slate-500">
              ({formatDateArabic(new Date().toISOString().split('T')[0])})
            </span>
          </h2>
          <span className="text-xs text-slate-500">{stats.todayDeliveriesCount} توريدات اليوم</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Value Today */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block mb-1">إجمالي توريدات اليوم</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
              {formatCurrency(stats.todayDeliveryValue)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">مجموع الفواتير المسجلة اليوم</div>
          </div>

          {/* 2. Weight Today */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block mb-1">وزن بطاطس اليوم</span>
            <div className="text-lg sm:text-xl font-bold text-amber-700 font-mono">
              {formatWeight(stats.todayPotatoWeightKg)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">مستلم بالمطعم اليوم</div>
          </div>

          {/* 3. Deliveries Count Today */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block mb-1">عدد التوريدات اليوم</span>
            <div className="text-lg sm:text-xl font-bold text-slate-800 font-mono">
              {stats.todayDeliveriesCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">شحنة بطاطس</div>
          </div>

          {/* 4. Paid Today */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block mb-1">إجمالي المدفوع اليوم</span>
            <div className="text-lg sm:text-xl font-bold text-emerald-700 font-mono">
              {formatCurrency(stats.todayPaid)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">مسدد وقت التوريد ودفعات</div>
          </div>

          {/* 5. Remaining Today */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-500 block mb-1">المتبقي من توريدات اليوم</span>
            <div className="text-lg sm:text-xl font-bold text-rose-700 font-mono">
              {formatCurrency(stats.todayRemaining)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">يُرحل لرصيد المورد</div>
          </div>
        </div>
      </div>

      {/* All-Time Financial Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block mb-1">إجمالي المدفوع نقدًا (كاش)</span>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {formatCurrency(stats.totalCashPaidAllTime)}
            </div>
            <span className="text-[11px] text-slate-400">إجمالي مدفوعات الخزينة النقدية</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
            ج.م
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block mb-1">إجمالي فودافون كاش</span>
            <div className="text-xl font-bold text-rose-700 font-mono">
              {formatCurrency(stats.totalVodafonePaidAllTime)}
            </div>
            <span className="text-[11px] text-slate-400">إجمالي التحويلات المحفظة</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
            VF
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block mb-1">إجمالي الخصومات (تالف/سعر)</span>
            <div className="text-xl font-bold text-rose-800 font-mono">
              {formatCurrency(stats.totalDiscountsAllTime || 0)}
            </div>
            <span className="text-[11px] text-slate-400">تسويات خصم موثقة بالأسباب</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm">
            ✂
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block mb-1">إجمالي بطاطس مستلمة (شامل)</span>
            <div className="text-xl font-bold text-amber-800 font-mono">
              {formatWeight(stats.totalWeightAllTime)}
            </div>
            <span className="text-[11px] text-slate-400">منذ بدء التعامل مع المورد</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Last Delivery & Last Payment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Last Delivery Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">آخر توريدة مسجلة</h3>
            </div>
            {stats.lastDelivery && (
              <button
                onClick={() => onPrintDelivery(stats.lastDelivery!)}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة الفاتورة
              </button>
            )}
          </div>

          {stats.lastDelivery ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">رقم التوريدة:</span>
                <span className="font-mono font-bold text-slate-800">
                  {stats.lastDelivery.deliveryNumber}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">التاريخ والوقت:</span>
                <span className="font-mono text-slate-800">
                  {stats.lastDelivery.date} ({stats.lastDelivery.time})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">الوزن وسعر الكيلو:</span>
                <span className="font-mono text-slate-800">
                  {stats.lastDelivery.weightKg} كجم × {stats.lastDelivery.pricePerKg} ج.م
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">إجمالي الفاتورة:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(stats.lastDelivery.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">المبلغ المدفوع وقت التوريد:</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {formatCurrency(stats.lastDelivery.initialPaid)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">المتبقي:</span>
                <span className="font-mono font-bold text-rose-700">
                  {formatCurrency(stats.lastDelivery.remainingAmount)}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">لا توجد توريدات مسجلة بعد</div>
          )}
        </div>

        {/* Last Payment Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">آخر دفعة مسددة</h3>
            </div>
            {stats.lastPayment && (
              <button
                onClick={() => onPrintPayment(stats.lastPayment!)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة الإيصال
              </button>
            )}
          </div>

          {stats.lastPayment ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">رقم الدفعة:</span>
                <span className="font-mono font-bold text-slate-800">
                  {stats.lastPayment.paymentNumber}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">التاريخ والوقت:</span>
                <span className="font-mono text-slate-800">
                  {stats.lastPayment.date} ({stats.lastPayment.time})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">مبلغ الدفعة:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatCurrency(stats.lastPayment.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">طريقة الدفع:</span>
                <span className="text-slate-800 font-medium">
                  {stats.lastPayment.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : 'نقدي'}
                  {stats.lastPayment.vodafoneRef && ` (مرجع: ${stats.lastPayment.vodafoneRef})`}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">ملاحظات:</span>
                <span className="text-slate-700 truncate max-w-[200px]">
                  {stats.lastPayment.notes || '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">لا توجد دفعات مسجلة بعد</div>
          )}
        </div>
      </div>
    </div>
  );
};
