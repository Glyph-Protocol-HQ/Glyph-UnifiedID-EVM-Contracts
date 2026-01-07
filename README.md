# Glyph-UnifiedID-EVM-Contracts

A decentralized registry system for managing UnifiedID mappings to wallet addresses on multiple blockchain networks. Built with Hardhat and Solidity.

## Overview

UnifiedIDRegistry is a smart contract that provides a secure and efficient way to map human-readable UnifiedIDs to blockchain wallet addresses. The contract uses a multi-registrar architecture where multiple authorized registrars can create new UnifiedID entries, ensuring controlled and verified identity creation.

**Version 1.0.0**: All registrations now require EIP-712 signatures for enhanced security and user consent. The legacy `createUnifiedID` function (without signature requirement) has been removed.

The contract includes comprehensive EIP-712 support for typed structured data signing, enabling secure, gasless registration flows where wallets can sign registration requests off-chain, and registrars can verify and process them on-chain. Nonce tracking prevents signature replay attacks, ensuring each signature can only be used once.

### Key Features

- **Secure Identity Mapping**: Map UnifiedIDs to primary wallet addresses with on-chain verification
- **Multi-Registrar Support**: Multiple authorized registrars can create UnifiedID entries independently
- **Registrar Management**: Contract owner can add or remove registrars dynamically
- **Bidirectional Lookup**: Query UnifiedID by wallet address or wallet by UnifiedID
- **Format Validation**: Enforces strict format rules for UnifiedIDs (lowercase alphanumeric, 4-16 characters)
- **EIP-712 Support**: Built-in support for EIP-712 typed structured data hashing and signing with nonce tracking for replay protection
- **Signature-Based Registration**: All registrations require EIP-712 signatures for enhanced security and user consent
- **Multiple Registration Paths**: Supports two signature-based registration methods - registrar-submitted with user signature, and self-service registration
- **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard for security
- **Multi-Network Support**: Deployable to Polygon, Ethereum Sepolia, Base Sepolia, BNB Chain (coming soon), and more

### Detailed Documentation

https://docs.glyph.network/



## Deployed Addresses

### Base Mainnet
- **UnifiedIDRegistry**: `0x3bcdaa321cd9eeffaad4bd501a69b53fbbbb5655`

### Base Sepolia Testnet
- **UnifiedIDRegistry**: `0xbDe85ce0fCfB1b7F25e9570015B574529e70E1DB`

### BNB Chain
- *Coming soon*

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Git**: For cloning the repository
- **MetaMask** or similar wallet: For interacting with the contracts
- **Polygonscan API Key**: For contract verification (optional but recommended)

## Installation

1. **Clone the repository** (if applicable):
   ```bash
   git clone https://github.com/Glyph-Protocol-HQ/Glyph-UnifiedID-EVM-Contracts.git
   cd Glyph-UnifiedID-EVM-Contracts
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**:
   Edit `.env` and add your configuration:
   ```env
   # Base Sepolia Network
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   PRIVATE_KEY=your_private_key_here
   BASESCAN_API_KEY=your_basescan_api_key_here
   
   # Initial Registrar Address (required for deployment)
   INITIAL_REGISTRAR_ADDRESS=0x0000000000000000000000000000000000000000
   
   # Other Network RPC URLs (optional)
   MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
   POLYGON_RPC_URL=https://polygon-rpc.com
   SEPOLIA_RPC_URL=https://rpc.sepolia.org
   
   # Private Keys (NEVER COMMIT THESE)
   DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here
   
   # API Keys
   POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   

## Compilation

Compile the smart contracts:

```bash
npm run compile
```

This will:
- Compile all Solidity contracts
- Generate artifacts in the `artifacts/` directory
- Create ABIs in the `artifacts/contracts/` directory

## Testing

### Run All Tests

```bash
npm run test
```

### Run Tests with Coverage

```bash
npm run coverage
```

