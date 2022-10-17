/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "./common";

export interface DogInterface extends utils.Interface {
  functions: {
    "Dirt()": FunctionFragment;
    "Hole()": FunctionFragment;
    "bark(bytes32,address,address)": FunctionFragment;
    "cage()": FunctionFragment;
    "chop(bytes32)": FunctionFragment;
    "deny(address)": FunctionFragment;
    "digs(bytes32,uint256)": FunctionFragment;
    "file(bytes32,bytes32,uint256)": FunctionFragment;
    "file(bytes32,uint256)": FunctionFragment;
    "file(bytes32,address)": FunctionFragment;
    "file(bytes32,bytes32,address)": FunctionFragment;
    "ilks(bytes32)": FunctionFragment;
    "live()": FunctionFragment;
    "rely(address)": FunctionFragment;
    "vat()": FunctionFragment;
    "vow()": FunctionFragment;
    "wards(address)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "Dirt"
      | "Hole"
      | "bark"
      | "cage"
      | "chop"
      | "deny"
      | "digs"
      | "file(bytes32,bytes32,uint256)"
      | "file(bytes32,uint256)"
      | "file(bytes32,address)"
      | "file(bytes32,bytes32,address)"
      | "ilks"
      | "live"
      | "rely"
      | "vat"
      | "vow"
      | "wards"
  ): FunctionFragment;

