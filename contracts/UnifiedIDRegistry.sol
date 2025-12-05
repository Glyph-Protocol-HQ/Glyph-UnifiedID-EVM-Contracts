// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UnifiedIDRegistry
 * @dev Registry contract for managing UnifiedID mappings to wallet addresses
 * @notice This contract allows a relayer to create UnifiedIDs and map them to primary wallets
 */
contract UnifiedIDRegistry is Ownable, ReentrancyGuard {
    // ============ State Variables ============

    /// @dev Mapping to determine whether an address is an active registrar authorized to create UnifiedIDs
    mapping(address => bool) private _isRegistrar;

    /// @dev Array containing every registrar address ever authorized, enabling enumeration of current registrars
    address[] private _registrarList;

    /// @dev Total count of active registrar addresses for quick external access
    uint256 public registrarCount;

    /// @dev Total number of UnifiedIDs created
    uint256 public totalIDs;

    // ============ Structs ============

    /**
     * @dev Struct representing a UnifiedID entry
     * @param primaryWallet The primary wallet address associated with this UnifiedID
     * @param createdAt Timestamp when the UnifiedID was created
     */
    struct UnifiedID {
        address primaryWallet;
        uint256 createdAt;
    }

    // ============ Mappings ============

    /// @dev Mapping from UnifiedID string to UnifiedID struct
    mapping(string => UnifiedID) private registry;

    /// @dev Mapping from wallet address to UnifiedID string
    mapping(address => string) private walletToUnifiedId;

    /// @dev Mapping to track if a UnifiedID exists
    mapping(string => bool) private _unifiedIdExists;

    // ============ Events ============

    /**
     * @dev Emitted when a new UnifiedID is created
     * @param unifiedId The UnifiedID string (indexed)
     * @param primaryWallet The primary wallet address (indexed)
     * @param timestamp The creation timestamp
     */
    event UnifiedIDCreated(
        string indexed unifiedId,
        address indexed primaryWallet,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a new registrar is added to the registry
     * @param registrar The registrar address that was added (indexed)
     * @param addedBy The address that authorized and added the registrar (indexed)
     * @param timestamp The timestamp when the registrar was added
     */
    event RegistrarAdded(
        address indexed registrar,
        address indexed addedBy,
        uint256 timestamp
    );

    /**
     * @dev Emitted when an existing registrar is removed from the registry
     * @param registrar The registrar address that was removed (indexed)
     * @param removedBy The address that revoked the registrar (indexed)
     * @param timestamp The timestamp when the registrar was removed
     */
    event RegistrarRemoved(
        address indexed registrar,
        address indexed removedBy,
        uint256 timestamp
    );

    // ============ Custom Errors ============

    /// @dev Thrown when a function is called by an address that is not an authorized registrar
    error OnlyRegistrar();

    /// @dev Thrown when a UnifiedID is too short (less than minimum length)
    error UnifiedIdTooShort();

    /// @dev Thrown when a UnifiedID is too long (exceeds maximum length)
    error UnifiedIdTooLong();

    /// @dev Thrown when a UnifiedID format is invalid
    error InvalidUnifiedIdFormat();

    /// @dev Thrown when attempting to create a UnifiedID that already exists
    error UnifiedIdAlreadyTaken();

    /// @dev Thrown when the primary wallet address is invalid (zero address)
    error InvalidPrimaryWallet();

    /// @dev Thrown when a wallet already has an associated UnifiedID
    error WalletAlreadyHasId();

    /// @dev Thrown when querying a UnifiedID that does not exist
    error UnifiedIdDoesNotExist();

    /// @dev Thrown when attempting to set an invalid registrar address (zero address)
    error InvalidRegistrarAddress();

    /// @dev Thrown when attempting to add an address that is already registered as a registrar
    error RegistrarAlreadyAdded();

    /// @dev Thrown when attempting to remove a registrar that does not currently exist
    error RegistrarDoesNotExist();

    // ============ Constants ============

    /// @dev Minimum length for a UnifiedID (4 characters)
    uint256 private constant MIN_UNIFIED_ID_LENGTH = 4;  // 

    /// @dev Maximum length for a UnifiedID (16 characters)
    uint256 private constant MAX_UNIFIED_ID_LENGTH = 16;  // 

    // ============ Modifiers ============

    /**
     * @dev Modifier to restrict function access to authorized registrars only
     */
    modifier onlyRegistrar() {
        if (!_isRegistrar[msg.sender]) {
            revert OnlyRegistrar();
        }
        _;
    }

    // ============ Constructor ============

    /**
     * @dev Constructor to initialize the contract with an initial registrar
     * @param _initialRegistrar The address of the first registrar authorized to create UnifiedIDs
     */
    constructor(address _initialRegistrar) Ownable(msg.sender) {
        if (_initialRegistrar == address(0)) {
            revert InvalidRegistrarAddress();
        }

        _isRegistrar[_initialRegistrar] = true;
        _registrarList.push(_initialRegistrar);
        registrarCount = 1;

        emit RegistrarAdded(_initialRegistrar, msg.sender, block.timestamp);
    }

    // ============ External Functions ============

    /**
     * @dev Creates a new UnifiedID and maps it to a primary wallet
     * @param unifiedId The UnifiedID string to create
     * @param primaryWallet The primary wallet address to associate with the UnifiedID
     * @notice Only callable by authorized registrars, non-reentrant
     */
    function createUnifiedID(
        string calldata unifiedId,
        address primaryWallet
    ) external onlyRegistrar nonReentrant {
        // Validate UnifiedID format
        _validateUnifiedIdFormat(unifiedId);

        // Check if UnifiedID already exists
        if (_unifiedIdExists[unifiedId]) {
            revert UnifiedIdAlreadyTaken();
        }

        // Validate primary wallet address
        if (primaryWallet == address(0)) {
            revert InvalidPrimaryWallet();
        }

        // Check if wallet already has a UnifiedID
        bytes memory existingId = bytes(walletToUnifiedId[primaryWallet]);
        if (existingId.length > 0) {
            revert WalletAlreadyHasId();
        }

        // Create the UnifiedID entry
        uint256 timestamp = block.timestamp;
        registry[unifiedId] = UnifiedID({
            primaryWallet: primaryWallet,
            createdAt: timestamp
        });

        // Update mappings
        walletToUnifiedId[primaryWallet] = unifiedId;
        _unifiedIdExists[unifiedId] = true;

        unchecked {
            totalIDs++;
        }

        // Emit event
        emit UnifiedIDCreated(unifiedId, primaryWallet, timestamp);
    }

    // ============ Registrar Management Functions ============

    /**
     * @dev Adds a new registrar address
     * @param registrar The address to authorize as a registrar
     * @notice Only callable by the contract owner
     */
    function addRegistrar(address registrar) external onlyOwner {
        if (registrar == address(0)) {
            revert InvalidRegistrarAddress();
        }

        if (_isRegistrar[registrar]) {
            revert RegistrarAlreadyAdded();
        }

        _isRegistrar[registrar] = true;
        _registrarList.push(registrar);

        unchecked {
            registrarCount++;
        }

        emit RegistrarAdded(registrar, msg.sender, block.timestamp);
    }

    /**
     * @dev Removes an existing registrar address
     * @param registrar The address to remove from registrars
     * @notice Only callable by the contract owner
     */
    function removeRegistrar(address registrar) external onlyOwner {
        if (!_isRegistrar[registrar]) {
            revert RegistrarDoesNotExist();
        }

        _isRegistrar[registrar] = false;

        for (uint256 i = 0; i < _registrarList.length; i++) {
            if (_registrarList[i] == registrar) {
                _registrarList[i] = _registrarList[_registrarList.length - 1];
                _registrarList.pop();
                break;
            }
        }

        unchecked {
            registrarCount--;
        }

        emit RegistrarRemoved(registrar, msg.sender, block.timestamp);
    }

    /**
     * @dev Checks if an address is an authorized registrar
     * @param account The address to check
     * @return True if the address is a registrar, false otherwise
     */
    function isRegistrar(address account) external view returns (bool) {
        return _isRegistrar[account];
    }

    /**
     * @dev Gets all registrar addresses
     * @return Array of all registrar addresses
     */
    function getRegistrars() external view returns (address[] memory) {
        return _registrarList;
    }

    /**
     * @dev Gets the total number of registrars
     * @return The count of active registrars
     */
    function getRegistrarCount() external view returns (uint256) {
        return registrarCount;
    }

    // ============ View Functions ============

    /**
     * @dev Retrieves the UnifiedID struct for a given UnifiedID string
     * @param unifiedId The UnifiedID string to query
     * @return The UnifiedID struct containing primaryWallet and createdAt
     */
    function getUnifiedID(
        string calldata unifiedId  
    ) external view returns (UnifiedID memory) {
        if (!_unifiedIdExists[unifiedId]) {
            revert UnifiedIdDoesNotExist();
        }
        return registry[unifiedId];
    }

    /**
     * @dev Checks if a UnifiedID exists
     * @param unifiedId The UnifiedID string to check
     * @return True if the UnifiedID exists, false otherwise
     */
    function unifiedIdExists(
        string calldata unifiedId
    ) external view returns (bool) {
        return _unifiedIdExists[unifiedId];
    }

    /**
     * @dev Gets the primary wallet address for a given UnifiedID
     * @param unifiedId The UnifiedID string to query
     * @return The primary wallet address
     */
    function getPrimaryWallet(
        string calldata unifiedId  
    ) external view returns (address) {
        if (!_unifiedIdExists[unifiedId]) {
            revert UnifiedIdDoesNotExist();
        }
        return registry[unifiedId].primaryWallet;
    }

    /**
     * @dev Gets the UnifiedID string for a given wallet address
     * @param wallet The wallet address to query
     * @return The UnifiedID string associated with the wallet, or empty string if wallet has no ID
     */
    function getUnifiedIdByWallet(
        address wallet
    ) external view returns (string memory) {
        return walletToUnifiedId[wallet];
    }

    // ============ Internal Functions ============

    /**
     * @dev Validates the format of a UnifiedID string
     * @param unifiedId The UnifiedID string to validate
     * @notice Checks length and character format (lowercase a-z and 0-9 ONLY)
     */
    function _validateUnifiedIdFormat(string calldata unifiedId) internal pure {
        bytes memory unifiedIdBytes = bytes(unifiedId);

        // Check minimum length
        if (unifiedIdBytes.length < MIN_UNIFIED_ID_LENGTH) {
            revert UnifiedIdTooShort();
        }

        // Check maximum length
        if (unifiedIdBytes.length > MAX_UNIFIED_ID_LENGTH) {
            revert UnifiedIdTooLong();
        }

        // Validate ONLY lowercase a-z and 0-9 (NO special characters)
        for (uint256 i = 0; i < unifiedIdBytes.length; i++) {
            bytes1 char = unifiedIdBytes[i];

            // Check if character is lowercase a-z or 0-9
            bool isLowercase = (char >= 0x61 && char <= 0x7A); // a-z
            bool isDigit = (char >= 0x30 && char <= 0x39);     // 0-9

            if (!isLowercase && !isDigit) {
                revert InvalidUnifiedIdFormat();
            }
        }
    }
}