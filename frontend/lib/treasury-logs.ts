import { getPublicClient } from "wagmi/actions"
import type { Config } from "wagmi"
import { parseAbiItem } from "viem"
import { TREASURY_ADDRESS } from "@/lib/treasury-contract"

export type DepositLogRow = {
  txHash: `0x${string}`
  blockNumber: bigint
  user: `0x${string}`
  amount: bigint
}

export async function getDepositLogsForUser(config: Config, user: `0x${string}`): Promise<DepositLogRow[]> {
  const client = getPublicClient(config)
  const logs = await client.getLogs({
    address: TREASURY_ADDRESS,
    event: parseAbiItem("event Deposit(address indexed user, uint256 amount)"),
    args: { user },
    // NOTE: we don't know deployment block; keep it reasonably low to avoid huge queries.
    // Calibration chain is not massive, but this could still be expensive; in production we'd index.
    fromBlock: BigInt(0),
    toBlock: "latest",
  })

  return logs
    .filter((l) => l.transactionHash)
    .map((l) => ({
      txHash: l.transactionHash as `0x${string}`,
      blockNumber: l.blockNumber ?? BigInt(0),
      user: (l.args as any)?.user as `0x${string}`,
      amount: (l.args as any)?.amount as bigint,
    }))
    .sort((a, b) => Number(b.blockNumber - a.blockNumber))
}

