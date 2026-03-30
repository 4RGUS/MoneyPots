import { useState, useMemo } from 'react'
import { smartAllocate, availableBalance, fmt } from '../lib/allocation'

export default function TopUpModal({ pot, accounts, onConfirm, onClose }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const remaining = pot.target - pot.saved

  const { allocs, shortfall, totalAvailable } = useMemo(() => {
    const raw = parseFloat(amount) || 0
    const val = Math.min(raw, remaining)   // never allocate more than the pot needs
    if (val <= 0) return { allocs: [], shortfall: 0, totalAvailable: 0 }
    const result = smartAllocate(accounts, val)
    const totalAvailable = accounts.reduce((s, a) => s + availableBalance(a), 0)
    return { ...result, totalAvailable }
  }, [amount, accounts, remaining])

  const parsedAmount = parseFloat(amount) || 0
  const cappedAmount = Math.min(parsedAmount, remaining)
  const actualAmount = cappedAmount - shortfall

  async function handleConfirm() {
    if (parsedAmount <= 0 || allocs.length === 0) return
    setLoading(true)
    await onConfirm(actualAmount, allocs)
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">Add money to "{pot.name}"</h2>

        <div style={{ display: 'flex', gap: 16, marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, background: 'var(--clay-pale)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 2 }}>Saved</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18 }}>{fmt(pot.saved)}</div>
          </div>
          <button
            style={{ flex: 1, background: 'var(--sand)', borderRadius: 8, padding: '10px 14px', border: '1.5px dashed var(--border-med)', cursor: 'pointer', textAlign: 'left' }}
            onClick={() => setAmount(String(remaining))}
            title="Click to fill remaining amount"
          >
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 2 }}>Still needed ↵</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18 }}>{fmt(remaining)}</div>
          </button>
        </div>

        <div className="field">
          <label>Amount to add (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount"
            autoFocus
          />
        </div>

        {parsedAmount > 0 && (
          <>
            {allocs.length === 0 ? (
              <div className="topup-info" style={{ color: '#A32D2D' }}>
                No accounts have sufficient available balance.
              </div>
            ) : (
              <>
                <div className="topup-info">
                  {shortfall > 0
                    ? `⚠️ Only ${fmt(actualAmount)} available across all accounts. Shortfall: ${fmt(shortfall)}.`
                    : parsedAmount > remaining
                      ? `Amount capped to remaining goal (${fmt(remaining)}). Smart allocation applied.`
                      : `Smart allocation — highest available balance debited first.`}
                </div>
                {allocs.map(({ account, deduct }) => (
                  <div className="source-row active" key={account.id}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{account.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                        Available: {fmt(availableBalance(account))}
                        {account.type === 'savings' && ` (min bal: ${fmt(account.minBalance)})`}
                      </div>
                    </div>
                    <span className="source-deduct">− {fmt(deduct)}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-clay"
            onClick={handleConfirm}
            disabled={loading || allocs.length === 0 || parsedAmount <= 0}
          >
            {loading ? 'Adding…' : `Add ${actualAmount > 0 ? fmt(actualAmount) : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
