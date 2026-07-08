import React, { useState, useEffect } from 'react';

function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  
  // Login Form State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard Functional State
  const [view, setView] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({ total_income: 0, total_expense: 0, category_breakdown: {} });
  const [friends, setFriends] = useState([]);
  
  // Input Forms State
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [type, setType] = useState('expense');
  const [billDescription, setBillDescription] = useState('');
  const [billTotal, setBillTotal] = useState('');
  const [paidBy, setPaidBy] = useState('You');
  const [friendName, setFriendName] = useState('');

  const API_BASE = 'https://daily-expense-analysis.onrender.com/api';

  const refreshData = async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const txRes = await fetch(`${API_BASE}/transactions`, { headers });
      if (txRes.status === 401) return handleLogout();
      setTransactions(await txRes.json());

      const analyticsRes = await fetch(`${API_BASE}/analytics/summary`, { headers });
      setAnalytics(await analyticsRes.json());

      const friendsRes = await fetch(`${API_BASE}/friends`, { headers });
      setFriends(await friendsRes.json());
    } catch (err) {
      console.error('Error synchronizing backend metrics:', err);
    }
  };

  useEffect(() => {
    if (token) refreshData();
  }, [token]);

  const netBalance = analytics.total_income - analytics.total_expense;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!loginUser || !loginPass) return setAuthError('Provide full secure access tokens.');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser.trim(), password: loginPass })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication handshake rejected.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      
      setToken(data.token);
      setUsername(data.username);
      setRole(data.role);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setUsername('');
    setRole('');
    setView('home');
    setLoginUser('');
    setLoginPass('');
    setAuthError('');
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!text || !amount) return alert('Please enter transaction details');

    const payload = {
      text,
      amount: parseFloat(amount),
      category: type === 'income' ? 'Income' : category,
      type
    };

    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setText('');
      setAmount('');
      refreshData();
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendName.trim()) return;

    const res = await fetch(`${API_BASE}/friends`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: friendName.trim() })
    });
    if (res.ok) {
      setFriendName('');
      refreshData();
    } else {
      alert("Name already added to the split circle.");
    }
  };

  const handleDeleteFriend = async (id) => {
    const res = await fetch(`${API_BASE}/friends/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setPaidBy('You');
      refreshData();
    }
  };

  const handleSplitBillSubmit = async (e) => {
    e.preventDefault();
    if (!billDescription || !billTotal || friends.length === 0) {
      return alert('Ensure bill info is ready and friends are added.');
    }

    const totalAmount = parseFloat(billTotal);
    const splitCount = friends.length + 1;
    const splitShare = totalAmount / splitCount;

    const finalDescription = `[Split] ${billDescription} (Total: ₹${totalAmount.toFixed(2)}, paid by ${paidBy})`;
    const loggedAmount = paidBy === 'You' ? totalAmount : splitShare;

    const payload = {
      text: finalDescription,
      amount: loggedAmount,
      category: 'Other',
      type: 'expense'
    };

    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setBillDescription('');
      setBillTotal('');
      refreshData();
      alert(`Bill split successfully! Everyone owes ₹${splitShare.toFixed(2)}.`);
      setView('home'); 
    }
  };

  const handleClearFriends = async () => {
    if (window.confirm("Clear all members from the active circle?")) {
      await fetch(`${API_BASE}/friends`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPaidBy('You');
      refreshData();
    }
  };

  const handleResetAllTransactions = async () => {
    if (window.confirm("CRITICAL MASTER WARNING: Permanently delete ALL global metrics from database?")) {
      const res = await fetch(`${API_BASE}/transactions`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        refreshData();
        alert("System database core wiped clean.");
      }
    }
  };

  const handleDropItem = async (id) => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) refreshData();
  };

  return (
    <div className="app-layout">
      {/* 1. AUTHENTICATION SHIELD OVERLAY STATE */}
      {!token ? (
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '400px', border: '1px solid #242238', boxShadow: '0 15px 35px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, background: 'linear-gradient(135deg, #00f0ff, #9d4edd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Secure Core Login
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#8a88a3' }}>Multi-User Expense Framework Suite</p>
            </div>

            {authError && (
              <div style={{ padding: '0.75rem', background: 'rgba(255,0,60,0.1)', border: '1px solid #ff003c', borderRadius: '8px', color: '#ff003c', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.25rem', textAlign: 'center' }}>
                🛑 {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="form-stack">
              <div className="input-field">
                <label>System Unique ID / Username</label>
                <input type="text" placeholder="Enter Unique ID" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} required />
              </div>
              <div className="input-field">
                <label>Security Password</label>
                <input type="password" placeholder="••••••••" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Authenticate Node</button>
            </form>
          </div>
        </div>
      ) : (
        /* 2. LIVE APPLICATION WORKSPACE STATE */
        <>
          <header className="app-header">
            <div className="header-title-block">
              <h1>Financial Analytics Workspace</h1>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>Enterprise Strategy Suite &bull; Active Internship Project</span>
                <span style={{ fontSize: '0.7rem', background: role === 'admin' ? '#ff003c' : '#00f0ff', color: '#000000', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, textTransform: 'uppercase' }}>
                  {role} node: {username}
                </span>
              </p>
            </div>
            <nav className="header-navigation">
              <button onClick={() => setView('home')} className={`nav-btn ${view === 'home' ? 'active' : ''}`}>
                Dashboard Home
              </button>
              <button onClick={() => setView('split')} className={`nav-btn ${view === 'split' ? 'active' : ''}`}>
                Group Bill Splitter
              </button>
              <button onClick={handleLogout} className="nav-btn" style={{ border: '1px solid rgba(255,0,60,0.3)', color: '#ff003c' }}>
                Terminal Exit
              </button>
            </nav>
          </header>

          {view === 'home' ? (
            <div className="page-padding">
              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Net Operating Cash ({username})</div>
                  <div className={`stat-value ${netBalance >= 0 ? 'positive' : 'negative'}`}>
                    ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Inflow Aggregates</div>
                  <div className="stat-value positive">
                    +₹{analytics.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Outflow Aggregates</div>
                  <div className="stat-value negative">
                    -₹{analytics.total_expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </section>

              <main className="main-content-grid">
                <section className="panel-card">
                  <h2 className="panel-title">Post New Ledger Entry</h2>
                  <form onSubmit={handleTransactionSubmit} className="form-stack">
                    <div className="input-field">
                      <label>Transaction Description</label>
                      <input type="text" placeholder="e.g., Office cloud assets utility" value={text} onChange={(e) => setText(e.target.value)} />
                    </div>
                    <div className="input-field">
                      <label>Amount (INR ₹)</label>
                      <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="input-field">
                      <label>Transaction Allocation</label>
                      <select value={type} onChange={(e) => setType(e.target.value)}>
                        <option value="expense">Capital Expense (Debit)</option>
                        <option value="income">Capital Income (Credit)</option>
                      </select>
                    </div>
                    {type === 'expense' && (
                      <div className="input-field">
                        <label>Operational Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>
                          <option value="Food">Food & Hospitality</option>
                          <option value="Utilities">Infrastructure Utilities</option>
                          <option value="Entertainment">Entertainment & Marketing</option>
                          <option value="Transport">Logistics & Transport</option>
                          <option value="Other">Miscellaneous Expenses</option>
                        </select>
                      </div>
                    )}
                    <button type="submit" className="btn-primary">Commit Transaction</button>
                  </form>
                </section>

                <div className="secondary-column-stack">
                  <section className="panel-card">
                    <h2 className="panel-title">Category Distribution Metrics</h2>
                    {Object.keys(analytics.category_breakdown).length === 0 ? (
                      <p className="fallback-text">No expense data processed by API.</p>
                    ) : (
                      Object.entries(analytics.category_breakdown).map(([cat, total]) => {
                        const percentage = analytics.total_expense > 0 ? (total / analytics.total_expense) * 100 : 0;
                        return (
                          <div key={cat} className="metric-row">
                            <div className="metric-labels">
                              <span className="metric-cat-name">{cat}</span>
                              <span className="fallback-text">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </section>

                  <section className="panel-card">
                    <h2 className="panel-title space-between">
                      <span>System Audit Log {role === 'admin' && '(Global Audit Active)'}</span>
                      {role === 'admin' && transactions.length > 0 && (
                        <button onClick={handleResetAllTransactions} className="btn-reset">
                          Reset Ledger Data
                        </button>
                      )}
                    </h2>
                    <div className="audit-log-scroller">
                      {transactions.length === 0 ? (
                        <p className="fallback-text">No historical metrics found inside database.</p>
                      ) : (
                        transactions.map((t) => (
                          <div key={t.id} className={`audit-row-item ${t.type}`}>
                            <div className="audit-info-group">
                              <span className="audit-item-text">{t.text}</span>
                              <span className="category-badge">{t.category}</span>
                            </div>
                            <div className="audit-action-group">
                              <span className={`audit-amount ${t.type}`}>
                                {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <button onClick={() => handleDropItem(t.id)} className="btn-delete-item">&times;</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </main>
            </div>
          ) : (
            /* GROUP BILL SPLITTER VIEW */
            <div className="page-padding main-content-grid">
              <section className="panel-card">
                <h2 className="panel-title space-between">
                  <span>Configure Splitting Circle</span>
                  {friends.length > 0 && (
                    <button onClick={handleClearFriends} className="btn-clear-link">Clear All</button>
                  )}
                </h2>
                <form onSubmit={handleAddFriend} className="inline-add-form">
                  <input type="text" placeholder="Enter friend's name..." value={friendName} onChange={(e) => setFriendName(e.target.value)} />
                  <button type="submit">+ Add Member</button>
                </form>
                <label className="input-group-label">Active Circle Members ({friends.length + 1})</label>
                <div className="badge-flex-wrap">
                  <span className="badge-primary">You (Primary)</span>
                  {friends.map(f => (
                    <span key={f.id} className="badge-secondary">
                      {f.name}
                      <button type="button" onClick={() => handleDeleteFriend(f.id)}>&times;</button>
                    </span>
                  ))}
                </div>
              </section>

              <section className="panel-card">
                <h2 className="panel-title">Calculate Shared Bill</h2>
                <form onSubmit={handleSplitBillSubmit} className="form-stack">
                  <div className="input-field">
                    <label>Activity Description</label>
                    <input type="text" placeholder="e.g., Team Dinner" value={billDescription} onChange={(e) => setBillDescription(e.target.value)} />
                  </div>
                  <div className="input-field">
                    <label>Total Expense Cost (₹)</label>
                    <input type="number" step="0.01" placeholder="0.00" value={billTotal} onChange={(e) => setBillTotal(e.target.value)} />
                  </div>
                  <div className="input-field">
                    <label>Accountable Payer</label>
                    <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                      <option value="You">You Covered Bill</option>
                      {friends.map(f => <option key={f.id} value={f.name}>{f.name} Covered Bill</option>)}
                    </select>
                  </div>
                  {billTotal && (
                    <div className="info-alert-box">
                      <strong>Split Value:</strong> ₹{(parseFloat(billTotal) / (friends.length + 1) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} per member
                    </div>
                  )}
                  <button type="submit" className="btn-primary split-btn-color" disabled={friends.length === 0}>Execute and Commit Split</button>
                </form>
              </section>
            </div>
          )}

          {/* EXPERT ACADEMIC PORTFOLIO CONTACT FOOTER PANEL - Hidden on Login Screen */}
          <footer style={{
            marginTop: 'auto',
            background: '#12111f',
            padding: '1.5rem 2rem',
            borderTop: '2px solid #242238',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: window.innerWidth > 768 ? 'row' : 'column',
            justifyContent: 'space-between',
            alignItems: window.innerWidth > 768 ? 'center' : 'flex-start',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#00f0ff', letterSpacing: '0.02em' }}>
                Developer Profile: S. HARIHARAN
              </span>
              <span style={{ fontSize: '0.85rem', color: '#8a88a3' }}>
                BSc Computer Science &bull; Bharathiar University
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                <strong style={{ color: '#00f0ff' }}>Core Stack:</strong> Python | <strong style={{ color: '#8a88a3' }}>Foundations:</strong> C, C++, Java, HTML, CSS, JavaScript
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <a href="mailto:hxcoretech@gmail.com" style={{
                color: '#ffffff', background: '#1b192e', border: '1px solid #242238', 
                padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, 
                textDecoration: 'none'
              }}>
                📧 hxcoretech@gmail.com
              </a>
              <a href="https://instagram.com/hari.haran__07" target="_blank" rel="noreferrer" style={{
                color: '#00f0ff', background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)', 
                padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, 
                textDecoration: 'none'
              }}>
                📸 @hari.haran__07
              </a>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;