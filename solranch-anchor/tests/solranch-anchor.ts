import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolranchAnchor } from "../target/types/solranch_anchor"; // Nombre del tipo generado
import { assert } from "chai";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"; // Importar clases necesarias

describe("solranch-anchor", () => {
  // --- Configuración ---
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SolranchAnchor as Program<SolranchAnchor>; // Nombre del programa en Anchor.toml

  // --- Mapa de Errores (para parsear errores de programa) ---
  const idlErrors = new Map<number, string>();
  program.idl.errors.forEach((error) => {
    idlErrors.set(error.code, error.msg || error.name);
  });

  // --- Actores ---
  const superAuthority = provider.wallet as anchor.Wallet; // Tu wallet
  const rancherKeypair = anchor.web3.Keypair.generate();
  const verifierKeypair = anchor.web3.Keypair.generate();
  const buyerKeypair = anchor.web3.Keypair.generate();
  const randomUserKeypair = anchor.web3.Keypair.generate();

  // --- PDAs ---
  let ranchProfilePda: PublicKey;
  let verifierProfilePda: PublicKey;
  let animalPda: PublicKey; // Animal principal para el flujo
  let animalToCancelPda: PublicKey; // Animal para probar cancelación
  let ranchProfileBump: number;
  let verifierProfileBump: number;
  let animalBump: number;
  let animalToCancelBump: number;

  // --- Datos ---
  const country = { mexico: {} }; // Coincide con tu enum Country::Mexico
  const animalSalePrice = new anchor.BN(LAMPORTS_PER_SOL * 0.5); // 0.5 SOL
  const testAnimalDetails = {
    idChip: `TEST-${Date.now()}`,
    specie: "Bovino",
    breed: "Angus Rojo",
    birthDate: new anchor.BN(Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90), // ~90 días
  };

  // --- Helper ---
  const getBalance = async (pubkey: PublicKey) => provider.connection.getBalance(pubkey);

  // --- Setup Inicial ---
  before(async () => {
    // Airdrop
    await Promise.all(
      [
        rancherKeypair.publicKey,
        verifierKeypair.publicKey,
        buyerKeypair.publicKey,
        randomUserKeypair.publicKey,
      ].map(async (pubkey) => {
        const sig = await provider.connection.requestAirdrop(pubkey, LAMPORTS_PER_SOL * 5); // 5 SOL
        const latestBlockhash = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction({
          signature: sig,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        }, "confirmed");
      })
    );
    console.log("-> Airdrops completados.");

    // Calcular PDAs iniciales (se recalcularán si es necesario)
    [verifierProfilePda, verifierProfileBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier"), verifierKeypair.publicKey.toBuffer()],
      program.programId
    );
    [ranchProfilePda, ranchProfileBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("ranch"), rancherKeypair.publicKey.toBuffer()],
      program.programId
    );
  });

  // =================================================================
  // 1. ADMIN: REGISTRO DE VERIFICADOR
  // =================================================================
  it("Admin registra un Verificador", async () => {
    const verifierName = "Inspector Pecuario Certificado";
    await program.methods
      .registerVerifier(verifierKeypair.publicKey, verifierName)
      .accounts({
        verifierProfile: verifierProfilePda,
        superAuthority: superAuthority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const profile = await program.account.verifierProfile.fetch(verifierProfilePda);
    assert.ok(profile.authority.equals(verifierKeypair.publicKey));
    assert.equal(profile.name, verifierName);
    assert.isTrue(profile.isActive);
    assert.equal(profile.bump, verifierProfileBump);
    console.log(`-> Verificador registrado: ${verifierProfilePda.toBase58()}`);
  });

  // =================================================================
  // 2. RANCHERO: REGISTRO DE RANCHO
  // =================================================================
  it("Ranchero registra su Rancho", async () => {
    const ranchName = "Rancho Verde";
    await program.methods
      .registerRanch(ranchName, country)
      .accounts({
        ranchProfile: ranchProfilePda,
        authority: rancherKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([rancherKeypair])
      .rpc();

    const profile = await program.account.ranchProfile.fetch(ranchProfilePda);
    assert.ok(profile.authority.equals(rancherKeypair.publicKey));
    assert.equal(profile.name, ranchName);
    assert.deepStrictEqual(profile.country, country);
    assert.equal(profile.animalCount.toNumber(), 0);
    assert.isFalse(profile.isVerified);
    assert.equal(profile.bump, ranchProfileBump);
    console.log(`-> Rancho registrado: ${ranchProfilePda.toBase58()}`);
  });

  // =================================================================
  // 3. ADMIN: VERIFICACIÓN DE RANCHO
  // =================================================================
  it("Admin verifica el Rancho", async () => {
    // Usamos set_ranch_verification para ponerlo en true
    await program.methods
      .setRanchVerification(true)
      .accounts({
        ranchProfile: ranchProfilePda,
        superAuthority: superAuthority.publicKey,
      })
      .rpc();

    const profile = await program.account.ranchProfile.fetch(ranchProfilePda);
    assert.isTrue(profile.isVerified);
    console.log(`-> Rancho verificado: ${ranchProfilePda.toBase58()}`);
  });

  // =================================================================
  // 4. RANCHERO: REGISTRO DE ANIMAL (PASO 1)
  // =================================================================
  it("Ranchero registra un Animal (pendiente de verificación)", async () => {
    const ranchProfile = await program.account.ranchProfile.fetch(ranchProfilePda);
    const currentAnimalCount = ranchProfile.animalCount; // Es 0 para el primer animal

    [animalPda, animalBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("ranch_animal"),
        ranchProfilePda.toBuffer(),
        currentAnimalCount.toBuffer("le", 8), // Usar contador actual para seed/ID
      ],
      program.programId
    );
    console.log(` -> Calculado PDA para Animal #${currentAnimalCount.toNumber()}: ${animalPda.toBase58()}`);

    await program.methods
      .registerAnimal(
        testAnimalDetails.idChip,
        testAnimalDetails.specie,
        testAnimalDetails.breed,
        testAnimalDetails.birthDate
      )
      .accounts({
        animal: animalPda,
        ranchProfile: ranchProfilePda,
        verifierProfile: verifierProfilePda, // Pasar el perfil, no la autoridad
        authority: rancherKeypair.publicKey, // Solo firma ranchero
        systemProgram: SystemProgram.programId,
      })
      .signers([rancherKeypair])
      .rpc();

    // Verificar animal on-chain
    const animal = await program.account.animal.fetch(animalPda);
    assert.ok(animal.owner.equals(rancherKeypair.publicKey));
    assert.ok(animal.originRanch.equals(ranchProfilePda));
    assert.equal(animal.id.toNumber(), currentAnimalCount.toNumber());
    assert.equal(animal.idChip, testAnimalDetails.idChip);
    assert.isFalse(animal.isVerified); // Debe estar NO verificado
    assert.ok(animal.assignedVerifier.equals(verifierKeypair.publicKey)); // Verificador asignado
    assert.equal(animal.bump, animalBump);

    // Verificar contador del rancho on-chain
    const ranchUpdated = await program.account.ranchProfile.fetch(ranchProfilePda);
    assert.equal(ranchUpdated.animalCount.toNumber(), currentAnimalCount.toNumber() + 1);

    console.log(`-> Animal ${animal.idChip} registrado (pendiente): ${animalPda.toBase58()}`);
  });

  // =================================================================
  // 5. VERIFICADOR: APROBACIÓN DE ANIMAL (PASO 2)
  // =================================================================
  it("Verificador aprueba el registro del Animal", async () => {
    assert.isDefined(animalPda, "animalPda no definido"); // Asegurar que existe

    await program.methods
      .approveAnimal()
      .accounts({
        animal: animalPda,
        assignedVerifier: verifierKeypair.publicKey, // Firmante debe ser el asignado
      })
      .signers([verifierKeypair]) // Solo firma verificador
      .rpc();

    // Verificar animal on-chain
    const animal = await program.account.animal.fetch(animalPda);
    assert.isTrue(animal.isVerified); // AHORA debe estar verificado

    console.log(`-> Animal ${animal.idChip} APROBADO: ${animalPda.toBase58()}`);
  });

  // =================================================================
  // 6. RANCHERO: PREPARACIÓN VENTA (Post-Aprobación)
  // =================================================================
  it("Ranchero pone precio al animal APROBADO", async () => {
    await program.methods
      .setAnimalPrice(animalSalePrice)
      .accounts({
        animal: animalPda,
        owner: rancherKeypair.publicKey, // El dueño actual (ranchero)
        originRanch: ranchProfilePda, // Necesario para la validación de seeds en la instrucción
        systemProgram: SystemProgram.programId, // Puede ser necesario implícitamente
      })
      .signers([rancherKeypair])
      .rpc();

    const animal = await program.account.animal.fetch(animalPda);
    assert.isTrue(animal.salePrice?.eq(animalSalePrice));
    console.log(`-> Precio ${animalSalePrice} asignado a ${animalPda.toBase58()}`);
  });

  it("Ranchero aprueba un comprador específico para el animal APROBADO", async () => {
    await program.methods
      .setAllowedAnimalBuyer(buyerKeypair.publicKey)
      .accounts({
        animal: animalPda,
        owner: rancherKeypair.publicKey,
        originRanch: ranchProfilePda, // Necesario para validación de seeds
        systemProgram: SystemProgram.programId,
      })
      .signers([rancherKeypair])
      .rpc();

    const animal = await program.account.animal.fetch(animalPda);
    assert.isTrue(animal.allowedBuyer?.equals(buyerKeypair.publicKey));
    console.log(`-> Comprador ${buyerKeypair.publicKey.toBase58()} aprobado para ${animalPda.toBase58()}`);
  });

  // =================================================================
  // 7. COMPRADOR: COMPRA DEL ANIMAL (Post-Aprobación)
  // =================================================================
  it("Comprador adquiere el animal APROBADO", async () => {
    const sellerBalanceBefore = await getBalance(rancherKeypair.publicKey);
    const buyerBalanceBefore = await getBalance(buyerKeypair.publicKey);

    await program.methods
      .purchaseAnimal()
      .accounts({
        animal: animalPda,
        owner: rancherKeypair.publicKey, // Vendedor (recibe SOL)
        buyer: buyerKeypair.publicKey, // Comprador (paga SOL y firma)
        systemProgram: SystemProgram.programId,
      })
      .signers([buyerKeypair])
      .rpc();

    // Verificar balances (con margen para fee)
    const sellerBalanceAfter = await getBalance(rancherKeypair.publicKey);
    const buyerBalanceAfter = await getBalance(buyerKeypair.publicKey);
    const feeMargin = LAMPORTS_PER_SOL * 0.0001; // Pequeño margen para tarifas

    assert.equal(sellerBalanceAfter, sellerBalanceBefore + animalSalePrice.toNumber(), "Balance vendedor incorrecto");
    assert.isTrue(
      buyerBalanceAfter <= buyerBalanceBefore - animalSalePrice.toNumber() &&
      buyerBalanceAfter >= buyerBalanceBefore - animalSalePrice.toNumber() - feeMargin,
      `Balance comprador (${buyerBalanceAfter}) fuera de rango esperado`
    );

    // Verificar estado del animal on-chain
    const animal = await program.account.animal.fetch(animalPda);
    assert.ok(animal.owner.equals(buyerKeypair.publicKey)); // Nuevo dueño
    assert.isNull(animal.salePrice);
    assert.isNull(animal.allowedBuyer);
    assert.ok(animal.lastSalePrice.eq(animalSalePrice));

    console.log(`-> Animal ${animalPda.toBase58()} comprado por ${buyerKeypair.publicKey.toBase58()}`);
  });

  // =================================================================
  // 8. CANCELACIÓN: REGISTRO Y CANCELACIÓN DE OTRO ANIMAL
  // =================================================================
  describe("Cancelación de Registro", () => {
    it("Ranchero registra un SEGUNDO animal (para cancelar)", async () => {
      const ranchProfile = await program.account.ranchProfile.fetch(ranchProfilePda);
      const secondAnimalCount = ranchProfile.animalCount; // Ahora es 1

      [animalToCancelPda, animalToCancelBump] = PublicKey.findProgramAddressSync(
        [ Buffer.from("ranch_animal"), ranchProfilePda.toBuffer(), secondAnimalCount.toBuffer("le", 8) ],
        program.programId
      );
      console.log(` -> Calculado PDA para Animal a cancelar #${secondAnimalCount.toNumber()}: ${animalToCancelPda.toBase58()}`);

      await program.methods
        .registerAnimal("CHIP-CANCEL", "Ovino", "Dorper", new anchor.BN(Date.now()/1000))
        .accounts({
          animal: animalToCancelPda,
          ranchProfile: ranchProfilePda,
          verifierProfile: verifierProfilePda,
          authority: rancherKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([rancherKeypair])
        .rpc();

      const animal = await program.account.animal.fetch(animalToCancelPda);
      assert.isFalse(animal.isVerified);
      const ranchUpdated = await program.account.ranchProfile.fetch(ranchProfilePda);
      assert.equal(ranchUpdated.animalCount.toNumber(), secondAnimalCount.toNumber() + 1); // Contador debe ser 2
      console.log(` -> Segundo animal ${animalToCancelPda.toBase58()} registrado (pendiente). Contador rancho: ${ranchUpdated.animalCount.toNumber()}`);
    });

    it("Ranchero cancela el registro del SEGUNDO animal", async () => {
        assert.isDefined(animalToCancelPda, "animalToCancelPda no definido");
        const ranchProfileBefore = await program.account.ranchProfile.fetch(ranchProfilePda);
        const countBefore = ranchProfileBefore.animalCount.toNumber(); // Debería ser 2
        const receiverBalanceBefore = await getBalance(rancherKeypair.publicKey);

        // Fetch animal account info to get lamports for rent refund check
        const animalAccountInfoBefore = await provider.connection.getAccountInfo(animalToCancelPda);
        const rentBefore = animalAccountInfoBefore?.lamports || 0;

        await program.methods
            .cancelAnimalRegistration()
            .accounts({
                animal: animalToCancelPda,
                ranchProfile: ranchProfilePda,
                authority: rancherKeypair.publicKey, // << CORRECCIÓN: Rancher es la autoridad del perfil del rancho
                signer: rancherKeypair.publicKey,      // Ranchero (dueño) firma
                receiver: rancherKeypair.publicKey,    // Ranchero recibe el alquiler
                systemProgram: SystemProgram.programId,
            })
            .signers([rancherKeypair])
            .rpc();

        // Verificar que la cuenta del animal se cerró
        const animalAccountInfoAfter = await provider.connection.getAccountInfo(animalToCancelPda);
        assert.isNull(animalAccountInfoAfter, "La cuenta del animal cancelado aún existe");

        // Verificar que el contador del rancho decrementó
        const ranchProfileAfter = await program.account.ranchProfile.fetch(ranchProfilePda);
        assert.equal(ranchProfileAfter.animalCount.toNumber(), countBefore - 1, "Contador del rancho no decrementó");

        // Verificar reembolso de alquiler (aproximado)
        const receiverBalanceAfter = await getBalance(rancherKeypair.publicKey);
        // La ganancia debe ser al menos el alquiler menos una pequeña fee por la TX de cancelación
        const feeMargin = LAMPORTS_PER_SOL * 0.0001;
        assert.isTrue(receiverBalanceAfter >= receiverBalanceBefore + rentBefore - feeMargin, "Reembolso de alquiler parece incorrecto");

        console.log(`-> Registro de ${animalToCancelPda.toBase58()} cancelado. Contador rancho: ${ranchProfileAfter.animalCount.toNumber()}`);
    });

     it("Verificador Falla al cancelar animal ya verificado", async () => {
         assert.isDefined(animalPda, "animalPda (el verificado) no definido");
         try {
             await program.methods
                 .cancelAnimalRegistration()
                 .accounts({
                     animal: animalPda, // Intentar cancelar el animal YA VERIFICADO
                     ranchProfile: ranchProfilePda,
                     authority: rancherKeypair.publicKey, // << CORRECCIÓN: Rancher es la autoridad del perfil del rancho
                     signer: verifierKeypair.publicKey, // Verificador asignado firma
                     receiver: verifierKeypair.publicKey,
                     systemProgram: SystemProgram.programId,
                 })
                 .signers([verifierKeypair])
                 .rpc();
             assert.fail("Debió fallar al cancelar un animal verificado");
         } catch (err) {
             assert.isNotNull(err.error, `err.error is null in cancel-verified test: ${err}`);
             // << CORRECCIÓN: Usar el código de error string, ya que el número 6014 es arbitrario.
             assert.strictEqual(err.error.errorCode.code, "CannotCancelVerifiedAnimalError", "Nombre de error incorrecto");
             console.log(" -> Test pasado: No se puede cancelar animal verificado.");
         }
     });

    it("Usuario Aleatorio Falla al cancelar animal", async () => {
         // Necesitamos otro animal pendiente para este test
         const ranchProfile = await program.account.ranchProfile.fetch(ranchProfilePda);
         const thirdAnimalCount = ranchProfile.animalCount; // Debería ser 1 ahora
         const [thirdAnimalPda, _] = PublicKey.findProgramAddressSync(
        	 [ Buffer.from("ranch_animal"), ranchProfilePda.toBuffer(), thirdAnimalCount.toBuffer("le", 8) ],
        	 program.programId
         );
         await program.methods
        	 .registerAnimal("CHIP-THIRD", "Caprino", "Nubia", new anchor.BN(Date.now()/1000))
        	 .accounts({ animal: thirdAnimalPda, ranchProfile: ranchProfilePda, verifierProfile: verifierProfilePda, authority: rancherKeypair.publicKey, systemProgram: SystemProgram.programId })
        	 .signers([rancherKeypair]).rpc();
         console.log(`  -> Creado ${thirdAnimalPda.toBase58()} para test de fallo por signer`);

         // Intentar cancelar con randomUser
         try {
             await program.methods
                 .cancelAnimalRegistration()
                 .accounts({
                     animal: thirdAnimalPda,
                     ranchProfile: ranchProfilePda,
                     authority: rancherKeypair.publicKey, // << CORRECCIÓN: Rancher es la autoridad del perfil del rancho
                     signer: randomUserKeypair.publicKey, // <-- Signer incorrecto
                     receiver: randomUserKeypair.publicKey,
                     systemProgram: SystemProgram.programId,
                 })
                 .signers([randomUserKeypair])
                 .rpc();
             assert.fail("Debió fallar por signer no autorizado para cancelar");
         } catch (err) {
             assert.isNotNull(err.error, `err.error is null in cancel-random test: ${err}`);
             // << CORRECCIÓN: Usar el código de error string, ya que el número 6013 es arbitrario.
             assert.strictEqual(err.error.errorCode.code, "UnauthorizedCancellationSignerError", "Nombre de error incorrecto");
             console.log(" -> Test pasado: Usuario aleatorio no puede cancelar.");
         }
          // Limpieza: Cancelar el tercer animal correctamente para no dejar basura
          await program.methods.cancelAnimalRegistration().accounts({ 
                animal: thirdAnimalPda, 
                ranchProfile: ranchProfilePda, 
                authority: rancherKeypair.publicKey, // << CORRECCIÓN: Rancher es la autoridad del perfil del rancho
                signer: rancherKeypair.publicKey, 
                receiver: rancherKeypair.publicKey, 
                systemProgram: SystemProgram.programId 
             }).signers([rancherKeypair]).rpc();
          console.log(`  -> Limpiado ${thirdAnimalPda.toBase58()}`);
     });
  });

  // =================================================================
  // 9. ADMIN: GESTIÓN DE ESTADOS
  // =================================================================
  describe("Admin: Gestión de Estados", () => {
    it("Admin desactiva y reactiva un Verificador", async () => {
      let profile = await program.account.verifierProfile.fetch(verifierProfilePda);
      assert.isTrue(profile.isActive);

      // Desactivar
      await program.methods.toggleVerifierStatus().accounts({
        verifierProfile: verifierProfilePda,
        superAuthority: superAuthority.publicKey,
      }).rpc();
      profile = await program.account.verifierProfile.fetch(verifierProfilePda);
      assert.isFalse(profile.isActive);
      console.log(`-> Verificador ${verifierProfilePda.toBase58()} desactivado.`);

      // Reactivar
      await program.methods.toggleVerifierStatus().accounts({
        verifierProfile: verifierProfilePda,
        superAuthority: superAuthority.publicKey,
      }).rpc();
      profile = await program.account.verifierProfile.fetch(verifierProfilePda);
      assert.isTrue(profile.isActive);
      console.log(`-> Verificador ${verifierProfilePda.toBase58()} reactivado.`);
    });

    it("Admin revoca y restaura la verificación de un Rancho", async () => {
      let profile = await program.account.ranchProfile.fetch(ranchProfilePda);
      assert.isTrue(profile.isVerified);

      // Revocar (set false)
      await program.methods.setRanchVerification(false).accounts({
        ranchProfile: ranchProfilePda,
        superAuthority: superAuthority.publicKey,
      }).rpc();
      profile = await program.account.ranchProfile.fetch(ranchProfilePda);
      assert.isFalse(profile.isVerified);
      console.log(`-> Verificación de Rancho ${ranchProfilePda.toBase58()} revocada.`);

      // Restaurar (set true)
      await program.methods.setRanchVerification(true).accounts({
        ranchProfile: ranchProfilePda,
        superAuthority: superAuthority.publicKey,
      }).rpc();
      profile = await program.account.ranchProfile.fetch(ranchProfilePda);
      assert.isTrue(profile.isVerified);
      console.log(`-> Verificación de Rancho ${ranchProfilePda.toBase58()} restaurada.`);
    });
  });


  // =================================================================
  // 10. TESTS DE SEGURIDAD ADICIONALES
  // =================================================================
  describe("Seguridad Adicional", () => {
    it("Falla al registrar verifier si NO es Super Autoridad", async () => {
      const anotherKP = anchor.web3.Keypair.generate();
      const [pda, _] = PublicKey.findProgramAddressSync(
        [Buffer.from("verifier"), anotherKP.publicKey.toBuffer()], program.programId
      );
      try {
        await program.methods.registerVerifier(anotherKP.publicKey, "Hacker")
          .accounts({ verifierProfile: pda, superAuthority: randomUserKeypair.publicKey, systemProgram: SystemProgram.programId })
          .signers([randomUserKeypair]).rpc();
        assert.fail("Debió fallar por no ser Super Autoridad");
      } catch (err) {
        // Acceder directamente a las propiedades del error
        assert.isNotNull(err.error, "err.error is null");
        // VERIFICA ESTOS NÚMEROS Y NOMBRES CON TU IDL / errors.rs
        assert.strictEqual(err.error.errorCode.number, 6007, "Error number should be 6007 (UnauthorizedError)");
        assert.strictEqual(err.error.errorCode.code, "UnauthorizedError", "Error code name mismatch");
        console.log(" -> Test pasado: Falla registerVerifier sin Super Autoridad.");
      }
    });

    it("Falla al aprobar animal si NO es Verificador Asignado", async () => {
        // Usamos el animal principal 'animalPda' que fue asignado a 'verifierKeypair'
        assert.isDefined(animalPda);
        try {
            await program.methods.approveAnimal()
                .accounts({
                    animal: animalPda,
                    assignedVerifier: randomUserKeypair.publicKey, // <-- Signer incorrecto
                })
                .signers([randomUserKeypair]) // Firma el usuario incorrecto
                .rpc();
            assert.fail("Debió fallar por no ser Verificador Asignado");
        } catch (err) {
            assert.isNotNull(err.error, "err.error is null");
            // VERIFICA ESTOS NÚMEROS Y NOMBRES CON TU IDL / errors.rs
            assert.strictEqual(err.error.errorCode.number, 6010, "Error number should be 6010 (UnauthorizedVerifierError)");
            assert.strictEqual(err.error.errorCode.code, "UnauthorizedVerifierError", "Error code name mismatch");
            console.log(" -> Test pasado: Falla approveAnimal sin ser Verificador Asignado.");
        }
    });

     it("Falla al poner precio si NO es el dueño", async () => {
        // 'animalPda' ahora pertenece a 'buyerKeypair'
        assert.isDefined(animalPda);
        try {
            await program.methods.setAnimalPrice(new anchor.BN(1))
                .accounts({
                    animal: animalPda,
                    owner: rancherKeypair.publicKey, // <-- Dueño incorrecto
                    originRanch: ranchProfilePda,
                    systemProgram: SystemProgram.programId,
                })
                .signers([rancherKeypair])
                .rpc();
            assert.fail("Debió fallar por no ser el dueño al poner precio");
        } catch (err) {
            // El error aquí es una violación de constraint 'has_one = owner'
            // El mensaje puede variar, pero buscamos algo relacionado
             assert.include(err.toString(), "ConstraintHasOne", "Error no menciona ConstraintHasOne");
             // O puedes intentar verificar el código de error genérico si lo conoces
            console.log(" -> Test pasado: Falla setAnimalPrice sin ser dueño.");
        }
    });

  }); // Fin describe Seguridad Adicional

}); // Fin describe solranch-anchor