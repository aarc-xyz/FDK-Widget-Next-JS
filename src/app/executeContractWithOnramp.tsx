"use client";

import { config } from "@/contexts/AarcProvider";
import { useCallback, useState } from "react";
import {
  AarcCore
} from "@aarc-xyz/core-viem";

import { ethers } from "ethers";
import { usePollTransactionStatusV2 } from "@/hooks/usePollTransactionStatus";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

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

function ExecuteContractWithOnRamp() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [requestId, setRequestId] = useState<string>();
  const [orderId, setOrderId] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  const {
    error: pollingError,
    hasTimedOut,
    isPolling,
    pollStatus,
    pollingMessage,
  } = usePollTransactionStatusV2({
    requestId,
    enable: !!orderId,
    aarcCoreSDK
  });

  const requestedAmount = "0.01";
  const destinationWalletAddress = "0x45c0470ef627a30efe30c06b13d883669b8fd3a8";
  const destinationToken = {
    decimals: 6,
    chainId: 8453,
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
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
      const transferType = TransferType.ONRAMP;
      const provider = ProviderType.MOONPAY; // in case of onramp or cex

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
      // @ts-ignore
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

  const handleSubmitContract = async () => {
    setIsLoading(true);
    setOrderId("");
    setError(null);
    setRequestId("");

    try {
      // Generate the contract call data
      const payload = generateCheckoutCallData(
        "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        "0xeDa8Dec60B6C2055B61939dDA41E9173Bab372b2",
        "35000000"
      );

      /*
       * Example of fromToken:
       * ChainId: 8453
       * fromTokenAddress: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
       * fromAddress: 0xeDa8Dec60B6C2055B61939dDA41E9173Bab372b2
       */
      const fromToken = {
        chainId: 8453,
        token_address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        amount_required: "35",
        decimals: 6,
      };

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

      // Using moonpay for onramp (you can also use kado)
      const url = await aarcCoreSDK.generateMoonpayOnrampUrl({
        walletAddress: depositAddressData.depositAddress,
        defaultCryptoCurrencyCode: depositAddressData.depositTokenSymbol,
        fiatAmount: fromToken.amount_required,
        fiatCurrencyCode: "USD",
        network: "BASE",
        cryptoTokenData: {
          tokenAmount: fromToken.amount_required,
          tokenCode: depositAddressData.depositTokenSymbol ?? "ETH",
        },
      });
      console.log("url", url);
      if (!url || url instanceof Error)
        throw new Error("Error generating onramp url");
      const windowRef = window.open(url, "_blank");
      if (!windowRef) throw new Error("Error opening onramp window");

      listenToOnrampEvents(windowRef);
    } catch (err) {
      console.error("Error executing contract: ", err);
      //@ts-ignore
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const listenToOnrampEvents = useCallback(async (windowRef: Window) => {
    const listener = (e: MessageEvent<any>) => {
      if (e.data === "closed_by_user") {
        // Remove the listener
        console.debug("User closed the window");
        window.removeEventListener("message", listener);
        setError("User closed the window");
        return;
      } else if (e.data.eventName == "ONRAMP_ORDER_SUCCESSFUL") {
        console.debug("ONRAMP_ORDER_SUCCESSFUL", e.data);
        setOrderId(e.data?.orderId);

        window.removeEventListener("message", listener);
        // Close the window
        if (windowRef) {
          windowRef.close();
        }
        setIsLoading(false);
        return;
      } else if (e.data.eventName === "ONRAMP_ORDER_CREATED") {
        console.debug("ONRAMP_ORDER_CREATED", e.data);
        setOrderId(e.data?.orderId);
        setIsLoading(false);
        return;
      } else if (e.data.eventName === "ONRAMP_ORDER_FAILED") {
        console.debug("ONRAMP_ORDER_FAILED", e.data);
        setOrderId(e.data?.orderId);
        setError("Order failed");
        window.removeEventListener("message", listener);
        return;
      }
      return;
    };

    // Add the listener and store it in the ref
    window.addEventListener("message", listener);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => window.removeEventListener("message", listener);
  }, []);

  return (
    <div className="mt-4">
      Aarc Core SDK Contract execution with OnRamp example:
      <div className="flex flex-row items-center justify-center gap-3">
        <button
          onClick={handleSubmitContract}
          className="p-2 mt-4 bg-slate-700 text-white rounded-lg"
        >
          {isLoading ? "Executing..." : "Submit Contract (Moonpay)"}
        </button>
      </div>
      {error && <div>Error: {error}</div>}
      {pollingMessage && <div>Tx Status : {pollingMessage}</div>}
      {pollingError && <div>error: {pollingError}</div>}
    </div>
  );
}

export default function ContractExecutionWithOnRamp() {
  return (
    <main className="flex flex-col items-center justify-between p-24">
      <QueryClientProvider client={queryClient}>
        <ExecuteContractWithOnRamp />
      </QueryClientProvider>
    </main>
  );
}
