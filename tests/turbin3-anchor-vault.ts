import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Turbin3AnchorVault } from "../target/types/turbin3_anchor_vault";
import { assert } from "chai";

describe("turbin3-anchor-vault", () => {
  // Configure the client to use the local cluster.
  let provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .turbin3AnchorVault as Program<Turbin3AnchorVault>;

  const vaultState = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("state"), provider.publicKey.toBytes()],
    program.programId
  )[0];

  const vault = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vaultState.toBytes()],
    program.programId
  )[0];

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().accountsPartial({
      user: provider.publicKey,
      vaultState,
      vault,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    console.log("Initialization transaction signature", tx);
  });

  it("Deposit Lamports", async () => {
    const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL)
    const tx = await program.methods.deposit(amount).accountsPartial({
      user: provider.publicKey,
      vaultState,
      vault,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    console.log("Deposit transaction signature", tx);
    const vaultBalance = await provider.connection.getBalance(vault);
    console.log(`Vault balance after deposit: ${ vaultBalance }, lamports`);
  });

  it("Try to withdraw more then vault balance", async () => {
    try {
      const amount = new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL)

      const tx = await program.methods.withdraw(amount).accountsPartial({
        user: provider.publicKey,
        vaultState,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).rpc();

      assert.fail("Expected transaction to fail but it succeeded");
    } catch (err) {
      const anchorErr = err as anchor.AnchorError;

      assert.equal(anchorErr.error.errorCode.code, "InsufficientVaultBalance")
    }
  });

  it("Try to withdraw including rent", async () => {
    try {
      const amount = new anchor.BN(100 + anchor.web3.LAMPORTS_PER_SOL)

      const tx = await program.methods.withdraw(amount).accountsPartial({
        user: provider.publicKey,
        vaultState,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).rpc();

      assert.fail("Expected transaction to fail but it succeeded");
    } catch (err) {
      const anchorErr = err as anchor.AnchorError;

      assert.equal(anchorErr.error.errorCode.code, "BelowRentExemption")
    }
  });

  it("Withdraw from vault", async () => {
    const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL)

    const tx = await program.methods.withdraw(amount).accountsPartial({
      user: provider.publicKey,
      vaultState,
      vault,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    console.log("Withdraw transaction signature", tx);
    const vaultBalance = await provider.connection.getBalance(vault);
    console.log(`Vault balance after withdraw: ${ vaultBalance }, lamports`);
  });

  it("Close PDA accounts", async () => {
    const tx = await program.methods.close().accountsPartial({
      user: provider.publicKey,
      vaultState,
      vault,
      systemProgram: anchor.web3.SystemProgram.programId
    }).rpc()

    console.log("Close Accounts transaction signature", tx);
    console.log("Vault account info after closing:", await provider.connection.getAccountInfo(vault));
    console.log("Vault state should be null (closed):", await provider.connection.getAccountInfo(vaultState));
  })
});
