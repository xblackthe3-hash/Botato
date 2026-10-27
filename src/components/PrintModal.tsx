import React, { useState } from 'react';
import { Delivery, Payment, StatementMovement, StatementSummary, Supplier, Deduction } from '../types/index.ts';
import {
  formatCurrency,
  formatWeight,
  formatDateArabic,
} from '../utils/accounting.ts';
import { Printer, X, FileText, Check, Scissors } from 'lucide-react';

export type PrintDocumentType = 'delivery' | 'payment' | 'statement' | 'deduction';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: PrintDocumentType;
  delivery?: Delivery;
  payment?: Payment;
  deduction?: Deduction;
  statementMovements?: StatementMovement[];
  statementSummary?: StatementSummary;
  statementPeriodLabel?: string;
  supplier?: Supplier;
  previousBalance?: number;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  documentType,
  delivery,
  payment,
  deduction,
  statementMovements,
  statementSummary,
  statementPeriodLabel,
  supplier,
  previousBalance = 0,
}) => {
  const [paperSize, setPaperSize] = useState<'a4' | 'thermal80' | 'thermal58'>('a4');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getContainerClass = () => {
    if (paperSize === 'thermal80') return 'thermal-80 max-w-[340px] text-xs font-mono p-4 bg-white mx-auto border border-dashed border-slate-300';
    if (paperSize === 'thermal58') return 'thermal-58 max-w-[260px] text-[11px] font-mono p-2 bg-white mx-auto border border-dashed border-slate-300';
    return 'max-w-2xl text-xs sm:text-sm p-8 bg-white mx-auto shadow-md border border-slate-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      {/* Outer container */}
      <div className="bg-slate-100 rounded-2xl w-full max-w-4xl overflow-hidden my-4 border border-slate-300 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Control Bar (Never prints) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white shrink-0 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold">معاينة وطباعة المستند المحاسبي</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Paper Size selector */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setPaperSize('a4')}
                className={`px-3 py-1 rounded cursor-pointer ${
                  paperSize === 'a4' ? 'bg-amber-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                ورق A4
              </button>
              <button
                onClick={() => setPaperSize('thermal80')}
                className={`px-3 py-1 rounded cursor-pointer ${
                  paperSize === 'thermal80' ? 'bg-amber-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                حراري 80mm
              </button>
              <button
                onClick={() => setPaperSize('thermal58')}
                className={`px-3 py-1 rounded cursor-pointer ${
                  paperSize === 'thermal58' ? 'bg-amber-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                حراري 58mm
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              طباعة الآن (Ctrl+P)
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-200/50">
          <div className={`printable-area bg-white rounded-xl ${getContainerClass()}`}>
            {/* 1. DELIVERY INVOICE TEMPLATE */}
            {documentType === 'delivery' && delivery && (
              <div className="space-y-5 text-slate-900">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                    مطعم الشامي
                  </h1>
                  <h2 className="text-sm sm:text-base font-bold text-amber-900 mt-0.5">
                    فاتورة توريد بطاطس بالكيلو
                  </h2>
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-600 mt-2 font-mono">
                    <span>رقم الفاتورة: <strong>{delivery.deliveryNumber}</strong></span>
                    <span>التاريخ: {delivery.date} {delivery.time && `(${delivery.time})`}</span>
                  </div>
                </div>

                {/* Supplier Info */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">اسم المورد:</span>
                    <strong className="text-slate-900">{delivery.supplierName}</strong>
                  </div>
                  {supplier?.phone && (
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">رقم الهاتف:</span>
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {delivery.notes && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">ملاحظات:</span>
                      <span className="text-slate-700">{delivery.notes}</span>
                    </div>
                  )}
                </div>

                {/* Calculation Details */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                      <tr>
                        <th className="py-2 px-3">البيان</th>
                        <th className="py-2 px-3">الوزن</th>
                        <th className="py-2 px-3">سعر الكيلو</th>
                        <th className="py-2 px-3">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      <tr>
                        <td className="py-2.5 px-3 font-sans font-medium">بطاطس طازجة (فرز أول)</td>
                        <td className="py-2.5 px-3 font-bold">{formatWeight(delivery.weightKg)}</td>
                        <td className="py-2.5 px-3">{delivery.pricePerKg} ج.م</td>
                        <td className="py-2.5 px-3 font-bold text-slate-950">
                          {formatCurrency(delivery.totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Equation Box */}
                <div className="p-2.5 bg-slate-100 rounded text-center text-xs font-mono font-semibold border border-slate-200">
                  المعادلة: {delivery.weightKg} كجم × {delivery.pricePerKg} ج.م = {formatCurrency(delivery.totalAmount)}
                </div>

                {/* Accounting & Debt Rollover Summary */}
                <div className="border-t-2 border-slate-900 pt-3 space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-sans text-slate-600">قيمة التوريدة الحالية:</span>
                    <span className="font-bold">{formatCurrency(delivery.totalAmount)}</span>
                  </div>

                  {previousBalance !== 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-sans text-slate-600">الرصيد السابق المنقول (دين قديم):</span>
                      <span className="font-bold text-slate-800">{formatCurrency(previousBalance)}</span>
                    </div>
                  )}

                  {previousBalance !== 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 bg-slate-50 px-2 rounded">
                      <span className="font-sans font-bold text-slate-900">إجمالي المستحق الكلي:</span>
                      <span className="font-black text-slate-950">
                        {formatCurrency(previousBalance + delivery.totalAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-800 font-bold">
                    <span className="font-sans">
                      المدفوع وقت الاستلام (
                      {delivery.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : delivery.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}
                      ):
                    </span>
                    <span>{formatCurrency(delivery.initialPaid)}</span>
                  </div>

                  <div className="flex justify-between py-2 bg-amber-50 px-2 rounded font-black text-sm text-slate-950">
                    <span className="font-sans">المتبقي النهائي المستحق:</span>
                    <span className="text-amber-900">
                      {formatCurrency((previousBalance + delivery.totalAmount) - delivery.initialPaid)}
                    </span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
                  <div>
                    <span className="block text-slate-500 mb-6">توقيع مستلم البطاطس (المطعم)</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-6">توقيع المورد أو السائق</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-3">
                  مطعم الشامي — تم إنشاء الفاتورة إلكترونياً وتوثيقها بدفتر الحسابات.
                </div>
              </div>
            )}

            {/* 2. PAYMENT RECEIPT TEMPLATE */}
            {documentType === 'payment' && payment && (
              <div className="space-y-5 text-slate-900">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                    مطعم الشامي
                  </h1>
                  <h2 className="text-sm sm:text-base font-bold text-emerald-800 mt-0.5">
                    إيصال استلام دفعة مالية (سند صرف)
                  </h2>
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-600 mt-2 font-mono">
                    <span>رقم الإيصال: <strong>{payment.paymentNumber}</strong></span>
                    <span>التاريخ: {payment.date} {payment.time && `(${payment.time})`}</span>
                  </div>
                </div>

                {/* Payment Data */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">المورد المستلم:</span>
                    <strong className="text-slate-900 text-sm">{payment.supplierName}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">المبلغ المدفوع:</span>
                    <strong className="text-emerald-800 text-base font-mono">
                      {formatCurrency(payment.amount)}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">طريقة الدفع:</span>
                    <span className="font-bold text-slate-800">
                      {payment.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : 'نقدي (خزينة المطعم)'}
                    </span>
                  </div>

                  {payment.vodafoneRef && (
                    <div className="flex justify-between py-1 border-b border-slate-200 font-mono">
                      <span className="text-slate-500">رقم مرجع فودافون كاش:</span>
                      <strong className="text-rose-700">{payment.vodafoneRef}</strong>
                    </div>
                  )}

                  {payment.notes && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">البيان / ملاحظات:</span>
                      <span className="text-slate-800">{payment.notes}</span>
                    </div>
                  )}
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
                  <div>
                    <span className="block text-slate-500 mb-6">المحاسب / إدارة مطعم الشامي</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-6">توقيع المستلم (المورد)</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-3">
                  سند مالي معتمد — مطعم الشامي
                </div>
              </div>
            )}

            {/* 3. DEDUCTION VOUCHER TEMPLATE */}
            {documentType === 'deduction' && deduction && (
              <div className="space-y-5 text-slate-900">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                    مطعم الشامي
                  </h1>
                  <h2 className="text-sm sm:text-base font-bold text-rose-800 mt-0.5">
                    إشعار خصم مالي من حساب تاجر البطاطس
                  </h2>
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-600 mt-2 font-mono">
                    <span>رقم إشعار الخصم: <strong>{deduction.deductionNumber}</strong></span>
                    <span>التاريخ: {deduction.date} {deduction.time && `(${deduction.time})`}</span>
                  </div>
                </div>

                {/* Deduction Details */}
                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-600">المورد المخصوم منه:</span>
                    <strong className="text-slate-900 text-sm">{deduction.supplierName}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-600">مبلغ الخصم المعتمد:</span>
                    <strong className="text-rose-800 text-base font-mono">
                      {formatCurrency(deduction.amount)}
                    </strong>
                  </div>

                  <div className="py-2 border-b border-rose-100">
                    <span className="text-slate-600 block mb-1">سبب الخصم الموثق:</span>
                    <div className="p-2.5 bg-white rounded-lg border border-rose-200 font-bold text-rose-950 text-xs">
                      {deduction.reason}
                    </div>
                  </div>

                  {deduction.notes && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-600">ملاحظات إضافية:</span>
                      <span className="text-slate-800">{deduction.notes}</span>
                    </div>
                  )}
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
                  <div>
                    <span className="block text-slate-500 mb-6">اعتماد إدارة مطعم الشامي</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-6">توقيع المورد بالعلم والموافقة</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-3">
                  إشعار خصم معتمد — مطعم الشامي
                </div>
              </div>
            )}

            {/* 4. STATEMENT REPORT TEMPLATE */}
            {documentType === 'statement' && statementSummary && statementMovements && (
              <div className="space-y-5 text-slate-900">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                    مطعم الشامي
                  </h1>
                  <h2 className="text-sm sm:text-base font-bold text-amber-900 mt-0.5">
                    كشف حساب تاجر البطاطس التفصيلي
                  </h2>
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-600 mt-2">
                    <span>المورد: <strong>{supplier?.name || 'مورد البطاطس'}</strong></span>
                    <span>الفترة: {statementPeriodLabel || 'الكشف الكامل'}</span>
                    <span>تاريخ الطباعة: {new Date().toISOString().split('T')[0]}</span>
                  </div>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">رصيد أول المدة</span>
                    <span className="font-bold text-slate-800">{formatCurrency(statementSummary.openingBalance)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">إجمالي التوريدات</span>
                    <span className="font-bold text-slate-900">{formatCurrency(statementSummary.totalDeliveryValue)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">إجمالي المدفوعات</span>
                    <span className="font-bold text-emerald-800">{formatCurrency(statementSummary.totalPaid)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">الرصيد النهائي المستحق</span>
                    <span className="font-black text-amber-900">{formatCurrency(statementSummary.closingBalance)}</span>
                  </div>
                </div>

                {/* Ledger Table */}
                <table className="w-full text-right text-[11px] border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                    <tr>
                      <th className="py-1.5 px-2">التاريخ</th>
                      <th className="py-1.5 px-2">المرجع</th>
                      <th className="py-1.5 px-2">الوزن</th>
                      <th className="py-1.5 px-2">سعر الكيلو</th>
                      <th className="py-1.5 px-2">قيمة التوريدة</th>
                      <th className="py-1.5 px-2">المدفوع</th>
                      <th className="py-1.5 px-2 font-mono">الرصيد بعد الحركة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {statementMovements.map((m) => (
                      <tr key={m.id}>
                        <td className="py-1.5 px-2 whitespace-nowrap">{m.date}</td>
                        <td className="py-1.5 px-2 font-bold">{m.refNumber}</td>
                        <td className="py-1.5 px-2">{m.weightKg ? formatWeight(m.weightKg) : '—'}</td>
                        <td className="py-1.5 px-2">{m.pricePerKg ? `${m.pricePerKg} ج.م` : '—'}</td>
                        <td className="py-1.5 px-2 font-bold text-amber-900">{m.debit > 0 ? formatCurrency(m.debit) : '—'}</td>
                        <td className="py-1.5 px-2 font-bold text-emerald-800">{m.credit > 0 ? formatCurrency(m.credit) : '—'}</td>
                        <td className="py-1.5 px-2 font-bold text-slate-950">{formatCurrency(m.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
                  <div>
                    <span className="block text-slate-500 mb-6">اعتماد إدارة مطعم الشامي</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-6">توقيع تاجر البطاطس بالموافقة</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
