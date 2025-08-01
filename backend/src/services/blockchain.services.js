import axios from "axios";

const verifyEthereumTransaction = async (
  txHash,
  expectedAmount,
  network = "ethereum"
) => {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY || "demo"; 
    let baseURL;

    if (network === "ethereum") {
      baseURL = "https://api.etherscan.io/api";
    } else if (network === "polygon") {
      baseURL = "https://api.polygonscan.com/api";
    }

    const response = await axios.get(baseURL, {
      params: {
        module: "proxy",
        action: "eth_getTransactionByHash",
        txhash: txHash,
        apikey: apiKey,
      },
    });

    if (response.data.result) {
      const tx = response.data.result;

      const value = parseInt(tx.value, 16) / Math.pow(10, 18);
      const adminWallet = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();

      return {
        isValid:
          tx.to?.toLowerCase() === adminWallet &&
          value >= parseFloat(expectedAmount) &&
          tx.blockNumber !== null, 
        value,
        to: tx.to,
        blockNumber: tx.blockNumber,
        status: tx.blockNumber ? "confirmed" : "pending",
      };
    }

    return { isValid: false, error: "Transaction not found" };
  } catch (error) {
    console.error("Ethereum verification error:", error);
    return { isValid: false, error: error.message };
  }
};

const verifySolanaTransaction = async (txHash, expectedAmount) => {
  try {
    const rpcURL =
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

    const response = await axios.post(rpcURL, {
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [
        txHash,
        {
          encoding: "json",
          maxSupportedTransactionVersion: 0,
        },
      ],
    });

    if (response.data.result) {
      const tx = response.data.result;
      const adminWallet = process.env.ADMIN_WALLET_ADDRESS;

      if (tx.meta.err !== null) {
        return { isValid: false, error: "Transaction failed" };
      }

      const postBalances = tx.meta.postBalances;
      const preBalances = tx.meta.preBalances;
      const accounts = tx.transaction.message.accountKeys;

      const adminIndex = accounts.findIndex((acc) => acc === adminWallet);

      if (adminIndex !== -1) {
        const transferAmount =
          (postBalances[adminIndex] - preBalances[adminIndex]) / 1e9;

        return {
          isValid: transferAmount >= parseFloat(expectedAmount),
          value: transferAmount,
          slot: tx.slot,
          status: tx.slot ? "confirmed" : "pending",
        };
      }
    }

    return { isValid: false, error: "Transaction not found" };
  } catch (error) {
    console.error("Solana verification error:", error);
    return { isValid: false, error: error.message };
  }
};

const verifyBlockchainTransaction = async (txHash, amount, blockchain) => {
  try {
    let result;

    switch (blockchain.toLowerCase()) {
      case "ethereum":
        result = await verifyEthereumTransaction(txHash, amount, "ethereum");
        break;
      case "polygon":
        result = await verifyEthereumTransaction(txHash, amount, "polygon");
        break;
      case "solana":
        result = await verifySolanaTransaction(txHash, amount);
        break;
      default:
        return { isValid: false, error: "Unsupported blockchain" };
    }

    return result;
  } catch (error) {
    console.error("Blockchain verification error:", error);
    return { isValid: false, error: error.message };
  }
};

const getTransactionStatus = async (txHash, blockchain) => {
  try {
    const result = await verifyBlockchainTransaction(txHash, 0, blockchain);

    return {
      txHash,
      blockchain,
      status: result.status || "unknown",
      confirmed: result.isValid || false,
      value: result.value || 0,
      error: result.error || null,
    };
  } catch (error) {
    return {
      txHash,
      blockchain,
      status: "error",
      confirmed: false,
      error: error.message,
    };
  }
};

const getGasPrices = async () => {
  try {
    const [ethGas, polygonGas, solanaFees] = await Promise.allSettled([
      getEthereumGasPrice(),
      getPolygonGasPrice(),
      getSolanaFees(),
    ]);

    return {
      ethereum: ethGas.status === "fulfilled" ? ethGas.value : null,
      polygon: polygonGas.status === "fulfilled" ? polygonGas.value : null,
      solana: solanaFees.status === "fulfilled" ? solanaFees.value : null,
    };
  } catch (error) {
    console.error("Gas price fetch error:", error);
    return null;
  }
};

const getEthereumGasPrice = async () => {
  try {
    const response = await axios.get("https://api.etherscan.io/api", {
      params: {
        module: "gastracker",
        action: "gasoracle",
        apikey: process.env.ETHERSCAN_API_KEY || "demo",
      },
    });

    return response.data.result;
  } catch (error) {
    return { SafeGasPrice: "20", ProposeGasPrice: "25", FastGasPrice: "30" };
  }
};

const getPolygonGasPrice = async () => {
  try {
    const response = await axios.get("https://api.polygonscan.com/api", {
      params: {
        module: "gastracker",
        action: "gasoracle",
        apikey: process.env.POLYGONSCAN_API_KEY || "demo",
      },
    });

    return response.data.result;
  } catch (error) {
    return { SafeGasPrice: "30", ProposeGasPrice: "35", FastGasPrice: "40" };
  }
};

const getSolanaFees = async () => {
  try {
    const rpcURL =
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

    const response = await axios.post(rpcURL, {
      jsonrpc: "2.0",
      id: 1,
      method: "getRecentPerformanceSamples",
      params: [1],
    });

    return {
      averageFee: "0.000005", 
      priorityFee: "0.00001", 
    };
  } catch (error) {
    return {
      averageFee: "0.000005",
      priorityFee: "0.00001",
    };
  }
};

export {
  verifyBlockchainTransaction,
  getTransactionStatus,
  getGasPrices,
  verifyEthereumTransaction,
  verifySolanaTransaction,
};
