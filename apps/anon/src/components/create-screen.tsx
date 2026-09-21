"use client";

import { useMemo, useState } from "react";
import { AVATARS } from "@/lib/avatars";
import { suggestUsername, usernameError } from "@/lib/usernames";
import type { Custody, IdentityKind, Room } from "@/lib/types";
import { Avatar } from "./avatar";
import { Button, Eyebrow, Field, Rule, Tag } from "./ui";

type Props = {
  room: Room;
  onCreate: (input: {
    kind: IdentityKind;
    username: string;
    avatarId: string;
    contextLabel?: string;
    custody: Custody;
  }) => Promise<void>;
  onBack?: () => void;
  busy: boolean;
};

const CUSTODY: Array<{
  id: Custody;
  name: string;
  blurb: string;
  cost: string;
}> = [
  {
    id: "linked",
    name: "Linked to you",
    blurb:
      "Anon knows this face is yours, so it follows you to a new phone and sits in your wardrobe wherever you sign in.",
    cost: "Anon can tell this face and your other linked faces are one person.",
  },
  {
    id: "sealed",
    name: "Sealed to this device",
    blurb:
      "The key lives on this phone and nowhere else. Anon holds only a public key and cannot tell this face apart from a stranger's.",
    cost: "Lose the phone and the face is gone. There is no recovery, and one per room.",
  },
];

const KINDS: Array<{
  id: IdentityKind;
  name: string;
  blurb: string;
}> = [
  {
    id: "context",
    name: "Context",
    blurb: "Tied to one part of life. Reputation builds here and nowhere else.",
  },
  {
    id: "persistent",
    name: "Persistent",
    blurb: "A long-lived face you return to across rooms.",
  },
  {
    id: "disposable",
    name: "Disposable",
    blurb: "Burns in 24 hours, or the moment you say so.",
  },
];

export function CreateScreen({ room, onCreate, onBack, busy }: Props) {
  const [kind, setKind] = useState<IdentityKind>("context");
  const [custody, setCustody] = useState<Custody>("linked");
  const [contextLabel, setContextLabel] = useState(room.name);
  const [username, setUsername] = useState(() => suggestUsername());
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const [touched, setTouched] = useState(false);

  const nameError = useMemo(
    () => (touched ? usernameError(username) : null),
    [username, touched],
  );
  const ready = !nameError && username.trim().length > 0 && !busy;

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="shrink-0 px-6 pt-[max(20px,env(safe-area-inset-top))]">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 flex items-center gap-1 pt-2 text-[13px] text-ink-3 hover:text-ink"
          >
            <span aria-hidden>←</span> Back
          </button>
        )}
        <div className="pt-3">
          <Eyebrow>New Surrogate</Eyebrow>
          <h1 className="mt-1.5 font-display text-[30px] leading-[1.08] text-ink">
            Who speaks in {room.name}?
          </h1>
          <p className="mt-2.5 max-w-[21rem] text-[14px] leading-6 text-ink-2">
            {room.blurb}
          </p>
        </div>
        <Rule className="mt-4" />
      </header>

      <div className="no-scrollbar flex-1 space-y-7 overflow-y-auto px-6 pb-40 pt-5">
        <section>
          <Eyebrow>Kind</Eyebrow>
          <div className="mt-3 space-y-2">
            {KINDS.map((option) => {
              const on = kind === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setKind(option.id)}
                  aria-pressed={on}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    on
                      ? "border-ink bg-paper-2"
                      : "border-rule bg-paper-2/60 hover:border-rule-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-[17px] text-ink">
                      {option.name}
                    </span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        on ? "border-ink bg-ink" : "border-rule-strong"
                      }`}
                    >
                      {on && (
                        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                          <path
                            d="M1 5.2l2.6 2.6L9 2.4"
                            fill="none"
                            stroke="#fbf9f4"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-ink-2">
                    {option.blurb}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {kind === "context" && (
          <section className="animate-rise">
            <Field
              label="Context"
              value={contextLabel}
              onChange={setContextLabel}
              placeholder="Work, Health, …"
              maxLength={24}
              hint="The part of life this face belongs to."
            />
          </section>
        )}

        <section>
          <Eyebrow>How it is held</Eyebrow>
          <div className="mt-3 space-y-2">
            {CUSTODY.map((option) => {
              const on = custody === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCustody(option.id)}
                  aria-pressed={on}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    on
                      ? "border-ink bg-paper"
                      : "border-rule bg-paper/60 hover:border-rule-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-[17px] text-ink">
                      {option.name}
                    </span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        on ? "border-ink bg-ink" : "border-rule-strong"
                      }`}
                    >
                      {on && (
                        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                          <path
                            d="M1 5.2l2.6 2.6L9 2.4"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-ink-2">
                    {option.blurb}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-5 text-ink-3">
                    <span className="font-medium text-ink">Cost:</span>{" "}
                    {option.cost}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <Field
            label="Username"
            value={username}
            onChange={(value) => {
              setUsername(value);
              setTouched(true);
            }}
            placeholder="Quiet Harbor"
            maxLength={24}
            error={nameError}
            hint="Shown on everything this face says. Nobody can reuse it later."
          />
          <button
            type="button"
            onClick={() => {
              setUsername(suggestUsername(Date.now() + Math.floor(Math.random() * 999)));
              setTouched(false);
            }}
            className="mt-2 text-[13px] text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            Suggest another
          </button>
        </section>

        <section>
          <Eyebrow>Face</Eyebrow>
          <div className="mt-3 grid grid-cols-6 gap-2.5">
            {AVATARS.map((avatar) => {
              const on = avatar.id === avatarId;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setAvatarId(avatar.id)}
                  aria-label={avatar.name}
                  aria-pressed={on}
                  className={`rounded-xl p-0.5 transition ${
                    on ? "ring-2 ring-ink" : "ring-1 ring-transparent hover:ring-rule-strong"
                  }`}
                >
                  <Avatar id={avatar.id} size={44} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-rule bg-paper-2 p-4">
          <Eyebrow>Preview</Eyebrow>
          <div className="mt-3 flex items-center gap-3">
            <Avatar id={avatarId} size={44} />
            <div className="min-w-0">
              <p className="truncate font-display text-[17px] text-ink">
                {username.trim() || "Unnamed"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Tag>{kind}</Tag>
                {custody === "sealed" && <Tag variant="solid">Sealed</Tag>}
                {kind === "context" && contextLabel.trim() && (
                  <span className="text-[12px] text-ink-3">
                    {contextLabel.trim()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-rule bg-paper/95 px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <Button
          disabled={!ready}
          onClick={() =>
            onCreate({
              kind,
              username,
              avatarId,
              contextLabel: kind === "context" ? contextLabel : undefined,
              custody,
            })
          }
        >
          {busy ? "Creating…" : "Create this Surrogate"}
        </Button>
      </div>
    </div>
  );
}
