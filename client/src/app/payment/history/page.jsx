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
import AuthGuard from "@/components/auth/AuthGuard";
import { paymentsAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  CreditCard,
  ExternalLink,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function PaymentHistoryPage() {
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const response = await paymentsAPI.getPaymentHistory();
      setPaymentHistory(response.data.data.paymentHistory);
    } catch (error) {
      console.error("Error fetching payment history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (verified) => {
    if (verified) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusBadge = (verified) => {
    if (verified) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          Verified
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
        Pending
      </Badge>
    );
  };

  const openTransaction = (txHash) => {
    window.open(`https://etherscan.io/tx/${txHash}`, "_blank");
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <CreditCard className="mr-3 h-8 w-8 text-primary" />
            Payment History
          </h1>
          <p className="text-muted-foreground mt-2">
            View all your blockchain payment transactions
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : paymentHistory.length > 0 ? (
          <div className="space-y-4">
            {paymentHistory.map((payment) => (
              <Card
                key={payment.jobId}
                className="hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(payment.verified)}
                        <h3 className="text-lg font-semibold">
                          {payment.jobTitle}
                        </h3>
                        {getStatusBadge(payment.verified)}
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-2" />
                          {formatDate(payment.date)}
                        </div>
                        <div className="font-mono text-xs bg-muted p-2 rounded overflow-hidden">
                          TX: {payment.txHash}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTransaction(payment.txHash)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View on Etherscan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No payment history</h3>
              <p className="text-muted-foreground mb-4">
                Your blockchain payment transactions will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
