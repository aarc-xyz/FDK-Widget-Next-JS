"use client";

import "@aarc-xyz/eth-connector/styles.css";
import { WebClientInterface } from "@aarc-xyz/fundkit-web-sdk";
import { useCallback, useMemo } from "react";
import {
  useAccount,
  useChainId,
  useDisconnect,
  useGasPrice,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  AarcEthereumSigner,
  InitAarcWithEthWalletListener,
} from "@aarc-xyz/eth-connector";

export function CustomWalletConnectWrapper({
  client,
  debugLog,
}: {
  client: WebClientInterface;

  debugLog?: boolean;
}) {
  const { chains, switchChain: wagmiSwitchChain } = useSwitchChain();
  const chainId = useChainId();
  const account = useAccount();
  const { disconnectAsync, disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { data: gasPrice } = useGasPrice();
  const { data: rawWalletClient } = useWalletClient();

  const switchChain = useCallback(
    async ({ chainId }: { chainId: number }): Promise<void> => {
      await wagmiSwitchChain({ chainId });
    },
    [wagmiSwitchChain]
  );

  const combinedDisconnect = useCallback(async () => {
    await disconnectAsync();
    disconnect();
  }, [disconnectAsync, disconnect]);

  const onClickConnect = useCallback(async () => {
    if (openConnectModal) {
      openConnectModal();
    }
  }, [openConnectModal]);

  const walletClient = useMemo(
    () =>
      rawWalletClient ? new AarcEthereumSigner(rawWalletClient) : undefined,
    [rawWalletClient]
  );

  return (
    <InitAarcWithEthWalletListener
      client={client}
      debugLog={debugLog}
      chains={chains.slice()}
      chainId={chainId}
      address={account.address}
      disconnectAsync={combinedDisconnect}
      onClickConnect={onClickConnect}
      gasPrice={gasPrice}
      walletClient={walletClient}
      switchChain={switchChain}
    />
  );
}
