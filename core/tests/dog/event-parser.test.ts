import { ethers } from "ethers";
import {
  parseEventAndGroup,
  parseEventsAndGroup,
} from "../../src/dog/event-parser";

function toHex(data: string): string {
  return `0x${data}`;
}

function toAddress(data: string): string {
  return toHex(data.slice(24));
}

function createIlk(): string {
  const IlkLength = 32;
  const rand = ethers.utils.randomBytes(IlkLength);
  return Buffer.from(rand).toString("hex");
}

function createAddress(): string {
  const ADDR_LENGTH = 20;
  const rand = ethers.utils.randomBytes(ADDR_LENGTH);
  return `${"0".repeat(24)}${Buffer.from(rand).toString("hex")}`;
}

function createMessage(args?: {
  ilk?: string;
  address1?: string;
  address2?: string;
}) {
  const prefix =
    "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e0";
  const event = "76088703";
  const ilk = args?.ilk || createIlk();
  const addr1 = args?.address1 || createAddress();
  const addr2 = args?.address2 || createAddress();
  return `${prefix}${event}${ilk}${addr1}${addr2}`;
}

describe("event-parser", () => {
  // Can parse Frob message
  test("Should parse frob message", () => {
    const FROB_SAMPLE =
      "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e0760887034641552d410000000000000000000000000000000000000000000000000000000000000000000000000000004339dff1bd4f12b89127779969fa92fd500834570000000000000000000000004339dff1bd4f12b89127779969fa92fd500834570000000000000000000000004339dff1bd4f12b89127779969fa92fd500834570000000000000000000000000000000000000000000001e7e4171bf4d3a00000000000000000000000000000000000000000000000002cdf8b6115c5bca65f9100000000000000000000000000000000000000000000000000000000";
    const result = parseEventAndGroup(FROB_SAMPLE);
    expect(result.size()).toBe(1);
    for (const [ilk, addresses] of result.entries()) {
      expect(ilk).toBe(
        "0x4641552d41000000000000000000000000000000000000000000000000000000"
      );
      expect(Array.from(addresses)[0]).toBe(
        "0x4339dff1bd4f12b89127779969fa92fd50083457"
      );
    }
  });
  // Can parse fork message
  test("Should parse fork message", () => {
    const FORK_SAMPLE =
      "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e0870c616d4641552d410000000000000000000000000000000000000000000000000000000000000000000000000000004339dff1bd4f12b89127779969fa92fd5008345700000000000000000000000089b78cfa322f6c5de0abceecab66aee45393cc5a0000000000000000000000004339dff1bd4f12b89127779969fa92fd500834570000000000000000000000000000000000000000000001e7e4171bf4d3a00000000000000000000000000000000000000000000000002cdf8b6115c5bca65f9100000000000000000000000000000000000000000000000000000000";
    const result = parseEventAndGroup(FORK_SAMPLE);
    expect(result.size()).toBe(1);
    for (const [ilk, addresses] of result.entries()) {
      expect(ilk).toBe(
        "0x4641552d41000000000000000000000000000000000000000000000000000000"
      );
      const [a1, a2] = Array.from(addresses);
      expect(a1).toBe("0x4339dff1bd4f12b89127779969fa92fd50083457");
      expect(a2).toBe("0x89b78cfa322f6c5de0abceecab66aee45393cc5a");
    }
  });
  // Accumulate into 1 data
  test("Should return only one", () => {
    const FORK_SAMPLE =
      "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e0870c616d4641552d410000000000000000000000000000000000000000000000000000000000000000000000000000004339dff1bd4f12b89127779969fa92fd5008345700000000000000000000000089b78cfa322f6c5de0abceecab66aee45393cc5a0000000000000000000000004339dff1bd4f12b89127779969fa92fd500834570000000000000000000000000000000000000000000001e7e4171bf4d3a00000000000000000000000000000000000000000000000002cdf8b6115c5bca65f9100000000000000000000000000000000000000000000000000000000";
    const result = parseEventsAndGroup([FORK_SAMPLE, FORK_SAMPLE, FORK_SAMPLE]);
    expect(result.size()).toBe(1);
  });
  test("Should parse multiple messages", () => {
    const msgs: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      msgs.push(createMessage());
    }
    const result = parseEventsAndGroup(msgs);
    expect(result.size()).toBe(10);
  });
  // Group if the ilk is the same
  test("Should group into ilks", () => {
    const msgs: string[] = [];
    const ilk = createIlk();
    for (let i = 0; i < 10; i += 1) {
      msgs.push(createMessage({ ilk }));
    }
    const result = parseEventsAndGroup(msgs);
    expect(result.size()).toBe(1);
    const addresses = Array.from(result.addresses()).reduce(
      (prev, curr) => prev.concat(Array.from(curr)),
      [] as string[]
    );
    expect(addresses.length).toBe(10);
  });
  // If the address is same but ilk is different
  test("Should record if ilk is different", () => {
    const msgs: string[] = [];
    const addr = createAddress();
    for (let i = 0; i < 10; i += 1) {
      msgs.push(createMessage({ address1: addr }));
    }
    const result = parseEventsAndGroup(msgs);
    expect(result.size()).toBe(10);
  });
});

describe("createAddress()", () => {
  test("isAddress", () => {
    const result = ethers.utils.isAddress(toAddress(createAddress()));
    expect(result).toBe(true);
  });
});
