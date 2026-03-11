import { badEventFile } from "./fixtures/badEventFile";
import { goodEventFile } from "./fixtures/goodEventFile";
import { isValidEventFile } from "./eventFileValidator";

describe("isValidEventFile", () => {
  it("accepts the good file", () => {
    expect(isValidEventFile(goodEventFile)).toBe(true);
  });

  it("rejects the bad file", () => {
    expect(isValidEventFile(badEventFile)).toBe(false);
  });
});
