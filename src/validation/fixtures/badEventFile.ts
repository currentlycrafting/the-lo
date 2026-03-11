import type { EventFile } from "../eventFileValidator";

export const badEventFile: EventFile = {
  id: "",
  title: "Broken Event",
  startAtIso: "not-a-date",
  endAtIso: "2026-03-20T12:00:00.000Z",
};
