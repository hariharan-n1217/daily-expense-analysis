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

  // Enhanced Multi-Page Navigation State
  const [view, setView] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({ total_income: 0, total_expense: 0, category_breakdown: {} });
  const [friends, setFriends] = useState([]);
  
  // Savings Plan Engine State
  const [frequency, setFrequency] = useState('daily');
  const [saveAmount, setSaveAmount] = useState('10');
  const [customAmount, setCustomAmount] = useState('');
  const [dailySavingsLogged, setDailySavingsLogged] = useState(0);

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
      console.error('Error synchronizing metrics:', err);
    }
  };

  useEffect(() => {
    if (token) refreshData();
  }, [token]);

  const netBalance = analytics.total_income - analytics.total_expense;

  // Savings Forecast Logic
  const getActiveAmount = () => {
    if (saveAmount === 'custom') {
      return parseFloat(customAmount) || 0;
    }
    return parseFloat(saveAmount) || 0;
  };

  const calculateForecast = () => {
    const baseAmt = getActiveAmount();
    let annualFactor = 365; // daily default
    if (frequency === 'weekly') annualFactor = 52;
    if (frequency === 'monthly') annualFactor = 12;

    const totalYearly = baseAmt * annualFactor;

    return {
      m1: (totalYearly / 12),
      m6: (totalYearly / 2),
      y1: totalYearly,
      y2: totalYearly * 2,
      y3: totalYearly * 3
    };
  };

  const forecast = calculateForecast();
  const maxForecastValue = forecast.y3 || 1; // Used to safely scale the custom bar graph cleanly

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

      if (!res.ok) throw new Error(data.detail || 'Authentication handshake rejected.');

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

    const payload = { text, amount: parseFloat(amount), category: type === 'income' ? 'Income' : category, type };
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: friendName.trim() })
    });
    if (res.ok) {
      setFriendName('');
      refreshData();
    }
  };

  const handleDeleteFriend = async (id) => {
    const res = await fetch(`${API_BASE}/friends/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { setPaidBy('You'); refreshData(); }
  };

  const handleSplitBillSubmit = async (e) => {
    e.preventDefault();
    if (!billDescription || !billTotal || friends.length === 0) return alert('Ensure bill info is ready and friends are added.');

    const totalAmount = parseFloat(billTotal);
    const splitShare = totalAmount / (friends.length + 1);
    const finalDescription = `[Split] ${billDescription} (Total: ₹${totalAmount.toFixed(2)}, paid by ${paidBy})`;

    const payload = { text: finalDescription, amount: paidBy === 'You' ? totalAmount : splitShare, category: 'Other', type: 'expense' };
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setBillDescription('');
      setBillTotal('');
      refreshData();
      alert(`Bill split successfully! Shares computed at ₹${splitShare.toFixed(2)}.`);
      setView('home'); 
    }
  };

  const handleClearFriends = async () => {
    if (window.confirm("Clear all members from the active circle?")) {
      await fetch(`${API_BASE}/friends`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setPaidBy('You');
      refreshData();
    }
  };

  const handleResetAllTransactions = async () => {
    if (window.confirm("CRITICAL MASTER WARNING: Wipe global database?")) {
      const res = await fetch(`${API_BASE}/transactions`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { refreshData(); alert("Database core wiped clean."); }
    }
  };

  const handleDropItem = async (id) => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) refreshData();
  };

  return (
    <div className="app-layout">
      {/* 1. AUTHENTICATION SCHEME */}
      {!token ? (
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '400px', border: '1px solid #242238' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, background: 'linear-gradient(135deg, #00f0ff, #9d4edd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Secure Core Login
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#8a88a3' }}>Multi-User Expense Framework Suite</p>
            </div>

            {authError && <div className="error-alert">🛑 {authError}</div>}

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
        /* 2. MAIN HUB INTERFACE WITH ANIMATED TABS */
        <>
          <header className="app-header">
            <div className="header-title-block">
              <h1>Financial Analytics Workspace</h1>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>Enterprise Strategy Suite &bull; Active Project</span>
                <span style={{ fontSize: '0.7rem', background: role === 'admin' ? '#ff0055' : '#00f0ff', color: '#000000', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, textTransform: 'uppercase' }}>
                  {role}: {username}
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
              <button onClick={() => setView('savings')} className={`nav-btn ${view === 'savings' ? 'active' : ''}`}>
                🎯 Savings Hub
              </button>
              <button onClick={handleLogout} className="nav-btn" style={{ border: '1px solid rgba(255,0,85,0.3)', color: '#ff0055' }}>
                Terminal Exit
              </button>
            </nav>
          </header>

          {/* TRANSITION FRAME CONTAINER USING LOCAL CONDITIONAL CHANNELS */}
          <div className="view-transition-wrapper">
            
            {/* VIEW A: ANALYTICS HOMEPAGE */}
            {view === 'home' && (
              <div className="page-padding animated-view">
                <section className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Net Operating Cash ({username})</div>
                    <div className={`stat-value ${netBalance >= 0 ? 'positive' : 'negative'}`}>
                      ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Inflow Aggregates</div>
                    <div className="stat-value positive">+₹{analytics.total_income.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Outflow Aggregates</div>
                    <div className="stat-value negative">-₹{analytics.total_expense.toLocaleString('en-IN')}</div>
                  </div>
                </section>

                <main className="main-content-grid">
                  <section className="panel-card">
                    <h2 className="panel-title">Post New Ledger Entry</h2>
                    <form onSubmit={handleTransactionSubmit} className="form-stack">
                      <div className="input-field">
                        <label>Transaction Description</label>
                        <input type="text" placeholder="e.g., Cloud Assets Utility" value={text} onChange={(e) => setText(e.target.value)} />
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
                                <span className="fallback-text">₹{total.toLocaleString('en-IN')} ({percentage.toFixed(0)}%)</span>
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
                        <span>System Audit Log {role === 'admin' && '(Global View)'}</span>
                        {role === 'admin' && transactions.length > 0 && (
                          <button onClick={handleResetAllTransactions} className="btn-reset">Reset Ledger</button>
                        )}
                      </h2>
                      <div className="audit-log-scroller">
                        {transactions.length === 0 ? (
                          <p className="fallback-text">No records inside database ledger.</p>
                        ) : (
                          transactions.map((t) => (
                            <div key={t.id} className={`audit-row-item ${t.type}`}>
                              <div className="audit-info-group">
                                <span className="audit-item-text">{t.text}</span>
                                <span className="category-badge">{t.category}</span>
                              </div>
                              <div className="audit-action-group">
                                <span className={`audit-amount ${t.type}`}>
                                  {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
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
            )}

            {/* VIEW B: BILL SPLITTER */}
            {view === 'split' && (
              <div className="page-padding main-content-grid animated-view">
                <section className="panel-card">
                  <h2 className="panel-title space-between">
                    <span>Configure Splitting Circle</span>
                    {friends.length > 0 && <button onClick={handleClearFriends} className="btn-clear-link">Clear All</button>}
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
                    <button type="submit" className="btn-primary split-btn-color" disabled={friends.length === 0}>Execute Split</button>
                  </form>
                </section>
              </div>
            )}

            {/* NEW VIEW C: PRO-LEVEL ADVANCED SAVINGS PLANNING ARCHITECTURE */}
            {view === 'savings' && (
              <div className="page-padding main-content-grid animated-view">
                {/* PLAN ENGINE CONFIG PANEL */}
                <section className="panel-card">
                  <h2 className="panel-title" style={{ color: 'var(--brand)' }}>🎯 Strategic Savings Optimizer</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                    Configure automated budgeting intervals to simulate compounding financial metrics across medium and long-term milestones.
                  </p>

                  <div className="form-stack">
                    <div className="input-field">
                      <label>Allocation Frequency</label>
                      <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                        <option value="daily">Daily Investment Vector</option>
                        <option value="weekly">Weekly Compilation Vector</option>
                        <option value="monthly">Monthly Cycle Vector</option>
                      </select>
                    </div>

                    <div className="input-field">
                      <label>Target Threshold Token (INR ₹)</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {['10', '20', '50', '100'].map(amt => (
                          <button key={amt} type="button" onClick={() => setSaveAmount(amt)} className={`nav-btn ${saveAmount === amt ? 'active' : ''}`} style={{ flex: 1, padding: '0.5rem' }}>
                            ₹{amt}
                          </button>
                        ))}
                        <button type="button" onClick={() => setSaveAmount('custom')} className={`nav-btn ${saveAmount === 'custom' ? 'active' : ''}`} style={{ flex: 1, padding: '0.5rem' }}>
                          Custom
                        </button>
                      </div>

                      {saveAmount === 'custom' && (
                        <input type="number" placeholder="Enter custom amount (₹)" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} style={{ animation: 'fadeInUp 0.3s forwards' }} />
                      )}
                    </div>

                    {/* INTERACTIVE COMPLIANCE LOG BUTTON */}
                    <div style={{ padding: '1.25rem', background: 'rgba(0,240,255,0.03)', borderRadius: '12px', border: '1px dashed rgba(0,240,255,0.2)', textAlign: 'center', marginTop: '0.5rem' }}>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Did you secure your commitment today? Click to lock it into memory.
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <button type="button" onClick={() => setDailySavingsLogged(prev => prev + getActiveAmount())} className="btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem', width: 'auto', minWidth: '120px' }}>
                          ⚡ GROW MATRIX
                        </button>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--emerald)' }}>
                          ₹{dailySavingsLogged.toLocaleString('en-IN')} Secured
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SIMULATION VISUALIZER & PURE CSS GRAPH PANEL */}
                <section className="panel-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <h2 className="panel-title">Algorithmic Forecast Visualizer</h2>
                  
                  {/* DATA TABLE MATRIX */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
                    {[
                      { label: 'After 1 Month Cycle', val: forecast.m1 },
                      { label: 'After 6 Month Halftime', val: forecast.m6 },
                      { label: '1 Year Cumulative Milestone', val: forecast.y1 },
                      { label: '2 Year Strategic Velocity', val: forecast.y2 },
                      { label: '3 Year Core Terminal Horizon', val: forecast.y3 },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: idx >= 2 ? 'var(--brand)' : 'var(--text-primary)' }}>
                          ₹{item.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* HIGH-FIDELITY PURE CSS GRAPH SPECIFICATION */}
                  <label className="input-group-label" style={{ marginBottom: '1rem' }}>Holographic Trajectory Reference Graph</label>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '1.5rem 1rem 0.75rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', flexGrow: 1, minHeight: '140px', gap: '8px' }}>
                    {[
                      { t: '1M', v: forecast.m1 },
                      { t: '6M', v: forecast.m6 },
                      { t: '1Y', v: forecast.y1 },
                      { t: '2Y', v: forecast.y2 },
                      { t: '3Y', v: forecast.y3 },
                    ].map((bar, bIdx) => {
                      const heightPercent = Math.max((bar.v / maxForecastValue) * 100, 6);
                      return (
                        <div key={bIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                          <div style={{ width: '100%', height: `${heightPercent}%`, minHeight: '6px', background: 'linear-gradient(to top, #9d4edd, var(--brand))', borderRadius: '4px', boxShadow: '0 0 10px rgba(0,240,255,0.2)', transition: 'height 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{bar.t}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

          </div>

          {/* EXPERT PORTFOLIO CONTACT FOOTER PANEL */}
          <footer style={{ marginTop: 'auto', background: '#12111f', padding: '1.5rem 2rem', borderTop: '2px solid #242238', boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: window.innerWidth > 768 ? 'row' : 'column', justifyContent: 'space-between', alignItems: window.innerWidth > 768 ? 'center' : 'flex-start', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#00f0ff', letterSpacing: '0.02em' }}>Developer Profile: S. HARIHARAN</span>
              <span style={{ fontSize: '0.85rem', color: '#8a88a3' }}>BSc Computer Science (3rd Year) &bull; Bharathiar University</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}><strong style={{ color: '#00f0ff' }}>Core Stack:</strong> Python | <strong style={{ color: '#8a88a3' }}>Foundations:</strong> C, C++, Java, HTML, CSS, JavaScript</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <a href="mailto:hxcoretech@gmail.com" style={{ color: '#ffffff', background: '#1b192e', border: '1px solid #242238', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>📧 hxcoretech@gmail.com</a>
              <a href="https://instagram.com/hari.haran__07" target="_blank" rel="noreferrer" style={{ color: '#00f0ff', background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>📸 @hari.haran__07</a>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;