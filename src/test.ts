import * as fs from "fs";
import * as path from "path";
import { RubicCatalogFetcher, RubicCatalogFetcherOptions } from "./index";

let options: RubicCatalogFetcherOptions = {};
try {
    options.auth = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "auth.json"), "utf8"));
} catch (error) {
    console.warn("auth.json not found");
}
if (process.argv.indexOf("--with-proxy") >= 0) {
    options.proxy = process.env.https_proxy || process.env.http_proxy;
    console.info("Proxy enabled:", options.proxy);
}

let fetcher = new RubicCatalogFetcher(options);

Promise.resolve()
.then(() => {
    console.log("=".repeat(80));
    console.log("TEST 1 (Non-merge)");
    return fetcher.fetchRepository({
        host: "github",
        owner: "kimushu",
        repo: "rubic-firmware-sample"
    }).then((result) => {
        console.log("-".repeat(80));
        console.log("RESULT 1 (Non-merge)");
        console.log(JSON.stringify(result, null, 2));
    });
})
.then(() => {
    console.log("=".repeat(80));
    console.log("TEST 2 (Merge)");
    return fetcher.fetchRepository({
        host: "github",
        owner: "kimushu",
        repo: "rubic-firmware-sample"
    }, {
        uuid: "12345678-0000-0000-0000-000000000000",
        host: null,
        owner: null,
        repo: null,
        cache: {
            name: {en: ""},
            description: {en: ""},
            releases: [
                {
                    tag: "v0.2",
                    name: "",
                    description: "",
                    published_at: 1234567890000,
                    updated_at: 1234567890000,
                    author: "test",
                    url: "",
                    cache: {
                        variations: []
                    }
                },
                {
                    tag: "v0.1",
                    name: "",
                    description: "",
                    published_at: 1490501537000,
                    updated_at: 1490501537000,
                    author: "test",
                    url: "",
                    cache: {
                        variations: []
                    }
                },
                {
                    tag: "v0.0",
                    name: "",
                    description: "",
                    published_at: 1490501537000,
                    updated_at: 1490501537000,
                    author: "test",
                    url: "",
                    cache: {
                        variations: []
                    }
                }
            ]
        }
    }).then((result) => {
        console.log("-".repeat(80));
        console.log("RESULT 2 (Merge)");
        console.log(JSON.stringify(result, null, 2));
    });
})
.then(() => {
    fetcher.reportRateLimit();
    process.exit();
}, (reason) => {
    fetcher.reportRateLimit();
    console.error(reason);
    process.exit(1);
});
