"use client";

import { useMemo, useState } from "react";
import { REPORT_REASONS, type PublicIdentity, type PublicPost, type ReportReason, type Room } from "@/lib/types";
import { Avatar } from "./avatar";
import { PostByline } from "./feed-screen";
import { Button, Card, Eyebrow, Rule, Sheet, Tag } from "./ui";

type Target = { type: "post" | "comment"; id: string; author: string };

type Props = {
  post: PublicPost;
  room: Room;
  active: PublicIdentity | null;
  /** Every Surrogate this human owns, used to spot the face they already wear here. */
  mine: PublicIdentity[];
  muted: boolean;
  onBack: () => void;
  onComment: (body: string) => Promise<void>;
  onReport: (target: Target, reason: ReportReason) => Promise<void>;
  onWear: (surrogateId: string) => Promise<void>;
  busy: boolean;
};

const REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Harassment or abuse",
  identifying: "Trying to identify someone",
  spam: "Spam",
  offtopic: "Wrong room",
};

export function PostScreen({
  post,
  room,
  active,
  mine,
  muted,
  onBack,
  onComment,
  onReport,
  onWear,
  busy,
}: Props) {
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<Target | null>(null);

  // One human, one voice per thread. The server enforces it on a key it can
  // check; the client works it out from the faces it already knows, so the rule
  // shows up before someone writes a reply they cannot send.
  const worn = useMemo(() => {
    const ids = new Set(mine.map((surrogate) => surrogate.id));
    const here = [post, ...post.comments].find((entry) => ids.has(entry.author.id));
    return here ? (mine.find((s) => s.id === here.author.id) ?? null) : null;
  }, [mine, post]);

  const locked = Boolean(worn && active && worn.id !== active.id);
  const removed = post.status === "removed";

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="shrink-0 px-6 pt-[max(20px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"
          >
            <span aria-hidden>←</span> {room.name}
          </button>
          {!post.mine && !removed && (
            <button
              type="button"
              onClick={() =>
                setTarget({ type: "post", id: post.id, author: post.author.username })
              }
              disabled={post.reportedByMe}
              className="text-[13px] text-ink-3 underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
            >
              {post.reportedByMe ? "Reported" : "Report"}
            </button>
          )}
        </div>
        <Rule className="mt-3" />
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-40 pt-5">
        <PostByline author={post.author} createdAt={post.createdAt} mine={post.mine} />
        <p
          className={`mt-4 text-[18px] leading-[1.6] ${
            removed ? "italic text-ink-3" : "text-ink"
          }`}
        >
          {post.body}
        </p>
        {post.reports > 0 && !removed && (
          <div className="mt-3">
            <Tag variant="solid">{post.reports} report{post.reports === 1 ? "" : "s"}</Tag>
          </div>
        )}

        <div className="mt-8">
          <Eyebrow>
            {post.comments.length} {post.comments.length === 1 ? "reply" : "replies"}
          </Eyebrow>
        </div>

        <div className="mt-3 space-y-2.5">
          {post.comments.length === 0 && (
            <p className="py-6 text-center text-[14px] text-ink-3">
              No replies yet.
            </p>
          )}
          {post.comments.map((comment) => (
            <Card key={comment.id}>
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <PostByline
                    author={comment.author}
                    createdAt={comment.createdAt}
                    mine={comment.mine}
                  />
                  {!comment.mine && comment.status !== "removed" && (
                    <button
                      type="button"
                      onClick={() =>
                        setTarget({
                          type: "comment",
                          id: comment.id,
                          author: comment.author.username,
                        })
                      }
                      disabled={comment.reportedByMe}
                      aria-label={`Report ${comment.author.username}`}
                      className="shrink-0 text-[12px] text-ink-3 underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
                    >
                      {comment.reportedByMe ? "Reported" : "Report"}
                    </button>
                  )}
                </div>
                <p
                  className={`mt-2.5 text-[14.5px] leading-6 ${
                    comment.status === "removed" ? "italic text-ink-3" : "text-ink"
                  }`}
                >
                  {comment.body}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-rule bg-paper/95 px-6 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {removed ? (
          <p className="py-2 text-center text-[13px] text-ink-3">
            This thread was removed.
          </p>
        ) : muted ? (
          <p className="py-2 text-center text-[13px] font-medium text-ink">
            You are muted in {room.name}. A new Surrogate will not lift it.
          </p>
        ) : !active ? (
          <p className="py-2 text-center text-[13px] text-ink-3">
            Choose a Surrogate to reply.
          </p>
        ) : locked ? (
          <div className="space-y-2.5 py-1">
            <p className="text-[13px] leading-5 text-ink-2">
              You are already in this thread as{" "}
              <span className="font-medium text-ink">{worn?.username}</span>. One
              human, one voice per thread.
            </p>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => worn && onWear(worn.id)}
            >
              Wear {worn?.username} to reply
            </Button>
          </div>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!body.trim()) return;
              await onComment(body);
              setBody("");
            }}
          >
            <Avatar id={active.avatarId} size={36} />
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={280}
              placeholder={`Reply as ${active.username}`}
              className="h-11 min-w-0 flex-1 rounded-full border border-rule-strong bg-paper px-4 text-[14px] text-ink outline-none placeholder:text-ink-3/70 focus:border-ink"
            />
            <Button type="submit" size="sm" full={false} disabled={busy || !body.trim()}>
              Send
            </Button>
          </form>
        )}
      </div>

      <Sheet
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={`Report ${target?.author ?? ""}`}
      >
        <p className="text-[13.5px] leading-6 text-ink-2">
          Reports are counted per verified human, so a second Surrogate cannot
          pile on. Two humans agreeing removes the post and mutes its author in{" "}
          {room.name} for a day.
        </p>
        <div className="mt-4 space-y-2">
          {REPORT_REASONS.map((reason) => (
            <Button
              key={reason}
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                const current = target;
                setTarget(null);
                if (current) await onReport(current, reason);
              }}
            >
              {REASON_LABELS[reason]}
            </Button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
