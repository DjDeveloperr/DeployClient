const API_BASE1 = "https://dash.deno.com/api";
function transformDate(obj, ...props) {
  for (const prop of props) {
    if (obj[prop]) obj[prop] = new Date(obj[prop]);
  }
  return obj;
}
function transformDeployment(d) {
  d = transformDate(d, "createdAt", "updatedAt");
  if (d.domainMappings) {
    d.domainMappings = d.domainMappings.map((e) =>
      transformDate(e, "createdAt", "updatedAt")
    );
  }
  return d;
}
function transformProject(d) {
  d = transformDate(d, "createdAt", "updatedAt");
  if (d.git) {
    d.git = transformDate(d.git, "createdAt", "updatedAt");
  }
  if (d.productionDeployment) {
    d.productionDeployment = transformDeployment(d.productionDeployment);
  }
  return d;
}
const decoder = new TextDecoder();
class DeployClient1 {
  token;
  constructor(token) {
    this.token = token;
  }
  async request(method, path, options = {}) {
    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accepts: "application/json",
    };
    const body =
      options.body === undefined ? undefined : JSON.stringify(options.body);
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API_BASE1}${path}`, {
      method,
      headers,
      body,
    });
    if (options.stream) return res.body;
    const json = await res.json();
    let error;
    if (res.status === 400) error = "Bad Request";
    else if (res.status === 401) error = "Unauthorized";
    else if (res.status === 403) error = "Forbidden";
    else if (res.status === 429) error = "RateLimited";
    else if (res.status >= 400 && res.status < 500) error = "Client Error";
    else if (res.status >= 500 && res.status < 600) error = "Server Error";
    if (error) {
      throw new Error(
        `${error}: ${Deno.inspect(json, {
          depth: Infinity,
          colors: true,
        })}`
      );
    }
    return json;
  }
  async fetchUser() {
    let res = await this.request("GET", "/user");
    res = transformDate(res, "createdAt", "updatedAt");
    return res;
  }
  async fetchProjects() {
    const raw = await this.request("GET", "/projects");
    return raw.map((d) => {
      d = transformProject(d);
      return d;
    });
  }
  async fetchProject(id) {
    let d = await this.request("GET", `/projects/${id}`);
    d = transformProject(d);
    return d;
  }
  async fetchDeployments(
    id,
    options = {
      page: 0,
      limit: 20,
    }
  ) {
    return this.request(
      "GET",
      `/projects/${id}/deployments?page=${options.page}&limit=${options.limit}`
    ).then((e) => e.map(transformDeployment));
  }
  async fetchAnalytics(project, interval = "24h") {
    const res = await this.request(
      "GET",
      `/projects/${project}/analytics?interval=${interval}`
    );
    res.stats = res.stats.map((e) => {
      e.projectId = e.project_id;
      delete e.project_id;
      e.requestCount = e.request_count;
      delete e.request_count;
      e.ts = new Date(e.ts);
      return e;
    });
    return res;
  }
  async createProject(name, envVars = {}) {
    const project = await this.request("POST", `/projects`, {
      body: {
        name,
        envVars,
      },
    });
    return transformProject(project);
  }
  async deleteProject(id) {
    await this.request("DELETE", `/projects/${id}`);
  }
  async editProject(id, what = {}) {
    await this.request("PATCH", `/projects/${id}`, {
      body: what,
    });
  }
  async deploy(id, url, production = true) {
    const stream = await this.request(
      "POST",
      `/projects/${id}/deployments_stream`,
      {
        body: {
          url,
          production,
        },
        stream: true,
      }
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

// Manually commented these out
// export { API_BASE1 as API_BASE };
// export { DeployClient1 as DeployClient };
