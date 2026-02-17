// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DataCache {

    // ── Structure d'une entree en cache ───────────────────────
    struct CacheEntry {
        string data;          // Le resultat (ex: "2847.32")
        string query;         // La query originale (ex: "ETH price")
        address seeder;       // Qui a paye le fetch en premier
        uint256 timestamp;    // Quand la donnee a ete ecrite
        uint256 hits;         // Combien de fois lue depuis
        bool exists;          // Existe dans le cache
    }

    // ── Storage ───────────────────────────────────────────────
    mapping(bytes32 => CacheEntry) public entries;

    // Compteurs globaux pour le dashboard
    uint256 public totalSeeds;
    uint256 public totalHits;
    uint256 public totalQueries;

    // TTL par defaut : 60 secondes
    uint256 public defaultTTL = 60;

    // Owner (le backend)
    address public owner;

    // ── Events ────────────────────────────────────────────────
    event DataSeeded(
        bytes32 indexed queryHash,
        string query,
        address indexed seeder,
        string data,
        uint256 timestamp
    );

    event CacheHit(
        bytes32 indexed queryHash,
        address indexed reader,
        uint256 totalHits
    );

    // ── Modifiers ─────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor(address _owner) {
        owner = _owner;
    }

    // ── Fonctions principales ─────────────────────────────────

    /// @notice Verifie si une query est en cache ET pas expiree
    function checkCache(bytes32 queryHash)
        external
        view
        returns (bool isCached, string memory data)
    {
        CacheEntry storage entry = entries[queryHash];

        if (!entry.exists) {
            return (false, "");
        }

        if (block.timestamp - entry.timestamp > defaultTTL) {
            return (false, "");
        }

        return (true, entry.data);
    }

    /// @notice Stocke un nouveau resultat (appele quand cache miss)
    function storeResult(
        bytes32 queryHash,
        string calldata query,
        string calldata data,
        address seeder
    ) external onlyOwner {
        CacheEntry storage entry = entries[queryHash];

        entry.data = data;
        entry.query = query;
        entry.seeder = seeder;
        entry.timestamp = block.timestamp;
        entry.hits = 0;
        entry.exists = true;

        totalSeeds++;
        totalQueries++;

        emit DataSeeded(queryHash, query, seeder, data, block.timestamp);
    }

    /// @notice Lecture cache — view only, pas de tx, pas de gas pour le reader
    /// Les hits sont trackes off-chain par le backend pour eviter un write on-chain inutile
    function getResult(bytes32 queryHash)
        external
        view
        returns (string memory data, address seeder, uint256 timestamp, uint256 hits)
    {
        CacheEntry storage entry = entries[queryHash];
        require(entry.exists, "Entry does not exist");
        return (entry.data, entry.seeder, entry.timestamp, entry.hits);
    }

    /// @notice Increment hits — appele par le backend quand il veut (batch, async, etc.)
    function recordHits(bytes32 queryHash, uint256 count) external onlyOwner {
        entries[queryHash].hits += count;
        totalHits += count;
        totalQueries += count;

        emit CacheHit(queryHash, address(0), entries[queryHash].hits);
    }

    // ── Fonctions de lecture ──────────────────────────────────

    /// @notice Recupere les details complets d'une entree
    function getEntry(bytes32 queryHash)
        external
        view
        returns (
            string memory data,
            string memory query,
            address seeder,
            uint256 timestamp,
            uint256 hits,
            bool isExpired
        )
    {
        CacheEntry storage entry = entries[queryHash];
        require(entry.exists, "Entry does not exist");

        bool expired = block.timestamp - entry.timestamp > defaultTTL;
        return (entry.data, entry.query, entry.seeder, entry.timestamp, entry.hits, expired);
    }

    /// @notice Stats globales pour le dashboard
    function getStats()
        external
        view
        returns (uint256 seeds, uint256 hits, uint256 queries)
    {
        return (totalSeeds, totalHits, totalQueries);
    }

    // ── Admin ─────────────────────────────────────────────────

    function setTTL(uint256 newTTL) external onlyOwner {
        defaultTTL = newTTL;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}