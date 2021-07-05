import { h, Fragment } from "../deps.ts";

export function Index() {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <title>Deploy Client</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-dark.min.css" />
        <link rel="stylesheet" href="/style.css" />
        <script src="/deploy_api.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/prism.min.js"></script>
        <script type="module" src="/codejar.js"></script>
      </head>
      <body>
        <div id="app">
          <div id="sidebar">

          </div>
          <div id="editor">

          </div>
        </div>
        <script src="/client.js"></script>
      </body>
    </html>
  );
}