The test suite includes:
- Deployment tests
- EIP-712 infrastructure tests (domain separator, typehash, hash computation)
- Nonce tracking tests
- Signature verification error and event tests
- Registrar management tests
- UnifiedID creation tests (registrar-submitted with signature, self-service)
- Signature-based registration tests (`createUnifiedIDByRegistrar` and `createUnifiedIDSelf`)
- Comprehensive edge case coverage
- Integration tests with EIP-712 signature verification
- Tests verifying legacy `createUnifiedID` function no longer exists

## Deployment

### Base Sepolia Deployment

1. **Ensure you have ETH** in your deployer wallet for gas fees

2. **Deploy to Base Sepolia**:
   ```bash
   npx hardhat run scripts/deploy.js --network baseSepolia --registrar <INITIAL_REGISTRAR_ADDRESS>
   ```

   Or using environment variable:
   ```bash
   INITIAL_REGISTRAR_ADDRESS=0x... npx hardhat run scripts/deploy.js --network baseSepolia
   ```

   The script will:
   - Deploy UnifiedIDRegistry with the initial registrar address
   - Verify deployment state (owner, registrar count, etc.)
   - Save deployment info to `deployments/baseSepolia.json`
   - Display deployment summary and verification instructions

3. **Verify the deployment**:
   ```bash
   npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <INITIAL_REGISTRAR_ADDRESS>
   ```

### Local Deployment

1. **Start a local Hardhat node** (in a separate terminal):
   ```bash
   npx hardhat node
   ```

2. **Deploy to localhost**:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost --registrar <INITIAL_REGISTRAR_ADDRESS>
   ```

   The script will:
   - Deploy UnifiedIDRegistry with the initial registrar address
   - Save deployment info to `deployments/localhost.json`
   - Display deployment summary

### Manual Verification

**Base Sepolia:**
```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <INITIAL_REGISTRAR_ADDRESS>
```

Replace:
- `<CONTRACT_ADDRESS>` with your deployed contract address
- `<INITIAL_REGISTRAR_ADDRESS>` with the initial registrar address used during deployment

## Registration Methods

The contract provides two signature-based registration methods to suit different use cases. **All registrations require EIP-712 signatures** for enhanced security and user consent.

### 1. Registrar-Submitted Registration (`createUnifiedIDByRegistrar`)
**Use Case**: Gasless registration where user signs off-chain, registrar submits on-chain
- **Who calls**: Authorized registrar
- **Signature required**: Yes (EIP-712 signature from user)
- **Gas payer**: Registrar
- **Best for**: User-initiated registrations where registrar pays gas fees, relayer patterns, backend-initiated registrations

### 2. Self-Service Registration (`createUnifiedIDSelf`)
**Use Case**: Users register themselves directly
- **Who calls**: User (any address)
- **Signature required**: Yes (EIP-712 signature from user)
- **Gas payer**: User
- **Best for**: Decentralized registration, user-controlled registrations, DApp integrations, frontend-initiated registrations

### Breaking Change Notice

**Version 1.0.0**: The legacy `createUnifiedID` function (without signature requirement) has been removed. All registrations now require EIP-712 signatures for enhanced security and user consent.

**Migration Guide**:
- **Backend/Relayer**: Collect user EIP-712 signatures before calling `createUnifiedIDByRegistrar`
- **Frontend**: Use `createUnifiedIDSelf` for direct user registration with signature
- **Existing Integrations**: Update all code that calls `createUnifiedID()` to use signature-based functions

## EIP-712 Signature-Based Registration

The contract supports EIP-712 typed structured data signing for secure, gasless registration flows. Here's how to use it:

### Off-Chain Signature Generation

```javascript
const { ethers } = require("ethers");

async function signRegistration(wallet, contractAddress, chainId, walletAddress, unifiedId, nonce) {
  const domain = {
    name: "UnifiedIDRegistry",
    version: "1",
    chainId: chainId,
    verifyingContract: contractAddress
  };
  
  const types = {
    UnifiedIdRegistration: [
      { name: "wallet", type: "address" },
      { name: "unifiedId", type: "string" },
      { name: "nonce", type: "uint256" }
    ]
  };
  
  const value = {
    wallet: walletAddress,
    unifiedId: unifiedId,
    nonce: nonce
  };
  
  // Sign with MetaMask or other EIP-712 compatible wallet
  const signature = await wallet._signTypedData(domain, types, value);
  return signature;
}

