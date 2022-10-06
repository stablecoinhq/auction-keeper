/* Vat.solのUrn操作に関するイベントを解析するライブラリ
 */

export interface Address {
  value: string;
}

export interface Ilk {
  value: string;
}

interface UrnKey {
  ilk: Ilk;
  urnAddress: Address;
}

export interface UrnsByIlk {
  ilk: Ilk;
  urnAddresses: Address[];
}

const ONE_BYTE_IN_HEX = 64;

const FUNCTION_SIGNATURES = {
  FROB: "76088703",
  FORK: "870c616d",
};

function toHex(data: string): string {
  return `0x${data}`;
}

// 与えられたデータをilkに整形する
function toIlk(data: string): Ilk {
  return { value: toHex(data) };
}

// 与えられたデータをアドレスに整形する
function toAddress(data: string): Address {
  return { value: toHex(data.slice(24)) };
}

function parseRawEvent(rawEvent: string): UrnKey[] {
  const functionSignature = rawEvent
    .slice(2) // 0x
    .slice(ONE_BYTE_IN_HEX * 2) // 最初の64バイトは無視
    .slice(0, 8); // これが関数シグネチャ

  const context = rawEvent.slice(2).slice(ONE_BYTE_IN_HEX * 2 + 8);
  // イベントの第一引数は必ずIlk
  const ilk = toIlk(context.slice(0, ONE_BYTE_IN_HEX));
  if (functionSignature === FUNCTION_SIGNATURES.FROB) {
    const urnAddress = toAddress(
      context.slice(ONE_BYTE_IN_HEX, ONE_BYTE_IN_HEX * 2)
    );
    return [
      {
        ilk: ilk,
        urnAddress: urnAddress,
      },
    ];
  } else if (functionSignature === FUNCTION_SIGNATURES.FORK) {
    const sourceAddress = toAddress(
      context.slice(ONE_BYTE_IN_HEX, ONE_BYTE_IN_HEX * 2)
    );
    const destinationAddress = toAddress(
      context.slice(ONE_BYTE_IN_HEX * 2, ONE_BYTE_IN_HEX * 3)
    );
    const sourceUrn = { ilk, urnAddress: sourceAddress };
    const destUrn = { ilk, urnAddress: destinationAddress };
    if (sourceAddress === destinationAddress) {
      return [sourceUrn];
    } else {
      return [sourceUrn, destUrn];
    }
  } else {
    return [];
  }
}

// UrnKeyをIlk毎にグループ分けする
function toUrns(urnKeys: UrnKey[]): UrnsByIlk[] {
  const ilks = Array.from(
    urnKeys.reduce((prev, curr) => {
      return prev.add(curr.ilk.value);
    }, new Set<string>())
  );
  const urns = ilks.reduce((prev, ilk) => {
    const addresses = urnKeys
      .filter((urnKey) => urnKey.ilk.value === ilk)
      .map((u) => {
        return u.urnAddress;
      });
    return prev.add({ ilk: { value: ilk }, urnAddresses: addresses });
  }, new Set<UrnsByIlk>());
  return Array.from(urns);
}

// イベントを解析する(テスト用)
export function parseEvents(rawEvents: string[]): UrnKey[] {
  return rawEvents
    .map((rawEvent) => {
      return parseRawEvent(rawEvent);
    })
    .flat();
}

// UrnをIlk毎にまとめる
export function parseEventAndGroup(rawEvent: string): UrnsByIlk[] {
  return parseEventsAndGroup([rawEvent]);
}

// イベントを解析し、Ilk毎にまとめる
export function parseEventsAndGroup(rawEvents: string[]): UrnsByIlk[] {
  const urns = rawEvents.reduce((prev, rawEvent) => {
    const urns = parseRawEvent(rawEvent);
    urns.forEach((urn) => prev.add(urn));
    return prev;
  }, new Set<UrnKey>());
  return toUrns(Array.from(urns));
}

const FROB_SAMPLE =
  "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e0760887034641552d410000000000000000000000000000000000000000000000000000000000000000000000000000004339dff1bd4f12b89127779969fa92fd500834570000000000000000000000004339dff1bd4f12b89127779969fa92fd500834570000000000000000000000004339dff1bd4f12b89127779969fa92fd500834570000000000000000000000000000000000000000000001e7e4171bf4d3a00000000000000000000000000000000000000000000000002cdf8b6115c5bca65f9100000000000000000000000000000000000000000000000000000000";
