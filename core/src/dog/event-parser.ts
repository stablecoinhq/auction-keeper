import { BYTES_LENGTH, FUNCTION_SIGNATURES } from "./constants";
import { VaultCollection } from "./vault-collection";

/* Library for parsing events related to Urn operations in Vat.sol.
 */

function toHex(data: string): string {
  return `0x${data}`;
}

// Format the given data into ilk.
function toIlk(data: string): string {
  return toHex(data);
}

// Format given dat into address;
function toAddress(data: string): string {
  return toHex(data.slice(24));
}

function parseRawEventMap(
  rawEvent: string,
  vaultCollection: VaultCollection
): VaultCollection {
  const functionSignature = rawEvent
    .slice(2) // 0x
    .slice(BYTES_LENGTH * 2) // ignore first 64 bytes
    .slice(0, 8); // This is the function signature

  const context = rawEvent.slice(2).slice(BYTES_LENGTH * 2 + 8);
  // First argument is always ilks
  const ilk = toIlk(context.slice(0, BYTES_LENGTH));
  if (functionSignature === FUNCTION_SIGNATURES.FROB) {
    const urnAddress = toAddress(context.slice(BYTES_LENGTH, BYTES_LENGTH * 2));
    return vaultCollection.addVault(ilk, urnAddress);
  }
  if (functionSignature === FUNCTION_SIGNATURES.FORK) {
    const sourceAddress = toAddress(
      context.slice(BYTES_LENGTH, BYTES_LENGTH * 2)
    );
    const destinationAddress = toAddress(
      context.slice(BYTES_LENGTH * 2, BYTES_LENGTH * 3)
    );
    if (sourceAddress === destinationAddress) {
      return vaultCollection.addVault(ilk, sourceAddress);
    }
    return vaultCollection
      .addVault(ilk, sourceAddress)
      .addVault(ilk, destinationAddress);
  }
  return vaultCollection;
}

/**
 * Parse raw events
 * @param rawEvents Raw event data
 * @param vaultCollection Vault Collection
 * @returns
 */
export function parseEventsAndGroup(
  rawEvents: string[],
  vaultCollection?: VaultCollection
): VaultCollection {
  const v = vaultCollection || new VaultCollection();
  const urns = rawEvents.reduce(
    (prev, rawEvent) => parseRawEventMap(rawEvent, prev),
    v
  );
  return urns;
}

/**
 * @param rawEvent Raw event data
 * @returns Vault collection
 */
export function parseEventAndGroup(rawEvent: string): VaultCollection {
  return parseEventsAndGroup([rawEvent]);
}
