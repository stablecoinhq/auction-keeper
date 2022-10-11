/* Vat.solのUrn操作に関するイベントを解析するライブラリ
 */

export type Address = string;

export type Ilk = string;

interface UrnKey {
  ilk: Ilk;
  urnAddress: Address;
}

export function groupUrns(urnsByIlk: UrnsByIlk[]): UrnsByIlk {
  return urnsByIlk.reduce((prev, curr) => {
    for (const [urn, addrs] of curr.entries()) {
      for (const [addr] of addrs.entries()) {
        const modified = prev.get(urn)?.add(addr) || new Set<string>().add(addr);
        prev.set(urn, modified);
      }
    }
    return prev;
  }, new Map() as UrnsByIlk);
}

export type UrnsByIlk = Map<string, Set<string>>;

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
  return toHex(data);
}

// 与えられたデータをアドレスに整形する
function toAddress(data: string): Address {
  return toHex(data.slice(24));
}

function parseRawEventMap(rawEvent: string, urns: UrnsByIlk): UrnsByIlk {
  const functionSignature = rawEvent
    .slice(2) // 0x
    .slice(ONE_BYTE_IN_HEX * 2) // 最初の64バイトは無視
    .slice(0, 8); // これが関数シグネチャ

  const context = rawEvent.slice(2).slice(ONE_BYTE_IN_HEX * 2 + 8);
  // イベントの第一引数は必ずIlk
  const ilk = toIlk(context.slice(0, ONE_BYTE_IN_HEX));
  const addrs = urns.get(ilk) || new Set();
  if (functionSignature === FUNCTION_SIGNATURES.FROB) {
    const urnAddress = toAddress(
      context.slice(ONE_BYTE_IN_HEX, ONE_BYTE_IN_HEX * 2)
    );
    return urns.set(ilk, addrs.add(urnAddress));
  } else if (functionSignature === FUNCTION_SIGNATURES.FORK) {
    const sourceAddress = toAddress(
      context.slice(ONE_BYTE_IN_HEX, ONE_BYTE_IN_HEX * 2)
    );
    const destinationAddress = toAddress(
      context.slice(ONE_BYTE_IN_HEX * 2, ONE_BYTE_IN_HEX * 3)
    );
    if (sourceAddress === destinationAddress) {
      return urns.set(ilk, addrs.add(sourceAddress));
    } else {
      return urns.set(ilk, addrs.add(sourceAddress).add(destinationAddress));
    }
  } else {
    return urns;
  }
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

// イベントを解析する(テスト用)
export function parseEvents(rawEvents: string[]): UrnKey[] {
  return rawEvents
    .map((rawEvent) => {
      return parseRawEvent(rawEvent);
    })
    .flat();
}

// イベントを解析し、UrnをIlk毎にまとめる
export function parseEventAndGroup(rawEvent: string): UrnsByIlk {
  return parseEventsAndGroup([rawEvent]);
}

// イベントを解析し、UrnをIlk毎にまとめる
export function parseEventsAndGroup(
  rawEvents: string[],
  urnByIlk?: UrnsByIlk
): UrnsByIlk {
  const u = urnByIlk ? urnByIlk : new Map();
  const urns = rawEvents.reduce((prev, rawEvent) => {
    return parseRawEventMap(rawEvent, prev);
  }, u);
  return urns;
}
