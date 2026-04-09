import { useState, useMemo } from 'react'
import { getPotContributions, fmt } from '../lib/allocation'
import type { Pot, Account, Transaction } from '../types'

interface FulfillModalProps {
  pot: Pot
  accounts: Account[]
  transactions: Transaction[]
  onConfirm: (contributions: Record<string, number>) => Promise<void>
  onClose: () => void
}

export default function FulfillModal({ pot, accounts, transactions, onConfirm, onClose }: FulfillModalProps) {
  const [loading, setLoading] = useState(false)

  const contributions = useMemo(() => getPotContributions(pot, transactions), [pot, transactions])

  const lines = Object.entries(contributions)
    .map(([accId, amount]) => ({ acc: accounts.find(a => a.id === accId), amount }))
    .filter(l => l.acc && l.amount > 0)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm(contributions)
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">Mark as Spent</h2>

        <p style={{ marginBottom: 16, color: 'var(--ink-muted)' }}>
          Confirming that <strong>{pot.name}</strong> ({fmt(pot.saved)}) has been spent in real life.
        </p>

        {lines.length > 0 ? (
          <>
            <p style={{ marginBottom: 8, fontWeight: 500 }}>The following accounts will be debited:</p>
            <div className="topup-info" style={{ marginBottom: 16 }}>
              {lines.map(({ acc, amount }) => (
                <div className="topup-info-row" key={acc!.id}>
                  <span>{acc!.name}</span>
                  <span style={{ color: '#A32D2D' }}>− {fmt(amount)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ marginBottom: 16, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            No account contributions found. Only the pot will be removed.
          </p>
        )}

        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 16 }}>This cannot be undone.</p>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-clay" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processing…' : 'Mark as Spent'}
          </button>
        </div>
      </div>
    </div>
  )
}
