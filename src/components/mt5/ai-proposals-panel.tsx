"use client";

import { useState, useTransition } from "react";
import { confirmAiTradeProposal, rejectAiTradeProposal } from "@/actions/ai-trade-proposal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

type Proposal = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  confidence: number | null;
  qualityScore: number | null;
  reasoning: string;
  checklist: ChecklistItem[] | null;
  createdAt: Date;
};

type Props = {
  proposals: Proposal[];
  locale: string;
};

type ProposalState =
  | { type: "idle" }
  | { type: "confirmed"; signalId: string }
  | { type: "rejected" }
  | { type: "error"; message: string };

function ChecklistIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") {
    return <span className="text-green-500 shrink-0">✓</span>;
  }
  if (status === "warn") {
    return <span className="text-yellow-500 shrink-0">⚠</span>;
  }
  return <span className="text-destructive shrink-0">✗</span>;
}

function ProposalCard({
  proposal,
  locale,
}: {
  proposal: Proposal;
  locale: string;
}) {
  const [state, setState] = useState<ProposalState>({ type: "idle" });
  const [isPending, startTransition] = useTransition();
  const [lotSize, setLotSize] = useState("0.01");

  function handleConfirm() {
    const lot = parseFloat(lotSize);
    startTransition(async () => {
      const result = await confirmAiTradeProposal(proposal.id, lot > 0 ? lot : undefined);
      if (result.ok && result.signalId) {
        setState({ type: "confirmed", signalId: result.signalId });
      } else {
        setState({ type: "error", message: result.error ?? "Unknown error" });
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectAiTradeProposal(proposal.id);
      if (result.ok) {
        setState({ type: "rejected" });
      } else {
        setState({ type: "error", message: result.error ?? "Unknown error" });
      }
    });
  }

  if (state.type === "rejected") {
    return null;
  }

  if (state.type === "confirmed") {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="flex items-center gap-3 py-4 text-sm">
          <span className="text-green-500 font-medium">Signal created ✓</span>
          <Link
            href={`/signals/${state.signalId}`}
            className="text-primary hover:underline"
          >
            View signal →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const checklist = proposal.checklist as ChecklistItem[] | null;

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-base font-semibold text-foreground">
            {proposal.symbol}
          </span>
          <Badge variant={proposal.direction === "LONG" ? "default" : "destructive"}>
            {proposal.direction}
          </Badge>
          <Badge variant="outline">{proposal.timeframe}</Badge>
          {proposal.confidence != null && (
            <span className="text-xs text-muted-foreground">
              Confidence: {proposal.confidence}/5
            </span>
          )}
          {proposal.qualityScore != null && (
            <span className="text-xs text-muted-foreground">
              Score: {proposal.qualityScore.toFixed(0)}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {proposal.createdAt.toLocaleString(locale)}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
          <span>
            Entry:{" "}
            <span className="font-mono text-foreground">{proposal.entry}</span>
          </span>
          {proposal.stopLoss != null && (
            <span>
              SL:{" "}
              <span className="font-mono text-foreground">{proposal.stopLoss}</span>
            </span>
          )}
          {proposal.takeProfit != null && (
            <span>
              TP:{" "}
              <span className="font-mono text-foreground">{proposal.takeProfit}</span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {checklist && checklist.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Trade checklist
            </p>
            <ul className="space-y-1">
              {checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <ChecklistIcon status={item.status} />
                  <span>
                    <span className="font-medium">{item.label}:</span>{" "}
                    <span className="text-muted-foreground">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Reasoning
          </p>
          <p className={cn("text-xs text-muted-foreground line-clamp-3")}>{proposal.reasoning}</p>
        </div>

        {state.type === "error" && (
          <p className="text-xs text-destructive" role="alert">
            Error: {state.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <div className="flex items-center gap-1.5 mr-auto">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Lot size:</label>
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              disabled={isPending}
              className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={isPending}
          >
            {isPending ? "..." : "Reject"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "..." : "Confirm & Create Signal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AiProposalsPanel({ proposals, locale }: Props) {
  if (proposals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
        No pending AI proposals
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} locale={locale} />
      ))}
    </div>
  );
}
