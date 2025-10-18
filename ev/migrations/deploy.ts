// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Ev } from "../target/types/ev";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

module.exports = async function (provider: anchor.AnchorProvider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);
  
  const program = anchor.workspace.Ev as Program<Ev>;
  const admin = provider.wallet.publicKey;
  const mint = Keypair.generate();

  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    program.programId
  );
  const [mintAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    program.programId
  );

  console.log("Initializing platform...");
  const feeBps = new anchor.BN(100); // 1% fee
  
  await program.methods
    .initializePlatform(feeBps)
    .accountsStrict({
      platformState,
      mintAuthority,
      mint: mint.publicKey,
      admin,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mint])
    .rpc({ commitment: "confirmed" });

  console.log("Platform initialized successfully!");
  console.log(`Program ID: ${program.programId}`);
  console.log(`Platform State: ${platformState}`);
  console.log(`Mint Account: ${mint.publicKey}`);
};