  encodeFunctionData(functionFragment: "Dirt", values?: undefined): string;
  encodeFunctionData(functionFragment: "Hole", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "bark",
    values: [
      PromiseOrValue<BytesLike>,
      PromiseOrValue<string>,
      PromiseOrValue<string>
    ]
  ): string;
  encodeFunctionData(functionFragment: "cage", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "chop",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "deny",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "digs",
    values: [PromiseOrValue<BytesLike>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "file(bytes32,bytes32,uint256)",
    values: [
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "file(bytes32,uint256)",
    values: [PromiseOrValue<BytesLike>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "file(bytes32,address)",
    values: [PromiseOrValue<BytesLike>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "file(bytes32,bytes32,address)",
    values: [
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<string>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "ilks",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(functionFragment: "live", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "rely",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(functionFragment: "vat", values?: undefined): string;
  encodeFunctionData(functionFragment: "vow", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "wards",
    values: [PromiseOrValue<string>]
  ): string;

  decodeFunctionResult(functionFragment: "Dirt", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "Hole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "bark", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "cage", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "chop", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "deny", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "digs", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "file(bytes32,bytes32,uint256)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "file(bytes32,uint256)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "file(bytes32,address)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "file(bytes32,bytes32,address)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "ilks", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "live", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "rely", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "vat", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "vow", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "wards", data: BytesLike): Result;

  events: {
    "Bark(bytes32,address,uint256,uint256,uint256,address,uint256)": EventFragment;
    "Cage()": EventFragment;
    "Deny(address)": EventFragment;
    "Digs(bytes32,uint256)": EventFragment;
    "File(bytes32,uint256)": EventFragment;
    "File(bytes32,address)": EventFragment;
    "File(bytes32,bytes32,uint256)": EventFragment;
    "File(bytes32,bytes32,address)": EventFragment;
    "Rely(address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "Bark"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Cage"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Deny"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Digs"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "File(bytes32,uint256)"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "File(bytes32,address)"): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "File(bytes32,bytes32,uint256)"
  ): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "File(bytes32,bytes32,address)"
  ): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Rely"): EventFragment;
}

export interface BarkEventObject {
  ilk: string;
  urn: string;
  ink: BigNumber;
  art: BigNumber;
  due: BigNumber;
  clip: string;
  id: BigNumber;
}
export type BarkEvent = TypedEvent<
  [string, string, BigNumber, BigNumber, BigNumber, string, BigNumber],
  BarkEventObject
>;

export type BarkEventFilter = TypedEventFilter<BarkEvent>;

export interface CageEventObject {}
export type CageEvent = TypedEvent<[], CageEventObject>;

export type CageEventFilter = TypedEventFilter<CageEvent>;

export interface DenyEventObject {
  usr: string;
}
export type DenyEvent = TypedEvent<[string], DenyEventObject>;

export type DenyEventFilter = TypedEventFilter<DenyEvent>;

export interface DigsEventObject {
  ilk: string;
  rad: BigNumber;
}
export type DigsEvent = TypedEvent<[string, BigNumber], DigsEventObject>;

export type DigsEventFilter = TypedEventFilter<DigsEvent>;

export interface File_bytes32_uint256_EventObject {
  what: string;
  data: BigNumber;
}
export type File_bytes32_uint256_Event = TypedEvent<
  [string, BigNumber],
  File_bytes32_uint256_EventObject
>;

export type File_bytes32_uint256_EventFilter =
  TypedEventFilter<File_bytes32_uint256_Event>;

export interface File_bytes32_address_EventObject {
  what: string;
  data: string;
}
export type File_bytes32_address_Event = TypedEvent<
  [string, string],
  File_bytes32_address_EventObject
>;

export type File_bytes32_address_EventFilter =
  TypedEventFilter<File_bytes32_address_Event>;

export interface File_bytes32_bytes32_uint256_EventObject {
  ilk: string;
  what: string;
  data: BigNumber;
}
export type File_bytes32_bytes32_uint256_Event = TypedEvent<
  [string, string, BigNumber],
  File_bytes32_bytes32_uint256_EventObject
>;

export type File_bytes32_bytes32_uint256_EventFilter =
  TypedEventFilter<File_bytes32_bytes32_uint256_Event>;

export interface File_bytes32_bytes32_address_EventObject {
  ilk: string;
  what: string;
  clip: string;
}
export type File_bytes32_bytes32_address_Event = TypedEvent<
  [string, string, string],
  File_bytes32_bytes32_address_EventObject
>;

export type File_bytes32_bytes32_address_EventFilter =
  TypedEventFilter<File_bytes32_bytes32_address_Event>;

export interface RelyEventObject {
  usr: string;
}
export type RelyEvent = TypedEvent<[string], RelyEventObject>;

export type RelyEventFilter = TypedEventFilter<RelyEvent>;

export interface Dog extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: DogInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    Dirt(overrides?: CallOverrides): Promise<[BigNumber]>;

    Hole(overrides?: CallOverrides): Promise<[BigNumber]>;

    bark(
      ilk: PromiseOrValue<BytesLike>,
      urn: PromiseOrValue<string>,
      kpr: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    cage(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    chop(
      ilk: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    deny(
      usr: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    digs(
      ilk: PromiseOrValue<BytesLike>,
      rad: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    "file(bytes32,bytes32,uint256)"(
      ilk: PromiseOrValue<BytesLike>,
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    "file(bytes32,uint256)"(
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    "file(bytes32,address)"(
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    "file(bytes32,bytes32,address)"(
      ilk: PromiseOrValue<BytesLike>,
      what: PromiseOrValue<BytesLike>,
      clip: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    ilks(
      arg0: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<
      [string, BigNumber, BigNumber, BigNumber] & {
        clip: string;
        chop: BigNumber;
        hole: BigNumber;
        dirt: BigNumber;
      }
    >;

    live(overrides?: CallOverrides): Promise<[BigNumber]>;

    rely(
      usr: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    vat(overrides?: CallOverrides): Promise<[string]>;

    vow(overrides?: CallOverrides): Promise<[string]>;

    wards(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;
  };

  Dirt(overrides?: CallOverrides): Promise<BigNumber>;

  Hole(overrides?: CallOverrides): Promise<BigNumber>;

  bark(
    ilk: PromiseOrValue<BytesLike>,
    urn: PromiseOrValue<string>,
    kpr: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  cage(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  chop(
    ilk: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  deny(
    usr: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  digs(
    ilk: PromiseOrValue<BytesLike>,
    rad: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  "file(bytes32,bytes32,uint256)"(
    ilk: PromiseOrValue<BytesLike>,
    what: PromiseOrValue<BytesLike>,
    data: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  "file(bytes32,uint256)"(
    what: PromiseOrValue<BytesLike>,
    data: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  "file(bytes32,address)"(
    what: PromiseOrValue<BytesLike>,
    data: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  "file(bytes32,bytes32,address)"(
    ilk: PromiseOrValue<BytesLike>,
    what: PromiseOrValue<BytesLike>,
    clip: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  ilks(
    arg0: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<
    [string, BigNumber, BigNumber, BigNumber] & {
      clip: string;
      chop: BigNumber;
      hole: BigNumber;
      dirt: BigNumber;
    }
  >;

  live(overrides?: CallOverrides): Promise<BigNumber>;

  rely(
    usr: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  vat(overrides?: CallOverrides): Promise<string>;

  vow(overrides?: CallOverrides): Promise<string>;

  wards(
    arg0: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  callStatic: {
    Dirt(overrides?: CallOverrides): Promise<BigNumber>;

    Hole(overrides?: CallOverrides): Promise<BigNumber>;

    bark(
      ilk: PromiseOrValue<BytesLike>,
      urn: PromiseOrValue<string>,
      kpr: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    cage(overrides?: CallOverrides): Promise<void>;

    chop(
      ilk: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    deny(usr: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;

    digs(
      ilk: PromiseOrValue<BytesLike>,
      rad: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    "file(bytes32,bytes32,uint256)"(
      ilk: PromiseOrValue<BytesLike>,
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    "file(bytes32,uint256)"(
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    "file(bytes32,address)"(
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    "file(bytes32,bytes32,address)"(
      ilk: PromiseOrValue<BytesLike>,
      what: PromiseOrValue<BytesLike>,
      clip: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    ilks(
      arg0: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<
      [string, BigNumber, BigNumber, BigNumber] & {
        clip: string;
        chop: BigNumber;
        hole: BigNumber;
        dirt: BigNumber;
      }
    >;

    live(overrides?: CallOverrides): Promise<BigNumber>;

    rely(usr: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;

    vat(overrides?: CallOverrides): Promise<string>;

    vow(overrides?: CallOverrides): Promise<string>;

    wards(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  filters: {
    "Bark(bytes32,address,uint256,uint256,uint256,address,uint256)"(
      ilk?: PromiseOrValue<BytesLike> | null,
      urn?: PromiseOrValue<string> | null,
      ink?: null,
      art?: null,
      due?: null,
      clip?: null,
      id?: PromiseOrValue<BigNumberish> | null
    ): BarkEventFilter;
    Bark(
      ilk?: PromiseOrValue<BytesLike> | null,
      urn?: PromiseOrValue<string> | null,
      ink?: null,
      art?: null,
      due?: null,
      clip?: null,
      id?: PromiseOrValue<BigNumberish> | null
    ): BarkEventFilter;

    "Cage()"(): CageEventFilter;
    Cage(): CageEventFilter;

    "Deny(address)"(usr?: PromiseOrValue<string> | null): DenyEventFilter;
    Deny(usr?: PromiseOrValue<string> | null): DenyEventFilter;

    "Digs(bytes32,uint256)"(
      ilk?: PromiseOrValue<BytesLike> | null,
      rad?: null
    ): DigsEventFilter;
    Digs(ilk?: PromiseOrValue<BytesLike> | null, rad?: null): DigsEventFilter;

    "File(bytes32,uint256)"(
      what?: PromiseOrValue<BytesLike> | null,
      data?: null
    ): File_bytes32_uint256_EventFilter;
    "File(bytes32,address)"(
      what?: PromiseOrValue<BytesLike> | null,
      data?: null
    ): File_bytes32_address_EventFilter;
    "File(bytes32,bytes32,uint256)"(
      ilk?: PromiseOrValue<BytesLike> | null,
      what?: PromiseOrValue<BytesLike> | null,
      data?: null
    ): File_bytes32_bytes32_uint256_EventFilter;
    "File(bytes32,bytes32,address)"(
      ilk?: PromiseOrValue<BytesLike> | null,
      what?: PromiseOrValue<BytesLike> | null,
      clip?: null
    ): File_bytes32_bytes32_address_EventFilter;

    "Rely(address)"(usr?: PromiseOrValue<string> | null): RelyEventFilter;
    Rely(usr?: PromiseOrValue<string> | null): RelyEventFilter;
  };

  estimateGas: {
    Dirt(overrides?: CallOverrides): Promise<BigNumber>;

    Hole(overrides?: CallOverrides): Promise<BigNumber>;

    bark(
      ilk: PromiseOrValue<BytesLike>,
      urn: PromiseOrValue<string>,
      kpr: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    cage(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    chop(
      ilk: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    deny(
      usr: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    digs(
      ilk: PromiseOrValue<BytesLike>,
      rad: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    "file(bytes32,bytes32,uint256)"(
      ilk: PromiseOrValue<BytesLike>,
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    "file(bytes32,uint256)"(
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    "file(bytes32,address)"(
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    "file(bytes32,bytes32,address)"(
      ilk: PromiseOrValue<BytesLike>,
      what: PromiseOrValue<BytesLike>,
      clip: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    ilks(
      arg0: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    live(overrides?: CallOverrides): Promise<BigNumber>;

    rely(
      usr: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    vat(overrides?: CallOverrides): Promise<BigNumber>;

    vow(overrides?: CallOverrides): Promise<BigNumber>;

    wards(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    Dirt(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    Hole(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    bark(
      ilk: PromiseOrValue<BytesLike>,
      urn: PromiseOrValue<string>,
      kpr: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    cage(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    chop(
      ilk: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    deny(
      usr: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    digs(
      ilk: PromiseOrValue<BytesLike>,
      rad: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    "file(bytes32,bytes32,uint256)"(
      ilk: PromiseOrValue<BytesLike>,
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    "file(bytes32,uint256)"(
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    "file(bytes32,address)"(
      what: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    "file(bytes32,bytes32,address)"(
      ilk: PromiseOrValue<BytesLike>,
      what: PromiseOrValue<BytesLike>,
      clip: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    ilks(
      arg0: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    live(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    rely(
      usr: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    vat(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    vow(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    wards(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}