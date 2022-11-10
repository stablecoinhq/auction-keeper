# Auction keeper

Core library of auction keeper

## Customizing auction bidding strategy

You can customize how the keeper bids on the auction by overriding the `bid` function.

For instance, if you want to bid on a surplus auction until the bidding price has reached 100 Mkr, you can do it like so:

```typescript
import { Auction, AuctionInfo, AuctionType } from "@auction-keeper/core";
import { BigNumber, ContractTransaction } from "ethers";

const MaxBidAmount = BigNumber.from(100).pow(BigNumber.from(10).pow(18));

/** Bid until bidding price is 100 MKR */
export class MySurplusAuction extends Auction {
  protected override async bid(
    this: Auction,
    auctionInfo: AuctionInfo
  ): Promise<ContractTransaction | undefined> {
    const { auctionType, price, lot, id } = auctionInfo;
    if (auctionType === AuctionType.Surplus && price.lt(MaxBidAmount)) {
      return this.submitBid(id, price, lot);
    }
    return undefined;
  }
}
```

For collateral auction, you can override it like so:

```typescript
import { Clip, CollateralAuctionInfo } from "@auction-keeper/core";
import { BigNumber } from "ethers";

const TARGET_PRICE = BigNumber.from(10).mul(BigNumber.from(10).pow(18));

/**
 * Bid if auction price is below target price
 */
export class MyAuction extends Clip {
  protected override async bid(
    this: Clip,
    auctionInfo: CollateralAuctionInfo,
    availableDai: BigNumber
  ): Promise<BigNumber> {
    const { auctionId, lot, auctionPrice, ended } = auctionInfo;

    const amountWeCanAfford = availableDai.div(auctionPrice);

    if (
      (auctionPrice.gte(TARGET_PRICE) || ended || availableDai.lte(0),
      amountWeCanAfford.lte(0))
    ) {
      return availableDai;
    }

    const amountToPurchase = amountWeCanAfford.lt(lot)
      ? amountWeCanAfford
      : lot;
    return this.submitBid(
      auctionId,
      availableDai,
      amountToPurchase,
      auctionPrice,
      this.signer.address
    );
  }
}
```
