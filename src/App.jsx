import React, { useState, useEffect } from 'react';

function App() {
  // Navigation State: 'home', 'split', or 'about'
  const [view, setView] = useState('home');

  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({ total_income: 0, total_expense: 0, category_breakdown: {} });
  const [friends, setFriends] = useState([]);
  
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
    try {
      const txRes = await fetch(`${API_BASE}/transactions`);
      setTransactions(await txRes.json());

      const analyticsRes = await fetch(`${API_BASE}/analytics/summary`);
      setAnalytics(await analyticsRes.json());

      const friendsRes = await fetch(`${API_BASE}/friends`);
      setFriends(await friendsRes.json());
    } catch (err) {
      console.error('Error synchronizing backend:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const netBalance = analytics.total_income - analytics.total_expense;

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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: friendName.trim() })
    });
    if (res.ok) {
      setFriendName('');
      refreshData();
    } else {
      alert("Name already added to the bill split circle.");
    }
  };

  const handleDeleteFriend = async (id) => {
    const res = await fetch(`${API_BASE}/friends/${id}`, { method: 'DELETE' });
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
      headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_BASE}/friends`, { method: 'DELETE' });
      setPaidBy('You');
      refreshData();
    }
  };

  const handleResetAllTransactions = async () => {
    if (window.confirm("CRITICAL WARNING: Permanently delete all transactions from SQLite database?")) {
      const res = await fetch(`${API_BASE}/transactions`, { method: 'DELETE' });
      if (res.ok) {
        refreshData();
        alert("Ledger completely wiped clean.");
      }
    }
  };

  const handleDropItem = async (id) => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) refreshData();
  };

  return (
    <div className="app-layout">
      {/* HEADER BAR */}
      <header className="app-header">
        <div className="header-title-block">
          <h1>Financial Analytics Workspace</h1>
          <p>Enterprise Strategy Suite &bull; Active Internship Project</p>
        </div>
        <nav className="header-navigation">
          <button onClick={() => setView('home')} className={`nav-btn ${view === 'home' ? 'active' : ''}`}>
            Dashboard Home
          </button>
          <button onClick={() => setView('split')} className={`nav-btn ${view === 'split' ? 'active' : ''}`}>
            Group Bill Splitter
          </button>
          <button onClick={() => setView('about')} className={`nav-btn ${view === 'about' ? 'active' : ''}`} style={{ borderColor: 'var(--border-neon)' }}>
            About Developer
          </button>
        </nav>
      </header>

      {/* DYNAMIC SUB-PAGE RENDER SYSTEM */}
      {view === 'home' && (
        <div className="page-padding">
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Net Operating Cash</div>
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
                  <input type="text" placeholder="e.g., Internet Utilities" value={text} onChange={(e) => setText(e.target.value)} />
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
                  <span>System Audit Log</span>
                  {transactions.length > 0 && (
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
                          <span className="btn-delete-item" onClick={() => handleDropItem(t.id)} style={{cursor:'pointer'}}>&times;</span>
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

      {view === 'split' && (
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

      {/* TAB 3: INNOVATIVE CYBERPUNK PORTFOLIO CARD ABOUT PAGE */}
      {view === 'about' && (
        <div className="page-padding">
          <div className="portfolio-showcase-container">
            <div className="portfolio-header-accent">
              <span className="live-status-blip"></span>
              <h3>DEVELOPER PROFILE CONSOLE</h3>
            </div>
            
            <div className="portfolio-main-grid">
              {/* Profile Meta block */}
              <div className="portfolio-block profile-meta">
                <h2>S. HARIHARAN</h2>
                <p className="academic-standing">3rd Year &bull; BSc Computer Science</p>
                <p className="academic-institution">Bharathiar University</p>
              </div>

              {/* Technical Core block */}
              <div className="portfolio-block technical-stack">
                <span className="block-tag-label">PRIMARY CORE STACK</span>
                <div className="tech-badge-row">
                  <span className="badge-glow">Python</span>
                  <span className="badge-flat">HTML5</span>
                  <span className="badge-flat">CSS3</span>
                  <span className="badge-flat">JavaScript</span>
                </div>
                
                <span className="block-tag-label" style={{marginTop: '1.25rem'}}>FOUNDATIONAL KNOWLEDGE</span>
                <div className="tech-badge-row foundational">
                  <span className="badge-dim">C</span>
                  <span className="badge-dim">C++</span>
                  <span className="badge-dim">Java</span>
                </div>
              </div>

              {/* Endpoint Contacts block */}
              <div className="portfolio-block network-endpoints">
                <span className="block-tag-label">COMMUNICATIONS LAB</span>
                <div className="endpoint-links">
                  <a href="mailto:hxcoretech@gmail.com" className="endpoint-anchor email-glow">
                    <span className="marker">&bull;</span> hxcoretech@gmail.com
                  </a>
                  <a href="https://instagram.com/hari.haran__07" target="_blank" rel="noopener noreferrer" className="endpoint-anchor insta-glow">
                    <span className="marker">#</span> @hari.haran__07
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;