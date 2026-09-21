"use client";

import type { IDKitResult } from "@worldcoin/idkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { demoLetter } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { roomOf } from "@/lib/rooms";
import type {
  AppState,
  Custody,
  DemoHuman,
  IdentityKind,
  PublicIdentity,
  ReportReason,
  RoomId,
} from "@/lib/types";
import {
  mintAction,
  reportAction,
  speakAction,
  voteAction,
} from "@anon/world-id";
import {
  createSealedKey,
  forget,
  newPostId,
  remember,
  sealedIds,
  signAs,
} from "@/lib/vault";
import { CreateScreen } from "./create-screen";
import { FeedScreen } from "./feed-screen";
import { IdentitiesScreen } from "./identities-screen";
import { OnboardingScreen } from "./onboarding-screen";
import { PollsScreen, type Ballots } from "./polls-screen";
import { useWorldIdProof } from "./prove";
import { PostScreen } from "./post-screen";
import { Spinner, Toast } from "./ui";
import { VerifyScreen } from "./verify-screen";

const ONBOARDED_KEY = "anon.onboarded.v1";
const BALLOTS_KEY = "anon.ballots.v1";
const WORN_KEY = "anon.worn-sealed.v1";

/** Which sealed face this device is wearing. Never leaves the device. */
function readWorn(): string | null {
  try {
    return localStorage.getItem(WORN_KEY);
  } catch {
    return null;
  }
}

/** Per-device convenience only — never state the app depends on. */
function readOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOnboarded(value: boolean): void {
  try {
    if (value) localStorage.setItem(ONBOARDED_KEY, "1");
    else localStorage.removeItem(ONBOARDED_KEY);
  } catch {
    // Private windows and blocked storage are fine; the walkthrough just repeats.
  }
}

/**
 * Ballots are keyed on a World ID nullifier the server cannot derive, so the
 * server genuinely cannot tell this device whether it has voted. The device
 * remembers instead — per human, so switching demo humans does not leak one
 * person's ballots into another's view. The server still enforces the rule;
 * this is only what we can show you.
 */
function readBallots(humanId: string): Ballots {
  try {
    const all = JSON.parse(localStorage.getItem(BALLOTS_KEY) ?? "{}");
    return (all?.[humanId] as Ballots) ?? {};
  } catch {
    return {};
  }
}

function writeBallot(
  humanId: string,
  pollId: string,
  entry: { optionId: string; surrogateUsername: string },
): void {
  try {
    const all = JSON.parse(localStorage.getItem(BALLOTS_KEY) ?? "{}");
    all[humanId] = { ...(all[humanId] ?? {}), [pollId]: entry };
    localStorage.setItem(BALLOTS_KEY, JSON.stringify(all));
  } catch {
    // Blocked storage just means the ballot shows as uncast until you retry.
  }
}

type Tab = "feed" | "polls" | "identities";
type View =
  | { name: "boot" }
  | { name: "verify" }
  | { name: "onboarding" }
  | { name: "create" }
  | { name: "app"; tab: Tab }
  | { name: "post"; id: string };

