"use client";

import { Radio, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 65_536;

export function BroadcastComposer({
  publish,
}: {
  publish: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byteLength = useMemo(
    () => new TextEncoder().encode(content).length,
    [content],
  );

  async function submit() {
    setError(null);
    if (!content.trim()) {
      setError("Write an update before publishing.");
      return;
    }
    if (byteLength > MAX_BYTES) {
      setError("This broadcast is too large. Shorten it before publishing.");
      return;
    }
    setSubmitting(true);
    try {
      await publish(content.trim());
      setContent("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your broadcast could not be published.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-border bg-white p-7 max-sm:p-5">
      <div className="mb-6 flex gap-3.25">
        <span className="grid size-10.5 place-items-center rounded-xl bg-[#f0edff] text-[#4755c9]">
          <Radio size={19} />
        </span>
        <div>
          <h2 className="text-xl">New encrypted broadcast</h2>
          <p className="mt-1 text-xs text-muted">
            BeSeen freezes the audience; this browser encrypts once and wraps
            the content key separately for every recipient.
          </p>
        </div>
      </div>
      <label
        className="mb-2 block text-[13px] font-semibold"
        htmlFor="broadcast-message"
      >
        Message
      </label>
      <textarea
        className="min-h-33 w-full resize-y rounded-xl border border-border bg-white p-4 leading-[1.55] text-navy outline-none transition-[border,box-shadow] duration-150 placeholder:text-[#969db0] focus:border-brand focus:shadow-[0_0_0_3px_rgb(16_69_245/10%)]"
        id="broadcast-message"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="Share a private update…"
        rows={5}
        aria-describedby="broadcast-help broadcast-error"
        aria-invalid={Boolean(error)}
      />
      <div className="mt-3 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch max-sm:[&_button]:w-full">
        <div className="flex gap-4 text-[11px] text-muted">
          <span id="broadcast-help">Ctrl/Cmd + Enter to publish</span>
          <span
            className={byteLength > MAX_BYTES ? "font-bold text-error" : ""}
          >
            {byteLength.toLocaleString()}/{MAX_BYTES.toLocaleString()} bytes
          </span>
        </div>
        <Button
          onClick={() => void submit()}
          loading={submitting}
          icon={<Send size={17} />}
          disabled={!content.trim() || byteLength > MAX_BYTES}
        >
          Encrypt & publish
        </Button>
      </div>
      {error && (
        <p
          id="broadcast-error"
          className="mt-2 text-xs text-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  );
}
