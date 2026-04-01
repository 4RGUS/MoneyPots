import { useState, useMemo } from 'react'
import { addAccount, updateAccount, deleteAccount, updatePot } from '../lib/db'
import { availableBalance, fmt, computeCommitted, getAccountContributions } from '../lib/allocation'
import AccountModal from './AccountModal'
import DeficitModal from './DeficitModal'

export default function AccountsTab({ uid, accounts, pots, transactions }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editAcc, setEditAcc] = useState(null)
  const [deficitState, setDeficitState] = useState(null)

  const committed = useMemo(() => computeCommitted(pots, transactions), [pots, transactions])

  async function handleAdd(data) {
    await addAccount(uid, data)
    setShowAdd(false)
  }

  async function handleEdit(data) {
    const committedAmount = committed[editAcc.id] || 0
    if (data.balance < committedAmount) {
      const { contributions, order } = getAccountContributions(editAcc.id, pots, transactions)
      setDeficitState({
        pendingData: data,
        account: editAcc,
        deficit: committedAmount - data.balance,
        contributions,
        order,
      })
      setEditAcc(null)
    } else {
      await updateAccount(uid, editAcc.id, data)
      setEditAcc(null)
    }
  }

  async function handleDelete(acc) {
    if (!confirm(`Remove account "${acc.name}"?`)) return
    await deleteAccount(uid, acc.id)
  }

  async function handleDeficitResolution(strategy) {
    const { pendingData, account, deficit, contributions, order } = deficitState
    const writes = [updateAccount(uid, account.id, pendingData)]

    if (strategy === 'B') {
      const total = Object.values(contributions).reduce((a, b) => a + b, 0)
      for (const [potId, amt] of Object.entries(contributions)) {
        const pot = pots.find(p => p.id === potId)
        if (pot) writes.push(updatePot(uid, potId, { saved: Math.max(0, pot.saved - amt * (deficit / total)) }))
      }
    } else if (strategy === 'C') {
      let rem = deficit
      for (const potId of order) {
        if (rem <= 0) break
        const pot = pots.find(p => p.id === potId)
        if (!pot) continue
        const reduction = Math.min(contributions[potId] || 0, rem)
        writes.push(updatePot(uid, potId, { saved: Math.max(0, pot.saved - reduction) }))
        rem -= reduction
      }
    }

    await Promise.all(writes)
    setDeficitState(null)
  }

  return (
    <>
      <div className="accounts-list">
        {accounts.map(acc => {
          const rawBalance = acc.rawBalance ?? acc.balance
          const committedAmount = committed[acc.id] || 0
          const isDeficit = rawBalance < committedAmount
          const inPots = isDeficit ? committedAmount : rawBalance - acc.balance
          const avail = availableBalance(acc)
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
                {isDeficit ? (
                  <div style={{ fontSize: 11, color: '#A32D2D', background: '#FDECEA', borderRadius: 6, padding: '2px 7px', marginTop: 3 }}>
                    ⚠ Deficit: {fmt(committedAmount - rawBalance)}
                  </div>
                ) : inPots > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 2 }}>
                      In pots: − {fmt(inPots)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 1 }}>
                      After pots: {fmt(acc.balance)}
                    </div>
                  </>
                )}
                <div className={`acc-avail ${avail > 0 ? 'ok' : 'low'}`} style={{ marginTop: inPots > 0 || isDeficit ? 4 : 2 }}>
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
      {deficitState && (
        <DeficitModal
          {...deficitState}
          pots={pots}
          onResolve={handleDeficitResolution}
          onClose={() => setDeficitState(null)}
        />
      )}
    </>
  )
}
