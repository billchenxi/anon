import { humanIdFromNullifier, voiceKey } from "./ids";
import {
  STORE_VERSION,
  type Comment,
  type Human,
  type Poll,
  type Post,
  type RoomId,
  type StoreData,
  type Surrogate,
} from "./types";

function seedHuman(label: string, verifiedAt: string): Human {
  return { id: humanIdFromNullifier(`seed:${label}`), verifiedAt, demo: false };
}

/**
 * Built lazily inside `seedStore()`, never at module scope: deriving an id
 * requires the pepper, and importing this file must not need one. `next build`
 * imports every route to collect config, which would otherwise fail closed.
 */
function seedHumans() {
  return {
    harbor: seedHuman("harbor", "2026-03-01T12:00:00.000Z"),
    finch: seedHuman("finch", "2026-03-02T08:00:00.000Z"),
    tide: seedHuman("tide", "2026-03-03T19:10:00.000Z"),
    moss: seedHuman("moss", "2026-03-04T09:30:00.000Z"),
    quartz: seedHuman("quartz", "2026-03-05T14:00:00.000Z"),
    orchard: seedHuman("orchard", "2026-03-06T10:15:00.000Z"),
  };
}

function face(
  id: string,
  human: Human,
  username: string,
  avatarId: string,
  contextLabel: string,
  createdAt: string,
): Surrogate {
  return {
    id,
    custody: "linked",
    humanId: human.id,
    kind: "context",
    status: "active",
    username,
    avatarId,
    contextLabel,
    createdAt,
  };
}

function post(
  id: string,
  roomId: RoomId,
  surrogateId: string,
  human: Human,
  body: string,
  createdAt: string,
): Post {
  return {
    id,
    roomId,
    surrogateId,
    body,
    createdAt,
    status: "visible",
    voiceKey: voiceKey(id, human.id),
  };
}

function reply(
  id: string,
  postId: string,
  surrogateId: string,
  human: Human,
  body: string,
  createdAt: string,
): Comment {
  return {
    id,
    postId,
    surrogateId,
    body,
    createdAt,
    status: "visible",
    voiceKey: voiceKey(postId, human.id),
  };
}

const POLLS: Poll[] = [
  {
    id: "poll_bonus",
    roomId: "work",
    question: "Did your bonus decrease this year?",
    description:
      "One human, one vote. A second Surrogate from the same person cannot recast this ballot.",
    options: [
      { id: "opt_yes", label: "Yes — it went down" },
      { id: "opt_flat", label: "No — flat or up" },
      { id: "opt_unsure", label: "I do not know yet" },
    ],
    rule: "one_human",
    createdAt: "2026-03-09T10:00:00.000Z",
  },
  {
    id: "poll_sign",
    roomId: "work",
    question: "Would you post this on your work Slack with your name?",
    description:
      "This one counts a ballot per Surrogate, so you can see the difference from one-human-one-vote.",
    options: [
      { id: "opt_never", label: "Never" },
      { id: "opt_small", label: "Only in a tiny group" },
      { id: "opt_sign", label: "Yes, I would sign it" },
    ],
    rule: "one_identity",
    createdAt: "2026-03-09T10:05:00.000Z",
  },
  {
    id: "poll_disclose",
    roomId: "health",
    question: "Have you told your employer about a chronic condition?",
    description: "One human, one vote. Nobody sees which face voted.",
    options: [
      { id: "opt_told", label: "Yes, and it went fine" },
      { id: "opt_told_bad", label: "Yes, and I regret it" },
      { id: "opt_never_told", label: "No, and I do not plan to" },
    ],
    rule: "one_human",
    createdAt: "2026-03-11T09:00:00.000Z",
  },
];

