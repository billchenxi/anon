"use client";

import { demoLetter, nextDemo, remainingLabel } from "@/lib/format";
import type {
  DemoHuman,
  PublicHuman,
  PublicIdentity,
  PublicMute,
  ServerView,
} from "@/lib/types";
import { Avatar } from "./avatar";
import { ServerViewPanel } from "./server-view";
import { Button, Card, Eyebrow, Rule, Tag } from "./ui";

type Props = {
  human: PublicHuman;
  surrogates: PublicIdentity[];
  serverView: ServerView;
  mutes: PublicMute[];
  activeId: string | null;
  onActivate: (id: string) => Promise<void>;
  onRetire: (id: string) => Promise<void>;
  onCreate: () => void;
  onLogout: () => Promise<void>;
  onReplay: () => void;
  onDemoSwitch?: (human: DemoHuman) => Promise<void>;
  busy: boolean;
};

export function IdentitiesScreen({
  human,
  surrogates,
  serverView,
  mutes,
  activeId,
  onActivate,
  onRetire,
  onCreate,
  onLogout,
  onReplay,
  onDemoSwitch,
  busy,
}: Props) {
  const active = surrogates.filter((item) => item.status === "active");
  const retired = surrogates.filter((item) => item.status === "retired");

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="shrink-0 px-6 pt-[max(20px,env(safe-area-inset-top))]">
        <div className="pt-2">
          <Eyebrow>Wardrobe</Eyebrow>
          <h1 className="mt-1.5 font-display text-[30px] leading-[1.08] text-ink">
            Your faces
          </h1>
          <p className="mt-2 max-w-[22rem] text-[14px] leading-6 text-ink-2">
            Each one carries its own reputation and nothing else.
            {human.demo
              ? ` Signed in as demo human ${demoLetter(human.demoLabel)}.`
              : ""}
          </p>
        </div>
        <Rule className="mt-4" />
      </header>

      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-6 pb-28 pt-4">
        {mutes.map((mute) => (
          <div
            key={mute.roomId}
            className="rounded-2xl bg-ink p-4"
          >
            <p className="text-[13px] leading-6 text-paper/90">
              Muted in <span className="capitalize text-paper">{mute.roomId}</span>{" "}
              until {new Date(mute.until).toLocaleString()}. The mute is on the
              person, so a new Surrogate will not lift it.
            </p>
          </div>
        ))}

        {active.map((surrogate) => (
          <IdentityCard
            key={surrogate.id}
            surrogate={surrogate}
            current={surrogate.id === activeId}
            busy={busy}
            onActivate={onActivate}
            onRetire={onRetire}
          />
        ))}

        <Button variant="secondary" onClick={onCreate} disabled={busy}>
          Create another Surrogate
        </Button>

        {surrogates.some((item) => item.custody === "sealed") && (
          <p className="px-1 text-[12.5px] leading-5 text-ink-3">
            A sealed Surrogate lives on this device only. It will not appear if
            you sign in somewhere else, and clearing this browser&rsquo;s data
            destroys it for good.
          </p>
        )}

        {retired.length > 0 && (
          <div className="pt-2">
            <Eyebrow>Retired</Eyebrow>
            <div className="mt-2.5 space-y-2">
              {retired.map((surrogate) => (
                <div
                  key={surrogate.id}
                  className="flex items-center gap-3 rounded-xl border border-rule px-3 py-2.5 opacity-70"
                >
                  <Avatar id={surrogate.avatarId} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] text-ink">
                      {surrogate.username}
                    </p>
                    <p className="text-[11.5px] text-ink-3">
                      Name stays reserved
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <ServerViewPanel view={serverView} />
        </div>

        <div className="space-y-2 pt-2">
          <Button variant="quiet" onClick={onReplay} disabled={busy}>
            Replay the walkthrough
          </Button>
          {human.demo && onDemoSwitch && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => onDemoSwitch(nextDemo(human.demoLabel))}
            >
              Switch to demo human {demoLetter(nextDemo(human.demoLabel))}
            </Button>
          )}
          <Button variant="quiet" onClick={onLogout} disabled={busy}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

function IdentityCard({
  surrogate,
  current,
  busy,
  onActivate,
  onRetire,
}: {
  surrogate: PublicIdentity;
  current: boolean;
  busy: boolean;
  onActivate: (id: string) => Promise<void>;
  onRetire: (id: string) => Promise<void>;
}) {
  const left = remainingLabel(surrogate.expiresAt);
  return (
    <Card className={current ? "border-ink" : ""}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar id={surrogate.avatarId} size={46} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-[19px] text-ink">
                {surrogate.username}
              </h2>
              {current && <Tag variant="solid">Worn</Tag>}
              {surrogate.custody === "sealed" && <Tag>Sealed</Tag>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
              <Tag>{surrogate.kind}</Tag>
              {surrogate.contextLabel && <span>{surrogate.contextLabel}</span>}
              {left && <span className="font-medium text-ink">{left}</span>}
              <span>{surrogate.standing} posts</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {!current && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onActivate(surrogate.id)}
            >
              Wear this
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => onRetire(surrogate.id)}
          >
            {surrogate.kind === "disposable" ? "Burn" : "Retire"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
