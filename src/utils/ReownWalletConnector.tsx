"use client"

import "@aarc-xyz/eth-connector/styles.css"
import { WebClientInterface } from "@aarc-xyz/fundkit-web-sdk"
import { useCallback, useEffect, useMemo, useState } from "react"
import { InitAarcWithEthWalletListener } from "@aarc-xyz/eth-connector"
import { AarcEthersEthereumSigner as AarcEthereumSigner } from "./ReownWalletConnector"

import {
    createAppKit,
    useAppKit,
    useAppKitAccount,
    useAppKitNetwork,
    useAppKitProvider,
    useDisconnect,
    useWalletInfo,
} from "@reown/appkit/react"
import { EthersAdapter } from "@reown/appkit-adapter-ethers"
import { mainnet, arbitrum, AppKitNetwork } from "@reown/appkit/networks"
import { BrowserProvider, Signer } from "ethers"
import { Eip1193Provider } from "ethers"
import { JsonRpcSigner } from "ethers"

// 1. Get projectId at https://cloud.reown.com
const projectId = "YOUR_PROJECT_ID"

// 2. Create a metadata object
const metadata = {
    name: "My Website",
    description: "My Website description",
    url: "https://mywebsite.com", // origin must match your domain & subdomain
    icons: ["https://avatars.mywebsite.com/"],
}

const KNOWN_NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum]

const KNOWN_CHAINS: Record<number, ChainDefinition> = KNOWN_NETWORKS.reduce(
    (acc, chain) => {
        acc[+chain.id] = {
            chainName: chain.name,
            chainIdHex: "0x" + chain.id.toString(16),
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [chain.rpcUrls.default.http[0]],
            blockExplorerUrls: [chain?.blockExplorers?.default.url ?? ""],
        }
        return acc
    },
    {} as Record<number, ChainDefinition>
)

// 3. Create the AppKit instance
const modal = createAppKit({
    adapters: [new EthersAdapter()],
    metadata: metadata,
    networks: KNOWN_NETWORKS,
    projectId,
    features: {
        analytics: true, // Optional - defaults to your Cloud configuration
    },
})

export function ReownWalletConnectWrapper({
    client,
    debugLog,
}: {
    client: WebClientInterface

    debugLog?: boolean
}) {
    const { disconnect } = useDisconnect()

    const { open } = useAppKit()
    const { address, isConnected, caipAddress, status } = useAppKitAccount()
    const { caipNetwork, caipNetworkId, chainId, switchNetwork } =
        useAppKitNetwork()
    const { walletProvider, walletProviderType } = useAppKitProvider("eip155")
    const [walletClient, setWalletClient] = useState<AarcEthereumSigner>()

    const switchChain = useCallback(
        async ({ chainId }: { chainId: number }): Promise<void> => {
            const network = KNOWN_NETWORKS.find(
                (network) => network.id === chainId
            )
            if (!network) {
                throw new Error("Unknown network")
            }
            await switchNetwork(network)
        },
        [switchNetwork]
    )

    const combinedDisconnect = useCallback(async () => {
        await disconnect()
    }, [disconnect])

    const onClickConnect = useCallback(async () => {
        if (open) {
            open()
        }
    }, [open])

    useEffect(() => {
        const fn = async () => {
            const provider = new BrowserProvider(
                walletProvider as Eip1193Provider
            )
            const signer = await provider.getSigner()
            const _walletClient = new AarcEthereumSigner(
                signer as JsonRpcSigner
            )
            setWalletClient(_walletClient)
        }
        fn()
    }, [walletProvider])

    console.log("walletProvider", walletProvider)

    return (
        <InitAarcWithEthWalletListener
            client={client}
            debugLog={debugLog}
            //@ts-expect-error - `types` will be updated in next eth-connector release
            chains={KNOWN_NETWORKS.slice().map((network) => {
                const chain: Chain = {
                    id: +network.id,
                    name: network.name,
                    nativeCurrency: {
                        name: network.nativeCurrency.name,
                        symbol: network.nativeCurrency.symbol,
                        decimals: network.nativeCurrency.decimals,
                    },
                    blockExplorers: network.blockExplorers,
                }
                return chain
            })}
            chainId={+(chainId?.toString() ?? "")}
            address={address}
            disconnectAsync={combinedDisconnect}
            onClickConnect={onClickConnect}
            gasPrice={undefined}
            walletClient={walletClient}
            switchChain={switchChain}
        />
    )
}

