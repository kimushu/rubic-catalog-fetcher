///<reference path="../lib/catalog.d.ts" />
import * as GitHub from "@octokit/rest";
import * as Ajv from "ajv";
import * as CJSON from "comment-json";
import * as fs from "fs";
import * as path from "path";
import * as request from "request";
import * as pify from "pify";
import * as decompress from "decompress";

export const CATALOG_JSON  = "catalog.json";
export const JSON_ENCODING = "utf8";
export const REPOSITORY_JSON = "rubic-repository.json";
export const RELEASE_JSON  = "release.json";
export const ASSET_PATTERN = /\.(zip|tar\.gz|tgz)$/i;
export const OFFICIAL_CATALOG = {
    owner: "kimushu",
    repo: "rubic-catalog",
    branch: "vscode-master"
};
const USER_AGENT = "@rubic/catalog-fetcher";

export interface RubicCatalogFetcherOptions {
    auth?: GitHub.Auth;
    logger?: ConsoleLogger;
    userAgent?: string;
    proxy?: string;
    rejectUnauthorized?: boolean;
}
export interface ConsoleLogger {
    log: Function;
    info?: Function;
    warn?: Function;
    error?: Function;
}
export interface GitHubRepository {
    host: "github";
    owner: string;
    repo: string;
    branch?: string;
}

let ajv: Ajv.Ajv;

function loadSchema() {
    ajv = new Ajv();
    let schema = JSON.parse(
        fs.readFileSync(path.join(__dirname, "catalog.schema.json"), JSON_ENCODING)
    );
    ajv.compile(schema);
}

loadSchema();

/**
 * Get ajv-based validator for Rubic catalog schema
 * @param name Name of interface
 */
export function getValidator(name?: string): Ajv.ValidateFunction {
    if (name == null) {
        return ajv.getSchema(undefined);
    }
    return ajv.getSchema(`#/definitions/RubicCatalog.${name}`);
}

/**
 * Catalog fetcher for Rubic
 */
export class RubicCatalogFetcher {
    private gh: GitHub;
    public logger: ConsoleLogger;
    private limit_used: number = 0;
    private limit_remaining: number = null;
    private temp_id_next: number = 1;

    /**
     * Construct Rubic catalog fetcher
     * @param options Options for fetcher
     */
    constructor(private options: RubicCatalogFetcherOptions = {}) {
        const ghopt: GitHub.Options = {
            headers: {
                "user-agent": USER_AGENT + (options.userAgent ? ` (${options.userAgent})` : "")
            },
        };
        if (options.proxy != null) {
            ghopt.proxy = options.proxy;
        }
        if (options.rejectUnauthorized != null) {
            ghopt.rejectUnauthorized = options.rejectUnauthorized;
        }
        this.gh = new GitHub(ghopt);
        this.logger = options.logger;
        if (this.logger == null) {
            this.logger = <ConsoleLogger>{};
        }
        if (this.logger.log == null) {
            this.logger.log = (msg, ...args) => console.log(msg, ...args);
        }
        if (this.logger.info == null) {
            this.logger.info = (...args) => this.logger.log("[INFO]", ...args);
        }
        if (this.logger.warn == null) {
            this.logger.warn = (...args) => this.logger.log("[WARN]", ...args);
        }
        if (this.logger.error == null) {
            this.logger.error = (...args) => this.logger.log("[ERROR]", ...args);
        }
        if (options.auth) {
            this.gh.authenticate(options.auth);
        }
    }

