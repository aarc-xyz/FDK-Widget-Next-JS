"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { polygon } from "wagmi/chains";
import { AarcEthWalletConnector } from "@aarc-xyz/eth-connector";
import {
  AarcSwitchWidgetProvider,
  FKConfig,
  ThemeName,
  TransactionErrorData,
  TransactionSuccessData,
} from "@aarc-xyz/fund-kit-widget";
import "@aarc-xyz/eth-connector/styles.css";

interface AarcProviderProps {
  children: React.ReactNode;
}

const AarcProvider = ({ children }: AarcProviderProps) => {
  const config: FKConfig = {
    appName: "Aarc Stage",
    module: {
      exchange: {
        enabled: false,
      },
      onRamp: {
        enabled: true,
        onRampConfig: {
          customerId: "123", // replace with any unique id for the user
        },
      },
      bridgeAndSwap: {
        enabled: true,
        fetchOnlyDestinationBalance: false,
        routeType: "Value",
      },
    },
    destination: {
      walletAddress: "0xeDa8Dec60B6C2055B61939dDA41E9173Bab372b2",
    },
    appearance: {
      roundness: 42,
      theme: ThemeName.DARK,
    },

    apiKeys: {
      aarcSDK: process.env.NEXT_PUBLIC_API_KEY!,
    },
    events: {
      onTransactionSuccess: (data: TransactionSuccessData) => {
        console.log("onTransactionSuccess", data);
      },
      onTransactionError: (data: TransactionErrorData) => {
        console.log("onTransactionError", data);
      },
      onWidgetClose: () => {
        console.log("onWidgetClose");
      },
      onWidgetOpen: () => {
        console.log("onWidgetOpen");
      },
    },
  };

  const wagmiConfig = createConfig({
    chains: [polygon],
    transports: {
      [polygon.id]: http(),
    },
    ssr: true,
  });

  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* @ts-ignore */}
        <AarcSwitchWidgetProvider config={config}>
          <AarcEthWalletConnector>{children}</AarcEthWalletConnector>
        </AarcSwitchWidgetProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default AarcProvider;
