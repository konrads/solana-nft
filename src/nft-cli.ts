#!ts-node

import * as cmdts from "cmd-ts";
import { loadConfig, saveConfig } from "./config";
import { mintNfts, airdropNfts, updateNfts } from "./lib";
import { Config, NftDistribution } from "./types";
import { Result } from "./utils";

const mint = cmdts.command({
  name: "mint",
  args: {},
  handler: async () => {
    const config = loadConfig();
    const nftDistributions = await mintNfts(config);
    saveConfig(wihUpdatedNftDistributions(config, nftDistributions));
  },
});

const airdrop = cmdts.command({
  name: "airdrop",
  args: {},
  handler: async () => {
    const config = loadConfig();
    const nftDistributions = await airdropNfts(loadConfig());
    saveConfig(wihUpdatedNftDistributions(config, nftDistributions));
  },
});

const update = cmdts.command({
  name: "update",
  args: {},
  handler: async () => {
    const config = loadConfig();
    const nftDistributions = await updateNfts(loadConfig());
    saveConfig(wihUpdatedNftDistributions(config, nftDistributions));
  },
});

const cmd = cmdts.subcommands({
  name: "cmd",
  cmds: {
    mint,
    airdrop,
    update,
  },
});

cmdts.run(cmd, process.argv.slice(2));

/////////////// helpers
function wihUpdatedNftDistributions(
  config: Config,
  nftDistributions: Result<NftDistribution>[]
): Config {
  return nftDistributions.reduce((config, nftDistro) => {
    if (nftDistro.ok) {
      const idx = config.nftDistributions.findIndex(
        (nd) => nd.destPubkey === nftDistro.value.destPubkey
      );
      config.nftDistributions[idx] = nftDistro.value;
    } else {
      console.log(`Error occurred: ${nftDistro.error}`);
    }
    return config;
  }, config);
}
