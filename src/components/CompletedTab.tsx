import { useState } from 'react'
import { updatePot, deletePot } from '../lib/db'
import { fmt } from '../lib/allocation'
import type { Pot, Account, Transaction } from '../types'
import FulfillModal from './FulfillModal'

interface CompletedTabProps {
  uid: string
  pots: Pot[]
  accounts: Account[]
  transactions: Transaction[]
  onFulfill: (pot: Pot, contributions: Record<string, number>) => Promise<void>
}

export default function CompletedTab({ uid, pots, accounts, transactions, onFulfill }: CompletedTabProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [fulfillPot, setFulfillPot] = useState<Pot | null>(null)

  async function handleReset(pot: Pot) {
    if (!confirm(`Reset "${pot.name}"? This will clear the saved amount and move it back to active goals.`)) return
    setLoading(pot.id)
    await updatePot(uid, pot.id, { saved: 0 })
    setLoading(null)
  }

  async function handleDelete(pot: Pot) {
    if (!confirm(`Remove "${pot.name}"? This cannot be undone.`)) return
    setLoading(pot.id)
    await deletePot(uid, pot.id)
    setLoading(null)
  }

  if (pots.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">🏆</div>
        <p>No completed goals yet. Keep saving!</p>
      </div>
    )
  }

  return (
    <>
      <div className="card-grid">
        {pots.map(pot => (
          <div className="card pot-card completed-pot-card" key={pot.id}>
            <div className="pot-head">
              <div className="pot-emoji" style={{ background: pot.color }}>{pot.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="pot-title">{pot.name}</div>
                <div className="pot-subtitle">Goal: {fmt(pot.target)}</div>
              </div>
              <span className="pot-pct-badge done">100%</span>
            </div>

            <div className="progress-track">
              <div className="progress-fill done" style={{ width: '100%' }} />
            </div>

            <div className="pot-amounts">
              <span className="pot-saved">{fmt(pot.saved)}</span>
              <span className="pot-of">of {fmt(pot.target)}</span>
            </div>

            <div style={{ textAlign: 'center', padding: '0.5rem 0', fontSize: 22 }}>
              {pot.status === 'fulfilled' ? '✅' : '🎉'}
            </div>

            {pot.status === 'fulfilled' && (
              <div style={{ textAlign: 'center', fontSize: 12, color: '#3B6D11', background: '#EAF3DE', borderRadius: 6, padding: '3px 10px', marginBottom: 8 }}>
                Spent — money deducted from accounts
              </div>
            )}

            <div className="pot-actions">
              <button
                className="btn btn-sm btn-clay"
                onClick={() => setFulfillPot(pot)}
                disabled={loading === pot.id || pot.status === 'fulfilled'}
              >
                ✓ Mark as Spent
              </button>
              <button
                className="btn btn-sm"
                onClick={() => handleReset(pot)}
                disabled={loading === pot.id}
              >
                ↺ Reset goal
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => handleDelete(pot)}
                disabled={loading === pot.id}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {fulfillPot && (
        <FulfillModal
          pot={fulfillPot}
          accounts={accounts}
          transactions={transactions}
          onConfirm={async (contributions) => {
            await onFulfill(fulfillPot, contributions)
            setFulfillPot(null)
          }}
          onClose={() => setFulfillPot(null)}
        />
      )}
    </>
  )
}
