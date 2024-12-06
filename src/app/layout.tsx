import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./styles/globals.css";
import dynamic from "next/dynamic";

const AarcProvider = dynamic(() => import("../contexts/AarcProvider"), {
  ssr: false,
});

const ContractExecution = dynamic(() => import("./executeContract"), {
  ssr: false,
});

const ContractExecutionWithOnRamp = dynamic(() => import("./executeContractWithOnramp"), {
  ssr: false,
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aarc FundKit Widget NextJS Example",
  description: "Aarc FundKit Widget Example using NextJS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AarcProvider>{children}</AarcProvider>
        {/* <ContractExecution /> */}
        <ContractExecutionWithOnRamp />
      </body>
    </html>
  );
}
