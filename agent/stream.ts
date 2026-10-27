import { describePrivilegeError } from "./privileges";

export type StreamEvent =
  | { type: "log"; line: string }
  | {
      type: "done";
      ok: boolean;
      error?: string;
      code?: string;
      data?: Record<string, unknown>;
    };

/**
 * Runs a long, privileged job and streams its output as NDJSON
 * (`{"type":"log","line":"…"}` per line, then one `done` event). The UI reads
 * it with `fetch` + `ReadableStream` and prints it in a terminal modal.
 *
 * Call `privilegePreflight()` *before* this: once bytes are flowing the
 * response can no longer turn into a 403 for the password prompt.
 */
export function streamJob(
  run: (log: (line: string) => void) => Promise<{
    ok: boolean;
    error?: string;
    code?: string;
    data?: Record<string, unknown>;
  }>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // The browser can navigate away mid-job; enqueueing on a closed
      // controller throws, so remember it and drop further lines quietly.
      let closed = false;

      const send = (event: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      try {
        const outcome = await run((line) => send({ type: "log", line }));
        send({ type: "done", ...outcome });
      } catch (err) {
        const privilege = describePrivilegeError(err);
        send({
          type: "done",
          ok: false,
          error:
            privilege?.error ??
            (err instanceof Error ? err.message : "Command failed."),
          code: privilege?.code,
        });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // Already closed by the client disconnecting.
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // nginx and friends: don't buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
