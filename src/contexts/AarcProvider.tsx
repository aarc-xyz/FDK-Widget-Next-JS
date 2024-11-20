"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AarcEthWalletConnector } from "@aarc-xyz/eth-connector";
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

interface AarcProviderProps {
  children: React.ReactNode;
}

interface AarcContextType {
  aarcModal: AarcFundKitModal | null;
}

const AarcContext = createContext<AarcContextType | undefined>(undefined);

const queryClient = new QueryClient();

const config: FKConfig = {
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
  const aarcModalRef = useRef(new AarcFundKitModal(config));
  const aarcModal = aarcModalRef.current;

  return (
    <QueryClientProvider client={queryClient}>
      <AarcEthWalletConnector aarcWebClient={aarcModal}>
        <AarcContext.Provider value={{ aarcModal }}>
          {children}
        </AarcContext.Provider>
      </AarcEthWalletConnector>
    </QueryClientProvider>
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