export function AppClient() {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<View>({ name: "boot" });
  const [roomId, setRoomId] = useState<RoomId>("work");
  const [busy, setBusy] = useState(false);
  const [ballots, setBallots] = useState<Ballots>({});
  // A sealed face is never the session's active Surrogate — the session is the
  // thing it exists not to be tied to — so which one is worn lives here.
  const [wornSealed, setWornSealed] = useState<string | null>(null);
  const { prove, element: proofWidget } = useWorldIdProof();
  const [toast, setToast] = useState<{ message: string; tone: "info" | "error" } | null>(
    null,
  );

  const room = roomOf(roomId);

  const active = useMemo<PublicIdentity | null>(() => {
    if (!state) return null;
    if (wornSealed) {
      const sealed = state.surrogates.find((item) => item.id === wornSealed);
      if (sealed && sealed.status === "active") return sealed;
    }
    if (!state.activeSurrogateId) return null;
    return (
      state.surrogates.find((item) => item.id === state.activeSurrogateId) ?? null
    );
  }, [state, wornSealed]);

  const mute = useMemo(
    () => state?.mutes.find((item) => item.roomId === roomId) ?? null,
    [state, roomId],
  );

  const showToast = useCallback((message: string, tone: "info" | "error" = "info") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const run = useCallback(
    async <T extends AppState>(fn: () => Promise<T>, success?: string): Promise<T> => {
      setBusy(true);
      try {
        const next = await fn();
        setState(next);
        if (success) {
          showToast(success);
          await haptic("success");
        }
        return next;
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Something went wrong.";
        showToast(message, "error");
        await haptic("error");
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  const land = useCallback((next: AppState) => {
    setState(next);
    setBallots(next.human ? readBallots(next.human.id) : {});
    if (!next.human) setView({ name: "verify" });
    else if (!readOnboarded()) setView({ name: "onboarding" });
    else if (!next.activeSurrogateId) setView({ name: "create" });
    else setView({ name: "app", tab: "feed" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<AppState>(`/api/state?sealed=${encodeURIComponent(sealedIds().join(","))}`)
      .then((next) => {
        if (cancelled) return;
        setWornSealed(readWorn());
        land(next);
      })
      .catch(() => {
        if (!cancelled) setView({ name: "verify" });
      });
    return () => {
      cancelled = true;
    };
  }, [land]);

  /**
   * Every write goes through here so the two authorisations stay in one place:
   * a World ID proof when the act carries a uniqueness rule, and a device
   * signature when the face is sealed.
   *
   * A sealed request is sent with `credentials: "omit"`. Without that the
   * session cookie would ride along and the server could join the sealed face
   * to the human after all — which would quietly undo the entire point.
   */
  const send = useCallback(
    async (opts: {
      url: string;
      payload: Record<string, unknown>;
      worldAction?: string;
      intent?: string;
      subject?: string;
      as?: PublicIdentity | null;
    }): Promise<AppState & { removed?: boolean }> => {
      const actor = opts.as ?? active;
      const isSealed = actor?.custody === "sealed";
      const body: Record<string, unknown> = { ...opts.payload };

      if (opts.worldAction && state?.worldIdConfigured && !state.human?.demo) {
        body.proof = await prove(opts.worldAction);
      }
      if (isSealed && actor) {
        body.surrogateId = actor.id;
        if (opts.intent && opts.subject) {
          body.auth = await signAs(actor.id, opts.intent, opts.subject);
        }
        if (state?.human?.demo) body.demoHuman = state.human.demoLabel;
      }

      return api<AppState & { removed?: boolean }>(opts.url, {
        method: "POST",
        body: JSON.stringify(body),
        ...(isSealed ? { credentials: "omit" as const } : {}),
      });
    },
    [active, prove, state],
  );

  async function onDemo(human: DemoHuman) {
    const next = await run(
      () =>
        api<AppState>("/api/verify", {
          method: "POST",
          body: JSON.stringify({ mode: "demo", demoHuman: human }),
        }),
      `Signed in as demo human ${demoLetter(human)}`,
    );
    land(next);
  }

  async function onWorldId(result: IDKitResult) {
    const next = await run(() =>
      api<AppState>("/api/verify", {
        method: "POST",
        body: JSON.stringify({ mode: "world-id", idkitResponse: result }),
      }),
    );
    land(next);
  }

  async function onCreate(input: {
    kind: IdentityKind;
    username: string;
    avatarId: string;
    contextLabel?: string;
    custody: Custody;
  }) {
    if (input.custody === "sealed") {
      // The key is made first and only filed once the server has accepted the
      // face, so a failure leaves no orphaned key behind.
      const { publicKey, jwk } = await createSealedKey();
      let proof: IDKitResult | undefined;
      if (state?.worldIdConfigured && !state.human?.demo) {
        try {
          proof = await prove(mintAction(roomId));
        } catch (error) {
          showToast(
            error instanceof Error ? error.message : "Verification cancelled.",
            "error",
          );
          return;
        }
      }
      const next = await run(
        () =>
          api<AppState & { surrogateId?: string }>("/api/surrogates", {
            method: "POST",
            // No cookie: minting a sealed face must not show the server the
            // session and the new key in the same breath.
            credentials: "omit",
            body: JSON.stringify({
              ...input,
              roomId,
              publicKey,
              proof,
              demoHuman: state?.human?.demo ? state.human.demoLabel : undefined,
            }),
          }),
        `${input.username} is sealed to this device`,
      );
      if (next.surrogateId) {
        remember(next.surrogateId, jwk);
        wearSealed(next.surrogateId);
        await refresh();
      }
      setView({ name: "app", tab: "feed" });
      return;
    }

    await run(
      () =>
        api<AppState>("/api/surrogates", {
          method: "POST",
          body: JSON.stringify({ ...input, roomId, custody: "linked" }),
        }),
      `${input.username} is ready`,
    );
    wearSealed(null);
    setView({ name: "app", tab: "feed" });
  }

  function wearSealed(id: string | null) {
    setWornSealed(id);
    try {
      if (id) localStorage.setItem(WORN_KEY, id);
      else localStorage.removeItem(WORN_KEY);
    } catch {
      // Falls back to the session's linked face on the next load.
    }
  }

  /** Re-reads state, naming the sealed faces this device can prove it holds. */
  const refresh = useCallback(async () => {
    const next = await api<AppState>(
      `/api/state?sealed=${encodeURIComponent(sealedIds().join(","))}`,
    );
    setState(next);
    return next;
  }, []);

  async function onWear(id: string) {
    const target = state?.surrogates.find((item) => item.id === id);
    if (target?.custody === "sealed") {
      // Nothing to tell the server: wearing a sealed face is a local fact.
      wearSealed(id);
      showToast(`Wearing ${target.username}`);
      return;
    }
    wearSealed(null);
    await run(
      () => api<AppState>(`/api/surrogates/${id}/activate`, { method: "POST" }),
      "Face switched",
    );
  }

  async function onReport(
    target: { type: "post" | "comment"; id: string },
    reason: ReportReason,
  ) {
    const next = await run(() =>
      send({
        url: "/api/reports",
        payload: { targetType: target.type, targetId: target.id, reason },
        worldAction: reportAction(target.id),
      }),
    );
    showToast(
      next.removed
        ? "Removed — two verified humans agreed, and the author is muted here."
        : "Reported. One more human is needed to remove it.",
    );
  }

  function needFace() {
    setView({ name: "create" });
  }

  if (view.name === "boot" || !state) {
    return <Spinner label="Opening Anon" />;
  }

  const openPost =
    view.name === "post"
      ? (state.posts.find((post) => post.id === view.id) ?? null)
      : null;

  return (
    <div className="relative h-full overflow-hidden bg-paper">
      {toast && <Toast message={toast.message} tone={toast.tone} />}
      {proofWidget}

      {view.name === "verify" && (
        <VerifyScreen
          worldIdConfigured={state.worldIdConfigured}
          demoAllowed={state.demoAllowed}
          onDemo={onDemo}
          onWorldId={onWorldId}
          busy={busy}
        />
      )}

      {view.name === "onboarding" && (
        <OnboardingScreen
          onDone={() => {
            writeOnboarded(true);
            setView(
              state.activeSurrogateId
                ? { name: "app", tab: "feed" }
                : { name: "create" },
            );
          }}
        />
      )}

      {view.name === "create" && (
        <CreateScreen
          room={room}
          onCreate={onCreate}
          onBack={
            state.surrogates.some((item) => item.status === "active")
              ? () => setView({ name: "app", tab: "identities" })
              : undefined
          }
          busy={busy}
        />
      )}

      {view.name === "post" && openPost && (
        <PostScreen
          post={openPost}
          room={roomOf(openPost.roomId)}
          active={active}
          mine={state.surrogates}
          muted={Boolean(state.mutes.find((m) => m.roomId === openPost.roomId))}
          busy={busy}
          onBack={() => setView({ name: "app", tab: "feed" })}
          onWear={onWear}
          onReport={onReport}
          onComment={async (body) => {
            await run(() =>
              send({
                url: `/api/posts/${openPost.id}/comments`,
                payload: { body },
                worldAction: speakAction(openPost.id),
                intent: "comment",
                subject: openPost.id,
              }),
            );
          }}
        />
      )}

      {view.name === "app" && (
        <>
          {view.tab === "feed" && (
            <FeedScreen
              room={room}
              onRoom={setRoomId}
              posts={state.posts.filter((post) => post.roomId === roomId)}
              active={active}
              mute={mute}
              busy={busy}
              onNeedFace={needFace}
              onOpenPost={(id) => setView({ name: "post", id })}
              onCompose={async (body) => {
                // The id is chosen here so `speak:<postId>` can be proved
                // before the post exists.
                const postId = newPostId();
                await run(
                  () =>
                    send({
                      url: "/api/posts",
                      payload: { body, roomId, postId },
                      worldAction: speakAction(postId),
                      intent: "post",
                      subject: postId,
                    }),
                  "Posted",
                );
              }}
            />
          )}

          {view.tab === "polls" && (
            <PollsScreen
              polls={state.polls}
              ballots={ballots}
              roomId={roomId}
              onRoom={setRoomId}
              active={active}
              busy={busy}
              onNeedFace={needFace}
              onVote={async (pollId, optionId) => {
                // Every ballot carries its own proof, scoped to this poll
                // alone. Demo humans have no World ID, so the server
                // simulates a nullifier with the same scoping.
                let proof: IDKitResult | undefined;
                if (state.worldIdConfigured && !state.human?.demo) {
                  try {
                    proof = await prove(voteAction(pollId));
                  } catch (error) {
                    showToast(
                      error instanceof Error
                        ? error.message
                        : "Verification cancelled.",
                      "error",
                    );
                    return;
                  }
                }
                await run(
                  () =>
                    send({
                      url: `/api/polls/${pollId}/vote`,
                      payload: { optionId, proof },
                      intent: "vote",
                      subject: pollId,
                    }),
                  "Ballot counted",
                );
                if (state.human && active) {
                  writeBallot(state.human.id, pollId, {
                    optionId,
                    surrogateUsername: active.username,
                  });
                  setBallots(readBallots(state.human.id));
                }
              }}
            />
          )}

          {view.tab === "identities" && state.human && (
            <IdentitiesScreen
              human={state.human}
              surrogates={state.surrogates}
              serverView={state.serverView}
              mutes={state.mutes}
              activeId={state.activeSurrogateId}
              busy={busy}
              onCreate={needFace}
              onActivate={onWear}
              onReplay={() => {
                writeOnboarded(false);
                setView({ name: "onboarding" });
              }}
              onRetire={async (id) => {
                const target = state.surrogates.find((item) => item.id === id);
                const next = await run(
                  () =>
                    send({
                      url: `/api/surrogates/${id}/retire`,
                      payload: {},
                      intent: "retire",
                      subject: id,
                      as: target,
                    }),
                  "Retired",
                );
                if (target?.custody === "sealed") {
                  // The key is useless now; keeping it would only be a record
                  // that this face was ever yours.
                  forget(id);
                  if (wornSealed === id) wearSealed(null);
                  await refresh();
                }
                if (!next.activeSurrogateId && !wornSealed) {
                  setView({ name: "create" });
                }
              }}
              onLogout={async () => {
                await run(() => api<AppState>("/api/logout", { method: "POST" }));
                // Device keys survive sign-out on purpose: they are not tied to
                // the session, and destroying them would destroy the faces.
                wearSealed(null);
                writeOnboarded(false);
                setView({ name: "verify" });
              }}
              onDemoSwitch={state.human.demo ? onDemo : undefined}
            />
          )}

          <TabBar
            tab={view.tab}
            active={active}
            onTab={(tab) => setView({ name: "app", tab })}
          />
        </>
      )}
    </div>
  );
}

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  {
    id: "feed",
    label: "Rooms",
    icon: (
      <path
        d="M3 8l7-5 7 5v8a1 1 0 01-1 1H4a1 1 0 01-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "polls",
    label: "Ballots",
    icon: (
      <path
        d="M4 16V9M10 16V4M16 16v-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
  },
  {
    id: "identities",
    label: "Faces",
    icon: (
      <>
        <circle cx="10" cy="7.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M3.8 17c1-3.6 11.4-3.6 12.4 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

function TabBar({
  tab,
  active,
  onTab,
}: {
  tab: Tab;
  active: PublicIdentity | null;
  onTab: (tab: Tab) => void;
}) {
  return (
    <nav className="absolute inset-x-0 bottom-0 border-t border-rule bg-paper/95 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur">
      {active && (
        <p className="truncate px-6 text-center text-[11px] text-ink-3">
          Wearing {active.username}
        </p>
      )}
      <div className="grid grid-cols-3">
        {TABS.map((item) => {
          const on = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTab(item.id)}
              aria-current={on ? "page" : undefined}
              className={`flex h-12 flex-col items-center justify-center gap-0.5 transition ${
                on ? "text-ink" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                {item.icon}
              </svg>
              <span className="text-[10.5px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
