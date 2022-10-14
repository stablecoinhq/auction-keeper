import { BYTES_LENGTH, FUNCTION_SIGNATURES } from "./constants";
import { Vault, VaultCollection } from "./vault-collection";
/* Vat.solのUrn操作に関するイベントを解析するライブラリ
 */

function toHex(data: string): string {
  return `0x${data}`;
}

// 与えられたデータをilkに整形する
function toIlk(data: string): string {
  return toHex(data);
}

// 与えられたデータをアドレスに整形する
function toAddress(data: string): string {
  return toHex(data.slice(24));
}

function parseRawEventMap(
  rawEvent: string,
  vaultCollection: VaultCollection
): VaultCollection {
  const functionSignature = rawEvent
    .slice(2) // 0x
    .slice(BYTES_LENGTH * 2) // 最初の64バイトは無視
    .slice(0, 8); // これが関数シグネチャ

  const context = rawEvent.slice(2).slice(BYTES_LENGTH * 2 + 8);
  // イベントの第一引数は必ずIlk
  const ilk = toIlk(context.slice(0, BYTES_LENGTH));
  if (functionSignature === FUNCTION_SIGNATURES.FROB) {
    const urnAddress = toAddress(context.slice(BYTES_LENGTH, BYTES_LENGTH * 2));
    return vaultCollection.addVault(ilk, urnAddress);
  } else if (functionSignature === FUNCTION_SIGNATURES.FORK) {
    const sourceAddress = toAddress(
      context.slice(BYTES_LENGTH, BYTES_LENGTH * 2)
    );
    const destinationAddress = toAddress(
      context.slice(BYTES_LENGTH * 2, BYTES_LENGTH * 3)
    );
    if (sourceAddress === destinationAddress) {
      return vaultCollection.addVault(ilk, sourceAddress);
    } else {
      return vaultCollection
        .addVault(ilk, sourceAddress)
        .addVault(ilk, destinationAddress);
    }
  } else {
    return vaultCollection;
  }
}

function parseRawEvent(rawEvent: string): Vault[] {
  const functionSignature = rawEvent
    .slice(2) // 0x
    .slice(BYTES_LENGTH * 2) // 最初の64バイトは無視
    .slice(0, 8); // これが関数シグネチャ

  const context = rawEvent.slice(2).slice(BYTES_LENGTH * 2 + 8);
  // イベントの第一引数は必ずIlk
  const ilk = toIlk(context.slice(0, BYTES_LENGTH));
  if (functionSignature === FUNCTION_SIGNATURES.FROB) {
    const urnAddress = toAddress(context.slice(BYTES_LENGTH, BYTES_LENGTH * 2));
    return [
      {
        ilk: ilk,
        address: urnAddress,
      },
    ];
  } else if (functionSignature === FUNCTION_SIGNATURES.FORK) {
    const sourceAddress = toAddress(
      context.slice(BYTES_LENGTH, BYTES_LENGTH * 2)
    );
    const destinationAddress = toAddress(
      context.slice(BYTES_LENGTH * 2, BYTES_LENGTH * 3)
    );
    const sourceUrn = { ilk, address: sourceAddress };
    const destUrn = { ilk, address: destinationAddress };
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
export function parseEvents(rawEvents: string[]): Vault[] {
  return rawEvents
    .map((rawEvent) => {
      return parseRawEvent(rawEvent);
    })
    .flat();
}

// イベントを解析し、UrnをIlk毎にまとめる
export function parseEventAndGroup(rawEvent: string): VaultCollection {
  return parseEventsAndGroup([rawEvent]);
}

// イベントを解析し、UrnをIlk毎にまとめる
export function parseEventsAndGroup(
  rawEvents: string[],
  vaultCollection?: VaultCollection
): VaultCollection {
  const v = vaultCollection || new VaultCollection();
  const urns = rawEvents.reduce((prev, rawEvent) => {
    return parseRawEventMap(rawEvent, prev);
  }, v);
  return urns;
}
