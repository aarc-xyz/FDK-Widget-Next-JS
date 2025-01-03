"use client"

import "@aarc-xyz/eth-connector/styles.css"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BrowserProvider, JsonRpcSigner } from "ethers"

import { WebClientInterface } from "@aarc-xyz/fundkit-web-sdk"
import { InitAarcWithEthWalletListener } from "@aarc-xyz/eth-connector"
import {
    arbitrum,
    avalanche,
    base,
    linea,
    mainnet,
    opBNB,
    optimism,
    polygon,
    scroll,
} from "viem/chains"

import { Signer, Contract } from "ethers"

interface CustomWalletConnectEthersWrapperProps {
    client: WebClientInterface
    debugLog?: boolean
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

/**
 * Minimal chain metadata. Feel free to expand this with as many chains as you need.
 * The 'chainId' must be a hex string in '0x...' format for Metamask's add/switch chain calls.
 */
const KNOWN_CHAINS_ARRAY = [
    mainnet,
    arbitrum,
    base,
    optimism,
    opBNB,
    polygon,
    avalanche,
    linea,
    scroll,
]

const KNOWN_CHAINS: Record<number, ChainDefinition> = KNOWN_CHAINS_ARRAY.reduce(
    (acc, chain) => {
        acc[chain.id] = {
            chainName: chain.name,
            chainIdHex: "0x" + chain.id.toString(16),
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [chain.rpcUrls.default.http[0]],
            blockExplorerUrls: [chain.blockExplorers.default.url],
        }
        return acc
    },
    {} as Record<number, ChainDefinition>
)

export function CustomWalletConnectEthersWrapper({
    client,
    debugLog,
}: CustomWalletConnectEthersWrapperProps) {
    const [address, setAddress] = useState<string>("")
    const [chainId, setChainId] = useState<number>(0)
    const [provider, setProvider] = useState<BrowserProvider>()
    const [walletClient, setWalletClient] = useState<AarcEthersEthereumSigner>()
    // We'll keep the full list of addresses & the currently-active address index
    const [accounts, setAccounts] = useState<JsonRpcSigner[]>([])
    const [currentIndex, setCurrentIndex] = useState<number>(0)

    /**
     * onClickConnect: prompts the user to connect via MetaMask (or any injected provider).
     */
    const onClickConnect = useCallback(async () => {
        if (!window.ethereum) {
            console.error("No injected Ethereum provider found.")
            return
        }
        try {
            let injectedProvider = provider
            if (!injectedProvider) {
                injectedProvider = new BrowserProvider(window.ethereum)
                setProvider(injectedProvider)
            }

            // 1) Request accounts from the user:
            await injectedProvider.send("eth_requestAccounts", [])
            const availableAccounts = await injectedProvider.listAccounts()
            console.log("availableAccounts", availableAccounts)
            if (!availableAccounts || availableAccounts.length === 0) {
                console.warn("No accounts returned from wallet.")
                return
            }

            // 2) Cycle to the next account index
            //    E.g. if currentIndex is 0, we’ll move to index 1 (mod length)
            const nextIndex = (currentIndex + 1) % availableAccounts.length
            setCurrentIndex(nextIndex)

            // 3) Set the new array of accounts
            setAccounts(availableAccounts)

            // 4) We also set the displayed address to that nextIndex:
            const chosenAddress = availableAccounts[nextIndex]
            const signer = await injectedProvider.getSigner(
                chosenAddress.address
            )
            const network = await injectedProvider.getNetwork()
            const _walletClient = new AarcEthersEthereumSigner(signer)

            setProvider(injectedProvider)
            setAddress(await signer.getAddress())
            setChainId(Number(network.chainId))
            setWalletClient(_walletClient)
        } catch (err) {
            console.error("Error on connect:", err)
        }
    }, [provider, currentIndex])

    /**
     * Disconnect: just clears local states in this simple example.
     */
    const disconnectAsync = useCallback(async () => {
        setAddress("")
        setChainId(0)
        setProvider(undefined)
    }, [])

    /**
     * Switch chain using MetaMask's "wallet_switchEthereumChain".
     */
    const switchChain = useCallback(
        async ({ chainId }: { chainId: number }) => {
            if (!window.ethereum) {
                return console.error("No injected Ethereum provider found.")
            }
            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: "0x" + chainId.toString(16) }],
                })
                // Refresh local chain ID
                if (provider) {
                    const network = await provider.getNetwork()
                    setChainId(Number(network.chainId))
                }
            } catch (err) {
                console.error("Error switching chain:", err)
            }
        },
        [provider]
    )

    /**
     * Listen for wallet or chain changes in the injected provider.
     *
     * - accountsChanged: user switches accounts in MetaMask
     * - chainChanged: user switches networks in MetaMask
     */
    useEffect(() => {
        if (!window.ethereum) return

        const handleAccountsChanged = async (accounts: string[]) => {
            if (accounts.length === 0) {
                // The user disconnected from the wallet
                disconnectAsync()
            } else {
                // The user switched accounts
                setAddress(accounts[0])
            }
        }

        const handleChainChanged = async (newChainId: string) => {
            // Convert hex string to decimal
            const numericChainId = parseInt(newChainId, 16)
            setChainId(numericChainId)

            // Re-fetch the signer if we still have a provider
            if (provider) {
                const signer = await provider.getSigner()
                setAddress(await signer.getAddress())
            }
        }

        window.ethereum.on("accountsChanged", handleAccountsChanged)
        window.ethereum.on("chainChanged", handleChainChanged)

        // Cleanup
        return () => {
            if (window.ethereum.removeListener) {
                window.ethereum.removeListener(
                    "accountsChanged",
                    handleAccountsChanged
                )
                window.ethereum.removeListener(
                    "chainChanged",
                    handleChainChanged
                )
            }
        }
    }, [provider, disconnectAsync])

    return (
        <InitAarcWithEthWalletListener
            client={client}
            debugLog={debugLog}
            chains={KNOWN_CHAINS_ARRAY} // supply your own chain definitions
            chainId={chainId}
            address={address}
            disconnectAsync={disconnectAsync}
            onClickConnect={onClickConnect}
            gasPrice={undefined}
            //@ts-ignore
            walletClient={walletClient}
            switchChain={switchChain}
        />
    )
}

export class AarcEthersEthereumSigner {
    /**
     * Ethers Signer (e.g. from a BrowserProvider + getSigner()).
     * This Signer must be connected to window.ethereum or your chosen provider.
     */
    public signer: Signer

    /**
     * Optional: track a "current" block explorer URL if you want to store it
     * after switching to a known chain. If not needed, you can remove. it helps internal UI to get the block explorer URL.
     */
    public blockChainExplorerUrl?: string

    constructor(signer: Signer) {
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
