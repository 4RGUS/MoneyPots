import { useMemo } from 'react'
import { fmt } from '../lib/allocation'

export default function OverviewTab({ pots, accounts, transactions }) {
  // Pots with saved > 0 are the source of truth for what's "active"
  const activePotIds = useMemo(
    () => new Set(pots.filter(p => p.saved > 0).map(p => p.id)),
    [pots]
  )

  // Walk transactions newest→oldest and only accumulate up to pot.saved for each pot.
  // This ensures that if a pot was reset and topped up again, only the most recent
  // top-ups (that explain the current saved amount) are counted.
  const { potBreakdown, accountBreakdown } = useMemo(() => {
    const potMeta = {}
    for (const p of pots) potMeta[p.id] = p

    const accMeta = {}
    for (const a of accounts) accMeta[a.id] = a

    // Per-pot working state
    const potData = {}
    for (const potId of activePotIds) {
      const meta = potMeta[potId]
      if (!meta) continue
      potData[potId] = {
        id: potId,
        name: meta.name,
        icon: meta.icon ?? '🏺',
        color: meta.color ?? '#A0623A',
        saved: meta.saved,
        target: meta.target,
        sources: {},
        toExplain: meta.saved,   // how much of saved is still unaccounted for
      }
    }

    // Per-account working state
    const accData = {}

    // Transactions arrive DESC (newest first) from Firestore
    for (const txn of transactions) {
      const pot = potData[txn.potId]
      if (!pot || pot.toExplain <= 0) continue   // inactive or fully explained

      // Only count the portion of this transaction that's still needed
      const contribution = Math.min(txn.amount, pot.toExplain)
      const scale = txn.amount > 0 ? contribution / txn.amount : 0

      for (const s of txn.sources ?? []) {
        const effectiveDeduct = s.deduct * scale

        // Pot sources
        if (!pot.sources[s.accountId]) {
          pot.sources[s.accountId] = { name: s.accountName, total: 0 }
        }
        pot.sources[s.accountId].total += effectiveDeduct

        // Account deductions
        if (!accData[s.accountId]) {
          const meta = accMeta[s.accountId] || {}
          accData[s.accountId] = {
            id: s.accountId,
            name: s.accountName,
            bank: meta.bank ?? '',
            type: meta.type ?? '',
            balance: meta.balance ?? 0,
            totalDeducted: 0,
            deductions: {},
          }
        }
        if (!accData[s.accountId].deductions[txn.potId]) {
          accData[s.accountId].deductions[txn.potId] = { potName: txn.potName, total: 0 }
        }
        accData[s.accountId].deductions[txn.potId].total += effectiveDeduct
        accData[s.accountId].totalDeducted += effectiveDeduct
      }

      pot.toExplain -= contribution
    }

    // Sync current balance from live accounts data
    for (const acc of accounts) {
      if (accData[acc.id]) accData[acc.id].balance = acc.balance
    }

    return {
      potBreakdown: Object.values(potData).filter(p => Object.keys(p.sources).length > 0),
      accountBreakdown: Object.values(accData).filter(a => a.totalDeducted > 0),
    }
  }, [pots, accounts, transactions, activePotIds])

  if (potBreakdown.length === 0 && accountBreakdown.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">📊</div>
        <p>No allocations yet. Top up a pot to see your overview.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

      {/* ── Goals breakdown ───────────────────────────────────────── */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Goals breakdown</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {potBreakdown.map(pot => {
            const pct = pot.target > 0 ? Math.min(100, Math.round((pot.saved / pot.target) * 100)) : 0
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
                  <span className={`pot-pct-badge${isDone ? ' done' : ''}`}>{pct}%</span>
                </div>

                <div className="progress-track" style={{ marginBottom: '1rem' }}>
                  <div className={`progress-fill${isDone ? ' done' : ''}`} style={{ width: `${pct}%` }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.values(pot.sources).map((s, i) => (
                    <div key={i} className="overview-row">
                      <span className="overview-label">from {s.name}</span>
                      <span className="overview-value">{fmt(s.total)}</span>
                    </div>
                  ))}
                </div>
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
            // acc.balance = raw user-entered balance (never mutated by the app)
            // virtualBalance = what you'd have left if you actually moved this money
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
                  <div className="overview-row overview-row--start">
                    <span className="overview-label">Current balance</span>
                    <span className="overview-value">{fmt(acc.balance)}</span>
                  </div>

                  {Object.values(acc.deductions).map((d, i) => (
                    <div key={i} className="overview-row">
                      <span className="overview-label">→ {d.potName}</span>
                      <span className="overview-value overview-value--deduct">− {fmt(d.total)}</span>
                    </div>
                  ))}

                  <div className="overview-row overview-row--end">
                    <span style={{ fontWeight: 500 }}>After allocations</span>
                    <span className="overview-balance">{fmt(virtualBalance)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
