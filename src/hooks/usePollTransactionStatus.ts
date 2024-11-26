"use client";

import { aarcCoreSDK } from "@/app/executeContract";
import { useCallback, useState, useEffect, useRef } from "react";

export type PollStatus = "error" | "success" | "pending";

type UsePollTransactionStatusProps = {
  requestId?: string;
  txHash?: string;
  pollInterval?: number;
  maxPollingDuration?: number;
};

export enum RoutingRequestStatus {
  INITIALISED = "INITIALISED",
  DEPOSIT_PENDING = "DEPOSIT_PENDING",
  DEPOSIT_FAILED = "DEPOSIT_FAILED",
  DEPOSIT_COMPLETED = "DEPOSIT_COMPLETED",
  CREATE_AND_FORWARD_INITIATED = "CREATE_AND_FORWARD_INITIATED",
  CREATE_AND_FORWARD_PENDING = "CREATE_AND_FORWARD_PENDING",
  CREATE_AND_FORWARD_FAILED = "CREATE_AND_FORWARD_FAILED",
  CREATE_AND_FORWARD_COMPLETED = "CREATE_AND_FORWARD_COMPLETED",
  NO_ROUTE_FOUND = "NO_ROUTE_FOUND",
  SWAP_INITIATED = "SWAP_INITIATED",
  SWAP_PENDING = "SWAP_PENDING",
  SWAP_FAILED = "SWAP_FAILED",
  SWAP_COMPLETED = "SWAP_COMPLETED",
  BRIDGE_INITIATED = "BRIDGE_INITIATED",
  BRIDGE_PENDING = "BRIDGE_PENDING",
  BRIDGE_FAILED = "BRIDGE_FAILED",
  BRIDGE_COMPLETED = "BRIDGE_COMPLETED",
  CHECKOUT_PENDING = "CHECKOUT_PENDING",
  CHECKOUT_FAILED = "CHECKOUT_FAILED",
  CHECKOUT_COMPLETED = "CHECKOUT_COMPLETED",
  FORWARD_FUND_INITIATED = "FORWARD_FUND_INITIATED",
  FORWARD_FUND_PENDING = "FORWARD_FUND_PENDING",
  FORWARD_FUND_FAILED = "FORWARD_FUND_FAILED",
  FORWARD_FUND_COMPLETED = "FORWARD_FUND_COMPLETED",
  REFUND_INITIATED = "REFUND_INITIATED",
  REFUND_PENDING = "REFUND_PENDING",
  REFUND_FAILED = "REFUND_FAILED",
  REFUND_COMPLETED = "REFUND_COMPLETED",
  EXPIRED = "EXPIRED",
}

function getStatusMessage(status: RoutingRequestStatus): string {
  switch (status) {
    case RoutingRequestStatus.INITIALISED:
      return "Request has been created and is awaiting processing.";
    case RoutingRequestStatus.DEPOSIT_PENDING:
      return "Your deposit is being processed.";
    case RoutingRequestStatus.DEPOSIT_FAILED:
      return "Deposit was unsuccessful. Please try again.";
    case RoutingRequestStatus.DEPOSIT_COMPLETED:
      return "Funds received by Aarc successfully.";
    case RoutingRequestStatus.CREATE_AND_FORWARD_INITIATED:
      return "Creating and forwarding your request.";
    case RoutingRequestStatus.CREATE_AND_FORWARD_PENDING:
      return "Creating and forwarding your request.";
    case RoutingRequestStatus.CREATE_AND_FORWARD_FAILED:
      return "Failed to create and forward request. Please retry.";
    case RoutingRequestStatus.CREATE_AND_FORWARD_COMPLETED:
      return "Request has been successfully created and forwarded.";
    case RoutingRequestStatus.FORWARD_FUND_INITIATED:
      return "Forwarding funds.";
    case RoutingRequestStatus.NO_ROUTE_FOUND:
      return "No available route found for your request.";
    case RoutingRequestStatus.SWAP_INITIATED:
      return "Swap process has started.";
    case RoutingRequestStatus.SWAP_PENDING:
      return "Swap is in progress.";
    case RoutingRequestStatus.SWAP_FAILED:
      return "Swap failed. Please attempt the swap again.";
    case RoutingRequestStatus.SWAP_COMPLETED:
      return "Swap completed successfully.";
    case RoutingRequestStatus.BRIDGE_INITIATED:
      return "Bridging process has been initiated.";
    case RoutingRequestStatus.BRIDGE_PENDING:
      return "Bridging is in progress.";
    case RoutingRequestStatus.BRIDGE_FAILED:
      return "Bridging failed. Please try again.";
    case RoutingRequestStatus.BRIDGE_COMPLETED:
      return "Bridging completed successfully.";
    case RoutingRequestStatus.CHECKOUT_PENDING:
      return "Checkout is in progress.";
    case RoutingRequestStatus.CHECKOUT_FAILED:
      return "Checkout failed. Please review and retry.";
    case RoutingRequestStatus.CHECKOUT_COMPLETED:
      return "Checkout completed successfully.";
    case RoutingRequestStatus.FORWARD_FUND_PENDING:
      return "Forwarding funds is in progress.";
    case RoutingRequestStatus.FORWARD_FUND_FAILED:
      return "Failed to forward funds. Please try again.";
    case RoutingRequestStatus.FORWARD_FUND_COMPLETED:
      return "Funds have been forwarded successfully.";
    case RoutingRequestStatus.REFUND_INITIATED:
      return "Refund process has been initiated.";
    case RoutingRequestStatus.REFUND_PENDING:
      return "Refund is being processed.";
    case RoutingRequestStatus.REFUND_FAILED:
      return "Refund failed. Please contact support.";
    case RoutingRequestStatus.REFUND_COMPLETED:
      return "Refund completed successfully.";
    case RoutingRequestStatus.EXPIRED:
      return "Request has expired.";
    default:
      return "Request is being processed.";
  }
}