    /**
     * Fetch repository data
     * @param repo Repository info
     * @param current Current data to merge
     * @param ver Version suffix
     */
    fetchRepository(repo: GitHubRepository, current: RubicCatalog.RepositorySummaryV1 | undefined, ver: string): Promise<RubicCatalog.RepositorySummaryV1> {
        let { branch } = repo;
        if (branch == null) {
            branch = "master";
        }

        this.logger.log(`Fetching repository: ${repo.host}:${repo.owner}/${repo.repo}#${branch}${current != null ? " (Merge mode)" : ""}`);
        if (current == null) {
            current = <any>{};
        }
        if (current.uuid == null) {
            current.uuid = `00000000-${("0000" + (this.temp_id_next++).toString()).substr(-4)}-0000-0000-000000000000`;
            this.logger.info(`Assigned a temporary UUID for this repository (${current.uuid})`);
        }
        current.host = repo.host;
        current.owner = repo.owner;
        current.repo = repo.repo;
        current.branch = branch;

        return this.fetchRepositoryJSON(current, ver).then(() => {
            return current;
        });
    }

    /**
     * Validate object and report
     * @param obj Object to validate
     * @param name Name of interface
     * @param title Name of object
     */
    private validate(obj: any, name: string, title: string): void {
        const validator = getValidator(name);
        if (!validator(obj)) {
            let { errors } = validator;
            this.logger.error(`${title} has ${errors.length} error(s)`);
            for (let i = 0; i < errors.length; ++i) {
                let e = errors[i];
                this.logger.error(`- (${e.keyword}) ${e.dataPath}: ${e.message}`);
            }
            throw new Error(`invalid ${title}`);
        }
    }

    /**
     * Fetch REPOSITORY_JSON
     * @param repo Object to store fetched data
     * @param ver Version suffix
     */
    private fetchRepositoryJSON(repo: RubicCatalog.RepositorySummaryV1, ver: string): Promise<void> {
        return Promise.resolve()
        .then(() => {
            // Fetch REPOSITORY_JSON
            return this.recordRateLimit(this.gh.repos.getContent({
                owner: repo.owner,
                repo: repo.repo,
                ref: repo.branch,
                path: REPOSITORY_JSON
            }));
        })
        .then((result) => {
            // Validate REPOSITORY_JSON
            const repos_json: RubicCatalog.RepositoryDetailV1 = CJSON.parse(
                Buffer.from(result.data.content, result.data.encoding).toString(), null, true
            );
            this.validate(repos_json, `RepositoryDetail${ver}`, RELEASE_JSON);
            if (repos_json.releases == null) {
                repos_json.releases = repo.cache && repo.cache.releases;
            }
            repo.cache = repos_json;

            return this.fetchReleaseList(repo, ver);
        });
    }

    /**
     * Fetch releases
     * @param repo Object to store fetched data
     * @param ver Version suffix
     */
    private fetchReleaseList(repo: RubicCatalog.RepositorySummaryV1, ver: string): Promise<void> {
        return Promise.resolve()
        .then(() => {
            // Fetch release list
            return this.recordRateLimit(this.gh.repos.getReleases({
                owner: repo.owner,
                repo: repo.repo
            }));
        })
        .then((result) => {
            // Update releases array
            let dest = repo.cache.releases;
            let merge = (dest != null);
            let tags_src = [];
            let tags_exists = [];
            let tags_updated = [];
            if (merge) {
                tags_src = dest.map((rel) => rel.tag);
            } else {
                dest = repo.cache.releases = [];
            }
            result.data.forEach((rel) => {
                if (rel.draft) {
                    return; // Do not include draft releases
                }
                let url;
                let updated_at;
                (rel.assets || []).forEach((asset) => {
                    if (!url && ASSET_PATTERN.test(asset.name)) {
                        url = asset.browser_download_url;
                        updated_at = Date.parse(asset.updated_at);
                    }
                });
                let tag = rel.tag_name;
                if (url == null) {
                    this.logger.warn(`No asset data for tag '${tag}'. Skipping`);
                    return;
                }
                let index = tags_src.indexOf(tag);
                let old_value: RubicCatalog.ReleaseSummary;
                if (index < 0) {
                    // New item
                    index = dest.length;
                } else {
                    // Replace item
                    old_value = dest[index];
                }
                dest[index] = {
                    tag,
                    name: rel.name,
                    description: rel.body,
                    published_at: Date.parse(rel.published_at),
                    updated_at,
                    author: rel.author.login,
                    url,
                    cache: (old_value && old_value.cache)
                };
                tags_exists.push(tag);
                if (old_value == null || updated_at > old_value.updated_at) {
                    tags_updated.push(tag);
                    if (old_value != null) {
                        this.logger.info(`Found an updated release: ${tag}`);
                    }
                }

                // Report new release
                if (!merge || tags_src.indexOf(tag) < 0) {
                    this.logger.info(`Found a new release: ${tag}`);
                }
            });

            // Sort from newest to oldest
            dest.sort((a, b) => b.published_at - a.published_at);

            // Report removed releases
            for (let tag of tags_src) {
                if (tags_exists.indexOf(tag) < 0) {
                    dest.splice(dest.findIndex((rel) => rel.tag === tag), 1);
                    this.logger.info(`Removed an old release: ${tag}`);
                }
            }

            // Fetch asset data
            return tags_updated.reduce(
                (promise, tag) => {
                    return promise
                    .then(() => {
                        let rel = dest.find((rel) => rel.tag === tag);
                        return this.fetchReleaseDetail(rel, ver);
                    });
                }, Promise.resolve()
            );
        });
    }

