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

  // ============ SECTION 1.5: EIP-712 TESTS ============
  describe("EIP-712 Support", function () {
    it("Should deploy contract successfully with EIP712 initialized", async function () {
      const { registry } = await loadFixture(deployFixture);

      // Contract should deploy without errors
      expect(registry.address).to.be.properAddress;
      
      // Verify EIP712 is initialized by checking domain separator is accessible
      const domainSeparator = await registry.domainSeparator();
      expect(domainSeparator).to.not.equal(ethers.constants.HashZero);
    });

    it("Should return non-zero domain separator", async function () {
      const { registry } = await loadFixture(deployFixture);

      const domainSeparator = await registry.domainSeparator();
      
      // Domain separator should be a non-zero bytes32 value
      expect(domainSeparator).to.not.equal(ethers.constants.HashZero);
      expect(domainSeparator.length).to.equal(66); // 0x + 64 hex characters
    });

    it("Should maintain consistent domain separator across calls", async function () {
      const { registry } = await loadFixture(deployFixture);

      const domainSeparator1 = await registry.domainSeparator();
      const domainSeparator2 = await registry.domainSeparator();
      
      // Domain separator should be consistent
      expect(domainSeparator1).to.equal(domainSeparator2);
    });

    it("Should allow createUnifiedID to work after EIP712 integration", async function () {
      const { registry, initialRegistrar, user1 } = await loadFixture(deployFixture);

      // Verify EIP712 is initialized
      const domainSeparator = await registry.domainSeparator();
      expect(domainSeparator).to.not.equal(ethers.constants.HashZero);

      // Verify existing functionality still works
      const unifiedId = "testuser123";
      await registry.connect(initialRegistrar).createUnifiedID(unifiedId, user1.address);

      expect(await registry.unifiedIdExists(unifiedId)).to.be.true;
      expect(await registry.getPrimaryWallet(unifiedId)).to.equal(user1.address);
      expect(await registry.totalIDs()).to.equal(1);
    });
  });

  // ============ SECTION 1.6: NONCE TRACKING TESTS ============
  describe("Nonce Tracking", function () {
    it("Should return 0 for nonces mapping on new addresses", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      // New address should have nonce of 0
      expect(await registry.nonces(user1.address)).to.equal(0);
      expect(await registry.getNonce(user1.address)).to.equal(0);
    });

    it("Should return correct nonce value via getNonce()", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);

      // Initially nonce should be 0
      expect(await registry.getNonce(user1.address)).to.equal(0);
      expect(await registry.getNonce(user2.address)).to.equal(0);

      // Direct mapping access should match getNonce()
      expect(await registry.nonces(user1.address)).to.equal(await registry.getNonce(user1.address));
      expect(await registry.nonces(user2.address)).to.equal(await registry.getNonce(user2.address));
    });

    it("Should correctly form UNIFIED_ID_TYPEHASH", async function () {
      const { registry } = await loadFixture(deployFixture);

      // Get the typehash from the contract
      const contractTypehash = await registry.getUnifiedIdTypehash();

      // Compute the expected typehash in JavaScript
      const typeString = "UnifiedIdRegistration(address wallet,string unifiedId,uint256 nonce)";
      const expectedTypehash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(typeString));

      // Compare
      expect(contractTypehash).to.equal(expectedTypehash);
      expect(contractTypehash).to.not.equal(ethers.constants.HashZero);
    });

    it("Should maintain nonce consistency across multiple queries", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      const nonce1 = await registry.getNonce(user1.address);
      const nonce2 = await registry.nonces(user1.address);
      const nonce3 = await registry.getNonce(user1.address);

      // All should be the same
      expect(nonce1).to.equal(nonce2);
      expect(nonce2).to.equal(nonce3);
      expect(nonce1).to.equal(0);
    });
  });

  // ============ SECTION 1.7: SIGNATURE VERIFICATION ERRORS AND EVENTS TESTS ============
  describe("Signature Verification Errors and Events", function () {
    it("Should have correct InvalidSignature error selector", async function () {
      const UnifiedIDRegistry = await ethers.getContractFactory("UnifiedIDRegistry");
      
      // Get error selector from contract interface using getSighash
      const errorFragment = UnifiedIDRegistry.interface.getError("InvalidSignature");
      const errorSelector = UnifiedIDRegistry.interface.getSighash(errorFragment);
      
      // Compute expected selector: keccak256("InvalidSignature()") first 4 bytes
      const expectedSelector = ethers.utils.id("InvalidSignature()").slice(0, 10); // 0x + 8 hex chars
      
      expect(errorSelector).to.equal(expectedSelector);
      expect(errorSelector).to.not.equal("0x00000000");
    });

    it("Should have correct SignatureExpired error selector", async function () {
      const UnifiedIDRegistry = await ethers.getContractFactory("UnifiedIDRegistry");
      
      // Get error selector from contract interface using getSighash
      const errorFragment = UnifiedIDRegistry.interface.getError("SignatureExpired");
      const errorSelector = UnifiedIDRegistry.interface.getSighash(errorFragment);
      
      // Compute expected selector: keccak256("SignatureExpired()") first 4 bytes
      const expectedSelector = ethers.utils.id("SignatureExpired()").slice(0, 10); // 0x + 8 hex chars
      
      expect(errorSelector).to.equal(expectedSelector);
      expect(errorSelector).to.not.equal("0x00000000");
    });

    it("Should have correct NonceConsumed event signature", async function () {
      const UnifiedIDRegistry = await ethers.getContractFactory("UnifiedIDRegistry");
      
      // Get event from contract interface using getEventTopic
      const eventFragment = UnifiedIDRegistry.interface.getEvent("NonceConsumed");
      const eventTopic = UnifiedIDRegistry.interface.getEventTopic(eventFragment);
      
      // Compute expected topic hash: keccak256("NonceConsumed(address,uint256)")
      const expectedTopic = ethers.utils.id("NonceConsumed(address,uint256)");
      
      expect(eventTopic).to.equal(expectedTopic);
      expect(eventTopic).to.not.equal(ethers.constants.HashZero);
    });

    it("Should have NonceConsumed event with correct indexed parameters", async function () {
      const UnifiedIDRegistry = await ethers.getContractFactory("UnifiedIDRegistry");
      
      // Get event from contract interface
      const eventFragment = UnifiedIDRegistry.interface.getEvent("NonceConsumed");
      
      // Verify event has correct parameters
      expect(eventFragment.inputs.length).to.equal(2);
      expect(eventFragment.inputs[0].name).to.equal("wallet");
      expect(eventFragment.inputs[0].type).to.equal("address");
      expect(eventFragment.inputs[0].indexed).to.be.true;
      expect(eventFragment.inputs[1].name).to.equal("nonce");
      expect(eventFragment.inputs[1].type).to.equal("uint256");
      expect(eventFragment.inputs[1].indexed).to.be.false;
    });
  });

  // ============ SECTION 1.8: EIP-712 HASH HELPER TESTS ============
  describe("EIP-712 Hash Helper Functions", function () {
    // Helper function for signing registration data
    async function signRegistration(signer, contract, wallet, unifiedId, nonce) {
      const network = await ethers.provider.getNetwork();
      const domain = {
        name: "UnifiedIDRegistry",
        version: "1",
        chainId: network.chainId,
        verifyingContract: contract.address
      };
      
      const types = {
        UnifiedIdRegistration: [
          { name: "wallet", type: "address" },
          { name: "unifiedId", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };
      
      const value = { wallet, unifiedId, nonce };
      
      return await signer._signTypedData(domain, types, value);
    }

    it("Should return consistent hash for same inputs", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      const wallet = user1.address;
      const unifiedId = "testuser123";
      const nonce = 0;

      const hash1 = await registry.getRegistrationHash(wallet, unifiedId, nonce);
      const hash2 = await registry.getRegistrationHash(wallet, unifiedId, nonce);
      const hash3 = await registry.getRegistrationHash(wallet, unifiedId, nonce);

      expect(hash1).to.equal(hash2);
      expect(hash2).to.equal(hash3);
      expect(hash1).to.not.equal(ethers.constants.HashZero);
    });

    it("Should return different hash when wallet changes", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);

      const unifiedId = "testuser123";
      const nonce = 0;

      const hash1 = await registry.getRegistrationHash(user1.address, unifiedId, nonce);
      const hash2 = await registry.getRegistrationHash(user2.address, unifiedId, nonce);

      expect(hash1).to.not.equal(hash2);
      expect(hash1).to.not.equal(ethers.constants.HashZero);
      expect(hash2).to.not.equal(ethers.constants.HashZero);
    });

    it("Should return different hash when unifiedId changes", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      const wallet = user1.address;
      const nonce = 0;

      const hash1 = await registry.getRegistrationHash(wallet, "testuser123", nonce);
      const hash2 = await registry.getRegistrationHash(wallet, "testuser456", nonce);
      const hash3 = await registry.getRegistrationHash(wallet, "differentid", nonce);

      expect(hash1).to.not.equal(hash2);
      expect(hash2).to.not.equal(hash3);
      expect(hash1).to.not.equal(hash3);
      expect(hash1).to.not.equal(ethers.constants.HashZero);
    });

    it("Should return different hash when nonce changes", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      const wallet = user1.address;
      const unifiedId = "testuser123";

      const hash1 = await registry.getRegistrationHash(wallet, unifiedId, 0);
      const hash2 = await registry.getRegistrationHash(wallet, unifiedId, 1);
      const hash3 = await registry.getRegistrationHash(wallet, unifiedId, 2);

      expect(hash1).to.not.equal(hash2);
      expect(hash2).to.not.equal(hash3);
      expect(hash1).to.not.equal(hash3);
      expect(hash1).to.not.equal(ethers.constants.HashZero);
    });

    it("Should match hash computed by signTypedData and verify recovered address", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      const wallet = user1.address;
      const unifiedId = "testuser123";
      const nonce = 0;

      // Get hash from contract (this is the final hash that should be signed)
      const contractHash = await registry.getRegistrationHash(wallet, unifiedId, nonce);

      // Sign using signTypedData - ethers.js will compute the same hash internally
      const signature = await signRegistration(user1, registry, wallet, unifiedId, nonce);

      // Parse signature
      const sig = ethers.utils.splitSignature(signature);
      
      // The contract hash is already the final EIP-712 hash (includes prefix)
      // So we can recover directly from it
      const recoveredAddress = ethers.utils.recoverAddress(
        contractHash,
        { r: sig.r, s: sig.s, v: sig.v }
      );

      expect(recoveredAddress).to.equal(wallet);
      
      // Also verify that the hash matches what ethers computes
      const network = await ethers.provider.getNetwork();
      const domain = {
        name: "UnifiedIDRegistry",
        version: "1",
        chainId: network.chainId,
        verifyingContract: registry.address
      };
      
      const types = {
        UnifiedIdRegistration: [
          { name: "wallet", type: "address" },
          { name: "unifiedId", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };
      
      const value = { wallet, unifiedId, nonce };
      
      // Compute hash using ethers (for verification)
      const ethersHash = ethers.utils._TypedDataEncoder.hash(domain, types, value);
      expect(contractHash).to.equal(ethersHash);
    });

    it("Should produce hash that can be verified with ECDSA.recover", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      const wallet = user1.address;
      const unifiedId = "testuser123";
      const nonce = 0;

      // Get hash from contract
      const contractHash = await registry.getRegistrationHash(wallet, unifiedId, nonce);

      // Sign the hash directly (not EIP-712 format)
      const messageHash = ethers.utils.arrayify(contractHash);
      const signature = await user1.signMessage(messageHash);

      // Recover address
      const recoveredAddress = ethers.utils.verifyMessage(messageHash, signature);

      expect(recoveredAddress).to.equal(wallet);
    });

    it("Should produce different hashes for different contract addresses", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);
      
      // Deploy a second instance
      const [owner, initialRegistrar] = await ethers.getSigners();
      const UnifiedIDRegistry = await ethers.getContractFactory("UnifiedIDRegistry");
      const registry2 = await UnifiedIDRegistry.deploy(initialRegistrar.address);
      await registry2.deployed();

      const wallet = user1.address;
      const unifiedId = "testuser123";
      const nonce = 0;

      const hash1 = await registry.getRegistrationHash(wallet, unifiedId, nonce);
      const hash2 = await registry2.getRegistrationHash(wallet, unifiedId, nonce);

      // Hashes should be different because domain separator includes contract address
      expect(hash1).to.not.equal(hash2);
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
