import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// ── Pots ──────────────────────────────────────────────────────────────────────

export function subscribePots(uid, cb) {
  const q = query(collection(db, 'users', uid, 'pots'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export function addPot(uid, data) {
  return addDoc(collection(db, 'users', uid, 'pots'), {
    ...data,
    saved: 0,
    createdAt: serverTimestamp(),
  })
}

export function updatePot(uid, potId, data) {
  return updateDoc(doc(db, 'users', uid, 'pots', potId), data)
}

export function deletePot(uid, potId) {
  return deleteDoc(doc(db, 'users', uid, 'pots', potId))
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export function subscribeAccounts(uid, cb) {
  const q = query(collection(db, 'users', uid, 'accounts'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export function addAccount(uid, data) {
  return addDoc(collection(db, 'users', uid, 'accounts'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export function updateAccount(uid, accId, data) {
  return updateDoc(doc(db, 'users', uid, 'accounts', accId), data)
}

export function deleteAccount(uid, accId) {
  return deleteDoc(doc(db, 'users', uid, 'accounts', accId))
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function addTransaction(uid, data) {
  return addDoc(collection(db, 'users', uid, 'transactions'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export function subscribeTransactions(uid, cb) {
  const q = query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}