// Example usage
const wallet = new ethers.Wallet("PRIVATE_KEY");
const contractAddress = "0x..."; // Your contract address
const chainId = 84532; // Base Sepolia
const walletToRegister = "0x...";
const unifiedId = "alice123";

// Get current nonce from contract
const registry = new ethers.Contract(contractAddress, abi, provider);
const nonce = await registry.getNonce(walletToRegister);

// Generate signature
const signature = await signRegistration(
  wallet,
  contractAddress,
  chainId,
  walletToRegister,
  unifiedId,
  nonce
);

// Verify hash matches contract computation
const contractHash = await registry.getRegistrationHash(
  walletToRegister,
  unifiedId,
  nonce
);
console.log("Hash to sign:", contractHash);
```

### Verifying Signatures

The contract's `getRegistrationHash()` function returns the exact hash that should be signed. This hash can be verified off-chain and used with the signature-based registration functions:

- **`createUnifiedIDByRegistrar`**: For registrar-submitted registrations with user signatures
- **`createUnifiedIDSelf`**: For self-service registrations where users submit their own signatures

Both functions verify the signature matches the expected wallet and current nonce, providing replay protection.

## Usage Examples

### Hardhat Tasks

The project includes several Hardhat tasks for interacting with the contract:

#### 1. Create a UnifiedID (Signature Required)

**Note**: All registrations now require EIP-712 signatures. Use the signature-based registration functions:

- For registrar-submitted registration: Use `createUnifiedIDByRegistrar` with user signature
- For self-service registration: Use `createUnifiedIDSelf` with user signature

See the "EIP-712 Signature-Based Registration" section below for signature generation examples.

#### 2. Get UnifiedID Details

```bash
npx hardhat get-id \
  --unifiedid "alice123" \
  --network mumbai
```

This will display:
- UnifiedID string
- Primary wallet address
- Creation timestamp (multiple formats)

#### 3. Manage Registrars

After deployment, use the registrar management script:

```bash
npx hardhat run scripts/manage-registrars.js --network baseSepolia
```

This interactive script allows you to:
- Add new registrars (owner only)
- Remove existing registrars (owner only)
- Check if an address is a registrar
- Get the total count of registrars

### Programmatic Usage

```javascript
const { ethers } = require("hardhat");

