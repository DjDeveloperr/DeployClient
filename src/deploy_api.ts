export const API_BASE = "https://dash.deno.com/api";

export type HttpMethod = "GET" | "POST" | "HEAD" | "PATCH" | "DELETE" | "PUT";

export type HeadersObject = { [name: string]: string };

export type EnvVars = HeadersObject;

export interface RequestOptions {
  headers?: HeadersObject;
  body?: any;
  stream?: boolean;
}

export interface Repository {
  id: number;
  owner: string;
  name: string;
}

export interface Git {
  repository: Repository;
  entrypoint: string;
  productionBranch: null | any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPartial {
  id: string;
  name: string;
  git: Git | null;
  hasProductionDeployment: boolean;
  envVars: EnvVars;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deployment {
  id: string;
  url: string;
  relatedCommit: any | null;
  domainMappings: DomainMapping[];
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  envVars: EnvVars;
}

export interface DomainMapping {
  domain: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project extends ProjectPartial {
  productionDeployment: Deployment;
}

export interface AnalyticStat {
  projectId: string;
  ts: Date;
  requestCount: number;
}

export interface Analytics {
  stats: AnalyticStat[];
}

export interface DomainCertificate {
  cipher: string;
  provisioningStrategy: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProvisioningAttempt {
  domain: string;
  cipher: string;
  error: any | null;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Domain {
  domain: string;
  token: string;
  isValidated: boolean;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  certificates: DomainCertificate[];
  provisioningAttempts: ProvisioningAttempt[];
}

export interface DeployProgressLoad {
  type: "load";
  url: string;
  seen: number;
  total: number;
}

export interface DeployProgressUploaded {
  type: "uploadComplete";
}

export interface DeployProgressSuccess extends Deployment {
  type: "success";
}

export type DeployProgress =
  | DeployProgressLoad
  | DeployProgressUploaded
  | DeployProgressSuccess;

export interface User {
  id: string;
  name: string;
  login: string;
  avatarUrl: string;
  githubId: number;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function transformDate(obj: any, ...props: string[]) {
  for (const prop of props) {
    if (obj[prop]) obj[prop] = new Date(obj[prop]);
  }
  return obj;
}

function transformDeployment(d: Deployment) {
  d = transformDate(
    d,
    "createdAt",
    "updatedAt",
  );
  if (d.domainMappings) {
    d.domainMappings = d
      .domainMappings.map((e) => transformDate(e, "createdAt", "updatedAt"));
  }
  return d;
}

function transformProject<T extends Project | ProjectPartial>(d: T): T {
  d = transformDate(d, "createdAt", "updatedAt");
  if (d.git) {
    d.git = transformDate(d.git, "createdAt", "updatedAt");
  }
  if ((d as Project).productionDeployment) {
    (d as Project).productionDeployment = transformDeployment(
      (d as Project).productionDeployment,
    );
  }
  return d;
}

const decoder = new TextDecoder();

/**
 * Deploy Client exposes the Deploy API.
 */
export class DeployClient {
  constructor(public token: string) {}

  /** Makes request to a Deploy API Endpoint */
  async request<T = any>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers: HeadersObject = {
      "Authorization": `Bearer ${this.token}`,
      "Accepts": "application/json",
    };

    const body = options.body === undefined
      ? undefined
      : JSON.stringify(options.body);
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body,
    });

    if (options.stream) return res.body! as any;

    const json = await res.json();

    let error: string | undefined;
    if (res.status === 400) error = "Bad Request";
    else if (res.status === 401) error = "Unauthorized";
    else if (res.status === 403) error = "Forbidden";
    else if (res.status === 429) error = "RateLimited";
    else if (res.status >= 400 && res.status < 500) error = "Client Error";
    else if (res.status >= 500 && res.status < 600) error = "Server Error";

    if (error) {
      throw new Error(
        `${error}: ${Deno.inspect(json, { depth: Infinity, colors: true })}`,
      );
    }

    return json;
  }

  /** Fetch Authorized User's Info */
  async fetchUser(): Promise<User> {
    let res = await this.request<User>("GET", "/user");
    res = transformDate(res, "createdAt", "updatedAt");
    return res;
  }

  /** Fetch User's projects */
  async fetchProjects(): Promise<ProjectPartial[]> {
    const raw = await this.request<ProjectPartial[]>("GET", "/projects");
    return raw.map((d) => {
      d = transformProject(d);
      return d;
    });
  }

  /** Fetch a single Project by ID */
  async fetchProject(id: string): Promise<Project> {
    let d = await this.request<Project>("GET", `/projects/${id}`);
    d = transformProject(d);
    return d;
  }

  /** Fetch Deployments of a Project by ID, includes options for paging */
  async fetchDeployments(
    id: string,
    options: { page: number; limit: number } = { page: 0, limit: 20 },
  ): Promise<Deployment[]> {
    return this.request<Deployment[]>(
      "GET",
      `/projects/${id}/deployments?page=${options.page}&limit=${options.limit}`,
    ).then((e) => e.map(transformDeployment));
  }

  /** Fetch analytics of a Deploy Project by ID and optional interval */
  async fetchAnalytics(
    project: string,
    interval: "24h" | "7d" | "30d" = "24h",
  ): Promise<Analytics> {
    const res = await this.request(
      "GET",
      `/projects/${project}/analytics?interval=${interval}`,
    );
    res.stats = res.stats.map((e: any) => {
      e.projectId = e.project_id;
      delete e.project_id;
      e.requestCount = e.request_count;
      delete e.request_count;
      e.ts = new Date(e.ts);
      return e;
    });
    return res;
  }

  /** Create a new Deploy Project */
  async createProject(name: string, envVars: EnvVars = {}) {
    const project = await this.request<Project>("POST", `/projects`, {
      body: { name, envVars },
    });
    return transformProject(project);
  }

  /** Delete a Deploy Project by ID */
  async deleteProject(id: string) {
    await this.request("DELETE", `/projects/${id}`);
  }

  /** Edit a Deploy Project (currently only supports name) */
  async editProject(id: string, what: { name?: string } = {}) {
    await this.request("PATCH", `/projects/${id}`, { body: what });
  }

  /**
   * Create a Deployment for a Project by its ID.
   *
   * @param id Project ID
   * @param url Source URL
   * @param production Whether to deploy to production or not (true by default)
   * @returns a ReadableStream which provides Streaming response that indicates progress of deployment (downloading deps, success, etc).
   */
  async deploy(
    id: string,
    url: string,
    production = true,
  ): Promise<ReadableStream<DeployProgress>> {
    const stream = await this.request<ReadableStream<Uint8Array>>(
      "POST",
      `/projects/${id}/deployments_stream`,
      {
        body: {
          url,
          production,
        },
        stream: true,
      },
    );

    return new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          try {
            let json = JSON.parse(decoder.decode(chunk));
            if (json.type == "success") json = transformDeployment(json);
            controller.enqueue(json);
          } catch (e) {}
        }
        controller.close();
      },
    });
  }
}
