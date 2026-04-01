import { useState } from 'react'
import type { Pot } from '../types'

const ICONS = ['🏖','🚗','🏠','💍','📱','✈️','🎓','💊','🛋','🎹','🏋️','🎮','🌿','🐾','🎂']
const COLORS = ['#E8C9A0','#A8D5BA','#B5C7E8','#E8B5B5','#C9B8E8','#E8D5A3','#B8E8D5','#E8C0B8','#C8E8B8','#E8D0C0']

type PotFormData = Omit<Pot, 'id' | 'createdAt'>

interface PotModalProps {
  title: string
  initial?: Pot
  onSave: (data: PotFormData) => Promise<void>
  onClose: () => void
}

export default function PotModal({ title, initial, onSave, onClose }: PotModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState<number | ''>(initial?.target ?? '')
  const [saved, setSaved] = useState<number | ''>(initial?.saved ?? 0)
  const [icon, setIcon] = useState(initial?.icon ?? ICONS[0])
  const [color, setColor] = useState(initial?.color ?? COLORS[0])
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [loading, setLoading] = useState(false)

  // Minimum selectable date is tomorrow
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().slice(0, 10)

  async function handleSave() {
    if (!name.trim() || !target) return
    setLoading(true)
    await onSave({
      name: name.trim(),
      target: parseFloat(String(target)),
      saved: parseFloat(String(saved)) || 0,
      icon,
      color,
      deadline: deadline || null,
    })
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{title}</h2>

        <div className="field">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dream vacation" />
        </div>

        <div className="field">
          <label>Target amount (₹)</label>
          <input type="number" value={target} onChange={e => setTarget(e.target.value === '' ? '' : Number(e.target.value))} placeholder="50000" />
        </div>

        {initial && (
          <div className="field">
            <label>Amount saved so far (₹)</label>
            <input type="number" value={saved} onChange={e => setSaved(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        )}

        <div className="field">
          <label>Complete by (optional)</label>
          <input
            type="date"
            value={deadline ?? ''}
            min={minDateStr}
            onChange={e => setDeadline(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Icon</label>
          <div className="icon-grid">
            {ICONS.map(ic => (
              <div
                key={ic}
                className={`icon-option ${icon === ic ? 'selected' : ''}`}
                onClick={() => setIcon(ic)}
              >
                {ic}
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Colour</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {COLORS.map(c => (
              <div
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  background: c,
                  cursor: 'pointer',
                  border: color === c ? '2.5px solid #7B4F2E' : '2px solid transparent',
                  outline: color === c ? '2px solid white' : 'none',
                  outlineOffset: '-3px',
                }}
              />
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-clay" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save pot'}
          </button>
        </div>
      </div>
    </div>
  )
}
