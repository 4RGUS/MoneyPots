import { useState } from 'react'
import { addPot, updatePot, deletePot, updateAccount, addTransaction } from '../lib/db'
import { smartAllocate, fmt } from '../lib/allocation'
import PotModal from './PotModal'
import TopUpModal from './TopUpModal'

export default function PotsTab({ uid, pots, accounts }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editPot, setEditPot] = useState(null)
  const [topUpPot, setTopUpPot] = useState(null)

  async function handleAdd(data) {
    await addPot(uid, data)
    setShowAdd(false)
  }

  async function handleEdit(data) {
    await updatePot(uid, editPot.id, data)
    setEditPot(null)
  }

  async function handleDelete(pot) {
    if (!confirm(`Remove pot "${pot.name}"?`)) return
    await deletePot(uid, pot.id)
  }

  async function handleTopUp(pot, amount, allocs) {
    // Deduct from each account
    for (const { account, deduct } of allocs) {
      await updateAccount(uid, account.id, { balance: account.balance - deduct })
    }
    // Add to pot
    const newSaved = Math.min(pot.target, pot.saved + amount)
    await updatePot(uid, pot.id, { saved: newSaved })
    // Record transaction
    await addTransaction(uid, {
      potId: pot.id,
      potName: pot.name,
      amount,
      sources: allocs.map(a => ({ accountId: a.account.id, accountName: a.account.name, deduct: a.deduct })),
    })
    setTopUpPot(null)
  }

  return (
    <>
      <div className="card-grid">
        {pots.map(pot => {
          const pct = Math.min(100, Math.round((pot.saved / pot.target) * 100))
          const done = pct >= 100
          return (
            <div className="card pot-card" key={pot.id}>
              <div className="pot-head">
                <div className="pot-emoji" style={{ background: pot.color }}>{pot.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="pot-title">{pot.name}</div>
                  <div className="pot-subtitle">Goal: {fmt(pot.target)}</div>
                </div>
                <span className={`pot-pct-badge ${done ? 'done' : ''}`}>{pct}%</span>
              </div>

              <div className="progress-track">
                <div
                  className={`progress-fill ${done ? 'done' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="pot-amounts">
                <span className="pot-saved">{fmt(pot.saved)}</span>
                <span className="pot-of">of {fmt(pot.target)}</span>
              </div>

              <div className="pot-actions">
                {!done && (
                  <button
                    className="btn btn-clay btn-sm"
                    onClick={() => setTopUpPot(pot)}
                  >
                    + Add money
                  </button>
                )}
                {done && (
                  <span style={{ fontSize: 13, color: '#3B6D11', fontWeight: 500 }}>🎉 Goal reached!</span>
                )}
                <button className="btn btn-sm" onClick={() => setEditPot(pot)}>Edit</button>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(pot)}>Remove</button>
              </div>
            </div>
          )
        })}

        <div className="card add-card" onClick={() => setShowAdd(true)}>
          <div className="add-icon-circle">+</div>
          <span>New pot</span>
        </div>
      </div>

      {pots.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🏺</div>
          <p>No pots yet. Create your first saving goal!</p>
        </div>
      )}

      {showAdd && (
        <PotModal
          title="New saving pot"
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editPot && (
        <PotModal
          title={`Edit "${editPot.name}"`}
          initial={editPot}
          onSave={handleEdit}
          onClose={() => setEditPot(null)}
        />
      )}

      {topUpPot && (
        <TopUpModal
          pot={topUpPot}
          accounts={accounts}
          onConfirm={(amount, allocs) => handleTopUp(topUpPot, amount, allocs)}
          onClose={() => setTopUpPot(null)}
        />
      )}
    </>
  )
}
