import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message, Spin, Modal, Input, InputNumber, Tooltip, Popconfirm } from 'antd';
import {
  Trash2, Plus, ShoppingCart, User, Phone, Mail, Edit2,
  Search, ScanLine, Eye, Download, FileText, X, Barcode,
} from 'lucide-react';
import QRCode from 'qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const CAT = { Electronics:{bg:'rgba(77,150,255,.12)',color:'#4d96ff'}, Accessories:{bg:'rgba(108,99,255,.12)',color:'#6c63ff'}, Audio:{bg:'rgba(82,201,122,.12)',color:'#52c97a'}, General:{bg:'rgba(245,158,11,.12)',color:'#f59e0b'} };

// ── Hex → readable color name ────────────────────────────────
const COLOR_NAMES = {
  '#ff4d4f':'Red','#ff0000':'Red','#e53935':'Red','#c62828':'Dark Red',
  '#ff7a45':'Orange Red','#ff6b35':'Orange','#ff9800':'Orange','#fb8c00':'Dark Orange',
  '#ffd93d':'Yellow','#ffeb3b':'Yellow','#fdd835':'Bright Yellow','#f9a825':'Amber',
  '#52c97a':'Green','#4caf50':'Green','#43a047':'Medium Green','#2e7d32':'Dark Green',
  '#56ab2f':'Lime Green','#a8e063':'Light Green','#00e676':'Mint',
  '#4d96ff':'Blue','#2196f3':'Blue','#1976d2':'Dark Blue','#1e90ff':'Dodger Blue',
  '#6c63ff':'Purple','#9c27b0':'Violet','#7b1fa2':'Dark Purple','#764ba2':'Plum',
  '#667eea':'Lavender','#e91e63':'Pink','#ff69b4':'Hot Pink','#f06292':'Light Pink',
  '#ff4081':'Rose','#f8bbd9':'Baby Pink',
  '#000000':'Black','#1a1a2e':'Navy Black','#212121':'Charcoal','#333333':'Dark Grey',
  '#ffffff':'White','#f5f5f5':'Off White','#fafafa':'Snow White',
  '#9e9e9e':'Grey','#757575':'Medium Grey','#bdbdbd':'Light Grey',
  '#8b4513':'Brown','#795548':'Dark Brown','#6d4c41':'Coffee','#a1887f':'Mocha',
  '#d2691e':'Chocolate','#c8a876':'Tan','#f5deb3':'Wheat','#deb887':'Burlywood',
  '#00bcd4':'Cyan','#00acc1':'Dark Cyan','#4dd0e1':'Light Cyan',
  '#009688':'Teal','#00897b':'Dark Teal',
  '#ffb300':'Gold','#ffc107':'Amber Gold','#ff8f00':'Deep Gold',
};

const colorName = (hex) => {
  if (!hex) return '';
  const h = hex.toLowerCase().trim();
  if (COLOR_NAMES[h]) return COLOR_NAMES[h];
  return h.replace('#','').toUpperCase();
};

// ── Fix 7: Confetti effect component ────────────────────────
function ConfettiEffect({ active }) {
  const colors = ['#6c63ff','#4d96ff','#52c97a','#ffd93d','#ff6b6b','#f59e0b'];
  if (!active) return null;
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    size: 6 + Math.random() * 8,
    duration: 1.2 + Math.random() * 0.8,
  }));
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.left + '%',
          top: '-10px',
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: p.id % 2 === 0 ? '50%' : '2px',
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ── Field wrapper (defined outside component to prevent focus loss) ──────────
function F({label,err,children}){return(<div><label className='field-label' style={{color:err?'#ef4444':undefined}}>{label}{err&&<span style={{color:'#ef4444',fontSize:11,fontWeight:500,marginLeft:8}}>{err}</span>}</label>{children}</div>);}

