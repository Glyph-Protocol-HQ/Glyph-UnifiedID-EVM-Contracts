const { ethers } = require("hardhat");

/**
 * @dev Deploys the UnifiedIDRegistry contract and returns signers
 * @returns {Object} Object containing registry contract and signers
 */
async function deployFixture() {
  // Get signers
  const [owner, initialRegistrar, user1, user2, user3] = await ethers.getSigners();

  // Deploy UnifiedIDRegistry with initial registrar address
  const UnifiedIDRegistry = await ethers.getContractFactory("UnifiedIDRegistry");
  const registry = await UnifiedIDRegistry.deploy(initialRegistrar.address);
  await registry.deployed();

  return {
    registry,
    owner,
    initialRegistrar,
    user1,
    user2,
    user3,
  };
}

module.exports = {
  deployFixture,
};