interface Chain {
    id: number
    name: string
    nativeCurrency: {
        name: string
        symbol: string
        decimals: number
    }
    blockExplorers?: {
        default?: {
            url?: string
        }
    }
}

interface ChainDefinition {
    chainIdHex: string
    chainName: string
    nativeCurrency: {
        name: string
        symbol: string
        decimals: number
    }
    rpcUrls: string[]
    blockExplorerUrls: string[]
}

export class AarcEthersEthereumSigner {
    /**
     * Ethers Signer (e.g. from a BrowserProvider + getSigner()).
     * This Signer must be connected to window.ethereum or your chosen provider.
     */
    public signer: JsonRpcSigner

    /**
     * Optional: track a "current" block explorer URL if you want to store it
     * after switching to a known chain. If not needed, you can remove. it helps internal UI to get the block explorer URL.
     */
    public blockChainExplorerUrl?: string

    constructor(signer: JsonRpcSigner) {
        this.signer = signer
    }

    /**
     * Helper to switch chains in MetaMask (or any injected provider):
     * - If chain is recognized by user’s wallet, it will switch directly.
     * - If not recognized, attempts to 'addChain' first, then switch again.
     */
    private async handleSwitchChain(onChainID: string) {
        // Convert the chainId from string to number
        const chainIdNumber = Number(onChainID)

        // We'll build the hex string for chainId (e.g. "0x1" for Ethereum)
        const chainIdHex = "0x" + chainIdNumber.toString(16)

        try {
            // Attempt to switch to that chain
            await window.ethereum?.request?.({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: chainIdHex }],
            })
        } catch (error: any) {
            // If the chain is not recognized by MetaMask, you may get an error like:
            // "Unrecognized chain ID" or 4902 error code => need to addChain first
            if (
                error.code === 4902 ||
                (typeof error.message === "string" &&
                    error.message.includes("Unrecognized chain ID"))
            ) {
                const chainToAdd = KNOWN_CHAINS[chainIdNumber]
                if (!chainToAdd) {
                    throw new Error(
                        `Chain with ID ${chainIdNumber} not found in KNOWN_CHAINS`
                    )
                }
                // Use wallet_addEthereumChain to register it in MetaMask
                await window.ethereum?.request?.({
                    method: "wallet_addEthereumChain",
                    params: [
                        {
                            chainId: chainToAdd.chainIdHex,
                            chainName: chainToAdd.chainName,
                            nativeCurrency: chainToAdd.nativeCurrency,
                            rpcUrls: chainToAdd.rpcUrls,
                            blockExplorerUrls: chainToAdd.blockExplorerUrls,
                        },
                    ],
                })
                // Then switch again
                await window.ethereum?.request?.({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: chainToAdd.chainIdHex }],
                })
            } else {
                console.error("Error switching chain", error)
                throw error
            }
        }

        // If we have a known chain object, store its explorer
        const knownChain = KNOWN_CHAINS[chainIdNumber]
        if (knownChain && knownChain.blockExplorerUrls?.length > 0) {
            this.blockChainExplorerUrl = knownChain.blockExplorerUrls[0]
        }
    }

    /**
     * Send a generic transaction with 'to', 'data', 'value', etc.
     */
    async sendTransaction(transaction: {
        to: string
        value: string
        gasLimit?: string
        data?: string
        chainId?: string
        from?: string
    }): Promise<string> {
        // Switch chain if needed
        if (transaction.chainId) {
            await this.handleSwitchChain(transaction.chainId)
        }

        const tx = await this.signer.sendTransaction({
            to: transaction.to,
            data: transaction.data || undefined,
            value: transaction.value ? BigInt(transaction.value) : "0x0",
            // Ethers v6 automatically estimates gas if not provided
            gasLimit: transaction.gasLimit
                ? BigInt(transaction.gasLimit)
                : undefined,
        })

        return tx.hash
    }
}
