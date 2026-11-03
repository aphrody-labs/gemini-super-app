import { expect, test } from "bun:test";
import { allowsLocalRequest } from "./local_access";

test("allows local and explicitly configured origins while rejecting rebinding and remote peers", () => {
  const local = { address: "127.0.0.1" };
  const request = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers });
  expect(allowsLocalRequest(request("http://127.0.0.1:8787/api/health"), local)).toBe(true);
  expect(allowsLocalRequest(request("http://127.0.0.1:8787/api/health", { origin: "https://evil.example" }), local)).toBe(false);
  expect(allowsLocalRequest(request("http://127.0.0.1:8787/api/health", { origin: "https://gemini.google.com" }), local, "https://gemini.google.com")).toBe(true);
  expect(allowsLocalRequest(request("http://attacker.example:8787/api/health"), local)).toBe(false);
  expect(allowsLocalRequest(request("http://127.0.0.1:8787/api/health", { "sec-fetch-site": "cross-site" }), local)).toBe(false);
  expect(allowsLocalRequest(request("http://127.0.0.1:8787/api/health"), { address: "192.0.2.1" })).toBe(false);
});
