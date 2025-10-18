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
    // Airdrop SOL to driver and buyer
    await provider.connection.requestAirdrop(
      driver.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      buyer.publicKey,
      2 * LAMPORTS_PER_SOL
    );
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
    assert.ok(state.admin.equals(admin.publicKey));
    assert.ok(state.mint.equals(mint.publicKey));
    assert.equal(state.feeBps.toNumber(), feeBps.toNumber());
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
    driverTokenAccount = await createAccount(
      provider.connection,
      driver,
      mint.publicKey,
      driver.publicKey
    );

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
    assert.equal(tokenAccountInfo.amount.toString(), new anchor.BN(100).toString());
  });

  it("Allows a buyer to buy points from a driver", async () => {
    buyerTokenAccount = await createAccount(
      provider.connection,
      buyer,
      mint.publicKey,
      buyer.publicKey
    );
      
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
    assert.equal(
      buyerTokenAccountInfo.amount.toString(),
      amountToBuy.toString()
    );

    const driverTokenAccountInfo = await getAccount(
      provider.connection,
      driverTokenAccount
    );
    // Initial 100 - 50 sold
    assert.equal(
      driverTokenAccountInfo.amount.toString(),
      new anchor.BN(50).toString()
    );
  });
});
