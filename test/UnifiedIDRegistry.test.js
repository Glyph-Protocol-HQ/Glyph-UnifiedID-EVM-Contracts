const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { deployFixture } = require("./fixtures/deploy");

describe("UnifiedIDRegistry", function () {
  // ============ SECTION 1: DEPLOYMENT TESTS ============
  describe("Deployment", function () {
    it("Should deploy contract with initial registrar", async function () {
      const { registry, initialRegistrar } = await loadFixture(deployFixture);

      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.true;
    });

    it("Should revert deployment with zero address", async function () {
      const UnifiedIDRegistry = await ethers.getContractFactory("UnifiedIDRegistry");

      await expect(
        UnifiedIDRegistry.deploy(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(UnifiedIDRegistry, "InvalidRegistrarAddress");
    });

    it("Should set initial registrar correctly", async function () {
      const { registry, initialRegistrar } = await loadFixture(deployFixture);

      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.true;
      const registrars = await registry.getRegistrars();
      expect(registrars).to.include(initialRegistrar.address);
    });

    it("Should set registrarCount to 1 after deployment", async function () {
      const { registry } = await loadFixture(deployFixture);

      expect(await registry.registrarCount()).to.equal(1);
      expect(await registry.getRegistrarCount()).to.equal(1);
    });

    it("Should set owner correctly", async function () {
      const { registry, owner } = await loadFixture(deployFixture);

      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should emit RegistrarAdded event on deployment", async function () {
      const [owner, initialRegistrar] = await ethers.getSigners();
      const UnifiedIDRegistry = await ethers.getContractFactory("UnifiedIDRegistry");

      const tx = UnifiedIDRegistry.deploy(initialRegistrar.address);
      const registry = await tx;

      const receipt = await registry.deployTransaction.wait();
      
      // Find RegistrarAdded event in logs (first log is OwnershipTransferred from Ownable)
      let registrarAddedEvent = null;
      for (const log of receipt.logs) {
        try {
          const parsed = registry.interface.parseLog(log);
          if (parsed.name === "RegistrarAdded") {
            registrarAddedEvent = parsed;
            break;
          }
        } catch (e) {
          // Skip logs that don't match this contract's interface
        }
      }
      
      expect(registrarAddedEvent).to.not.be.null;
      expect(registrarAddedEvent.args.registrar).to.equal(initialRegistrar.address);
      expect(registrarAddedEvent.args.addedBy).to.equal(owner.address);
    });

    it("Should initialize totalIDs to 0", async function () {
      const { registry } = await loadFixture(deployFixture);

      expect(await registry.totalIDs()).to.equal(0);
    });
  });

  // ============ SECTION 2: REGISTRAR MANAGEMENT TESTS ============
  describe("Registrar Management - Adding Registrars", function () {
    it("Should allow owner to add registrar", async function () {
      const { registry, owner, user1 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);

      expect(await registry.isRegistrar(user1.address)).to.be.true;
    });

    it("Should emit RegistrarAdded event when adding registrar", async function () {
      const { registry, owner, user1 } = await loadFixture(deployFixture);

      await expect(
        registry.connect(owner).addRegistrar(user1.address)
      )
        .to.emit(registry, "RegistrarAdded")
        .withArgs(user1.address, owner.address, anyValue);
    });

    it("Should increase registrarCount when adding registrar", async function () {
      const { registry, owner, user1 } = await loadFixture(deployFixture);

      expect(await registry.registrarCount()).to.equal(1);

      await registry.connect(owner).addRegistrar(user1.address);

      expect(await registry.registrarCount()).to.equal(2);
      expect(await registry.getRegistrarCount()).to.equal(2);
    });

    it("Should revert when adding zero address registrar", async function () {
      const { registry, owner } = await loadFixture(deployFixture);

      await expect(
        registry.connect(owner).addRegistrar(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(registry, "InvalidRegistrarAddress");
    });

    it("Should revert when adding duplicate registrar", async function () {
      const { registry, owner, initialRegistrar } = await loadFixture(deployFixture);

      await expect(
        registry.connect(owner).addRegistrar(initialRegistrar.address)
      ).to.be.revertedWithCustomError(registry, "RegistrarAlreadyAdded");
    });

    it("Should revert when non-owner tries to add registrar", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);

      await expect(
        registry.connect(user1).addRegistrar(user2.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("Should allow adding multiple registrars", async function () {
      const { registry, owner, user1, user2, user3 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);
      await registry.connect(owner).addRegistrar(user3.address);

      expect(await registry.registrarCount()).to.equal(4);
      expect(await registry.isRegistrar(user1.address)).to.be.true;
      expect(await registry.isRegistrar(user2.address)).to.be.true;
      expect(await registry.isRegistrar(user3.address)).to.be.true;
    });

    it("Should return correct array from getRegistrars", async function () {
      const { registry, owner, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);

      const registrars = await registry.getRegistrars();
      expect(registrars.length).to.equal(3);
      expect(registrars).to.include(initialRegistrar.address);
      expect(registrars).to.include(user1.address);
      expect(registrars).to.include(user2.address);
    });

    it("Should return true for isRegistrar when registrar is added", async function () {
      const { registry, owner, user1 } = await loadFixture(deployFixture);

      expect(await registry.isRegistrar(user1.address)).to.be.false;

      await registry.connect(owner).addRegistrar(user1.address);

      expect(await registry.isRegistrar(user1.address)).to.be.true;
    });
  });

  describe("Registrar Management - Removing Registrars", function () {
    it("Should allow owner to remove registrar", async function () {
      const { registry, owner, initialRegistrar } = await loadFixture(deployFixture);

      await registry.connect(owner).removeRegistrar(initialRegistrar.address);

      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.false;
    });

    it("Should emit RegistrarRemoved event when removing registrar", async function () {
      const { registry, owner, initialRegistrar } = await loadFixture(deployFixture);

      await expect(
        registry.connect(owner).removeRegistrar(initialRegistrar.address)
      )
        .to.emit(registry, "RegistrarRemoved")
        .withArgs(initialRegistrar.address, owner.address, anyValue);
    });

    it("Should decrease registrarCount when removing registrar", async function () {
      const { registry, owner, initialRegistrar, user1 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      expect(await registry.registrarCount()).to.equal(2);

      await registry.connect(owner).removeRegistrar(initialRegistrar.address);

      expect(await registry.registrarCount()).to.equal(1);
      expect(await registry.getRegistrarCount()).to.equal(1);
    });

    it("Should revert when removing non-existent registrar", async function () {
      const { registry, owner, user1 } = await loadFixture(deployFixture);

      await expect(
        registry.connect(owner).removeRegistrar(user1.address)
      ).to.be.revertedWithCustomError(registry, "RegistrarDoesNotExist");
    });

    it("Should revert when non-owner tries to remove registrar", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      await expect(
        registry.connect(user1).removeRegistrar(initialRegistrar.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("Should update isRegistrar to false after removal", async function () {
      const { registry, owner, initialRegistrar } = await loadFixture(deployFixture);

      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.true;

      await registry.connect(owner).removeRegistrar(initialRegistrar.address);

      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.false;
    });

    it("Should return updated array from getRegistrars after removal", async function () {
      const { registry, owner, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);

      let registrars = await registry.getRegistrars();
      expect(registrars.length).to.equal(3);

      await registry.connect(owner).removeRegistrar(initialRegistrar.address);

      registrars = await registry.getRegistrars();
      expect(registrars.length).to.equal(2);
      expect(registrars).to.not.include(initialRegistrar.address);
      expect(registrars).to.include(user1.address);
      expect(registrars).to.include(user2.address);
    });

    it("Should allow removing and re-adding same registrar", async function () {
      const { registry, owner, initialRegistrar } = await loadFixture(deployFixture);

      // Remove
      await registry.connect(owner).removeRegistrar(initialRegistrar.address);
      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.false;

      // Re-add
      await registry.connect(owner).addRegistrar(initialRegistrar.address);
      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.true;
      expect(await registry.registrarCount()).to.equal(1);
    });
  });

  describe("Registrar Management - Multiple Registrars", function () {
    it("Should allow multiple registrars to coexist", async function () {
      const { registry, owner, initialRegistrar, user1, user2, user3 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);
      await registry.connect(owner).addRegistrar(user3.address);

      expect(await registry.registrarCount()).to.equal(4);
      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.true;
      expect(await registry.isRegistrar(user1.address)).to.be.true;
      expect(await registry.isRegistrar(user2.address)).to.be.true;
      expect(await registry.isRegistrar(user3.address)).to.be.true;
    });

    it("Should allow each registrar to create UnifiedIDs independently", async function () {
      const { registry, owner, initialRegistrar, user1, user2, user3 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);

      // Create IDs with different registrars
      await registry.connect(initialRegistrar).createUnifiedID("id01", user1.address);
      await registry.connect(user1).createUnifiedID("id02", user2.address);
      await registry.connect(user2).createUnifiedID("id03", user3.address);

      expect(await registry.unifiedIdExists("id01")).to.be.true;
      expect(await registry.unifiedIdExists("id02")).to.be.true;
      expect(await registry.unifiedIdExists("id03")).to.be.true;
      expect(await registry.totalIDs()).to.equal(3);
    });

    it("Should not affect other registrars when removing one", async function () {
      const { registry, owner, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);

      // Remove initial registrar
      await registry.connect(owner).removeRegistrar(initialRegistrar.address);

      // Other registrars should still be active
      expect(await registry.isRegistrar(user1.address)).to.be.true;
      expect(await registry.isRegistrar(user2.address)).to.be.true;
      expect(await registry.registrarCount()).to.equal(2);
    });
  });

  // ============ SECTION 3: UNIFIEDID CREATION TESTS (with registrars) ============
  describe("UnifiedID Creation - With Registrars", function () {
    it("Should allow registrar to create UnifiedID", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      await registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address);

      expect(await registry.unifiedIdExists(unifiedId)).to.be.true;
      expect(await registry.getPrimaryWallet(unifiedId)).to.equal(user1.address);
    });

    it("Should allow multiple registrars to create different UnifiedIDs", async function () {
      const { registry, owner, initialRegistrar, user1, user2, user3 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);

      await registry.connect(initialRegistrar).createUnifiedID("id01", user2.address);
      await registry.connect(user1).createUnifiedID("id02", user3.address);

      expect(await registry.unifiedIdExists("id01")).to.be.true;
      expect(await registry.unifiedIdExists("id02")).to.be.true;
      expect(await registry.getPrimaryWallet("id01")).to.equal(user2.address);
      expect(await registry.getPrimaryWallet("id02")).to.equal(user3.address);
    });

    it("Should revert when non-registrar tries to create UnifiedID", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      await expect(
        registry.connect(user1).createUnifiedID(unifiedId, user2.address)
      ).to.be.revertedWithCustomError(registry, "OnlyRegistrar");
    });

    it("Should emit UnifiedIDCreated event when registrar creates ID", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      await expect(
        registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address)
      )
        .to.emit(registry, "UnifiedIDCreated")
        .withArgs(unifiedId, user1.address, anyValue);
    });

    it("Should still validate UnifiedID length (too short)", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "ab";
      await expect(
        registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address)
      ).to.be.revertedWithCustomError(registry, "UnifiedIdTooShort");
    });

    it("Should still validate UnifiedID length (too long)", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "a".repeat(33);
      await expect(
        registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address)
      ).to.be.revertedWithCustomError(registry, "UnifiedIdTooLong");
    });

    it("Should still validate UnifiedID format (uppercase)", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "TestUser123";
      await expect(
        registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address)
      ).to.be.revertedWithCustomError(registry, "InvalidUnifiedIdFormat");
    });

    it("Should still validate UnifiedID format (special characters)", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "test@user123";
      await expect(
        registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address)
      ).to.be.revertedWithCustomError(registry, "InvalidUnifiedIdFormat");
    });

    it("Should still prevent duplicate UnifiedIDs", async function () {
      const { registry, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      await registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address);

      await expect(
        registry.connect(initialRegistrar).createUnifiedID(unifiedId, user2.address)
      ).to.be.revertedWithCustomError(registry, "UnifiedIdAlreadyTaken");
    });

    it("Should still prevent zero address as primary wallet", async function () {
      const { registry, initialRegistrar } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      await expect(
        registry.connect(initialRegistrar).createUnifiedID(unifiedId, ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(registry, "InvalidPrimaryWallet");
    });

    it("Should still prevent wallet from having multiple UnifiedIDs", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId1 = "testuser123";
      await registry.connect(initialRegistrar).createUnifiedID(unifiedId1, user1.address);

      const unifiedId2 = "testuser456";
      await expect(
        registry.connect(initialRegistrar).createUnifiedID(unifiedId2, user1.address)
      ).to.be.revertedWithCustomError(registry, "WalletAlreadyHasId");
    });

    it("Should increment totalIDs when registrar creates ID", async function () {
      const { registry, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      expect(await registry.totalIDs()).to.equal(0);

      await registry.connect(initialRegistrar).createUnifiedID("user1", user1.address);
      expect(await registry.totalIDs()).to.equal(1);

      await registry.connect(initialRegistrar).createUnifiedID("user2", user2.address);
      expect(await registry.totalIDs()).to.equal(2);
    });

    it("Should prevent removed registrar from creating UnifiedIDs", async function () {
      const { registry, owner, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      // Remove registrar
      await registry.connect(owner).removeRegistrar(initialRegistrar.address);

      // Should not be able to create ID
      await expect(
        registry.connect(initialRegistrar).createUnifiedID("testid", user1.address)
      ).to.be.revertedWithCustomError(registry, "OnlyRegistrar");
    });
  });

  // ============ SECTION 4: VIEW FUNCTIONS TESTS ============
  describe("View Functions", function () {
    it("Should return all registrars from getRegistrars", async function () {
      const { registry, owner, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);

      const registrars = await registry.getRegistrars();
      expect(registrars.length).to.equal(3);
      expect(registrars).to.include(initialRegistrar.address);
      expect(registrars).to.include(user1.address);
      expect(registrars).to.include(user2.address);
    });

    it("Should return correct count from getRegistrarCount", async function () {
      const { registry, owner, user1, user2 } = await loadFixture(deployFixture);

      expect(await registry.getRegistrarCount()).to.equal(1);

      await registry.connect(owner).addRegistrar(user1.address);
      expect(await registry.getRegistrarCount()).to.equal(2);

      await registry.connect(owner).addRegistrar(user2.address);
      expect(await registry.getRegistrarCount()).to.equal(3);
    });

    it("Should return true for isRegistrar when address is registrar", async function () {
      const { registry, initialRegistrar } = await loadFixture(deployFixture);

      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.true;
    });

    it("Should return false for isRegistrar when address is not registrar", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      expect(await registry.isRegistrar(user1.address)).to.be.false;
    });

    it("Should return correct UnifiedID data from getUnifiedID", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      const tx = await registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const unifiedIDData = await registry.getUnifiedID(unifiedId);
      expect(unifiedIDData.primaryWallet).to.equal(user1.address);
      expect(unifiedIDData.createdAt).to.equal(block.timestamp);
    });

    it("Should revert getUnifiedID if UnifiedID does not exist", async function () {
      const { registry } = await loadFixture(deployFixture);

      const unifiedId = "nonexistent";
      await expect(
        registry.getUnifiedID(unifiedId)
      ).to.be.revertedWithCustomError(registry, "UnifiedIdDoesNotExist");
    });

    it("Should return true for unifiedIdExists when ID exists", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      await registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address);

      expect(await registry.unifiedIdExists(unifiedId)).to.be.true;
    });

    it("Should return false for unifiedIdExists when ID does not exist", async function () {
      const { registry } = await loadFixture(deployFixture);

      const unifiedId = "nonexistent";
      expect(await registry.unifiedIdExists(unifiedId)).to.be.false;
    });

    it("Should return correct primary wallet from getPrimaryWallet", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      await registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address);

      expect(await registry.getPrimaryWallet(unifiedId)).to.equal(user1.address);
    });

    it("Should revert getPrimaryWallet if UnifiedID does not exist", async function () {
      const { registry } = await loadFixture(deployFixture);

      const unifiedId = "nonexistent";
      await expect(
        registry.getPrimaryWallet(unifiedId)
      ).to.be.revertedWithCustomError(registry, "UnifiedIdDoesNotExist");
    });

    it("Should return correct UnifiedID from getUnifiedIdByWallet", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      await registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address);

      expect(await registry.getUnifiedIdByWallet(user1.address)).to.equal(unifiedId);
    });

    it("Should return empty string from getUnifiedIdByWallet when wallet has no ID", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      expect(await registry.getUnifiedIdByWallet(user1.address)).to.equal("");
    });
  });

  // ============ SECTION 5: EDGE CASES ============
  describe("Edge Cases", function () {
    it("Should work with many registrars (10+)", async function () {
      const { registry, owner } = await loadFixture(deployFixture);

      // Create 10 additional signers
      const signers = await ethers.getSigners();
      const additionalRegistrars = signers.slice(5, 15); // Get 10 additional signers

      // Add all as registrars
      for (const registrar of additionalRegistrars) {
        await registry.connect(owner).addRegistrar(registrar.address);
      }

      expect(await registry.registrarCount()).to.equal(11); // 1 initial + 10 added

      // Verify all are registrars
      for (const registrar of additionalRegistrars) {
        expect(await registry.isRegistrar(registrar.address)).to.be.true;
      }
    });

    it("Should allow removing all registrars except one", async function () {
      const { registry, owner, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);

      expect(await registry.registrarCount()).to.equal(3);

      // Remove all except initialRegistrar
      await registry.connect(owner).removeRegistrar(user1.address);
      await registry.connect(owner).removeRegistrar(user2.address);

      expect(await registry.registrarCount()).to.equal(1);
      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.true;
      expect(await registry.isRegistrar(user1.address)).to.be.false;
      expect(await registry.isRegistrar(user2.address)).to.be.false;
    });

    it("Should allow adding registrar back after removal", async function () {
      const { registry, owner, initialRegistrar } = await loadFixture(deployFixture);

      // Remove
      await registry.connect(owner).removeRegistrar(initialRegistrar.address);
      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.false;
      expect(await registry.registrarCount()).to.equal(0);

      // Re-add
      await registry.connect(owner).addRegistrar(initialRegistrar.address);
      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.true;
      expect(await registry.registrarCount()).to.equal(1);
    });

    it("Should maintain correct registrar array order after removals", async function () {
      const { registry, owner, initialRegistrar, user1, user2, user3 } = await loadFixture(deployFixture);

      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);
      await registry.connect(owner).addRegistrar(user3.address);

      // Remove middle registrar (user2)
      await registry.connect(owner).removeRegistrar(user2.address);

      const registrars = await registry.getRegistrars();
      expect(registrars.length).to.equal(3);
      expect(registrars).to.include(initialRegistrar.address);
      expect(registrars).to.include(user1.address);
      expect(registrars).to.include(user3.address);
      expect(registrars).to.not.include(user2.address);

      // Verify all remaining are still registrars
      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.true;
      expect(await registry.isRegistrar(user1.address)).to.be.true;
      expect(await registry.isRegistrar(user3.address)).to.be.true;
      expect(await registry.isRegistrar(user2.address)).to.be.false;
    });

    it("Should handle removing last registrar", async function () {
      const { registry, owner, initialRegistrar } = await loadFixture(deployFixture);

      await registry.connect(owner).removeRegistrar(initialRegistrar.address);

      expect(await registry.registrarCount()).to.equal(0);
      expect(await registry.isRegistrar(initialRegistrar.address)).to.be.false;

      const registrars = await registry.getRegistrars();
      expect(registrars.length).to.equal(0);
    });
  });

  // ============ SECTION 6: INTEGRATION TESTS ============
  describe("Integration Tests", function () {
    it("Should handle complete flow: deploy → add registrars → create IDs → remove registrar → verify access", async function () {
      const { registry, owner, initialRegistrar, user1, user2, user3 } = await loadFixture(deployFixture);

      // Step 1: Add registrars
      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);

      expect(await registry.registrarCount()).to.equal(3);

      // Step 2: Create IDs with different registrars
      await registry.connect(initialRegistrar).createUnifiedID("id01", user1.address);
      await registry.connect(user1).createUnifiedID("id02", user2.address);
      await registry.connect(user2).createUnifiedID("id03", user3.address);

      expect(await registry.totalIDs()).to.equal(3);
      expect(await registry.unifiedIdExists("id01")).to.be.true;
      expect(await registry.unifiedIdExists("id02")).to.be.true;
      expect(await registry.unifiedIdExists("id03")).to.be.true;

      // Step 3: Remove one registrar
      await registry.connect(owner).removeRegistrar(user1.address);

      expect(await registry.registrarCount()).to.equal(2);
      expect(await registry.isRegistrar(user1.address)).to.be.false;

      // Step 4: Verify removed registrar cannot create new IDs
      await expect(
        registry.connect(user1).createUnifiedID("id04", user3.address)
      ).to.be.revertedWithCustomError(registry, "OnlyRegistrar");

      // Step 5: Verify other registrars can still create IDs
      // Get additional signers for new wallets (user1 already has id01)
      const signers = await ethers.getSigners();
      const newWallet1 = signers[5];
      const newWallet2 = signers[6];
      
      await registry.connect(initialRegistrar).createUnifiedID("id05", newWallet1.address);
      await registry.connect(user2).createUnifiedID("id06", newWallet2.address);

      expect(await registry.totalIDs()).to.equal(5);
    });

    it("Should not interfere owner operations with registrar operations", async function () {
      const { registry, owner, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      // Owner adds registrar
      await registry.connect(owner).addRegistrar(user1.address);

      // Registrar creates ID
      await registry.connect(initialRegistrar).createUnifiedID("id01", user2.address);

      // Owner removes registrar
      await registry.connect(owner).removeRegistrar(user1.address);

      // Verify ID still exists and is accessible
      expect(await registry.unifiedIdExists("id01")).to.be.true;
      expect(await registry.getPrimaryWallet("id01")).to.equal(user2.address);
    });

    it("Should not interfere registrar operations with view functions", async function () {
      const { registry, owner, initialRegistrar, user1, user2 } = await loadFixture(deployFixture);

      // Create ID
      await registry.connect(initialRegistrar).createUnifiedID("id01", user1.address);

      // Add/remove registrars
      await registry.connect(owner).addRegistrar(user2.address);
      await registry.connect(owner).removeRegistrar(user2.address);

      // View functions should still work
      expect(await registry.unifiedIdExists("id01")).to.be.true;
      expect(await registry.getPrimaryWallet("id01")).to.equal(user1.address);
      expect(await registry.getUnifiedIdByWallet(user1.address)).to.equal("id01");

      const unifiedIDData = await registry.getUnifiedID("id01");
      expect(unifiedIDData.primaryWallet).to.equal(user1.address);
    });

    it("Should handle complex scenario with multiple registrars creating and removing", async function () {
      const { registry, owner, initialRegistrar, user1, user2, user3 } = await loadFixture(deployFixture);

      // Add multiple registrars
      await registry.connect(owner).addRegistrar(user1.address);
      await registry.connect(owner).addRegistrar(user2.address);
      await registry.connect(owner).addRegistrar(user3.address);

      // Get additional signers for wallets
      const signers = await ethers.getSigners();
      const wallet1 = signers[5];
      const wallet2 = signers[6];
      const wallet3 = signers[7];
      const wallet4 = signers[8];
      const wallet5 = signers[9];
      const wallet6 = signers[10];
      const wallet7 = signers[11];

      // Each registrar creates an ID
      await registry.connect(initialRegistrar).createUnifiedID("id01", wallet1.address);
      await registry.connect(user1).createUnifiedID("id02", wallet2.address);
      await registry.connect(user2).createUnifiedID("id03", wallet3.address);
      await registry.connect(user3).createUnifiedID("id04", wallet4.address);

      expect(await registry.totalIDs()).to.equal(4);

      // Remove one registrar
      await registry.connect(owner).removeRegistrar(user2.address);

      // Remaining registrars should still work
      await registry.connect(initialRegistrar).createUnifiedID("id05", wallet5.address);
      await registry.connect(user1).createUnifiedID("id06", wallet6.address);
      await registry.connect(user3).createUnifiedID("id07", wallet7.address);

      expect(await registry.totalIDs()).to.equal(7);

      // Verify all IDs exist
      for (let i = 1; i <= 7; i++) {
        const id = i < 10 ? `id0${i}` : `id${i}`;
        expect(await registry.unifiedIdExists(id)).to.be.true;
      }
    });
  });
});
