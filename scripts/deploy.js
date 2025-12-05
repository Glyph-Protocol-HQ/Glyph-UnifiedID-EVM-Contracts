const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Network-specific configuration
 */
const NETWORK_CONFIG = {
  hardhat: {
    name: "Hardhat Local",
    chainId: 31337,
    explorer: "N/A",
  },
  localhost: {
    name: "Localhost",
    chainId: 31337,
    explorer: "N/A",
  },
  baseSepolia: {
    name: "Base Sepolia",
    chainId: 84532,
    explorer: "https://sepolia.basescan.org",
  },
};

/**
 * Get initial registrar address from environment or command line
 */
function getInitialRegistrar() {
  // Check command line arguments first
  const args = process.argv.slice(2);
  const registrarArgIndex = args.indexOf("--registrar");
  
  if (registrarArgIndex !== -1 && args[registrarArgIndex + 1]) {
    return args[registrarArgIndex + 1];
  }
  
  // Fall back to environment variable
  if (process.env.INITIAL_REGISTRAR_ADDRESS) {
    return process.env.INITIAL_REGISTRAR_ADDRESS;
  }
  
  return null;
}

/**
 * Validate Ethereum address format
 */
function isValidAddress(address) {
  return ethers.utils.isAddress(address);
}

/**
 * Save deployment information to file
 */
function saveDeploymentInfo(deploymentData) {
  const deploymentsDir = "deployments";
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save network-specific deployment file
  const filename = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
  
  console.log(`💾 Deployment info saved to ${filename}`);
  
  // Also save to a master deployments file
  const masterFile = path.join(deploymentsDir, "deployments.json");
  let allDeployments = {};
  
  if (fs.existsSync(masterFile)) {
    allDeployments = JSON.parse(fs.readFileSync(masterFile, "utf8"));
  }
  
  allDeployments[network.name] = deploymentData;
  fs.writeFileSync(masterFile, JSON.stringify(allDeployments, null, 2));
}

/**
 * Main deployment function
 */
