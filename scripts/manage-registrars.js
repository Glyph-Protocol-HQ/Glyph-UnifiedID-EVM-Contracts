const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

/**
 * Create readline interface for user input
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = createInterface();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Load deployment information
 */
function loadDeployment(networkName) {
  const deploymentFile = path.join("deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ No deployment found for network: ${networkName}`);
    console.log(`   Expected file: ${deploymentFile}`);
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
}

/**
 * Get contract instance
 */
async function getContract(address) {
  return await ethers.getContractAt("UnifiedIDRegistry", address);
}

/**
 * Add a registrar
 */
async function addRegistrar(registry, address) {
  console.log(`\n⏳ Adding registrar: ${address}`);
  
  const tx = await registry.addRegistrar(address);
  console.log(`   Transaction: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);
  
  await tx.wait();
  
  console.log(`✅ Registrar added successfully!`);
}

/**
 * Remove a registrar
 */
async function removeRegistrar(registry, address) {
  console.log(`\n⏳ Removing registrar: ${address}`);
  
  const tx = await registry.removeRegistrar(address);
  console.log(`   Transaction: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);
  
  await tx.wait();
  
  console.log(`✅ Registrar removed successfully!`);
}

/**
 * List all registrars
 */
async function listRegistrars(registry) {
  console.log(`\n📋 Current Registrars:`);
  
  const registrars = await registry.getRegistrars();
  const count = await registry.registrarCount();
  
  console.log(`   Total Count: ${count}`);
  console.log();
  
  if (registrars.length === 0) {
    console.log(`   (No registrars)`);
  } else {
    registrars.forEach((registrar, index) => {
      console.log(`   ${index + 1}. ${registrar}`);
    });
  }
  console.log();
}

/**
 * Main function
 */
async function main() {
  console.log("═".repeat(60));
  console.log("🔧 UnifiedIDRegistry - Registrar Management");
  console.log("═".repeat(60));
  console.log();

  // Load deployment info
  const networkName = network.name;
  console.log(`📡 Network: ${networkName}`);
  
  const deployment = loadDeployment(networkName);
  console.log(`📝 Contract: ${deployment.contractAddress}`);
  console.log();

  // Get contract instance
  const registry = await getContract(deployment.contractAddress);
  
  // Get signer info
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const owner = await registry.owner();
  
  console.log(`👤 Your Address: ${signerAddress}`);
  console.log(`👑 Contract Owner: ${owner}`);
  console.log();
  
  if (signerAddress.toLowerCase() !== owner.toLowerCase()) {
    console.warn(`⚠️  Warning: You are not the contract owner!`);
    console.warn(`   Only owner can manage registrars.`);
    console.log();
  }

  // Show current registrars
  await listRegistrars(registry);

  // Interactive menu
  console.log("═".repeat(60));
  console.log("Select an action:");
  console.log("  1. Add a registrar");
  console.log("  2. Remove a registrar");
  console.log("  3. List registrars (refresh)");
  console.log("  4. Check if address is registrar");
  console.log("  5. Exit");
  console.log("═".repeat(60));
  console.log();

  const choice = await prompt("Enter choice (1-5): ");

  switch (choice.trim()) {
    case "1": {
      const address = await prompt("Enter registrar address to add: ");
      if (!ethers.utils.isAddress(address)) {
        console.error("❌ Invalid address format");
        process.exit(1);
      }
      await addRegistrar(registry, address);
      await listRegistrars(registry);
      break;
    }

    case "2": {
      const address = await prompt("Enter registrar address to remove: ");
      if (!ethers.utils.isAddress(address)) {
        console.error("❌ Invalid address format");
        process.exit(1);
      }
      await removeRegistrar(registry, address);
      await listRegistrars(registry);
      break;
    }

    case "3": {
      await listRegistrars(registry);
      break;
    }

    case "4": {
      const address = await prompt("Enter address to check: ");
      if (!ethers.utils.isAddress(address)) {
        console.error("❌ Invalid address format");
        process.exit(1);
      }
      const isReg = await registry.isRegistrar(address);
      console.log(`\n${isReg ? "✅" : "❌"} ${address} ${isReg ? "IS" : "IS NOT"} a registrar\n`);
      break;
    }

    case "5": {
      console.log("👋 Goodbye!");
      process.exit(0);
    }

    default: {
      console.error("❌ Invalid choice");
      process.exit(1);
    }
  }

  console.log("\n✅ Operation complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:");
    console.error(error);
    process.exit(1);
  });

