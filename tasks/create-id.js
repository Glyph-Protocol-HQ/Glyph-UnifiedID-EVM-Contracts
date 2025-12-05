const { task } = require("hardhat/config");
const fs = require("fs");
const path = require("path");

task("create-id", "Create a new UnifiedID")
  .addParam("unifiedid", "The UnifiedID string to create")
  .addParam("wallet", "The primary wallet address")
  .setAction(async (taskArgs, hre) => {
    console.log("Creating UnifiedID...\n");

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
    console.log("Primary wallet:", taskArgs.wallet);

    // Get relayer signer
    if (!process.env.RELAYER_PRIVATE_KEY) {
      throw new Error("RELAYER_PRIVATE_KEY environment variable is not set");
    }

    const relayer = new hre.ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, hre.ethers.provider);
    console.log("Relayer address:", relayer.address);

    // Connect to contract
    const UnifiedIDRegistry = await hre.ethers.getContractFactory("UnifiedIDRegistry");
    const registry = UnifiedIDRegistry.attach(contractAddress).connect(relayer);

    // Create UnifiedID
    console.log("\nCreating UnifiedID...");
    const tx = await registry.createUnifiedID(taskArgs.unifiedid, taskArgs.wallet);
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Log gas used
    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice || tx.gasPrice;
    const gasCost = gasUsed.mul(gasPrice);
    
    console.log("\n=== Transaction Details ===");
    console.log("Gas used:", gasUsed.toString());
    console.log("Gas price:", hre.ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("Total cost:", hre.ethers.utils.formatEther(gasCost), "ETH");

    console.log("\n✅ UnifiedID created successfully!");
    console.log(`UnifiedID: ${taskArgs.unifiedid}`);
    console.log(`Primary wallet: ${taskArgs.wallet}`);
  });

