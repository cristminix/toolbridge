import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";

describe("Simple Duplication Test", function () {
  let capturedChunks;

  beforeEach(function () {
    capturedChunks = [];
  });

  it("should properly capture chunks", function () {
    const mockResponse = {
      write: (chunk) => {
        capturedChunks.push(chunk);
      },
    };

    expect(capturedChunks.length).to.equal(0);
    mockResponse.write("test chunk");
    expect(capturedChunks.length).to.equal(1);
    expect(capturedChunks[0]).to.equal("test chunk");
  });
});
