import { LAMPORTS_PER_SOL } from "@solana/web3.js";

let cachedSolPrice = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 60 * 1000;

async function getSolPriceUSD() {
  const now = Date.now();
  if (cachedSolPrice && now - lastFetchTime < CACHE_DURATION_MS) {
    return cachedSolPrice;
  }
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    const solPriceUSD = data.solana?.usd ?? null;
    if (solPriceUSD) {
      cachedSolPrice = solPriceUSD;
      lastFetchTime = now;
      console.log("💰 Precio de SOL obtenido y cacheado:", solPriceUSD);
    } else {
      console.warn("⚠️ No se pudo obtener el precio de SOL de la API.");
    }
    return solPriceUSD;
  } catch (error) {
    console.error("❌ Error al obtener precio del SOL:", error);
    return null;
  }
}

async function convertLamportsToUSDString(lamports) {
  console.log("🟣 convertLamportsToUSDString() llamado con:", lamports);

  if (lamports === null || lamports === undefined || lamports === '0' || BigInt(lamports) === 0n) {
    console.log("⚪ Valor inválido de lamports:", lamports);
    return "Not for Sale";
  }

  const solPriceUSD = await getSolPriceUSD();
  console.log("💵 Precio actual de SOL (USD):", solPriceUSD);

  if (solPriceUSD === null) {
    console.log("⚠️ No se pudo obtener el precio del SOL");
    return "Price Unavailable"; 
  }

  try {
    const lamportsBigInt = BigInt(lamports);
    const solAmount = Number(lamportsBigInt) / LAMPORTS_PER_SOL;
    const usdValue = solAmount * solPriceUSD;
    console.log(`🧮 ${lamports} lamports = ${solAmount} SOL = $${usdValue.toFixed(2)} USD`);
    return `$${usdValue.toFixed(2)}`;
  } catch (conversionError) {
    console.error("❌ Error durante la conversión:", conversionError);
    return "Conversion Error";
  }
}

async function convertUSDToLamports(usdAmount) {
  console.log("🟢 convertUSDToLamports() llamado con USD:", usdAmount);

  if (!usdAmount || usdAmount <= 0) {
    console.log("⚪ Valor inválido de USD:", usdAmount);
    return null;
  }

  const solPriceUSD = await getSolPriceUSD();
  console.log("💵 Precio actual de SOL (USD):", solPriceUSD);

  if (solPriceUSD === null || solPriceUSD === 0) {
    console.log("⚠️ No se pudo obtener el precio del SOL");
    return null;
  }

  try {
    const solAmount = usdAmount / solPriceUSD;
    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
    console.log(`🧮 $${usdAmount} USD = ${solAmount} SOL = ${lamports} lamports`);
    return lamports.toString();
  } catch (conversionError) {
    console.error("❌ Error durante la conversión USD → lamports:", conversionError);
    return null;
  }
}

async function convertLamportsToUSD(lamports) {
  if (lamports === null || lamports === undefined || lamports === '0' || BigInt(lamports) === 0n) {
    return null;
  }

  const solPriceUSD = await getSolPriceUSD();
  if (solPriceUSD === null) {
    return null;
  }

  try {
    const lamportsBigInt = BigInt(lamports);
    const solAmount = Number(lamportsBigInt) / LAMPORTS_PER_SOL;
    const usdValue = solAmount * solPriceUSD;
    return usdValue;
  } catch (error) {
    console.error("❌ Error al convertir lamports a USD:", error);
    return null;
  }
}

export { 
  convertLamportsToUSDString, 
  convertLamportsToUSD,
  convertUSDToLamports,
  getSolPriceUSD 
};