"use client";

import { config } from "@/contexts/AarcProvider";
import { useState } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import {
  AarcCore,
  BalancesData,
  DepositAddressData,
} from "@aarc-xyz/core-viem";

import { WagmiProvider } from "wagmi";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  linea,
  avalanche,
  bsc,
} from "wagmi/chains";

import { http } from "wagmi";
import { ethers } from "ethers";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePollTransactionStatusV2 } from "@/hooks/usePollTransactionStatus";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export const wagmiConfig = getDefaultConfig({
  appName: "Aarc RainbowKit",
  projectId: "55e9f7ac4cca250593e7ebee9a7925b4",
  chains: [mainnet, polygon, optimism, arbitrum, base, linea, avalanche, bsc],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [linea.id]: http(),
    [avalanche.id]: http(),
    [bsc.id]: http(),
  },
});

export const availableChains = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  linea,
  avalanche,
  bsc,
];

export enum TransferType {
  ONRAMP = "onramp",
  CEX = "cex",
  WALLET = "wallet",
}

export enum ProviderType {
  MOONPAY = "moonpay",
  KADO = "kado",
  MESH_CONNECT = "mesh-connect",
}

export const aarcCoreSDK = new AarcCore(config.apiKeys.aarcSDK);

function ExecuteContract() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [requestId, setRequestId] = useState<string>();
  const [trxHash, setTrxHash] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { chains, switchChain } = useSwitchChain();
  const account = useAccount();

  const {
    error: pollingError,
    hasTimedOut,
    isPolling,
    pollStatus,
    pollingMessage,
  } = usePollTransactionStatusV2({
    requestId,
    txHash: trxHash,
  });

  const requestedAmount = "0.01";
  const destinationWalletAddress = "0x45c0470ef627a30efe30c06b13d883669b8fd3a8";
  const destinationToken = {
    decimals: 6,
    chainId: 8453,
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  };

  const getMultichainBalance = async (
    address: string,
    extendedBalances?: boolean
  ) => {
    try {
      const res = await aarcCoreSDK.fetchMultiChainBalances(address, {
        tokenAddress: destinationToken.address,
        tokenChainId: destinationToken.chainId,
        tokenAmount: requestedAmount?.toString() ?? "1",
      });

      //@ts-ignore
      if (res?.statusCode == 401) {
        throw new Error("Invalid API key");
      }
      const chainId = destinationToken.chainId?.toString();

      if (!chainId) {
        throw new Error("Chain ID is missing");
      }

      if (res.data) {
        let chainBalances = res.data.balances as unknown as BalancesData;
        if (config?.module.bridgeAndSwap?.fetchOnlyDestinationBalance) {
          chainBalances = { [chainId]: chainBalances[chainId] };
        }
        return chainBalances;
      }
      return {};
    } catch (err) {
      console.error("Error fetching balances: ", err);
      throw err;
    }
  };

  const getDepositAddress = async ({
    contractPayload,
    fromToken,
    fromTokenAmount,
  }: {
    contractPayload: string;
    fromToken: {
      decimals: number;
      chainId: number;
      address: string;
    };
    fromTokenAmount: string;
  }): Promise<{
    depositTokenName?: string;
    depositTokenSymbol?: string;
    depositTokenDecimals?: string;
    depositTokenUsdPrice?: number;
    amount: string;
    executionTime: string;
    gasFee: string;
    depositAddress: string;
    onChainID: string;
    depositTokenAddress: string;
    requestId: string;
    status: string;
    txData: {
      chainId: string;
      from: string;
      to: string;
      data: string;
      value: string;
      gasLimit: string;
    };
  }> => {
    try {
      const transferType = TransferType.WALLET;
      const provider = undefined; // in case of onramp or cex

      const contract = {
        contractPayload,
      };

      const baseToAmount = BigInt(
        Math.floor(
          +(requestedAmount ?? 0) * 10 ** (destinationToken.decimals ?? 18)
        )
      ).toString();

      const payload: any = {
        userOpHash: "",
        transferType,
        destinationChainId: destinationToken.chainId?.toString() ?? "",
        destinationTokenAddress: destinationToken.address ?? "",
        toAmount: baseToAmount,
        destinationRecipient: destinationWalletAddress ?? "",
      };

      // Handle parameters based on transferType
      if (transferType === TransferType.WALLET) {
        if (!fromToken)
          throw new Error("fromToken is required for wallet transfer");
        const baseFromAmount = Math.floor(
          +(fromTokenAmount ?? 0) * 10 ** (fromToken.decimals ?? 18)
        );

        const baseFromAmountBN = BigInt(baseFromAmount);

        payload.fromAmount = baseFromAmountBN.toString();
        payload.fromChainId = fromToken.chainId?.toString() ?? "";
        payload.fromTokenAddress = fromToken.address ?? "";
        payload.fromAddress = account.address ?? "";
      } else if (
        transferType === TransferType.ONRAMP ||
        transferType === TransferType.CEX
      ) {
        if (!provider)
          throw new Error("provider is required for onramp and dex transfers");
        payload.provider = provider;
      }

      // If there's a 'checkout', handle it here
      if (contract?.contractPayload) {
        payload.targetCalldata = contract?.contractPayload;
      }

      const res = await aarcCoreSDK.getDepositAddress(payload);

      if (res?.data?.error) {
        throw new Error(res?.data?.message);
      }

      const depositAddressData = { ...res };
      console.debug(res, depositAddressData);
      return depositAddressData;
    } catch (err) {
      console.error("Error fetching deposit address: ", err);
      // if error message contains No Route Found
      // @ts-expect-error - error message is optional
      if (err?.message?.includes("No Route Found")) {
        setError("No Route Available, try increasing the amount");
        throw "No Route Available, try increasing the amount";
      }
      throw err;
    }
  };

  function generateCheckoutCallData(
    token: string,
    toAddress: string,
    amount: string
  ): string {
    const simpleDappInterface = new ethers.Interface([
      "function mint(address token, address to, uint256 amount) external",
    ]);

    return simpleDappInterface.encodeFunctionData("mint", [
      token,
      toAddress,
      amount,
    ]);
  }

  const handleExecuteToAddress = async ({
    depositData,
  }: {
    depositData: DepositAddressData;
  }): Promise<string> => {
    try {
      if (!depositData) {
        throw new Error("Deposit data is missing");
      }

      const signer = walletClient;
      if (!signer) throw new Error("Signer is missing");

      if (chainId !== Number(depositData.txData.chainId))
        await switchChain({
          chainId: Number(depositData.txData.chainId),
        });

      const trxHash = await signer.sendTransaction({
        to: depositData.txData.to,
        value: depositData.txData.value,
        data: depositData.txData.data,
        gasLimit: depositData.txData.gasLimit,
        chainId: depositData.txData.chainId,
        from: depositData.txData.from,
      });

      console.debug("Transaction hash: ", trxHash);

      if (!trxHash) throw new Error("Transaction hash is missing");

      try {
        // update aarc about tx hash
        await aarcCoreSDK.postExecuteToAddress({
          depositData,
          trxHash,
        });
      } catch (err) {
        console.error("Error post execute call: ", err);
      }
      return trxHash;
    } catch (err) {
      console.error("Error executing to address: ", err);
      throw err;
    }
  };

  const handleSubmitContract = async () => {
    setIsLoading(true);
    setTrxHash("");
    setError(null);
    setRequestId("");

    try {
      const payload = generateCheckoutCallData(
        "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        "0xeDa8Dec60B6C2055B61939dDA41E9173Bab372b2",
        "10000"
      );
      if (!account.address) {
        alert("Please connect your wallet first");
        return;
      }
      const balance = await getMultichainBalance(account.address ?? "");
      console.log("balance", balance);

      /**
       * Select a from token with proper balance from the above response, for different wallets the response will be different,
       * we are currently selecting a random token from the response.
       *
       * Example of fromToken:
       * ChainId: 8453
       * fromTokenAddress: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
       * fromAddress: 0xeDa8Dec60B6C2055B61939dDA41E9173Bab372b2
       */
      const fromToken =
        balance[destinationToken?.chainId?.toString() ?? ""]?.balances?.[0];

      if (!fromToken) {
        alert(
          "No balance available for the token, try selecting a different token from the balance response"
        );
        return;
      }

      const depositAddressData = await getDepositAddress({
        contractPayload: payload,
        fromToken: {
          decimals: fromToken?.decimals,
          chainId: destinationToken?.chainId,
          address: fromToken?.token_address,
        },
        fromTokenAmount: fromToken.amount_required ?? "0.01",
      });
      setRequestId(depositAddressData.requestId);
      console.log("depositAddressData", depositAddressData);

      const trxHash = await handleExecuteToAddress({
        depositData: depositAddressData,
      });

      setTrxHash(trxHash);
    } catch (err) {
      console.error("Error executing contract: ", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      Aarc Core SDK Script example:
      <div className="flex flex-row items-center justify-center gap-3">
        <ConnectButton />
        <button
          onClick={handleSubmitContract}
          className="p-2 mt-4 bg-slate-700 text-white rounded-lg"
        >
          {isLoading ? "Executing..." : "Submit Contract"}
        </button>
      </div>
      {pollingMessage && <div>Tx Status : {pollingMessage}</div>}
      {pollingError && <div>error: {pollingError}</div>}
    </div>
  );
}

export default function ContractExecution() {
  return (
    <main className="flex flex-col items-center justify-between p-24">
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <RainbowKitProvider>
            <ExecuteContract />
          </RainbowKitProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </main>
  );
}
