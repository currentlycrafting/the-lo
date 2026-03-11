export type EventFile = {
  id?: string;
  title?: string;
  startAtIso?: string;
  endAtIso?: string;
};

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function isValidEventFile(input: EventFile): boolean {
  if (typeof input.id !== "string" || input.id.trim().length === 0) {
    return false;
  }

  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return false;
  }

  if (typeof input.startAtIso !== "string" || !isIsoDate(input.startAtIso)) {
    return false;
  }

  if (typeof input.endAtIso !== "string" || !isIsoDate(input.endAtIso)) {
    return false;
  }

  return Date.parse(input.endAtIso) > Date.parse(input.startAtIso);
}
