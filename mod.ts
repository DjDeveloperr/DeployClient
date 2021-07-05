import { jsx, serve, serveStatic } from "./deps.ts";
import { Index } from "./src/Index.tsx";

serve({
  "/": () => jsx(Index()),
  "/style.css": serveStatic("./public/style.css", {
    baseUrl: import.meta.url,
    intervene: (_, response) => {
      response.headers.set("content-type", "text/css; charset=utf-8");
      return response;
    },
  }),
  "/deploy_api.js": serveStatic("./public/deploy_api.js", {
    baseUrl: import.meta.url,
    intervene: (_, response) => {
      response.headers.set("content-type", "text/javascript");
      return response;
    },
  }),
  "/codejar.js": serveStatic("./public/codejar.js", {
    baseUrl: import.meta.url,
    intervene: (_, response) => {
      response.headers.set("content-type", "text/javascript");
      return response;
    },
  }),
  "/client.js": serveStatic("./public/client.js", {
    baseUrl: import.meta.url,
    intervene: (_, response) => {
      response.headers.set("content-type", "text/javascript");
      return response;
    },
  }),
});
