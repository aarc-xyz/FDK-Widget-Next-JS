"use client";

import { useAarcContext } from "@/contexts/AarcProvider";

export default function Home() {
  const { aarcModal } = useAarcContext();

  const updateDestination = async () => {
    try {
      aarcModal?.reset();
      aarcModal?.updateDestinationWalletAddress(
        "0x1234567890123456789012345678901234567890"
      );
      aarcModal?.updateDestinationToken(
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        42161,
        0.01
      );
      aarcModal?.openModal();
    } catch (error) {
      console.error("Error updating destination token:", error);
    }
  };

  return (
    <main className="flex flex-col items-center justify-between p-24">
      <div className="flex flex-col items-center">
        <h1 className="text-4xl font-bold text-center">
          Aarc FundKit Widget Example
        </h1>
        <button
          className="p-2 mt-4 bg-slate-700 text-white rounded-lg"
          onClick={() => {
            aarcModal?.reset();
            console.log("Open Widget");
            aarcModal?.openModal();
          }}
        >
          Open Widget
        </button>
        <button
          className="p-2 mt-4 bg-slate-700 text-white rounded-lg"
          onClick={updateDestination}
        >
          Preselect 0.01 USDC (ARB)
        </button>
      </div>
    </main>
  );
}
