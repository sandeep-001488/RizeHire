"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AuthGuard from "@/components/auth-guard/authGuard";
import { paymentsAPI } from "@/lib/api";
import {
  CreditCard,
  Info,
  ExternalLink,
  DollarSign,
} from "lucide-react";

export default function FeeInfoPage() {
  const [feeInfo, setFeeInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeeInfo();
  }, []);

  const fetchFeeInfo = async () => {
    try {
      const response = await paymentsAPI.getFeeInfo();
      setFeeInfo(response.data.data.feeInfo);
    } catch (error) {
      console.error("Error fetching fee info:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const blockchains = [
    {
      name: "Ethereum",
      key: "ethereum",
      icon: "⟠",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      explorerUrl: "https://etherscan.io",
    },
    {
      name: "Polygon",
      key: "polygon",
      icon: "⬟",
      color:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      explorerUrl: "https://polygonscan.com",
    },
    {
      name: "Solana",
      key: "solana",
      icon: "◎",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      explorerUrl: "https://solscan.io",
    },
  ];

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <DollarSign className="mr-3 h-8 w-8 text-primary" />
            Platform Fee Information
          </h1>
          <p className="text-muted-foreground mt-2">
            Learn about our transparent pricing structure
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : feeInfo ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="mr-2 h-5 w-5" />
                  Why Do We Charge Fees?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-muted-foreground">
                    Platform fees help us maintain high-quality service, prevent
                    spam postings, and ensure serious job opportunities. All
                    fees are transparently processed through blockchain
                    transactions.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blockchains.map((blockchain) => {
                const feeData = feeInfo[blockchain.key];
                return (
                  <Card
                    key={blockchain.key}
                    className="relative overflow-hidden"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <span className="text-2xl mr-2">{blockchain.icon}</span>
                        {blockchain.name}
                      </CardTitle>
                      <CardDescription>
                        Job posting fee on {blockchain.name} network
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">
                          {feeData.amount} {feeData.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ≈ ${feeData.usdEquivalent} USD
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Badge className={blockchain.color} variant="outline">
                          Network: {blockchain.name}
                        </Badge>

                        <div className="text-xs text-muted-foreground">
                          <p>
                            Gas fees may apply depending on network congestion
                          </p>
                        </div>
                      </div>

                      <a
                        href={blockchain.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Explorer
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">
                      Why blockchain payments?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Blockchain payments ensure transparency, security, and
                      eliminate the need for traditional payment processors.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">
                      Which blockchain should I use?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Choose based on your preference. Ethereum is most secure
                      but has higher gas fees. Polygon offers faster and cheaper
                      transactions. Solana provides the lowest fees.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">
                      What if my payment fails?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      If your payment is not verified, please check the
                      transaction hash and ensure the correct amount was sent to
                      the right address. Contact support if issues persist.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                Unable to load fee information
              </h3>
              <p className="text-muted-foreground mb-4">
                Please try again later or contact support.
              </p>
              <Button onClick={fetchFeeInfo}>Try Again</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
