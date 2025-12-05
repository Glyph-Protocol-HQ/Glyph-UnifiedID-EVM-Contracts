const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Comprehensive test script for UnifiedIDRegistry contract
 */
async function main() {
  console.log("═".repeat(60));
  console.log("🧪 UnifiedIDRegistry - Comprehensive Function Testing");
  console.log("═".repeat(60));
  console.log();

  // Load deployment info
  const networkName = network.name;
  const deploymentFile = path.join("deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ No deployment found for network: ${networkName}`);
    console.log(`   Expected file: ${deploymentFile}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contractAddress = deployment.contractAddress || deployment.contract?.address;

  if (!contractAddress) {
    console.error("❌ Contract address not found in deployment file");
    process.exit(1);
  }

  console.log("📡 Network:", networkName);
  console.log("📝 Contract:", contractAddress);
  console.log();

  // Get contract instance
  const registry = await ethers.getContractAt("UnifiedIDRegistry", contractAddress);
  
  // Get signer info
  const [signer] = await ethers.getSigners();
  const signerAddress = signer.address;
  const owner = await registry.owner();
  
  console.log("👤 Your Address:", signerAddress);
  console.log("👑 Contract Owner:", owner);
  console.log("🔐 Is Owner:", signerAddress.toLowerCase() === owner.toLowerCase());
  console.log();

  // ============ SECTION 1: VIEW FUNCTIONS ============
  console.log("═".repeat(60));
  console.log("📊 SECTION 1: View Functions");
  console.log("═".repeat(60));
  console.log();

  // 1.1 Get all registrars
  console.log("1.1 Testing getRegistrars()...");
  try {
    const registrars = await registry.getRegistrars();
    console.log(`   ✅ Success: Found ${registrars.length} registrar(s)`);
    registrars.forEach((registrar, index) => {
      console.log(`      ${index + 1}. ${registrar}`);
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log();

  // 1.2 Get registrar count
  console.log("1.2 Testing registrarCount()...");
  try {
    const count = await registry.registrarCount();
    console.log(`   ✅ Success: Registrar count = ${count.toString()}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log();

  // 1.3 Get registrar count (view function)
  console.log("1.3 Testing getRegistrarCount()...");
  try {
    const count = await registry.getRegistrarCount();
    console.log(`   ✅ Success: Registrar count = ${count.toString()}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log();

  // 1.4 Check if address is registrar
  console.log("1.4 Testing isRegistrar()...");
  try {
    const initialRegistrar = deployment.initialRegistrar;
    if (initialRegistrar) {
      const isReg = await registry.isRegistrar(initialRegistrar);
      console.log(`   ✅ Success: ${initialRegistrar} is ${isReg ? "a registrar" : "NOT a registrar"}`);
    }
    const isSignerReg = await registry.isRegistrar(signerAddress);
    console.log(`   ✅ Success: ${signerAddress} is ${isSignerReg ? "a registrar" : "NOT a registrar"}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log();

  // 1.5 Get total IDs
  console.log("1.5 Testing totalIDs()...");
  try {
    const totalIDs = await registry.totalIDs();
    console.log(`   ✅ Success: Total UnifiedIDs = ${totalIDs.toString()}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log();

  // 1.6 Check if UnifiedID exists
  console.log("1.6 Testing unifiedIdExists()...");
  try {
    const testId = "testuser123";
    const exists = await registry.unifiedIdExists(testId);
    console.log(`   ✅ Success: UnifiedID "${testId}" ${exists ? "exists" : "does NOT exist"}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log();

  // 1.7 Get UnifiedID data
  console.log("1.7 Testing getUnifiedID()...");
  try {
    const testId = "testuser123";
    const exists = await registry.unifiedIdExists(testId);
    if (exists) {
      const unifiedIdData = await registry.getUnifiedID(testId);
      console.log(`   ✅ Success: UnifiedID "${testId}" data:`);
      console.log(`      Primary Wallet: ${unifiedIdData.primaryWallet}`);
      console.log(`      Created At: ${new Date(unifiedIdData.createdAt.toNumber() * 1000).toISOString()}`);
      console.log(`      Created At (timestamp): ${unifiedIdData.createdAt.toString()}`);
    } else {
      console.log(`   ⚠️  UnifiedID "${testId}" does not exist, skipping getUnifiedID test`);
    }
  } catch (error) {
    if (error.message && error.message.includes("UnifiedIdDoesNotExist")) {
      console.log(`   ⚠️  UnifiedID does not exist (expected error)`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  console.log();

  // 1.8 Get primary wallet
  console.log("1.8 Testing getPrimaryWallet()...");
  try {
    const testId = "testuser123";
    const exists = await registry.unifiedIdExists(testId);
    if (exists) {
      const primaryWallet = await registry.getPrimaryWallet(testId);
      console.log(`   ✅ Success: Primary wallet for "${testId}" = ${primaryWallet}`);
    } else {
      console.log(`   ⚠️  UnifiedID "${testId}" does not exist, skipping getPrimaryWallet test`);
    }
  } catch (error) {
    if (error.message && error.message.includes("UnifiedIdDoesNotExist")) {
      console.log(`   ⚠️  UnifiedID does not exist (expected error)`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  console.log();

  // 1.9 Get UnifiedID by wallet
  console.log("1.9 Testing getUnifiedIdByWallet()...");
  try {
    const testWallet = "0x0000000000000000000000000000000000000000"; // Example address - replace with actual test wallet
    const unifiedId = await registry.getUnifiedIdByWallet(testWallet);
    if (unifiedId && unifiedId.length > 0) {
      console.log(`   ✅ Success: UnifiedID for wallet ${testWallet} = "${unifiedId}"`);
    } else {
      console.log(`   ⚠️  No UnifiedID found for wallet ${testWallet}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log();

  // ============ SECTION 2: REGISTRAR MANAGEMENT (Owner Only) ============
  console.log("═".repeat(60));
  console.log("🔧 SECTION 2: Registrar Management Functions");
  console.log("═".repeat(60));
  console.log();

  const isOwner = signerAddress.toLowerCase() === owner.toLowerCase();

  if (!isOwner) {
    console.log("⚠️  You are not the contract owner. Skipping registrar management tests.");
    console.log("   (Only owner can add/remove registrars)");
    console.log();
  } else {
    // 2.1 Test adding a registrar (with a test address)
    console.log("2.1 Testing addRegistrar()...");
    console.log("   ⚠️  Skipping actual add (would add a real registrar)");
    console.log("   💡 Use: npx hardhat run scripts/add-registrar.js --network baseSepolia <ADDRESS>");
    console.log();

    // 2.2 Test removing a registrar
    console.log("2.2 Testing removeRegistrar()...");
    console.log("   ⚠️  Skipping actual remove (would remove a real registrar)");
    console.log("   💡 Use: npx hardhat run scripts/manage-registrars.js --network baseSepolia");
    console.log();
  }

  // ============ SECTION 3: UNIFIEDID CREATION (Registrar Only) ============
  console.log("═".repeat(60));
  console.log("➕ SECTION 3: UnifiedID Creation Functions");
  console.log("═".repeat(60));
  console.log();

  // Check if signer is a registrar
  const isRegistrar = await registry.isRegistrar(signerAddress);
  console.log(`🔐 Is Signer a Registrar: ${isRegistrar}`);
  console.log();

  if (!isRegistrar) {
    console.log("⚠️  You are not a registrar. Skipping UnifiedID creation tests.");
    console.log("   To test creation, use a registrar's private key or add yourself as registrar.");
    console.log();
  } else {
    console.log("3.1 Testing createUnifiedID()...");
    console.log("   ⚠️  Skipping actual creation (would create a real UnifiedID)");
    console.log("   💡 Use: npx hardhat create-id --unifiedid <ID> --wallet <WALLET> --network baseSepolia");
    console.log();
  }

  // ============ SECTION 4: ERROR CASES ============
  console.log("═".repeat(60));
  console.log("❌ SECTION 4: Error Case Testing");
  console.log("═".repeat(60));
  console.log();

  // 4.1 Test getUnifiedID with non-existent ID
  console.log("4.1 Testing getUnifiedID() with non-existent ID...");
  try {
    await registry.getUnifiedID("nonexistentid12345");
    console.log("   ❌ Error: Should have reverted!");
  } catch (error) {
    if (error.message && (error.message.includes("UnifiedIdDoesNotExist") || error.reason === "UnifiedIdDoesNotExist")) {
      console.log("   ✅ Success: Correctly reverted with UnifiedIdDoesNotExist");
    } else {
      console.log(`   ⚠️  Reverted but with different error: ${error.message}`);
    }
  }
  console.log();

  // 4.2 Test getPrimaryWallet with non-existent ID
  console.log("4.2 Testing getPrimaryWallet() with non-existent ID...");
  try {
    await registry.getPrimaryWallet("nonexistentid12345");
    console.log("   ❌ Error: Should have reverted!");
  } catch (error) {
    if (error.message && (error.message.includes("UnifiedIdDoesNotExist") || error.reason === "UnifiedIdDoesNotExist")) {
      console.log("   ✅ Success: Correctly reverted with UnifiedIdDoesNotExist");
    } else {
      console.log(`   ⚠️  Reverted but with different error: ${error.message}`);
    }
  }
  console.log();

  // 4.3 Test isRegistrar with zero address
  console.log("4.3 Testing isRegistrar() with zero address...");
  try {
    const isReg = await registry.isRegistrar(ethers.constants.AddressZero);
    console.log(`   ✅ Success: Zero address is ${isReg ? "a registrar" : "NOT a registrar"} (expected: NOT)`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log();

  // ============ SECTION 5: SUMMARY ============
  console.log("═".repeat(60));
  console.log("📋 SECTION 5: Contract State Summary");
  console.log("═".repeat(60));
  console.log();

  try {
    const registrars = await registry.getRegistrars();
    const registrarCount = await registry.registrarCount();
    const totalIDs = await registry.totalIDs();
    const owner = await registry.owner();

    console.log("Contract State:");
    console.log(`   Owner: ${owner}`);
    console.log(`   Registrar Count: ${registrarCount.toString()}`);
    console.log(`   Total UnifiedIDs: ${totalIDs.toString()}`);
    console.log(`   Registrars:`);
    registrars.forEach((registrar, index) => {
      console.log(`      ${index + 1}. ${registrar}`);
    });
  } catch (error) {
    console.log(`   ❌ Error getting summary: ${error.message}`);
  }
  console.log();

  console.log("═".repeat(60));
  console.log("🎉 Testing Complete!");
  console.log("═".repeat(60));
  console.log();
  console.log("💡 Next Steps:");
  console.log("   1. Test creating UnifiedIDs: npx hardhat create-id --unifiedid <ID> --wallet <WALLET> --network baseSepolia");
  console.log("   2. Test getting UnifiedIDs: npx hardhat get-id --unifiedid <ID> --network baseSepolia");
  console.log("   3. Manage registrars: npx hardhat run scripts/manage-registrars.js --network baseSepolia");
  console.log("   4. View on explorer: https://sepolia.basescan.org/address/" + contractAddress);
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  });

