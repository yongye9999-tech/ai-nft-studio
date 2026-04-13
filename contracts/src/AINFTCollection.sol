// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AINFTCollection
 * @notice ERC721 NFT collection contract with royalty support (ERC2981) for AI-generated artwork.
 * @dev Combines ERC721URIStorage for per-token metadata, ERC2981 for royalties, Ownable for admin
 *      control, ReentrancyGuard to protect mint() against reentrancy attacks, and Pausable to
 *      allow the owner to halt minting in an emergency.
 *      Users pay a mintFee to mint; mint-fee proceeds can be withdrawn by the owner via withdraw().
 *      Milestone rewards are funded separately: the owner deposits ETH via receive() and the
 *      contract tracks mintFeeCollected so that withdraw() never drains milestone reserves.
 *      Excess mint payments are stored as pending refunds (pull pattern) to prevent a malicious
 *      recipient contract from blocking the mint by rejecting ETH.
 *      Early creators can be added to a free-mint whitelist or granted a percentage discount.
 */
contract AINFTCollection is ERC721, ERC721URIStorage, ERC2981, Ownable, Pausable, ReentrancyGuard {
    /// @notice Counter tracking the total number of minted tokens (also serves as next token ID).
    uint256 public tokenCounter;

    /// @notice Fee in wei required to mint one NFT. Defaults to 0.01 ETH.
    uint256 public mintFee;

    /// @notice Maximum number of tokens that can ever be minted in this collection.
    uint256 public maxSupply;

    /// @notice Accumulated mint fees available for owner withdrawal (excludes pending refunds).
    uint256 public mintFeeCollected;

    /// @notice Pending excess-payment refunds stored per payer (pull pattern).
    mapping(address => uint256) public pendingRefunds;

    /// @notice Addresses that may mint for free (early-creator whitelist).
    mapping(address => bool) public freeMintList;

    /// @notice Per-address mint fee discount in basis points (10 000 = 100% off, i.e. free).
    ///         Only applied when the address is NOT in freeMintList.
    mapping(address => uint256) public mintFeeDiscount;

    // ─── Creator Milestone Incentives ─────────────────────────────────────────

    /// @notice Number of NFTs minted by each creator (msg.sender).
    mapping(address => uint256) public creatorMintCount;

    /// @notice Milestone thresholds (cumulative mints per creator).
    uint256 public constant MILESTONE_THRESHOLD_1 = 10;
    uint256 public constant MILESTONE_THRESHOLD_2 = 50;
    uint256 public constant MILESTONE_THRESHOLD_3 = 100;

    /// @notice ETH reward amounts for each milestone (owner-configurable).
    uint256 public milestoneReward1 = 0.005 ether;
    uint256 public milestoneReward2 = 0.02 ether;
    uint256 public milestoneReward3 = 0.05 ether;

    /// @notice Bitmask of milestones already claimed per creator (bit 0 = M1, bit 1 = M2, bit 2 = M3).
    mapping(address => uint8) public milestonesClaimed;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a new NFT is minted.
    /// @param to       The address that receives the newly minted token.
    /// @param tokenId  The ID of the newly minted token.
    /// @param tokenURI The metadata URI of the newly minted token.
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    /// @notice Emitted when the mint fee is updated.
    /// @param newFee The updated fee value in wei.
    event MintFeeUpdated(uint256 newFee);

    /// @notice Emitted when the free-mint whitelist is updated for one or more addresses.
    /// @param creator Address whose free-mint status changed.
    /// @param status  True if added to whitelist, false if removed.
    event FreeMintListUpdated(address indexed creator, bool status);

    /// @notice Emitted when a per-address mint fee discount is set.
    /// @param creator     Address whose discount was updated.
    /// @param discountBps New discount in basis points (0–10 000).
    event MintFeeDiscountUpdated(address indexed creator, uint256 discountBps);

    /// @notice Emitted when ETH is withdrawn from the contract.
    /// @param to     Recipient address.
    /// @param amount Amount withdrawn in wei.
    event Withdrawn(address indexed to, uint256 amount);

    /// @notice Emitted when a creator claims a milestone reward.
    /// @param creator Address of the creator.
    /// @param amount  Total ETH reward paid out.
    event MilestoneRewardClaimed(address indexed creator, uint256 amount);

    /// @notice Emitted when milestone reward amounts are updated.
    event MilestoneRewardsUpdated(uint256 reward1, uint256 reward2, uint256 reward3);

    /// @notice Emitted when an excess mint payment is stored as a pending refund.
    /// @param payer  Address that overpaid and can now call withdrawRefund().
    /// @param amount Excess amount stored in wei.
    event RefundPending(address indexed payer, uint256 amount);

    /// @notice Emitted when a pending refund is successfully withdrawn.
    /// @param payer  Address that received the refund.
    /// @param amount Amount refunded in wei.
    event RefundWithdrawn(address indexed payer, uint256 amount);

    /// @notice Emitted when ETH is deposited directly to fund milestone rewards.
    /// @param sender Address that sent the ETH.
    /// @param amount Amount deposited in wei.
    event FundsReceived(address indexed sender, uint256 amount);

    // ─── Constructor ─────────────────────────────────────────────────────────

    /**
     * @notice Deploys the AINFTCollection contract.
     * @dev Sets default royalty to 5% paid to the deployer.
     * @param name_      ERC721 collection name.
     * @param symbol_    ERC721 collection symbol.
     * @param _mintFee   Initial mint fee in wei (0 to disable fee).
     * @param _maxSupply Maximum number of tokens that can be minted.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _mintFee,
        uint256 _maxSupply
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        mintFee = _mintFee;
        maxSupply = _maxSupply;
        // Default royalty: 5% to the deployer
        _setDefaultRoyalty(msg.sender, 500);
    }

    // ─── Receive ETH (for milestone reward funding) ───────────────────────────

    /**
     * @notice Accepts direct ETH deposits from the owner to fund milestone rewards.
     * @dev These funds are NOT tracked in mintFeeCollected, so withdraw() will not drain them.
     *      The owner should deposit enough ETH to cover expected milestone payouts.
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    // ─── Public / External Functions ─────────────────────────────────────────

    /**
     * @notice Mints a new NFT to the specified address.
     * @dev Caller must send at least the effective mint fee (after any discount or whitelist).
     *      Any excess ETH is stored as a pending refund (pull pattern) to prevent a contract
     *      recipient from blocking the mint by rejecting an ETH push.
     *      Call withdrawRefund() after minting to collect any excess payment.
     *      Token ID is auto-incremented starting from 1.
     *      Reverts when the contract is paused.
     * @param to       Address that will own the minted token (must not be the zero address).
     * @param uri      Metadata URI (typically an IPFS link to a JSON file; must not be empty).
     * @return tokenId The ID of the newly minted token.
     */
    function mint(
        address to,
        string memory uri
    ) external payable nonReentrant whenNotPaused returns (uint256 tokenId) {
        require(to != address(0), "AINFTCollection: cannot mint to zero address");
        require(bytes(uri).length > 0, "AINFTCollection: URI cannot be empty");

        // Compute the effective fee for this caller
        uint256 effectiveFee;
        if (freeMintList[msg.sender]) {
            effectiveFee = 0;
        } else {
            uint256 discountBps = mintFeeDiscount[msg.sender];
            effectiveFee = mintFee - (mintFee * discountBps) / 10_000;
        }

        require(msg.value >= effectiveFee, "AINFTCollection: insufficient mint fee");
        require(tokenCounter < maxSupply, "AINFTCollection: max supply reached");

        // Effects: update all state before any external calls (CEI pattern).
        // nonReentrant guards against reentrancy via onERC721Received on the recipient.
        tokenCounter++;
        tokenId = tokenCounter;
        creatorMintCount[msg.sender]++;
        mintFeeCollected += effectiveFee;

        // Store excess as a pending refund (pull pattern — avoids push-to-recipient DoS).
        uint256 excess = msg.value - effectiveFee;
        if (excess > 0) {
            pendingRefunds[msg.sender] += excess;
            emit RefundPending(msg.sender, excess);
        }

        _setTokenURI(tokenId, uri);
        emit NFTMinted(to, tokenId, uri);

        // Interaction: transfer token (may call onERC721Received on recipient).
        _safeMint(to, tokenId);
    }

    /**
     * @notice Withdraws any pending refund stored for the caller.
     * @dev Uses pull pattern to avoid DoS from push-refund rejection.
     *      Resets the pending refund before transfer (CEI).
     */
    function withdrawRefund() external nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        require(amount > 0, "AINFTCollection: no pending refund");
        pendingRefunds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "AINFTCollection: refund transfer failed");
        emit RefundWithdrawn(msg.sender, amount);
    }

    // ─── Owner-Only Functions ─────────────────────────────────────────────────

    /**
     * @notice Updates the per-mint fee.
     * @param fee New fee in wei. Set to 0 to allow free minting for everyone.
     */
    function setMintFee(uint256 fee) external onlyOwner {
        mintFee = fee;
        emit MintFeeUpdated(fee);
    }

    /**
     * @notice Adds or removes addresses from the free-mint whitelist.
     * @dev Intended for early-creator incentive programmes.
     * @param creators Array of addresses to update.
     * @param status   True to whitelist (free mint), false to remove.
     */
    function setFreeMintList(address[] calldata creators, bool status) external onlyOwner {
        for (uint256 i = 0; i < creators.length; i++) {
            freeMintList[creators[i]] = status;
            emit FreeMintListUpdated(creators[i], status);
        }
    }

    /**
     * @notice Sets a per-address mint fee discount.
     * @dev discountBps is in basis points. 10 000 = 100% discount (effectively free).
     *      Only applied when the address is NOT already in freeMintList.
     *      Note: setting a discount on a freeMintList address has no effect while the address
     *      remains whitelisted; the discount will apply if later removed from the whitelist.
     * @param creator     Address to receive the discount.
     * @param discountBps Discount in basis points (0–10 000).
     */
    function setMintFeeDiscount(address creator, uint256 discountBps) external onlyOwner {
        require(discountBps <= 10_000, "AINFTCollection: discount cannot exceed 100%");
        mintFeeDiscount[creator] = discountBps;
        emit MintFeeDiscountUpdated(creator, discountBps);
    }

    /**
     * @notice Sets the same mint fee discount for multiple addresses in one call.
     * @dev Useful for bulk-rewarding active creators each month.
     * @param creators    Array of addresses to receive the discount.
     * @param discountBps Discount in basis points (0–10 000).
     */
    function setBatchMintFeeDiscount(address[] calldata creators, uint256 discountBps) external onlyOwner {
        require(discountBps <= 10_000, "AINFTCollection: discount cannot exceed 100%");
        for (uint256 i = 0; i < creators.length; i++) {
            mintFeeDiscount[creators[i]] = discountBps;
            emit MintFeeDiscountUpdated(creators[i], discountBps);
        }
    }

    /**
     * @notice Updates the ETH reward amounts for the three creator milestones.
     * @param r1 Reward for reaching MILESTONE_THRESHOLD_1 (10 mints).
     * @param r2 Reward for reaching MILESTONE_THRESHOLD_2 (50 mints).
     * @param r3 Reward for reaching MILESTONE_THRESHOLD_3 (100 mints).
     */
    function setMilestoneRewards(uint256 r1, uint256 r2, uint256 r3) external onlyOwner {
        milestoneReward1 = r1;
        milestoneReward2 = r2;
        milestoneReward3 = r3;
        emit MilestoneRewardsUpdated(r1, r2, r3);
    }

    /**
     * @notice Sets (or overrides) the default ERC2981 royalty for the entire collection.
     * @dev feeNumerator is in basis points (e.g., 500 = 5%). Max is 10% (1000) enforced here.
     * @param receiver     Address that receives royalty payments (must not be the zero address).
     * @param feeNumerator Royalty rate in basis points (1 basis point = 0.01%).
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        require(receiver != address(0), "AINFTCollection: royalty receiver is zero address");
        require(feeNumerator <= 1000, "AINFTCollection: royalty cannot exceed 10%");
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Pauses all minting operations.
     * @dev Callable only by the owner. Use in emergency situations.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses minting operations.
     * @dev Callable only by the owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Withdraws accumulated mint fees to the owner's address.
     * @dev Only withdraws mintFeeCollected so that ETH deposited directly for milestone
     *      rewards (via receive()) is never accidentally drained.
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = mintFeeCollected;
        require(amount > 0, "AINFTCollection: nothing to withdraw");
        mintFeeCollected = 0;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "AINFTCollection: withdraw failed");
        emit Withdrawn(owner(), amount);
    }

    // ─── Creator Incentives ───────────────────────────────────────────────────

    /**
     * @notice Claims all available milestone rewards for the caller.
     * @dev Checks how many NFTs msg.sender has minted and pays out unclaimed milestone ETH.
     *      Milestones: 10 mints → milestoneReward1, 50 mints → milestoneReward2,
     *                  100 mints → milestoneReward3.
     *      Reward funds come from the full contract balance (mint fees + direct deposits).
     *      The owner should ensure the contract holds sufficient balance before creators claim
     *      by depositing ETH directly (triggering receive()) as needed.
     */
    function claimMilestoneReward() external nonReentrant {
        uint256 count = creatorMintCount[msg.sender];
        uint8 claimed = milestonesClaimed[msg.sender];
        uint256 rewardAmount = 0;

        if (count >= MILESTONE_THRESHOLD_1 && (claimed & 1) == 0) {
            rewardAmount += milestoneReward1;
            claimed |= 1;
        }
        if (count >= MILESTONE_THRESHOLD_2 && (claimed & 2) == 0) {
            rewardAmount += milestoneReward2;
            claimed |= 2;
        }
        if (count >= MILESTONE_THRESHOLD_3 && (claimed & 4) == 0) {
            rewardAmount += milestoneReward3;
            claimed |= 4;
        }

        require(rewardAmount > 0, "AINFTCollection: no rewards to claim");
        require(address(this).balance >= rewardAmount, "AINFTCollection: insufficient contract balance");

        // Effects before interaction (CEI)
        milestonesClaimed[msg.sender] = claimed;

        (bool success, ) = payable(msg.sender).call{value: rewardAmount}("");
        require(success, "AINFTCollection: reward transfer failed");

        emit MilestoneRewardClaimed(msg.sender, rewardAmount);
    }

    // ─── Overrides ────────────────────────────────────────────────────────────

    /**
     * @dev Resolves multiple inheritance: ERC721URIStorage overrides tokenURI.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Clears the stored token URI when a token is burned (to == address(0)),
     *      preventing stale storage. In OZ v5.6.x ERC721URIStorage does not override
     *      _update, so this contract handles URI cleanup directly.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        if (to == address(0)) {
            // Clear token URI storage on burn to avoid stale data
            _setTokenURI(tokenId, "");
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Declares support for ERC721, ERC721URIStorage, and ERC2981 interfaces.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
