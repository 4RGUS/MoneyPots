import { useState } from 'react'
import { fmt } from '../lib/allocation'
import type { EffectiveAccount, Pot } from '../types'

interface DeficitModalProps {
  account: EffectiveAccount
  deficit: number
  contributions: Record<string, number>
  order: string[]
  pots: Pot[]
  onResolve: (strategy: 'A' | 'B' | 'C') => Promise<void>
  onClose: () => void
}

export default function DeficitModal({ account, deficit, contributions, order, pots, onResolve, onClose }: DeficitModalProps) {
  const [selected, setSelected] = useState<'A' | 'B' | 'C'>('A')
  const [loading, setLoading] = useState(false)

  const total = Object.values(contributions).reduce((a, b) => a + b, 0)

  // Preview: proportional reductions
  const bPreview = Object.entries(contributions).map(([potId, amt]) => ({
    pot: pots.find(p => p.id === potId),
    reduction: amt * (deficit / total),
  })).filter(r => r.pot != null) as Array<{ pot: Pot; reduction: number }>

  // Preview: newest-first reductions
  let rem = deficit
  const cPreview = order.map(potId => {
    const reduction = Math.min(contributions[potId] || 0, rem)
    rem = Math.max(0, rem - reduction)
    return { pot: pots.find(p => p.id === potId), reduction }
  }).filter((r): r is { pot: Pot; reduction: number } => r.pot != null && r.reduction > 0)

  async function handleApply() {
    setLoading(true)
    await onResolve(selected)
    setLoading(false)
  }

  const options: Array<{
    id: 'A' | 'B' | 'C'
    icon: string
    label: string
    desc: string
    preview: Array<{ pot: Pot; reduction: number }> | null
  }> = [
    {
      id: 'A',
      icon: '⚠',
      label: 'Warning only',
      desc: 'Save the new balance. Show a deficit indicator on this account. No pot savings are changed.',
      preview: null,
    },
    {
      id: 'B',
      icon: '~',
      label: 'Reduce proportionally',
      desc: "Spread the deficit across all affected pots based on each pot's share.",
      preview: bPreview,
    },
    {
      id: 'C',
      icon: '↓',
      label: 'Reduce newest first',
      desc: 'Absorb the deficit from the most recently funded pot first.',
      preview: cPreview,
    },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <h2 className="modal-title">Balance below committed amount</h2>

        <div className="topup-info" style={{ marginBottom: '1.25rem' }}>
          <strong>"{account.name}"</strong> new balance is <strong style={{ color: '#A32D2D' }}>{fmt(deficit)} short</strong> of the {fmt(total)} locked in pots.
          Choose how to handle this:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 10,
                border: selected === opt.id ? '2px solid var(--clay)' : '2px solid var(--border)',
                background: selected === opt.id ? 'var(--clay-light)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{opt.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: opt.preview?.length ? 8 : 0 }}>
                {opt.desc}
              </div>
              {opt.preview && opt.preview.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {opt.preview.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--ink-muted)' }}>{r.pot.icon} {r.pot.name}</span>
                      <span style={{ color: '#A32D2D', fontWeight: 500 }}>− {fmt(r.reduction)}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-clay" onClick={handleApply} disabled={loading}>
            {loading ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
