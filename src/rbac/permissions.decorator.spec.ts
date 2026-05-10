import "reflect-metadata";
import { PERMISSIONS_KEY, Permissions } from "./permissions.decorator";

describe("Permissions decorator", () => {
  it("stores permissions metadata on method", () => {
    class TestController {
      @Permissions("users.read", "users.write")
      handler() {}
    }

    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, TestController.prototype.handler);
    expect(metadata).toEqual(["users.read", "users.write"]);
  });
});
