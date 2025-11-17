import { execa, execaNode } from 'execa';
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '@a2a-js/sdk';
import {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
} from '@a2a-js/sdk/server';
import { Kind, Role, TaskState } from './protocol.js';

interface ClaudeMessage {
  type: string;
  subtype?: string;
  msg_type?: string;
  content?: Array<{ type: string; text?: string }>;
  message?: {
    content?: Array<{ type: string; text?: string }>;
  };
  result?: string;
  session_id?: string;
}

export class ClaudeCodeExecutor implements AgentExecutor {
  private sessions = new Map<string, string>();
  private runningProcesses = new Map<string, AbortController>();
  private allowedTools: string;
  private permissionMode: string;
  private timeoutMs: number;
  private claudePath: string;

  constructor(
    allowedTools = 'Bash,Read,Edit,Write,Grep,Glob',
    permissionMode = 'acceptEdits'
  ) {
    this.allowedTools = allowedTools;
    this.permissionMode = permissionMode;
    // Default 5 minutes, configurable via env var (in seconds)
    const timeoutSeconds = parseInt(process.env.CLAUDE_TIMEOUT_SECONDS || '300', 10);
    this.timeoutMs = timeoutSeconds * 1000;

    // Find claude executable and resolve symlink to actual script
    const whichResult = spawnSync('which', ['claude'], { encoding: 'utf8' });
    if (whichResult.status !== 0 || !whichResult.stdout.trim()) {
      throw new Error('Could not find claude executable. Install it with: npm install -g @anthropic-ai/claude-code');
    }
    const claudeSymlink = whichResult.stdout.trim();

    // Resolve symlink using readlink
    const readlinkResult = spawnSync('readlink', [claudeSymlink], { encoding: 'utf8' });
    if (readlinkResult.status === 0 && readlinkResult.stdout.trim()) {
      // Resolve relative path to absolute
      this.claudePath = resolve(dirname(claudeSymlink), readlinkResult.stdout.trim());
    } else {
      // Not a symlink, use as is
      this.claudePath = claudeSymlink;
    }
    console.log(`Found Claude at: ${this.claudePath}`);
  }

  async cancelTask(taskId: string): Promise<void> {
    const controller = this.runningProcesses.get(taskId);
    if (controller) {
      controller.abort();
      this.runningProcesses.delete(taskId);
    }
  }

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const { userMessage, task: existingTask, taskId, contextId } = requestContext;

    // Publish initial Task event if it's a new task
    if (!existingTask) {
      const initialTask: Task = {
        kind: Kind.Task,
        id: taskId,
        contextId: contextId,
        status: {
          state: TaskState.Submitted,
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        metadata: userMessage.metadata,
      };
      eventBus.publish(initialTask);
    }

    // Extract user text
    const userText = userMessage.parts
      .filter((part: any) => part.kind === Kind.Text)
      .map((part: any) => part.text)
      .join(' ');

    // Send initial working status
    eventBus.publish({
      kind: Kind.StatusUpdate,
      taskId,
      contextId,
      status: {
        state: TaskState.Working,
        timestamp: new Date().toISOString(),
      },
      final: false,
    });

    try {
      await this.executeClaudeCode(userText, contextId, taskId, eventBus);
    } catch (error) {
      console.error('Error executing Claude Code:', error);

      const errorText = error instanceof Error ? error.message : String(error);

      // Send task failed status
      eventBus.publish({
        kind: Kind.StatusUpdate,
        taskId,
        contextId,
        status: {
          state: TaskState.Failed,
          timestamp: new Date().toISOString(),
          message: {
            kind: Kind.Message,
            role: Role.Agent,
            messageId: uuidv4(),
            parts: [
              {
                kind: Kind.Text,
                text: errorText,
              },
            ],
            taskId,
            contextId,
          },
        },
        final: true,
      });
    }
  }

