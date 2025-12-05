const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Add a registrar to the deployed contract
 */
async function main() {
  // Get registrar address from command line
  const args = process.argv.slice(2);
  const registrarAddress = args[0];

  if (!registrarAddress) {
    console.error("❌ Error: Registrar address not provided!");
    console.log("\nUsage:");
    console.log("  npx hardhat run scripts/add-registrar.js --network <network> <REGISTRAR_ADDRESS>");
    console.log("\nExample:");
    console.log("  npx hardhat run scripts/add-registrar.js --network baseSepolia 0x0000000000000000000000000000000000000000");
    process.exit(1);
  }

  // Validate address
  if (!ethers.utils.isAddress(registrarAddress)) {
    console.error(`❌ Error: Invalid registrar address: ${registrarAddress}`);
    process.exit(1);
  }

  // Load deployment info
  const networkName = network.name;
  const deploymentFile = path.join("deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ No deployment found for network: ${networkName}`);
    console.log(`   Expected file: ${deploymentFile}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contractAddress = deployment.contractAddress;

  console.log("═".repeat(60));
  console.log("➕ Add Registrar to UnifiedIDRegistry");
  console.log("═".repeat(60));
  console.log();
  console.log("📡 Network:", networkName);
  console.log("📝 Contract:", contractAddress);
  console.log("➕ New Registrar:", registrarAddress);
  console.log();

  // Get contract instance
  const registry = await ethers.getContractAt("UnifiedIDRegistry", contractAddress);
  
  // Get signer info
  const [signer] = await ethers.getSigners();
  const signerAddress = signer.address;
  const owner = await registry.owner();
  
  console.log("👤 Your Address:", signerAddress);
  console.log("👑 Contract Owner:", owner);
  console.log();

  if (signerAddress.toLowerCase() !== owner.toLowerCase()) {
    console.error("❌ Error: You are not the contract owner!");
    console.error("   Only the owner can add registrars.");
    process.exit(1);
  }

  // Check if already a registrar
  const isAlreadyRegistrar = await registry.isRegistrar(registrarAddress);
  if (isAlreadyRegistrar) {
    console.error(`❌ Error: ${registrarAddress} is already a registrar!`);
    process.exit(1);
  }

  // Get current registrar count
  const currentCount = await registry.registrarCount();
  console.log("📊 Current Registrar Count:", currentCount.toString());
  console.log();

  // Add registrar
  console.log("⏳ Adding registrar...");
  const tx = await registry.addRegistrar(registrarAddress);
  console.log(`   Transaction: ${tx.hash}`);
  console.log("   Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log(`   Confirmed in block: ${receipt.blockNumber}`);
  console.log();

  // Verify addition
  const newCount = await registry.registrarCount();
  const isNowRegistrar = await registry.isRegistrar(registrarAddress);
  
  console.log("✅ Registrar added successfully!");
  console.log();
  console.log("📊 Updated Registrar Count:", newCount.toString());
  console.log("✅ Is Registrar:", isNowRegistrar);
  console.log();

  // List all registrars
  const registrars = await registry.getRegistrars();
  console.log("📋 All Registrars:");
  registrars.forEach((registrar, index) => {
    console.log(`   ${index + 1}. ${registrar}`);
  });
  console.log();

  console.log("═".repeat(60));
  console.log("🎉 Done!");
  console.log("═".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:");
    console.error(error);
    process.exit(1);
  });

