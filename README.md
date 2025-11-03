<p align="center">
  <img src="./solranch-logo.png" alt="SolRanch Banner" width="200"/>
</p>

<h1 align="center">SolRanch 🐄⛓️</h1>

<p align="center">
  A Web3 decentralized livestock registry and marketplace built on Solana.
  <br />
  <strong>Submitted to the Colosseum Cypherpunk Hackathon (2025).</strong>
</p>

<p align="center">
  <a href="https://colosseum.org/cypherpunk">
    <img src="https://img.shields.io/badge/Colosseum-Cypherpunk%20Hackathon-brightgreen?style=for-the-badge&logo=colosseum" alt="Colosseum Hackathon"/>
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="License: Apache 2.0"/>
  </a>
  <a href="https://solana.com">
    <img src="https://img.shields.io/badge/Built on-Solana-9945FF?style=for-the-badge&logo=solana" alt="Built on Solana"/>
  </a>
</p>

---

## 🎯 The Mission

Traditional livestock records often rely on paper trails or centralized databases that are inefficient, easy to forge, and vulnerable to corruption. Coming from a ranching background, I saw a clear need for a system built on verifiable trust.

**SolRanch** is the solution: a Web3 platform that brings trust and transparency to the livestock industry. It replaces forgeable paperwork with an immutable, on-chain digital identity for each animal, linked directly to its physical ID chip.

This allows ranchers to prove authenticity and enables secure, peer-to-peer (P2P) sales and ownership transfers directly on the blockchain, eliminating the need for costly intermediaries.

## ✨ Key Features (V1)

* **On-Chain Ranch Profiles:** Ranchers register their ranch, creating an on-chain PDA profile.
* **Digital Animal Identity:** Register individual animals, creating a unique on-chain record (PDA) for each, linked to its physical chip ID.
* **Verification System:** A "Verifier" role must confirm an animal's data on-chain before it can be listed for sale, ensuring authenticity.
* **Decentralized Marketplace:**
    * List verified animals for sale (price set in SOL).
    * Set a specific `allowedBuyer` for private sales or open it to the public.
* **Secure P2P Sales:** Buyers can purchase animals directly from the owner. The smart contract handles the atomic transfer of SOL payment and animal ownership.
* **Full Ownership History:** The blockchain provides an immutable audit trail of an animal's ownership from birth to sale.

## 🛠️ Tech Stack

This project is a full-stack dApp, composed of three main components:

* **Blockchain (On-Chain Program):**
    <p>
      <img src="https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana"/>
      <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust"/>
      <img src="https://img.shields.io/badge/Anchor-000000?style=for-the-badge" alt="Anchor"/>
    </p>

* **Backend (API Server):**
    <p>
      <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS"/>
      <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
      <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
      <img src="https://img.shields.io/badge/TypeORM-000000?style=for-the-badge" alt="TypeORM"/>
      <img src="https://img.shields.io/badge/JWT_Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT Auth"/>
    </p>

* **Frontend (Web App):**
    <p>
      <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white" alt="Vue.js"/>
      <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
      <img src="https://img.shields.io/badge/Solana_Web3.js-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana Web3.js"/>
    </p>

## 🏗️ Architecture Overview

1.  **Frontend (Vue.js):** The user interacts with the web app and connects their Solana wallet.
2.  **Backend (NestJS):**
    * Serves as a caching layer, indexing on-chain data into a PostgreSQL DB for fast queries (e.g., "list all animals for sale").
    * Builds and serializes unsigned transactions for the frontend.
    * Handles user authentication (login/logout) and role management (RANCHER, VERIFIER) using JWTs.
3.  **On-Chain Program (Anchor/Rust):**
    * The single source of truth for ownership and animal state.
    * Stores `Ranch`, `Verifier`, and `Animal` data in PDAs.
    * Executes all core logic: `register_animal`, `verify_animal`, `set_price`, `purchase_animal`.
4.  **Database (PostgreSQL):**
    * Keeps a synchronized copy of on-chain data for filtering and display.
    * Stores user information (public key, roles, nonce).
