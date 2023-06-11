# Solana minting, airdrop and update

Provides command line to mint, airdrop and update image of solana nfts. Wallet secret/priv key needs to be supplied inside file `wallet-secret.txt`. Config should be based of [config-template.json](./config-template.json) and copied into `config.json`.

Note: to minimize errors, all async tasks are serialized.

## Setup

```sh
npm i
echo "...my-real-wallet-secret..." > wallet-secret.txt
# ensure the wallet has sufficient funds to mint, upload image files/metadata, create target ATAs, transfer nfts, etc.
cp config-template.json config.json
# change eg. uris to mainnet
```

## Run

```sh
src/nft-cli.ts mint
# observe assignment of nftDistribution.nftMintPubkey in config.json

src/nft-cli.ts airdrop
# observe change in nftDistribution.status

# supply new nftDistributions.imgUri to eg. "./uploads/ball2.png"
src/nft-cli.ts update
# observe change in nftDistribution.status
```
