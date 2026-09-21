export type AvatarSpec = {
  id: string;
  name: string;
  /** Tile fill — a step on the neutral ramp. */
  ink: string;
  /** The mask shape drawn on it. */
  paper: string;
};

/**
 * Greyscale. Twelve faces told apart by silhouette first and tone second, so
 * they still read when someone cannot distinguish hues at all.
 */
export const AVATARS: AvatarSpec[] = [
  { id: "harbor", name: "Harbor", ink: "#141414", paper: "#ffffff" },
  { id: "lantern", name: "Lantern", ink: "#1e1e1e", paper: "#ffffff" },
  { id: "finch", name: "Finch", ink: "#282828", paper: "#ffffff" },
  { id: "quartz", name: "Quartz", ink: "#323232", paper: "#ffffff" },
  { id: "drift", name: "Drift", ink: "#3c3c3c", paper: "#ffffff" },
  { id: "ember", name: "Ember", ink: "#464646", paper: "#ffffff" },
  { id: "tide", name: "Tide", ink: "#505050", paper: "#ffffff" },
  { id: "moss", name: "Moss", ink: "#5a5a5a", paper: "#ffffff" },
  { id: "veil", name: "Veil", ink: "#646464", paper: "#ffffff" },
  { id: "copper", name: "Copper", ink: "#6e6e6e", paper: "#ffffff" },
  { id: "north", name: "North", ink: "#787878", paper: "#ffffff" },
  { id: "echo", name: "Echo", ink: "#828282", paper: "#ffffff" },
];

export function avatarById(id: string): AvatarSpec {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}
