import React, { useState, useEffect, useCallback } from 'react';
import { Supplier, Delivery, Payment, Deduction, DashboardStats, StatementMovement, StatementSummary } from './types/index.ts';
import { api } from './api/client.ts';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { DeliveriesView } from './components/DeliveriesView.tsx';
import { PaymentsView } from './components/PaymentsView.tsx';
import { StatementView } from './components/StatementView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SettingsBackupView } from './components/SettingsBackupView.tsx';
import { NewDeliveryModal } from './components/NewDeliveryModal.tsx';
import { RecordPaymentModal } from './components/RecordPaymentModal.tsx';
import { RecordDeductionModal } from './components/RecordDeductionModal.tsx';
import { EditDeliveryModal } from './components/EditDeliveryModal.tsx';
import { CancelDeliveryModal } from './components/CancelDeliveryModal.tsx';
import { PrintModal, PrintDocumentType } from './components/PrintModal.tsx';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeSupplierId, setActiveSupplierId] = useState<string>('');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Modals
  const [newDeliveryOpen, setNewDeliveryOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordDeductionOpen, setRecordDeductionOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [cancellingDelivery, setCancellingDelivery] = useState<Delivery | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Print modal state
  const [printState, setPrintState] = useState<{
    isOpen: boolean;
    documentType: PrintDocumentType;
    delivery?: Delivery;
    payment?: Payment;
    deduction?: Deduction;
    statementMovements?: StatementMovement[];
    statementSummary?: StatementSummary;
    statementPeriodLabel?: string;
    previousBalance?: number;
  }>({
    isOpen: false,
    documentType: 'delivery',
  });

  // Initial load of suppliers
  useEffect(() => {
    api
      .getSuppliers()
      .then((list) => {
        setSuppliers(list);
        if (list.length > 0 && !activeSupplierId) {
          setActiveSupplierId(list[0].id);
        }
      })
      .catch((err) => console.error('Failed to load suppliers:', err));
  }, []);

  // Refresh all data when activeSupplierId changes or after mutations
  const refreshData = useCallback(async () => {
    if (!activeSupplierId) return;
    try {
      const [dels, pays, stats] = await Promise.all([
        api.getDeliveries(activeSupplierId),
        api.getPayments(activeSupplierId),
        api.getDashboard(activeSupplierId),
      ]);
      setDeliveries(dels);
      setPayments(pays);
      setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  }, [activeSupplierId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handlers
  const handleDeliveryCreated = async (delivery: Delivery, openPrint: boolean) => {
    showToast(`تم تسجيل التوريدة ${delivery.deliveryNumber} بنجاح`);
    await refreshData();
    if (openPrint) {
      // Fetch statement to find previous balance before this delivery
      try {
        const stmt = await api.getStatement(delivery.supplierId);
        // Previous balance before this delivery = current total closing - (delivery total - initial paid)
        const currentBal = stmt.summary.closingBalance;
        const prevBal = currentBal - (delivery.totalAmount - delivery.initialPaid);
        setPrintState({
          isOpen: true,
          documentType: 'delivery',
          delivery,
          previousBalance: Math.max(0, Math.round(prevBal * 100) / 100),
        });
      } catch {
        setPrintState({
          isOpen: true,
          documentType: 'delivery',
          delivery,
          previousBalance: 0,
        });
      }
    }
  };

  const handlePaymentRecorded = async (payment: Payment, openPrint: boolean) => {
    showToast(`تم تسجيل الدفعة ${payment.paymentNumber} بنجاح`);
    await refreshData();
    if (openPrint) {
      setPrintState({
        isOpen: true,
        documentType: 'payment',
        payment,
      });
    }
  };

  const handleDeductionRecorded = async (deduction: Deduction, openPrint: boolean) => {
    showToast(`تم تسجيل الخصم ${deduction.deductionNumber} بنجاح`);
    await refreshData();
    if (openPrint) {
      setPrintState({
        isOpen: true,
        documentType: 'deduction',
        deduction,
      });
    }
  };

  const handleDeliveryUpdated = async (updated: Delivery) => {
    showToast(`تم تحديث التوريدة ${updated.deliveryNumber}`);
    await refreshData();
  };

  const handleDeliveryCancelled = async (cancelled: Delivery) => {
    showToast(`تم إلغاء التوريدة ${cancelled.deliveryNumber}`, 'error');
    await refreshData();
  };

  const handlePrintDelivery = async (delivery: Delivery) => {
    try {
      const stmt = await api.getStatement(delivery.supplierId);
      const currentBal = stmt.summary.closingBalance;
      const prevBal = currentBal - (delivery.totalAmount - delivery.initialPaid);
      setPrintState({
        isOpen: true,
        documentType: 'delivery',
        delivery,
        previousBalance: Math.max(0, Math.round(prevBal * 100) / 100),
      });
    } catch {
      setPrintState({
        isOpen: true,
        documentType: 'delivery',
        delivery,
        previousBalance: 0,
      });
    }
  };

  const handlePrintPayment = (payment: Payment) => {
    setPrintState({
      isOpen: true,
      documentType: 'payment',
      payment,
    });
  };

  const handlePrintStatement = async (periodLabel = 'كشف الحساب الكامل') => {
    try {
      const res = await api.getStatement(activeSupplierId);
      setPrintState({
        isOpen: true,
        documentType: 'statement',
        statementMovements: res.movements,
        statementSummary: res.summary,
        statementPeriodLabel: periodLabel,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const activeSupplier = suppliers.find((s) => s.id === activeSupplierId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        suppliers={suppliers}
        activeSupplierId={activeSupplierId}
        setActiveSupplierId={setActiveSupplierId}
        onOpenNewDelivery={() => setNewDeliveryOpen(true)}
        onOpenNewPayment={() => setRecordPaymentOpen(true)}
        onOpenNewDeduction={() => setRecordDeductionOpen(true)}
      />

      {/* Main Content Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={dashboardStats}
            supplier={activeSupplier}
            onNavigate={setCurrentTab}
            onOpenNewDelivery={() => setNewDeliveryOpen(true)}
            onOpenNewPayment={() => setRecordPaymentOpen(true)}
            onOpenNewDeduction={() => setRecordDeductionOpen(true)}
            onPrintDelivery={handlePrintDelivery}
            onPrintPayment={handlePrintPayment}
            onPrintStatement={() => handlePrintStatement('كشف الحساب الإجمالي')}
          />
        )}

        {currentTab === 'deliveries' && (
          <DeliveriesView
            deliveries={deliveries}
            onOpenNewDelivery={() => setNewDeliveryOpen(true)}
            onPrintDelivery={handlePrintDelivery}
            onEditDelivery={(d) => setEditingDelivery(d)}
            onCancelDelivery={(d) => setCancellingDelivery(d)}
          />
        )}

        {currentTab === 'payments' && (
          <PaymentsView
            payments={payments}
            onOpenNewPayment={() => setRecordPaymentOpen(true)}
            onPrintPayment={handlePrintPayment}
          />
        )}

        {currentTab === 'statement' && (
          <StatementView
            supplier={activeSupplier}
            onPrintStatement={handlePrintStatement}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView supplier={activeSupplier} />
        )}

        {currentTab === 'settings' && (
          <SettingsBackupView
            suppliers={suppliers}
            onSuppliersUpdated={() => {
              api.getSuppliers().then((list) => {
                setSuppliers(list);
                if (list.length > 0 && !list.find((s) => s.id === activeSupplierId)) {
                  setActiveSupplierId(list[0].id);
                }
              });
              refreshData();
            }}
            activeSupplierId={activeSupplierId}
            setActiveSupplierId={setActiveSupplierId}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>نظام حسابات تاجر البطاطس لمطعم الشامي © 2026</span>
          <span className="font-mono text-slate-400 text-[11px]">
            AL SHAMI · Potato Supplier Accounting System
          </span>
        </div>
      </footer>

      {/* Modals */}
      <NewDeliveryModal
        isOpen={newDeliveryOpen}
        onClose={() => setNewDeliveryOpen(false)}
        suppliers={suppliers}
        activeSupplierId={activeSupplierId}
        onDeliveryCreated={handleDeliveryCreated}
      />

      <RecordPaymentModal
        isOpen={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        suppliers={suppliers}
        activeSupplierId={activeSupplierId}
        onPaymentRecorded={handlePaymentRecorded}
      />

      <RecordDeductionModal
        isOpen={recordDeductionOpen}
        onClose={() => setRecordDeductionOpen(false)}
        suppliers={suppliers}
        activeSupplierId={activeSupplierId}
        onDeductionRecorded={handleDeductionRecorded}
      />

      <EditDeliveryModal
        delivery={editingDelivery}
        onClose={() => setEditingDelivery(null)}
        onDeliveryUpdated={handleDeliveryUpdated}
      />

      <CancelDeliveryModal
        delivery={cancellingDelivery}
        onClose={() => setCancellingDelivery(null)}
        onDeliveryCancelled={handleDeliveryCancelled}
      />

      <PrintModal
        isOpen={printState.isOpen}
        onClose={() => setPrintState((prev) => ({ ...prev, isOpen: false }))}
        documentType={printState.documentType}
        delivery={printState.delivery}
        payment={printState.payment}
        deduction={printState.deduction}
        statementMovements={printState.statementMovements}
        statementSummary={printState.statementSummary}
        statementPeriodLabel={printState.statementPeriodLabel}
        supplier={activeSupplier}
        previousBalance={printState.previousBalance}
      />
    </div>
  );
}
