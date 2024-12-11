# Fund Kit Widget Sample App

This sample app demonstrates how to integrate and use the Fund Kit Widget in a Next.js project.

## Features

- Easy integration with Next.js
- Customizable widget configuration
- Seamless wallet connection using WagmiProvider
- State management with React Query

## Prerequisites

- Node.js (v14 or later)
- npm, yarn, pnpm, or bun

## Getting Started

1. Clone this repository:

   ```bash
   git clone https://github.com/your-username/fund-kit-widget-sample-app.git
   cd fund-kit-widget-sample-app
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Aarc packages
1. ```"@aarc-xyz/fundkit-web-sdk": "latest"```
2. ```"@aarc-xyz/eth-connector": "latest"```

## Usage

To integrate the Fund Kit Widget into your Next.js project, follow these steps:

1. Create a `config` object for the widget. You can learn more about the configuration options in the [AARC documentation](https://docs.aarc.xyz/developer-docs/fund-kit/fund-kit-widget/config).

2. Create a `queryClient` for the `QueryClientProvider`.

3. Wrap your root component with the necessary providers:

```tsx
import "@aarc-xyz/eth-connector/styles.css";
import {
  AarcFundKitModal,
  SourceConnectorName
} from "@aarc-xyz/fundkit-web-sdk";
import { createContext, useContext, useRef } from "react";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { http, WagmiProvider } from "wagmi";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { AarcEthWalletConnector } from "@aarc-xyz/eth-connector";
import wagmiCOnfig from "your-wagmi-config";
import { aarcConfig } from "your-aarc-config"

const AarcContext = createContext<AarcContextType | undefined>(undefined);

const queryClient = new QueryClient();

const AarcProvider = ({ children }: AarcProviderProps) => {
  const aarcModalRef = useRef<AarcFundKitModal | null>(
    new AarcFundKitModal(aarcConfig)
  );

  const aarcModal = aarcModalRef.current;

  if (!aarcModal) {
    return null; // Or a fallback UI while initializing
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AarcEthWalletConnector aarcWebClient={aarcModal}>
            <AarcContext.Provider value={{ aarcModal }}>
              {children}
            </AarcContext.Provider>
          </AarcEthWalletConnector>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
```

4. To open the widget, use the `aarcModal` class:

```tsx
import { useAarcContext } from "@/contexts/AarcProvider";

export default function Home() {
  const { aarcModal } = useAarcContext();

  return (
        <button
          onClick={() => {
            aarcModal?.openModal();
          }}
        >
          Open Aarc Widget
        </button>
  );
}
```