/**
 * Hook to poll the status of a transaction request.
 * It will start polling when the requestId and txHash are provided.
 * Includes retry logic when the network is offline.
 * @param requestId The requestId of the transaction request
 * @param txHash The transaction hash of the request
 * @param pollInterval The interval in milliseconds to poll the request status
 * @param maxPollingDuration The maximum duration in milliseconds to poll the request status
 * @returns isPolling: boolean, pollStatus: PollStatus, error: string | null | undefined, hasTimedOut: boolean
 */
export const usePollTransactionStatusV2 = ({
  requestId,
  txHash,
  pollInterval = 5000,
  maxPollingDuration = 480000,
}: UsePollTransactionStatusProps) => {
  const [isPolling, setIsPolling] = useState(false);
  const [pollStatus, setPollStatus] = useState<PollStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [pollingMessage, setPollingMessage] = useState<string | null>(null);

  const pollingTimeoutRef = useRef<number | null>(null);
  const stopPollingTimeoutRef = useRef<number | null>(null);

  const pollRequestStatus = useCallback(() => {
    if (!requestId) return;

    // Reset the timeout flag when starting to poll
    setHasTimedOut(false);
    // Reset the Timeout refs
    pollingTimeoutRef.current = null;
    stopPollingTimeoutRef.current = null;
    let isCompleted = false;

    const pollStatusCheck = async () => {
      if (!navigator.onLine) {
        console.error("Network is offline, waiting to retry");
        pollingTimeoutRef.current = window.setTimeout(
          pollStatusCheck,
          pollInterval
        );
        return;
      } else {
      }
      try {
        const data = await aarcCoreSDK.getRequestStatus(requestId);
        setPollingMessage(
          getStatusMessage(data.status as RoutingRequestStatus)
        );

        if (
          data?.status === "COMPLETED" ||
          data?.status === "CHECKOUT_COMPLETED" ||
          data?.status === "FORWARD_FUND_COMPLETED"
        ) {
          setPollStatus("success");
          setIsPolling(false);
          isCompleted = true;

          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
          }
          if (stopPollingTimeoutRef.current) {
            clearTimeout(stopPollingTimeoutRef.current);
          }
        } else if (
          data?.status === "FAILED" ||
          data?.status === "CANCELLED" ||
          data?.status === "EXPIRED" ||
          data.status.includes("FAILED")
        ) {
          setPollStatus("error");
          setIsPolling(false);
          isCompleted = true;
          setError("Transaction failed");

          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
          }
          if (stopPollingTimeoutRef.current) {
            clearTimeout(stopPollingTimeoutRef.current);
          }
        } else {
          pollingTimeoutRef.current = window.setTimeout(
            pollStatusCheck,
            pollInterval
          );
        }
      } catch (err) {
        if (!navigator.onLine) {
          console.error("Network is offline, waiting to retry");
          pollingTimeoutRef.current = window.setTimeout(
            pollStatusCheck,
            pollInterval
          );
        } else {
          console.error("Error polling request status:", err);
          setPollStatus("error");
          setError("An error occurred while polling");
          setIsPolling(false);
          isCompleted = true;
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
          }
          if (stopPollingTimeoutRef.current) {
            clearTimeout(stopPollingTimeoutRef.current);
          }
        }
      }
    };

    // Start polling
    setIsPolling(true);
    pollStatusCheck();

    // Stop polling after maxPollingDuration
    if (!isCompleted)
      stopPollingTimeoutRef.current = window.setTimeout(() => {
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
        }
        if (!isPolling && pollStatus === "success") return;
        setError("Transaction took too long to complete");
        setPollStatus("error");
        setIsPolling(false);
        setHasTimedOut(true);
      }, maxPollingDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, maxPollingDuration, pollInterval]);

  useEffect(() => {
    if (requestId && txHash) {
      pollRequestStatus();
    }
    // Cleanup on unmount
    return () => {
      setIsPolling(false);
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      if (stopPollingTimeoutRef.current) {
        clearTimeout(stopPollingTimeoutRef.current);
      }
    };
  }, [requestId, txHash, pollRequestStatus]);

  return {
    isPolling,
    pollStatus,
    error,
    hasTimedOut,
    pollingMessage,
  };
};
