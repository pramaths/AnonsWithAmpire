import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Ev } from "../target/types/ev";
import { assert } from "chai";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAccount,
  approve,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

describe("ev", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Ev as Program<Ev>;
  const admin = provider.wallet as anchor.Wallet;
  const driver = Keypair.generate();
  const buyer = Keypair.generate();
  const mint = Keypair.generate();

  let driverTokenAccount: PublicKey;
  let buyerTokenAccount: PublicKey;

  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    program.programId
  );
  const [mintAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    program.programId
  );
  const [platformAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_authority")],
    program.programId
  );
  const [driverAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("driver"), driver.publicKey.toBuffer()],
    program.programId
  );

  before(async () => {
    // Airdrop SOL to driver and buyer and confirm the transactions
    const driverAirdropSignature = await provider.connection.requestAirdrop(
      driver.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    let latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: driverAirdropSignature,
    });

    const buyerAirdropSignature = await provider.connection.requestAirdrop(
      buyer.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: buyerAirdropSignature,
    });
  });

  it("Initializes the platform", async () => {
    const feeBps = new anchor.BN(100); // 1% fee
    await program.methods
      .initializePlatform(feeBps)
      .accountsStrict({
        platformState,
        mintAuthority,
        mint: mint.publicKey,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mint])
      .rpc();

    const state = await program.account.platformState.fetch(platformState);
    console.log("Platform State after initialization:");
    console.log("- Total sessions:", state.totalSessions.toString());
    console.log("- Admin:", state.admin.toString());
    console.log("- Mint:", state.mint.toString());
    console.log("- Fee BPS:", state.feeBps.toString());
    
    assert.ok(state.admin.equals(admin.publicKey));
    assert.ok(state.mint.equals(mint.publicKey));
    assert.equal(state.feeBps.toNumber(), feeBps.toNumber());
    assert.equal(state.totalSessions.toString(), "0");
  });

  it("Registers a driver", async () => {
    await program.methods
      .registerDriver(driver.publicKey, new anchor.BN(100)) // e.g., 100 lamports per point
      .accountsStrict({
        driverAccount: driverAccount,
        platformState: platformState,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.driverAccount.fetch(driverAccount);
    assert.ok(account.driver.equals(driver.publicKey));
    assert.isTrue(account.active);
  });

  it("Approves platform access for a driver", async () => {
    driverTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      driver.publicKey
    );

    // Create associated token account if it doesn't exist
    const createTokenAccountIx = createAssociatedTokenAccountInstruction(
      driver.publicKey, // payer
      driverTokenAccount, // associated token account
      driver.publicKey, // owner
      mint.publicKey // mint
    );

    const transaction = new anchor.web3.Transaction().add(createTokenAccountIx);
    await provider.sendAndConfirm(transaction, [driver]);

    await program.methods
      .approvePlatformAccess(true, new anchor.BN(1000))
      .accountsStrict({
        driverAccount,
        platformState,
        driver: driver.publicKey,
        platformAuthority,
        driverTokenAccount: driverTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([driver])
      .rpc();

    const account = await program.account.driverAccount.fetch(driverAccount);
    assert.isTrue(account.active);
  });

  it("Records a charging session and mints points", async () => {
    const energyAmount = new anchor.BN(1000); // e.g., 1 kWh
    const chargerCode = "test-charger";
    const session = Keypair.generate();

    // Ensure driverTokenAccount is available (it should be created in the previous test)
    if (!driverTokenAccount) {
      driverTokenAccount = await getAssociatedTokenAddress(
        mint.publicKey,
        driver.publicKey
      );
    }

    await program.methods
      .recordSession(chargerCode, energyAmount)
      .accountsStrict({
        driverAccount: driverAccount,
        driverTokenAccount,
        platformState,
        mint: mint.publicKey,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        driver: driver.publicKey,
        session: session.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([driver, session])
      .rpc();

    const tokenAccountInfo = await getAccount(
      provider.connection,
      driverTokenAccount
    );
    // Debug logs for minted balance
    console.log('[Test] Mint pubkey:', mint.publicKey.toBase58());
    console.log('[Test] Driver token account:', driverTokenAccount.toBase58());
    console.log('[Test] Post-mint driver balance (smallest units):', tokenAccountInfo.amount.toString());
    
    // Check platform state to verify total sessions increased
    const platformStateInfo = await program.account.platformState.fetch(platformState);
    console.log("Platform State after session recording:");
    console.log("- Total sessions:", platformStateInfo.totalSessions.toString());
    console.log("- Admin:", platformStateInfo.admin.toString());
    console.log("- Mint:", platformStateInfo.mint.toString());
    
    // Energy amount is 1000 milli-kWh, with 1 kWh = 1000 tokens and 6 decimals
    // points_smallest = 1000 * 1_000_000 = 1,000,000,000
    assert.equal(tokenAccountInfo.amount.toString(), new anchor.BN(1000000000).toString());
    assert.equal(platformStateInfo.totalSessions.toString(), "1");
  });

  it("Allows a buyer to buy points from a driver", async () => {
    buyerTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      buyer.publicKey
    );

    // Create associated token account if it doesn't exist
    const createBuyerTokenAccountIx = createAssociatedTokenAccountInstruction(
      buyer.publicKey, // payer
      buyerTokenAccount, // associated token account
      buyer.publicKey, // owner
      mint.publicKey // mint
    );

    const transaction = new anchor.web3.Transaction().add(createBuyerTokenAccountIx);
    await provider.sendAndConfirm(transaction, [buyer]);
      
    const amountToBuy = new anchor.BN(50);
    const solPayment = new anchor.BN(LAMPORTS_PER_SOL / 2); // 0.5 SOL

    await approve(
      provider.connection,
      driver,
      driverTokenAccount,
      platformAuthority,
      driver,
      amountToBuy.toNumber()
    );

    await program.methods
      .buyPoints(amountToBuy, solPayment)
      .accountsStrict({
        buyer: buyer.publicKey,
        buyerTokenAccount: buyerTokenAccount,
        driverAccount: driverAccount,
        platformState,
        platformAuthority,
        driver: driver.publicKey,
        driverTokenAccount: driverTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const buyerTokenAccountInfo = await getAccount(
      provider.connection,
      buyerTokenAccount
    );
    console.log('[Test] Buyer token account:', buyerTokenAccount.toBase58());
    console.log('[Test] Buyer post-buy balance (smallest units):', buyerTokenAccountInfo.amount.toString());
    assert.equal(
      buyerTokenAccountInfo.amount.toString(),
      amountToBuy.toString()
    );

    const driverTokenAccountInfo = await getAccount(
      provider.connection,
      driverTokenAccount
    );
    console.log('[Test] Driver token account:', driverTokenAccount.toBase58());
    console.log('[Test] Driver post-sell balance (smallest units):', driverTokenAccountInfo.amount.toString());
    // Initial 1,000,000 - 50 sold = 999,950
    assert.equal(
      driverTokenAccountInfo.amount.toString(),
      new anchor.BN(999999950).toString()
    );
  });
});
