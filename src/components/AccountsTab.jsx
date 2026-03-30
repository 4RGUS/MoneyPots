import { useState } from 'react'
import { addAccount, updateAccount, deleteAccount } from '../lib/db'
import { availableBalance, fmt } from '../lib/allocation'
import AccountModal from './AccountModal'

export default function AccountsTab({ uid, accounts }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editAcc, setEditAcc] = useState(null)

  async function handleAdd(data) {
    await addAccount(uid, data)
    setShowAdd(false)
  }

  async function handleEdit(data) {
    await updateAccount(uid, editAcc.id, data)
    setEditAcc(null)
  }

  async function handleDelete(acc) {
    if (!confirm(`Remove account "${acc.name}"?`)) return
    await deleteAccount(uid, acc.id)
  }

  return (
    <>
      <div className="accounts-list">
        {accounts.map(acc => {
          // rawBalance = user-entered value (never mutated by pot allocations)
          // acc.balance = rawBalance minus already-committed pot amounts
          const rawBalance = acc.rawBalance ?? acc.balance
          const inPots = rawBalance - acc.balance   // amount committed to active pots
          const avail = availableBalance(acc)        // free for new pots (after min balance)
          return (
            <div className="card acc-card" key={acc.id}>
              <div
                className="acc-icon"
                style={{ background: acc.type === 'salary' ? '#EAF3DE' : '#E6F1FB' }}
              >
                {acc.type === 'salary' ? '💼' : '🏦'}
              </div>

              <div className="acc-info">
                <div className="acc-name">{acc.name}</div>
                <div className="acc-meta">
                  {acc.bank}
                  <span className={`badge badge-${acc.type}`}>
                    {acc.type === 'salary' ? 'Salary' : 'Savings'}
                  </span>
                </div>
                {acc.type === 'savings' && (
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 3 }}>
                    Min balance: {fmt(acc.minBalance || 0)}
                  </div>
                )}
              </div>

              <div className="acc-right">
                <div className="acc-balance">{fmt(rawBalance)}</div>
                {inPots > 0 && (
                  <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 2 }}>
                    In pots: − {fmt(inPots)}
                  </div>
                )}
                {inPots > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 1 }}>
                    After pots: {fmt(acc.balance)}
                  </div>
                )}
                <div className={`acc-avail ${avail > 0 ? 'ok' : 'low'}`} style={{ marginTop: inPots > 0 ? 4 : 2 }}>
                  Free for pots: {fmt(avail)}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm" onClick={() => setEditAcc(acc)}>Edit</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(acc)}>Remove</button>
                </div>
              </div>
            </div>
          )
        })}

        {accounts.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🏦</div>
            <p>No accounts yet. Add your first bank account.</p>
          </div>
        )}
      </div>

      <button className="btn btn-clay" onClick={() => setShowAdd(true)}>+ Add account</button>

      {showAdd && (
        <AccountModal title="Add bank account" onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editAcc && (
        <AccountModal title={`Edit "${editAcc.name}"`} initial={editAcc} onSave={handleEdit} onClose={() => setEditAcc(null)} />
      )}
    </>
  )
}
