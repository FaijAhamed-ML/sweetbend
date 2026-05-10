import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Product, AppSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, MessageSquare, Send, Phone, Mail, MapPin, CheckCircle, Clock, X, Info } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

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

export default function CustomerHome() {
  const { user, profile } = useAuth();

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
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
    throw new Error(JSON.stringify(errInfo));
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [inquiry, setInquiry] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryError, setInquiryError] = useState('');
  const [sending, setSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkInquiry, setBulkInquiry] = useState({
    productId: '',
    productName: '',
    quantity: 1,
    deliveryDate: '',
    instructions: ''
  });

  const MAX_MESSAGE_CHARS = 500;
  const MIN_MESSAGE_CHARS = 10;

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'website'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppSettings);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/website'));
    return unsub;
  }, []);


  const handleInquiryChange = (val: string) => {
    setInquiry(val);
    if (val.length > MAX_MESSAGE_CHARS) {
      setInquiryError(`Message is too long. Maximum ${MAX_MESSAGE_CHARS} characters.`);
    } else if (val.length > 0 && val.length < MIN_MESSAGE_CHARS) {
      setInquiryError(`Message is too short. Minimum ${MIN_MESSAGE_CHARS} characters.`);
    } else {
      setInquiryError('');
    }
  };

  const handleInquiry = async (e: any) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    if (inquiry.length < MIN_MESSAGE_CHARS || inquiry.length > MAX_MESSAGE_CHARS) {
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, 'inquiries'), {
        userId: user.uid,
        userName: profile.name,
        userPhone: inquiryPhone || profile.personalPhone || '',
        message: inquiry,
        status: 'unread',
        createdAt: new Date(),
      });
      setInquiry('');
      setInquiryPhone('');
      setContactSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inquiries');
    } finally {
      setSending(false);
    }
  };

  const handleBulkInquiry = async (e: any) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSending(true);
    try {
      const message = `BULK ORDER REQUEST:\nProduct: ${bulkInquiry.productName}\nQuantity: ${bulkInquiry.quantity}kg\nDelivery Date: ${bulkInquiry.deliveryDate}\nInstructions: ${bulkInquiry.instructions}`;
      
      await addDoc(collection(db, 'inquiries'), {
        userId: user.uid,
        userName: profile.name,
        userPhone: inquiryPhone || profile.personalPhone || '',
        message: message,
        status: 'unread',
        productId: bulkInquiry.productId,
        quantity: bulkInquiry.quantity,
        deliveryDate: bulkInquiry.deliveryDate,
        type: 'bulk',
        createdAt: new Date(),
      });
      
      setIsBulkModalOpen(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inquiries');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      {/* Hero Bento Section */}
      <section className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Main Hero Card */}
        <div className="md:col-span-12 bg-white rounded-3xl border border-bento-border overflow-hidden relative group min-h-[450px]">
          <img 
            src={settings?.heroImage || "https://images.unsplash.com/photo-1558961312-5034f3ad8988?auto=format&fit=crop&q=80&w=1920"} 
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-10 left-10 text-white">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-2"
            >
              {settings?.heroTitle || "Sweet Bend Shop"}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-white/80"
            >
              {settings?.tagline || "A feast of taste"}
            </motion.p>
          </div>
        </div>

        {/* Visit Us Card */}
        <div className="md:col-span-6 bg-white rounded-3xl border border-bento-border p-8 flex flex-col justify-between group shadow-sm min-h-[200px]">
           <div className="w-12 h-12 bg-bento-bg rounded-2xl flex items-center justify-center mb-6 group-hover:bg-bento-accent transition-colors">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-bento-muted mb-1">Visit Us</h3>
            <p className="text-lg font-bold text-bento-accent-dark">{settings?.address || "123 Sweet Street, Candy City"}</p>
          </div>
        </div>

          <div className="md:col-span-6 bg-white rounded-3xl border border-bento-border p-8 flex flex-col justify-between group shadow-sm min-h-[200px]">
             <div className="w-12 h-12 bg-bento-bg rounded-2xl flex items-center justify-center mb-6 group-hover:bg-bento-info transition-colors">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-bento-muted mb-1">Call Us</h3>
              <p className="text-lg font-bold text-bento-accent-dark">{settings?.contactPhone || "+1 (555) 123-4567"}</p>
            </div>
          </div>
      </section>

      {/* Product Collection Grid */}
      <section className="max-w-[1400px] mx-auto p-6">
        <div className="flex justify-between items-center mb-8 px-2">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-bento-muted">Sweet Collection</h2>
          <div className="h-[1px] flex-1 mx-8 bg-bento-border md:block hidden" />
          <button className="text-[10px] font-bold uppercase tracking-widest text-bento-accent-dark hover:underline">View All Collection</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product, idx) => (
            <motion.div 
              key={`customer-product-${product.id}-${idx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              onClick={() => setSelectedProduct(product)}
              className="bg-white rounded-3xl border border-bento-border p-5 group hover:shadow-xl hover:border-bento-accent transition-all duration-500 cursor-pointer"
            >
              <div className="relative aspect-square overflow-hidden bg-bento-bg rounded-2xl mb-5 border border-bento-border shadow-inner">
                <img 
                  src={product.photoUrl || "https://picsum.photos/seed/sweet/400/400"} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                   <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all">
                      <ShoppingBag className="w-6 h-6 text-bento-accent-dark" />
                   </div>
                </div>
                {product.oldPrice && product.oldPrice > product.price && (
                  <div className="absolute top-3 left-3 bg-bento-danger text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
                    Offer
                  </div>
                )}
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-bento-muted block mb-1">{product.category}</span>
                <h3 className="text-sm font-bold text-bento-accent-dark mb-2">{product.name}</h3>
                <div className="flex justify-between items-end">
                  <div>
                    {product.oldPrice && product.oldPrice > product.price && (
                       <span className="text-[10px] text-bento-muted line-through block mb-0.5">{formatCurrency(product.oldPrice)}</span>
                    )}
                    <span className="text-lg font-black text-bento-accent-dark">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <div className="w-10 h-10 bg-bento-bg text-bento-muted rounded-xl flex items-center justify-center group-hover:bg-bento-accent-dark group-hover:text-white transition-all shadow-sm">
                    <Info className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>




      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[40px] overflow-hidden flex flex-col md:flex-row relative shadow-2xl"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white md:text-bento-accent-dark md:bg-bento-bg md:border-bento-border hover:scale-110 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="md:w-1/2 h-[300px] md:h-auto relative">
                <img 
                  src={selectedProduct.photoUrl || "https://picsum.photos/seed/sweet/800/800"} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:hidden" />
              </div>

              <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-bento-muted mb-3 block">{selectedProduct.category}</span>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-bento-accent-dark mb-4">{selectedProduct.name}</h2>
                  <div className="flex items-end gap-3 mb-6">
                    <span className="text-3xl font-black text-bento-accent-dark">{formatCurrency(selectedProduct.price)}</span>
                    {selectedProduct.oldPrice && selectedProduct.oldPrice > selectedProduct.price && (
                      <span className="text-lg text-bento-muted line-through mb-1">{formatCurrency(selectedProduct.oldPrice)}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-bento-muted mb-3 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-bento-accent" /> Description
                    </h3>
                    <p className="text-bento-text/70 leading-relaxed">
                      {selectedProduct.description || "Our traditional " + selectedProduct.name + " is prepared with the finest ingredients using authentic recipes passed down through generations. Each piece reflects our commitment to quality and taste."}
                    </p>
                  </div>

                  {selectedProduct.nutritionalInfo && (
                    <div className="bg-bento-bg p-6 rounded-3xl border border-bento-border">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-bento-muted mb-4">Nutritional Information</h3>
                      <p className="text-xs font-medium text-bento-accent-dark/80 leading-loose">
                        {selectedProduct.nutritionalInfo}
                      </p>
                    </div>
                  )}

                  <div className="pt-8 flex flex-col md:flex-row gap-4">
                    <button className="flex-1 py-4 bg-bento-accent-dark text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-black/10 hover:bg-black transition-all flex items-center justify-center gap-3">
                       <ShoppingBag className="w-4 h-4" /> Add to Order
                    </button>
                    <button 
                      onClick={() => {
                        setBulkInquiry({
                          productId: selectedProduct.id,
                          productName: selectedProduct.name,
                          quantity: 10, // Default bulk quantity
                          deliveryDate: '',
                          instructions: ''
                        });
                        setSelectedProduct(null);
                        setIsBulkModalOpen(true);
                      }}
                      className="py-4 px-8 bg-bento-bg text-bento-muted rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-bento-border transition-all"
                    >
                      Inquire Bulk
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Inquiry Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl p-10"
            >
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black tracking-tight">Bulk Inquiry</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-bento-muted mt-1">Order Large Quantities</p>
                 </div>
                 <button onClick={() => setIsBulkModalOpen(false)} className="p-3 bg-bento-bg rounded-2xl">
                    <X className="w-5 h-5 text-bento-muted" />
                 </button>
              </div>

              <form onSubmit={handleBulkInquiry} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-2 block">Selected Product</label>
                    <div className="w-full px-5 py-4 bg-bento-bg border border-bento-border rounded-2xl text-sm font-bold text-bento-accent-dark">
                       {bulkInquiry.productName}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-2 block">Quantity (Kilos)</label>
                       <input 
                         type="number"
                         min="1"
                         required
                         className="w-full px-5 py-4 bg-bento-bg border border-bento-border rounded-2xl text-sm font-bold focus:ring-1 focus:ring-bento-accent outline-none"
                         value={bulkInquiry.quantity}
                         onChange={e => setBulkInquiry({ ...bulkInquiry, quantity: parseInt(e.target.value) || 1 })}
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-2 block">Delivery Date</label>
                       <input 
                         type="date"
                         required
                         className="w-full px-5 py-4 bg-bento-bg border border-bento-border rounded-2xl text-sm font-bold focus:ring-1 focus:ring-bento-accent outline-none"
                         value={bulkInquiry.deliveryDate}
                         onChange={e => setBulkInquiry({ ...bulkInquiry, deliveryDate: e.target.value })}
                       />
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-bento-muted mb-2 block">Special Instructions</label>
                    <textarea 
                      className="w-full px-5 py-4 bg-bento-bg border border-bento-border rounded-2xl text-sm font-bold focus:ring-1 focus:ring-bento-accent outline-none min-h-[120px]"
                      placeholder="Packaging preferences, delivery time, etc."
                      value={bulkInquiry.instructions}
                      onChange={e => setBulkInquiry({ ...bulkInquiry, instructions: e.target.value })}
                    />
                 </div>

                 <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsBulkModalOpen(false)}
                      className="flex-1 py-4 bg-bento-bg rounded-2xl text-[10px] font-black uppercase tracking-widest text-bento-muted"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={sending}
                      className="flex-[2] py-4 bg-bento-accent-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-bento-accent/20 flex items-center justify-center gap-2"
                    >
                      {sending ? "Processing..." : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Inquiry
                        </>
                      )}
                    </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Bento Block */}
      <section id="contact-section" className="max-w-[1400px] mx-auto p-6 mb-12">
        <div className="bg-white rounded-[40px] border border-bento-border p-8 md:p-16 grid md:grid-cols-2 gap-12 items-center overflow-hidden relative">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-bento-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Need a Special Order?</h2>
            <p className="text-bento-text/70 mb-10 text-lg leading-relaxed max-w-md">
              From wedding bulk orders to personalized gift boxes, we're here to make your celebrations sweeter. Send us a message today.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-bento-bg rounded-xl border border-bento-border flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-xs font-bold text-bento-muted uppercase tracking-wider">Fast Response</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-bento-bg rounded-xl border border-bento-border flex items-center justify-center">
                   <Clock className="w-5 h-5 text-bento-info" />
                </div>
                <span className="text-xs font-bold text-bento-muted uppercase tracking-wider">24/7 Support</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 bg-bento-bg border border-bento-border p-8 rounded-3xl shadow-inner min-h-[400px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {contactSuccess ? (
                <motion.div 
                  key="contact-success"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="text-center py-6"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-200">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-black text-bento-accent-dark mb-3">Message Received!</h3>
                  <p className="text-sm text-bento-muted font-medium mb-8 leading-relaxed max-w-[280px] mx-auto">
                    Thank you for reaching out. Our team will review your requirements and contact you within 24 hours.
                  </p>
                  <button 
                    onClick={() => setContactSuccess(false)}
                    className="px-8 py-4 bg-white border border-bento-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-bento-muted hover:bg-bento-border transition-all shadow-sm"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : user ? (
                <motion.form 
                  key="contact-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleInquiry}
                  className="w-full"
                >
                  <div className="mb-6">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-bento-muted mb-3">Phone Number</label>
                    <input 
                      type="tel"
                      className="w-full px-6 py-4 bg-white border border-bento-border rounded-2xl focus:outline-none focus:ring-1 focus:ring-bento-accent transition-all text-sm mb-6"
                      placeholder="Enter your phone number..."
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value)}
                      required
                    />

                    <div className="flex justify-between items-end mb-3">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-bento-muted">Your Message</label>
                      <span className={`text-[9px] font-bold tracking-widest uppercase ${inquiry.length > MAX_MESSAGE_CHARS ? 'text-bento-danger' : 'text-bento-muted'}`}>
                        {inquiry.length} / {MAX_MESSAGE_CHARS}
                      </span>
                    </div>
                    <textarea 
                      className={`w-full px-6 py-4 bg-white border rounded-2xl focus:outline-none focus:ring-1 transition-all text-sm min-h-[160px] ${
                        inquiryError ? 'border-bento-danger/50 focus:ring-bento-danger' : 'border-bento-border focus:ring-bento-accent'
                      }`}
                      placeholder="Tell us about your requirements..."
                      value={inquiry}
                      onChange={(e) => handleInquiryChange(e.target.value)}
                      required
                    />
                    {inquiryError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-bento-danger text-[9px] font-bold uppercase tracking-widest mt-2 px-1"
                      >
                        {inquiryError}
                      </motion.p>
                    )}
                  </div>
                  <button 
                    disabled={sending || inquiryError !== '' || inquiry.length < MIN_MESSAGE_CHARS}
                    className="w-full py-4 bg-bento-accent-dark text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-black/10"
                  >
                    {sending ? "Sending..." : (
                      <>
                        <Send className="w-4 h-4" /> Send Inquiry
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.div 
                  key="contact-auth"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                   <div className="w-16 h-16 bg-white rounded-2xl border border-bento-border flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <MessageSquare className="w-8 h-8 text-bento-muted" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Let's Connect</h3>
                  <p className="text-bento-text/60 text-sm mb-8">Please sign in to your account to send us a direct message regarding your orders.</p>
                  <Link to="/login" className="inline-block w-full py-4 bg-bento-accent-dark text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-all">
                    Sign In to Message
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
