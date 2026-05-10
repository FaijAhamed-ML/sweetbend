import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, setDoc, doc, updateDoc, deleteDoc, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Product, Inquiry, Sale, SaleItem, AppNotification, UserProfile 
} from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, ShoppingCart, User, Bell, 
  Trash2, Printer, CheckCircle, Clock, 
  TrendingUp, Package, MessageCircle, ArrowRight,
  Edit2, Save, X as XIcon, AlertTriangle, Phone
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useReactToPrint } from 'react-to-print';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface CustomerTab {
  id: string;
  items: SaleItem[];
  type: 'take' | 'pre';
  customerId?: string;
  customerName?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export default function POSDashboard() {
  const { user, profile, loading, isPOS } = useAuth();
  
  const [error, setError] = useState<string | null>(null);

  const handleFirestoreError = (err: unknown, operationType: OperationType, path: string | null) => {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errInfo: FirestoreErrorInfo = {
      error: errorMsg,
      authInfo: {
        userId: user?.uid,
        email: user?.email,
        emailVerified: user?.emailVerified,
        isAnonymous: user?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setError(`System Error (${operationType} at ${path}): ${errorMsg}`);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');
  const [activeTab, setActiveTab] = useState<'sales' | 'inquiries' | 'reports'>('sales');
  const [reportDateRange, setReportDateRange] = useState({
    start: subDays(new Date(), 7),
    end: new Date()
  });
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'take' | 'pre'>('all');
  const [reportCustomerId, setReportCustomerId] = useState<string>('all');
  
  // Multi-card system
  const [customerTabs, setCustomerTabs] = useState<CustomerTab[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [tempTabName, setTempTabName] = useState('');
  const [selectingCustomerFor, setSelectingCustomerFor] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    message: '',
    copies: 1,
    printer: 'Default'
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [invoiceSettings, setInvoiceSettings] = useState({
    shopName: 'Sweet Bend',
    shopLogo: '',
    shopAddress: '123 Sweet Street, Candy City',
    shopPhone: '+1 234 567 890',
    footerMessage: 'Premium Selection • Artisanal Quality',
    website: 'www.sweetbend.com'
  });
  const [isCustomizingTemplate, setIsCustomizingTemplate] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | AppNotification | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  const markAsRead = async (item: any) => {
    const collectionName = item.userId ? 'inquiries' : 'notifications';
    try {
      await updateDoc(doc(db, collectionName, item.id), { status: 'read' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${item.id}`);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const triggerPrint = useReactToPrint({
    contentRef: printRef,
  });

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const confirmPrint = () => {
    // In a real scenario with thermal printers and specific SDKs, we could handle copies and printer routing.
    // For browser printing, we trigger the dialog. We can't easily force "copies" in many browser print implementations,
    // but we can repeat the content in the ref if strictly necessary, or just rely on the browser print dialog.
    triggerPrint();
    setShowPrintModal(false);
  };

  useEffect(() => {
    onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    onSnapshot(query(collection(db, 'users'), where('role', '==', 'customer')), (snap) => {
      setCustomers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    
    // Inquiries notification listener
    const qInq = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'), limit(10));
    onSnapshot(qInq, (snap) => {
      setInquiries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Inquiry)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inquiries'));

    // Notifications listener
    const qNotif = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
    onSnapshot(qNotif, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    // Sales for reports
    const qSales = query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(100));
    onSnapshot(qSales, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));

    // Active Sessions real-time sync
    onSnapshot(collection(db, 'active_sessions'), (snap) => {
      const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerTab));
      setCustomerTabs(sessions);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'active_sessions'));

    onSnapshot(doc(db, 'settings', 'invoice'), (snap) => {
      if (snap.exists()) {
        setInvoiceSettings(snap.data() as any);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/invoice'));
  }, []);

  const addTab = async () => {
    const newTab: any = { 
      items: [], 
      type: 'take',
      customerId: (profile?.role === 'customer' ? profile.uid : null) || null,
      customerName: (profile?.role === 'customer' ? profile.name : null) || null,
      updatedAt: new Date()
    };

    try {
      const docRef = await addDoc(collection(db, 'active_sessions'), newTab);
      setActiveCardId(docRef.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'active_sessions');
    }
  };

  const removeTab = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'active_sessions', id));
      if (activeCardId === id) setActiveCardId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `active_sessions/${id}`);
    }
  };

  const startRenaming = (tab: CustomerTab) => {
    setRenamingTabId(tab.id);
    setTempTabName(tab.customerName || `T-${tab.id.slice(0, 3)}`);
  };

  const saveTabName = async () => {
    if (!renamingTabId) return;
    try {
      await updateDoc(doc(db, 'active_sessions', renamingTabId), {
        customerName: tempTabName,
        updatedAt: new Date()
      });
      setRenamingTabId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `active_sessions/${renamingTabId}`);
    }
  };

  const assignCustomer = async (tabId: string, customer: UserProfile | null) => {
    try {
      await updateDoc(doc(db, 'active_sessions', tabId), {
        customerId: customer?.uid || null,
        customerName: customer?.name || null,
        updatedAt: new Date()
      });
      setSelectingCustomerFor(null);
      setCustomerSearch('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `active_sessions/${tabId}`);
    }
  };

  const activeTabDetails = customerTabs.find(t => t.id === activeCardId);

  const addItemToActiveTab = async (product: Product, quantity: number = 1) => {
    if (!activeCardId || !activeTabDetails) return;
    
    const existing = activeTabDetails.items.find(i => i.productId === product.id);
    let newItems: SaleItem[];

    if (existing) {
      newItems = activeTabDetails.items.map(i => i.productId === product.id 
        ? { ...i, quantity: i.quantity + quantity, total: (i.quantity + quantity) * i.price } 
        : i
      );
    } else {
      newItems = [...activeTabDetails.items, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        total: quantity * product.price,
        unit: 'kg'
      }];
    }

    try {
      await updateDoc(doc(db, 'active_sessions', activeCardId), {
        items: newItems,
        updatedAt: new Date()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `active_sessions/${activeCardId}`);
    }
  };

  const addCustomItem = async () => {
    if (!activeCardId || !activeTabDetails) return;
    const customId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItems = [...activeTabDetails.items, {
      productId: customId,
      name: 'Custom Item',
      price: 0,
      quantity: 1,
      total: 0,
      unit: 'nos'
    }];

    try {
      await updateDoc(doc(db, 'active_sessions', activeCardId), {
        items: newItems,
        updatedAt: new Date()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `active_sessions/${activeCardId}`);
    }
  };

  const updateItemDetails = async (productId: string, updates: Partial<SaleItem>) => {
    if (!activeCardId || !activeTabDetails) return;
    
    const newItems = activeTabDetails.items.map(i => {
      if (i.productId !== productId) return i;
      const updated = { ...i, ...updates };
      if ('price' in updates || 'quantity' in updates) {
        updated.total = updated.quantity * updated.price;
      }
      return updated;
    }).filter(i => i.quantity > 0 || updates.name !== undefined);

    try {
      await updateDoc(doc(db, 'active_sessions', activeCardId), {
        items: newItems,
        updatedAt: new Date()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `active_sessions/${activeCardId}`);
    }
  };

  const updateTabType = async (type: 'take' | 'pre') => {
    if (!activeCardId) return;
    try {
      await updateDoc(doc(db, 'active_sessions', activeCardId), {
        type,
        updatedAt: new Date()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `active_sessions/${activeCardId}`);
    }
  };

  const updateItemQty = (productId: string, qty: number) => {
    updateItemDetails(productId, { quantity: Math.max(0, qty) });
  };

  const handleQuickStockUpdate = async (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      await updateDoc(doc(db, 'products', productId), { stockLevel: newStock });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${productId}`);
    }
  };

  const startEditing = (p: Product) => {
    setEditingProductId(p.id);
    setEditForm({ 
      name: p.name, 
      price: p.price, 
      stockLevel: p.stockLevel, 
      category: p.category,
      description: p.description 
    });
  };

  const cancelEditing = () => {
    setEditingProductId(null);
    setEditForm({});
  };

  const handleQuickProductUpdate = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        ...editForm,
        updatedAt: new Date()
      });
      setEditingProductId(null);
      setEditForm({});
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${productId}`);
    }
  };

  const saveInvoiceSettings = async () => {
    try {
      await updateDoc(doc(db, 'settings', 'invoice'), invoiceSettings);
      setIsCustomizingTemplate(false);
      alert('Invoice template updated successfully!');
    } catch (err) {
      // If it doesn't exist, setDoc
      try {
        await setDoc(doc(db, 'settings', 'invoice'), invoiceSettings);
        setIsCustomizingTemplate(false);
        alert('Invoice template updated successfully!');
      } catch (innerErr) {
        handleFirestoreError(innerErr, OperationType.WRITE, 'settings/invoice');
      }
    }
  };

  const handleWhatsApp = () => {
    if (!activeTabDetails || activeTabDetails.items.length === 0) return;

    const total = activeTabDetails.items.reduce((s, i) => s + i.total, 0);
    const shopHeader = `*${invoiceSettings.shopName}*\n${invoiceSettings.shopAddress}\n${invoiceSettings.shopPhone}\n\n`;
    const customerInfo = activeTabDetails.customerName ? `Customer: ${activeTabDetails.customerName}\n\n` : '';
    const orderItems = activeTabDetails.items.map(i => `• ${i.name} (${i.quantity}kg) - ${formatCurrency(i.total)}`).join('\n');
    const footer = `\n\n*Total Amount: ${formatCurrency(total)}*\n\n${invoiceSettings.footerMessage}\n${invoiceSettings.website}\nThank you for shopping with us!`;
    
    const fullMessage = encodeURIComponent(shopHeader + customerInfo + orderItems + footer);
    
    const customer = customers.find(c => c.uid === activeTabDetails.customerId);
    const cleanPhone = (customer?.personalPhone || '').replace(/\D/g, '');
    
    window.open(`https://wa.me/${cleanPhone}?text=${fullMessage}`, '_blank');
  };

  const handleWhatsAppForSale = (sale: Sale) => {
    const shopHeader = `*${invoiceSettings.shopName}*\n${invoiceSettings.shopAddress}\n${invoiceSettings.shopPhone}\n\n`;
    const customerInfo = sale.customerName ? `Customer: ${sale.customerName}\n\n` : '';
    const orderItems = sale.items.map(i => `• ${i.name} (${i.quantity}kg) - ${formatCurrency(i.total)}`).join('\n');
    const footer = `\n\n*Total Amount: ${formatCurrency(sale.totalAmount)}*\n\n${invoiceSettings.footerMessage}\n${invoiceSettings.website}\nThank you for shopping with us!`;
    
    const fullMessage = encodeURIComponent(shopHeader + customerInfo + orderItems + footer);
    
    const customer = customers.find(c => c.uid === sale.customerId);
    const cleanPhone = (customer?.personalPhone || '').replace(/\D/g, '');
    
    window.open(`https://wa.me/${cleanPhone}?text=${fullMessage}`, '_blank');
  };

  const checkout = async () => {
    if (!activeTabDetails || activeTabDetails.items.length === 0) return;
    
    const total = activeTabDetails.items.reduce((sum, i) => sum + i.total, 0);
    const saleId = Math.random().toString(36).substr(2, 9).toUpperCase();
    const saleRef = doc(collection(db, 'sales'));
    const saleData = {
      items: activeTabDetails.items,
      totalAmount: total,
      type: activeTabDetails.type,
      status: activeTabDetails.type === 'take' ? 'completed' : 'pending',
      posId: user?.uid,
      customerId: activeTabDetails.customerId || null,
      customerName: activeTabDetails.customerName || null,
      createdAt: new Date(),
    };

    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      // 1. Add the sale
      batch.set(saleRef, saleData);
      
      // 2. Update stock for each item
      for (const item of activeTabDetails.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const productRef = doc(db, 'products', item.productId);
          const newStock = Math.max(0, prod.stockLevel - item.quantity);
          
          batch.update(productRef, {
            stockLevel: newStock,
            updatedAt: new Date()
          });

          // 3. Handle Low stock notification in the same batch or separate logic
          // Since we want notifications to be reliable, we'll add them to the batch if needed
          if (newStock <= prod.lowStockThreshold) {
            const existingAlert = notifications.find(n => n.productId === prod.id && n.status === 'unread' && n.type === 'lowStock');
            if (!existingAlert) {
              const notifRef = doc(collection(db, 'notifications'));
              batch.set(notifRef, {
                type: 'lowStock',
                title: 'Low Stock Alert',
                message: `${prod.name} is low on stock (${newStock}kg remaining).`,
                productId: prod.id,
                status: 'unread',
                createdAt: new Date()
              });
            }
          }
        }
      }
      
      await batch.commit();
      alert('Order processed and stock updated!');
      await removeTab(activeCardId!);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'checkout-batch');
    }
  };

  // Report logic
  const filteredSalesForReports = sales.filter(s => {
    const saleDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
    const matchesRange = isWithinInterval(saleDate, { 
      start: startOfDay(reportDateRange.start), 
      end: endOfDay(reportDateRange.end) 
    });
    const matchesType = reportTypeFilter === 'all' || s.type === reportTypeFilter;
    const matchesCustomer = reportCustomerId === 'all' || s.customerId === reportCustomerId;
    return matchesRange && matchesType && matchesCustomer;
  });

  const selectedPeriodTotal = filteredSalesForReports.reduce((sum, s) => sum + s.totalAmount, 0);

  const productPerformance = filteredSalesForReports.reduce((acc: Record<string, { name: string, quantity: number, revenue: number }>, sale) => {
    sale.items.forEach(item => {
      if (!acc[item.productId]) {
        acc[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      acc[item.productId].quantity += item.quantity;
      acc[item.productId].revenue += item.total;
    });
    return acc;
  }, {});

  const topSellingProducts = (Object.values(productPerformance) as Array<{ name: string, quantity: number, revenue: number }>)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const lowStockThresholdItems = products.filter(p => p.stockLevel <= p.lowStockThreshold && p.stockLevel > 0);
  const outOfStockItems = products.filter(p => p.stockLevel <= 0);

  const reportData = filteredSalesForReports
    .reduce((acc: any[], sale) => {
      const date = format(sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt), 'MMM dd');
      const existing = acc.find(a => a.date === date);
      if (existing) {
        existing.amount += sale.totalAmount;
      } else {
        acc.push({ date, amount: sale.totalAmount });
      }
      return acc;
    }, [])
    .sort((a, b) => {
       const dateA = new Date(a.date);
       const dateB = new Date(b.date);
       return dateA.getTime() - dateB.getTime();
    });

  const categories: string[] = ['all', ...(Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[])];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    
    let matchesStock = true;
    if (stockFilter === 'inStock') matchesStock = p.stockLevel > p.lowStockThreshold;
    else if (stockFilter === 'lowStock') matchesStock = p.stockLevel <= p.lowStockThreshold && p.stockLevel > 0;
    else if (stockFilter === 'outOfStock') matchesStock = p.stockLevel <= 0;
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  if (loading) return <div className="h-screen flex items-center justify-center bg-bento-bg font-black text-xs uppercase tracking-widest text-bento-muted">Initializing Terminal...</div>;
  if (!isPOS && user?.email !== 'faijgroups@gmail.com') return <div className="h-screen flex flex-col items-center justify-center bg-bento-bg text-center p-8">
    <div className="w-16 h-16 bg-white rounded-3xl border border-bento-border flex items-center justify-center mb-6 shadow-sm">
      <AlertTriangle className="w-8 h-8 text-bento-danger" />
    </div>
    <h1 className="text-xl font-black mb-2">POS Access Restricted</h1>
    <p className="text-[10px] font-bold uppercase tracking-widest text-bento-muted max-w-xs">Restricted to Authorized Personnel only.</p>
  </div>;

  return (
    <div className="flex-1 p-2 md:p-4 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 h-[calc(100vh-64px)] overflow-hidden bg-bento-bg/10 relative">
      {error && (
        <div className="absolute top-4 right-4 left-4 z-[100] bg-bento-danger text-white p-4 rounded-2xl flex justify-between items-center shadow-2xl border border-white/20 animate-in fade-in slide-in-from-top-8">
           <div className="flex items-center gap-3">
             <AlertTriangle className="w-5 h-5" />
             <p className="text-xs font-black uppercase tracking-widest">{error}</p>
           </div>
           <button onClick={() => setError(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
             <XIcon className="w-5 h-5" />
           </button>
        </div>
      )}
      
      {/* COLUMN 1: Command & Metrics - Hidden on small screens, or handled via bottom nav */}
      <section className="hidden md:flex md:col-span-2 flex-col gap-4 overflow-hidden">
        <div className="bg-white rounded-[24px] border border-bento-border p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-6 p-2 bg-bento-bg rounded-2xl border border-bento-border">
            <div className="w-8 h-8 rounded-xl bg-bento-accent-dark text-white flex items-center justify-center font-black text-xs">
              {profile?.name?.[0] || 'A'}
            </div>
            <div className="min-w-0">
               <p className="text-[10px] font-black uppercase tracking-tight truncate">{profile?.name || 'Administrator'}</p>
               <p className="text-[8px] font-bold text-bento-muted opacity-60 italic">Session Active</p>
            </div>
          </div>
          
          <nav className="space-y-1">
            {[
              { id: 'sales', icon: ShoppingCart, label: 'Register' },
              { id: 'reports', icon: TrendingUp, label: 'Analytics' },
              { id: 'inquiries', icon: Bell, label: 'Feed', count: inquiries.filter(i => i.status === 'unread').length + notifications.filter(n => n.status === 'unread').length },
            ].map((item) => (
              <button
                key={`sidebar-${item.id}`}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative ${activeTab === item.id ? 'bg-bento-accent text-white shadow-lg shadow-bento-accent/20 font-black' : 'text-bento-muted hover:bg-bento-bg font-bold'}`}
              >
                <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-bento-muted'}`} />
                <span className="text-[10px] uppercase tracking-widest">{item.label}</span>
                {item.count > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-bento-danger text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce-subtle">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white rounded-[24px] border border-bento-border p-5 shadow-sm flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
           <div>
              <h4 className="text-[9px] font-black uppercase tracking-wider text-bento-muted mb-4 opacity-40">Period Revenue</h4>
              <p className="text-xl font-black text-bento-accent-dark">{formatCurrency(selectedPeriodTotal)}</p>
              <div className="h-1 bg-bento-bg rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-bento-accent w-2/3" />
              </div>
           </div>

           <div>
              <h4 className="text-[9px] font-black uppercase tracking-wider text-bento-muted mb-4 opacity-40">Critical Stock</h4>
              <div className="space-y-3">
                 {[...outOfStockItems, ...lowStockThresholdItems].slice(0, 3).map((p, idx) => (
                   <div key={`critical-${p.id}-${idx}`} className="text-[10px] flex justify-between items-center group">
                      <span className="font-bold truncate pr-2">{p.name}</span>
                      <span className={`font-black shrink-0 ${p.stockLevel <= 0 ? 'text-bento-danger' : 'text-amber-500'}`}>{p.stockLevel}kg</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {activeTab === 'sales' ? (
        <>
          {/* COLUMN 2: Catalog Engine */}
          <section className={`${showMobileCart ? 'hidden' : 'flex'} col-span-1 md:col-span-6 bg-white rounded-[24px] md:rounded-[32px] border border-bento-border shadow-sm flex flex-col overflow-hidden`}>
            <div className="p-5 md:p-6 border-b border-bento-border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                 <div>
                   <h2 className="text-xl md:text-2xl font-black tracking-tight mb-1">Catalog</h2>
                   <p className="text-[10px] font-bold text-bento-muted tracking-widest uppercase">Premium Selections</p>
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                    <select 
                      className="flex-1 sm:flex-initial px-4 py-3 bg-bento-bg border border-bento-border rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-bento-accent cursor-pointer appearance-none transition-all"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={`cat-${cat}`} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                      ))}
                    </select>
                 </div>
              </div>

              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-bento-muted group-focus-within:text-bento-accent transition-colors" />
                <input 
                  className="w-full pl-14 pr-6 py-4 md:py-5 bg-bento-bg border border-bento-border rounded-[24px] text-sm font-bold focus:ring-2 focus:ring-bento-accent focus:bg-white outline-none transition-all shadow-inner"
                  placeholder="Search catalog..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-bento-bg/5">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {filteredProducts.map(p => (
                    <motion.div 
                      key={`catalog-product-${p.id}`}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ y: -4, shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      onClick={() => addItemToActiveTab(p)}
                      className="bg-white border border-bento-border rounded-[28px] p-5 cursor-pointer hover:border-bento-accent transition-all group relative overflow-hidden flex flex-col h-full"
                    >
                      <div className="aspect-square bg-bento-bg rounded-[22px] mb-5 overflow-hidden relative shrink-0">
                         <img src={p.photoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                         <div className="absolute top-3 right-3 px-3 py-1 bg-white/95 backdrop-blur rounded-full text-[9px] font-black uppercase tracking-widest border border-bento-border shadow-sm">
                            {p.category}
                         </div>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-black text-sm md:text-base mb-2 group-hover:text-bento-accent transition-colors line-clamp-1">{p.name}</h3>
                        <div className="flex justify-between items-end gap-2">
                           <div>
                              <motion.p 
                                key={`stock-display-${p.id}-${p.stockLevel}`}
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: 1 }}
                                className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${p.stockLevel <= p.lowStockThreshold ? 'text-bento-danger' : 'text-bento-muted'}`}
                              >
                                {p.stockLevel} units remaining
                              </motion.p>
                              <p className="text-lg font-black text-bento-accent-dark tracking-tight">{formatCurrency(p.price)}</p>
                           </div>
                           <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-[20px] bg-bento-bg flex items-center justify-center text-bento-muted group-hover:bg-bento-accent group-hover:text-white transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-bento-accent/30 group-active:scale-90">
                              <Plus className="w-6 h-6 md:w-7 md:h-7" />
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          </section>

          {/* COLUMN 3: Sessions & Checkout */}
          <section className={`${showMobileCart ? 'flex' : 'hidden'} md:flex col-span-1 md:col-span-4 flex-col gap-4 overflow-hidden h-full`}>
            <div className="bg-white rounded-[24px] border border-bento-border p-4 md:p-5 shadow-sm">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-bento-muted">Sessions</h3>
                  <div className="flex gap-2">
                    <button onClick={addCustomItem} className="px-2 md:px-3 py-1.5 rounded-lg bg-bento-bg border border-bento-border text-bento-muted hover:text-bento-accent-dark flex items-center gap-1.5 transition-all group">
                       <Plus className="w-3 h-3" />
                       <span className="text-[8px] font-black uppercase tracking-widest">Custom</span>
                    </button>
                    <button onClick={addTab} className="w-8 h-8 rounded-lg bg-bento-accent-dark text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-bento-accent/20">
                       <Plus className="w-4 h-4" />
                    </button>
                  </div>
               </div>
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {customerTabs.map((tab, idx) => (
                    <div key={`session-tab-${tab.id}-${idx}`} className="relative group/tab">
                      {renamingTabId === tab.id ? (
                        <input
                          autoFocus
                          className="shrink-0 px-3 md:px-4 py-2 rounded-xl border bg-white border-bento-accent-dark text-[9px] md:text-[10px] font-black uppercase outline-none min-w-[80px] md:min-w-[100px]"
                          value={tempTabName}
                          onChange={e => setTempTabName(e.target.value)}
                          onBlur={saveTabName}
                          onKeyDown={e => e.key === 'Enter' && saveTabName()}
                        />
                      ) : (
                        <button 
                          onClick={() => setActiveCardId(tab.id)}
                          onDoubleClick={() => startRenaming(tab)}
                          className={`shrink-0 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border transition-all text-left min-w-[80px] md:min-w-[100px] ${activeCardId === tab.id ? 'bg-bento-accent-dark text-white border-transparent' : 'bg-white border-bento-border text-bento-muted'}`}
                        >
                           <p className="text-[9px] md:text-[10px] font-black uppercase truncate">{tab.customerName || `T-${tab.id.slice(0, 3)}`}</p>
                        </button>
                      )}
                    </div>
                  ))}
               </div>
            </div>

            <div className="flex-1 bg-white rounded-[24px] md:rounded-[32px] border border-bento-border shadow-sm flex flex-col overflow-hidden">
               {!activeTabDetails ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
                     <ShoppingCart className="w-8 h-8 mb-4" />
                     <p className="text-xs font-black uppercase tracking-widest">Select Session</p>
                  </div>
               ) : (
                 <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-bento-border bg-bento-bg/20">
                       <div className="flex justify-between items-start mb-4">
                          <h3 className="text-sm font-black uppercase tracking-tight">{activeTabDetails.customerName || 'Standard'}</h3>
                          <button onClick={() => removeTab(activeCardId!)} className="p-1 text-bento-muted hover:text-bento-danger">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                       <div className="flex gap-2">
                          {(['take', 'pre'] as const).map(type => (
                             <button
                                key={`pos-tab-type-${type}`}
                                onClick={() => updateTabType(type)}
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${activeTabDetails.type === type ? 'bg-white border-bento-accent text-bento-accent-dark shadow-sm' : 'border-transparent text-bento-muted'}`}
                             >
                               {type === 'take' ? 'Counter' : 'Advance'}
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                       {activeTabDetails.items.map((item, idx) => (
                          <div key={`cart-item-${item.productId}-${idx}`} className="flex gap-4 items-start group bg-bento-bg/5 p-3 rounded-2xl border border-transparent hover:border-bento-border hover:bg-white transition-all">
                             <div className="flex-1 min-w-0">
                                <input 
                                   className="w-full text-xs font-black bg-transparent border-none p-0 focus:ring-0 focus:bg-bento-bg/10 rounded px-1 -ml-1 mb-1 transition-colors"
                                   value={item.name}
                                   onChange={(e) => updateItemDetails(item.productId, { name: e.target.value })}
                                />
                                <div className="flex items-center gap-3">
                                   <div className="flex items-center bg-white border border-bento-border rounded-lg overflow-hidden shadow-sm">
                                      <button onClick={() => updateItemQty(item.productId, item.quantity - (item.unit === 'nos' ? 1 : 0.5))} className="px-2 py-1 hover:bg-bento-bg text-[10px] font-black">-</button>
                                      <input 
                                         type="number"
                                         className="w-12 text-center text-[9px] font-black bg-transparent border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                         value={item.quantity}
                                         onChange={(e) => updateItemQty(item.productId, parseFloat(e.target.value) || 0)}
                                      />
                                      <button onClick={() => updateItemQty(item.productId, item.quantity + (item.unit === 'nos' ? 1 : 0.5))} className="px-2 py-1 hover:bg-bento-bg text-[10px] font-black">+</button>
                                   </div>
                                   <input 
                                      className="w-12 text-[9px] font-black bg-transparent border-none p-0 focus:ring-0 uppercase text-bento-muted hover:text-bento-accent-dark transition-colors"
                                      value={item.unit || 'kg'}
                                      onChange={(e) => updateItemDetails(item.productId, { unit: e.target.value })}
                                   />
                                </div>
                             </div>
                             <div className="text-right flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1 group/price">
                                   <span className="text-[8px] font-black text-bento-muted opacity-40">@</span>
                                   <input 
                                      type="number"
                                      className="w-20 text-[10px] font-black text-right bg-transparent border-none p-0 focus:ring-0 focus:bg-bento-bg/10 rounded px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={item.price}
                                      onChange={(e) => updateItemDetails(item.productId, { price: parseFloat(e.target.value) || 0 })}
                                   />
                                </div>
                                <p className="text-xs font-black text-bento-accent-dark">{formatCurrency(item.total)}</p>
                                <button 
                                  onClick={() => updateItemQty(item.productId, 0)}
                                  className="mt-1 p-1 text-bento-muted hover:text-bento-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                   <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>

                    <div className="p-6 border-t border-bento-border bg-bento-bg/10">
                       <div className="flex justify-between items-center mb-6">
                          <span className="text-sm font-black uppercase">Total Due</span>
                          <span className="text-2xl font-black text-bento-accent-dark">{formatCurrency(activeTabDetails.items.reduce((s, i) => s + i.total, 0))}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-3 mb-3">
                          <button onClick={handlePrint} className="py-4 bg-white border-2 border-bento-accent rounded-2xl text-[10px] font-black uppercase text-bento-accent-dark flex items-center justify-center gap-2">
                            <Printer className="w-3 h-3" />
                            Print
                          </button>
                          <button onClick={handleWhatsApp} className="py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-colors">
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </button>
                       </div>
                       <button onClick={checkout} className="w-full py-4 bg-bento-accent-dark text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-bento-accent/20">Checkout</button>
                    </div>
                 </div>
               )}
            </div>
          </section>
        </>
      ) : activeTab === 'reports' ? (
        <section className="col-span-10 bg-white rounded-[32px] border border-bento-border p-8 shadow-sm flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-6">
               <h2 className="text-2xl font-black tracking-tight">Insights Hub</h2>
               <div className="flex items-center gap-2">
                 <span className="text-[9px] font-black uppercase text-bento-muted">Client:</span>
                 <select 
                    className="bg-bento-bg border border-bento-border rounded-lg px-3 py-1.5 text-[9px] font-black uppercase outline-none focus:ring-1 focus:ring-bento-accent"
                    value={reportCustomerId}
                    onChange={(e) => setReportCustomerId(e.target.value)}
                 >
                    <option value="all">All Clients</option>
                    {customers.map((c, idx) => (
                      <option key={`pos-report-customer-${c.uid}-${idx}`} value={c.uid}>{c.name}</option>
                    ))}
                 </select>
               </div>
            </div>
            <div className="flex items-center gap-3 bg-bento-bg p-1.5 rounded-[20px] border border-bento-border">
              <input 
                type="date"
                className="bg-transparent border-none text-[10px] font-black p-0 outline-none cursor-pointer px-4 py-2"
                value={format(reportDateRange.start, 'yyyy-MM-dd')}
                onChange={(e) => setReportDateRange({ ...reportDateRange, start: new Date(e.target.value) })}
              />
              <span className="font-black text-bento-muted opacity-30">/</span>
              <input 
                type="date"
                className="bg-transparent border-none text-[10px] font-black p-0 outline-none cursor-pointer px-4 py-2"
                value={format(reportDateRange.end, 'yyyy-MM-dd')}
                onChange={(e) => setReportDateRange({ ...reportDateRange, end: new Date(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Revenue', value: formatCurrency(selectedPeriodTotal), color: 'bg-bento-accent-dark text-white' },
              { label: 'Orders', value: filteredSalesForReports.length, color: 'bg-white' },
              { label: 'Stock Low', value: lowStockThresholdItems.length, color: 'bg-white' },
              { label: 'System', value: 'Active', color: 'bg-white' },
            ].map((stat, idx) => (
              <div key={`pos-stat-${stat.label}-${idx}`} className={`${stat.color} p-6 rounded-[28px] border border-bento-border shadow-sm`}>
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">{stat.label}</p>
                 <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-12 gap-8 min-h-0">
             <div className="col-span-8 bg-bento-bg/20 rounded-[32px] border border-bento-border p-8">
                <h3 className="text-[10px] font-black uppercase text-bento-muted mb-8">Revenue Stream</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <AreaChart data={reportData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#815431" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#815431" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748B' }} />
                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', shadow: 'none', fontWeight: 900 }} />
                    <Area type="monotone" dataKey="amount" stroke="#815431" strokeWidth={4} fill="url(#colorAmount)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
             <div className="col-span-12 bg-white rounded-[32px] border border-bento-border p-8 overflow-hidden flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-[10px] font-black uppercase text-bento-muted">Recent Transactions</h3>
                   <span className="text-[9px] font-black uppercase bg-bento-bg px-3 py-1 rounded-full text-bento-muted">{filteredSalesForReports.length} Matches</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                   <table className="w-full text-left">
                      <thead className="sticky top-0 bg-white z-10">
                         <tr className="text-[9px] font-black uppercase tracking-widest text-bento-muted border-b border-bento-border">
                            <th className="pb-4">Order ID</th>
                            <th className="pb-4">Customer</th>
                            <th className="pb-4">Items</th>
                            <th className="pb-4">Total</th>
                            <th className="pb-4 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-bento-bg">
                         {filteredSalesForReports.slice(0, 10).map((sale, idx) => (
                            <tr key={`pos-sale-item-${sale.id}-${idx}`} className="group hover:bg-bento-bg/30 transition-colors">
                               <td className="py-4 text-[10px] font-mono text-bento-muted">#{sale.id.slice(0, 8).toUpperCase()}</td>
                               <td className="py-4">
                                  <p className="text-xs font-black">{sale.customerName || 'Guest'}</p>
                                  <p className="text-[8px] font-bold text-bento-muted">{format(sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(), 'MMM dd, HH:mm')}</p>
                               </td>
                               <td className="py-4">
                                  <span className="text-[10px] font-bold text-bento-muted">{sale.items.length} items</span>
                               </td>
                               <td className="py-4">
                                  <span className="text-xs font-black text-bento-accent-dark">{formatCurrency(sale.totalAmount)}</span>
                               </td>
                               <td className="py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                     <button 
                                       onClick={() => handleWhatsAppForSale(sale)}
                                       className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                       title="Send via WhatsApp"
                                     >
                                       <MessageCircle className="w-4 h-4" />
                                     </button>
                                     <button 
                                       className="p-2 bg-bento-bg text-bento-muted rounded-lg hover:bg-bento-accent-dark hover:text-white transition-all shadow-sm"
                                       title="Print Copy"
                                     >
                                       <Printer className="w-4 h-4" />
                                     </button>
                                  </div>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        </section>
      ) : (
        <section className="col-span-10 bg-white rounded-[32px] border border-bento-border p-8 shadow-sm flex flex-col overflow-hidden">
           <h2 className="text-2xl font-black tracking-tight mb-8">System Feed</h2>
           <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-4 pt-1 pb-8">
              {[...notifications, ...inquiries].sort((a, b) => {
                 const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
                 const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
                 return timeB - timeA;
              }).map((n: any, idx) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`system-feed-${n.id}-${idx}`} 
                  onClick={() => {
                    setSelectedInquiry(n);
                    if (n.status === 'unread') markAsRead(n);
                  }}
                  className={`p-6 rounded-[28px] border transition-all cursor-pointer group relative flex gap-6 items-start ${
                    n.status === 'unread' 
                    ? 'bg-white border-bento-accent shadow-lg shadow-bento-accent/5' 
                    : 'bg-white/50 border-bento-border opacity-80 hover:opacity-100 hover:bg-white'
                  }`}
                >
                   {n.status === 'unread' && (
                      <div className="absolute top-6 right-6 w-2 h-2 bg-bento-accent rounded-full shadow-[0_0_10px_#815431]" />
                   )}
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                     n.status === 'unread' ? 'bg-bento-accent-dark text-white' : 'bg-bento-bg text-bento-muted'
                   }`}>
                      {n.userId ? <MessageCircle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                         <h4 className="font-black text-sm uppercase tracking-tight truncate pr-4">
                           {n.title || n.userName || 'System Alert'}
                         </h4>
                         <span className="text-[9px] font-black uppercase text-bento-muted whitespace-nowrap">
                           {format(n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt), 'HH:mm')}
                         </span>
                      </div>
                      <p className="text-xs font-medium text-bento-text/60 line-clamp-2 leading-relaxed mb-3">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-bento-bg rounded-full text-bento-muted">
                           {n.userId ? 'Direct Message' : 'Stock Alert'}
                        </span>
                        {n.status === 'unread' && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-bento-accent">Unread</span>
                        )}
                      </div>
                   </div>
                </motion.div>
              ))}
           </div>
        </section>
      )}

      <div className="hidden">
        <div ref={printRef} className="p-10 max-w-[400px] mx-auto text-black font-sans bg-white">
          <div className="text-center mb-6">
            {invoiceSettings.shopLogo ? (
              <img src={invoiceSettings.shopLogo} className="w-20 h-20 mx-auto object-contain mb-4" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 border-4 border-black rounded-full flex items-center justify-center overflow-hidden mx-auto mb-4">
                 <span className="font-black text-2xl">{invoiceSettings.shopName.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">{invoiceSettings.shopName}</h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-gray-500 mb-2">{invoiceSettings.footerMessage}</p>
            <p className="text-[9px] font-medium text-gray-400 mb-6">{invoiceSettings.shopAddress} • {invoiceSettings.shopPhone}</p>
            <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-gray-400 border-t border-b border-gray-100 py-2">
              <span>Receipt: #{activeCardId?.slice(0, 8).toUpperCase()}</span>
              <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>
          
                    {activeTabDetails?.customerName && (
                      <div className="mb-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-1">Customer</p>
                        <p className="text-sm font-black uppercase">{activeTabDetails.customerName}</p>
                      </div>
                    )}
                    
                    <div className="mb-6 pb-2 border-b-2 border-black">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-1">Items</p>
                    </div>

          <table className="w-full text-xs mb-8">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 font-black uppercase tracking-widest">Item</th>
                <th className="text-right py-3 font-black uppercase tracking-widest">Qty</th>
                <th className="text-right py-3 font-black uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeTabDetails?.items.map((item, idx) => (
                <tr key={`receipt-item-${item.productId}-${idx}`} className="border-b border-dashed border-gray-200">
                  <td className="py-4">
                    <p className="font-black text-xs uppercase">{item.name}</p>
                    <p className="text-[9px] font-medium text-gray-400 font-mono">@{formatCurrency(item.price)} per {item.unit || 'kg'}</p>
                  </td>
                  <td className="py-4 text-right">
                    <span className="font-bold text-xs">{item.quantity}{item.unit || 'kg'}</span>
                  </td>
                  <td className="py-4 text-right font-black text-xs">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-3 pt-4 border-t-2 border-black mb-10">
            <div className="flex justify-between items-center text-xs font-bold text-gray-500">
              <span className="uppercase tracking-widest">Subtotal</span>
              <span className="font-mono">{formatCurrency(activeTabDetails?.items.reduce((sum, i) => sum + i.total, 0) || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-xl font-black">
              <span className="uppercase tracking-tighter">Amount Due</span>
              <span className="text-2xl">{formatCurrency(activeTabDetails?.items.reduce((sum, i) => sum + i.total, 0) || 0)}</span>
            </div>
          </div>

          <div className="text-center py-6 border-t border-dashed border-gray-200">
            {printOptions.message && (
              <p className="text-[11px] font-bold italic mb-4 text-gray-700">"{printOptions.message}"</p>
            )}
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">Thank you for your trust</p>
            <p className="text-[8px] text-gray-400 leading-relaxed font-medium">
              {invoiceSettings.shopName} • {invoiceSettings.footerMessage}<br/>
              {invoiceSettings.website}
            </p>
          </div>

          <div className="mt-8 flex justify-center opacity-10">
             <div className="w-20 h-20 border-4 border-black rounded-full flex items-center justify-center overflow-hidden">
                <span className="font-black text-2xl">{invoiceSettings.shopName.slice(0, 2).toUpperCase()}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Print Customization Modal */}
      <AnimatePresence>
        {!showPrintModal && activeTab === 'sales' && (
        <div className="md:hidden fixed bottom-4 left-0 right-0 p-4 z-40">
           <button 
             onClick={() => setShowMobileCart(!showMobileCart)}
             className="w-full py-4 bg-bento-accent-dark text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3"
           >
             {showMobileCart ? (
               <>
                 <ArrowRight className="w-5 h-5 rotate-180" />
                 Back to Products
               </>
             ) : (
               <>
                 <ShoppingCart className="w-5 h-5" />
                 View Cart ({activeTabDetails?.items.length || 0})
               </>
             )}
           </button>
        </div>
      )}

      {/* POS Mobile Top Nav (Tab selector) */}
      <div className="md:hidden fixed top-16 left-0 right-0 bg-white border-b border-bento-border z-40 px-4 py-2 flex gap-2">
         {[
            { id: 'sales', icon: ShoppingCart, label: 'Sales' },
            { id: 'reports', icon: TrendingUp, label: 'Stats' },
            { id: 'inquiries', icon: Bell, label: 'Feed' },
         ].map((item) => (
            <button
               key={`mobile-tab-${item.id}`}
               onClick={() => {
                 setActiveTab(item.id as any);
                 setShowMobileCart(false);
               }}
               className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'bg-bento-bg text-bento-accent-dark font-black' : 'text-bento-muted font-bold'}`}
            >
               <item.icon className="w-4 h-4" />
               <span className="text-[8px] uppercase tracking-widest">{item.label}</span>
            </button>
         ))}
      </div>

      {showPrintModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-bento-border flex justify-between items-center bg-white shrink-0">
                 <div>
                   <h3 className="text-xl font-black tracking-tight">Print Checkout</h3>
                   <p className="text-[10px] font-black uppercase tracking-widest text-bento-muted mt-1">Review & Format Invoice</p>
                 </div>
                 <button onClick={() => setShowPrintModal(false)} className="p-2 hover:bg-bento-bg rounded-xl transition-colors">
                    <XIcon className="w-5 h-5 text-bento-muted" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
                {/* Left Side: Preview */}
                <div className="flex-1 bg-bento-bg/50 p-8 border-r border-bento-border">
                  <div className="bg-white p-10 shadow-sm border border-bento-border rounded-2xl mx-auto max-w-[380px]">
                    <div className="text-center mb-6">
                      {invoiceSettings.shopLogo ? (
                        <img src={invoiceSettings.shopLogo} className="w-16 h-16 mx-auto object-contain mb-4" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                           <span className="font-black text-xl">{invoiceSettings.shopName.slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                      <h1 className="text-xl font-black uppercase tracking-tighter mb-1">{invoiceSettings.shopName}</h1>
                      <p className="text-[8px] font-medium text-gray-400 mb-4">{invoiceSettings.shopAddress}</p>
                    </div>

                    <div className="space-y-4 mb-6">
                      {activeTabDetails?.items.map((item, idx) => (
                        <div key={`checkout-summary-item-${item.productId}-${idx}`} className="flex justify-between items-start text-[11px]">
                          <div className="flex-1 pr-4">
                            <p className="font-black uppercase">{item.name}</p>
                            <p className="text-[9px] text-gray-400 font-mono">
                              {item.quantity}{item.unit || 'kg'} x {formatCurrency(item.price)}
                            </p>
                          </div>
                          <p className="font-black pt-0.5">{formatCurrency(item.total)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t-2 border-black pt-4 space-y-2">
                       <div className="flex justify-between items-center text-xs font-black">
                         <span className="uppercase tracking-widest text-gray-400">Total</span>
                         <span className="text-lg">{formatCurrency(activeTabDetails?.items.reduce((sum, i) => sum + i.total, 0) || 0)}</span>
                       </div>
                    </div>

                    {printOptions.message && (
                      <div className="mt-6 pt-4 border-t border-dashed border-gray-200 text-center">
                        <p className="text-[10px] font-black italic text-gray-600">"{printOptions.message}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Options */}
                <div className="w-full md:w-[380px] p-8 space-y-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-3 block">Custom Message</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-bento-bg border border-bento-border rounded-2xl text-xs font-bold focus:ring-1 focus:ring-bento-accent outline-none min-h-[120px] transition-all"
                      placeholder="E.g. Thank you for shopping with us!"
                      value={printOptions.message}
                      onChange={e => setPrintOptions({ ...printOptions, message: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-2 block">Copies</label>
                       <input 
                         type="number"
                         min="1"
                         className="w-full px-4 py-3 bg-bento-bg border border-bento-border rounded-xl text-xs font-bold focus:ring-1 focus:ring-bento-accent outline-none"
                         value={printOptions.copies}
                         onChange={e => setPrintOptions({ ...printOptions, copies: parseInt(e.target.value) || 1 })}
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-2 block">Format</label>
                       <select 
                         className="w-full px-4 py-3 bg-bento-bg border border-bento-border rounded-xl text-xs font-bold focus:ring-1 focus:ring-bento-accent outline-none cursor-pointer"
                         value={printOptions.printer}
                         onChange={e => setPrintOptions({ ...printOptions, printer: e.target.value })}
                       >
                         <option value="Default">System Default</option>
                         <option value="Thermal-POS">Thermal 80mm</option>
                         <option value="A4-Format">A4 Standard</option>
                       </select>
                    </div>
                  </div>

                  {profile?.role === 'admin' && (
                    <div className="pt-4">
                       <button 
                         onClick={() => setIsCustomizingTemplate(!isCustomizingTemplate)}
                         className="w-full flex items-center justify-between py-3 px-4 bg-bento-bg border border-bento-border rounded-xl text-[10px] font-black uppercase tracking-widest text-bento-accent-dark hover:bg-white transition-all shadow-sm"
                       >
                         <span>Edit Invoice Template</span>
                         <Edit2 className="w-4 h-4" />
                       </button>
                       
                       {isCustomizingTemplate && (
                         <div className="mt-4 space-y-4 bg-bento-bg/30 p-6 rounded-2xl border border-bento-border">
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <label className="text-[9px] font-black uppercase tracking-widest text-bento-muted mb-1 block">Shop Name</label>
                                  <input value={invoiceSettings.shopName || ''} onChange={e => setInvoiceSettings({...invoiceSettings, shopName: e.target.value})} className="w-full px-3 py-2 bg-white border border-bento-border rounded-xl text-xs font-bold" />
                               </div>
                               <div>
                                  <label className="text-[9px] font-black uppercase tracking-widest text-bento-muted mb-1 block">Phone</label>
                                  <input value={invoiceSettings.shopPhone || ''} onChange={e => setInvoiceSettings({...invoiceSettings, shopPhone: e.target.value})} className="w-full px-3 py-2 bg-white border border-bento-border rounded-xl text-xs font-bold" />
                               </div>
                            </div>
                            <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-bento-muted mb-1 block">Logo URL</label>
                               <input value={invoiceSettings.shopLogo || ''} onChange={e => setInvoiceSettings({...invoiceSettings, shopLogo: e.target.value})} className="w-full px-3 py-2 bg-white border border-bento-border rounded-xl text-xs font-bold" placeholder="https://..." />
                            </div>
                            <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-bento-muted mb-1 block">Address</label>
                               <input value={invoiceSettings.shopAddress || ''} onChange={e => setInvoiceSettings({...invoiceSettings, shopAddress: e.target.value})} className="w-full px-3 py-2 bg-white border border-bento-border rounded-xl text-xs font-bold" />
                            </div>
                            <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-bento-muted mb-1 block">Website</label>
                               <input value={invoiceSettings.website || ''} onChange={e => setInvoiceSettings({...invoiceSettings, website: e.target.value})} className="w-full px-3 py-2 bg-white border border-bento-border rounded-xl text-xs font-bold" />
                            </div>
                            <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-bento-muted mb-1 block">Slogan/Footer</label>
                               <input value={invoiceSettings.footerMessage || ''} onChange={e => setInvoiceSettings({...invoiceSettings, footerMessage: e.target.value})} className="w-full px-3 py-2 bg-white border border-bento-border rounded-xl text-xs font-bold" />
                            </div>
                            <button 
                              onClick={saveInvoiceSettings}
                              className="w-full py-3 bg-bento-accent-dark text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-bento-accent/20"
                            >
                              Save Template
                            </button>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-bento-border bg-bento-bg/20 flex gap-4 shrink-0">
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="px-8 py-4 bg-white border border-bento-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-bento-muted hover:bg-bento-bg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmPrint}
                  className="flex-1 py-4 bg-bento-accent-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-bento-accent/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Printer className="w-5 h-5" />
                  Generate Invoice & Print
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inquiry Detail Modal */}
      <AnimatePresence>
        {selectedInquiry && (
          <div key="pos-inquiry-modal-backdrop" className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
             <motion.div 
               key="pos-inquiry-modal-content"
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl flex flex-col p-10"
             >
                <div className="flex justify-between items-start mb-8">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-bento-accent text-white flex items-center justify-center shadow-lg shadow-bento-accent/20">
                         {selectedInquiry.userId ? <MessageCircle className="w-7 h-7" /> : <Bell className="w-7 h-7" />}
                      </div>
                      <div>
                         <h3 className="text-xl font-black tracking-tight">{(selectedInquiry as any).title || (selectedInquiry as any).userName}</h3>
                         {(selectedInquiry as any).userPhone && (
                           <div className="flex items-center gap-3 mt-1">
                             <div className="flex items-center gap-1.5">
                               <Phone className="w-2.5 h-2.5 text-bento-muted" />
                               <p className="text-[10px] font-black uppercase text-bento-accent-dark tracking-widest">{(selectedInquiry as any).userPhone}</p>
                             </div>
                             <a 
                               href={`https://wa.me/${(selectedInquiry as any).userPhone.replace(/\D/g, '')}`}
                               target="_blank"
                               rel="noreferrer"
                               className="flex items-center gap-1.5 px-2 py-1 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366]/20 transition-colors"
                             >
                                <MessageCircle className="w-2.5 h-2.5" />
                                <span className="text-[9px] font-black uppercase tracking-wider text-inherit">WhatsApp</span>
                             </a>
                           </div>
                         )}
                         <p className="text-[10px] font-black uppercase tracking-widest text-bento-muted mt-1">
                           Received {format(selectedInquiry.createdAt?.toDate ? selectedInquiry.createdAt.toDate() : new Date(selectedInquiry.createdAt), 'MMM dd, HH:mm')}
                         </p>
                      </div>
                   </div>
                   <button onClick={() => setSelectedInquiry(null)} className="p-3 bg-bento-bg rounded-2xl hover:bg-bento-border transition-colors">
                      <XIcon className="w-5 h-5 text-bento-muted" />
                   </button>
                </div>

                <div className="bg-bento-bg/30 rounded-3xl p-8 border border-bento-border mb-8">
                   <p className="text-sm font-medium leading-relaxed text-bento-text/80 whitespace-pre-wrap">
                      {selectedInquiry.message}
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => {
                        markAsRead(selectedInquiry);
                        setSelectedInquiry(null);
                     }}
                     className="py-4 bg-bento-bg rounded-2xl text-[10px] font-black uppercase tracking-widest text-bento-muted"
                   >
                     Close
                   </button>
                   <button 
                     className="py-4 bg-bento-accent-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-bento-accent/20 flex items-center justify-center gap-2"
                   >
                     {selectedInquiry.userId ? 'Reply to Customer' : 'Restock Product'}
                     <ArrowRight className="w-4 h-4" />
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectingCustomerFor && (
          <div key="pos-customer-modal-backdrop" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
             <motion.div 
               key="pos-customer-modal-content"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col"
             >
                <div className="p-6 border-b border-bento-border flex justify-between items-center">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-bento-muted">Select Customer</h3>
                   <button onClick={() => setSelectingCustomerFor(null)} className="text-bento-muted hover:text-bento-text">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="p-6">
                   <div className="relative mb-6">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
                      <input 
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 bg-bento-bg border border-bento-border rounded-xl text-sm focus:ring-1 focus:ring-bento-accent outline-none"
                        placeholder="Search by name, email or phone..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                      />
                   </div>

                   <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      <button 
                        onClick={() => assignCustomer(selectingCustomerFor, null)}
                        className="w-full px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-widest border border-dashed border-bento-border text-bento-muted hover:bg-bento-bg transition-colors"
                      >
                        Guest / Anonymous
                      </button>
                      
                      {customers.filter(c => 
                        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        c.personalPhone?.includes(customerSearch)
                      ).map((customer, idx) => (
                          <div key={`customer-select-${customer.uid}-${idx}`} className="flex flex-col">
                            <button
                              onClick={() => assignCustomer(selectingCustomerFor, customer)}
                              className="w-full px-4 py-3 rounded-xl text-left hover:bg-bento-accent hover:text-white transition-all border border-transparent hover:border-bento-accent flex justify-between items-center group"
                            >
                              <div>
                                <p className="font-bold text-sm">{customer.name}</p>
                                <p className="text-[10px] opacity-70 uppercase tracking-wider">{customer.personalPhone || customer.email || 'No Contact'}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </div>
                      ))}
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const X = ({ className, onClick }: any) => (
  <svg 
    onClick={onClick}
    xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
