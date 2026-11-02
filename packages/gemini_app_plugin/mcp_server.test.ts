import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import {
  GEMINI_WEB_TOOLS_CATALOG,
  getMcpToolDefinitions,
  handleRpcRequest,
} from "./mcp_server";

describe("Gemini App Native Runtime Plugin & MCP Server (gemini-app-runtime)", () => {
  test("exposes all 9 eager MCP tools and 17 Gemini Web App capabilities", async () => {
    const tools = getMcpToolDefinitions();
    expect(tools.length).toBe(9);
    const names = tools.map((t) => t.name);
    expect(names).toContain("gemini_web_runtime_status");
    expect(names).toContain("gemini_web_execute_prompt");
    expect(names).toContain("gemini_web_discover_tools");
    expect(names).toContain("gemini_web_use_tool");
    expect(names).toContain("gemini_web_import_memory");
    expect(names).toContain("gemini_web_save_memory");
    expect(names).toContain("gemini_web_read_thread");
    expect(names).toContain("gemini_web_navigate");
    expect(names).toContain("gemini_windows_native_control");

    expect(GEMINI_WEB_TOOLS_CATALOG.length).toBe(17);
  });

  test("communicates with live Gemini.exe (:8789/mcp) for status, tool discovery, memory import & prompt execution", async () => {
    // 1. initialize
    const initRes = await handleRpcRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });
    expect(initRes).not.toBeNull();
    expect(
      (initRes?.result as { serverInfo: { name: string } }).serverInfo.name,
    ).toBe("gemini-app-runtime");

    // 2. gemini_web_runtime_status
    const statusRes = await handleRpcRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "gemini_web_runtime_status",
        arguments: {},
      },
    });
    const statusPayload = JSON.parse(
      (statusRes?.result as { content: Array<{ text: string }> }).content[0]
        ?.text || "{}",
    );
    expect(statusPayload.status).toBe("ok");

    // 3. gemini_web_discover_tools
    const discRes = await handleRpcRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "gemini_web_discover_tools",
        arguments: {},
      },
    });
    const discPayload = JSON.parse(
      (discRes?.result as { content: Array<{ text: string }> }).content[0]
        ?.text || "{}",
    );
    expect(discPayload.status).toBe("ok");
    expect(discPayload.catalog.length).toBe(17);

    // 4. gemini_web_import_memory
    const memRes = await handleRpcRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "gemini_web_import_memory",
        arguments: { visitSavedInfoPage: false, visitGemsPage: false },
      },
    });
    const memPayload = JSON.parse(
      (memRes?.result as { content: Array<{ text: string }> }).content[0]
        ?.text || "{}",
    );
    expect(memPayload.status).toBe("ok");
    expect(
      existsSync("C:\\Users\\aphro\\google\\config\\gemini_web_memory.json"),
    ).toBe(true);
    expect(
      existsSync(
        "C:\\Users\\aphro\\google\\.agents\\rules\\gemini-web-memory.md",
      ),
    ).toBe(true);

    // 5. gemini_web_save_memory
    const saveRes = await handleRpcRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "gemini_web_save_memory",
        arguments: {
          text: "Plugin gemini-app-runtime actif nativement dans Gemini.exe (:8789/mcp) et agy CLI.",
          syncToWebDom: false,
        },
      },
    });
    const savePayload = JSON.parse(
      (saveRes?.result as { content: Array<{ text: string }> }).content[0]
        ?.text || "{}",
    );
    expect(savePayload.status).toBe("ok");
    expect(savePayload.totalSavedInfo).toBeGreaterThanOrEqual(3);
  }, 30000);
});
