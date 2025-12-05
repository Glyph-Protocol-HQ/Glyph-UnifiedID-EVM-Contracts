# Deployment Guide

Complete step-by-step guide for deploying UnifiedIDRegistry to Polygon networks.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Wallet Setup](#wallet-setup)
4. [Getting Testnet Tokens](#getting-testnet-tokens)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Contract Verification](#contract-verification)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying, ensure you have completed the following:

- [ ] Node.js v18+ installed
- [ ] Project dependencies installed (`npm install`)
- [ ] Contracts compiled successfully (`npm run compile`)
- [ ] All tests passing (`npm run test`)
- [ ] `.env` file configured with all required variables
- [ ] Deployer wallet has sufficient MATIC for gas fees
- [ ] Initial registrar address is known and ready
- [ ] RPC URLs configured (or using defaults)
- [ ] Polygonscan API key obtained (for verification)

---

## Environment Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `.env` and set the following variables:

```env
# Network RPC URLs
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
POLYGON_RPC_URL=https://polygon-rpc.com

# Private Keys (NEVER COMMIT THESE)
DEPLOYER_PRIVATE_KEY=0x...
PRIVATE_KEY=0x...  # For Base Sepolia

# Initial Registrar Address (required for deployment)
INITIAL_REGISTRAR_ADDRESS=0x...

# Base Sepolia Configuration
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key_here

# Polygonscan API Key (for verification)
POLYGONSCAN_API_KEY=your_api_key_here

# Optional
REPORT_GAS=false
COINMARKETCAP_API_KEY=your_key_here
```

### 4. Verify Environment Configuration

Check that your environment variables are loaded:

```bash
# Check if .env is loaded (should not show actual values)
node -e "require('dotenv').config(); console.log('RELAYER_ADDRESS:', process.env.RELAYER_ADDRESS ? 'SET' : 'NOT SET')"
```

---

## Wallet Setup

### Deployer Wallet

The deployer wallet is used to deploy the contract. Requirements:

- **Purpose**: Deploy contracts and pay gas fees
- **Balance**: Minimum 0.1 MATIC (testnet) or 0.01 MATIC (mainnet)
- **Security**: Use a dedicated wallet, not your main wallet
- **Private Key**: Store securely in `.env` as `DEPLOYER_PRIVATE_KEY`

### Initial Registrar

The initial registrar is the first authorized address that can create UnifiedIDs. Requirements:

- **Purpose**: First registrar authorized to call `createUnifiedID()` function
- **Balance**: Minimum 0.01 ETH (Base Sepolia) or 1 MATIC (Polygon) for operations
- **Address**: Must be provided during contract deployment
- **Additional Registrars**: Can be added later by the contract owner

> **Important**: The initial registrar address is set during deployment and cannot be changed. Additional registrars can be added or removed by the contract owner after deployment.

---

## Getting Testnet Tokens

### Mumbai Testnet Faucets

You'll need MATIC tokens on Mumbai testnet for gas fees. Use one of these faucets:

1. **Polygon Faucet** (Recommended)
   - URL: https://faucet.polygon.technology/
   - Requirements: GitHub account or Twitter account
   - Amount: 0.1 MATIC per request
   - Cooldown: 24 hours

2. **QuickNode Faucet**
   - URL: https://faucet.quicknode.com/polygon/mumbai
   - Requirements: QuickNode account (free)
   - Amount: 0.1 MATIC per request

3. **Alchemy Faucet**
   - URL: https://mumbaifaucet.com/
   - Requirements: Alchemy account (free)
   - Amount: 0.1 MATIC per request
   - Cooldown: 24 hours

4. **Chainlink Faucet**
   - URL: https://faucets.chain.link/mumbai
   - Requirements: None
   - Amount: 0.1 MATIC per request

### Funding Steps

1. **Get Deployer Wallet Address**:
   ```bash
   node -e "
   const { ethers } = require('ethers');
   require('dotenv').config();
   const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
   console.log('Deployer address:', wallet.address);
   "
   ```

2. **Request Testnet MATIC**:
   - Visit one of the faucet links above
   - Enter your deployer wallet address
   - Complete the verification (if required)
   - Wait for tokens (usually instant, up to 5 minutes)

3. **Verify Balance**:
   ```bash
   npx hardhat check-balance --network mumbai
   ```

4. **Fund Relayer Wallet**:
   - Transfer MATIC from deployer to relayer if needed
   - Or use faucet directly with relayer address

---

## Deployment Steps

### Step 1: Compile Contracts

```bash
npm run compile
```

**Expected Output**:
```
Compiled 1 Solidity file successfully
```

### Step 2: Run Tests (Recommended)

```bash
npm run test
```

**Expected Output**:
```
33 passing
```

### Step 3: Check Relayer Balance

```bash
npx hardhat check-balance --network mumbai
```

**Expected Output**:
```
✅ Balance is sufficient (>= 1 MATIC)
```

If balance is insufficient, use a faucet to fund the relayer address.

### Step 4: Deploy to Base Sepolia (or Mumbai)

**Base Sepolia:**
```bash
npx hardhat run scripts/deploy.js --network baseSepolia --registrar <INITIAL_REGISTRAR_ADDRESS>
```

**Mumbai:**
```bash
npx hardhat run scripts/deploy.js --network mumbai --registrar <INITIAL_REGISTRAR_ADDRESS>
```

**What happens**:
1. Script reads `INITIAL_REGISTRAR_ADDRESS` from `.env` or `--registrar` flag
2. Validates registrar address format
3. Deploys UnifiedIDRegistry with initial registrar address
4. Verifies deployment state (owner, registrar count, etc.)
5. Saves deployment info to `deployments/{network}.json`
6. Displays deployment summary and next steps

**Expected Output**:
```
════════════════════════════════════════════════════════════
🚀 UnifiedIDRegistry Deployment Script
════════════════════════════════════════════════════════════

📋 Network Information:
   Network: Base Sepolia
   Chain ID: 84532
   Explorer: https://sepolia.basescan.org

⚙️  Deployment Configuration:
   Initial Registrar: 0x...

👤 Deployer Information:
   Address: 0x...
   Balance: 0.5 ETH

⏳ Deploying UnifiedIDRegistry contract...

   Transaction submitted: 0x...
   Waiting for confirmation...

✅ Contract Deployed Successfully!
   Address: 0x...
   Deployment Time: 12.34s

🔍 Verifying Deployment...
   ✓ Owner: 0x...
   ✓ Registrar Count: 1
   ✓ Initial Registrar Active: true
   ✓ Total IDs: 0

✅ All deployment checks passed!

💾 Deployment info saved to deployments/baseSepolia.json

════════════════════════════════════════════════════════════
📝 Next Steps:
════════════════════════════════════════════════════════════

1. View contract on explorer:
   https://sepolia.basescan.org/address/0x...

2. Verify contract source code:
   npx hardhat verify --network baseSepolia 0x... 0x...

3. Add additional registrars:
   npx hardhat run scripts/manage-registrars.js --network baseSepolia

════════════════════════════════════════════════════════════
🎉 Deployment Complete!
════════════════════════════════════════════════════════════
```

### Step 5: Save Deployment Address

**Important**: Save the contract address for future reference:

```bash
# View deployment info
cat deployments/mumbai.json
```

Update the `README.md` with the deployed address:
```markdown
### Base Sepolia Testnet
- **UnifiedIDRegistry**: `0x...` (your deployed address)
```

---

## Post-Deployment Verification

### 1. Verify Contract Deployment

Check the contract on Polygonscan:

1. Visit: https://mumbai.polygonscan.com/address/YOUR_CONTRACT_ADDRESS
2. Verify:
   - Contract code is deployed
   - Transaction is confirmed
   - Contract has the correct bytecode

### 2. Verify Contract State

Use Hardhat tasks to verify the contract is working:

```bash
# Check relayer address
npx hardhat get-id --unifiedid "test" --network mumbai
# Should show error (UnifiedID doesn't exist yet)

# Try creating a UnifiedID (requires relayer)
npx hardhat create-id \
  --unifiedid "test123" \
  --wallet 0x0000000000000000000000000000000000000000 \
  --network mumbai
```

### 3. Verify Initial Registrar

Check that the initial registrar is set correctly:

```javascript
const { ethers } = require("hardhat");
const fs = require("fs");

async function checkRegistrar() {
  const deployment = JSON.parse(
    fs.readFileSync("deployments/baseSepolia.json", "utf8")
  );
  const registry = await ethers.getContractAt(
    "UnifiedIDRegistry",
    deployment.contractAddress
  );
  const isReg = await registry.isRegistrar(deployment.initialRegistrar);
  const registrarCount = await registry.registrarCount();
  console.log("Initial registrar:", deployment.initialRegistrar);
  console.log("Is registrar:", isReg);
  console.log("Registrar count:", registrarCount);
}

checkRegistrar();
```

---

## Contract Verification

### Automatic Verification

Use the verification script:

```bash
npm run verify:mumbai
```

**What happens**:
1. Loads deployment info from `deployments/{network}.json`
2. Extracts contract address and initial registrar address
3. Runs Hardhat verification with constructor arguments
4. Handles "Already Verified" errors gracefully
5. Displays explorer link (Basescan, Polygonscan, etc.)

**Expected Output**:
```
Verifying UnifiedIDRegistry contract...

Network: mumbai
Loaded deployment info from: deployments/mumbai.json
Contract address: 0x...
Relayer address: 0x...

Verifying contract...
✅ Contract verified successfully!

=== Explorer Link ===
https://mumbai.polygonscan.com/address/0x...

You can view the verified contract at the link above.
```

### Manual Verification

If automatic verification fails, verify manually:

```bash
npx hardhat verify \
  --network baseSepolia \
  <CONTRACT_ADDRESS> \
  <INITIAL_REGISTRAR_ADDRESS>
```

**Example**:
```bash
npx hardhat verify \
  --network baseSepolia \
  0x1234567890123456789012345678901234567890 \
  0x0000000000000000000000000000000000000000
```

### Verification Checklist

After verification, verify the following on Polygonscan:

- [ ] Contract code is verified (green checkmark)
- [ ] Contract tab shows readable source code
- [ ] Read Contract tab shows all public functions
- [ ] Write Contract tab is available (if connected)
- [ ] Events tab shows contract events
- [ ] Constructor arguments are visible

### Polygonscan Verification Guide

1. **Navigate to Contract**:
   - Go to: https://mumbai.polygonscan.com/address/YOUR_CONTRACT_ADDRESS
   - Click on the "Contract" tab

2. **Verify and Publish**:
   - Click "Verify and Publish" button
   - Select "Via Standard JSON Input"
   - Upload `artifacts/build-info/` files
   - Enter constructor arguments: `["0x..."]` (relayer address in quotes)
   - Click "Verify and Publish"

3. **Alternative: Via Hardhat Plugin**:
   - Use the automatic verification script (recommended)
   - Or use Hardhat verify command (see above)

---

## Troubleshooting

### Issue: "Initial registrar address not provided"

**Solution**:
1. Use `--registrar <address>` flag when deploying:
   ```bash
   npx hardhat run scripts/deploy.js --network baseSepolia --registrar 0x...
   ```
2. Or set `INITIAL_REGISTRAR_ADDRESS` in `.env` file
3. Ensure no extra spaces or quotes around the value
4. Restart your terminal/IDE

```bash
# Check if variable is loaded
node -e "require('dotenv').config(); console.log(process.env.INITIAL_REGISTRAR_ADDRESS)"
```

### Issue: "Insufficient funds for gas"

**Solution**:
1. Check deployer balance:
   ```bash
   npx hardhat check-balance --network mumbai
   ```
2. Use a faucet to get testnet MATIC (see [Getting Testnet Tokens](#getting-testnet-tokens))
3. Ensure you're using the correct network

### Issue: "Deployment file not found"

**Solution**:
1. Deploy the contract first: `npm run deploy:mumbai`
2. Check that `deployments/mumbai.json` exists
3. Verify network name matches (mumbai, not mumbai-testnet)

### Issue: "Contract verification failed"

**Possible Causes**:
1. **Wrong constructor arguments**:
   - Verify initial registrar address matches deployment
   - Check address format (no quotes needed)

2. **Network mismatch**:
   - Ensure you're verifying on the same network as deployment
   - Check `deployments/mumbai.json` for network info

3. **API key issues**:
   - Verify `POLYGONSCAN_API_KEY` is set in `.env`
   - Check API key is valid on Polygonscan

4. **Contract not ready**:
   - Wait a few minutes after deployment
   - Ensure transaction has enough confirmations

**Solution**:
```bash
# Verify manually with exact constructor args
npx hardhat verify \
  --network baseSepolia \
  $(node -e "console.log(require('./deployments/baseSepolia.json').contractAddress)") \
  $(node -e "console.log(require('./deployments/baseSepolia.json').initialRegistrar)")
```

### Issue: "Transaction reverted"

**Possible Causes**:
1. Invalid registrar address (zero address)
2. Insufficient gas
3. Network issues

**Solution**:
1. Check registrar address is valid:
   ```bash
   node -e "const { ethers } = require('ethers'); require('dotenv').config(); console.log(ethers.isAddress(process.env.INITIAL_REGISTRAR_ADDRESS))"
   ```
2. Increase gas limit in hardhat.config.js
3. Check network connectivity

### Issue: "Already Verified" error

**Status**: This is normal and handled gracefully by the verification script.

**Solution**: No action needed. The contract is already verified.

### Issue: "Invalid address format"

**Solution**:
1. Ensure addresses start with `0x`
2. Verify address is 42 characters (0x + 40 hex chars)
3. Check for typos or extra characters

```bash
# Validate address
node -e "const { ethers } = require('ethers'); console.log(ethers.utils.isAddress('YOUR_ADDRESS'))"
```

### Issue: Tests failing

**Solution**:
1. Ensure all dependencies are installed: `npm install`
2. Clear cache and recompile:
   ```bash
   rm -rf cache artifacts
   npm run compile
   ```
3. Check Node.js version (v18+ required)
4. Run tests with verbose output:
   ```bash
   npm run test -- --verbose
   ```

### Issue: "Cannot find module" errors

**Solution**:
1. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Check Node.js version compatibility
3. Verify all required packages in `package.json`

---

## Deployment Checklist Summary

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Wallets funded with ETH/MATIC
- [ ] Contracts compiled
- [ ] Tests passing
- [ ] Initial registrar address ready

### Deployment
- [ ] Contract deployed successfully
- [ ] Deployment info saved
- [ ] ABI exported
- [ ] Contract address saved

### Post-Deployment
- [ ] Contract verified on explorer (Basescan/Polygonscan)
- [ ] Initial registrar confirmed on-chain
- [ ] Test UnifiedID creation works
- [ ] View functions work correctly
- [ ] Registrar management tested
- [ ] Deployment address updated in README

---

## Additional Resources

- [Polygon Documentation](https://docs.polygon.technology/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Polygonscan Mumbai Explorer](https://mumbai.polygonscan.com/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review error messages carefully
3. Verify all environment variables are set correctly
4. Ensure you have sufficient testnet MATIC
5. Check network connectivity

For additional help, open an issue on GitHub or contact the development team.

---

**Last Updated**: 2024

**Note**: Always test thoroughly on testnets before deploying to mainnet.

