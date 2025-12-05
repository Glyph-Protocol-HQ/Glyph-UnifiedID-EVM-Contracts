# Glyph-UnifiedID-EVM-Contracts

A decentralized registry system for managing UnifiedID mappings to wallet addresses on multiple blockchain networks. Built with Hardhat and Solidity.

## Overview

UnifiedIDRegistry is a smart contract that provides a secure and efficient way to map human-readable UnifiedIDs to blockchain wallet addresses. The contract uses a multi-registrar architecture where multiple authorized registrars can create new UnifiedID entries, ensuring controlled and verified identity creation.

### Key Features

- **Secure Identity Mapping**: Map UnifiedIDs to primary wallet addresses with on-chain verification
- **Multi-Registrar Support**: Multiple authorized registrars can create UnifiedID entries independently
- **Registrar Management**: Contract owner can add or remove registrars dynamically
- **Bidirectional Lookup**: Query UnifiedID by wallet address or wallet by UnifiedID
- **Format Validation**: Enforces strict format rules for UnifiedIDs (lowercase alphanumeric, 4-16 characters)
- **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard for security
- **Multi-Network Support**: Deployable to Polygon, Ethereum Sepolia, Base Sepolia, and more

## Deployed Addresses

### Base Sepolia Testnet
- **UnifiedIDRegistry**: `0xbDe85ce0fCfB1b7F25e9570015B574529e70E1DB`

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

The test suite includes deployment tests, registrar management tests, UnifiedID creation tests, and comprehensive edge case coverage.

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

## Usage Examples

### Hardhat Tasks

The project includes several Hardhat tasks for interacting with the contract:

#### 1. Create a UnifiedID

```bash
npx hardhat create-id \
  --unifiedid "alice123" \
  --wallet 0x0000000000000000000000000000000000000000 \
  --network baseSepolia
```

This will:
- Create a new UnifiedID "alice123" mapped to the specified wallet
- Display transaction hash and gas usage
- Require the signer to be an authorized registrar

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
- List all current registrars
- Check if an address is a registrar

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

#### `getRegistrars() → address[]`
- **Access**: Public view
- **Description**: Gets all registrar addresses
- **Returns**: Array of all registrar addresses

#### `getRegistrarCount() → uint256`
- **Access**: Public view
- **Description**: Gets the total number of active registrars
- **Returns**: The count of active registrars

### UnifiedID Management Functions

#### `createUnifiedID(string calldata unifiedId, address primaryWallet)`
- **Access**: Registrar only
- **Description**: Creates a new UnifiedID and maps it to a primary wallet
- **Parameters**: 
  - `unifiedId`: The UnifiedID string to create (4-16 characters, lowercase alphanumeric)
  - `primaryWallet`: The primary wallet address to associate with the UnifiedID
- **Requirements**: 
  - Caller must be an authorized registrar
  - UnifiedID must not already exist
  - UnifiedID must be valid format (lowercase a-z, 0-9, 4-16 chars)
  - Wallet must not already have a UnifiedID
  - Wallet address must not be zero address
- **Events**: Emits `UnifiedIDCreated` event

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

### Public State Variables

- `registrarCount` (uint256): Total count of active registrars
- `totalIDs` (uint256): Total number of UnifiedIDs created

### Events

- `UnifiedIDCreated(string indexed unifiedId, address indexed primaryWallet, uint256 timestamp)`: Emitted when a new UnifiedID is created
- `RegistrarAdded(address indexed registrar, address indexed addedBy, uint256 timestamp)`: Emitted when a new registrar is added
- `RegistrarRemoved(address indexed registrar, address indexed removedBy, uint256 timestamp)`: Emitted when a registrar is removed

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
   - Efficient storage patterns
   - Minimal external calls

5. **Reentrancy Protection**:
   - All state-changing functions use `nonReentrant` modifier
   - Follows checks-effects-interactions pattern


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
