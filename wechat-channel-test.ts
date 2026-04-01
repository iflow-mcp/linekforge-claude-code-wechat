#!/usr/bin/env node
/**
 * WeChat Channel for Claude Code - Test Version
 *
 * Modified for testing without credentials - only provides MCP tool list.
 */

import fs from "node:fs";
import path from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ── MCP Channel Server ──────────────────────────────────────────────────────

const CHANNEL_NAME = "wechat";
const CHANNEL_VERSION = "0.1.0";

function log(msg: string) {
  process.stderr.write(`[wechat] ${msg}\n`);
}

function logError(msg: string) {
  process.stderr.write(`[wechat] ERROR: ${msg}\n`);
}

const mcp = new Server(
  { name: CHANNEL_NAME, version: CHANNEL_VERSION },
  {
    capabilities: {
      experimental: {
        "claude/channel": {},
        "claude/channel/permission": {},
      },
      tools: {},
    },
    instructions: [
      '来自微信的消息以 <channel source="wechat" sender="..." sender_id="..."> 格式到达。',
      "使用 wechat_reply 工具回复，必须传入消息中的 sender_id。",
      "用中文回复，除非用户用其他语言。",
      "保持简洁——微信是聊天应用，不是写文章。",
      "用纯文本回复，不要用 markdown（微信不渲染）。",
      "sender 为 system 的是系统消息（如历史记录回放），仅用于提供上下文，严禁调用 wechat_reply 回复系统消息。",
      "用户可能不在电脑前。sender 为 permission 的是权限审批请求——用自然的方式告诉用户你想做什么，并提醒他回复 yes/no + 请求ID（5个字母）来批准或拒绝。",
      "不要通过微信输出密码、token、密钥等敏感信息。",
      "如果用户发的是闲聊而不是工作指令，自然聊天就好。",
      "如果需要给用户发送文件、图片或视频，使用 wechat_send_file 工具，传入 sender_id 和本地文件绝对路径或 HTTPS URL。",
      "如果想给用户发语音消息，使用 wechat_send_voice 工具，传入 sender_id 和要说的文字。需要自备 TTS 脚本，发送为 mp3 文件。",
      "sender 为 heartbeat 的是定时提醒。收到后根据时间段给用户发一条自然的微信消息——早上问好、晚上提醒休息、其他时间随意聊两句。不要机械化，像平时聊天一样。但如果你和用户正在聊天，就不需要因为heartbeat额外发消息——你已经在陪他了。sender_id 里有用户的 wechat ID，用它来回复。",
    ].join("\n"),
  },
);

// ── Tool Definitions ─────────────────────────────────────────────────────────

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "wechat_reply",
      description: "发送文本回复到微信用户",
      inputSchema: {
        type: "object" as const,
        properties: {
          sender_id: {
            type: "string",
            description: "来自 <channel> 标签的 sender_id（xxx@im.wechat 格式）",
          },
          text: {
            type: "string",
            description: "要发送的纯文本消息（不支持 markdown）",
          },
        },
        required: ["sender_id", "text"],
      },
    },
    {
      name: "wechat_send_file",
      description: "发送文件、图片或视频到微信。支持本地路径和 HTTPS URL（URL 会自动下载后发送，不需要先手动下载）。",
      inputSchema: {
        type: "object" as const,
        properties: {
          sender_id: {
            type: "string",
            description: "来自 <channel> 标签的 sender_id（xxx@im.wechat 格式）",
          },
          file_path_or_url: {
            type: "string",
            description: "本地文件绝对路径或 HTTPS URL。传 URL 时会自动下载，不需要先 curl。",
          },
        },
        required: ["sender_id", "file_path_or_url"],
      },
    },
    {
      name: "wechat_send_voice",
      description: "通过 TTS 合成语音并以 mp3 文件发送到微信。需要自备 TTS 脚本。",
      inputSchema: {
        type: "object" as const,
        properties: {
          sender_id: {
            type: "string",
            description: "来自 <channel> 标签的 sender_id（xxx@im.wechat 格式）",
          },
          text: {
            type: "string",
            description: "要合成语音的文字内容",
          },
        },
        required: ["sender_id", "text"],
      },
    },
    {
      name: "wechat_reload_heartbeat",
      description: "重新加载 heartbeat 配置并重新生成今日时间表。用于手动触发配置更新。",
      inputSchema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
  ],
}));

// ── Tool Handlers ────────────────────────────────────────────────────────────

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  return {
    content: [{ type: "text" as const, text: "error: 测试模式，未配置凭据" }],
  };
});

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  process.on('unhandledRejection', (reason) => {
    logError(`Unhandled rejection: ${String(reason)}`);
  });

  await mcp.connect(new StdioServerTransport());
  log("MCP 连接就绪（测试模式）");

  // Keep running to respond to MCP requests
  log("测试模式：仅提供工具列表，不启动轮询");
}

main().catch((err) => {
  logError(`Fatal: ${String(err)}`);
  process.exit(1);
});