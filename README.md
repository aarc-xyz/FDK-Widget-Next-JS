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

## Usage

To integrate the Fund Kit Widget into your Next.js project, follow these steps:

1. Create a `config` object for the widget. You can learn more about the configuration options in the [AARC documentation](https://docs.aarc.xyz/developer-docs/fund-kit/fund-kit-widget/config).

2. Set up `wagmiConfig` for the `WagmiProvider` and create a `queryClient` for the `QueryClientProvider`.

3. Wrap your root component with the necessary providers:

   ```tsx
   import { WagmiProvider } from 'wagmi'
   import { QueryClientProvider } from 'react-query'
   import { AarcSwitchWidgetProvider, AarcEthWalletConnector } from '@aarc-xyz/fund-kit-widget';

   function App({ children }) {
     return (
       <WagmiProvider config={wagmiConfig}>
         <QueryClientProvider client={queryClient}>
           {/* @ts-ignore */}
           <AarcSwitchWidgetProvider config={config}>
             <AarcEthWalletConnector>{children}</AarcEthWalletConnector>
           </AarcSwitchWidgetProvider>
         </QueryClientProvider>
       </WagmiProvider>
     )
   }
   ```

4. To open the widget, use the `useModal` hook:

   ```tsx
   import { useModal } from '@aarc-xyz/fund-kit-widget'

   export default function Home() {
     const { setOpenModal } = useModal()

     return (
       <div>
         <button onClick={() => setOpenModal(true)}>Open Fund Kit Widget</button>
       </div>
     )
   }
   ```