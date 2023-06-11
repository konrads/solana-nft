import ajv from "ajv";
import fs from "fs";
import { Config } from "./types";

export function loadConfig(): Config {
  const config: Config = require(`../config.json`);
  config.walletSecret = fs.readFileSync("./wallet-secret.txt", "utf8");
  //   validateConfigSchema(config);
  return config;
}

export function saveConfig(config: Config) {
  fs.writeFileSync(
    "./config.json",
    JSON.stringify({ ...config, walletSecret: undefined }, undefined, 4)
  );
}

function validateConfigSchema(config: any) {
  const ajvInst = new ajv();
  const configSchema = require("../config-schema.json");
  configSchema["$schema"] = undefined;
  const validate = ajvInst.compile(configSchema);
  const valid = validate(config) as boolean;
  if (!valid)
    throw new Error(
      `Failed to validate config due to errors ${JSON.stringify(
        validate.errors
      )}`
    );
}
