import { useMemo, useState } from 'react'
import { fmt } from '../lib/allocation'
import type { Pot, Account, Transaction } from '../types'

interface PotEntry {
  id: string
  name: string
  icon: string
  color: string
  saved: number
  target: number
  sources: Record<string, { name: string; total: number }>
  toExplain: number
}

interface AccEntry {
  id: string
  name: string
  bank: string
  type: string
  balance: number
  totalDeducted: number
  deductions: Record<string, { potName: string; total: number }>
}

interface OverviewTabProps {
  pots: Pot[]
  accounts: Account[]
  transactions: Transaction[]
}

export default function OverviewTab({ pots, accounts, transactions }: OverviewTabProps) {
  // Walk transactions newest→oldest and only accumulate up to pot.saved for each pot.
  // This ensures that if a pot was reset and topped up again, only the most recent
  // top-ups (that explain the current saved amount) are counted.
  const { potBreakdown, accountBreakdown } = useMemo(() => {
    // Per-pot working state — include ALL pots
    const potData: Record<string, PotEntry> = {}
    for (const p of pots) {
      potData[p.id] = {
        id: p.id,
        name: p.name,
        icon: p.icon ?? '🏺',
        color: p.color ?? '#A0623A',
        saved: p.saved,
        target: p.target,
        sources: {},
        toExplain: p.saved,
      }
    }

    // Per-account working state — include ALL accounts upfront
    const accData: Record<string, AccEntry> = {}
    for (const a of accounts) {
      accData[a.id] = {
        id: a.id,
        name: a.name,
        bank: a.bank ?? '',
        type: a.type ?? '',
        balance: a.balance ?? 0,
        totalDeducted: 0,
        deductions: {},
      }
    }

    // Transactions arrive DESC (newest first) from Firestore
    for (const txn of transactions) {
      const pot = potData[txn.potId]
      if (!pot || pot.toExplain <= 0) continue

      const contribution = Math.min(txn.amount, pot.toExplain)
      const scale = txn.amount > 0 ? contribution / txn.amount : 0

      for (const s of txn.sources ?? []) {
        const effectiveDeduct = s.deduct * scale

        if (!pot.sources[s.accountId]) {
          pot.sources[s.accountId] = { name: s.accountName, total: 0 }
        }
        pot.sources[s.accountId].total += effectiveDeduct

        const acc = accData[s.accountId]
        if (acc) {
          if (!acc.deductions[txn.potId]) {
            acc.deductions[txn.potId] = { potName: txn.potName, total: 0 }
          }
          acc.deductions[txn.potId].total += effectiveDeduct
          acc.totalDeducted += effectiveDeduct
        }
      }

      pot.toExplain -= contribution
    }

    return {
      potBreakdown: Object.values(potData),
      accountBreakdown: Object.values(accData),
    }
  }, [pots, accounts, transactions])

  const [deductMinBal, setDeductMinBal] = useState(true)

  // Spending summary
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalMinBalance = accounts.reduce((s, a) => s + (a.minBalance || 0), 0)
  const totalCommitted = accountBreakdown.reduce((s, a) => s + a.totalDeducted, 0)
  const freeToSpend = totalBalance - totalCommitted - (deductMinBal ? totalMinBalance : 0)

  if (pots.length === 0 && accounts.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">📊</div>
        <p>No pots or accounts yet. Add some to see your overview.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

      {/* ── Spending summary ──────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', gap: '0' }}>
          <div className="spend-summary-cell">
            <div className="spend-summary-label">Total balance</div>
            <div className="spend-summary-amount">{fmt(totalBalance)}</div>
          </div>
          <div className="spend-summary-divider" />
          <div className="spend-summary-cell">
            <div className="spend-summary-label">Locked in pots</div>
            <div className="spend-summary-amount" style={{ color: '#A32D2D' }}>− {fmt(totalCommitted)}</div>
          </div>
          <div className="spend-summary-divider" />
          <div className="spend-summary-cell">
            <div className="spend-summary-label">Free to spend</div>
            <div className="spend-summary-amount" style={{ color: '#3B6D11' }}>{fmt(freeToSpend)}</div>
          </div>
        </div>
        {totalMinBalance > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <button
              className={`min-bal-toggle ${deductMinBal ? 'active' : ''}`}
              onClick={() => setDeductMinBal(v => !v)}
            >
              {deductMinBal ? '✓' : ''} Deduct min. balance {deductMinBal ? `(−${fmt(totalMinBalance)})` : `(${fmt(totalMinBalance)})`}
            </button>
          </div>
        )}
      </div>

      {/* ── Goals breakdown ───────────────────────────────────────── */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Goals breakdown</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {potBreakdown.map(pot => {
            const rawPct = pot.target > 0 ? (pot.saved / pot.target) * 100 : 0
            const pct = Math.min(100, Math.round(rawPct))
            const pctLabel = rawPct > 0 && rawPct < 1 ? `${rawPct.toFixed(1)}%` : `${pct}%`
            const isDone = pct >= 100
            return (
              <div key={pot.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.85rem' }}>
                  <div className="pot-emoji" style={{ background: pot.color + '22' }}>{pot.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{pot.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      {fmt(pot.saved)} saved · target {fmt(pot.target)}
                    </div>
                  </div>
                  <span className={`pot-pct-badge${isDone ? ' done' : ''}`}>{pctLabel}</span>
                </div>

                <div className="progress-track" style={{ marginBottom: '1rem' }}>
                  <div className={`progress-fill${isDone ? ' done' : ''}`} style={{ width: pot.saved > 0 ? `max(2%, ${Math.min(100, rawPct)}%)` : '0%' }} />
                </div>

                {Object.keys(pot.sources).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.values(pot.sources).map((s, i) => (
                      <div key={i} className="overview-row">
                        <span className="overview-label">from {s.name}</span>
                        <span className="overview-value">{fmt(s.total)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>No money added yet</div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Accounts breakdown ────────────────────────────────────── */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Accounts breakdown</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {accountBreakdown.map(acc => {
            const virtualBalance = acc.balance - acc.totalDeducted
            return (
              <div key={acc.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                  <div className="acc-icon" style={{ background: 'var(--clay-light)' }}>
                    {acc.type === 'salary' ? '💼' : '🏦'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="acc-name">{acc.name}</div>
                    <div className="acc-meta">
                      {acc.bank && <span>{acc.bank}</span>}
                      {acc.type && (
                        <span className={`badge badge-${acc.type}`}>{acc.type}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className={`overview-row ${acc.totalDeducted > 0 ? 'overview-row--start' : ''}`}>
                    <span className="overview-label">Current balance</span>
                    <span className="overview-value">{fmt(acc.balance)}</span>
                  </div>

                  {Object.values(acc.deductions).map((d, i) => (
                    <div key={i} className="overview-row">
                      <span className="overview-label">→ {d.potName}</span>
                      <span className="overview-value overview-value--deduct">− {fmt(d.total)}</span>
                    </div>
                  ))}

                  {acc.totalDeducted > 0 && (
                    <div className="overview-row overview-row--end">
                      <span style={{ fontWeight: 500 }}>After allocations</span>
                      <span className="overview-balance">{fmt(virtualBalance)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
