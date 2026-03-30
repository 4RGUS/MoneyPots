/**
 * Given a list of accounts and a top-up amount, returns the best allocation.
 *
 * Rules:
 * 1. Savings accounts must maintain their minBalance — only surplus is usable.
 * 2. Among usable accounts, the one with the highest available balance is
 *    debited first (greedy highest-first).
 *
 * Returns: { allocs: [{ account, deduct }], shortfall }
 */
export function smartAllocate(accounts, amount) {
  const candidates = accounts
    .map(a => ({
      account: a,
      available: a.type === 'savings'
        ? Math.max(0, a.balance - (a.minBalance || 0))
        : Math.max(0, a.balance),
    }))
    .filter(c => c.available > 0)
    .sort((a, b) => b.available - a.available)   // highest available first

  let remaining = amount
  const allocs = []

  for (const { account, available } of candidates) {
    if (remaining <= 0) break
    const deduct = Math.min(available, remaining)
    allocs.push({ account, deduct })
    remaining -= deduct
  }

  return { allocs, shortfall: Math.max(0, remaining) }
}

export function availableBalance(account) {
  if (account.type === 'savings') {
    return Math.max(0, account.balance - (account.minBalance || 0))
  }
  return Math.max(0, account.balance)
}

export function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

/**
 * Computes how much of each account's balance is committed to active pots,
 * counting transactions newest-first and stopping once each pot's current
 * `saved` amount is fully explained. This prevents double-counting when a
 * pot has been reset and topped up again.
 *
 * @param {Array} pots - live pot objects (must have id, saved)
 * @param {Array} transactions - sorted DESC by createdAt (newest first)
 * @returns {{ [accountId]: number }} committed amount per account
 */
export function computeCommitted(pots, transactions) {
  const toExplain = {}
  for (const p of pots) {
    if (p.saved > 0) toExplain[p.id] = p.saved
  }

  const committed = {}

  for (const txn of transactions) {
    const remaining = toExplain[txn.potId]
    if (!remaining) continue                          // inactive or fully explained

    const contribution = Math.min(txn.amount, remaining)
    const scale = txn.amount > 0 ? contribution / txn.amount : 0

    for (const s of txn.sources ?? []) {
      committed[s.accountId] = (committed[s.accountId] || 0) + s.deduct * scale
    }

    toExplain[txn.potId] -= contribution
    if (toExplain[txn.potId] <= 0) delete toExplain[txn.potId]
  }

  return committed
}