async function main() {
  console.log("═".repeat(60));
  console.log("🚀 UnifiedIDRegistry Deployment Script");
  console.log("═".repeat(60));
  console.log();

  // Get network information
  const networkName = network.name;
  const networkConfig = NETWORK_CONFIG[networkName] || {
    name: networkName,
    chainId: (await ethers.provider.getNetwork()).chainId,
    explorer: "Unknown",
  };

  console.log("📋 Network Information:");
  console.log(`   Network: ${networkConfig.name}`);
  console.log(`   Chain ID: ${networkConfig.chainId}`);
  console.log(`   Explorer: ${networkConfig.explorer}`);
  console.log();

  // Get initial registrar address
  const initialRegistrar = getInitialRegistrar();
  
  if (!initialRegistrar) {
    console.error("❌ Error: Initial registrar address not provided!");
    console.log("\nUsage:");
    console.log("  npx hardhat run scripts/deploy.js --network <network> --registrar <address>");
    console.log("  OR set INITIAL_REGISTRAR_ADDRESS in .env file");
    console.log("\nExample:");
    console.log("  npx hardhat run scripts/deploy.js --network baseSepolia --registrar 0x0000000000000000000000000000000000000000");
    process.exit(1);
  }

  // Validate registrar address
  if (!isValidAddress(initialRegistrar)) {
    console.error(`❌ Error: Invalid registrar address: ${initialRegistrar}`);
    process.exit(1);
  }

  console.log("⚙️  Deployment Configuration:");
  console.log(`   Initial Registrar: ${initialRegistrar}`);
  console.log();

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = deployer.address;
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log("👤 Deployer Information:");
  console.log(`   Address: ${deployerAddress}`);
  console.log(`   Balance: ${ethers.utils.formatEther(balance)} ETH`);
  console.log();

  // Check if deployer has sufficient balance for deployment
  if (balance === 0n) {
    console.error("❌ Error: Deployer has zero balance!");
    console.log("   Please fund the deployer address with ETH");
    process.exit(1);
  }

  // Deploy contract
  console.log("⏳ Deploying UnifiedIDRegistry contract...");
  console.log();

  const UnifiedIDRegistry = await ethers.getContractFactory("UnifiedIDRegistry");
  
  const startTime = Date.now();
  const registry = await UnifiedIDRegistry.deploy(initialRegistrar);
  
  console.log(`   Transaction submitted: ${registry.deployTransaction.hash}`);
  console.log("   Waiting for confirmation...");
  
  // Wait for deployment and get receipt
  const deployReceipt = await registry.deployTransaction.wait();
  await registry.deployed();
  const deployTime = Date.now() - startTime;
  
  const contractAddress = registry.address;
  
  console.log();
  console.log("✅ Contract Deployed Successfully!");
  console.log(`   Address: ${contractAddress}`);
  console.log(`   Deployment Time: ${(deployTime / 1000).toFixed(2)}s`);
  console.log();

  // Verify deployment
  console.log("🔍 Verifying Deployment...");
  
  try {
    const owner = await registry.owner();
    const registrarCount = await registry.registrarCount();
    const isReg = await registry.isRegistrar(initialRegistrar);
    const totalIDs = await registry.totalIDs();
    
    console.log(`   ✓ Owner: ${owner}`);
    console.log(`   ✓ Registrar Count: ${registrarCount}`);
    console.log(`   ✓ Initial Registrar Active: ${isReg}`);
    console.log(`   ✓ Total IDs: ${totalIDs}`);
    console.log();

    // Verify expected values
    if (owner !== deployerAddress) {
      console.warn("⚠️  Warning: Owner is not deployer address");
    }
    if (!isReg) {
      console.error("❌ Error: Initial registrar is not active!");
      process.exit(1);
    }
    // In ethers v5, registrarCount is a BigNumber, use .eq() to compare
    if (!registrarCount.eq(1)) {
      console.error("❌ Error: Registrar count should be 1!");
      process.exit(1);
    }

    console.log("✅ All deployment checks passed!");
    console.log();

  } catch (error) {
    console.error("❌ Error verifying deployment:", error.message);
    process.exit(1);
  }

  // Save deployment information
  const deploymentData = {
    network: networkName,
    networkConfig: networkConfig,
    contractAddress: contractAddress,
    deployer: deployerAddress,
    owner: await registry.owner(),
    initialRegistrar: initialRegistrar,
    deploymentTime: new Date().toISOString(),
    deploymentTimestamp: Math.floor(Date.now() / 1000),
    transactionHash: registry.deployTransaction.hash,
    blockNumber: deployReceipt.blockNumber,
    constructorArgs: [initialRegistrar],
  };

  saveDeploymentInfo(deploymentData);
  console.log();

  // Print next steps
  console.log("═".repeat(60));
  console.log("📝 Next Steps:");
  console.log("═".repeat(60));
  console.log();

  if (networkConfig.explorer !== "N/A") {
    console.log("1. View contract on explorer:");
    console.log(`   ${networkConfig.explorer}/address/${contractAddress}`);
    console.log();
    
    console.log("2. Verify contract source code:");
    console.log(`   npx hardhat verify --network ${networkName} ${contractAddress} ${initialRegistrar}`);
    console.log();
  }

  console.log("3. Add additional registrars:");
  console.log(`   npx hardhat run scripts/manage-registrars.js --network ${networkName}`);
  console.log();

  console.log("4. Test contract interaction:");
  console.log(`   npx hardhat console --network ${networkName}`);
  console.log(`   const registry = await ethers.getContractAt("UnifiedIDRegistry", "${contractAddress}")`);
  console.log(`   await registry.getRegistrars()`);
  console.log();

  console.log("═".repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("═".repeat(60));
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
