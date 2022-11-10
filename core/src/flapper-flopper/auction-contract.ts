import {
  BigNumber,
  ContractTransaction,
  BytesLike,
  BaseContract,
  BigNumberish,
} from "ethers";
import type { PromiseOrValue, OnEvent } from "../types/ether-contracts/common";
import {
  LogNoteEventFilter,
  KickEventFilter as FlopperKickEventFilter,
} from "../types/ether-contracts/Flopper";
import { KickEventFilter as FlapperKickEventFilter } from "../types/ether-contracts/Flapper";

/**
 * Common interface for surplus/debt auction
 */
export interface AuctionContract extends BaseContract {
  /**
   * Obtain auction information for a specified ID
   */
  bids: (i: BigNumber) => Promise<{
    bid: BigNumber;
    lot: BigNumber;
    guy: string;
    tic: number;
    end: number;
  }>;
  /**
   * Get the maximum auction ID.
   */
  kicks: () => Promise<BigNumber>;

  /**
   * Ends the auction for the specified ID.s
   */
  deal: (n: BigNumber) => Promise<ContractTransaction>;

  /**
   * (Only surplus) bid on a auction
   */
  tend?: (
    n: BigNumberish,
    lot: BigNumber,
    bid: BigNumber
  ) => Promise<ContractTransaction>;

  /**
   * (Only debt) bid on a auction
   */
  dent?: (
    n: BigNumberish,
    lot: BigNumber,
    bid: BigNumber
  ) => Promise<ContractTransaction>;

  on: OnEvent<this>;

  /**
   * Return contract address of a MKR token contract
   */
  gem(): Promise<string>;

  /**
   * Return contract address of a Vault contract
   */
  vat(): Promise<string>;

  /**
   * Event filters
   */
  filters: {
    "Kick(uint256,uint256,uint256)"?(
      id?: null,
      lot?: null,
      bid?: null
    ): FlapperKickEventFilter;

    Kick(id?: null, lot?: null, bid?: null): FlapperKickEventFilter;

    // Only for debt/flopper
    "Kick(uint256,uint256,uint256,address)"?(
      id?: null,
      lot?: null,
      bid?: null,
      gal?: PromiseOrValue<string> | null
    ): FlopperKickEventFilter;
    Kick(
      id?: null,
      lot?: null,
      bid?: null,
      gal?: PromiseOrValue<string> | null
    ): FlopperKickEventFilter;

    "LogNote(bytes4,address,bytes32,bytes32,bytes)"(
      sig?: PromiseOrValue<BytesLike> | null,
      usr?: PromiseOrValue<string> | null,
      arg1?: PromiseOrValue<BytesLike> | null,
      arg2?: PromiseOrValue<BytesLike> | null,
      data?: null
    ): LogNoteEventFilter;
    LogNote(
      sig?: PromiseOrValue<BytesLike> | null,
      usr?: PromiseOrValue<string> | null,
      arg1?: PromiseOrValue<BytesLike> | null,
      arg2?: PromiseOrValue<BytesLike> | null,
      data?: null
    ): LogNoteEventFilter;
  };

  /**
   * Contract address of a auction contract
   */
  address: string;
}
