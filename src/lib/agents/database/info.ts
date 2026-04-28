export const DATABASE_TARGET_IDS = ["1", "2"] as const;
export type DatabaseTargetId = (typeof DATABASE_TARGET_IDS)[number];

export const DATABASE_CHOICES: Record<
  DatabaseTargetId,
  { id: DatabaseTargetId; name: string; description: string }
> = {
  "1": {
    id: "1",
    name: "Padavali Game Database",
    description:
      "Puzzles, sessions, stats, and schedules. Queries are read-only.",
  },
  "2": {
    id: "2",
    name: "Personal Rent Record Database",
    description:
      "Rent and electricity, users, and accounts. Queries are read-only.",
  },
};
