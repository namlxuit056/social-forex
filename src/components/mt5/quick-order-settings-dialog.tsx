"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { QuickOrderConfig } from "@/lib/mt5/quick-order-config";

type Props = {
  config: QuickOrderConfig;
  onSave: (config: QuickOrderConfig) => void;
};

export function QuickOrderSettingsDialog({ config, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState(config.symbol);
  const [volume, setVolume] = useState(String(config.volume));

  function handleOpenChange(next: boolean) {
    if (next) {
      setSymbol(config.symbol);
      setVolume(String(config.volume));
    }
    setOpen(next);
  }

  function handleSave() {
    const parsedVolume = Number(volume);
    if (!symbol || !Number.isFinite(parsedVolume) || parsedVolume <= 0) return;
    onSave({ symbol, volume: parsedVolume });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="icon" aria-label="Quick order settings" />}>
        <Settings2 className="size-4" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Quick order settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="quick-order-symbol">Symbol</Label>
            <Select value={symbol} onValueChange={(v) => v && setSymbol(v)}>
              <SelectTrigger id="quick-order-symbol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_DEFINITIONS.map((d) => (
                  <SelectItem key={d.symbol} value={d.symbol}>
                    {d.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="quick-order-volume">Lot</Label>
            <Input
              id="quick-order-volume"
              type="number"
              step="0.01"
              min="0.01"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Saved on this device — used by the quick Buy/Sell buttons above.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