  private async executeClaudeCode(
    messageText: string,
    contextId: string,
    taskId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const sessionId = this.sessions.get(contextId);
    const args = this.buildCommandArgs(messageText, sessionId);

    const abortController = new AbortController();
    this.runningProcesses.set(taskId, abortController);

    try {
      const userTextPreview = messageText.substring(0, 60);
      console.log(`    → Executing: "${userTextPreview}${messageText.length > 60 ? '...' : ''}"`);

      // Use execaNode to execute claude as a Node.js script
      // Note: execa inherits environment by default, but we explicitly pass it to be sure
      const subprocess = execaNode(this.claudePath, args, {
        cancelSignal: abortController.signal,
        timeout: this.timeoutMs,
        stdin: 'ignore',
      });

      let accumulatedText = '';
      let newSessionId = sessionId;
      const stdoutLines: string[] = [];

      // Capture stdout
      subprocess.stdout?.on('data', (chunk) => {
        stdoutLines.push(chunk.toString());
      });

      // Wait for completion
      const result = await subprocess;

      // Process all stdout lines
      const allOutput = result.stdout || stdoutLines.join('');
      const lines = allOutput.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const msg: ClaudeMessage = JSON.parse(line);

          // Handle different message types
          if (msg.type === 'user' || msg.type === 'assistant') {
            // Extract text from content array (check both msg.content and msg.message.content)
            const content = msg.content || msg.message?.content;
            if (content) {
              for (const item of content) {
                if (item.type === 'text' && item.text) {
                  accumulatedText += item.text;
                }
              }
            }
          } else if (msg.type === 'system') {
            // Handle system messages (like session_id)
            if (msg.subtype === 'init' && msg.session_id) {
              newSessionId = msg.session_id;
            } else if (msg.msg_type === 'result') {
              // Final result message
              if (msg.result) {
                accumulatedText += msg.result;
              }
            }
          }
        } catch (parseError) {
          // Ignore parse errors for non-JSON lines
        }
      }

      // Wait for process to complete
      await subprocess;

      this.runningProcesses.delete(taskId);

      // Store session ID for multi-turn conversations
      if (newSessionId) {
        this.sessions.set(contextId, newSessionId);
      }

      // Send final response
      const finalText = accumulatedText || 'No response from Claude Code';
      // Crop to single line (replace newlines with space, limit to 80 chars)
      const oneLine = finalText.replace(/\s+/g, ' ').trim();
      const responsePreview = oneLine.substring(0, 80);
      console.log(`    ← Response: "${responsePreview}${oneLine.length > 80 ? '...' : ''}"`);

      eventBus.publish({
        kind: Kind.Message,
        role: Role.Agent,
        messageId: uuidv4(),
        parts: [{ kind: Kind.Text, text: finalText }],
        taskId,
        contextId,
      });

      // Send task completed status
      eventBus.publish({
        kind: Kind.StatusUpdate,
        taskId,
        contextId,
        status: {
          state: TaskState.Completed,
          timestamp: new Date().toISOString(),
        },
        final: true,
      });
    } catch (error: any) {
      this.runningProcesses.delete(taskId);

      // Extract error message from Claude Code JSON output or stderr
      let errorMessage = '';
      if (error.stdout) {
        try {
          const lines = error.stdout.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const json = JSON.parse(line);
              if (json.type === 'result' && json.is_error && json.result) {
                errorMessage = json.result;
                break;
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (!errorMessage && error.stderr) {
        errorMessage = error.stderr;
      }

      if (!errorMessage) {
        errorMessage = error.message || 'Unknown error';
      }

      const errorPreview = errorMessage.substring(0, 100);
      console.log(`    ✗ Error: "${errorPreview}${errorMessage.length > 100 ? '...' : ''}"`);

      throw new Error(`Claude Code error: ${errorMessage}`);
    }
  }

  private buildCommandArgs(messageText: string, sessionId?: string): string[] {
    const args = [
      '-p',
      messageText,
      '--output-format',
      'stream-json',
      '--verbose',
      '--allowedTools',
      this.allowedTools,
      '--permission-mode',
      this.permissionMode,
    ];

    if (sessionId) {
      args.push('--resume', sessionId);
    }

    return args;
  }
}
