import { useState, useMemo } from 'react'
import { smartAllocate, availableBalance, fmt } from '../lib/allocation'
import type { Pot, EffectiveAccount, Alloc } from '../types'

interface TopUpModalProps {
  pot: Pot
  accounts: EffectiveAccount[]
  onConfirm: (amount: number, allocs: Alloc[]) => Promise<void>
  onClose: () => void
}

export default function TopUpModal({ pot, accounts, onConfirm, onClose }: TopUpModalProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const remaining = pot.target - pot.saved

  // Fixed rates from total goal duration + catch-up amount if behind
  const { fixedDaily, fixedMonthly, catchUp } = useMemo<{
    fixedDaily?: number
    fixedMonthly?: number
    catchUp?: number | null
  }>(() => {
    if (!pot.deadline || !pot.createdAt) return {}
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const end = new Date(pot.deadline)
    const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000)
    if (daysLeft <= 0) return {}
    const created = new Date(pot.createdAt.toDate()); created.setHours(0, 0, 0, 0)
    const totalDays = Math.max(1, Math.round((end.getTime() - created.getTime()) / 86400000))
    const elapsed   = Math.max(0, Math.round((today.getTime() - created.getTime()) / 86400000))
    const fixedDaily   = Math.ceil(pot.target / totalDays)
    const fixedMonthly = Math.ceil(pot.target / (totalDays / 30.44))
    const expectedSaved = (elapsed / totalDays) * pot.target
    const behind = Math.ceil(expectedSaved - pot.saved)
    return { fixedDaily, fixedMonthly, catchUp: behind > 0 ? behind : null }
  }, [pot.deadline, pot.createdAt, pot.target, pot.saved])

  const { allocs, shortfall, totalAvailable } = useMemo(() => {
    const raw = parseFloat(amount) || 0
    const val = Math.min(raw, remaining)   // never allocate more than the pot needs
    if (val <= 0) return { allocs: [] as Alloc[], shortfall: 0, totalAvailable: 0 }
    const result = smartAllocate(accounts, val)
    const totalAvailable = accounts.reduce((s, a) => s + availableBalance(a), 0)
    return { ...result, totalAvailable }
  }, [amount, accounts, remaining])

  const parsedAmount = parseFloat(amount) || 0
  const cappedAmount = Math.min(parsedAmount, remaining)
  const actualAmount = cappedAmount - shortfall

  // suppress unused warning — totalAvailable is kept for future use
  void totalAvailable

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

        {(fixedDaily || fixedMonthly || catchUp) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
            {fixedMonthly && (
              <button className="topup-quick-btn" onClick={() => setAmount(String(fixedMonthly))}>
                <span className="topup-quick-label">Monthly target</span>
                <span className="topup-quick-value">{fmt(fixedMonthly)}</span>
              </button>
            )}
            {fixedDaily && (
              <button className="topup-quick-btn" onClick={() => setAmount(String(fixedDaily))}>
                <span className="topup-quick-label">Daily target</span>
                <span className="topup-quick-value">{fmt(fixedDaily)}</span>
              </button>
            )}
            {catchUp && (
              <button className="topup-quick-btn" onClick={() => setAmount(String(catchUp))} style={{ borderColor: '#A32D2D' }}>
                <span className="topup-quick-label" style={{ color: '#A32D2D' }}>Catch up</span>
                <span className="topup-quick-value" style={{ color: '#A32D2D' }}>{fmt(catchUp)}</span>
              </button>
            )}
          </div>
        )}

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
