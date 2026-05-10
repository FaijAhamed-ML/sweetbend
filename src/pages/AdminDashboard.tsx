import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppSettings, UserProfile, Product, Sale } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Users, Box, Save, Plus, Trash2, Edit2, Upload, Activity, X as XIcon, ImageIcon, UserPlus, Phone, BarChart3, Download, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format, startOfDay, subDays, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

import { useAuth } from '../hooks/useAuth';

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

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth();

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

  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'products' | 'reports'>('settings');

  if (loading) return <div className="h-screen flex items-center justify-center bg-bento-bg font-black text-xs uppercase tracking-widest text-bento-muted">Authenticating...</div>;
  if (!isAdmin && user?.email !== 'faijgroups@gmail.com') return <div className="h-screen flex flex-col items-center justify-center bg-bento-bg text-center p-8">
    <div className="w-16 h-16 bg-white rounded-3xl border border-bento-border flex items-center justify-center mb-6 shadow-sm">
      <AlertTriangle className="w-8 h-8 text-bento-danger" />
    </div>
    <h1 className="text-xl font-black mb-2">Access Restricted</h1>
    <p className="text-[10px] font-bold uppercase tracking-widest text-bento-muted max-w-xs">You do not have administrative privileges to access this console.</p>
  </div>;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<AppSettings>({
    logoUrl: '',
    tabIconUrl: '',
    tagline: 'A feast of taste',
    contactEmail: '',
    contactPhone: '',
    address: '',
    heroTitle: 'Sweet Bend Shop',
    heroImage: 'https://images.unsplash.com/photo-1558961312-5034f3ad8988?auto=format&fit=crop&q=80&w=1920',
    promiseTitle: 'Our Promise',
    promiseText: 'Handcrafted perfection in every bite, delivered with love since 2012.',
    promiseLinkText: 'Read Our Story'
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isEditingProduct, setIsEditingProduct] = useState<Partial<Product> | null>(null);
  const [isEditingUser, setIsEditingUser] = useState<Partial<UserProfile> | null>(null);

  useEffect(() => {
    onSnapshot(doc(db, 'settings', 'website'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppSettings);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/website'));

    onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    onSnapshot(query(collection(db, 'sales'), orderBy('createdAt', 'desc')), (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));
  }, []);

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'website'), settings);
      alert('Settings updated!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/website');
    }
  };

  const handleProductSave = async (e: any) => {
    e.preventDefault();
    if (!isEditingProduct?.name) return;

    try {
      if (isEditingProduct.id) {
        await updateDoc(doc(db, 'products', isEditingProduct.id), isEditingProduct);
      } else {
        await addDoc(collection(db, 'products'), {
          ...isEditingProduct,
          photoUrl: isEditingProduct.photoUrl || 'https://picsum.photos/seed/sweet/400/400',
          stockLevel: Number(isEditingProduct.stockLevel) || 0,
          lowStockThreshold: Number(isEditingProduct.lowStockThreshold) || 10,
        });
      }
      setIsEditingProduct(null);
    } catch (err) {
      handleFirestoreError(err, isEditingProduct.id ? OperationType.UPDATE : OperationType.CREATE, `products/${isEditingProduct.id || 'new'}`);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Are you sure?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
    }
  };

  const handleUserSave = async (e: any) => {
    e.preventDefault();
    if (!isEditingUser?.name || !isEditingUser?.email) return;

    const uid = isEditingUser.uid || Math.random().toString(36).substring(7);
    const userData = {
      ...isEditingUser,
      uid,
      role: isEditingUser.role || 'customer',
      createdAt: isEditingUser.createdAt || new Date(),
    };

    try {
      await setDoc(doc(db, 'users', uid), userData);
      setIsEditingUser(null);
      alert('User profile synchronized!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const deleteUser = async (uid: string) => {
    if (confirm('Delete this user profile? This will not remove their authentication account, only their system role and data.')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
      }
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // ~800KB limit for base64 in Firestore
        alert('Image too large. Please select an image under 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEditingProduct) {
          setIsEditingProduct({ ...isEditingProduct, photoUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 p-6 grid grid-cols-12 grid-rows-6 gap-4 h-[calc(100vh-64px-40px)] overflow-hidden">
      {/* Sidebar - Integrated into Bento Grid */}
      <section className="col-span-12 md:col-span-2 row-span-6 bg-white rounded-3xl border border-bento-border p-4 shadow-sm flex flex-col gap-2">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-4 px-4">Management</h2>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`w-full flex md:flex-col items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-bento-accent text-white shadow-sm' : 'text-bento-muted hover:bg-bento-bg'}`}
        >
          <Settings className="w-5 h-5" /> <span className="md:mt-1">Settings</span>
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`w-full flex md:flex-col items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-bento-accent text-white shadow-sm' : 'text-bento-muted hover:bg-bento-bg'}`}
        >
          <Box className="w-5 h-5" /> <span className="md:mt-1">Products</span>
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`w-full flex md:flex-col items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-bento-accent text-white shadow-sm' : 'text-bento-muted hover:bg-bento-bg'}`}
        >
          <Users className="w-5 h-5" /> <span className="md:mt-1">Users</span>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`w-full flex md:flex-col items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'reports' ? 'bg-bento-accent text-white shadow-sm' : 'text-bento-muted hover:bg-bento-bg'}`}
        >
          <BarChart3 className="w-5 h-5" /> <span className="md:mt-1">Reports</span>
        </button>
      </section>

      {/* Content Area */}
      <main className="col-span-12 md:col-span-10 row-span-6 bg-white border border-bento-border rounded-3xl p-8 overflow-hidden flex flex-col shadow-sm relative">
        {error && (
          <div className="absolute top-4 right-4 left-4 z-[70] bg-bento-danger text-white p-4 rounded-2xl flex justify-between items-center shadow-lg animate-in fade-in slide-in-from-top-4">
             <div className="flex items-center gap-3">
               <AlertTriangle className="w-5 h-5" />
               <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
             </div>
             <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-full">
               <XIcon className="w-5 h-5" />
             </button>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="max-w-3xl flex-1 overflow-y-auto no-scrollbar pr-4">
            <h2 className="text-2xl font-bold tracking-tight mb-8">System Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-bento-bg p-6 rounded-2xl border border-bento-border">
                <label className="text-[10px] font-bold uppercase tracking-widest text-bento-muted mb-3 block">Branding Assets</label>
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-bold text-bento-muted block mb-1">Logo URL</span>
                    <input 
                      className="w-full px-4 py-2 bg-white border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                      value={settings.logoUrl}
                      onChange={e => setSettings({...settings, logoUrl: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-bento-muted block mb-1">Favicon URL</span>
                    <input 
                      className="w-full px-4 py-2 bg-white border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                      value={settings.tabIconUrl}
                      onChange={e => setSettings({...settings, tabIconUrl: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-bento-border shadow-inner">
                <label className="text-[10px] font-bold uppercase tracking-widest text-bento-muted mb-3 block">Tagline & Motto</label>
                <textarea 
                  className="w-full px-4 py-3 bg-white border border-bento-border rounded-xl text-sm font-bold focus:ring-1 focus:ring-bento-accent outline-none min-h-[100px]"
                  value={settings.tagline}
                  onChange={e => setSettings({...settings, tagline: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-bento-bg p-8 rounded-3xl border border-bento-border mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-bento-muted mb-6">Contact & Logistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                   <span className="text-[9px] font-bold text-bento-muted block mb-1">System Email</span>
                  <input 
                    className="w-full px-4 py-2 bg-white border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                    value={settings.contactEmail}
                    onChange={e => setSettings({...settings, contactEmail: e.target.value})}
                  />
                </div>
                <div>
                   <span className="text-[9px] font-bold text-bento-muted block mb-1">Customer Support Phone</span>
                  <input 
                    className="w-full px-4 py-2 bg-white border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                    value={settings.contactPhone}
                    onChange={e => setSettings({...settings, contactPhone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                 <span className="text-[9px] font-bold text-bento-muted block mb-1">Store Primary Address</span>
                <textarea 
                  className="w-full px-4 py-2 bg-white border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none min-h-[80px]"
                  value={settings.address}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-bento-border mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-bento-muted mb-6">Home Page Customization</h3>
              
              <div className="space-y-8">
                {/* Banner Area */}
                <div className="bg-bento-bg/30 p-6 rounded-2xl border border-bento-border">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-bento-muted mb-4 block">Main Hero Banner</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-[9px] font-bold text-bento-muted block mb-1">Hero Title</span>
                      <input 
                        className="w-full px-4 py-2 bg-white border border-bento-border rounded-xl text-xs font-bold focus:ring-1 focus:ring-bento-accent outline-none"
                        value={settings.heroTitle}
                        onChange={e => setSettings({...settings, heroTitle: e.target.value})}
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-bento-muted block mb-1">Hero Image URL</span>
                      <input 
                        className="w-full px-4 py-2 bg-white border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                        value={settings.heroImage}
                        onChange={e => setSettings({...settings, heroImage: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Our Promise Block */}
                <div className="bg-bento-bg/30 p-6 rounded-2xl border border-bento-border">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-bento-muted mb-4 block">"Our Promise" Section</label>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <span className="text-[9px] font-bold text-bento-muted block mb-1">Section Title</span>
                        <input 
                          className="w-full px-4 py-2 bg-white border border-bento-border rounded-xl text-xs font-bold focus:ring-1 focus:ring-bento-accent outline-none"
                          value={settings.promiseTitle}
                          onChange={e => setSettings({...settings, promiseTitle: e.target.value})}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-bento-muted block mb-1">Button text</span>
                        <input 
                          className="w-full px-4 py-2 bg-white border border-bento-border rounded-xl text-xs font-bold focus:ring-1 focus:ring-bento-accent outline-none"
                          value={settings.promiseLinkText}
                          onChange={e => setSettings({...settings, promiseLinkText: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-bento-muted block mb-1">Promise Message</span>
                      <textarea 
                        className="w-full px-4 py-3 bg-white border border-bento-border rounded-xl text-sm font-bold focus:ring-1 focus:ring-bento-accent outline-none min-h-[80px]"
                        value={settings.promiseText}
                        onChange={e => setSettings({...settings, promiseText: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={saveSettings}
              className="px-10 py-4 bg-bento-accent-dark text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg"
            >
              <Save className="w-4 h-4" /> Commit Changes
            </button>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Inventory Manager</h2>
              <button 
                onClick={() => setIsEditingProduct({})}
                className="px-5 py-2 bg-bento-accent text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-sm shadow-bento-accent/20"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {products.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-bento-border hover:border-bento-accent transition-all group shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-bento-border">
                       <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-bento-accent-dark">{p.name}</h4>
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-bento-muted">
                        <span className="text-bento-accent-dark">{formatCurrency(p.price)}/kg</span>
                        <span className={`px-2 py-0.5 rounded-full border ${p.stockLevel <= p.lowStockThreshold ? 'border-bento-danger text-bento-danger bg-bento-danger/5' : 'border-bento-border'}`}>
                          STOCK: {p.stockLevel}kg
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setIsEditingProduct(p)}
                      className="p-3 text-bento-muted hover:text-bento-accent-dark transition-all rounded-xl hover:bg-bento-bg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteProduct(p.id)}
                      className="p-3 text-bento-muted hover:text-bento-danger transition-all rounded-xl hover:bg-bento-danger/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Product Edit Modal */}
            <AnimatePresence>
              {isEditingProduct && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-bento-accent-dark/40 backdrop-blur-sm">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-[32px] p-10 max-w-xl w-full shadow-2xl border border-bento-border"
                  >
                    <h3 className="text-xl font-bold tracking-tight mb-8">{isEditingProduct.id ? 'Edit Item' : 'New Collection Item'}</h3>
                    <form onSubmit={handleProductSave} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Label Name</label>
                          <input 
                            required
                            className="w-full px-4 py-2 bg-bento-bg border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none font-bold"
                            value={isEditingProduct.name || ''}
                            onChange={e => setIsEditingProduct({...isEditingProduct, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Category</label>
                          <input 
                            className="w-full px-4 py-2 bg-bento-bg border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                            value={isEditingProduct.category || ''}
                            onChange={e => setIsEditingProduct({...isEditingProduct, category: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Price (/kg)</label>
                          <input 
                            type="number"
                            required
                            className="w-full px-4 py-2 bg-bento-bg border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none font-bold"
                            value={isEditingProduct.price || 0}
                            onChange={e => setIsEditingProduct({...isEditingProduct, price: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Sale Price (/kg)</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-2 bg-bento-bg border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                            value={isEditingProduct.oldPrice || 0}
                            onChange={e => setIsEditingProduct({...isEditingProduct, oldPrice: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Inventory (kg)</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-2 bg-bento-bg border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                            value={isEditingProduct.stockLevel || 0}
                            onChange={e => setIsEditingProduct({...isEditingProduct, stockLevel: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Lower Bound Alert</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-2 bg-bento-bg border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                            value={isEditingProduct.lowStockThreshold || 10}
                            onChange={e => setIsEditingProduct({...isEditingProduct, lowStockThreshold: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Product Visual</label>
                          <div className="relative group overflow-hidden bg-bento-bg border border-bento-border rounded-2xl h-40 flex items-center justify-center transition-all hover:border-bento-accent">
                            {isEditingProduct.photoUrl ? (
                              <div className="relative w-full h-full">
                                <img 
                                  src={isEditingProduct.photoUrl} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                                  >
                                    <Upload className="w-5 h-5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsEditingProduct({...isEditingProduct, photoUrl: ''})}
                                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-bento-danger/60 transition-colors"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-2 text-bento-muted hover:text-bento-accent transition-colors"
                              >
                                <div className="p-4 bg-white rounded-2xl border border-bento-border shadow-sm">
                                  <ImageIcon className="w-8 h-8" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Select Image</span>
                              </button>
                            )}
                            <input 
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col justify-end gap-6">
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Or Asset URL</label>
                            <input 
                              className="w-full px-4 py-2 bg-bento-bg border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none"
                              value={isEditingProduct.photoUrl || ''}
                              onChange={e => setIsEditingProduct({...isEditingProduct, photoUrl: e.target.value})}
                              placeholder="https://..."
                            />
                          </div>
                          <p className="text-[8px] text-bento-muted font-medium px-1">
                            * Recommended image size: 400x400px. Max upload size is 800KB for system stability.
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Description</label>
                        <textarea 
                          className="w-full px-4 py-2 bg-bento-bg border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none min-h-[80px]"
                          value={isEditingProduct.description || ''}
                          onChange={e => setIsEditingProduct({...isEditingProduct, description: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Nutritional Info</label>
                        <textarea 
                          className="w-full px-4 py-2 bg-bento-bg border border-bento-border rounded-xl text-xs focus:ring-1 focus:ring-bento-accent outline-none min-h-[60px]"
                          value={isEditingProduct.nutritionalInfo || ''}
                          onChange={e => setIsEditingProduct({...isEditingProduct, nutritionalInfo: e.target.value})}
                          placeholder="Calories, Protein, etc."
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button 
                          type="submit"
                          className="flex-[2] py-4 bg-bento-accent-dark text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-black transition-all"
                        >
                          Commit Item
                        </button>
                        {isEditingProduct.id && (
                          <button 
                            type="button"
                            onClick={() => {
                              deleteProduct(isEditingProduct.id!);
                              setIsEditingProduct(null);
                            }}
                            className="flex-1 py-4 bg-bento-danger/10 text-bento-danger rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-bento-danger transition-all hover:text-white"
                          >
                            Delete
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => setIsEditingProduct(null)}
                          className="flex-1 py-4 bg-bento-bg text-bento-muted rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-bento-border transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'reports' && (() => {
          const filteredSales = sales.filter(s => {
            const matchesCustomer = selectedCustomerId === 'all' || s.customerId === selectedCustomerId;
            const sDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date();
            const matchesRange = isWithinInterval(sDate, {
              start: startOfDay(new Date(startDate)),
              end: startOfDay(subDays(new Date(endDate), -1))
            });
            return matchesCustomer && matchesRange;
          });

          return (
            <div className="h-full flex flex-col overflow-y-auto no-scrollbar pr-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 shrink-0 gap-4">
                 <div>
                    <h2 className="text-2xl font-bold tracking-tight">Analytical Insights</h2>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase text-bento-muted">Client:</span>
                        <select 
                          className="bg-bento-bg border border-bento-border rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider outline-none focus:ring-1 focus:ring-bento-accent"
                          value={selectedCustomerId}
                          onChange={(e) => setSelectedCustomerId(e.target.value)}
                        >
                          <option value="all">All Customers</option>
                          {users.filter(u => u.role === 'customer').map(u => (
                            <option key={u.uid} value={u.uid}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase text-bento-muted">Period:</span>
                        <div className="flex items-center bg-bento-bg border border-bento-border rounded-lg px-2 py-1">
                          <input 
                            type="date"
                            className="bg-transparent text-[10px] font-bold outline-none"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                          <span className="mx-2 text-bento-muted text-xs">→</span>
                          <input 
                            type="date"
                            className="bg-transparent text-[10px] font-bold outline-none"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const csv = [
                          ['Product Name', 'Price', 'Stock Level', 'Low Stock Threshold'].join(','),
                          ...products.map(p => [p.name, p.price, p.stockLevel, p.lowStockThreshold].join(','))
                        ].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.setAttribute('hidden', '');
                        a.setAttribute('href', url);
                        a.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="px-4 py-2 bg-bento-bg text-bento-muted rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-bento-border transition-all"
                    >
                      <Download className="w-3 h-3" /> Export Inventory
                    </button>
                    <button 
                      onClick={() => {
                        const csv = [
                          ['Sale ID', 'Customer', 'Items Count', 'Total Amount', 'Date'].join(','),
                          ...filteredSales.map(s => [
                            s.id, 
                            s.customerName || 'Guest', 
                            s.items.length, 
                            s.totalAmount, 
                            format(s.createdAt?.toDate ? s.createdAt.toDate() : new Date(), 'yyyy-MM-dd HH:mm')
                          ].join(','))
                        ].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.setAttribute('hidden', '');
                        a.setAttribute('href', url);
                        a.setAttribute('download', `filtered_sales_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="px-4 py-2 bg-bento-accent text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all font-black"
                    >
                      <Download className="w-3 h-3" /> Export Filtered View
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-12 gap-6 mb-8 shrink-0">
                 {/* Summary Cards */}
                 <div className="col-span-12 md:col-span-4 bg-bento-accent-dark text-white rounded-3xl p-6 shadow-xl flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                       <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Period Revenue</p>
                      <p className="text-2xl font-black">
                        {formatCurrency(filteredSales
                          .reduce((s, a) => s + a.totalAmount, 0))}
                      </p>
                    </div>
                 </div>
                 <div className="col-span-12 md:col-span-4 bg-white rounded-3xl p-6 border border-bento-border flex items-center gap-6 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-bento-bg flex items-center justify-center text-bento-accent">
                       <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-1">Period Sales Count</p>
                      <p className="text-2xl font-black">
                        {filteredSales.length}
                      </p>
                    </div>
                 </div>
                 <div className="col-span-12 md:col-span-4 bg-white rounded-3xl p-6 border border-bento-border flex items-center gap-6 shadow-sm">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${products.filter(p => p.stockLevel <= p.lowStockThreshold).length > 0 ? 'bg-bento-danger/10 text-bento-danger' : 'bg-bento-bg text-bento-muted'}`}>
                       <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-1">Low Stock Items</p>
                      <p className="text-2xl font-black">{products.filter(p => p.stockLevel <= p.lowStockThreshold).length}</p>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                 {/* Sales Trend */}
                  <div className="col-span-12 lg:col-span-8 bg-white border border-bento-border rounded-[32px] p-8 flex flex-col shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-6">Revenue Trend (Active Period)</h3>
                    <div className="flex-1 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredSales.reduce((acc, sale) => {
                          const date = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date();
                          const dateStr = format(date, 'MMM dd');
                          const existing = acc.find(a => a.name === dateStr);
                          if (existing) {
                            existing.total += sale.totalAmount;
                          } else {
                            acc.push({ name: dateStr, total: sale.totalAmount });
                          }
                          return acc;
                        }, [] as { name: string, total: number }[]).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <Tooltip 
                            cursor={{ fill: '#F9FAFB' }}
                            contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="total" fill="#815431" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Inventory List */}
                 <div className="col-span-12 lg:col-span-4 bg-white border border-bento-border rounded-[32px] p-8 flex flex-col shadow-sm overflow-hidden">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-6">Inventory Status</h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                      {products.sort((a, b) => a.stockLevel - b.stockLevel).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-bento-bg/40 rounded-2xl border border-bento-border/50 group hover:border-bento-accent/30 transition-all">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black truncate pr-4">{p.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <div className="flex-1 h-1.5 bg-bento-border rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${p.stockLevel <= p.lowStockThreshold ? 'bg-bento-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(100, (p.stockLevel / (p.lowStockThreshold * 3)) * 100)}%` }}
                                  />
                               </div>
                               <span className={`text-[9px] font-black uppercase whitespace-nowrap ${p.stockLevel <= p.lowStockThreshold ? 'text-bento-danger animate-pulse' : 'text-bento-muted'}`}>
                                 {p.stockLevel}kg left
                               </span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                             <button 
                               onClick={() => {
                                 setActiveTab('products');
                                 setIsEditingProduct(p);
                               }}
                               className="p-2 text-bento-muted hover:text-bento-accent-dark transition-colors"
                               title="Edit Product"
                             >
                                <Edit2 className="w-3 h-3" />
                             </button>
                             <button 
                               onClick={() => deleteProduct(p.id)}
                               className="p-2 text-bento-muted hover:text-bento-danger transition-colors"
                               title="Delete Product"
                             >
                                <Trash2 className="w-3 h-3" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'users' && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">User Directory</h2>
              <button 
                onClick={() => setIsEditingUser({ role: 'customer' })}
                className="px-5 py-2 bg-bento-accent-dark text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Provision User
              </button>
            </div>
            
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <table className="w-full">
                <thead className="bg-bento-bg text-left sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-bento-muted">Credential</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-bento-muted">Permission Level</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-bento-muted">Telecom</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-bento-muted text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bento-border text-[13px]">
                  {users.map(u => (
                    <tr key={u.uid} className="hover:bg-bento-bg/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-bento-accent-dark">{u.name}</div>
                        <div className="text-[10px] text-bento-muted font-medium">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          u.role === 'admin' ? 'bg-bento-accent/10 border-bento-accent text-bento-accent' :
                          u.role === 'pos' ? 'bg-bento-info/10 border-bento-info text-bento-info' :
                          'bg-bento-bg border-bento-border text-bento-muted'
                        }`}>
                          {u.role}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-bento-muted">{u.personalPhone || 'NOT LINKED'}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 text-bento-muted">
                          <button 
                            onClick={() => setIsEditingUser(u)}
                            className="p-2 hover:text-bento-accent-dark transition-colors"
                          >
                             <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteUser(u.uid)}
                            className="p-2 hover:text-bento-danger transition-colors font-bold"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* User Edit Modal */}
            <AnimatePresence>
              {isEditingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-bento-accent-dark/40 backdrop-blur-sm">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-[32px] p-10 max-w-lg w-full shadow-2xl border border-bento-border"
                  >
                    <h3 className="text-xl font-bold tracking-tight mb-8">
                      {isEditingUser.uid ? 'Adjust Permission' : 'Provision User Profile'}
                    </h3>
                    <form onSubmit={handleUserSave} className="space-y-6">
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Legal Name</label>
                        <input 
                          required
                          className="w-full px-6 py-3.5 bg-bento-bg border border-bento-border rounded-2xl text-sm font-bold focus:ring-1 focus:ring-bento-accent outline-none"
                          value={isEditingUser.name || ''}
                          onChange={e => setIsEditingUser({...isEditingUser, name: e.target.value})}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Email Endpoint</label>
                        <input 
                          required
                          type="email"
                          className="w-full px-6 py-3.5 bg-bento-bg border border-bento-border rounded-2xl text-sm font-bold focus:ring-1 focus:ring-bento-accent outline-none"
                          value={isEditingUser.email || ''}
                          onChange={e => setIsEditingUser({...isEditingUser, email: e.target.value})}
                          placeholder="user@sweetbend.com"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">Telecom</label>
                          <input 
                            className="w-full px-6 py-3.5 bg-bento-bg border border-bento-border rounded-2xl text-sm font-bold focus:ring-1 focus:ring-bento-accent outline-none"
                            value={isEditingUser.personalPhone || ''}
                            onChange={e => setIsEditingUser({...isEditingUser, personalPhone: e.target.value})}
                            placeholder="0123456789"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-bento-muted mb-2 block px-1">System Role</label>
                          <select 
                            className="w-full px-6 py-3.5 bg-bento-bg border border-bento-border rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-bento-accent outline-none appearance-none cursor-pointer"
                            value={isEditingUser.role}
                            onChange={e => setIsEditingUser({...isEditingUser, role: e.target.value as any})}
                          >
                            <option value="customer">Customer</option>
                            <option value="pos">POS Staff</option>
                            <option value="admin">System Admin</option>
                          </select>
                        </div>
                      </div>
                      <div className="p-4 bg-bento-bg rounded-2xl border border-bento-border">
                        <p className="text-[9px] font-bold text-bento-muted leading-relaxed italic">
                          * Adjusting this profile synchronizes access across all touchpoints. Ensure email matches the user's login credential.
                        </p>
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button 
                          type="submit"
                          className="flex-1 py-5 bg-bento-accent-dark text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-lg"
                        >
                          Synchronize Profile
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsEditingUser(null)}
                          className="flex-1 py-5 bg-bento-bg text-bento-muted rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-bento-border transition-all"
                        >
                          Dismiss
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

      </main>
    </div>
  );
}
