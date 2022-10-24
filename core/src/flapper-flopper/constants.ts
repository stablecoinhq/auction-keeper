import { BigNumber } from "ethers";

export const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * 1 ether
 */
export const ONE = BigNumber.from("1000000000000000000");

/**
 * minimum price increment (1.05 means minimum 5% price increment).
 */
export const BEG = BigNumber.from("1050000000000000000");

// Each events represents function signatures
export enum FunctionSig {
  dent = "0x5ff3a38200000000000000000000000000000000000000000000000000000000",
  tend = "0x4b43ed1200000000000000000000000000000000000000000000000000000000",
  deal = "0xc959c42b00000000000000000000000000000000000000000000000000000000",
  tick = "0xfc7b6aee00000000000000000000000000000000000000000000000000000000",
}

// Flapper
// "methodIdentifiers": {
//     "beg()": "7d780d82",
//     "bids(uint256)": "4423c5f1",
//     "cage(uint256)": "a2f91af2",
//     "deal(uint256)": "c959c42b",
//     "deny(address)": "9c52a7f1",
//     "file(bytes32,uint256)": "29ae8114",
//     "gem()": "7bd2bea7",
//     "kick(uint256,uint256)": "ca40c419",
//     "kicks()": "cfdd3302",
//     "live()": "957aa58c",
//     "rely(address)": "65fae35e",
//     "tau()": "cfc4af55",
//     "tend(uint256,uint256,uint256)": "4b43ed12",
//     "tick(uint256)": "fc7b6aee",
//     "ttl()": "4e8b1dd5",
//     "vat()": "36569e77",
//     "wards(address)": "bf353dbb",
//     "yank(uint256)": "26e027f1"
// }

// Flopper
// "methodIdentifiers": {
//     "beg()": "7d780d82",
//     "bids(uint256)": "4423c5f1",
//     "cage()": "69245009",
//     "deal(uint256)": "c959c42b",
//     "dent(uint256,uint256,uint256)": "5ff3a382",
//     "deny(address)": "9c52a7f1",
//     "file(bytes32,uint256)": "29ae8114",
//     "gem()": "7bd2bea7",
//     "kick(address,uint256,uint256)": "b7e9cd24",
//     "kicks()": "cfdd3302",
//     "live()": "957aa58c",
//     "pad()": "9361266c",
//     "rely(address)": "65fae35e",
//     "tau()": "cfc4af55",
//     "tick(uint256)": "fc7b6aee",
//     "ttl()": "4e8b1dd5",
//     "vat()": "36569e77",
//     "vow()": "626cb3c5",
//     "wards(address)": "bf353dbb",
//     "yank(uint256)": "26e027f1"
// }