async function example() {
  // Get contract instance
  const registry = await ethers.getContractAt(
    "UnifiedIDRegistry",
    "0x..." // Contract address
  );

  // Check if UnifiedID exists
  const exists = await registry.unifiedIdExists("alice123");

  // Get UnifiedID data
  const data = await registry.getUnifiedID("alice123");
  console.log("Primary wallet:", data.primaryWallet);
  console.log("Created at:", data.createdAt);

  // Get UnifiedID by wallet
  const unifiedId = await registry.getUnifiedIdByWallet(
    "0x0000000000000000000000000000000000000000"
  );

  // EIP-712: Get registration hash for signature-based registration
  const wallet = "0x0000000000000000000000000000000000000000";
  const unifiedIdToRegister = "alice123";
  const nonce = await registry.getNonce(wallet);
  const registrationHash = await registry.getRegistrationHash(
    wallet,
    unifiedIdToRegister,
    nonce
  );
  console.log("Registration hash:", registrationHash);

  // Get domain separator and typehash for EIP-712 signing
  const domainSeparator = await registry.domainSeparator();
  const typehash = await registry.getUnifiedIdTypehash();
  console.log("Domain separator:", domainSeparator);
  console.log("Typehash:", typehash);

  // Example: Self-service registration with signature
  const wallet = "0x..."; // User's wallet
  const unifiedIdToRegister = "alice123";
  const nonce = await registry.getNonce(wallet);
  
  // User signs the registration (off-chain)
  const signature = await signRegistration(walletSigner, registry, wallet, unifiedIdToRegister, nonce);
  
  // User submits their own registration
  await registry.connect(walletSigner).createUnifiedIDSelf(unifiedIdToRegister, signature);
  
  // OR: Registrar submits on behalf of user
  // await registry.connect(registrar).createUnifiedIDByRegistrar(unifiedIdToRegister, wallet, signature);
}
```

## Contract Functions

### Registrar Management Functions

#### `addRegistrar(address registrar)`
- **Access**: Owner only
- **Description**: Adds a new registrar address authorized to create UnifiedIDs
- **Parameters**: 
  - `registrar`: The address to authorize as a registrar
- **Events**: Emits `RegistrarAdded` event

#### `removeRegistrar(address registrar)`
- **Access**: Owner only
- **Description**: Removes an existing registrar from the registry
- **Parameters**: 
  - `registrar`: The address to remove from registrars
- **Events**: Emits `RegistrarRemoved` event

#### `isRegistrar(address account) → bool`
- **Access**: Public view
- **Description**: Checks if an address is an authorized registrar
- **Returns**: `true` if the address is a registrar, `false` otherwise

#### `getRegistrarCount() → uint256`
- **Access**: Public view
- **Description**: Gets the total number of active registrars
- **Returns**: The count of active registrars
- **Note**: The contract uses a simplified storage design without array enumeration for gas efficiency. Use `isRegistrar()` to check individual addresses.

### UnifiedID Management Functions

The contract supports two signature-based registration methods. **All registrations require EIP-712 signatures**.

#### `createUnifiedIDByRegistrar(string calldata unifiedId, address primaryWallet, bytes calldata signature)`
- **Access**: Registrar only
- **Description**: Creates a new UnifiedID via registrar with user signature verification
- **Parameters**: 
  - `unifiedId`: The UnifiedID string to create (4-16 characters, lowercase alphanumeric)
  - `primaryWallet`: The primary wallet address to associate with the UnifiedID
  - `signature`: The EIP-712 signature from `primaryWallet` authorizing this registration
- **Requirements**: 
  - Caller must be an authorized registrar
  - Signature must be valid EIP-712 signature from `primaryWallet`
  - Signature must match current nonce for `primaryWallet`
  - UnifiedID must not already exist
  - UnifiedID must be valid format (lowercase a-z, 0-9, 4-16 chars)
  - Wallet must not already have a UnifiedID
  - Wallet address must not be zero address
- **Events**: Emits `UnifiedIDCreated` and `NonceConsumed` events
- **Use Case**: Gasless registration flow where user signs off-chain, registrar submits on-chain
- **Security**: Nonce is incremented after successful registration to prevent signature replay

#### `createUnifiedIDSelf(string calldata unifiedId, bytes calldata signature)`
- **Access**: Public (any address)
- **Description**: Creates a new UnifiedID by the user themselves with signature verification
- **Parameters**: 
  - `unifiedId`: The UnifiedID string to create (4-16 characters, lowercase alphanumeric)
  - `signature`: The EIP-712 signature from `msg.sender` authorizing this registration
- **Requirements**: 
  - Signature must be valid EIP-712 signature from `msg.sender`
  - Signature must match current nonce for `msg.sender`
  - UnifiedID must not already exist
  - UnifiedID must be valid format (lowercase a-z, 0-9, 4-16 chars)
  - Wallet (`msg.sender`) must not already have a UnifiedID
- **Events**: Emits `UnifiedIDCreated` and `NonceConsumed` events
- **Use Case**: Self-service registration where users register themselves directly
- **Security**: Nonce is incremented after successful registration to prevent signature replay
- **Note**: No registrar required - any address can register themselves

### View Functions

#### `getUnifiedID(string calldata unifiedId) → (address primaryWallet, uint256 createdAt)`
- **Access**: Public view
- **Description**: Retrieves the UnifiedID struct for a given UnifiedID string
- **Parameters**: 
  - `unifiedId`: The UnifiedID string to query
- **Returns**: 
  - `primaryWallet`: The primary wallet address
  - `createdAt`: The creation timestamp
- **Reverts**: If UnifiedID does not exist

#### `unifiedIdExists(string calldata unifiedId) → bool`
- **Access**: Public view
- **Description**: Checks if a UnifiedID exists
- **Parameters**: 
  - `unifiedId`: The UnifiedID string to check
- **Returns**: `true` if the UnifiedID exists, `false` otherwise

#### `getPrimaryWallet(string calldata unifiedId) → address`
- **Access**: Public view
- **Description**: Gets the primary wallet address for a given UnifiedID
- **Parameters**: 
  - `unifiedId`: The UnifiedID string to query
- **Returns**: The primary wallet address
- **Reverts**: If UnifiedID does not exist

#### `getUnifiedIdByWallet(address wallet) → string`
- **Access**: Public view
- **Description**: Gets the UnifiedID string for a given wallet address
- **Parameters**: 
  - `wallet`: The wallet address to query
- **Returns**: The UnifiedID string associated with the wallet, or empty string if wallet has no ID

#### `getNonce(address wallet) → uint256`
- **Access**: Public view
- **Description**: Gets the current nonce for a wallet address
- **Parameters**: 
  - `wallet`: The wallet address to query
- **Returns**: The current nonce value (starts at 0 for new addresses)
- **Use Case**: Used for signature replay protection in EIP-712 based registration flows

#### `domainSeparator() → bytes32`
- **Access**: Public view
- **Description**: Returns the EIP-712 domain separator for use in off-chain signature verification
- **Returns**: The domain separator bytes32 value
- **Use Case**: Enables off-chain applications to verify typed structured data signatures according to EIP-712 standard

#### `getUnifiedIdTypehash() → bytes32`
- **Access**: Public view
- **Description**: Returns the EIP-712 typehash for UnifiedID registration
- **Returns**: The typehash bytes32 value for "UnifiedIdRegistration(address wallet,string unifiedId,uint256 nonce)"
- **Use Case**: Enables off-chain applications to construct typed structured data messages for signature verification

#### `getRegistrationHash(address wallet, string calldata unifiedId, uint256 nonce) → bytes32`
- **Access**: Public view
- **Description**: Computes the EIP-712 hash for a registration request
- **Parameters**: 
  - `wallet`: The wallet address to be registered
  - `unifiedId`: The UnifiedID to be registered
  - `nonce`: The nonce to use (should match current nonce for wallet)
- **Returns**: The digest that needs to be signed by the wallet
- **Use Case**: Enables frontend/backend applications to compute the exact hash that wallets need to sign for EIP-712 based registration flows
- **Example**: Use this hash with `signTypedData` in MetaMask or other EIP-712 compatible wallets

### Public State Variables

- `registrarCount` (uint256): Total count of active registrars
- `totalIDs` (uint256): Total number of UnifiedIDs created
- `nonces` (mapping(address => uint256)): Mapping from wallet address to current nonce for signature replay protection

### Events

- `UnifiedIDCreated(string indexed unifiedId, address indexed primaryWallet, uint256 timestamp)`: Emitted when a new UnifiedID is created
- `RegistrarAdded(address indexed registrar, address indexed addedBy, uint256 timestamp)`: Emitted when a new registrar is added
- `RegistrarRemoved(address indexed registrar, address indexed removedBy, uint256 timestamp)`: Emitted when a registrar is removed
- `NonceConsumed(address indexed wallet, uint256 nonce)`: Emitted when a wallet's nonce is consumed during successful signature-based registration

### Custom Errors

- `OnlyRegistrar()`: Thrown when a function is called by an address that is not an authorized registrar
- `UnifiedIdTooShort()`: Thrown when a UnifiedID is too short (less than minimum length)
- `UnifiedIdTooLong()`: Thrown when a UnifiedID is too long (exceeds maximum length)
- `InvalidUnifiedIdFormat()`: Thrown when a UnifiedID format is invalid
- `UnifiedIdAlreadyTaken()`: Thrown when attempting to create a UnifiedID that already exists
- `InvalidPrimaryWallet()`: Thrown when the primary wallet address is invalid (zero address)
- `WalletAlreadyHasId()`: Thrown when a wallet already has an associated UnifiedID
- `UnifiedIdDoesNotExist()`: Thrown when querying a UnifiedID that does not exist
- `InvalidRegistrarAddress()`: Thrown when attempting to set an invalid registrar address (zero address)
- `RegistrarAlreadyAdded()`: Thrown when attempting to add an address that is already registered as a registrar
- `RegistrarDoesNotExist()`: Thrown when attempting to remove a registrar that does not currently exist
- `InvalidSignature()`: Thrown when signature verification fails - recovered signer doesn't match expected wallet
- `SignatureExpired()`: Thrown when signature deadline has passed (reserved for future use)

## Security Considerations

### Access Control

- **Owner**: Can add or remove registrars
- **Registrars**: Can create new UnifiedID entries
- **Public**: Can read UnifiedID data (view functions only)

### Best Practices

1. **Private Keys**: Never commit private keys to version control
   - Use `.env` file (already in `.gitignore`)
   - Consider using hardware wallets for production

2. **Registrar Security**: 
   - Keep registrar private keys secure
   - Monitor registrar balances
   - Use separate accounts for registrars and deployer
   - Regularly audit active registrars

3. **UnifiedID Format**:
   - Enforced: lowercase alphanumeric, 4-16 characters
   - Allowed: letters (a-z), numbers (0-9)
   - Not allowed: uppercase letters, spaces, special characters, dots, hyphens, underscores

4. **Gas Optimization**:
   - Contract uses optimizer with 200 runs
   - Efficient storage patterns (simplified registrar storage without array enumeration)
   - Minimal external calls
   - Registrar management uses mapping-only storage for reduced gas costs

5. **Reentrancy Protection**:
   - All state-changing functions use `nonReentrant` modifier
   - Follows checks-effects-interactions pattern

6. **EIP-712 Signature Verification** (Required for All Registrations):
   - **All registrations require EIP-712 signatures** - the legacy `createUnifiedID` function has been removed
   - Contract supports EIP-712 typed structured data signing
   - Nonce tracking prevents signature replay attacks
   - Domain separator and typehash are exposed for off-chain verification
   - Use `getRegistrationHash()` to compute the exact hash that needs to be signed
   - Always verify signatures match the expected wallet address before processing
   - Two signature-based registration functions available:
     - `createUnifiedIDByRegistrar`: For registrar-submitted registrations (registrar pays gas)
     - `createUnifiedIDSelf`: For self-service registrations (user pays gas)
   - Both functions increment nonce only on successful registration
   - **Breaking Change**: Version 1.0.0 removed the legacy `createUnifiedID` function without signature requirement


## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile all contracts |
| `npm run test` | Run test suite |
| `npm run coverage` | Generate test coverage report |
| `npx hardhat run scripts/deploy.js --network <network> --registrar <address>` | Deploy to any network |
| `npx hardhat run scripts/manage-registrars.js --network <network>` | Manage registrars interactively |
| `npx hardhat verify --network <network> <address> <registrar>` | Verify contract on explorer |

## Troubleshooting

### Common Issues

1. **"Initial registrar address not provided"**
   - Use `--registrar <address>` flag when deploying
   - Or set `INITIAL_REGISTRAR_ADDRESS` in `.env` file

2. **"Deployment file not found"**
   - Deploy the contract first using `npm run deploy:local` or `npm run deploy:mumbai`

3. **"Insufficient funds"**
   - Ensure your deployer wallet has enough MATIC for gas fees
   - Check balance with `npx hardhat check-balance`

4. **"Contract already verified"**
   - This is normal if the contract was previously verified
   - The verification script handles this gracefully

5. **Compilation errors**
   - Ensure Node.js version is 18+ (20+ recommended)
   - Delete `cache/` and `artifacts/` directories and recompile
   - Run `npm install` to ensure dependencies are up to date

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
