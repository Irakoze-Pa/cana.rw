const assert = require("node:assert/strict");
const { serviceStatus } = require("../dist/app");
const { notFound } = require("../dist/core/http");

function createResponse() {
  return {
    statusCode: undefined,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function run() {
  const health = createResponse();
  serviceStatus({}, health);
  assert.equal(health.statusCode, 200);
  assert.equal(health.body.data.status, "ok");
  assert.equal(health.body.data.service, "cana-api");

  let routeError;
  notFound({ method: "GET", originalUrl: "/api/not-a-route" }, {}, (error) => {
    routeError = error;
  });
  assert.equal(routeError.statusCode, 404);
  assert.equal(routeError.code, "ROUTE_NOT_FOUND");

  console.log("API smoke tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
