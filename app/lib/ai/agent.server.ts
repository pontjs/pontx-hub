import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import type { RunAgentInput } from "@ag-ui/core";
import { EventType } from "@ag-ui/core";
import type { AiConfiguration } from "./config.server";
import { agentToolDefinitions, runAgentTool } from "./tools.server";
import { estimateModelCostMicros } from "./usage.server";

type ReadyConfiguration = Extract<AiConfiguration, { status: "ready" }>;
type Emit = (event: Record<string, unknown>) => void;
const TURN_COST_GUARD_MICROS = 150_000;

export class AgentRunError extends Error {
  constructor(
    message: string,
    public readonly usage: { inputTokens: number; outputTokens: number; costMicros: number }
  ) {
    super(message);
    this.name = "AgentRunError";
  }
}

const SYSTEM_PROMPT = `You are Pontx Agent, an execution-oriented API agent. Help users discover, understand, authenticate, price, preview, call, and integrate only APIs in the curated Pontx catalog.

Rules:
- Search before choosing a resource, then inspect the exact stable resource ID.
- Use approved metadata as the source of truth. Never invent parameters, schemas, auth steps, SDK availability, prices, or execution support.
- For pricing, cite the official URL and verification date. Live pricing content is unreviewed and must be labelled as such.
- Never ask for, repeat, or infer credential values. The browser owns credentials and the model only knows whether a scheme is configured.
- prepare_api_call never executes. Tell the user to review the rendered request card. Mutations always require explicit confirmation in the browser.
- Never claim a request ran unless a user-provided execution result appears in the conversation.
- Prefer concise answers with direct Pontx resource links and executable SDK/CLI code when relevant.
- Reply in the locale requested by the user context.`;

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((item): item is { type: "text"; text: string } => Boolean(item && typeof item === "object" && (item as { type?: string }).type === "text"))
    .map((item) => item.text)
    .join("\n");
}

function initialMessages(input: RunAgentInput): MessageParam[] {
  const candidates = input.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-20)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: textContent(message.content)
    }))
    .filter((message) => message.content.length > 0);
  let remaining = 24_000;
  const selected: MessageParam[] = [];
  for (const message of candidates.reverse()) {
    if (remaining <= 0) break;
    const content = message.content.slice(-remaining);
    selected.push({ ...message, content });
    remaining -= content.length;
  }
  return selected.reverse();
}

export async function runPontxAgent(
  input: RunAgentInput,
  configuration: ReadyConfiguration,
  emit: Emit,
  signal: AbortSignal
) {
  const client = new Anthropic({
    apiKey: configuration.apiKey,
    baseURL: configuration.baseUrl
  });
  const context = input.context
    .map((item) => `${item.description}: ${item.value}`)
    .join("\n")
    .slice(0, 8_000);
  const messages = initialMessages(input);
  let inputTokens = 0;
  let outputTokens = 0;

  emit({ type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId });

  try {
  while (!signal.aborted) {
    const messageId = crypto.randomUUID();
    let textStarted = false;
    const stream = client.messages.stream({
      model: configuration.model,
      max_tokens: 2_048,
      system: `${SYSTEM_PROMPT}\n\nCurrent application context:\n${context || "none"}`,
      messages,
      tools: agentToolDefinitions,
      tool_choice: { type: "auto" }
    }, { signal });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        if (!textStarted) {
          textStarted = true;
          emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });
        }
        emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: event.delta.text });
      }
    }
    const response = await stream.finalMessage();
    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;
    if (textStarted) emit({ type: EventType.TEXT_MESSAGE_END, messageId });
    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter((block) => block.type === "tool_use");
    if (!toolUses.length) break;
    const results: ToolResultBlockParam[] = [];
    let remainingToolContext = 32_000;
    for (const toolUse of toolUses) {
      emit({
        type: EventType.TOOL_CALL_START,
        toolCallId: toolUse.id,
        toolCallName: toolUse.name,
        parentMessageId: messageId
      });
      emit({ type: EventType.TOOL_CALL_ARGS, toolCallId: toolUse.id, delta: JSON.stringify(toolUse.input) });
      emit({ type: EventType.TOOL_CALL_END, toolCallId: toolUse.id });
      try {
        const result = await runAgentTool(toolUse.name, toolUse.input);
        const modelContent = result.content.slice(0, remainingToolContext);
        remainingToolContext = Math.max(0, remainingToolContext - modelContent.length);
        results.push({ type: "tool_result", tool_use_id: toolUse.id, content: modelContent || "Result omitted by the turn context guard." });
        emit({
          type: EventType.TOOL_CALL_RESULT,
          messageId: crypto.randomUUID(),
          toolCallId: toolUse.id,
          content: result.content,
          role: "tool"
        });
        if (result.uiEvent) {
          emit({ type: EventType.CUSTOM, name: result.uiEvent.name, value: result.uiEvent.value });
        }
      } catch (error) {
        const content = error instanceof Error ? error.message : "Tool failed";
        results.push({ type: "tool_result", tool_use_id: toolUse.id, content, is_error: true });
        emit({
          type: EventType.TOOL_CALL_RESULT,
          messageId: crypto.randomUUID(),
          toolCallId: toolUse.id,
          content,
          role: "tool"
        });
      }
    }
    if (
      estimateModelCostMicros(inputTokens, outputTokens, configuration) >=
      TURN_COST_GUARD_MICROS
    ) {
      const guardMessageId = crypto.randomUUID();
      emit({ type: EventType.TEXT_MESSAGE_START, messageId: guardMessageId, role: "assistant" });
      emit({
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: guardMessageId,
        delta: "This turn reached its technical cost guard. The prepared results above remain available; continue in a new message if needed."
      });
      emit({ type: EventType.TEXT_MESSAGE_END, messageId: guardMessageId });
      break;
    }
    messages.push({ role: "user", content: results });
  }

  if (signal.aborted) throw signal.reason ?? new Error("Agent turn cancelled");
  emit({
    type: EventType.RUN_FINISHED,
    threadId: input.threadId,
    runId: input.runId,
    outcome: { type: "success" }
  });
  return {
    inputTokens,
    outputTokens,
    costMicros: estimateModelCostMicros(
      inputTokens,
      outputTokens,
      configuration
    )
  };
  } catch (error) {
    throw new AgentRunError(
      error instanceof Error ? error.message : "Agent turn failed",
      {
        inputTokens,
        outputTokens,
        costMicros: estimateModelCostMicros(
          inputTokens,
          outputTokens,
          configuration
        )
      }
    );
  }
}
