"use client";

import { useState } from "react";
import { Button, Eyebrow } from "./ui";

/**
 * The first-run explainer.
 *
 * Anon's whole claim rests on two rules that are invisible until you trip over
 * them. Showing them up front means the blocked vote later reads as the product
 * working rather than the app breaking.
 */

type Panel = {
  eyebrow: string;
  title: string;
  body: string;
  art: React.ReactNode;
};

const PANELS: Panel[] = [
  {
    eyebrow: "The idea",
    title: "One human. Many faces.",
    body: "World ID proves you are a real, distinct person — once. After that you choose the face you wear in each room. The room sees the face. Nobody sees the person.",
    art: <FacesArt />,
  },
  {
    eyebrow: "Proof one",
    title: "One human, one vote.",
    body: "Ballots are counted on the person, not the name. Put on a second Surrogate and try to vote again and the room will stop you — which is what makes an anonymous poll worth reading.",
    art: <BallotArt />,
  },
  {
    eyebrow: "Proof two",
    title: "One human, one voice.",
    body: "The first face you speak with in a thread is the only one you can speak with there. One person cannot become a crowd agreeing with itself. Every other face stays free in every other room.",
    art: <VoiceArt />,
  },
  {
    eyebrow: "The honest part",
    title: "What we can still see.",
    body: "Your World ID nullifier is never stored. Votes carry a key scoped to one poll, so they cannot be joined into a history. We do know which Surrogates are yours — switching faces requires it — and we show you that number.",
    art: <LedgerArt />,
  },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const panel = PANELS[step];
  const last = step === PANELS.length - 1;

  return (
    <div className="flex h-full flex-col bg-paper px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-1.5" role="tablist" aria-label="Walkthrough">
          {PANELS.map((item, index) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={index === step}
              aria-label={item.title}
              onClick={() => setStep(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === step ? "w-7 bg-ink" : "w-1.5 bg-rule-strong"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onDone}
          className="text-[13px] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          Skip
        </button>
      </div>

      <div key={step} className="animate-rise flex flex-1 flex-col justify-center">
        <div className="flex justify-center py-8">{panel.art}</div>
        <Eyebrow>{panel.eyebrow}</Eyebrow>
        <h1 className="mt-2 font-display text-[32px] leading-[1.1] text-ink">
          {panel.title}
        </h1>
        <p className="mt-3 max-w-[21rem] text-[14.5px] leading-7 text-ink-2">
          {panel.body}
        </p>
      </div>

      <div className="space-y-3">
        <Button onClick={() => (last ? onDone() : setStep(step + 1))}>
          {last ? "Choose a face" : "Next"}
        </Button>
        {step > 0 && (
          <Button variant="quiet" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- art */

/*
 * Greyscale diagrams. Where these used to say "allowed" in green and "blocked"
 * in red, they now say it in line: solid and closed means it happened, dashed
 * and crossed means it did not.
 */

const ART = "h-[150px] w-[260px]";
const INK = "#0d0d0d";
const MID = "#6b6b6b";
const RULE = "#d4d4d4";
const CARD = "#ffffff";

function FacesArt() {
  return (
    <svg viewBox="0 0 260 150" className={ART} aria-hidden>
      <circle cx="130" cy="26" r="15" fill={INK} />
      <path
        d="M130 44v18M130 62H52M130 62h78M52 62v14M130 62v14M208 62v14"
        stroke={RULE}
        strokeWidth="1.5"
        fill="none"
      />
      {[52, 130, 208].map((x, i) => (
        <g key={x}>
          <rect
            x={x - 26}
            y="78"
            width="52"
            height="46"
            rx="12"
            fill={CARD}
            stroke={RULE}
            strokeWidth="1.5"
          />
          <circle cx={x} cy="96" r="8" fill={["#1f1f1f", "#4a4a4a", "#757575"][i]} />
          <path
            d={`M${x - 13} 116c4-9 22-9 26 0`}
            fill={["#1f1f1f", "#4a4a4a", "#757575"][i]}
          />
        </g>
      ))}
      <text x="130" y="142" textAnchor="middle" fill={MID} fontSize="10">
        one person · three rooms
      </text>
    </svg>
  );
}

function BallotArt() {
  return (
    <svg viewBox="0 0 260 150" className={ART} aria-hidden>
      <rect
        x="86"
        y="58"
        width="88"
        height="62"
        rx="10"
        fill={CARD}
        stroke={RULE}
        strokeWidth="1.5"
      />
      <rect x="104" y="74" width="52" height="4" rx="2" fill={RULE} />
      <path d="M104 92h52M104 104h34" stroke={RULE} strokeWidth="3" strokeLinecap="round" />

      {/* Counted: solid line, closed dot. */}
      <circle cx="34" cy="44" r="14" fill={INK} />
      <path d="M48 50l34 16" stroke={INK} strokeWidth="2" />
      <circle cx="86" cy="70" r="4" fill={INK} />

      {/* Refused: dashed line, open circle, crossed out. */}
      <circle cx="34" cy="112" r="14" fill="none" stroke={MID} strokeWidth="2" strokeDasharray="4 3" />
      <path d="M48 110h26" stroke={MID} strokeWidth="2" strokeDasharray="4 3" />
      <g stroke={INK} strokeWidth="2.5" strokeLinecap="round">
        <path d="M80 104l12 12M92 104l-12 12" />
      </g>
      <text x="130" y="142" textAnchor="middle" fill={MID} fontSize="10">
        second face · same person · no second ballot
      </text>
    </svg>
  );
}

function VoiceArt() {
  return (
    <svg viewBox="0 0 260 150" className={ART} aria-hidden>
      <rect x="40" y="18" width="180" height="34" rx="10" fill={CARD} stroke={RULE} strokeWidth="1.5" />
      <circle cx="60" cy="35" r="8" fill={INK} />
      <path d="M78 30h116M78 40h74" stroke={RULE} strokeWidth="3" strokeLinecap="round" />

      <rect x="56" y="60" width="164" height="30" rx="10" fill={CARD} stroke={RULE} strokeWidth="1.5" />
      <circle cx="74" cy="75" r="7" fill={INK} />
      <path d="M90 75h104" stroke={RULE} strokeWidth="3" strokeLinecap="round" />
      <path d="M232 75l-8-5v10z" fill={INK} />

      <rect
        x="56"
        y="98"
        width="164"
        height="30"
        rx="10"
        fill={CARD}
        stroke={MID}
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />
      <circle cx="74" cy="113" r="7" fill="none" stroke={MID} strokeWidth="1.8" />
      <g stroke={INK} strokeWidth="2.5" strokeLinecap="round">
        <path d="M196 107l10 12M206 107l-10 12" />
      </g>
      <text x="130" y="144" textAnchor="middle" fill={MID} fontSize="10">
        one thread · one face each
      </text>
    </svg>
  );
}

function LedgerArt() {
  const rows: Array<[string, string, boolean]> = [
    ["World ID nullifier", "never written", false],
    ["Ballots", "keyed per poll", false],
    ["Your Surrogates", "linked", true],
  ];
  return (
    <svg viewBox="0 0 260 150" className={ART} aria-hidden>
      <rect x="22" y="20" width="216" height="110" rx="12" fill={CARD} stroke={RULE} strokeWidth="1.5" />
      {rows.map(([label, value, kept], index) => {
        const y = 48 + index * 30;
        return (
          <g key={label}>
            <text x="40" y={y} fill="#4a4a4a" fontSize="10.5">
              {label}
            </text>
            {/* The one real linkage inverts, exactly as it does in the app. */}
            {kept && <rect x={220 - value.length * 5.6 - 6} y={y - 9} width={value.length * 5.6 + 12} height="14" rx="4" fill={INK} />}
            <text
              x="220"
              y={y}
              textAnchor="end"
              fill={kept ? CARD : "#4a4a4a"}
              fontSize="10.5"
              fontWeight="600"
            >
              {value}
            </text>
            {index < rows.length - 1 && <path d={`M40 ${y + 10}h180`} stroke={RULE} strokeWidth="1" />}
          </g>
        );
      })}
    </svg>
  );
}
