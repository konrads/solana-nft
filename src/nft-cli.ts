#!ts-node

import * as cmdts from "cmd-ts";
import { loadConfig, saveConfig } from "./config";
import {
  mintNfts,
  airdropNfts,
  updateNfts,
  sleep,
  executeBatch,
  Result,
} from "./lib";
import { Config, NftDistribution } from "./types";

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

const balls = cmdts.command({
  name: "balls",
  args: {},
  handler: async () => {
    async function doSomething(i: number): Promise<number> {
      console.log(`${Date.now()}: balls ${i} started`);
      await sleep(i * 100);
      if (i % 5 == 0) throw new Error(`${Date.now()}: balls ${i} failed`);
      else console.log(`${Date.now()}: balls ${i} succeeded`);
      return i;
    }

    const res = await executeBatch(
      [...Array(23).keys()].map((i) => () => doSomething(i)),
      5,
      5000
    );
    console.log(res);
  },
});

const cmd = cmdts.subcommands({
  name: "cmd",
  cmds: {
    mint,
    airdrop,
    update,
    balls,
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
