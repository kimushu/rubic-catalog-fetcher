import * as fs from "fs";
import * as path from "path";
import { RubicCatalogFetcher, RubicCatalogFetcherOptions } from "./index";

let options: RubicCatalogFetcherOptions = {};
try {
    options.auth = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "auth.json"), "utf8"));
} catch (error) {
    console.warn("auth.json not found");
}

let fetcher = new RubicCatalogFetcher(options);

fetcher.fetchRepository({
    host: "github",
    owner: "kimushu",
    repo: "rubic-firmware-sample"
}).then(() => {
    process.exit();
});
