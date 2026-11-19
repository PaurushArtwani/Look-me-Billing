import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Spin, Table, Empty } from 'antd';
import { Clock, LogIn, PlusCircle, FileCheck, Download } from 'lucide-react';
import ButterflyLogo from '../components/ButterflyLogo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const actionConfig = {
  LOGIN:          { color: '#6c63ff', bg: 'rgba(108,99,255,0.1)', icon: <LogIn    size={15}/>, label: 'Login'           },
  ADD_PRODUCT:    { color: '#52c97a', bg: 'rgba(82,201,122,0.1)', icon: <PlusCircle size={15}/>, label: 'Product Added'   },
  CREATE_INVOICE: { color: '#4d96ff', bg: 'rgba(77,150,255,0.1)', icon: <FileCheck size={15}/>, label: 'Invoice Created' },
  DOWNLOAD_PDF:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <Download size={15}/>,  label: 'PDF Downloaded'  },
};

function StatCard({ icon, value, label, color, gradient, barColor }) {
  return (
    <div
      className="stat-card"
      style={{ '--bar': barColor || color }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 32px ${color}22`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow)';
      }}
    >
      <div className="icon-badge" style={{ background: gradient, boxShadow: `0 8px 20px ${color}40` }}>
        {icon}
      </div>
      <div className="stat-card-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ── Weekly Revenue Chart ─────────────────────────────────────
function WeeklyChart({ invoices }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const rev = invoices
      .filter(inv => inv.created_at?.slice(0, 10) === key)
      .reduce((s, inv) => s + (inv.total_amount || 0), 0);
    days.push({ label, rev, key });
  }
  const maxRev = Math.max(...days.map(d => d.rev), 1);
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)', marginTop: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4, fontFamily: 'Raleway,sans-serif' }}>📊 Weekly Revenue</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>Last 7 days</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
        {days.map((d, i) => {
          const h = Math.max((d.rev / maxRev) * 100, d.rev > 0 ? 8 : 2);
          const isToday = i === 6;
          return (
            <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>
                {d.rev > 0 ? '₹' + Math.round(d.rev / 1000) + 'k' : ''}
              </div>
              <div style={{
                width: '100%', height: h + '%', minHeight: 4,
                borderRadius: '6px 6px 0 0',
                background: isToday
                  ? 'linear-gradient(180deg,#6c63ff,#4d96ff)'
                  : 'linear-gradient(180deg,rgba(108,99,255,.5),rgba(77,150,255,.5))',
                transition: 'height .4s ease',
                position: 'relative',
              }}>
                {isToday && <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: '#6c63ff' }} />}
              </div>
              <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? '#6c63ff' : 'var(--muted)' }}>{d.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Total this week</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#6c63ff' }}>₹{days.reduce((s, d) => s + d.rev, 0).toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, logsRes, invoicesRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`, { headers }),
        axios.get(`${API_URL}/activity-logs`, { headers }),
        axios.get(`${API_URL}/invoices`, { headers }),
      ]);
      setStats(statsRes.data);
      setActivityLogs(logsRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      render: (action) => {
        const cfg = actionConfig[action] || { color: '#9ca3af', bg: '#f3f4f6', icon: <Clock size={15}/>, label: action };
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: cfg.bg, color: cfg.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>
              {cfg.icon}
            </div>
            <span style={{ background: cfg.bg, color: cfg.color, fontWeight: 700, borderRadius: 6, fontFamily: 'Raleway, sans-serif', padding: '2px 10px', fontSize: 12 }}>
              {cfg.label}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (text) => <span style={{ color: '#6b7280', fontSize: 14, fontFamily: 'Raleway, sans-serif' }}>{text}</span>,
    },
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13, fontFamily: 'Raleway, sans-serif' }}>
          <Clock size={14}/>
          {new Date(text).toLocaleString()}
        </div>
      ),
    },
  ];

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
      <Spin size="large" />
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const unpaidCount = stats?.unpaid_invoices || 0;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', minWidth: 0 }}>

      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2 className="welcome-title">{greeting}! 🌟</h2>
          <p className="welcome-sub">Here's what's happening with your shop today.</p>
        </div>
        <div className="welcome-logo">
          <ButterflyLogo size={80} />
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <StatCard
          icon={
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="2" width="15" height="20" rx="2.5" fill="white" fillOpacity=".95"/>
              <rect x="7" y="6" width="8" height="1.5" rx=".75" fill="#667eea"/>
              <rect x="7" y="9" width="11" height="1.5" rx=".75" fill="#667eea" fillOpacity=".6"/>
              <rect x="7" y="12" width="7" height="1.5" rx=".75" fill="#667eea" fillOpacity=".6"/>
              <rect x="7" y="15" width="9" height="1.5" rx=".75" fill="#667eea" fillOpacity=".4"/>
              <circle cx="21" cy="21" r="5" fill="#ffd93d"/>
              <text x="21" y="24.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1a1a2e" fontFamily="Arial">+</text>
            </svg>
          }
          value={stats?.today_invoices || 0}
          label="Invoices Today"
          color="#6c63ff"
          gradient="linear-gradient(135deg,#667eea,#764ba2)"
          barColor="#6c63ff"
        />
        <StatCard
          icon={
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="12" fill="white" fillOpacity=".2"/>
              <circle cx="14" cy="14" r="8" fill="white" fillOpacity=".3"/>
              <text x="14" y="18" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white" fontFamily="Arial">₹</text>
              <circle cx="14" cy="6" r="2" fill="#ffd93d"/>
              <circle cx="6" cy="19" r="1.5" fill="#ffd93d" opacity=".7"/>
              <circle cx="22" cy="19" r="1.5" fill="#ffd93d" opacity=".7"/>
            </svg>
          }
          value={`₹${(stats?.today_revenue || 0).toLocaleString('en-IN')}`}
          label="Revenue Today"
          color="#52c97a"
          gradient="linear-gradient(135deg,#56ab2f,#a8e063)"
          barColor="#52c97a"
        />
        <StatCard
          icon={
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="8" width="22" height="14" rx="3" fill="white" fillOpacity=".9"/>
              <rect x="3" y="11" width="22" height="3" fill="white" fillOpacity=".4"/>
              <rect x="5" y="16" width="5" height="2" rx="1" fill="#4d96ff" fillOpacity=".7"/>
              <rect x="12" y="16" width="8" height="2" rx="1" fill="#4d96ff" fillOpacity=".4"/>
              <circle cx="21" cy="10" r="4" fill="#ffd93d"/>
              <text x="21" y="12.5" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#1a1a2e" fontFamily="Arial">★</text>
            </svg>
          }
          value={stats?.total_products || 0}
          label="Total Products"
          color="#4d96ff"
          gradient="linear-gradient(135deg,#4d96ff,#1e90ff)"
          barColor="#4d96ff"
        />
        <StatCard
          icon={
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="12" fill="white" fillOpacity=".25"/>
              <line x1="9" y1="9" x2="19" y2="19" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="19" y1="9" x2="9" y2="19" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="14" cy="14" r="6" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity=".4"/>
            </svg>
          }
          value={unpaidCount}
          label="Unpaid Today"
          color="#ef4444"
          gradient="linear-gradient(135deg,#ff6b6b,#ef4444)"
          barColor="#ef4444"
        />
      </div>

      {/* Unpaid alert banner */}
      {unpaidCount > 0 && (
        <div style={{
          background: 'rgba(239,68,68,.08)',
          border: '1.5px solid rgba(239,68,68,.3)',
          borderRadius: 12,
          padding: '12px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'Raleway, sans-serif',
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>
            You have {unpaidCount} unpaid invoice{unpaidCount > 1 ? 's' : ''} today. Please collect payment.
          </span>
        </div>
      )}

      {/* Weekly Revenue Chart */}
      <WeeklyChart invoices={invoices} />

      {/* Activity Log */}
      <div className="activity-card" style={{ marginTop: 20 }}>
        <div className="activity-header">
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'Raleway, sans-serif' }}>
              Recent Activity
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              Latest actions in your billing system
            </p>
          </div>
          <div className="activity-count">{activityLogs.length} entries</div>
        </div>

        {activityLogs.length > 0 ? (
          <div style={{ overflowX: 'auto', width: '100%' }}>
          <Table
            columns={columns}
            dataSource={activityLogs.map((log, i) => ({ ...log, key: i }))}
            pagination={{ pageSize: 8, size: 'small' }}
            size="middle"
            style={{ padding: '0 8px' }}
            scroll={{ x: 500 }}
          />
          </div>
        ) : (
          <Empty
            description={<span style={{ color: 'var(--muted)', fontFamily: 'Raleway, sans-serif' }}>No activity recorded yet</span>}
            style={{ padding: '60px 24px' }}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
