#!ts-node

import * as cmdts from "cmd-ts";
import { loadConfig, saveConfig } from "./config";
import { mintNfts, airdropNfts, updateNfts } from "./lib";

const mint = cmdts.command({
  name: "mint",
  args: {},
  handler: async () => {
    const config = await mintNfts(loadConfig());
    saveConfig(config);
  },
});

const airdrop = cmdts.command({
  name: "airdrop",
  args: {},
  handler: async () => {
    const config = await airdropNfts(loadConfig());
    saveConfig(config);
  },
});

const update = cmdts.command({
  name: "update",
  args: {},
  handler: async () => {
    const config = await updateNfts(loadConfig());
    saveConfig(config);
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
