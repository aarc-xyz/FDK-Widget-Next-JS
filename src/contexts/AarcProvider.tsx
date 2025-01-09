"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@aarc-xyz/eth-connector/styles.css";
import {
  AarcFundKitModal,
  FKConfig,
  SourceConnectorName,
  ThemeName,
  TransactionErrorData,
  TransactionSuccessData,
} from "@aarc-xyz/fundkit-web-sdk";
import { createContext, useContext, useRef } from "react";
import { http, WagmiProvider } from "wagmi";
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
import { AarcEthWalletConnector } from "@aarc-xyz/eth-connector";
import { CustomWalletConnectWrapper } from "@/utils/CustomWalletConnector";

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

interface AarcProviderProps {
  children: React.ReactNode;
}

interface AarcContextType {
  aarcModal: AarcFundKitModal | null;
}

const AarcContext = createContext<AarcContextType | undefined>(undefined);

const queryClient = new QueryClient();

export const config: FKConfig = {
  appName: "Dapp Name",
  module: {
    exchange: {
      enabled: true,
    },
    onRamp: {
      enabled: true,
      onRampConfig: {
        customerId: "323232323",
        exchangeScreenTitle: "Deposit funds in your wallet",
      },
    },
    bridgeAndSwap: {
      enabled: true,
      fetchOnlyDestinationBalance: false,
      routeType: "Value",
      connectors: [SourceConnectorName.ETHEREUM],
    },
  },
  destination: {
    walletAddress: "0xeDa8Dec60B6C2055B61939dDA41E9173Bab372b2",
  },
  appearance: {
    themeColor: "#A5E547",
    textColor: "#2D2D2D",
    backgroundColor: "#FAFAFA",
    dark: {
      themeColor: "#A5E547",
      textColor: "#FFF",
      backgroundColor: "#2D2D2D",
      highlightColor: "#08091B",
      borderColor: "#424242",
    },
    theme: ThemeName.DARK,
    roundness: 8,
  },
  apiKeys: {
    aarcSDK: process.env.NEXT_PUBLIC_API_KEY ?? "",
  },
  events: {
    onTransactionSuccess: (data: TransactionSuccessData) => {
      console.log("client onTransactionSuccess", data);
    },
    onTransactionError: (data: TransactionErrorData) => {
      console.log("client onTransactionError", data);
    },
    onWidgetClose: () => {
      console.log("client onWidgetClose");
    },
    onWidgetOpen: () => {
      console.log("client onWidgetOpen");
    },
  },
  origin: typeof window !== "undefined" ? window.location.origin : "",
};

const AarcProvider = ({ children }: AarcProviderProps) => {
  const aarcModalRef = useRef<AarcFundKitModal | null>(
    new AarcFundKitModal(config)
  );

  const aarcModal = aarcModalRef.current;

  if (!aarcModal) {
    return null; // Or a fallback UI while initializing
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <CustomWalletConnectWrapper client={aarcModal} />
          <AarcContext.Provider value={{ aarcModal }}>
            {children}
          </AarcContext.Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export const useAarcContext = () => {
  const context = useContext(AarcContext);
  if (!context) {
    throw new Error("useAarcContext must be used within AarcProvider");
  }
  return context;
};

export default AarcProvider;
