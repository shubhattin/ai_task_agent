import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { databaseAgentOptions, databaseAgentPost } from "./databaseHttp";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/database",
  method: "POST",
  handler: databaseAgentPost,
});

http.route({
  path: "/api/database",
  method: "OPTIONS",
  handler: databaseAgentOptions,
});

export default http;
