import React, { useState, useEffect } from 'react';

function App() {
  // Navigation State: 'home' or 'split'
  const [view, setView] = useState('home');

  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({ total_income: 0, total_expense: 0, category_breakdown: {} });
  const [friends, setFriends] = useState([]);
  
  // Transaction Form State
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [type, setType] = useState('expense');

  // Friends & Splitting Form State
  const [friendName, setFriendName] = useState('');
  const [billDescription, setBillDescription] = useState('');
  const [billTotal, setBillTotal] = useState('');
  const [paidBy, setPaidBy] = useState('You');

  const API_BASE = 'http://localhost:8000/api';

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

  // NEW: Handler to wipe the transaction database clean
  const handleResetAllTransactions = async () => {
    if (window.confirm("CRITICAL WARNING: Are you sure you want to permanently delete all transactions from the SQLite database? This cannot be undone.")) {
      const res = await fetch(`${API_BASE}/transactions`, { method: 'DELETE' });
      if (res.ok) {
        refreshData();
        alert("Ledger completely wiped clean. Ready for new transactions.");
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
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Financial Analytics Workspace</h1>
          <p>Enterprise Strategy Suite &bull; Active Internship Project</p>
        </div>
        <nav style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setView('home')} 
            style={{ 
              backgroundColor: view === 'home' ? 'var(--brand)' : '#e2e8f0', 
              color: view === 'home' ? 'white' : 'var(--text-secondary)',
              border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
            }}
          >
            Dashboard Home
          </button>
          <button 
            onClick={() => setView('split')} 
            style={{ 
              backgroundColor: view === 'split' ? 'var(--brand)' : '#e2e8f0', 
              color: view === 'split' ? 'white' : 'var(--text-secondary)',
              border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
            }}
          >
            Group Bill Splitter
          </button>
        </nav>
      </header>

      {/* RENDER PAGES */}
      {view === 'home' ? (
        /* PAGE 1: HOME */
        <>
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Net Operating Cash</div>
              <div className="stat-value" style={{ color: netBalance >= 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Inflow Aggregates</div>
              <div className="stat-value" style={{ color: 'var(--emerald)' }}>
                +₹{analytics.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Outflow Aggregates</div>
              <div className="stat-value" style={{ color: 'var(--rose)' }}>
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
                  <input type="text" placeholder="e.g., Office cloud server utilities" value={text} onChange={(e) => setText(e.target.value)} />
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <section className="panel-card">
                <h2 className="panel-title">Category Distribution Metrics</h2>
                {Object.keys(analytics.category_breakdown).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No expense data processed by API.</p>
                ) : (
                  Object.entries(analytics.category_breakdown).map(([cat, total]) => {
                    const percentage = analytics.total_expense > 0 ? (total / analytics.total_expense) * 100 : 0;
                    return (
                      <div key={cat} className="progress-bar-container">
                        <div className="progress-labels">
                          <span style={{ fontWeight: 600 }}>{cat}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              {/* AUDIT LOG SECTION WITH INTEGRATED RESET BUTTON ACTION */}
              <section className="panel-card">
                <h2 className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  System Audit Log
                  {transactions.length > 0 && (
                    <button 
                      onClick={handleResetAllTransactions}
                      style={{ 
                        backgroundColor: 'var(--rose)', color: 'white', border: 'none', 
                        padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', 
                        fontSize: '0.8rem', fontWeight: 600, transition: 'opacity 0.2s' 
                      }}
                      onMouseOver={(e) => e.target.style.opacity = 0.9}
                      onMouseOut={(e) => e.target.style.opacity = 1}
                    >
                      Reset Ledger Data
                    </button>
                  )}
                </h2>
                <div className="tx-history-list">
                  {transactions.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No historical metrics found inside database.</p>
                  ) : (
                    transactions.map((t) => (
                      <div key={t.id} className={`tx-row-item ${t.type}`}>
                        <div>
                          <span style={{ display: 'block', fontWeight: 700 }}>{t.text}</span>
                          <span className="tx-badge">{t.category}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="tx-amount-display" style={{ color: t.type === 'income' ? 'var(--emerald)' : 'var(--rose)' }}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <button className="btn-icon-delete" onClick={() => handleDropItem(t.id)}>&times;</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </main>
        </>
      ) : (
        /* PAGE 2: GROUP SPLITTER VIEW */
        <main style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr', gap: '2rem' }}>
          <section className="panel-card" style={{ height: 'fit-content' }}>
            <h2 className="panel-title">
              Configure Splitting Circle
              {friends.length > 0 && (
                <button onClick={handleClearFriends} style={{ background: 'none', color: 'var(--rose)', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Clear All
                </button>
              )}
            </h2>
            <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
              <input type="text" placeholder="Enter friend's name..." value={friendName} onChange={(e) => setFriendName(e.target.value)} style={{ flex: 1 }} />
              <button type="submit" style={{ padding: '0.5rem 1rem' }}>+ Add Member</button>
            </form>

            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Active Circle Members ({friends.length + 1})
            </label>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="tx-badge" style={{ background: 'var(--brand)', color: 'white', display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
                You (Primary)
              </span>
              {friends.map(f => (
                <span key={f.id} className="tx-badge" style={{ background: '#e0e7ff', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 600 }}>
                  {f.name}
                  <button 
                    type="button" 
                    onClick={() => handleDeleteFriend(f.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', padding: '0 0 0 4px', lineHeight: 1 }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h2 className="panel-title">Calculate Shared Bill</h2>
            <form onSubmit={handleSplitBillSubmit} className="form-stack">
              <div className="input-field">
                <label>Activity Description</label>
                <input type="text" placeholder="e.g., Team Dinner, Project Supplies" value={billDescription} onChange={(e) => setBillDescription(e.target.value)} />
              </div>
              <div className="input-field">
                <label>Total Expense Cost (₹)</label>
                <input type="number" step="0.01" placeholder="0.00" value={billTotal} onChange={(e) => setBillTotal(e.target.value)} />
              </div>
              <div className="input-field">
                <label>Accountable Payer</label>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                  <option value="You">You Covered Bill</option>
                  {friends.map(f => (
                    <option key={f.id} value={f.name}>{f.name} Covered Bill</option>
                  ))}
                </select>
              </div>

              {billTotal && (
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', fontSize: '0.95rem', borderLeft: '4px solid var(--emerald)' }}>
                  <strong>Split Value:</strong> ₹{(parseFloat(billTotal) / (friends.length + 1) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per member
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ background: '#059669' }} disabled={friends.length === 0}>
                Execute and Commit Split
              </button>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;