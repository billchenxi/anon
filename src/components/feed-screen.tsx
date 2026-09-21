"use client";

import { useState } from "react";
import { formatTime } from "@/lib/format";
import { ROOM_LIST } from "@/lib/rooms";
import type {
  PublicIdentity,
  PublicMute,
  PublicPost,
  Room,
  RoomId,
} from "@/lib/types";
import { Avatar } from "./avatar";
import { Button, Card, EmptyState, Eyebrow, HumanMark, Rule, Sheet, Tag } from "./ui";

type Props = {
  room: Room;
  onRoom: (id: RoomId) => void;
  posts: PublicPost[];
  active: PublicIdentity | null;
  mute: PublicMute | null;
  onOpenPost: (id: string) => void;
  onCompose: (body: string) => Promise<void>;
  onNeedFace: () => void;
  busy: boolean;
};

export function FeedScreen({
  room,
  onRoom,
  posts,
  active,
  mute,
  onOpenPost,
  onCompose,
  onNeedFace,
  busy,
}: Props) {
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");

  const canSpeak = Boolean(active) && !mute;

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="shrink-0 px-6 pt-[max(20px,env(safe-area-inset-top))]">
        <nav className="flex gap-1.5 pt-2" aria-label="Rooms">
          {ROOM_LIST.map((item) => {
            const on = item.id === room.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onRoom(item.id)}
                aria-current={on ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition ${
                  on
                    ? "bg-ink text-paper-2"
                    : "border border-rule text-ink-2 hover:border-rule-strong"
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </nav>
        <div className="pt-4">
          <Eyebrow>{room.name}</Eyebrow>
          <h1 className="mt-1.5 font-display text-[30px] leading-[1.08] text-ink">
            {room.tagline}
          </h1>
          <p className="mt-2 max-w-[22rem] text-[14px] leading-6 text-ink-2">
            {room.blurb}
          </p>
        </div>
        <Rule className="mt-4" />
      </header>

      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-6 pb-32 pt-4">
        {mute && (
          <div className="rounded-2xl bg-ink p-4 text-paper">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-paper/70">
              Muted here
            </p>
            <p className="mt-1.5 text-[13.5px] leading-6 text-paper/90">
              Two verified humans reported something you wrote. You can read
              {" "}{room.name}, but not post in it until{" "}
              {new Date(mute.until).toLocaleString()}.{" "}
              <span className="font-medium text-paper">
                A new Surrogate will not lift it — the mute is on the person.
              </span>
            </p>
          </div>
        )}

        {posts.length === 0 ? (
          <EmptyState
            title="Nobody has spoken yet"
            body={`Be the first voice in ${room.name}. The room will see a verified human, not a name.`}
            action={
              canSpeak ? (
                <Button onClick={() => setComposing(true)}>Write the first post</Button>
              ) : undefined
            }
          />
        ) : (
          posts.map((post) => (
            <Card key={post.id} onClick={() => onOpenPost(post.id)}>
              <div className="p-4">
                <PostByline author={post.author} createdAt={post.createdAt} mine={post.mine} />
                <p
                  className={`mt-3 text-[15px] leading-[1.6] ${
                    post.status === "removed" ? "italic text-ink-3" : "text-ink"
                  }`}
                >
                  {post.body}
                </p>
                <div className="mt-3 flex items-center gap-3 text-[12.5px] text-ink-3">
                  <span>
                    {post.comments.length}{" "}
                    {post.comments.length === 1 ? "reply" : "replies"}
                  </span>
                  {post.reports > 0 && post.status !== "removed" && (
                    <Tag variant="solid">{post.reports} reported</Tag>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Compose stays reachable but never covers the last card. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[76px] flex justify-end px-6">
        <button
          type="button"
          onClick={() => (active ? setComposing(true) : onNeedFace())}
          disabled={Boolean(mute)}
          aria-label={`Write in ${room.name}`}
          className="pointer-events-auto grid h-13 w-13 place-items-center rounded-full bg-ink p-4 text-paper-2 shadow-lg transition hover:bg-ink-2 active:scale-95 disabled:bg-rule-strong disabled:text-ink-3"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path
              d="M9 2v14M2 9h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <Sheet
        open={composing}
        onClose={() => setComposing(false)}
        title={`Post in ${room.name}`}
      >
        {active && (
          <div className="mb-3 flex items-center gap-2">
            <Avatar id={active.avatarId} size={26} />
            <span className="text-[13px] text-ink-2">
              Speaking as {active.username}
            </span>
          </div>
        )}
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={500}
          rows={5}
          autoFocus
          placeholder={room.prompt}
          className="w-full resize-none rounded-xl border border-rule-strong bg-paper p-4 text-[15px] leading-6 text-ink outline-none placeholder:text-ink-3/70 focus:border-ink"
        />
        <div className="mb-4 mt-1.5 text-right text-[12px] text-ink-3">
          {body.length}/500
        </div>
        <Button
          disabled={busy || !body.trim()}
          onClick={async () => {
            await onCompose(body);
            setBody("");
            setComposing(false);
          }}
        >
          {busy ? "Posting…" : "Post"}
        </Button>
      </Sheet>
    </div>
  );
}

export function PostByline({
  author,
  createdAt,
  mine,
}: {
  author: PublicIdentity;
  createdAt: string;
  mine?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar id={author.avatarId} size={34} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14.5px] font-medium text-ink">
            {author.username}
          </span>
          <HumanMark />
          {mine && <Tag variant="solid">You</Tag>}
        </div>
        <p className="mt-0.5 text-[12px] text-ink-3">
          {formatTime(createdAt)} · {author.standing} in this room
        </p>
      </div>
    </div>
  );
}
