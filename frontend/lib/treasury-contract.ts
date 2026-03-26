import { parseAbi } from "viem"

/** Filecoin Calibration — override with NEXT_PUBLIC_* in env. */
export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS ||
  "0x85c8629306c1976C1F3635288a6fE9BBFA4453ED") as `0x${string}`

export const USDFC_ADDRESS = (process.env.NEXT_PUBLIC_USDFC_TOKEN_ADDRESS ||
  "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0") as `0x${string}`

export const FILECOIN_CALIBRATION_CHAIN_ID = 314159

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
])

export const treasuryAbi = parseAbi([
  "function deposit(uint256 amount)",
  "function balances(address) view returns (uint256)",
  "event Deposit(address indexed user, uint256 amount)",
])
