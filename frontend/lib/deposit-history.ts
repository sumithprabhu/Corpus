const STORAGE_KEY = "corpus_deposit_events_v1"

export type DepositEvent = {
  at: string
  wallet: string
  txHash: `0x${string}`
  amountWei: string
  amountLabel: string
}

function loadAll(): DepositEvent[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as DepositEvent[]) : []
  } catch {
    return []
  }
}

function saveAll(events: DepositEvent[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

export function getDepositEventsForWallet(wallet: string): DepositEvent[] {
  const w = wallet.toLowerCase()
  return loadAll()
    .filter((e) => e.wallet?.toLowerCase() === w)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export function appendDepositEvent(event: DepositEvent) {
  const all = loadAll()
  all.push(event)
  saveAll(all)
}

export function sumDepositWeiForWallet(wallet: string): bigint {
  const w = wallet.toLowerCase()
  return loadAll()
    .filter((e) => e.wallet?.toLowerCase() === w)
    .reduce((acc, e) => acc + BigInt(e.amountWei || "0"), BigInt(0))
}
