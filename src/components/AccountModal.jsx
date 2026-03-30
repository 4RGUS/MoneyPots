import { useState } from 'react'

export default function AccountModal({ title, initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [bank, setBank] = useState(initial?.bank ?? '')
  const [type, setType] = useState(initial?.type ?? 'savings')
  const [balance, setBalance] = useState(initial?.balance ?? '')
  const [minBalance, setMinBalance] = useState(initial?.minBalance ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!name.trim() || !bank.trim() || balance === '') return
    setLoading(true)
    await onSave({
      name: name.trim(),
      bank: bank.trim(),
      type,
      balance: parseFloat(balance) || 0,
      minBalance: type === 'savings' ? (parseFloat(minBalance) || 0) : 0,
    })
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{title}</h2>

        <div className="field">
          <label>Account nickname</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SBI Savings" />
        </div>

        <div className="field">
          <label>Bank name</label>
          <input value={bank} onChange={e => setBank(e.target.value)} placeholder="e.g. State Bank of India" />
        </div>

        <div className="field">
          <label>Account type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="salary">Salary account (no minimum balance)</option>
            <option value="savings">Savings account (has minimum balance)</option>
          </select>
        </div>

        {type === 'savings' && (
          <div className="field">
            <label>Minimum balance to maintain (₹)</label>
            <input
              type="number"
              value={minBalance}
              onChange={e => setMinBalance(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
        )}

        <div className="field">
          <label>Current balance (₹)</label>
          <input
            type="number"
            value={balance}
            onChange={e => setBalance(e.target.value)}
            placeholder="e.g. 85000"
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-clay" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save account'}
          </button>
        </div>
      </div>
    </div>
  )
}
