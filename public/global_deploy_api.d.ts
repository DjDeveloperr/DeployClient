import * as deploy from "../src/deploy_api.ts";

declare global {
  const DeployClient: typeof deploy.DeployClient;
}
