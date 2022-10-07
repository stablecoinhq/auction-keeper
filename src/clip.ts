import { BigNumber, ethers } from "ethers";
import {
  Clip as ClipContract,
  Clip__factory,
  Abacus as AbacusContract,
  Abacus__factory,
} from "../types/ethers-contracts/index";
/**
 * - As introduced in the Monitoring section, to locate a list of live auctions, read the active array of active auction IDs by first calling the `count()` to determine the size of the array.
- Then, for the entire array, call `getId` to read the ID in each element of the array.
- Then pass in each ID to the `sales` mapping to read the `lot` and the `top` in the `Sale` structure - this is the amount of collateral being sold and the auction starting price, respectively.
- Finally, read the `calc` (Abacus) variable in the `Clipper` contract to locate the contract that determines the price of any auction associated with said Clipper contract. 
- Next, pass in the `top` and the amount of time since the `tic` to the first and second argument, respectively,
- to the `Calc.price(top, current time - tic)` function to determine the price at which the collateral is being sold for at the `current time`. This section ends with an example that converts this description into a smart contract function.
 */

export interface ClipConfig {
  clipAddress: string;
  signer: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
}

// {
//   "id": "6",
//   "flapper": " 0xf0afc3108bb8f196cf8d076c8c4877a4c53d4e7c ",
//   "bid": "7.142857142857142857",
//   "lot": "10000.000000000000000000",
//   "beg": "1.050000000000000000",
//   "guy": " 0x00531a10c4fbd906313768d277585292aa7c923a ",
//   "era": 1530530620,
//   "tic": 1530541420,
//   "end": 1531135256,
//   "price": "1400.000000000000000028"
// }
export interface AuctionInfo {
  id: BigNumber;
  tab: BigNumber;
  lot: BigNumber;
  usr: string;
  top: BigNumber;
  currentPrice: BigNumber;
}

// 通貨毎にClipがあるので、それぞれインスタンス化必要がある
export default class Clip {
  readonly clip: ClipContract;
  private signer: ethers.Wallet;
  private provider: ethers.providers.JsonRpcProvider;
  signerAddress: string;

  constructor(args: ClipConfig) {
    const { clipAddress, signer, provider } = args;
    this.signer = signer;
    this.provider = provider;
    this.signer.connect(this.provider);
    this.signerAddress = this.signer.address;
    this.clip = Clip__factory.connect(clipAddress, this.provider);
  }

  async start() {
    const ilk = await this.clip.ilk();
    const count = await this.clip.count();
    if (count.eq(0)) {
      console.log(`No auctions available for ${ilk}`);
      return;
    }
    const abacusAddress = await this.clip.calc();
    const abacus = Abacus__factory.connect(abacusAddress, this.provider);

    const activeAuctionIds = await this.clip.list();
    const activeAuctions = await activeAuctionIds.reduce(
      async (prev, auctionId) => {
        const auctions = await prev;
        const { tic, top, pos, tab, lot, usr } = await this.clip.sales(
          auctionId
        );
        const currentTime = BigNumber.from(new Date().getTime() / 1000);
        const delta = currentTime.sub(tic);
        if (delta.lt(0)) {
          return prev;
        } else {
          const currentPrice = await abacus.price(top, delta);
          const auctionInfo = {
            id: pos,
            tic,
            top,
            tab,
            lot,
            usr,
            currentPrice,
          };
          return [...auctions, auctionInfo];
        }
      },
      Promise.resolve([]) as Promise<AuctionInfo[]>
    );
    console.log(`Active auctions: ${activeAuctions}`);
  }
}
