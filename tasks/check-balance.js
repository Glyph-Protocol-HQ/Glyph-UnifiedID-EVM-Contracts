const { task } = require("hardhat/config");

task("check-balance", "Check relayer balance")
  .setAction(async (taskArgs, hre) => {
    console.log("Checking relayer balance...\n");

    // Read RELAYER_ADDRESS from env
    if (!process.env.RELAYER_ADDRESS) {
      throw new Error("RELAYER_ADDRESS environment variable is not set");
    }

    const relayerAddress = process.env.RELAYER_ADDRESS;
    console.log("Relayer address:", relayerAddress);

    // Get current network
    const network = hre.network.name;
    console.log("Network:", network);

    // Check balance via provider.getBalance
    const balance = await hre.ethers.provider.getBalance(relayerAddress);
    const balanceInEther = hre.ethers.utils.formatEther(balance);
    const balanceInMatic = balanceInEther; // MATIC uses same decimals as ETH

    console.log("\n=== Balance Information ===");
    console.log("Balance (wei):", balance.toString());
    console.log("Balance (MATIC):", balanceInMatic);

    // Warn if balance < 1 MATIC
    const oneMatic = hre.ethers.utils.parseEther("1");
    if (balance.lt(oneMatic)) {
      console.log("\n⚠️  WARNING: Balance is less than 1 MATIC!");
      console.log("The relayer may not have enough funds to create UnifiedIDs.");
      console.log("Please fund the relayer address:", relayerAddress);
    } else {
      console.log("\n✅ Balance is sufficient (>= 1 MATIC)");
    }
  });

