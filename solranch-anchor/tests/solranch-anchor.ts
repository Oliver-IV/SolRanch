import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
// Asegúrate de que el nombre 'SolranchAnchor' coincida con tu /target/types/solranch_anchor.ts
import { SolranchAnchor } from "../target/types/solranch_anchor";
import { assert } from "chai";

describe("solranch-anchor", () => {
  // --- Configuración del Cliente ---
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  // Usa 'solranchAnchor' (camelCase)
  const program = anchor.workspace.solranchAnchor as Program<SolranchAnchor>;

  // --- ACTORES (Wallets) ---
  // Esta es tu wallet '9fKY...', la que ejecuta el test
  const superAuthority = provider.wallet as anchor.Wallet;
  const rancherKeypair = anchor.web3.Keypair.generate();
  const verifierKeypair = anchor.web3.Keypair.generate();
  const buyerKeypair = anchor.web3.Keypair.generate();
  const randomUserKeypair = anchor.web3.Keypair.generate();

  // --- PDAs (Direcciones de Cuentas) ---
  let ranchProfilePda: anchor.web3.PublicKey;
  let verifierProfilePda: anchor.web3.PublicKey;
  let animalPda: anchor.web3.PublicKey;
  let ranchProfileBump: number;
  let verifierProfileBump: number;
  let animalBump: number;

  // --- Datos de Prueba ---
  const country = { mexico: {} }; // Enum para Country::Mexico
  const animalSalePrice = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 2); // 2 SOL

  // Función auxiliar para obtener balances
  const getBalance = async (pubkey: anchor.web3.PublicKey) =>
    provider.connection.getBalance(pubkey);

  // Damos fondos a todos los actores antes de empezar
  before(async () => {
    // Airdrop a todos los keypairs
    await Promise.all(
      [
        rancherKeypair.publicKey,
        verifierKeypair.publicKey,
        buyerKeypair.publicKey,
        randomUserKeypair.publicKey,
      ].map(async (pubkey) => {
        const airdropTx = await provider.connection.requestAirdrop(
          pubkey,
          anchor.web3.LAMPORTS_PER_SOL * 10
        );
        await provider.connection.confirmTransaction(airdropTx, "confirmed");
      })
    );
  });

  // =================================================================
  // CAPÍTULO 1: CONFIGURACIÓN (ADMIN)
  // =================================================================
  it("Admin (Super Autoridad) registra un nuevo Verificador", async () => {
    const verifierName = "Verificador Confiable S.A.";
    [verifierProfilePda, verifierProfileBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("verifier"), verifierKeypair.publicKey.toBuffer()],
        program.programId
      );

    await program.methods
      .registerVerifier(verifierKeypair.publicKey, verifierName)
      .accounts({
        verifierProfile: verifierProfilePda,
        superAuthority: superAuthority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const profile = await program.account.verifierProfile.fetch(
      verifierProfilePda
    );
    assert.ok(profile.authority.equals(verifierKeypair.publicKey));
    assert.equal(profile.name, verifierName);
    assert.isTrue(profile.isActive);
  });

  // =================================================================
  // CAPÍTULO 2: REGISTRO DE UN RANCHERO
  // =================================================================
  it("Un Ranchero registra su perfil (RanchProfile)", async () => {
    const ranchName = "Rancho El Sol";
    [ranchProfilePda, ranchProfileBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("ranch"), rancherKeypair.publicKey.toBuffer()],
        program.programId
      );

    await program.methods
      .registerRanch(ranchName, country)
      .accounts({
        ranchProfile: ranchProfilePda,
        authority: rancherKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([rancherKeypair])
      .rpc();

    const profile = await program.account.ranchProfile.fetch(ranchProfilePda);
    assert.ok(profile.authority.equals(rancherKeypair.publicKey));
    assert.equal(profile.name, ranchName);
    assert.equal(profile.animalCount.toNumber(), 0);
    assert.isFalse(profile.isVerified); // Comprueba que inicia como no verificado
  });

  // =================================================================
  // CAPÍTULO 3: VERIFICACIÓN DEL RANCHO
  // =================================================================
  it("Admin (Super Autoridad) verifica el rancho", async () => {
    await program.methods
      .verifyRanch()
      .accounts({
        ranchProfile: ranchProfilePda,
        superAuthority: superAuthority.publicKey,
      })
      .rpc();

    const profile = await program.account.ranchProfile.fetch(ranchProfilePda);
    assert.isTrue(profile.isVerified); // ¡Ahora está verificado!
  });

  // =================================================================
  // CAPÍTULO 4: REGISTRO DE UN ANIMAL (Multi-Firma)
  // =================================================================
  it("Ranchero y Verificador colaboran para registrar un Animal", async () => {
    // El animal_count actual es 0 (para el primer animal)
    const animalCount = (
      await program.account.ranchProfile.fetch(ranchProfilePda)
    ).animalCount;

    [animalPda, animalBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("ranch_animal"), // ¡Usando tu seed "ranch_animal"!
        ranchProfilePda.toBuffer(),
        animalCount.toBuffer("le", 8),
      ],
      program.programId
    );

    const birthDate = new anchor.BN(new Date().getTime() / 1000); // Timestamp actual

    await program.methods
      .registerAnimal("CHIP-001", "Bovino", "Angus", birthDate)
      .accounts({
        animal: animalPda,
        ranchProfile: ranchProfilePda,
        verifierProfile: verifierProfilePda,
        authority: rancherKeypair.publicKey,
        verifier: verifierKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([rancherKeypair, verifierKeypair]) // ¡Ambos firman!
      .rpc();

    const animal = await program.account.animal.fetch(animalPda);
    assert.ok(animal.owner.equals(rancherKeypair.publicKey));
    assert.ok(animal.originRanch.equals(ranchProfilePda));
    assert.equal(animal.id.toNumber(), 0);
    assert.equal(animal.idChip, "CHIP-001");

    const ranch = await program.account.ranchProfile.fetch(ranchProfilePda);
    assert.equal(ranch.animalCount.toNumber(), 1); // Contador incrementado
  });

  // =================================================================
  // CAPÍTULO 5: PREPARACIÓN DE LA VENTA (CORREGIDO)
  // =================================================================
  it("Rancher (dueño) pone precio a su animal", async () => {
    await program.methods
      .setAnimalPrice(animalSalePrice)
      .accounts({
        animal: animalPda,
        owner: rancherKeypair.publicKey,
        originRanch: ranchProfilePda, // ✅ CORREGIDO: camelCase
      })
      .signers([rancherKeypair])
      .rpc();

    const animal = await program.account.animal.fetch(animalPda);
    assert.ok(animal.salePrice.eq(animalSalePrice));
  });

  it("Rancher (dueño) aprueba un comprador específico", async () => {
    await program.methods
      .setAllowedAnimalBuyer(buyerKeypair.publicKey)
      .accounts({
        animal: animalPda,
        owner: rancherKeypair.publicKey,
        originRanch: ranchProfilePda, // ✅ CORREGIDO: camelCase
      })
      .signers([rancherKeypair])
      .rpc();

    const animal = await program.account.animal.fetch(animalPda);
    assert.ok(animal.allowedBuyer.equals(buyerKeypair.publicKey));
  });

  // =================================================================
  // CAPÍTULO 6: LA COMPRA (CPI Transfer)
  // =================================================================
  it("Comprador adquiere el animal (transfiriendo SOL)", async () => {
    const sellerBalanceBefore = await getBalance(rancherKeypair.publicKey);
    const buyerBalanceBefore = await getBalance(buyerKeypair.publicKey);

    await program.methods
      .purchaseAnimal()
      .accounts({
        animal: animalPda,
        owner: rancherKeypair.publicKey, // El Vendedor (recibe SOL)
        buyer: buyerKeypair.publicKey, // El Comprador (paga SOL)
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyerKeypair])
      .rpc();

    // 1. Comprobar balances
    const sellerBalanceAfter = await getBalance(rancherKeypair.publicKey);
    const buyerBalanceAfter = await getBalance(buyerKeypair.publicKey);

    assert.equal(
      sellerBalanceAfter,
      sellerBalanceBefore + animalSalePrice.toNumber()
    );
    assert.isAtMost(
      buyerBalanceAfter,
      buyerBalanceBefore - animalSalePrice.toNumber()
    );

    // 2. Comprobar el estado del animal
    const animal = await program.account.animal.fetch(animalPda);
    assert.ok(animal.owner.equals(buyerKeypair.publicKey)); // ¡Nuevo dueño!
    assert.isNull(animal.salePrice); // Se resetea
    assert.isNull(animal.allowedBuyer); // Se resetea
    assert.ok(animal.lastSalePrice.eq(animalSalePrice)); // Se guarda el historial
  });

  // =================================================================
  // CAPÍTULO 7: PRUEBA DE SEGURIDAD
  // =================================================================
  it("Falla al registrar verifier si NO es la Super Autoridad", async () => {
    const anotherVerifier = anchor.web3.Keypair.generate();
    const [pda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("verifier"), anotherVerifier.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .registerVerifier(anotherVerifier.publicKey, "Hacker Man")
        .accounts({
          verifierProfile: pda,
          superAuthority: randomUserKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([randomUserKeypair])
        .rpc();

      assert.fail("¡La transacción debió fallar por no ser admin!");
    } catch (err) {
      // El error debe ser el 'UnauthorizedError' que definiste
      assert.equal(err.error.errorCode.code, "UnauthorizedError");
      console.log(
        "\nTest de seguridad pasado: Usuario no autorizado fue rechazado."
      );
    }
  });
});