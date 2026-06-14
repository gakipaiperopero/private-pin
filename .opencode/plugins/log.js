import { appendFileSync } from "fs";
import { resolve } from "path";

const logFile = resolve(process.cwd(), "log.txt");

function timestamp() {
  return new Date().toISOString();
}

function formatToolCall(name, input, output) {
  const lines = [
    `[${timestamp()}] Tool: ${name}`,
    `  Input: ${JSON.stringify(input).slice(0, 500)}`,
  ];
  if (output) {
    lines.push(`  Output: ${JSON.stringify(output).slice(0, 500)}`);
  }
  return lines.join("\n") + "\n";
}

export default (async () => {
  return {
    "tool.execute.before": async (input, output) => {
      appendFileSync(logFile, formatToolCall(input.name, input.args, null));
    },
    "tool.execute.after": async (input, output) => {
      appendFileSync(
        logFile,
        formatToolCall(input.name, input.args, output.result)
      );
    },
    event: (event) => {
      if (event.type === "chat.message.complete") {
        appendFileSync(
          logFile,
          `[${timestamp()}] Chat response: ${
            event.data?.content?.slice(0, 200) || "(empty)"
          }\n`
        );
      }
    },
  };
})();
