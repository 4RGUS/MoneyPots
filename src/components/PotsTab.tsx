import { useState } from 'react'
import { addPot, updatePot, deletePot, addTransaction } from '../lib/db'
import { fmt } from '../lib/allocation'
import type { Pot, EffectiveAccount, Alloc } from '../types'
import PotModal from './PotModal'
import TopUpModal from './TopUpModal'

interface PotsTabProps {
  uid: string
  pots: Pot[]
  accounts: EffectiveAccount[]
}

export default function PotsTab({ uid, pots, accounts }: PotsTabProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [editPot, setEditPot] = useState<Pot | null>(null)
  const [topUpPot, setTopUpPot] = useState<Pot | null>(null)
  const [rateMode, setRateMode] = useState<'month' | 'day'>('month')

  async function handleAdd(data: Omit<Pot, 'id' | 'createdAt'>) {
    await addPot(uid, data)
    setShowAdd(false)
  }

  async function handleEdit(data: Omit<Pot, 'id' | 'createdAt'>) {
    await updatePot(uid, editPot!.id, data)
    setEditPot(null)
  }

  async function handleDelete(pot: Pot) {
    if (!confirm(`Remove pot "${pot.name}"?`)) return
    await deletePot(uid, pot.id)
  }

  async function handleTopUp(pot: Pot, amount: number, allocs: Alloc[]) {
    // Account balances are never mutated — they are the user's reference values.
    // Deductions are virtual projections tracked via transactions.
    const newSaved = Math.min(pot.target, pot.saved + amount)
    await updatePot(uid, pot.id, { saved: newSaved })
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
          const rawPct = pot.target > 0 ? (pot.saved / pot.target) * 100 : 0
          const pct = Math.min(100, Math.round(rawPct))
          const pctLabel = rawPct > 0 && rawPct < 1 ? `${rawPct.toFixed(1)}%` : `${pct}%`
          const done = pct >= 100

          // Deadline calculations — fixed rates based on total goal duration
          let daysLeft: number | null = null
          let fixedDaily: number | null = null
          let fixedMonthly: number | null = null
          let overdue = false
          let onTrack: boolean | null = null
          let behindBy = 0

          if (pot.deadline && !done) {
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const end = new Date(pot.deadline)
            daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000)
            overdue = daysLeft < 0
            if (!overdue) {
              const createdDate = pot.createdAt?.toDate?.()
              if (createdDate) {
                const created = new Date(createdDate); created.setHours(0, 0, 0, 0)
                const totalDays = Math.max(1, Math.round((end.getTime() - created.getTime()) / 86400000))
                const elapsed   = Math.max(0, Math.round((today.getTime() - created.getTime()) / 86400000))
                fixedDaily   = Math.ceil(pot.target / totalDays)
                fixedMonthly = Math.ceil(pot.target / (totalDays / 30.44))
                const expectedSaved = (elapsed / totalDays) * pot.target
                onTrack  = pot.saved >= expectedSaved
                behindBy = Math.max(0, Math.ceil(expectedSaved - pot.saved))
              }
            }
          }

          return (
            <div className="card pot-card" key={pot.id}>
              <div className="pot-head">
                <div className="pot-emoji" style={{ background: pot.color }}>{pot.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="pot-title">{pot.name}</div>
                  <div className="pot-subtitle">Goal: {fmt(pot.target)}</div>
                </div>
                <span className={`pot-pct-badge ${done ? 'done' : ''}`}>{pctLabel}</span>
              </div>

              <div className="progress-track">
                <div
                  className={`progress-fill ${done ? 'done' : ''}`}
                  style={{ width: pot.saved > 0 ? `max(2%, ${Math.min(100, rawPct)}%)` : '0%' }}
                />
              </div>

              <div className="pot-amounts">
                <span className="pot-saved">{fmt(pot.saved)}</span>
                <span className="pot-of">of {fmt(pot.target)}</span>
              </div>

              {pot.deadline && !done && (
                <div className={`pot-deadline ${overdue ? 'overdue' : onTrack === false ? 'behind' : ''}`}>
                  {overdue
                    ? `⚠ Overdue by ${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) !== 1 ? 's' : ''}`
                    : daysLeft === 0
                      ? '⏰ Due today'
                      : <>
                          {`📅 ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                          {fixedDaily && (
                            <>
                              {' · '}
                              <button
                                className="deadline-rate-toggle"
                                onClick={() => setRateMode(m => m === 'month' ? 'day' : 'month')}
                                title="Switch between per month / per day"
                              >
                                {rateMode === 'month' ? `${fmt(fixedMonthly!)}/mo` : `${fmt(fixedDaily)}/day`}
                              </button>
                            </>
                          )}
                          {onTrack === true  && <span className="deadline-status ok"> · ✓ On track</span>}
                          {onTrack === false && <span className="deadline-status behind"> · ↑ {fmt(behindBy)} to catch up</span>}
                        </>
                  }
                </div>
              )}

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
