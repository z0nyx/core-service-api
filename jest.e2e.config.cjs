module.exports = {
  roots: ["<rootDir>/src"],
  testEnvironment: "node",
  testRegex: ".*\\.e2e-spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.spec.json"
      }
    ]
  },
  moduleFileExtensions: ["ts", "js", "json"]
};
