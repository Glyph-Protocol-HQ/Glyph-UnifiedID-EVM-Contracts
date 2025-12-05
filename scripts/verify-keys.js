const { ethers } = require("ethers");
require("dotenv").config();

/**
 * Helper script to verify that addresses match their private keys
 * Run this after updating your .env file to ensure everything is correct
 */

console.log("=== Address Verification ===\n");

let hasErrors = false;

// Verify Deployer
if (process.env.DEPLOYER_PRIVATE_KEY) {
  try {
    const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
    const addressFromKey = deployerWallet.address;
    const addressInEnv = process.env.DEPLOYER_ADDRESS || "";

    console.log("Deployer:");
    console.log("  Address from private key:", addressFromKey);
    if (addressInEnv) {
      console.log("  Address in .env:", addressInEnv);
      const match = addressFromKey.toLowerCase() === addressInEnv.toLowerCase();
      console.log("  Match:", match ? "✅" : "❌ MISMATCH!");
      if (!match) {
        hasErrors = true;
        console.log("  ⚠️  WARNING: DEPLOYER_ADDRESS does not match DEPLOYER_PRIVATE_KEY");
      }
    } else {
      console.log("  Address in .env: NOT SET (optional)");
    }
    console.log("");
  } catch (error) {
    console.error("  ❌ ERROR: Invalid DEPLOYER_PRIVATE_KEY format");
    console.error("  Error:", error.message);
    hasErrors = true;
    console.log("");
  }
} else {
  console.log("Deployer:");
  console.log("  ❌ DEPLOYER_PRIVATE_KEY not set in .env");
  hasErrors = true;
  console.log("");
}

// Verify Relayer
if (process.env.RELAYER_PRIVATE_KEY) {
  try {
    const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY);
    const addressFromKey = relayerWallet.address;
    const addressInEnv = process.env.RELAYER_ADDRESS || "";

    console.log("Relayer:");
    console.log("  Address from private key:", addressFromKey);
    if (addressInEnv) {
      console.log("  Address in .env:", addressInEnv);
      const match = addressFromKey.toLowerCase() === addressInEnv.toLowerCase();
      console.log("  Match:", match ? "✅" : "❌ MISMATCH!");
      if (!match) {
        hasErrors = true;
        console.log("  ⚠️  WARNING: RELAYER_ADDRESS does not match RELAYER_PRIVATE_KEY");
        console.log("  ⚠️  This will cause deployment issues!");
      }
    } else {
      console.log("  Address in .env: NOT SET (REQUIRED)");
      hasErrors = true;
      console.log("  ⚠️  WARNING: RELAYER_ADDRESS must be set and match RELAYER_PRIVATE_KEY");
    }
    console.log("");
  } catch (error) {
    console.error("  ❌ ERROR: Invalid RELAYER_PRIVATE_KEY format");
    console.error("  Error:", error.message);
    hasErrors = true;
    console.log("");
  }
} else {
  console.log("Relayer:");
  console.log("  ❌ RELAYER_PRIVATE_KEY not set in .env");
  hasErrors = true;
  console.log("");
}

// Summary
console.log("=== Summary ===");
if (hasErrors) {
  console.log("❌ Configuration has errors. Please fix them before deploying.");
  console.log("\nTo fix:");
  console.log("1. Ensure RELAYER_ADDRESS matches the address from RELAYER_PRIVATE_KEY");
  console.log("2. Private keys must start with '0x' and be 66 characters long");
  console.log("3. Addresses must start with '0x' and be 42 characters long");
  process.exit(1);
} else {
  console.log("✅ All addresses match their private keys!");
  console.log("✅ Configuration is correct. Ready to deploy.");
  process.exit(0);
}

