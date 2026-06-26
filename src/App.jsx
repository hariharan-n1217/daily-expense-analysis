import React, { useState, useEffect } from 'react';

function App() {
  const [view, setView] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({ total_income: 0, total_expense: 0, category_breakdown: {} });
  const [friends, setFriends] = useState([]);
  
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [type, setType] = useState('expense');

  const [friendName, setFriendName] = useState('');
  const [billDescription, setBillDescription] = useState('');
  const [billTotal, setBillTotal] = useState('');
  const [paidBy, setPaidBy] = useState('You');

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
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#1e293b' }}>Financial Analytics Workspace</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>Enterprise Strategy Suite &bull; Active Internship Project</p>
        </div>
        <nav style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setView('home')} 
            style={{ 
              backgroundColor: view === 'home' ? '#4f46e5' : '#e2e8f0', 
              color: view === 'home' ? 'white' : '#475569',
              border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
            }}
          >
            Dashboard Home
          </button>
          <button 
            onClick={() => setView('split')} 
            style={{ 
              backgroundColor: view === 'split' ? '#4f46e5' : '#e2e8f0', 
              color: view === 'split' ? 'white' : '#475569',
              border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
            }}
          >
            Group Bill Splitter
          </button>
        </nav>
      </header>

      {view === 'home' ? (
        <div style={{ padding: '2rem' }}>
          <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div className="stat-label" style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>Net Operating Cash</div>
              <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: netBalance >= 0 ? '#10b981' : '#ef4444' }}>
                ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div className="stat-label" style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>Inflow Aggregates</div>
              <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#10b981' }}>
                +₹{analytics.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div className="stat-label" style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>Outflow Aggregates</div>
              <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#ef4444' }}>
                -₹{analytics.total_expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </section>

          <main className="main-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <section className="panel-card" style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <h2 className="panel-title" style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: '#1e293b' }}>Post New Ledger Entry</h2>
              <form onSubmit={handleTransactionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-field" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Transaction Description</label>
                  <input type="text" placeholder="e.g., Internet Utilities" value={text} onChange={(e) => setText(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem' }} />
                </div>
                <div className="input-field" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Amount (INR ₹)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem' }} />
                </div>
                <div className="input-field" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Transaction Allocation</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', background: 'white' }}>
                    <option value="expense">Capital Expense (Debit)</option>
                    <option value="income">Capital Income (Credit)</option>
                  </select>
                </div>
                {type === 'expense' && (
                  <div className="input-field" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Operational Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', background: 'white' }}>
                      <option value="Food">Food & Hospitality</option>
                      <option value="Utilities">Infrastructure Utilities</option>
                      <option value="Entertainment">Entertainment & Marketing</option>
                      <option value="Transport">Logistics & Transport</option>
                      <option value="Other">Miscellaneous Expenses</option>
                    </select>
                  </div>
                )}
                <button type="submit" style={{ padding: '0.75rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>Commit Transaction</button>
              </form>
            </section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <section className="panel-card" style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <h2 className="panel-title" style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: '#1e293b' }}>Category Distribution Metrics</h2>
                {Object.keys(analytics.category_breakdown).length === 0 ? (
                  <p style={{ color: '#64748b', margin: 0 }}>No expense data processed by API.</p>
                ) : (
                  Object.entries(analytics.category_breakdown).map(([cat, total]) => {
                    const percentage = analytics.total_expense > 0 ? (total / analytics.total_expense) * 100 : 0;
                    return (
                      <div key={cat} style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{cat}</span>
                          <span style={{ color: '#64748b' }}>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#4f46e5', width: `${percentage}%`, borderRadius: '999px' }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              <section className="panel-card" style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  System Audit Log
                  {transactions.length > 0 && (
                    <button onClick={handleResetAllTransactions} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      Reset Ledger Data
                    </button>
                  )}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {transactions.length === 0 ? (
                    <p style={{ color: '#64748b', margin: 0 }}>No historical metrics found inside database.</p>
                  ) : (
                    transactions.map((t) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', borderLeft: `4px solid ${t.type === 'income' ? '#10b981' : '#ef4444'}` }}>
                        <div>
                          <span style={{ display: 'block', fontWeight: 700, color: '#334155' }}>{t.text}</span>
                          <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>{t.category}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 700, color: t.type === 'income' ? '#10b981' : '#ef4444' }}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <button onClick={() => handleDropItem(t.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}>&times;</button>
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
        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <section style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}>
              Configure Splitting Circle
              {friends.length > 0 && (
                <button onClick={handleClearFriends} style={{ background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Clear All</button>
              )}
            </h2>
            <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
              <input type="text" placeholder="Enter friend's name..." value={friendName} onChange={(e) => setFriendName(e.target.value)} style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <button type="submit" style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>+ Add Member</button>
            </form>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ background: '#4f46e5', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600 }}>You (Primary)</span>
              {friends.map(f => (
                <span key={f.id} style={{ background: '#e0e7ff', color: '#4f46e5', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {f.name}
                  <button type="button" onClick={() => handleDeleteFriend(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>&times;</button>
                </span>
              ))}
            </div>
          </section>

          <section style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: '#1e293b' }}>Calculate Shared Bill</h2>
            <form onSubmit={handleSplitBillSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Activity Description</label>
                <input type="text" placeholder="e.g., Team Dinner" value={billDescription} onChange={(e) => setBillDescription(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Total Expense Cost (₹)</label>
                <input type="number" step="0.01" placeholder="0.00" value={billTotal} onChange={(e) => setBillTotal(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Accountable Payer</label>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white' }}>
                  <option value="You">You Covered Bill</option>
                  {friends.map(f => <option key={f.id} value={f.name}>{f.name} Covered Bill</option>)}
                </select>
              </div>
              {billTotal && (
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #10b981', fontSize: '0.95rem' }}>
                  <strong>Split Value:</strong> ₹{(parseFloat(billTotal) / (friends.length + 1) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} per member
                </div>
              )}
              <button type="submit" style={{ padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }} disabled={friends.length === 0}>Execute and Commit Split</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;