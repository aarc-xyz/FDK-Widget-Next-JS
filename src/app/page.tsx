"use client";

import { useModal } from "@aarc-xyz/fund-kit-widget";

export default function Home() {
  const { setOpenModal, setDestinationTokenWithAddress } = useModal();

  const updateDestination = async () => {
    try {
      setDestinationTokenWithAddress(
        "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        "137",
        "1"
      );
    } catch (error) {
      console.error("Error updating destination token:", error);
    }
  };

  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      <div className='flex flex-col items-center'>
        <button
          className='p-2 bg-slate-700 text-white rounded-lg'
          onClick={() => setOpenModal(true)}
        >
          Open Widget
        </button>
        <button
          className='p-2 mt-4 bg-slate-700 text-white rounded-lg'
          onClick={updateDestination}
        >
          Update
        </button>
      </div>
    </main>
  );
}
