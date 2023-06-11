import fs from "fs";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
  toBigNumber,
} from "@metaplex-foundation/js";
import bs58 from "bs58";
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import { Config } from "./types";

export async function mintNfts(config: Config): Promise<Config> {
  // if not yet hosted, upload image
  const solanaConn = new Connection(config.providerUrl);
  const wallet = toWallet(config.walletSecret);
  const metaplex = toMetaplex(solanaConn, wallet, config.bundlrAddress);
  const metaplexImgUri = await getUploadedImgUri(
    config.nftTemplate.imgUri,
    metaplex
  );
  const imgType = toImgType(config.nftTemplate.imgUri);

  // upload metadata
  const metadata = await metaplex.nfts().uploadMetadata({
    name: config.nftTemplate.name,
    description: config.nftTemplate.description,
    image: metaplexImgUri,
    attributes: config.nftTemplate?.attributes,
    properties: {
      files: [
        {
          type: imgType,
          uri: metaplexImgUri,
        },
      ],
    },
  });
  console.log(`Uploaded NFT metadata ${metadata.uri}`);

  // serially mint nfts
  for (var nftDistro of config.nftDistributions) {
    const { nft } = await metaplex.nfts().create(
      {
        uri: metadata.uri,
        name: config.nftTemplate.name,
        sellerFeeBasisPoints: 0,
        symbol: config.nftTemplate?.symbol,
        // creators: creators,
        isMutable: true,
        maxSupply: toBigNumber(1),
      },
      { commitment: "finalized" }
    );
    nftDistro.nftMintPubkey = nft.mint.address.toString();
    nftDistro.status = "minted";

    console.log(
      `Assigning NFT mint ${nft.mint.address.toString()} to ${
        nftDistro.destPubkey
      }`
    );
  }

  return config;
}

export async function airdropNfts(config: Config): Promise<Config> {
  const solanaConn = new Connection(config.providerUrl);
  const wallet = toWallet(config.walletSecret);

  const canTransfer = config.nftDistributions.every(
    ({ nftMintPubkey, status }) =>
      nftMintPubkey !== undefined && status === "minted"
  );
  if (!canTransfer) {
    throw new Error("Not all NFTs have been minted yet");
  }

  for (const nftDistro of config.nftDistributions) {
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      solanaConn,
      wallet,
      new PublicKey(nftDistro.nftMintPubkey!),
      wallet.publicKey,
      false,
      "finalized"
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      solanaConn,
      wallet,
      new PublicKey(nftDistro.nftMintPubkey!),
      new PublicKey(nftDistro.destPubkey),
      false,
      "finalized"
    );

    await transfer(
      solanaConn,
      wallet, // Payer of the transaction fees
      fromTokenAccount.address, // Source account
      toTokenAccount.address, // Destination account
      wallet.publicKey, // Owner of the source account
      1 // Number of tokens to transfer
    );

    console.log(`Airdropped NFT to ${nftDistro.destPubkey}!`);

    nftDistro.status = "airdropped";
  }

  return config;
}

export async function updateNfts(config: Config): Promise<Config> {
  const solanaConn = new Connection(config.providerUrl);
  const wallet = toWallet(config.walletSecret);
  const metaplex = toMetaplex(solanaConn, wallet, config.bundlrAddress);

  const canUpdate = config.nftDistributions.every(
    ({ nftMintPubkey, status, imgUri }) =>
      nftMintPubkey !== undefined &&
      status === "airdropped" &&
      imgUri !== undefined
  );
  if (!canUpdate) {
    throw new Error(
      "Not all NFTs have been airdropped yet, or update imgUri not specified"
    );
  }

  // update serially
  for (const nftDistro of config.nftDistributions) {
    const nft = await metaplex.nfts().findByMint({
      mintAddress: new PublicKey(nftDistro.nftMintPubkey!),
    });
    if (!nft || !nft.json?.image) {
      throw new Error(
        `Unable to find existing nft or image uri for mint ${nftDistro.nftMintPubkey}!`
      );
    }

    const metaplexImgUri = await getUploadedImgUri(nftDistro.imgUri!, metaplex);

    // upload metadata
    const metadata = await metaplex.nfts().uploadMetadata({
      name: config.nftTemplate.name,
      description: config.nftTemplate.description,
      image: metaplexImgUri,
      attributes: config.nftTemplate.attributes,
      properties: {
        files: [
          {
            type: toImgType(nftDistro.imgUri!),
            uri: metaplexImgUri,
          },
        ],
      },
    });

    await metaplex.nfts().update(
      {
        name: config.nftTemplate.name,
        nftOrSft: nft,
        uri: metadata.uri,
        isMutable: false,
      },
      { commitment: "finalized" }
    );

    nftDistro.status = "updated";
    console.log(
      `Updated NFT metadata ${metadata.uri}, image ${metaplexImgUri}`
    );
  }

  return config;
}

///////////// helpers
async function getUploadedImgUri(
  imgUri: string,
  metaplex: Metaplex
): Promise<string> {
  if (!imgUri.startsWith("http")) {
    // presume local file - upload to metaplex
    const fileName = imgUri.split("/").pop()!;
    const imgBuffer = fs.readFileSync(imgUri);
    const imgMetaplexFile = toMetaplexFile(imgBuffer, fileName);

    const uploadedImgUri = await metaplex.storage().upload(imgMetaplexFile);
    console.log(`Uploaded NFT image to ${uploadedImgUri}`);
    return uploadedImgUri;
  } else {
    // presume already hosted file
    return imgUri;
  }
}

function toMetaplex(
  solanaConn: Connection,
  wallet: Keypair,
  bundlrAddress: string
): Metaplex {
  return Metaplex.make(solanaConn)
    .use(keypairIdentity(wallet))
    .use(
      bundlrStorage({
        address: bundlrAddress,
        providerUrl: solanaConn.rpcEndpoint,
        timeout: 60000,
      })
    );
}

function toWallet(privkey: string): Keypair {
  return Keypair.fromSecretKey(
    new Uint8Array(Array.from(bs58.decode(privkey)))
  );
}

function toImgType(fileName: string): string {
  const ext = fileName.split(".").pop()!.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    default:
      throw new Error(`Unsupported file type ${ext}`);
  }
}
