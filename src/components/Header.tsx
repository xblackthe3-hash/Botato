import React from 'react';
import { Supplier } from '../types/index.ts';
import { Plus, Building2, Menu, X, Receipt } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  suppliers: Supplier[];
  activeSupplierId: string;
  setActiveSupplierId: (id: string) => void;
  onOpenNewDelivery: () => void;
  onOpenNewPayment: () => void;
  onOpenNewDeduction: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  suppliers,
  activeSupplierId,
  setActiveSupplierId,
  onOpenNewDelivery,
  onOpenNewPayment,
  onOpenNewDeduction,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم' },
    { id: 'deliveries', label: 'سجل التوريدات' },
    { id: 'payments', label: 'سجل المدفوعات' },
    { id: 'statement', label: 'كشف الحساب' },
    { id: 'reports', label: 'التقارير' },
    { id: 'settings', label: 'النسخ والضبط' },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="text-right flex items-center gap-2 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-amber-600 transition-colors">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block leading-tight">
                  مطعم الشامي
                </span>
                <span className="text-[11px] font-medium text-amber-700 whitespace-nowrap block leading-tight">
                  حسابات تاجر البطاطس
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: 4–5 clean single-line text navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`py-1 hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 relative cursor-pointer ${
                  currentTab === item.id
                    ? 'text-amber-800 font-bold border-b-2 border-amber-600'
                    : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 primary action + supplier select + quick options */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {suppliers.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={activeSupplierId}
                  onChange={(e) => setActiveSupplierId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[120px] truncate"
                  title="المورد الحالي"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onOpenNewDeduction}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="تسجيل خصم مالي مع ذكر السبب"
            >
              خصم
            </button>

            <button
              onClick={onOpenNewPayment}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="تسجيل دفعة للمورد"
            >
              دفعة
            </button>

            <button
              onClick={onOpenNewDelivery}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>توريدة جديدة</span>
            </button>

            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {suppliers.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs mb-2">
              <span className="text-slate-500">المورد النشط:</span>
              <select
                value={activeSupplierId}
                onChange={(e) => setActiveSupplierId(e.target.value)}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 pb-2">
            <button
              onClick={() => {
                onOpenNewDelivery();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1 px-2 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              توريدة
            </button>
            <button
              onClick={() => {
                onOpenNewPayment();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              دفعة
            </button>
            <button
              onClick={() => {
                onOpenNewDeduction();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1 px-2 py-2 bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              خصم
            </button>
          </div>

          <div className="border-t border-slate-100 pt-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-right px-3 py-2 text-sm rounded-lg cursor-pointer ${
                  currentTab === item.id
                    ? 'bg-amber-50 text-amber-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