    /**
     * Fetch ReleaseDetail
     * @param rel Object to store fetched data
     * @param ver Version suffix
     */
    private fetchReleaseDetail(rel: RubicCatalog.ReleaseSummaryV1, ver: string): Promise<void> {
        this.logger.info(`Downloading asset data: ${rel.tag} (${rel.url})`);
        let rqopt: any = {url: rel.url, encoding: null};
        if (this.options.proxy != null) {
            rqopt.proxy = this.options.proxy;
        }
        if (this.options.rejectUnauthorized != null) {
            rqopt.strictSSL = this.options.rejectUnauthorized;
        }
        return pify(request)(rqopt)
        .then((response: request.RequestResponse) => {
            this.logger.info(`Decompressing asset data: ${rel.tag}`);
            return decompress(response.body);
        })
        .then((files: any[]) => {
            // Find RELEASE_JSON
            let rel_json_file = files.find((file) => file.path === RELEASE_JSON);
            if (rel_json_file == null) {
                throw new Error(`${RELEASE_JSON} not found in asset data`);
            }

            // Validate RELEASE_JSON
            let rel_json: RubicCatalog.ReleaseDetailV1 = CJSON.parse(
                rel_json_file.data.toString(), null, true
            );
            this.validate(rel_json, `ReleaseDetail${ver}`, RELEASE_JSON);

            // Check files for all variations
            for (let v of rel_json.variations) {
                let file = files.find((file) => file.path === v.path);
                if (file == null) {
                    throw new Error(`Variation file not found: ${v.path}`);
                }

                // Check template files for all runtimes
                for (let r of v.runtimes) {
                    if (r.template != null) {
                        let file = files.find((file) => file.path === r.template);
                        if (file == null) {
                            throw new Error(`Template file not found: ${r.template}`);
                        }
                    }
                }
            }

            // Store data
            rel.cache = rel_json;
        });
    }

    /**
     * RateLimit recording for GitHub API
     * @param data GitHub API result
     */
    private recordRateLimit(data: GitHub.AnyResponse | Promise<GitHub.AnyResponse>): Promise<any> {
        return Promise.resolve(data)
        .then((result) => {
            const headers = (result && result.headers);
            if (headers) {
                ++this.limit_used;
                this.limit_remaining = parseInt(headers["x-ratelimit-remaining"]);
            }
            return result;
        });
    }

    /**
     * Report RateLimit status for GitHub API
     */
    reportRateLimit(): void {
        if (this.limit_remaining != null) {
            this.logger.info(`(GitHub API RateLimit) Used: ${this.limit_used}, Remaining: ${this.limit_remaining}`);
        }
    }
}
