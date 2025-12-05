const { task } = require("hardhat/config");
const fs = require("fs");
const path = require("path");

task("get-id", "Get UnifiedID details")
  .addParam("unifiedid", "The UnifiedID string to query")
  .setAction(async (taskArgs, hre) => {
    console.log("Fetching UnifiedID details...\n");

    // Get current network
    const network = hre.network.name;
    console.log("Network:", network);

    // Load deployment info
    const deploymentFile = path.join(__dirname, "..", "deployments", `${network}.json`);
    
    if (!fs.existsSync(deploymentFile)) {
      throw new Error(`Deployment file not found: ${deploymentFile}\nPlease deploy the contract first.`);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const contractAddress =
      deploymentInfo.contractAddress ||
      (deploymentInfo.contract && deploymentInfo.contract.address);

    if (!contractAddress) {
      throw new Error("Contract address not found in deployment info");
    }

    console.log("Contract address:", contractAddress);
    console.log("UnifiedID:", taskArgs.unifiedid);

    // Connect to contract
    const UnifiedIDRegistry = await hre.ethers.getContractFactory("UnifiedIDRegistry");
    const registry = UnifiedIDRegistry.attach(contractAddress);

    // Check if UnifiedID exists
    const exists = await registry.unifiedIdExists(taskArgs.unifiedid);
    
    if (!exists) {
      console.log("\n❌ UnifiedID does not exist");
      return;
    }

    // Get UnifiedID data
    const unifiedIDData = await registry.getUnifiedID(taskArgs.unifiedid);
    const primaryWallet = unifiedIDData.primaryWallet;
    const createdAt = unifiedIDData.createdAt;

    // Convert timestamp to readable date
    const createdAtDate = new Date(createdAt.toNumber() * 1000);

    // Pretty print UnifiedID details
    console.log("\n=== UnifiedID Details ===");
    console.log("UnifiedID:", taskArgs.unifiedid);
    console.log("Primary Wallet:", primaryWallet);
    console.log("Created At (timestamp):", createdAt.toString());
    console.log("Created At (date):", createdAtDate.toISOString());
    console.log("Created At (readable):", createdAtDate.toLocaleString());
  });

