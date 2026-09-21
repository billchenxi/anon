"use client";

import { ROOM_LIST, roomOf } from "@/lib/rooms";
import type { PublicIdentity, PublicPoll, RoomId } from "@/lib/types";
import { Button, EmptyState, Eyebrow, Rule, Tag } from "./ui";

/** What this device remembers of its own ballots. The server cannot tell it. */
export type Ballots = Record<
  string,
  { optionId: string; surrogateUsername: string }
>;

type Props = {
  polls: PublicPoll[];
  ballots: Ballots;
  roomId: RoomId;
  onRoom: (id: RoomId) => void;
  active: PublicIdentity | null;
  onVote: (pollId: string, optionId: string) => Promise<void>;
  onNeedFace: () => void;
  busy: boolean;
};

export function PollsScreen({
  polls,
  ballots,
  roomId,
  onRoom,
  active,
  onVote,
  onNeedFace,
  busy,
}: Props) {
  const here = polls.filter((poll) => poll.roomId === roomId);

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="shrink-0 px-6 pt-[max(20px,env(safe-area-inset-top))]">
        <nav className="flex gap-1.5 pt-2" aria-label="Rooms">
          {ROOM_LIST.map((item) => {
            const on = item.id === roomId;
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
          <Eyebrow>Ballots</Eyebrow>
          <h1 className="mt-1.5 font-display text-[30px] leading-[1.08] text-ink">
            Real humans. One ballot.
          </h1>
          <p className="mt-2 max-w-[22rem] text-[14px] leading-6 text-ink-2">
            Burner accounts can stuff an anonymous poll. A Surrogate cannot. The
            person is unique; the name stays off the record.
          </p>
        </div>
        <Rule className="mt-4" />
      </header>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-6 pb-28 pt-4">
        {here.length === 0 ? (
          <EmptyState
            title="No ballots here"
            body={`Nothing is open for a vote in ${roomOf(roomId).name} right now.`}
          />
        ) : (
          here.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              mine={ballots[poll.id]}
              active={active}
              busy={busy}
              onVote={onVote}
              onNeedFace={onNeedFace}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PollCard({
  poll,
  mine,
  active,
  busy,
  onVote,
  onNeedFace,
}: {
  poll: PublicPoll;
  mine?: { optionId: string; surrogateUsername: string };
  active: PublicIdentity | null;
  busy: boolean;
  onVote: (pollId: string, optionId: string) => Promise<void>;
  onNeedFace: () => void;
}) {
  const voted = Boolean(mine);
  const total = Math.max(1, poll.totalVotes);
  const oneHuman = poll.rule === "one_human";

  return (
    <section className="rounded-2xl border border-rule bg-paper-2 p-5">
      <div className="flex items-center justify-between gap-3">
        {/* Filled means the stricter rule: the ballot is bound to the person. */}
        <Tag variant={oneHuman ? "solid" : "outline"}>
          {oneHuman ? "One human, one vote" : "One per Surrogate"}
        </Tag>
        <span className="text-[12px] text-ink-3">
          {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
        </span>
      </div>

      <h2 className="mt-3 font-display text-[21px] leading-[1.2] text-ink">
        {poll.question}
      </h2>
      <p className="mt-2 text-[13px] leading-5 text-ink-2">{poll.description}</p>

      <div className="mt-4 space-y-2">
        {poll.options.map((option) => {
          const selected = mine?.optionId === option.id;
          const pct = voted ? Math.round((option.votes / total) * 100) : 0;
          return (
            <button
              key={option.id}
              type="button"
              disabled={busy || voted || !active}
              onClick={() => (active ? onVote(poll.id, option.id) : onNeedFace())}
              className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-ink"
                  : voted
                    ? "border-rule"
                    : "border-rule-strong hover:border-ink disabled:hover:border-rule-strong"
              }`}
            >
              {voted && (
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    selected ? "bg-ink/10" : "bg-ink/5"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-3">
                <span
                  className={`text-[14.5px] ${selected ? "font-medium text-ink" : "text-ink"}`}
                >
                  {option.label}
                </span>
                {voted && (
                  <span className="shrink-0 text-[12.5px] tabular-nums text-ink-3">
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {voted ? (
        <p className="mt-3.5 text-[12.5px] leading-5 text-ink-2">
          You voted as{" "}
          <span className="font-medium text-ink">
            {mine?.surrogateUsername}
          </span>
          .
          {oneHuman
            ? " Switching Surrogates will not grant another ballot."
            : " This poll counts one ballot per face."}
        </p>
      ) : !active ? (
        <div className="mt-3.5">
          <Button size="sm" variant="secondary" onClick={onNeedFace}>
            Create a Surrogate to vote
          </Button>
        </div>
      ) : (
        <p className="mt-3.5 text-[12.5px] leading-5 text-ink-3">
          Voting as {active.username}.{" "}
          {oneHuman
            ? "This ballot is bound to the human, not the face."
            : "This ballot is bound to this face."}
        </p>
      )}
    </section>
  );
}
