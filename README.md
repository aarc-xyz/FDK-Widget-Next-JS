# Fund Kit Widget Sample App

<div align="center">

![Aarc logo](https://docs.aarc.xyz/~gitbook/image?url=https%3A%2F%2F2121962569-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FfkVTcYLDkf0mcGW9zUvc%252Ficon%252FXtUcMbVRcCfcJqlZizrq%252F1.png%3Falt%3Dmedia%26token%3De011d1c3-bb05-417f-82ac-273ca8e40dd5&width=32&dpr=1&quality=100&sign=949106d8&sv=2)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-13.0+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

A production-ready sample application demonstrating the integration of AARC's Fund Kit Widget with Next.js
</div>

## 📋 Prerequisites

- Node.js (v14.0.0 or later)
- Package manager (one of the following):
  - npm (v6.0.0 or later)
  - yarn (v1.22.0 or later)
  - pnpm (v6.0.0 or later)
  - bun (v1.0.0 or later)

## 🛠 Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/aarc-xyz/FDK-Widget-Next-JS.git
   cd FDK-Widget-Next-JS
   ```

2. **Install Dependencies**
   ```bash
   # Using npm
   npm install

   # Using yarn
   yarn install

   # Using pnpm
   pnpm install

   # Using bun
   bun install
   ```

3. **Start Development Server**
   ```bash
   # Using npm
   npm run dev

   # Using yarn
   yarn dev

   # Using pnpm
   pnpm dev

   # Using bun
   bun dev
   ```

4. **View the App**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 📦 Required AARC Packages

The following AARC packages are required for integration:

```json
{
  "@aarc-xyz/fundkit-web-sdk": "latest",
  "@aarc-xyz/eth-connector": "latest"
}
```

## 🔧 Integration Guide

### 1. Basic Setup

First, ensure you have the required packages installed. Then, import the necessary styles and components:

```tsx
import "@aarc-xyz/eth-connector/styles.css";
import {
  AarcFundKitModal,
  SourceConnectorName
} from "@aarc-xyz/fundkit-web-sdk";
```

### 2. Configuration

Create your AARC configuration object following our [configuration guide](https://docs.aarc.xyz/developer-docs/fund-kit/fund-kit-widget/config).

### 3. Provider Setup

Wrap your application with the necessary providers:

```tsx
const AarcProvider = ({ children }: AarcProviderProps) => {
  const aarcModalRef = useRef<AarcFundKitModal | null>(
    new AarcFundKitModal(aarcConfig)
  );
  const aarcModal = aarcModalRef.current;

  if (!aarcModal) {
    return null;
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

### 4. Using the Widget

Implement the widget in your components:

```tsx
import { useAarcContext } from "@/contexts/AarcProvider";

export default function Home() {
  const { aarcModal } = useAarcContext();

  return (
    <button onClick={() => aarcModal?.openModal()}>
      Open Aarc Widget
    </button>
  );
}
```

## 📚 Documentation

For detailed information about the Fund Kit Widget and its capabilities, visit our comprehensive documentation:

- [Getting Started](https://docs.aarc.xyz/developer-docs/developers/widget)
- [Widget Configuration](https://docs.aarc.xyz/developer-docs/fund-kit/fund-kit-widget/config)
- [API Reference](https://docs.aarc.xyz/developer-docs/fund-kit/fund-kit-widget/api-reference)
- [Integration Examples](https://docs.aarc.xyz/developer-docs/developers/cookbook)

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

Need help? Join our [Discord community](https://discord.com/invite/XubvAjtpM7) or create an issue in the GitHub repository.

---

<div align="center">
Built with ❤️ by the <a href="https://aarc.xyz/"> Aarc </a> team
</div>
