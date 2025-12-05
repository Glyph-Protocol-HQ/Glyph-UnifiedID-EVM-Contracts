const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Verifying UnifiedIDRegistry contract...\n");

  // Get current network
  const network = hre.network.name;
  console.log("Network:", network);

  // Load deployment info from deployments/{network}.json
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}\nPlease deploy the contract first.`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log("Loaded deployment info from:", deploymentFile);

  // Extract contract address and initial registrar (constructor arg)
  const contractAddress =
    deploymentInfo.contractAddress ||
    (deploymentInfo.contract && deploymentInfo.contract.address);
  const constructorArg =
    deploymentInfo.initialRegistrar ||
    (deploymentInfo.contract && deploymentInfo.contract.relayer);

  if (!contractAddress) {
    throw new Error("Contract address not found in deployment info");
  }

  if (!constructorArg) {
    throw new Error("Constructor argument (initial registrar) not found in deployment info");
  }

  console.log("Contract address:", contractAddress);
  console.log("Initial registrar:", constructorArg);
  console.log("\nVerifying contract...");

  try {
    // Run hardhat verify:verify with constructor arguments
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [constructorArg],
    });

    console.log("\n✅ Contract verified successfully!");
  } catch (error) {
    // Handle "Already Verified" error gracefully
    if (error.message && error.message.toLowerCase().includes("already verified")) {
      console.log("\n✅ Contract is already verified on Etherscan/Polygonscan");
    } else {
      console.error("\n❌ Verification failed:");
      console.error(error.message);
      throw error;
    }
  }

  // Print explorer link
  const chainId = deploymentInfo.chainId;
  let explorerUrl;
  
  if (network === "mumbai" || chainId === 80001) {
    explorerUrl = `https://mumbai.polygonscan.com/address/${contractAddress}`;
  } else if (network === "polygon" || chainId === 137) {
    explorerUrl = `https://polygonscan.com/address/${contractAddress}`;
  } else if (network === "sepolia" || chainId === 11155111) {
    explorerUrl = `https://sepolia.etherscan.io/address/${contractAddress}`;
  } else {
    // For other networks, try to construct a generic explorer URL
    // This might not work for all networks, but provides a template
    explorerUrl = `https://explorer.${network}.com/address/${contractAddress}`;
  }

  console.log("\n=== Explorer Link ===");
  console.log(explorerUrl);
  console.log("\nYou can view the verified contract at the link above.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
