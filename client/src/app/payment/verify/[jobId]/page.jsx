"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import AuthGuard from "@/components/auth-guard/authGuard";
import { paymentsAPI, jobsAPI } from "@/lib/api";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Copy,
} from "lucide-react";

export default function PaymentVerifyPage({ params }) {
  const { jobId } = params;
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [feeInfo, setFeeInfo] = useState(null);
  const [paymentData, setPaymentData] = useState({
    txHash: "",
    blockchain: "ethereum",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchJobAndFeeInfo();
  }, [jobId]);

  const fetchJobAndFeeInfo = async () => {
    try {
      const [jobResponse, feeResponse] = await Promise.allSettled([
        jobsAPI.getJob(jobId),
        paymentsAPI.getFeeInfo(),
      ]);

      if (jobResponse.status === "fulfilled") {
        setJob(jobResponse.value.data.data.job);
      }

      if (feeResponse.status === "fulfilled") {
        setFeeInfo(feeResponse.value.data.data.feeInfo);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPayment = async (e) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      const response = await paymentsAPI.verifyPayment({
        txHash: paymentData.txHash,
        amount: feeInfo?.ethereum?.amount || "0.001",
        blockchain: paymentData.blockchain,
      });

      if (response.data.success) {
        await paymentsAPI.updatePaymentVerification(jobId, {
          txHash: paymentData.txHash,
          verified: true,
        });

        alert("Payment verified successfully!");
        router.push("/post-job");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Payment verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <CreditCard className="mr-3 h-8 w-8 text-primary" />
            Payment Verification
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete the blockchain payment to post your job
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Instructions</CardTitle>
              <CardDescription>
                Send the exact amount to the wallet address below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {feeInfo && (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold text-lg text-center mb-4">
                      Platform Fee
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Ethereum</span>
                        <Badge variant="secondary">
                          {feeInfo.ethereum.amount} ETH (~$
                          {feeInfo.ethereum.usdEquivalent})
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Polygon</span>
                        <Badge variant="secondary">
                          {feeInfo.polygon.amount} MATIC (~$
                          {feeInfo.polygon.usdEquivalent})
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Solana</span>
                        <Badge variant="secondary">
                          {feeInfo.solana.amount} SOL (~$
                          {feeInfo.solana.usdEquivalent})
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center text-yellow-800 dark:text-yellow-200">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Payment Address
                    </h4>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background p-2 rounded flex-1 break-all">
                        {feeInfo.adminWallet.ethereum ||
                          "0x742d35Cc6560C02B64d4C4Ee5EaE2b47e45E3d3D"}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            feeInfo.adminWallet.ethereum ||
                              "0x742d35Cc6560C02B64d4C4Ee5EaE2b47e45E3d3D"
                          )
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>
                      ⚠️ <strong>Important:</strong>
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Send the exact amount shown above</li>
                      <li>Use the correct blockchain network</li>
                      <li>Copy the transaction hash after sending</li>
                      <li>Payment verification may take a few minutes</li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verify Your Payment</CardTitle>
              <CardDescription>
                Enter your transaction hash to verify the payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyPayment} className="space-y-4">
                <div>
                  <Label htmlFor="blockchain">Blockchain Network</Label>
                  <select
                    id="blockchain"
                    value={paymentData.blockchain}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        blockchain: e.target.value,
                      }))
                    }
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                    required
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                    <option value="solana">Solana</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="txHash">Transaction Hash</Label>
                  <Input
                    id="txHash"
                    placeholder="0x... or transaction signature"
                    value={paymentData.txHash}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        txHash: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isVerifying}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Verify Payment
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">
                  Need Help?
                </h4>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>• Check your wallet for the transaction hash</p>
                  <p>• Make sure the transaction is confirmed</p>
                  <p>• Contact support if you&apos;re having issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  Demo Mode
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  This is a demo. You can enter any transaction hash to proceed
                  with job posting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
