import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Spin, Modal, Input, InputNumber, Popconfirm } from 'antd';
import { Trash2, Plus, Key, Edit2, Search, TrendingUp, X, Upload, Download, LayoutDashboard, UsersRound, Package, BarChart3, ClipboardList, IndianRupee, Crown, Barcode } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PAY_COLORS = {
  Cash:   { color: '#52c97a', bg: 'rgba(82,201,122,0.12)' },
  Card:   { color: '#4d96ff', bg: 'rgba(77,150,255,0.12)' },
  UPI:    { color: '#6c63ff', bg: 'rgba(108,99,255,0.12)' },
  Cheque: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

const CAT_COLORS = {
  Electronics: { color: '#4d96ff', bg: 'rgba(77,150,255,.12)' },
  Accessories: { color: '#6c63ff', bg: 'rgba(108,99,255,.12)' },
  Audio:        { color: '#52c97a', bg: 'rgba(82,201,122,.12)' },
  General:      { color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
};

const EMPTY_PROD = { name: '', price: '', category: 'General', stock: 0, colors: [], sizes: [], image: '', barcode: '' };

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

function SuperAdmin() {
  const [tab,           setTab]           = useState('overview');
  const [stats,         setStats]         = useState(null);
  const [users,         setUsers]         = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [filteredInv,   setFilteredInv]   = useState([]);
  const [products,      setProducts]      = useState([]);
  const [filteredProd,  setFilteredProd]  = useState([]);
  const [salesData,     setSalesData]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [prodSearch,    setProdSearch]    = useState('');

  // Create user modal
  const [showCreate,    setShowCreate]    = useState(false);
  const [newUser,       setNewUser]       = useState({ username: '', password: '', email: '', role: 'admin' });
  const [creating,      setCreating]      = useState(false);
  const [createErrors,  setCreateErrors]  = useState({});

  // Reset password modal
  const [showReset,     setShowReset]     = useState(false);
  const [resetTarget,   setResetTarget]   = useState(null);
  const [newPwd,        setNewPwd]        = useState('');
  const [resetting,     setResetting]     = useState(false);

  // Product modals
  const [showAddProd,   setShowAddProd]   = useState(false);
  const [showEditProd,  setShowEditProd]  = useState(false);
  const [prodForm,      setProdForm]      = useState(EMPTY_PROD);
  const [editProdId,    setEditProdId]    = useState(null);
  const [prodErrors,    setProdErrors]    = useState({});
  const [savingProd,    setSavingProd]    = useState(false);
  const [colorInput,    setColorInput]    = useState('');
  const [sizeInput,     setSizeInput]     = useState('');

  // Sales export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange,     setExportRange]     = useState('all');
  const [exportFrom,      setExportFrom]      = useState('');
  const [exportTo,        setExportTo]        = useState('');
  const [exportLoading,   setExportLoading]   = useState(false);
  const [importData,    setImportData]    = useState([]);
  const [importing,     setImporting]     = useState(false);
  const [importErrors,  setImportErrors]  = useState([]);

  // Excel import state
  const [showImport,    setShowImport]    = useState(false);
  const token = () => localStorage.getItem('token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFilteredInv(invoices); return; }
    const q = search.toLowerCase();
    setFilteredInv(invoices.filter(i =>
      i.invoice_number?.toLowerCase().includes(q) ||
      i.customer_name?.toLowerCase().includes(q) ||
      i.created_by_name?.toLowerCase().includes(q)
    ));
  }, [search, invoices]);

  useEffect(() => {
    if (!prodSearch.trim()) { setFilteredProd(products); return; }
    const q = prodSearch.toLowerCase();
    setFilteredProd(products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    ));
  }, [prodSearch, products]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, inv, prod, sales] = await Promise.all([
        axios.get(`${API_URL}/superadmin/stats`,         { headers: headers() }),
        axios.get(`${API_URL}/superadmin/users`,         { headers: headers() }),
        axios.get(`${API_URL}/superadmin/invoices`,      { headers: headers() }),
        axios.get(`${API_URL}/products`,                 { headers: headers() }),
        axios.get(`${API_URL}/superadmin/product-sales`, { headers: headers() }),
      ]);
      setStats(s.data);
      setUsers(u.data);
      setInvoices(inv.data);
      setFilteredInv(inv.data);
      setProducts(prod.data);
      setFilteredProd(prod.data);
      setSalesData(sales.data);
    } catch { message.error('Failed to load superadmin data'); }
    finally { setLoading(false); }
  };

  // ── Product CRUD ──────────────────────────────────────────
  const validateProd = (d) => {
    const e = {};
    if (!d.name?.trim() || d.name.trim().length < 2) e.name = 'Min 2 characters';
    if (!d.price || parseFloat(d.price) <= 0) e.price = 'Must be greater than 0';
    if (!d.category?.trim()) e.category = 'Required';
    setProdErrors(e);
    return Object.keys(e).length === 0;
  };

  const addProduct = async () => {
    if (!validateProd(prodForm)) return;
    setSavingProd(true);
    try {
      await axios.post(`${API_URL}/products`, {
        ...prodForm,
        price:   parseFloat(prodForm.price),
        stock:   parseInt(prodForm.stock) || 0,
        colors:  prodForm.colors  || [],
        sizes:   prodForm.sizes   || [],
        image:   prodForm.image   || '',
        barcode: (prodForm.barcode || '').trim(),
      }, { headers: headers() });
      message.success('Product added!');
      setShowAddProd(false); setProdForm(EMPTY_PROD); setProdErrors({}); setColorInput(''); setSizeInput('');
      loadAll();
    } catch (err) { message.error(err.response?.data?.error || 'Failed to add product'); }
    finally { setSavingProd(false); }
  };

  const saveEditProduct = async () => {
    if (!validateProd(prodForm)) return;
    setSavingProd(true);
    try {
      await axios.put(`${API_URL}/products/${editProdId}`, {
        ...prodForm,
        price:   parseFloat(prodForm.price),
        stock:   parseInt(prodForm.stock) || 0,
        colors:  prodForm.colors  || [],
        sizes:   prodForm.sizes   || [],
        image:   prodForm.image   || '',
        barcode: (prodForm.barcode || '').trim(),
      }, { headers: headers() });
      message.success('Product updated!');
      setShowEditProd(false); setProdForm(EMPTY_PROD); setEditProdId(null); setProdErrors({}); setColorInput(''); setSizeInput('');
      loadAll();
    } catch (err) { message.error(err.response?.data?.error || 'Failed to update product'); }
    finally { setSavingProd(false); }
  };

  const deleteProduct = async (id) => {
    try {
      await axios.delete(`${API_URL}/products/${id}`, { headers: headers() });
      message.success('Product deleted!');
      loadAll();
    } catch { message.error('Failed to delete product'); }
  };

  // ── Excel Import ──────────────────────────────────────────
  const parseExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const parsed = rows.map((row, i) => {
          // Support both English and Hindi-style column names
          const name     = String(row['Name'] || row['name'] || row['Product Name'] || row['product_name'] || '').trim();
          const price    = parseFloat(row['Price'] || row['price'] || row['MRP'] || row['mrp'] || 0);
          const category = String(row['Category'] || row['category'] || 'General').trim();
          const stock    = parseInt(row['Stock'] || row['stock'] || row['Qty'] || row['qty'] || 0);
          const colors   = String(row['Colors'] || row['colors'] || row['Color'] || row['color'] || '').trim();
          const sizes    = String(row['Sizes'] || row['sizes'] || row['Size'] || row['size'] || '').trim();

          const errors = [];
          if (!name)        errors.push('Name missing');
          if (!price || price <= 0) errors.push('Invalid price');

          return {
            _row: i + 2, // Excel row number (1=header, so data starts at 2)
            name,
            price,
            category: category || 'General',
            stock:    isNaN(stock) ? 0 : stock,
            colors:   colors ? colors.split(/[,;|]/).map(c => c.trim()).filter(Boolean) : [],
            sizes:    sizes  ? sizes.split(/[,;|]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [],
            image:    '',
            _errors:  errors,
            _valid:   errors.length === 0,
          };
        }).filter(r => r.name || r.price); // skip completely empty rows

        setImportData(parsed);
        setImportErrors(parsed.filter(r => !r._valid));
        setShowImport(true);
      } catch (err) {
        message.error('Failed to parse Excel file. Make sure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    parseExcel(file);
  };

  const bulkImport = async () => {
    const validRows = importData.filter(r => r._valid);
    if (validRows.length === 0) { message.error('No valid rows to import'); return; }
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of validRows) {
      try {
        await axios.post(`${API_URL}/products`, {
          name: row.name, price: row.price, category: row.category,
          stock: row.stock, colors: row.colors, sizes: row.sizes, image: '',
        }, { headers: headers() });
        success++;
      } catch { failed++; }
    }
    setImporting(false);
    setShowImport(false);
    setImportData([]);
    if (success > 0) message.success(`${success} product${success > 1 ? 's' : ''} imported successfully!`);
    if (failed  > 0) message.error(`${failed} product${failed > 1 ? 's' : ''} failed to import.`);
    loadAll();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price', 'Category', 'Stock', 'Colors', 'Sizes'],
      ['Ankarli Kurti', 1500, 'Clothing', 50, '#ff4d4f,#52c97a', 'S,M,L,XL'],
      ['Cotton Shirt',  800,  'Clothing', 30, '#4d96ff,#000000', 'M,L,XL'],
      ['Wireless Mouse',500,  'Electronics', 20, '', ''],
    ]);
    ws['!cols'] = [{wch:20},{wch:10},{wch:14},{wch:8},{wch:25},{wch:20}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products_template.xlsx');
  };

  const exportSalesExcel = async () => {
    if (exportRange === 'custom' && (!exportFrom || !exportTo)) {
      message.warning('Please select both From and To dates');
      return;
    }
    setExportLoading(true);
    try {
      // Build URL with date params
      let url = `${API_URL}/superadmin/product-sales`;
      let fromD = exportFrom, toD = exportTo;

      if (exportRange !== 'custom' && exportRange !== 'all') {
        const now = new Date();
        const toISO = (d) => d.toISOString().split('T')[0];
        const ranges = {
          today:   () => { const d = toISO(now); return { from: d, to: d }; },
          week:    () => { const d = new Date(now); d.setDate(d.getDate()-6);    return { from: toISO(d), to: toISO(now) }; },
          month:   () => { const d = new Date(now); d.setDate(d.getDate()-29);   return { from: toISO(d), to: toISO(now) }; },
          '3months':() =>{ const d = new Date(now); d.setMonth(d.getMonth()-3);  return { from: toISO(d), to: toISO(now) }; },
          '6months':() =>{ const d = new Date(now); d.setMonth(d.getMonth()-6);  return { from: toISO(d), to: toISO(now) }; },
          year:    () => { const d = new Date(now); d.setFullYear(d.getFullYear()-1); return { from: toISO(d), to: toISO(now) }; },
        };
        const dr = ranges[exportRange]?.();
        if (dr) { fromD = dr.from; toD = dr.to; }
      }

      if (fromD && toD) url += `?from=${fromD}&to=${toD}`;
      const res = await axios.get(url, { headers: headers() });
      const data = res.data;

      if (data.length === 0) { message.warning('No sales data for selected period'); setExportLoading(false); return; }

      // Build Excel
      const rows = [['Product Name', 'Color', 'Size', 'Qty Sold', 'Total Orders', 'Revenue (₹)']];
      data.forEach(row => {
        rows.push([row.product_name, row.color || '—', row.size || '—', row.total_qty, row.total_orders, row.total_revenue]);
      });
      rows.push([]);
      const totalQty = data.reduce((s, r) => s + r.total_qty, 0);
      const totalRev = data.reduce((s, r) => s + r.total_revenue, 0);
      rows.push(['TOTAL', '', '', totalQty, '', totalRev]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{wch:22},{wch:14},{wch:12},{wch:12},{wch:14},{wch:16}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

      const label = fromD && toD ? `${fromD}_to_${toD}` : 'all_time';
      XLSX.writeFile(wb, `sales_report_${label}.xlsx`);
      message.success(`Sales report exported! (${data.length} products)`);
      setShowExportModal(false);
    } catch { message.error('Failed to export'); }
    finally { setExportLoading(false); }
  };

  const openEditProd = (p) => {
    setProdForm({
      name: p.name, price: p.price, category: p.category, stock: p.stock,
      colors:  Array.isArray(p.colors) ? p.colors : [],
      sizes:   Array.isArray(p.sizes)  ? p.sizes  : [],
      image:   p.image   || '',
      barcode: p.barcode || '',
    });
    setEditProdId(p.id);
    setProdErrors({});
    setColorInput('');
    setSizeInput('');
    setShowEditProd(true);
  };

  const createUser = async () => {
    const e = {};
    if (!newUser.username.trim() || newUser.username.length < 3) e.username = 'Min 3 characters';
    if (!newUser.password || newUser.password.length < 6) e.password = 'Min 6 characters';
    setCreateErrors(e);
    if (Object.keys(e).length > 0) return;
    setCreating(true);
    try {
      await axios.post(`${API_URL}/superadmin/users`, newUser, { headers: headers() });
      message.success(`User "${newUser.username}" created!`);
      setShowCreate(false);
      setNewUser({ username: '', password: '', email: '', role: 'admin' });
      setCreateErrors({});
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to create user');
    } finally { setCreating(false); }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`${API_URL}/superadmin/users/${id}`, { headers: headers() });
      message.success('User deleted!');
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const resetPassword = async () => {
    if (!newPwd || newPwd.length < 6) { message.warning('Password must be at least 6 characters'); return; }
    setResetting(true);
    try {
      await axios.put(`${API_URL}/superadmin/users/${resetTarget.id}/reset-password`, { new_password: newPwd }, { headers: headers() });
      message.success(`Password reset for "${resetTarget.username}"!`);
      setShowReset(false); setResetTarget(null); setNewPwd('');
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to reset password');
    } finally { setResetting(false); }
  };

  const statCards = stats ? [
    { label: 'Total Staff',      value: stats.total_users,                                 icon: <UsersRound size={22}/>,   bg: 'rgba(108,99,255,0.12)', color: '#6c63ff' },
    { label: 'Total Invoices',   value: stats.total_invoices,                              icon: <ClipboardList size={22}/>, bg: 'rgba(77,150,255,0.12)',  color: '#4d96ff' },
    { label: 'Total Revenue',    value: `₹${stats.total_revenue.toLocaleString('en-IN')}`, icon: <IndianRupee size={22}/>,   bg: 'rgba(82,201,122,0.12)',  color: '#52c97a' },
    { label: "Today's Revenue",  value: `₹${stats.today_revenue.toLocaleString('en-IN')}`, icon: <TrendingUp size={22}/>,    bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  ] : [];

  const TAB_META = {
    overview:  { color: '#6c63ff', bg: 'rgba(108,99,255,0.12)' },
    users:     { color: '#4d96ff', bg: 'rgba(77,150,255,0.12)'  },
    products:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    sales:     { color: '#52c97a', bg: 'rgba(82,201,122,0.12)'  },
    invoices:  { color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)' },
  };

  const tabBtn = (key, label, icon) => {
    const meta   = TAB_META[key] || { color: '#6c63ff', bg: 'rgba(108,99,255,0.12)' };
    const active = tab === key;
    return (
      <button onClick={() => setTab(key)} style={{
        padding: '8px 16px 8px 10px',
        borderRadius: 12,
        border: `2px solid ${active ? meta.color : 'var(--border)'}`,
        background: active ? meta.bg : '#fff',
        color: active ? meta.color : 'var(--muted)',
        fontWeight: 700, fontSize: 13, cursor: 'pointer',
        fontFamily: 'Raleway, sans-serif',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all .2s',
        boxShadow: active ? `0 4px 14px ${meta.color}30` : 'none',
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: active ? meta.color : 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: active ? '#fff' : 'var(--muted)',
          transition: 'all .2s', flexShrink: 0,
        }}>{icon}</span>
        {label}
      </button>
    );
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(108,99,255,.35)', flexShrink: 0 }}>
          <Crown size={26} color="#fff" strokeWidth={1.8}/>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>Super Admin Panel</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'Raleway, sans-serif' }}>Full system control — manage users, view all records</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0, boxShadow: `0 4px 12px ${c.color}25` }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color, fontFamily: 'Raleway, sans-serif' }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, fontFamily: 'Raleway, sans-serif' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        {tabBtn('overview',  'Overview',     <LayoutDashboard size={16}/>)}
        {tabBtn('users',     'Manage Users', <UsersRound      size={16}/>)}
        {tabBtn('products',  'Products',     <Package         size={16}/>)}
        {tabBtn('sales',     'Sales Report', <BarChart3       size={16}/>)}
        {tabBtn('invoices',  'All Invoices', <ClipboardList   size={16}/>)}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          {/* Users summary */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16, fontFamily: 'Raleway, sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(108,99,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c63ff' }}><UsersRound size={16}/></div>
              Staff Members
            </div>
            {users.filter(u => u.role !== 'superadmin').map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{u.username.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>{u.username}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Joined {new Date(u.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <span style={{ background: 'rgba(77,150,255,0.1)', color: '#4d96ff', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Admin</span>
              </div>
            ))}
            {users.filter(u => u.role !== 'superadmin').length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0', fontSize: 13 }}>No staff members yet</div>
            )}
          </div>

          {/* Recent invoices summary */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16, fontFamily: 'Raleway, sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(77,150,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4d96ff' }}><ClipboardList size={16}/></div>
              Recent Invoices
            </div>
            {invoices.slice(0, 6).map(inv => (
              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', fontFamily: 'monospace' }}>{inv.invoice_number}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{inv.customer_name} · by {inv.created_by_name}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>₹{inv.total_amount?.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>All Users</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{users.length} total accounts</div>
            </div>
            <button onClick={() => setShowCreate(true)} style={{
              padding: '9px 18px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff',
              border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
              fontFamily: 'Raleway, sans-serif', display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 4px 12px rgba(108,99,255,.3)',
            }}>
              <Plus size={16}/> Add User
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['User', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Raleway, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.role === 'superadmin' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{u.username.charAt(0).toUpperCase()}</div>
                        <span style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--muted)', fontSize: 13, fontFamily: 'Raleway, sans-serif' }}>{u.email || '—'}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        background: u.role === 'superadmin' ? 'rgba(245,158,11,0.1)' : 'rgba(77,150,255,0.1)',
                        color: u.role === 'superadmin' ? '#f59e0b' : '#4d96ff',
                        padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      }}>{u.role === 'superadmin' ? '👑 Super Admin' : '👤 Admin'}</span>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--muted)', fontSize: 13, fontFamily: 'Raleway, sans-serif' }}>{new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '14px 20px' }}>
                      {u.role !== 'superadmin' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setResetTarget(u); setShowReset(true); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid rgba(108,99,255,0.3)', background: 'rgba(108,99,255,0.07)', color: '#6c63ff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Raleway, sans-serif' }}>
                            <Key size={13}/> Reset Pwd
                          </button>
                          <Popconfirm title={`Delete "${u.username}"?`} description="This cannot be undone." onConfirm={() => deleteUser(u.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                            <button style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid rgba(255,77,79,0.3)', background: 'rgba(255,77,79,0.07)', color: '#ff4d4f', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Raleway, sans-serif' }}>
                              <Trash2 size={13}/> Delete
                            </button>
                          </Popconfirm>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {tab === 'products' && (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>📦 All Products</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{filteredProd.length} product{filteredProd.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Input
                prefix={<span style={{ color: 'var(--muted)' }}>🔍</span>}
                placeholder="Search by name or category..."
                value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                style={{ width: 240, borderRadius: 10, border: '2px solid var(--border)', height: 40, fontFamily: 'Raleway, sans-serif' }}
                allowClear
              />
              {/* Download template */}
              <button onClick={downloadTemplate} style={{
                padding: '9px 14px', background: '#fff', color: '#52c97a',
                border: '2px solid rgba(82,201,122,.4)', borderRadius: 10, cursor: 'pointer',
                fontWeight: 700, fontSize: 13, fontFamily: 'Raleway, sans-serif',
                display: 'flex', alignItems: 'center', gap: 6,
              }} title="Download Excel Template">
                <Download size={15}/> Template
              </button>
              {/* Excel Upload */}
              <label style={{
                padding: '9px 14px', background: 'rgba(82,201,122,.08)', color: '#52c97a',
                border: '2px solid rgba(82,201,122,.4)', borderRadius: 10, cursor: 'pointer',
                fontWeight: 700, fontSize: 13, fontFamily: 'Raleway, sans-serif',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Upload size={15}/> Import Excel
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: 'none' }} />
              </label>
              <button onClick={() => { setProdForm(EMPTY_PROD); setProdErrors({}); setShowAddProd(true); }} style={{
                padding: '9px 18px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff',
                border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                fontFamily: 'Raleway, sans-serif', display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: '0 4px 12px rgba(108,99,255,.3)',
              }}>
                <Plus size={16}/> Add Product
              </button>
            </div>
          </div>

          {/* Product grid */}
          <div style={{ padding: 24 }}>
            {filteredProd.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14, fontFamily: 'Raleway, sans-serif' }}>No products found</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                {filteredProd.map(p => {
                  const cat = CAT_COLORS[p.category] || CAT_COLORS.General;
                  return (
                    <div key={p.id} style={{ background: 'var(--bg)', borderRadius: 14, border: '1.5px solid var(--border)', position: 'relative', transition: 'box-shadow .2s', overflow: 'hidden' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 18px rgba(108,99,255,.12)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      {/* Top color bar */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#667eea,#764ba2)', zIndex: 1 }} />

                      {/* Product Image */}
                      <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg,rgba(108,99,255,.06),rgba(118,75,162,.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {p.image
                          ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 48, opacity: 0.3 }}>📦</span>
                        }
                      </div>

                      <div style={{ padding: 14 }}>
                        {/* Category + actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ background: cat.bg, color: cat.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'Raleway, sans-serif' }}>{p.category}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEditProd(p)} style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c63ff', transition: 'all .2s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,.1)'; e.currentTarget.style.borderColor = '#6c63ff'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                              <Edit2 size={13}/>
                            </button>
                            <Popconfirm title={`Delete "${p.name}"?`} description="This cannot be undone." onConfirm={() => deleteProduct(p.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                              <button style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f', transition: 'all .2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,77,79,.1)'; e.currentTarget.style.borderColor = '#ff4d4f'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                                <Trash2 size={13}/>
                              </button>
                            </Popconfirm>
                          </div>
                        </div>

                        {/* Name */}
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', fontFamily: 'Raleway, sans-serif', marginBottom: 4 }}>{p.name}</div>

                        {/* Price */}
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#6c63ff', fontFamily: 'Raleway, sans-serif', marginBottom: 10 }}>₹{p.price?.toLocaleString('en-IN')}</div>

                        {/* Colors preview */}
                        {Array.isArray(p.colors) && p.colors.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                            {p.colors.slice(0, 5).map(c => (
                              <div key={c} style={{ display:'flex',alignItems:'center',gap:4,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:20,padding:'2px 7px 2px 4px' }} title={c}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,.12)',flexShrink:0 }}/>
                                <span style={{fontSize:10,fontWeight:700,color:'var(--muted)'}}>{colorName(c)}</span>
                              </div>
                            ))}
                            {p.colors.length > 5 && <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, alignSelf:'center' }}>+{p.colors.length-5}</span>}
                          </div>
                        )}

                        {/* Stock */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 10, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 10, width: `${Math.min((p.stock / 200) * 100, 100)}%`, background: p.stock > 20 ? '#52c97a' : p.stock > 5 ? '#f59e0b' : '#ff4d4f', transition: 'width .3s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: p.stock > 20 ? '#52c97a' : p.stock > 5 ? '#f59e0b' : '#ff4d4f', fontFamily: 'Raleway, sans-serif', flexShrink: 0 }}>{p.stock} units</span>
                        </div>
                        {/* Barcode badge */}
                        {p.barcode && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '3px 8px', background: 'rgba(77,150,255,.08)', borderRadius: 7, border: '1px solid rgba(77,150,255,.2)', width: 'fit-content' }}>
                            <Barcode size={11} style={{ color: '#4d96ff', flexShrink: 0 }}/>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#4d96ff', letterSpacing: '.5px' }}>{p.barcode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SALES REPORT TAB ── */}
      {tab === 'sales' && (
        <div>
          {/* Header + controls */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 24px', marginBottom: 20, border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', fontFamily: 'Raleway, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="#6c63ff"/> Product Variant Sales
              </div>
              {salesData.length > 0 && (
                <button onClick={() => { setExportRange('all'); setExportFrom(''); setExportTo(''); setShowExportModal(true); }} style={{
                  padding: '8px 16px', background: 'linear-gradient(135deg,#52c97a,#4d96ff)',
                  color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, fontFamily: 'Raleway, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 7,
                  boxShadow: '0 4px 12px rgba(82,201,122,.3)',
                }}>
                  <Download size={15}/> Export Excel
                </button>
              )}
            </div>

            {/* Quick range buttons removed — use Export Excel modal for filtering */}
          </div>
          {salesData.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              No sales data yet — create some bills first
            </div>
          ) : (
            (() => {
              // Group by product name
              const grouped = {};
              salesData.forEach(row => {
                if (!grouped[row.product_name]) grouped[row.product_name] = [];
                grouped[row.product_name].push(row);
              });
              return Object.entries(grouped).map(([productName, variants]) => {
                const totalQty = variants.reduce((s, v) => s + v.total_qty, 0);
                const totalRev = variants.reduce((s, v) => s + v.total_revenue, 0);
                return (
                  <div key={productName} style={{ background: '#fff', borderRadius: 16, marginBottom: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>
                    {/* Product header */}
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(108,99,255,.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>📦 {productName}</div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#6c63ff' }}>{totalQty}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Total Sold</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#52c97a' }}>₹{totalRev.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Revenue</div>
                        </div>
                      </div>
                    </div>
                    {/* Variants */}
                    <div style={{ padding: '12px 24px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                        {variants.map((v, i) => (
                          <div key={i} style={{ background: 'var(--bg)', borderRadius: 12, padding: '12px 16px', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                            {/* Color swatch */}
                            {v.color && (
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: v.color, border: '2px solid rgba(0,0,0,.1)', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,.12)' }}/>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                                {v.color && <span style={{ background: 'rgba(108,99,255,.08)', color: '#6c63ff', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.color}</span>}
                                {v.size  && <span style={{ background: 'rgba(77,150,255,.08)',  color: '#4d96ff', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.size}</span>}
                                {!v.color && !v.size && <span style={{ color: 'var(--muted)', fontSize: 12 }}>No variant</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 12 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{v.total_qty} sold</span>
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{v.total_orders} orders</span>
                              </div>
                            </div>
                            {/* Bar indicator */}
                            <div style={{ width: 36, textAlign: 'right' }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#52c97a' }}>₹{Math.round(v.total_revenue/1000)}k</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      )}

      {/* ── ALL INVOICES TAB ── */}
      {tab === 'invoices' && (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>All Invoices — All Users</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{filteredInv.length} invoices</div>
            </div>
            <Input
              prefix={<span style={{ color: 'var(--muted)' }}>🔍</span>}
              placeholder="Search invoice, customer, user..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 280, borderRadius: 10, border: '2px solid var(--border)', height: 40, fontFamily: 'Raleway, sans-serif' }}
              allowClear
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['Invoice #', 'Customer', 'Amount', 'Payment', 'Created By', 'Date'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Raleway, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInv.map(inv => {
                  const pc = PAY_COLORS[inv.payment_method] || { color: '#9ca3af', bg: '#f3f4f6' };
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 13 }}>{inv.invoice_number}</td>
                      <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>{inv.customer_name}</td>
                      <td style={{ padding: '12px 20px', fontWeight: 800, fontSize: 15, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>₹{inv.total_amount?.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 20px' }}><span style={{ background: pc.bg, color: pc.color, padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{inv.payment_method}</span></td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ background: 'rgba(108,99,255,0.08)', color: '#6c63ff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'Raleway, sans-serif' }}>👤 {inv.created_by_name}</span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)', fontFamily: 'Raleway, sans-serif' }}>{new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</td>
                    </tr>
                  );
                })}
                {filteredInv.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontFamily: 'Raleway, sans-serif' }}>No invoices found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Raleway, sans-serif' }}>➕ Create New User</span>}
        open={showCreate}
        onCancel={() => { setShowCreate(false); setCreateErrors({}); setNewUser({ username: '', password: '', email: '', role: 'admin' }); }}
        onOk={createUser}
        confirmLoading={creating}
        okText="Create User"
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', fontWeight: 700 } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: createErrors.username ? '#ef4444' : 'var(--text)', marginBottom: 6, fontFamily: 'Raleway, sans-serif' }}>
              Username * {createErrors.username && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500, marginLeft: 8 }}>{createErrors.username}</span>}
            </label>
            <Input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="e.g. staff1" size="large" status={createErrors.username ? 'error' : ''} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: createErrors.password ? '#ef4444' : 'var(--text)', marginBottom: 6, fontFamily: 'Raleway, sans-serif' }}>
              Password * {createErrors.password && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500, marginLeft: 8 }}>{createErrors.password}</span>}
            </label>
            <Input.Password value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min 6 characters" size="large" status={createErrors.password ? 'error' : ''} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: 'Raleway, sans-serif' }}>Email (optional)</label>
            <Input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="staff@email.com" size="large" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: 'Raleway, sans-serif' }}>Role</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['admin', 'superadmin'].map(r => (
                <button key={r} onClick={() => setNewUser({ ...newUser, role: r })} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '2px solid', borderColor: newUser.role === r ? '#6c63ff' : 'var(--border)', background: newUser.role === r ? 'rgba(108,99,255,0.1)' : '#fff', color: newUser.role === r ? '#6c63ff' : 'var(--muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Raleway, sans-serif' }}>
                  {r === 'superadmin' ? '👑 Super Admin' : '👤 Admin'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Raleway, sans-serif' }}>🔑 Reset Password — {resetTarget?.username}</span>}
        open={showReset}
        onCancel={() => { setShowReset(false); setResetTarget(null); setNewPwd(''); }}
        onOk={resetPassword}
        confirmLoading={resetting}
        okText="Reset Password"
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', fontWeight: 700 } }}
      >
        <div style={{ paddingTop: 12 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: 'Raleway, sans-serif' }}>New Password (min 6 characters)</label>
          <Input.Password value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Enter new password" size="large" />
        </div>
      </Modal>

      {/* ── Export Sales Excel Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#52c97a,#4d96ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={16} color="#fff"/>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Raleway, sans-serif' }}>Export Sales Report</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>Select date range then download Excel</div>
            </div>
          </div>
        }
        open={showExportModal}
        onCancel={() => setShowExportModal(false)}
        onOk={exportSalesExcel}
        confirmLoading={exportLoading}
        okText={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14}/> Download Excel</span>}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#52c97a,#4d96ff)', border: 'none', fontWeight: 700 } }}
        width={480}
      >
        <div style={{ paddingTop: 12 }}>
          {/* Quick ranges */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Raleway, sans-serif' }}>Quick Select</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'today',    label: 'Today' },
                { key: 'week',     label: 'Last 7 Days' },
                { key: 'month',    label: 'Last 30 Days' },
                { key: '3months',  label: '3 Months' },
                { key: '6months',  label: '6 Months' },
                { key: 'year',     label: '1 Year' },
                { key: 'all',      label: 'All Time' },
              ].map(btn => (
                <button key={btn.key} onClick={() => { setExportRange(btn.key); setExportFrom(''); setExportTo(''); }} style={{
                  padding: '6px 14px', borderRadius: 20, border: '2px solid',
                  borderColor: exportRange === btn.key ? '#52c97a' : 'var(--border)',
                  background: exportRange === btn.key ? 'rgba(82,201,122,.12)' : '#fff',
                  color: exportRange === btn.key ? '#52c97a' : 'var(--muted)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'Raleway, sans-serif', transition: 'all .2s',
                }}>{btn.label}</button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>OR CUSTOM RANGE</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
          </div>

          {/* Custom date inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, fontFamily: 'Raleway, sans-serif', textTransform: 'uppercase', letterSpacing: '.4px' }}>From Date</label>
              <input type="date" value={exportFrom}
                onChange={e => { setExportFrom(e.target.value); setExportRange('custom'); }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid var(--border)', fontSize: 13, fontFamily: 'Raleway, sans-serif', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#52c97a'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, fontFamily: 'Raleway, sans-serif', textTransform: 'uppercase', letterSpacing: '.4px' }}>To Date</label>
              <input type="date" value={exportTo}
                onChange={e => { setExportTo(e.target.value); setExportRange('custom'); }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid var(--border)', fontSize: 13, fontFamily: 'Raleway, sans-serif', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#52c97a'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Selected range summary */}
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(82,201,122,.08)', borderRadius: 10, border: '1px solid rgba(82,201,122,.25)', fontSize: 13, color: '#52c97a', fontWeight: 600, fontFamily: 'Raleway, sans-serif' }}>
            📊 Will export: <strong>
              {exportRange === 'all'     ? 'All Time data' :
               exportRange === 'today'   ? 'Today\'s data' :
               exportRange === 'week'    ? 'Last 7 days' :
               exportRange === 'month'   ? 'Last 30 days' :
               exportRange === '3months' ? 'Last 3 months' :
               exportRange === '6months' ? 'Last 6 months' :
               exportRange === 'year'    ? 'Last 1 year' :
               (exportFrom && exportTo)  ? `${exportFrom} to ${exportTo}` : 'Select a range'}
            </strong>
          </div>
        </div>
      </Modal>

      {/* ── Excel Import Preview Modal ── */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Raleway, sans-serif' }}>📊 Import Products from Excel</span>}
        open={showImport}
        onCancel={() => { setShowImport(false); setImportData([]); }}
        onOk={bulkImport}
        confirmLoading={importing}
        okText={`Import ${importData.filter(r => r._valid).length} Products`}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#52c97a,#4d96ff)', border: 'none', fontWeight: 700 }, disabled: importData.filter(r => r._valid).length === 0 }}
        width={720}
      >
        <div style={{ paddingTop: 8 }}>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(82,201,122,.1)', border: '1.5px solid rgba(82,201,122,.3)', borderRadius: 10, padding: '8px 16px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#52c97a' }}>{importData.filter(r => r._valid).length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>✅ Valid Rows</div>
            </div>
            <div style={{ background: 'rgba(255,77,79,.08)', border: '1.5px solid rgba(255,77,79,.3)', borderRadius: 10, padding: '8px 16px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#ff4d4f' }}>{importData.filter(r => !r._valid).length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>❌ Errors</div>
            </div>
            <div style={{ background: 'rgba(108,99,255,.08)', border: '1.5px solid rgba(108,99,255,.3)', borderRadius: 10, padding: '8px 16px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#6c63ff' }}>{importData.length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>📋 Total Rows</div>
            </div>
          </div>

          {/* Preview table */}
          <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', position: 'sticky', top: 0 }}>
                  {['Row', 'Name', 'Price', 'Category', 'Stock', 'Colors', 'Sizes', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'Raleway, sans-serif', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: row._valid ? '#fff' : 'rgba(255,77,79,.03)' }}>
                    <td style={{ padding: '7px 10px', color: 'var(--muted)', fontSize: 12 }}>#{row._row}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>{row.name || <span style={{ color: '#ff4d4f' }}>—</span>}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 700, color: '#6c63ff' }}>{row.price ? `₹${row.price}` : <span style={{ color: '#ff4d4f' }}>—</span>}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--muted)' }}>{row.category}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--muted)' }}>{row.stock}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {row.colors.slice(0, 4).map((c, ci) => (
                          <div key={ci} style={{ width: 14, height: 14, borderRadius: 3, background: c, border: '1px solid rgba(0,0,0,.12)' }} title={c}/>
                        ))}
                        {row.colors.length > 4 && <span style={{ fontSize: 10, color: 'var(--muted)' }}>+{row.colors.length - 4}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '7px 10px', color: 'var(--muted)', fontSize: 12 }}>{row.sizes.join(', ') || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>
                      {row._valid
                        ? <span style={{ color: '#52c97a', fontWeight: 700, fontSize: 12 }}>✅ OK</span>
                        : <span style={{ color: '#ff4d4f', fontWeight: 700, fontSize: 11 }}>❌ {row._errors.join(', ')}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importErrors.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,77,79,.06)', borderRadius: 8, fontSize: 12, color: '#ff4d4f', fontFamily: 'Raleway, sans-serif' }}>
              ⚠️ {importErrors.length} row{importErrors.length > 1 ? 's' : ''} with errors will be skipped. Only valid rows will be imported.
            </div>
          )}
        </div>
      </Modal>

      {/* ── Add Product Modal ── */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Raleway, sans-serif' }}>➕ Add New Product</span>}
        open={showAddProd}
        onCancel={() => { setShowAddProd(false); setProdErrors({}); setProdForm(EMPTY_PROD); setColorInput(''); setSizeInput(''); }}
        onOk={addProduct}
        confirmLoading={savingProd}
        okText="Add Product"
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', fontWeight: 700 } }}
      >
        <ProdFormFields data={prodForm} onChange={setProdForm} errs={prodErrors}
          colorInput={colorInput} setColorInput={setColorInput}
          sizeInput={sizeInput}  setSizeInput={setSizeInput} />
      </Modal>

      {/* ── Edit Product Modal ── */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Raleway, sans-serif' }}>✏️ Edit Product</span>}
        open={showEditProd}
        onCancel={() => { setShowEditProd(false); setProdErrors({}); setProdForm(EMPTY_PROD); setEditProdId(null); setColorInput(''); setSizeInput(''); }}
        onOk={saveEditProduct}
        confirmLoading={savingProd}
        okText="Save Changes"
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', fontWeight: 700 } }}
      >
        <ProdFormFields data={prodForm} onChange={setProdForm} errs={prodErrors}
          colorInput={colorInput} setColorInput={setColorInput}
          sizeInput={sizeInput}  setSizeInput={setSizeInput} />
      </Modal>
    </div>
  );
}

// ── Field label wrapper — defined OUTSIDE to prevent re-mount on every render ──
function FL({ label, err, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: err ? '#ef4444' : 'var(--text)', marginBottom: 6, fontFamily: 'Raleway, sans-serif' }}>
        {label}{err && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500, marginLeft: 8 }}>{err}</span>}
      </label>
      {children}
    </div>
  );
}

// ── Product Form Fields component ──
function ProdFormFields({ data, onChange, errs, colorInput, setColorInput, sizeInput, setSizeInput }) {
  // colorInput & sizeInput live in parent to prevent focus loss on re-render

  const categories = ['Electronics', 'Accessories', 'Audio', 'General', 'Clothing', 'Footwear', 'Other'];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      message.error('Image too large. Max size is 2MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ ...data, image: ev.target.result });
    reader.readAsDataURL(file);
  };

  const addColor = () => {
    const v = colorInput.trim();
    if (!v) return;
    if ((data.colors || []).includes(v)) { setColorInput(''); return; }
    onChange({ ...data, colors: [...(data.colors || []), v] });
    setColorInput('');
  };

  const removeColor = (c) => onChange({ ...data, colors: (data.colors || []).filter(x => x !== c) });

  const addSize = () => {
    const v = sizeInput.trim().toUpperCase();
    if (!v) return;
    if ((data.sizes || []).includes(v)) { setSizeInput(''); return; }
    onChange({ ...data, sizes: [...(data.sizes || []), v] });
    setSizeInput('');
  };

  const removeSize = (s) => onChange({ ...data, sizes: (data.sizes || []).filter(x => x !== s) });

  const presetColors = ['#ff4d4f','#ff7a45','#ffd93d','#52c97a','#4d96ff','#6c63ff','#000000','#ffffff','#8b4513','#ff69b4'];
  const presetSizes  = ['XS','S','M','L','XL','XXL','Free Size'];

  return (
    <div style={{ paddingTop: 12 }}>

      {/* ── Photo Upload ── */}
      <FL label="Product Photo">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Preview */}
          <div style={{
            width: 90, height: 90, borderRadius: 12, border: '2px dashed var(--border)',
            background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0, position: 'relative',
          }}>
            {data.image ? (
              <>
                <img src={data.image} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => onChange({ ...data, image: '' })}
                  style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1 }}>✕</button>
              </>
            ) : (
              <span style={{ fontSize: 28 }}>📷</span>
            )}
          </div>
          {/* Upload button */}
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block', padding: '10px 16px', borderRadius: 10, border: '2px dashed rgba(108,99,255,.4)',
              background: 'rgba(108,99,255,.04)', cursor: 'pointer', textAlign: 'center',
              color: '#6c63ff', fontWeight: 700, fontSize: 13, fontFamily: 'Raleway, sans-serif',
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,.1)'; e.currentTarget.style.borderColor = '#6c63ff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,.04)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,.4)'; }}
            >
              📂 Click to Upload Photo
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 0', fontFamily: 'Raleway, sans-serif' }}>
              JPG, PNG, WebP — Max 2MB
            </p>
          </div>
        </div>
      </FL>
      <FL label="Product Name *" err={errs.name}>
        <Input value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="e.g. Casual T-Shirt" size="large" status={errs.name ? 'error' : ''} />
      </FL>

      <FL label="Price (₹) *" err={errs.price}>
        <InputNumber
          value={data.price} onChange={v => onChange({ ...data, price: v || '' })}
          min={0} style={{ width: '100%' }} size="large"
          status={errs.price ? 'error' : ''}
          formatter={v => v ? `₹ ${v}` : ''} parser={v => v.replace(/₹\s?/, '')}
          placeholder="e.g. 1500"
        />
      </FL>

      <FL label="Category *" err={errs.category}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map(c => {
            const cc = CAT_COLORS[c] || CAT_COLORS.General;
            return (
              <button key={c} onClick={() => onChange({ ...data, category: c })} style={{
                padding: '5px 12px', borderRadius: 20, border: '2px solid',
                borderColor: data.category === c ? cc.color : 'var(--border)',
                background: data.category === c ? cc.bg : '#fff',
                color: data.category === c ? cc.color : 'var(--muted)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Raleway, sans-serif',
              }}>{c}</button>
            );
          })}
        </div>
      </FL>

      <FL label="Stock Quantity">
        <InputNumber value={data.stock} onChange={v => onChange({ ...data, stock: v || 0 })} min={0} style={{ width: '100%' }} size="large" placeholder="e.g. 100" />
      </FL>

      {/* ── Colors ── */}
      <FL label="Available Colors">
        {/* Preset swatches */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {presetColors.map(c => (
            <div key={c} onClick={() => { if (!(data.colors||[]).includes(c)) onChange({ ...data, colors: [...(data.colors||[]), c] }); }}
              style={{ width: 28, height: 28, borderRadius: 8, background: c, border: (data.colors||[]).includes(c) ? '3px solid #6c63ff' : '2px solid rgba(0,0,0,.15)', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,.15)', transition: 'transform .15s', flexShrink: 0 }}
              title={c}
            />
          ))}
        </div>
        {/* Custom color input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input type="color" value={colorInput || '#6c63ff'} onChange={e => setColorInput(e.target.value)}
            style={{ width: 44, height: 36, borderRadius: 8, border: '1.5px solid var(--border)', cursor: 'pointer', padding: 2 }}/>
          <Input value={colorInput} onChange={e => setColorInput(e.target.value)} placeholder="Color name or #hex" size="middle"
            onPressEnter={addColor} style={{ flex: 1 }}/>
          <button onClick={addColor} style={{ padding: '0 14px', borderRadius: 8, background: '#6c63ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Add</button>
        </div>
        {/* Added colors */}
        {(data.colors || []).length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(data.colors || []).map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '3px 10px 3px 6px' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,.12)', flexShrink: 0 }}/>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{colorName(c)}</span>
                <X size={12} style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => removeColor(c)}/>
              </div>
            ))}
          </div>
        )}
      </FL>

      {/* ── Sizes ── */}
      <FL label="Available Sizes">
        {/* Preset sizes */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {presetSizes.map(s => (
            <button key={s} onClick={() => { if (!(data.sizes||[]).includes(s)) onChange({ ...data, sizes: [...(data.sizes||[]), s] }); }}
              style={{ padding: '4px 12px', borderRadius: 20, border: '2px solid', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'Raleway, sans-serif', transition: 'all .15s',
                borderColor: (data.sizes||[]).includes(s) ? '#4d96ff' : 'var(--border)',
                background:  (data.sizes||[]).includes(s) ? 'rgba(77,150,255,.1)' : '#fff',
                color:       (data.sizes||[]).includes(s) ? '#4d96ff' : 'var(--muted)',
              }}>{s}</button>
          ))}
        </div>
        {/* Custom size input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Input value={sizeInput} onChange={e => setSizeInput(e.target.value)} placeholder="Custom size e.g. 42, 7.5" size="middle"
            onPressEnter={addSize} style={{ flex: 1 }}/>
          <button onClick={addSize} style={{ padding: '0 14px', borderRadius: 8, background: '#4d96ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Add</button>
        </div>
        {/* Added sizes */}
        {(data.sizes || []).length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(data.sizes || []).map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(77,150,255,.08)', border: '1.5px solid rgba(77,150,255,.3)', borderRadius: 20, padding: '3px 10px 3px 10px', color: '#4d96ff' }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{s}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeSize(s)}/>
              </div>
            ))}
          </div>
        )}
      </FL>

      {/* ── Barcode ── */}
      <FL label="Barcode" err={errs.barcode}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4d96ff', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <Barcode size={15}/>
            </span>
            <input
              type="text"
              value={data.barcode || ''}
              onChange={e => onChange({ ...data, barcode: e.target.value })}
              placeholder="Scan with scanner or type barcode..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px 9px 34px',
                borderRadius: 8,
                border: `2px solid ${errs.barcode ? '#ef4444' : 'var(--border)'}`,
                outline: 'none',
                fontSize: 14,
                fontFamily: 'monospace',
                fontWeight: 600,
                letterSpacing: '1px',
                color: 'var(--text)',
                background: '#fff',
                transition: 'border-color .2s',
              }}
              onFocus={e => { if (!errs.barcode) e.target.style.borderColor = '#4d96ff'; }}
              onBlur={e  => { if (!errs.barcode) e.target.style.borderColor = 'var(--border)'; }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
              const L1 = letters[Math.floor(Math.random() * 26)];
              const L2 = letters[Math.floor(Math.random() * 26)];
              const nums = String(Math.floor(1000 + Math.random() * 9000));
              onChange({ ...data, barcode: `${L1}${L2}-${nums}` });
            }}
            style={{
              padding: '0 16px', height: 40, borderRadius: 8,
              border: '2px solid #6c63ff',
              background: 'rgba(108,99,255,.08)',
              color: '#6c63ff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#6c63ff'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,.08)'; e.currentTarget.style.color = '#6c63ff'; }}
            title="Auto-generate a unique barcode"
          >
            <Barcode size={13}/> Generate
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Raleway, sans-serif', lineHeight: 1.5 }}>
          Leave blank if no barcode. Must be unique per product. Physical scanner se bhi scan kar sakte ho.
        </div>
      </FL>
    </div>
  );
}

export default SuperAdmin;