export function seedStore(): StoreData {
  const H = seedHumans();
  return {
    version: STORE_VERSION,
    humans: Object.values(H),
    surrogates: [
      face("srg_harbor", H.harbor, "Quiet Harbor", "harbor", "Work", "2026-03-04T09:00:00.000Z"),
      face("srg_finch", H.finch, "Copper Finch", "finch", "Work", "2026-03-04T11:20:00.000Z"),
      face("srg_tide", H.tide, "North Tide", "tide", "Work", "2026-03-05T07:40:00.000Z"),
      face("srg_moss", H.moss, "Slow Moss", "moss", "Work", "2026-03-06T08:10:00.000Z"),
      // Same humans, different rooms, unlinkable faces.
      face("srg_lantern", H.harbor, "Paper Lantern", "lantern", "Health", "2026-03-07T20:00:00.000Z"),
      face("srg_veil", H.quartz, "Still Veil", "veil", "Health", "2026-03-08T21:30:00.000Z"),
      face("srg_atlas", H.tide, "Far Atlas", "atlas", "Health", "2026-03-09T18:05:00.000Z"),
      face("srg_kiln", H.orchard, "Bright Kiln", "kiln", "Commons", "2026-03-10T12:00:00.000Z"),
      face("srg_drift", H.finch, "Ashen Drift", "drift", "Commons", "2026-03-10T16:20:00.000Z"),
    ],
    posts: [
      post("pst_bonus", "work", "srg_harbor", H.harbor,
        "Did anyone else's bonus decrease this year? I cannot ask this on Slack. I need to know if it is just me.",
        "2026-03-10T11:12:00.000Z"),
      post("pst_levels", "work", "srg_tide", H.tide,
        "Skip-level said the cut is across the org. Still would not put my name on that.",
        "2026-03-10T15:44:00.000Z"),
      post("pst_return", "work", "srg_moss", H.moss,
        "Four days in office starting May. Nobody in my team was asked. Is that happening anywhere else?",
        "2026-03-12T08:30:00.000Z"),
      post("pst_disclose", "health", "srg_lantern", H.harbor,
        "I have been managing a chronic illness for two years without telling work. The flare-ups are getting harder to hide behind 'a bad night'.",
        "2026-03-11T19:40:00.000Z"),
      post("pst_leave", "health", "srg_veil", H.quartz,
        "Took three weeks of medical leave. HR was fine. My manager has been strange with me ever since.",
        "2026-03-12T13:15:00.000Z"),
      post("pst_mind", "social", "srg_kiln", H.orchard,
        "What is something you changed your mind about this year? I will start: I was wrong about remote work being the whole problem.",
        "2026-03-12T17:00:00.000Z"),
    ],
    comments: [
      reply("cmt_1", "pst_bonus", "srg_finch", H.finch,
        "Mine dropped too. Same band, same rating. I thought I was being managed out.",
        "2026-03-10T12:01:00.000Z"),
      reply("cmt_2", "pst_bonus", "srg_tide", H.tide,
        "Not just you. Three people on my floor said the same thing off-record.",
        "2026-03-10T12:40:00.000Z"),
      reply("cmt_3", "pst_bonus", "srg_moss", H.moss,
        "Ours came with a slide about 'market conditions'. Nobody asked a single question on the call.",
        "2026-03-10T14:22:00.000Z"),
      reply("cmt_4", "pst_levels", "srg_finch", H.finch,
        "Across the org is doing a lot of work in that sentence.",
        "2026-03-10T16:10:00.000Z"),
      reply("cmt_5", "pst_disclose", "srg_atlas", H.tide,
        "I told mine after two years. The relief was real, but I picked the week after a good review on purpose.",
        "2026-03-11T21:02:00.000Z"),
      reply("cmt_6", "pst_disclose", "srg_veil", H.quartz,
        "You do not owe anyone a diagnosis. You can ask for the accommodation without naming the condition.",
        "2026-03-12T07:45:00.000Z"),
      reply("cmt_7", "pst_mind", "srg_drift", H.finch,
        "That the people who post the most in a room are the ones who believe it the most.",
        "2026-03-12T18:30:00.000Z"),
    ],
    polls: POLLS,
    votes: [],
    reports: [],
    sanctions: [],
  };
}