// ── Validation ──────────────────────────────────────────────
const validatePhone = v => {
  if (!v || !v.trim()) return true;
  const digits = v.replace(/[\s\-()]/g, '').replace(/^\+91/, '').replace(/^0/, '');
  return /^\d{10}$/.test(digits);
};
const validateEmail = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// ── ProductCard ──────────────────────────────────────────────
function ProductCard({ product, onAddToCart, onEdit, onDelete }) {
  const [qty,           setQty]           = React.useState(1);
  const [selectedColor, setSelectedColor] = React.useState('');
  const [selectedSize,  setSelectedSize]  = React.useState('');
  const cat     = CAT[product.category] || CAT.General;
  const colors  = Array.isArray(product.colors) ? product.colors : [];
  const sizes   = Array.isArray(product.sizes)  ? product.sizes  : [];
  const isOutOfStock = product.stock === 0;

  // Auto-select first options
  React.useEffect(() => {
    setSelectedColor(colors[0] || '');
    setSelectedSize(sizes[0]   || '');
  }, [product.id]);

  return (
    <div className='product-card' style={{ opacity: isOutOfStock ? 0.75 : 1 }}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#ff6b6b,#ffd93d,#52c97a,#4d96ff)'}} />

      {/* Product Image */}
      {product.image && (
        <div style={{width:'100%',height:120,borderRadius:10,overflow:'hidden',marginBottom:10,background:'var(--bg)'}}>
          <img src={product.image} alt={product.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        </div>
      )}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div className='product-cat' style={{background:cat.bg,color:cat.color,margin:0}}>{product.category}</div>
        <div style={{display:'flex',gap:6}}>
          <Tooltip title='Edit'><button onClick={e=>{e.stopPropagation();onEdit(product);}} style={{width:26,height:26,borderRadius:7,border:'1.5px solid var(--border)',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',transition:'all .2s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#6c63ff';e.currentTarget.style.color='#6c63ff';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--muted)';}}>< Edit2 size={12}/></button></Tooltip>
          <Popconfirm title='Delete this product?' description='This cannot be undone.' onConfirm={()=>onDelete(product.id)} okText='Delete' cancelText='Cancel' okButtonProps={{danger:true}}><Tooltip title='Delete'><button onClick={e=>e.stopPropagation()} style={{width:26,height:26,borderRadius:7,border:'1.5px solid var(--border)',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',transition:'all .2s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#ff6b6b';e.currentTarget.style.color='#ff6b6b';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--muted)';}}>< Trash2 size={12}/></button></Tooltip></Popconfirm>
        </div>
      </div>
      <div className='product-name'>{product.name}</div>
      <div className='product-price'>₹{product.price.toLocaleString('en-IN')}</div>

      {/* Barcode badge */}
      {product.barcode && (
        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8,padding:'3px 8px',background:'rgba(77,150,255,.08)',borderRadius:7,border:'1px solid rgba(77,150,255,.2)',width:'fit-content'}}>
          <Barcode size={11} style={{color:'#4d96ff',flexShrink:0}}/>
          <span style={{fontSize:11,fontFamily:'monospace',fontWeight:700,color:'#4d96ff',letterSpacing:'.5px'}}>{product.barcode}</span>
        </div>
      )}

      {/* Fix 8: Low stock / out of stock badge */}
      {product.stock <= 5 && product.stock > 0 && (
        <div style={{display:'inline-flex',alignItems:'center',gap:4,marginBottom:6,padding:'2px 8px',background:'rgba(245,158,11,.12)',borderRadius:6,border:'1px solid rgba(245,158,11,.3)'}}>
          <span style={{fontSize:11}}>⚠️</span>
          <span style={{fontSize:11,fontWeight:700,color:'#f59e0b'}}>Low Stock ({product.stock} left)</span>
        </div>
      )}
      {isOutOfStock && (
        <div style={{display:'inline-flex',alignItems:'center',gap:4,marginBottom:6,padding:'2px 8px',background:'rgba(239,68,68,.1)',borderRadius:6,border:'1px solid rgba(239,68,68,.2)'}}>
          <span style={{fontSize:11}}>🚫</span>
          <span style={{fontSize:11,fontWeight:700,color:'#ef4444'}}>Out of Stock</span>
        </div>
      )}

      {/* Color selector */}
      {colors.length > 0 && (
        <div style={{marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.4px'}}>Color</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {colors.map(c=>(
              <div key={c} onClick={()=>setSelectedColor(c)}
                title={colorName(c)}
                style={{
                  display:'flex',alignItems:'center',gap:5,
                  padding:'3px 8px 3px 5px',borderRadius:20,cursor:'pointer',
                  border: selectedColor===c ? '2px solid #6c63ff' : '1.5px solid var(--border)',
                  background: selectedColor===c ? 'rgba(108,99,255,.08)' : '#fff',
                  boxShadow: selectedColor===c ? '0 0 0 2px rgba(108,99,255,.2)' : 'none',
                  transition:'all .15s',
                }}
              >
                <span style={{width:14,height:14,borderRadius:'50%',background:c,border:'1px solid rgba(0,0,0,.12)',flexShrink:0,display:'inline-block'}}/>
                <span style={{fontSize:11,fontWeight:700,color: selectedColor===c ? '#6c63ff' : 'var(--muted)'}}>{colorName(c)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Size selector */}
      {sizes.length > 0 && (
        <div style={{marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.4px'}}>Size</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {sizes.map(s=>(
              <button key={s} onClick={()=>setSelectedSize(s)}
                style={{padding:'3px 10px',borderRadius:8,border:'1.5px solid',cursor:'pointer',fontWeight:700,fontSize:11,fontFamily:'Raleway,sans-serif',transition:'all .15s',
                  borderColor:selectedSize===s?'#4d96ff':'var(--border)',
                  background:selectedSize===s?'rgba(77,150,255,.12)':'#fff',
                  color:selectedSize===s?'#4d96ff':'var(--muted)',
                }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div className='qty-row'>
        <button className='qty-btn' onClick={()=>setQty(q=>Math.max(1,q-1))}>-</button>
        <input type='number' min='1' value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} className='qty-input' />
        <button className='qty-btn' onClick={()=>setQty(q=>q+1)}>+</button>
      </div>
      {/* Fix 2: disable Add to Cart when out of stock */}
      <button
        className='add-btn'
        onClick={()=>{onAddToCart(product,qty,selectedColor,selectedSize);setQty(1);}}
        disabled={isOutOfStock}
        style={isOutOfStock ? {background:'#b0b7c3',cursor:'not-allowed',boxShadow:'none'} : {}}
      >
        {isOutOfStock ? '🚫 Out of Stock' : '+ Add to Cart'}
      </button>
    </div>
  );
}

function BillingModule() {
  const [products,setProducts]=useState([]);
  const [cartItems,setCartItems]=useState([]);
  const [customerName,setCustomerName]=useState('');
  const [customerPhone,setCustomerPhone]=useState('');
  const [customerEmail,setCustomerEmail]=useState('');
  const [taxAmount,setTaxAmount]=useState(0);
  const [discountAmount,setDiscountAmount]=useState(0);
  const [taxMode,setTaxMode]=useState('rs');
  const [discountMode,setDiscountMode]=useState('rs');
  const [paymentMethod,setPaymentMethod]=useState('Cash');
  const [billStatus,setBillStatus]=useState('paid');

  // Fix 7: confetti state
  const [showConfetti,setShowConfetti]=useState(false);

  // Fix 9: cash calculator
  const [cashGiven,setCashGiven]=useState(0);

  // Fix 10: last invoice for print
  const [lastInvoice,setLastInvoice]=useState(null);

  // UPI QR modal
  const [showUpiQr,setShowUpiQr]=useState(false);
  const [qrDataUrl,setQrDataUrl]=useState('');
  const [qrScreen,setQrScreen]=useState('qr');
  const [qrSecondsLeft,setQrSecondsLeft]=useState(300);
  const [qrTotalAmount,setQrTotalAmount]=useState(0);
  const qrTimerRef=useRef(null);

  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);
  const [errors,setErrors]=useState({});
  const [showAdd,setShowAdd]=useState(false);
  const [newProd,setNewProd]=useState({name:'',price:0,category:'General',stock:0});
  const [prodErrors,setProdErrors]=useState({});
  const [showEdit,setShowEdit]=useState(false);
  const [editProd,setEditProd]=useState(null);
  const [editErrors,setEditErrors]=useState({});

  // Barcode scanner state
  const [barcodeInput,setBarcodeInput]=useState('');
  const [barcodeScanning,setBarcodeScanning]=useState(false);
  const [scanHistory,setScanHistory]=useState([]);
  const barcodeRef=useRef(null);
  const barcodeTimerRef=useRef(null);

  // ── Sound feedback via Web Audio API ────────────────────────
  const playBeep=(type='success')=>{
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if(type==='success'){
        osc.frequency.setValueAtTime(1046,ctx.currentTime);
        osc.frequency.setValueAtTime(1318,ctx.currentTime+0.08);
        gain.gain.setValueAtTime(0.3,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime+0.25);
      } else {
        osc.frequency.setValueAtTime(220,ctx.currentTime);
        osc.type='sawtooth';
        gain.gain.setValueAtTime(0.25,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime+0.3);
      }
      ctx.close();
    }catch{}
  };

  // Customer search state
  const [custSearch,setCustSearch]=useState('');
  const [custResults,setCustResults]=useState([]);
  const [showCustDrop,setShowCustDrop]=useState(false);
  const [custSearching,setCustSearching]=useState(false);
  const custSearchRef=useRef(null);
  const custDropRef=useRef(null);
  const searchTimerRef=useRef(null);

  useEffect(()=>{fetchProducts();},[]);

  // ── Auto-focus barcode input ─────────────────────────────────
  useEffect(()=>{
    const focusScanner=()=>{ setTimeout(()=>barcodeRef.current?.focus(),150); };
    focusScanner();
    window.addEventListener('focus',focusScanner);
    return()=>window.removeEventListener('focus',focusScanner);
  },[]);

  // Re-focus when modals close
  useEffect(()=>{
    if(!showAdd && !showEdit) setTimeout(()=>barcodeRef.current?.focus(),200);
  },[showAdd,showEdit]);

  // Cleanup QR timer on unmount
  useEffect(()=>()=>clearInterval(qrTimerRef.current),[]);

  // Close dropdown on outside click
  useEffect(()=>{
    const handler=(e)=>{
      if(custDropRef.current&&!custDropRef.current.contains(e.target)&&custSearchRef.current&&!custSearchRef.current.contains(e.target)){
        setShowCustDrop(false);
      }
    };
    document.addEventListener('mousedown',handler);
    return()=>document.removeEventListener('mousedown',handler);
  },[]);

  const searchCustomers=async(q)=>{
    if(!q||q.length<2){setCustResults([]);setShowCustDrop(false);return;}
    setCustSearching(true);
    try{
      const token=localStorage.getItem('token');
      const res=await axios.get(`${API_URL}/customers/search?q=${encodeURIComponent(q)}`,{headers:{Authorization:'Bearer '+token}});
      setCustResults(res.data);
      setShowCustDrop(res.data.length>0);
    }catch{setCustResults([]);}
    finally{setCustSearching(false);}
  };

  const onCustSearchChange=(e)=>{
    const v=e.target.value;
    setCustSearch(v);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current=setTimeout(()=>searchCustomers(v),300);
  };

  const selectCustomer=(c)=>{
    setCustomerName(c.customer_name||'');
    setCustomerPhone(c.customer_phone||'');
    setCustomerEmail(c.customer_email||'');
    setCustSearch('');
    setCustResults([]);
    setShowCustDrop(false);
    setErrors({});
    message.success(`Customer "${c.customer_name}" filled in!`);
  };

  const fetchProducts=async()=>{
    try{const token=localStorage.getItem('token');const res=await axios.get(API_URL+'/products',{headers:{Authorization:'Bearer '+token}});setProducts(res.data);}catch{message.error('Failed to load products');}finally{setLoading(false);}
  };

  // ── UPI QR Generator ─────────────────────────────────────
  const openUpiQr=async()=>{
    const upiId  = localStorage.getItem('upi_id')   || '';
    const upiName= localStorage.getItem('upi_name') || '';
    if(!upiId){
      message.warning('UPI ID not set! Please go to Settings → UPI Settings and save your UPI ID first.');
      return;
    }
    if(total<=0){message.warning('Add items to the cart first');return;}
    const upiString=`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${total.toFixed(2)}&cu=INR`;
    try{
      const url=await QRCode.toDataURL(upiString,{
        width:280,margin:2,
        color:{dark:'#1a1a2e',light:'#ffffff'},
        errorCorrectionLevel:'M',
      });
      setQrDataUrl(url);
      setQrTotalAmount(total);
      setQrScreen('qr');
      setQrSecondsLeft(300);
      setShowUpiQr(true);
      clearInterval(qrTimerRef.current);
      qrTimerRef.current=setInterval(()=>{
        setQrSecondsLeft(s=>{
          if(s<=1){
            clearInterval(qrTimerRef.current);
            setQrScreen('expired');
            return 0;
          }
          return s-1;
        });
      },1000);
    }catch{message.error('Failed to generate QR code');}
  };

  const closeUpiQr=()=>{
    clearInterval(qrTimerRef.current);
    setShowUpiQr(false);
    setQrScreen('qr');
    setQrSecondsLeft(300);
  };

  // ── Core invoice creator ──────────────────────────────────
  const createInvoiceAndPDF=async(opts={})=>{
    const token=localStorage.getItem('token');
    const res=await axios.post(API_URL+'/invoices',{
      customer_name:   opts.customerName    ?? customerName,
      customer_phone:  opts.customerPhone   ?? customerPhone,
      customer_email:  opts.customerEmail   ?? customerEmail,
      items:           opts.items           ?? cartItems,
      tax_amount:      opts.taxRs           ?? taxRs,
      discount_amount: opts.discountRs      ?? discountRs,
      payment_method:  opts.paymentMethod   ?? paymentMethod,
      status:          opts.status          ?? billStatus,
    },{headers:{Authorization:'Bearer '+token}});
    setTimeout(()=>downloadPDF(res.data.id,res.data.invoice_number),400);
    return res.data;
  };

  const resetBill=()=>{
    setCustomerName('');setCustomerPhone('');setCustomerEmail('');
    setCartItems([]);setTaxAmount(0);setDiscountAmount(0);
    setTaxMode('rs');setDiscountMode('rs');
    setPaymentMethod('Cash');setBillStatus('paid');
    setErrors({});setCustSearch('');
    // Fix 9 + 10 resets
    setCashGiven(0);
    setLastInvoice(null);
  };

  const markUpiPaid=async()=>{
    clearInterval(qrTimerRef.current);
    setQrScreen('success');
    playBeep('success');
    // Fix 1: default customerName to 'Guest' if empty
    try{
      await createInvoiceAndPDF({
        paymentMethod:'UPI',
        status:'paid',
        customerName: customerName.trim() || 'Guest',
      });
    }catch(err){
      message.error(err.response?.data?.error||'Failed to save invoice');
    }
    setTimeout(()=>{
      closeUpiQr();
      resetBill();
      message.success('Payment received! Ready for next bill.');
    },3000);
  };

  // ── Barcode scanner handler ──────────────────────────────────
  const handleBarcodeChange=(e)=>{
    const v=e.target.value;
    setBarcodeInput(v);
    clearTimeout(barcodeTimerRef.current);
    barcodeTimerRef.current=setTimeout(()=>{if(v.trim())lookupBarcode(v.trim());},600);
  };

  const handleBarcodeKeyDown=(e)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      clearTimeout(barcodeTimerRef.current);
      if(barcodeInput.trim())lookupBarcode(barcodeInput.trim());
    }
  };

  const lookupBarcode=async(code)=>{
    setBarcodeScanning(true);
    const time=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    try{
      const token=localStorage.getItem('token');
      const res=await axios.get(`${API_URL}/products/barcode/${encodeURIComponent(code)}`,{headers:{Authorization:'Bearer '+token}});
      const p=res.data;
      // Fix 2: block out-of-stock from barcode scan
      if(p.stock===0){
        message.warning(`⚠️ ${p.name} is out of stock!`);
        playBeep('error');
        setScanHistory(h=>[{code,productName:p.name,price:p.price,status:'err',time},...h].slice(0,10));
        setBarcodeInput('');
        setTimeout(()=>barcodeRef.current?.focus(),100);
        return;
      }
      const color=(Array.isArray(p.colors)&&p.colors[0])||'';
      const size=(Array.isArray(p.sizes)&&p.sizes[0])||'';
      addToCart(p,1,color,size);
      playBeep('success');
      setScanHistory(h=>[{code,productName:p.name,price:p.price,status:'ok',time},...h].slice(0,10));
      setBarcodeInput('');
      setTimeout(()=>barcodeRef.current?.focus(),100);
    }catch(err){
      if(err.response?.status===404) message.error(`❌ No product found for barcode: ${code}`);
      else message.error('Barcode lookup failed');
      playBeep('error');
      setScanHistory(h=>[{code,productName:null,status:'err',time},...h].slice(0,10));
      setBarcodeInput('');
      setTimeout(()=>barcodeRef.current?.focus(),100);
    }finally{
      setBarcodeScanning(false);
    }
  };

  // Cart helpers
  const addToCart=(product,qty,color='',size='')=>{
    if(qty<=0){message.warning('Enter valid qty');return;}
    // Fix 2: block out-of-stock
    if(product.stock===0){
      message.warning(`⚠️ ${product.name} is out of stock!`);
      return;
    }
    // Fix 3: duplicate key merges quantity (existing logic preserved)
    const key=`${product.id}__${color}__${size}`;
    const ex=cartItems.find(i=>i._key===key);
    if(ex){
      setCartItems(cartItems.map(i=>i._key===key?{...i,quantity:i.quantity+qty,total_price:(i.quantity+qty)*i.unit_price}:i));
    }else{
      setCartItems([...cartItems,{
        _key:key,
        product_id:product.id,
        product_name:product.name,
        unit_price:product.price,
        quantity:qty,
        total_price:product.price*qty,
        color,
        size,
      }]);
    }
    const label=[product.name,color,size].filter(Boolean).join(' · ');
    message.success(label+' added');
  };
  const removeFromCart=key=>setCartItems(cartItems.filter(i=>i._key!==key));
  const updateQty=(key,qty)=>{if(qty<=0){removeFromCart(key);return;}setCartItems(cartItems.map(i=>i._key===key?{...i,quantity:qty,total_price:qty*i.unit_price}:i));};
  const subtotal=cartItems.reduce((s,i)=>s+i.total_price,0);
  const taxRs      = taxMode==='pct'      ? subtotal*(taxAmount/100)      : taxAmount;
  const discountRs = discountMode==='pct' ? subtotal*(discountAmount/100) : discountAmount;
  const total=subtotal+taxRs-discountRs;

  // Validate customer form
  const validateForm=()=>{
    const e={};
    if(!customerName.trim()) e.customerName='Customer name is required';
    else if(!/^[a-zA-Z\s.'-]{2,}$/.test(customerName.trim())) e.customerName='Name must contain only letters (no numbers)';
    if(customerPhone.trim() && !validatePhone(customerPhone)) e.customerPhone='Enter a valid 10-digit phone number';
    if(customerEmail.trim() && !validateEmail(customerEmail)) e.customerEmail='Email must contain @ (e.g. name@email.com)';
    setErrors(e);
    return Object.keys(e).length===0;
  };

  // Fix 10: print bill function
  const printBill=async(invoiceId,invoiceNumber)=>{
    try{
      const token=localStorage.getItem('token');
      const res=await fetch(API_URL+'/invoices/'+invoiceId+'/pdf',{headers:{Authorization:'Bearer '+token}});
      const blob=await res.blob();
      const url=window.URL.createObjectURL(blob);
      const iframe=document.createElement('iframe');
      iframe.style.display='none';
      iframe.src=url;
      document.body.appendChild(iframe);
      iframe.onload=()=>{
        iframe.contentWindow.print();
        setTimeout(()=>{document.body.removeChild(iframe);window.URL.revokeObjectURL(url);},2000);
      };
    }catch{message.error('Failed to print');}
  };

  // Create bill and download PDF
  const handleCreateBill=async()=>{
    if(!validateForm())return;
    if(cartItems.length===0){message.error('Add items to the bill');return;}
    setSubmitting(true);
    try{
      // Fix 1: ensure customerName has fallback (also handled in form validation, but guard here too)
      const inv=await createInvoiceAndPDF({
        customerName: customerName.trim() || 'Guest',
      });
      setLastInvoice(inv); // Fix 10
      message.success('Bill created! Downloading PDF...');
      // Fix 7: confetti
      setShowConfetti(true);
      setTimeout(()=>setShowConfetti(false),2500);
      resetBill();
    }catch(err){
      message.error(err.response?.data?.error||'Failed to create bill');
    }finally{
      setSubmitting(false);
    }
  };

  const downloadPDF=async(invoiceId,invoiceNumber)=>{
    try{
      const token=localStorage.getItem('token');
      const res=await fetch(API_URL+'/invoices/'+invoiceId+'/pdf',{headers:{Authorization:'Bearer '+token}});
      const blob=await res.blob();
      const url=window.URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='invoice-'+(invoiceNumber||invoiceId)+'.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }catch{
      message.error('Failed to download PDF');
    }
  };

  // Product CRUD
  const validateProd=(d,setE)=>{const e={};if(!d.name||d.name.trim().length<2)e.name='Product name must be at least 2 characters';if(!d.price||d.price<=0)e.price='Price must be greater than 0';if(!d.category||d.category.trim().length<2)e.category='Category is required';setE(e);return Object.keys(e).length===0;};
  const addNewProduct=async()=>{if(!validateProd(newProd,setProdErrors))return;try{const token=localStorage.getItem('token');await axios.post(API_URL+'/products',newProd,{headers:{Authorization:'Bearer '+token}});message.success('Product added!');setShowAdd(false);setNewProd({name:'',price:0,category:'General',stock:0});setProdErrors({});fetchProducts();}catch{message.error('Failed to add product');}};
  const saveEditProduct=async()=>{if(!validateProd(editProd,setEditErrors))return;try{const token=localStorage.getItem('token');await axios.put(API_URL+'/products/'+editProd.id,editProd,{headers:{Authorization:'Bearer '+token}});message.success('Product updated!');setShowEdit(false);setEditProd(null);setEditErrors({});fetchProducts();}catch{message.error('Failed to update product');}};
  const deleteProduct=async(id)=>{try{const token=localStorage.getItem('token');await axios.delete(API_URL+'/products/'+id,{headers:{Authorization:'Bearer '+token}});message.success('Product deleted!');fetchProducts();}catch{message.error('Failed to delete product');}};

  const payMethods=[{key:'Cash',icon:'💵',color:'#52c97a'},{key:'Card',icon:'💳',color:'#4d96ff'},{key:'UPI',icon:'📱',color:'#6c63ff'},{key:'Cheque',icon:'📝',color:'#f59e0b'}];
  if(loading)return(<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:400}}><Spin size='large'/></div>);

  return (
    <div style={{maxWidth:1400,margin:'0 auto',width:'100%',minWidth:0}}>
      <div className='billing-grid'>
        <div style={{display:'flex',flexDirection:'column',gap:22}}>
          <div className='card'>
            <div className='card-header'><div style={{display:'flex',alignItems:'center',gap:12}}><div className='icon-badge' style={{background:'linear-gradient(135deg,#667eea,#764ba2)',width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center'}}><User size={18} color='#fff'/></div><div><div className='card-title'>Customer Details</div><div className='card-sub'>Enter customer information or search previous</div></div></div></div>
            <div className='card-body'><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:18}}>
              </div>
            <div style={{marginBottom:18,position:'relative'}}>
              <label className='field-label' style={{marginBottom:6,display:'block'}}>
                <Search size={13} style={{marginRight:6,color:'#6c63ff',verticalAlign:'middle'}}/>
                Search Returning Customer
              </label>
              <div ref={custSearchRef} className='field-wrap' style={{border:'2px solid',borderColor:showCustDrop?'#6c63ff':'var(--border)',borderRadius:10,transition:'border-color .2s',background:'#fff'}}>
                <span className='field-icon'><Search size={15} style={{color:showCustDrop?'#6c63ff':'var(--muted)'}}/></span>
                  <input
                    type='text'
                    value={custSearch}
                    onChange={onCustSearchChange}
                    onFocus={()=>{if(custResults.length>0)setShowCustDrop(true);}}
                    placeholder='Type name or phone number...'
                    className='field-input'
                    style={{borderColor:'transparent',outline:'none'}}
                    autoComplete='off'
                  />
                  {custSearching&&<span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'#6c63ff',fontSize:13}}>⏳</span>}
                </div>

                {/* Dropdown results */}
                {showCustDrop&&custResults.length>0&&(
                  <div ref={custDropRef} style={{position:'absolute',top:'100%',left:0,right:0,zIndex:999,background:'#fff',borderRadius:12,boxShadow:'0 8px 32px rgba(108,99,255,.18)',border:'1.5px solid rgba(108,99,255,.2)',marginTop:4,overflow:'hidden'}}>
                    <div style={{padding:'8px 14px 6px',fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid var(--border)',background:'rgba(108,99,255,.04)'}}>
                      <Clock size={12} style={{marginRight:6,verticalAlign:'middle'}}/>Previous Customers ({custResults.length})
                    </div>
                    {custResults.map((c,i)=>(
                      <div key={i} onClick={()=>selectCustomer(c)}
                        style={{padding:'10px 14px',cursor:'pointer',borderBottom:i<custResults.length-1?'1px solid var(--border)':'none',transition:'background .15s',display:'flex',alignItems:'center',gap:12}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(108,99,255,.06)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                      >
                        <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,fontWeight:700,flexShrink:0}}>
                          {c.customer_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:14,color:'var(--text)',fontFamily:'Raleway,sans-serif'}}>{c.customer_name}</div>
                          <div style={{fontSize:12,color:'var(--muted)',display:'flex',gap:12,flexWrap:'wrap',marginTop:2}}>
                            {c.customer_phone&&<span>📞 {c.customer_phone}</span>}
                            {c.customer_email&&<span>✉️ {c.customer_email}</span>}
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#6c63ff',background:'rgba(108,99,255,.1)',padding:'2px 8px',borderRadius:20}}>{c.total_bills} bill{c.total_bills>1?'s':''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:18}}>
                <F label='Customer Name *' err={errors.customerName}><div className='field-wrap'><span className='field-icon'><User size={15}/></span><input type='text' value={customerName} onChange={e=>{const v=e.target.value.replace(/[0-9]/g,'');setCustomerName(v);if(errors.customerName)setErrors({...errors,customerName:''});}} placeholder='Full name (letters only)' className='field-input' style={{borderColor:errors.customerName?'#ef4444':undefined}}/></div></F>
                <F label='Phone Number (10 digits)' err={errors.customerPhone}><div className='field-wrap'><span className='field-icon'><Phone size={15}/></span><input type='tel' value={customerPhone} onChange={e=>{const v=e.target.value.replace(/[^\d\s\-+()\+]/g,'');setCustomerPhone(v);if(errors.customerPhone)setErrors({...errors,customerPhone:''});}} placeholder='98765 43210' className='field-input' style={{borderColor:errors.customerPhone?'#ef4444':undefined}} maxLength={15}/></div></F>
                <F label='Email Address' err={errors.customerEmail}><div className='field-wrap'><span className='field-icon'><Mail size={15}/></span><input type='email' value={customerEmail} onChange={e=>{setCustomerEmail(e.target.value);if(errors.customerEmail)setErrors({...errors,customerEmail:''});}} placeholder='name@email.com' className='field-input' style={{borderColor:errors.customerEmail?'#ef4444':undefined}}/></div></F>
              </div>
            </div>
          </div>
          <div className='card'>
            <div className='card-header'>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div className='icon-badge' style={{background:'linear-gradient(135deg,#4d96ff,#1e90ff)',width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center'}}><ShoppingCart size={18} color='#fff'/></div>
                <div><div className='card-title'>Select Products</div><div className='card-sub'>{products.length} products available</div></div>
              </div>
              <button onClick={()=>setShowAdd(true)} style={{padding:'9px 18px',background:'linear-gradient(135deg,#6c63ff,#764ba2)',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:13,fontFamily:'Raleway,sans-serif',display:'flex',alignItems:'center',gap:7,boxShadow:'0 4px 12px rgba(108,99,255,.3)'}}><Plus size={16}/> New Product</button>
            </div>
            <div className='card-body'>
              {/* ── Barcode Scanner Input ── */}
              <div style={{marginBottom:18}}>
                <div style={{
                  padding:'14px 18px',
                  background: barcodeScanning
                    ? 'linear-gradient(135deg,rgba(77,150,255,.12),rgba(108,99,255,.12))'
                    : 'linear-gradient(135deg,rgba(77,150,255,.06),rgba(108,99,255,.06))',
                  borderRadius:14,
                  border:'2px solid',
                  borderColor: barcodeScanning ? '#4d96ff' : 'rgba(108,99,255,.30)',
                  transition:'all .2s',
                  display:'flex',alignItems:'center',gap:14,
                }}>
                  <div style={{
                    width:44,height:44,borderRadius:12,flexShrink:0,
                    background: barcodeScanning
                      ? 'linear-gradient(135deg,#4d96ff,#6c63ff)'
                      : 'linear-gradient(135deg,rgba(77,150,255,.7),rgba(108,99,255,.7))',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    boxShadow: barcodeScanning ? '0 0 0 6px rgba(77,150,255,.2)' : 'none',
                    transition:'all .3s',
                  }}>
                    <ScanLine size={22} color='#fff'/>
                  </div>

                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#6c63ff',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,display:'flex',alignItems:'center',gap:6}}>
                      Barcode Scanner
                      {barcodeScanning && <span style={{fontSize:10,background:'#4d96ff',color:'#fff',padding:'1px 7px',borderRadius:20,fontWeight:700}}>Scanning...</span>}
                      {!barcodeScanning && <span style={{fontSize:10,background:'rgba(82,201,122,.15)',color:'#52c97a',padding:'1px 7px',borderRadius:20,fontWeight:700}}>● Ready</span>}
                    </div>
                    <div style={{position:'relative'}}>
                      <input
                        ref={barcodeRef}
                        type='text'
                        value={barcodeInput}
                        onChange={handleBarcodeChange}
                        onKeyDown={handleBarcodeKeyDown}
                        placeholder='Scan barcode or type code + Enter...'
                        style={{
                          width:'100%',boxSizing:'border-box',
                          padding:'10px 44px 10px 14px',
                          borderRadius:10,
                          border:'2px solid',
                          borderColor: barcodeScanning ? '#4d96ff' : 'rgba(108,99,255,.25)',
                          outline:'none',fontSize:15,
                          fontFamily:'monospace',fontWeight:700,
                          background:'#fff',color:'var(--text)',
                          transition:'all .2s',letterSpacing:'1.5px',
                          boxShadow: barcodeScanning ? '0 0 0 3px rgba(77,150,255,.15)' : 'none',
                        }}
                        autoComplete='off'
                      />
                      {barcodeScanning && (
                        <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:16}}>⏳</span>
                      )}
                      {!barcodeScanning && barcodeInput && (
                        <button onClick={()=>lookupBarcode(barcodeInput.trim())} style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:'#6c63ff',border:'none',borderRadius:7,color:'#fff',padding:'4px 12px',cursor:'pointer',fontWeight:700,fontSize:12}}>Go</button>
                      )}
                    </div>
                  </div>

                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:20,fontWeight:800,color:'#6c63ff',lineHeight:1}}>{scanHistory.length}</div>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px'}}>Scans</div>
                  </div>
                </div>

                {/* ── Scan History ── */}
                {scanHistory.length>0 && (
                  <div style={{marginTop:10,borderRadius:12,border:'1.5px solid var(--border)',overflow:'hidden',background:'#fff'}}>
                    <div style={{
                      padding:'8px 14px',
                      background:'rgba(108,99,255,.04)',
                      borderBottom:'1px solid var(--border)',
                      display:'flex',justifyContent:'space-between',alignItems:'center',
                    }}>
                      <span style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>
                        🕒 Scan History (last {scanHistory.length})
                      </span>
                      <button onClick={()=>setScanHistory([])} style={{fontSize:11,color:'#ff6b6b',background:'none',border:'none',cursor:'pointer',fontWeight:700,padding:'2px 6px',borderRadius:5}}>
                        Clear
                      </button>
                    </div>
                    <div style={{maxHeight:180,overflowY:'auto'}}>
                      {scanHistory.map((s,i)=>(
                        <div key={i} style={{
                          display:'flex',alignItems:'center',gap:10,
                          padding:'8px 14px',
                          borderBottom: i<scanHistory.length-1 ? '1px solid var(--border)' : 'none',
                          background: i===0 ? 'rgba(108,99,255,.03)' : '#fff',
                          transition:'background .15s',
                        }}>
                          <div style={{
                            width:28,height:28,borderRadius:8,flexShrink:0,
                            background: s.status==='ok' ? 'rgba(82,201,122,.12)' : 'rgba(255,107,107,.12)',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:14,
                          }}>
                            {s.status==='ok' ? '✅' : '❌'}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{
                              fontFamily:'monospace',fontWeight:700,fontSize:13,
                              color: s.status==='ok' ? 'var(--text)' : '#ff6b6b',
                              letterSpacing:'.5px',
                            }}>{s.code}</div>
                            {s.status==='ok'
                              ? <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                                  {s.productName} · ₹{s.price?.toLocaleString('en-IN')}
                                </div>
                              : <div style={{fontSize:11,color:'#ff6b6b',fontWeight:600}}>Product not found</div>
                            }
                          </div>
                          <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,flexShrink:0}}>{s.time}</div>
                          {s.status==='err' && (
                            <button onClick={()=>lookupBarcode(s.code)} style={{fontSize:11,color:'#6c63ff',background:'rgba(108,99,255,.08)',border:'1px solid rgba(108,99,255,.2)',cursor:'pointer',fontWeight:700,padding:'2px 8px',borderRadius:6}}>Retry</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className='products-grid'>
                {products.map(p=>(<ProductCard key={p.id} product={p} onAddToCart={addToCart} onEdit={p2=>{setEditProd({...p2});setShowEdit(true);}} onDelete={deleteProduct}/>))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CART PANEL ── */}
        <div className='cart-panel'>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <div className='icon-badge' style={{background:'linear-gradient(135deg,#56ab2f,#a8e063)',width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center'}}><ShoppingCart size={18} color='#fff'/></div>
            <div><div className='card-title'>Bill Summary</div><div className='card-sub'>{cartItems.length} item(s)</div></div>
          </div>
          {cartItems.length===0?(
            <div className='cart-empty'><div className='cart-empty-icon'>🛒</div><p style={{fontSize:15,fontWeight:600,marginBottom:6}}>Cart is empty</p><p style={{fontSize:13}}>Add products from the left</p></div>
          ):(<>
            <div className='cart-items-list'>{cartItems.map(item=>(<div key={item._key} className='cart-item'><div className='cart-item-info'><div className='cart-item-name'>{item.product_name}{item.color&&<span style={{display:'inline-flex',alignItems:'center',gap:3,marginLeft:6,fontSize:11,fontWeight:700,color:'var(--muted)',background:'var(--bg)',padding:'1px 7px 1px 4px',borderRadius:20,border:'1px solid var(--border)'}}><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:item.color,border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>{colorName(item.color)}</span>}{item.size&&<span style={{marginLeft:4,fontSize:10,fontWeight:700,color:'#4d96ff',background:'rgba(77,150,255,.1)',padding:'1px 5px',borderRadius:5}}>{item.size}</span>}</div><div className='cart-item-unit'>₹{item.unit_price.toLocaleString('en-IN')} each</div></div><div style={{display:'flex',alignItems:'center',gap:6}}><button onClick={()=>updateQty(item._key,item.quantity-1)} style={{width:24,height:24,borderRadius:6,border:'1px solid var(--border)',background:'#fff',cursor:'pointer',fontWeight:700,color:'var(--primary)',fontSize:14}}>-</button><span style={{fontSize:13,fontWeight:700,minWidth:22,textAlign:'center'}}>{item.quantity}</span><button onClick={()=>updateQty(item._key,item.quantity+1)} style={{width:24,height:24,borderRadius:6,border:'1px solid var(--border)',background:'#fff',cursor:'pointer',fontWeight:700,color:'var(--primary)',fontSize:14}}>+</button></div><div className='cart-item-total'>₹{item.total_price.toLocaleString('en-IN')}</div><button className='cart-del-btn' onClick={()=>removeFromCart(item._key)}><Trash2 size={14}/></button></div>))}</div>
            <div className='cart-summary'>
              <div className='summary-row'><span>Subtotal</span><span style={{fontWeight:700,color:'var(--text)'}}>Rs.{subtotal.toLocaleString('en-IN')}</span></div>

              {/* Tax row */}
              <div className='summary-row'>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span>Tax</span>
                  <div style={{display:'flex',borderRadius:6,border:'1.5px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                    <button onClick={()=>setTaxMode('rs')} style={{padding:'2px 8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:taxMode==='rs'?'#6c63ff':'#fff',color:taxMode==='rs'?'#fff':'var(--muted)',transition:'all .15s'}}>Rs.</button>
                    <button onClick={()=>setTaxMode('pct')} style={{padding:'2px 8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:taxMode==='pct'?'#6c63ff':'#fff',color:taxMode==='pct'?'#fff':'var(--muted)',transition:'all .15s'}}>%</button>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <input type='number' min='0' max={taxMode==='pct'?100:undefined} value={taxAmount} onChange={e=>setTaxAmount(parseFloat(e.target.value)||0)} className='summary-input' onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>{e.target.style.borderColor='var(--border)';}}/>
                  {taxMode==='pct'&&taxAmount>0&&<span style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>= Rs.{taxRs.toLocaleString('en-IN')}</span>}
                </div>
              </div>

              {/* Discount row */}
              <div className='summary-row'>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span>Discount</span>
                  <div style={{display:'flex',borderRadius:6,border:'1.5px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                    <button onClick={()=>setDiscountMode('rs')} style={{padding:'2px 8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:discountMode==='rs'?'#52c97a':'#fff',color:discountMode==='rs'?'#fff':'var(--muted)',transition:'all .15s'}}>Rs.</button>
                    <button onClick={()=>setDiscountMode('pct')} style={{padding:'2px 8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:discountMode==='pct'?'#52c97a':'#fff',color:discountMode==='pct'?'#fff':'var(--muted)',transition:'all .15s'}}>%</button>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <input type='number' min='0' max={discountMode==='pct'?100:undefined} value={discountAmount} onChange={e=>setDiscountAmount(parseFloat(e.target.value)||0)} className='summary-input' onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>{e.target.style.borderColor='var(--border)';}}/>
                  {discountMode==='pct'&&discountAmount>0&&<span style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>= Rs.{discountRs.toLocaleString('en-IN')}</span>}
                </div>
              </div>
            </div>
            <div className='cart-total'><span className='cart-total-label'>Total Amount</span><span className='cart-total-value'>Rs.{total.toLocaleString('en-IN')}</span></div>
            <p style={{fontSize:12,fontWeight:700,color:'var(--muted)',marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Payment Method</p>
            <div className='payment-grid'>{payMethods.map(pm=>(<button key={pm.key} className='pay-btn' onClick={()=>setPaymentMethod(pm.key)} style={{border:paymentMethod===pm.key?'2px solid '+pm.color:'2px solid var(--border)',background:paymentMethod===pm.key?pm.color+'15':'#fff',color:paymentMethod===pm.key?pm.color:'var(--muted)'}}>{pm.icon} {pm.key}</button>))}</div>

            {/* UPI QR Button */}
            {paymentMethod==='UPI'&&cartItems.length>0&&(
              <button onClick={openUpiQr} style={{
                width:'100%',marginTop:10,padding:'11px 0',borderRadius:11,border:'2px solid #6c63ff',
                background:'linear-gradient(135deg,rgba(108,99,255,.12),rgba(77,150,255,.12))',
                color:'#6c63ff',fontWeight:700,fontSize:14,cursor:'pointer',
                fontFamily:'Raleway,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                transition:'all .2s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.background='linear-gradient(135deg,#6c63ff,#4d96ff)';e.currentTarget.style.color='#fff';}}
              onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(135deg,rgba(108,99,255,.12),rgba(77,150,255,.12))';e.currentTarget.style.color='#6c63ff';}}
              >
                <span style={{fontSize:18}}>📲</span> Show QR — ₹{total.toLocaleString('en-IN')}
              </button>
            )}

            {/* Fix 9: Cash change calculator */}
            {paymentMethod==='Cash'&&cartItems.length>0&&(
              <div style={{marginTop:10,padding:'12px 14px',background:'rgba(82,201,122,.07)',borderRadius:12,border:'1.5px solid rgba(82,201,122,.25)'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#52c97a',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>💵 Change Calculator</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{fontSize:12,color:'var(--muted)',fontWeight:600,flexShrink:0}}>Cash Received:</span>
                  <input
                    type='number' min='0'
                    value={cashGiven||''}
                    onChange={e=>setCashGiven(parseFloat(e.target.value)||0)}
                    placeholder={`Min ₹${Math.ceil(total)}`}
                    style={{flex:1,padding:'7px 10px',borderRadius:8,border:'2px solid rgba(82,201,122,.4)',outline:'none',fontSize:14,fontWeight:700,fontFamily:'monospace'}}
                  />
                </div>
                {cashGiven>0&&(
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:8,background:cashGiven>=total?'rgba(82,201,122,.15)':'rgba(239,68,68,.1)'}}>
                    <span style={{fontSize:13,fontWeight:700,color:cashGiven>=total?'#52c97a':'#ef4444'}}>
                      {cashGiven>=total?'✅ Change to Return:':'❌ Short by:'}
                    </span>
                    <span style={{fontSize:16,fontWeight:800,fontFamily:'monospace',color:cashGiven>=total?'#52c97a':'#ef4444'}}>
                      ₹{Math.abs(cashGiven-total).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <p style={{fontSize:12,fontWeight:700,color:'var(--muted)',margin:'16px 0 10px',textTransform:'uppercase',letterSpacing:'.5px'}}>Payment Status</p>
            <div style={{display:'flex',gap:10,marginBottom:16}}>
              <button onClick={()=>setBillStatus('paid')} style={{flex:1,padding:'10px 0',borderRadius:10,border:billStatus==='paid'?'2px solid #52c97a':'2px solid var(--border)',background:billStatus==='paid'?'rgba(82,201,122,.12)':'#fff',color:billStatus==='paid'?'#52c97a':'var(--muted)',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all .2s'}}>✅ Paid</button>
              <button onClick={()=>setBillStatus('unpaid')} style={{flex:1,padding:'10px 0',borderRadius:10,border:billStatus==='unpaid'?'2px solid #ef4444':'2px solid var(--border)',background:billStatus==='unpaid'?'rgba(239,68,68,.10)':'#fff',color:billStatus==='unpaid'?'#ef4444':'var(--muted)',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all .2s'}}>❌ Not Paid</button>
            </div>
            <button className='create-btn' onClick={handleCreateBill} disabled={submitting}>{submitting?'Creating...':'Create & Download Bill'}</button>
            {/* Fix 10: Print last bill button */}
            {lastInvoice&&(
              <button onClick={()=>printBill(lastInvoice.id,lastInvoice.invoice_number)}
                style={{width:'100%',marginTop:8,padding:'10px 0',borderRadius:11,border:'2px solid #4d96ff',background:'rgba(77,150,255,.08)',color:'#4d96ff',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'Raleway,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                🖨️ Print Last Bill
              </button>
            )}
            <button className='clear-btn' style={{marginTop:8}} onClick={()=>setCartItems([])}>Clear Cart</button>
          </>)}
        </div>
      </div>
      <Modal title={<span style={{fontWeight:700,fontSize:16}}>Add New Product</span>} open={showAdd} onOk={addNewProduct} onCancel={()=>{setShowAdd(false);setProdErrors({});}} okText='Add Product' okButtonProps={{style:{background:'linear-gradient(135deg,#667eea,#764ba2)',border:'none',fontWeight:700}}}><ProdForm data={newProd} onChange={setNewProd} errs={prodErrors}/></Modal>
      <Modal title={<span style={{fontWeight:700,fontSize:16}}>Edit Product</span>} open={showEdit} onOk={saveEditProduct} onCancel={()=>{setShowEdit(false);setEditErrors({});}} okText='Save Changes' okButtonProps={{style:{background:'linear-gradient(135deg,#f59e0b,#ef4444)',border:'none',fontWeight:700}}}>{editProd&&<ProdForm data={editProd} onChange={setEditProd} errs={editErrors}/>}</Modal>

      {/* ── UPI QR Modal ── */}
      <Modal
        open={showUpiQr}
        onCancel={closeUpiQr}
        footer={null}
        centered
        width={380}
        title={null}
        closable={qrScreen!=='success'}
        maskClosable={qrScreen!=='success'}
        styles={{body:{padding:0}}}
      >
        {/* ── SCREEN 1: QR Code ── */}
        {qrScreen==='qr'&&(
          <div style={{textAlign:'center',padding:'28px 24px 24px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:6}}>
              <div style={{width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#6c63ff,#4d96ff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📲</div>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:17,fontWeight:800,color:'var(--text)',fontFamily:'Raleway,sans-serif'}}>Scan & Pay</div>
                <div style={{fontSize:12,color:'var(--muted)'}}>{localStorage.getItem('upi_name')||'UPI Payment'}</div>
              </div>
            </div>
            <div style={{fontSize:12,fontFamily:'monospace',fontWeight:700,color:'#6c63ff',marginBottom:16}}>{localStorage.getItem('upi_id')}</div>

            {qrDataUrl&&(
              <div style={{display:'inline-block',padding:12,background:'#fff',borderRadius:16,border:'3px solid rgba(108,99,255,.25)',boxShadow:'0 8px 32px rgba(108,99,255,.18)',marginBottom:14}}>
                <img src={qrDataUrl} alt='UPI QR' style={{width:230,height:230,display:'block'}}/>
              </div>
            )}

            <div style={{display:'inline-block',padding:'9px 28px',borderRadius:30,background:'linear-gradient(135deg,#6c63ff,#4d96ff)',color:'#fff',fontWeight:800,fontSize:22,fontFamily:'Raleway,sans-serif',boxShadow:'0 4px 16px rgba(108,99,255,.35)',marginBottom:14,letterSpacing:'.5px'}}>
              ₹{qrTotalAmount.toLocaleString('en-IN')}
            </div>

            <div style={{marginBottom:16}}>
              <div style={{
                display:'inline-flex',alignItems:'center',gap:8,
                padding:'7px 18px',borderRadius:20,
                background: qrSecondsLeft<=60 ? 'rgba(239,68,68,.1)' : 'rgba(82,201,122,.1)',
                border:`1.5px solid ${qrSecondsLeft<=60?'rgba(239,68,68,.3)':'rgba(82,201,122,.3)'}`,
                transition:'all .3s',
              }}>
                <span style={{fontSize:16}}>⏱️</span>
                <span style={{fontWeight:800,fontSize:16,fontFamily:'monospace',color:qrSecondsLeft<=60?'#ef4444':'#52c97a',letterSpacing:'1px'}}>
                  {String(Math.floor(qrSecondsLeft/60)).padStart(2,'0')}:{String(qrSecondsLeft%60).padStart(2,'0')}
                </span>
                <span style={{fontSize:11,color:'var(--muted)',fontWeight:600}}>QR valid</span>
              </div>
              <div style={{height:4,borderRadius:4,background:'var(--border)',marginTop:8,overflow:'hidden'}}>
                <div style={{
                  height:'100%',borderRadius:4,
                  width:`${(qrSecondsLeft/300)*100}%`,
                  background: qrSecondsLeft<=60 ? '#ef4444' : 'linear-gradient(90deg,#52c97a,#4d96ff)',
                  transition:'width 1s linear',
                }}/>
              </div>
            </div>

            <div style={{fontSize:12,color:'var(--muted)',marginBottom:18,lineHeight:1.6}}>
              GPay / PhonePe / Paytm se scan kare<br/>
              Amount automatically set ho jaayega
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{const a=document.createElement('a');a.href=qrDataUrl;a.download=`UPI-QR-Rs${qrTotalAmount}.png`;a.click();}} style={{flex:1,padding:'10px 0',borderRadius:10,border:'2px solid rgba(108,99,255,.3)',background:'rgba(108,99,255,.07)',color:'#6c63ff',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'Raleway,sans-serif'}}>
                ⬇️ Download
              </button>
              <button onClick={markUpiPaid} style={{flex:2,padding:'10px 0',borderRadius:10,border:'none',background:'linear-gradient(135deg,#52c97a,#56ab2f)',color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'Raleway,sans-serif',boxShadow:'0 4px 14px rgba(82,201,122,.35)'}}>
                ✅ Payment Received
              </button>
            </div>
          </div>
        )}

        {/* ── SCREEN 2: SUCCESS ── */}
        {qrScreen==='success'&&(
          <div style={{textAlign:'center',padding:'40px 28px 36px',background:'linear-gradient(180deg,rgba(82,201,122,.06) 0%,#fff 100%)'}}>
            <div style={{
              width:90,height:90,borderRadius:'50%',
              background:'linear-gradient(135deg,#52c97a,#56ab2f)',
              display:'flex',alignItems:'center',justifyContent:'center',
              margin:'0 auto 20px',
              boxShadow:'0 0 0 14px rgba(82,201,122,.15)',
              fontSize:44,
              animation:'successPop .4s cubic-bezier(.175,.885,.32,1.275)',
            }}>✓</div>
            <div style={{fontSize:24,fontWeight:800,color:'#52c97a',fontFamily:'Raleway,sans-serif',marginBottom:8}}>
              Payment Successful!
            </div>
            <div style={{fontSize:28,fontWeight:800,color:'var(--text)',fontFamily:'Raleway,sans-serif',marginBottom:6}}>
              ₹{qrTotalAmount.toLocaleString('en-IN')}
            </div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:24,lineHeight:1.7}}>
              UPI payment received successfully<br/>
              <strong style={{color:'#6c63ff'}}>{localStorage.getItem('upi_id')}</strong>
            </div>
            <div style={{padding:'10px 20px',borderRadius:12,background:'rgba(82,201,122,.1)',border:'1.5px solid rgba(82,201,122,.25)',fontSize:13,color:'#52c97a',fontWeight:600,fontFamily:'Raleway,sans-serif'}}>
              🔄 New bill ke liye redirect ho raha hai...
            </div>
          </div>
        )}

        {/* ── SCREEN 3: EXPIRED ── */}
        {qrScreen==='expired'&&(
          <div style={{textAlign:'center',padding:'36px 28px 28px'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(239,68,68,.1)',border:'3px solid rgba(239,68,68,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',fontSize:38}}>⏰</div>
            <div style={{fontSize:20,fontWeight:800,color:'#ef4444',fontFamily:'Raleway,sans-serif',marginBottom:8}}>QR Expired!</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:24,lineHeight:1.6}}>
              5 minutes expired ho gaye.<br/>
              Naya QR generate karo.
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={closeUpiQr} style={{flex:1,padding:'11px 0',borderRadius:10,border:'2px solid var(--border)',background:'#fff',color:'var(--muted)',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'Raleway,sans-serif'}}>
                Cancel
              </button>
              <button onClick={openUpiQr} style={{flex:2,padding:'11px 0',borderRadius:10,border:'none',background:'linear-gradient(135deg,#6c63ff,#4d96ff)',color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'Raleway,sans-serif',boxShadow:'0 4px 14px rgba(108,99,255,.3)'}}>
                🔄 Generate New QR
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Fix 7: Confetti */}
      <ConfettiEffect active={showConfetti}/>
    </div>
  );
}

/* ── Field error wrapper for modals ── */
function E({label,err,children}){
  return(
    <div style={{marginBottom:4}}>
      <label className='field-label' style={{color:err?'#ef4444':undefined}}>
        {label}{err&&<span style={{color:'#ef4444',fontSize:11,fontWeight:500,marginLeft:8}}>{err}</span>}
      </label>
      {children}
    </div>
  );
}

function ProdForm({data,onChange,errs}) {
  const genBarcode=()=>{
    const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const L1=L[Math.floor(Math.random()*26)];
    const L2=L[Math.floor(Math.random()*26)];
    const nums=String(Math.floor(1000+Math.random()*9000));
    onChange({...data,barcode:`${L1}${L2}-${nums}`});
  };

  return (<div style={{display:'flex',flexDirection:'column',gap:16,paddingTop:8}}>
    <E label='Product Name *' err={errs.name}><Input value={data.name} onChange={e=>onChange({...data,name:e.target.value})} placeholder='e.g. Wireless Mouse' size='large' status={errs.name?'error':''}/></E>
    <E label='Price (Rs.) *' err={errs.price}><InputNumber value={data.price} onChange={v=>onChange({...data,price:v||0})} min={0} style={{width:'100%'}} size='large' status={errs.price?'error':''} formatter={v=>'Rs. '+v} parser={v=>v.replace(/Rs\.\s?/,'')}/></E>
    <E label='Category *' err={errs.category}><Input value={data.category} onChange={e=>onChange({...data,category:e.target.value})} placeholder='e.g. Electronics' size='large' status={errs.category?'error':''}/></E>
    <E label='Stock Quantity'><InputNumber value={data.stock} onChange={v=>onChange({...data,stock:v||0})} min={0} style={{width:'100%'}} size='large'/></E>
    <E label='Barcode' err={errs.barcode}>
      <div style={{display:'flex',gap:8}}>
        <Input
          value={data.barcode||''}
          onChange={e=>onChange({...data,barcode:e.target.value})}
          placeholder='Scan or type barcode (e.g. 8901234567890)'
          size='large'
          style={{fontFamily:'monospace',letterSpacing:'1px'}}
          prefix={<Barcode size={14} style={{color:'#6c63ff'}}/>}
        />
        <button
          type='button'
          onClick={genBarcode}
          title='Auto-generate barcode'
          style={{padding:'0 14px',height:40,borderRadius:8,border:'1.5px solid #6c63ff',background:'rgba(108,99,255,.08)',color:'#6c63ff',cursor:'pointer',fontWeight:700,fontSize:12,whiteSpace:'nowrap',flexShrink:0}}
        >Auto</button>
      </div>
      <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Leave blank if no barcode. Must be unique per product.</div>
    </E>
  </div>);
}

export default BillingModule;
