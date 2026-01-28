import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { currencies, getCurrencyByCode } from "@/data/currencies";

interface CurrencyInputProps {
  amount: string;
  currency: string;
  onAmountChange: (amount: string) => void;
  onCurrencyChange: (currency: string) => void;
  label?: string;
  optional?: boolean;
}

export function CurrencyInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  label = "Pay Offered",
  optional = true,
}: CurrencyInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCurrency = getCurrencyByCode(currency) || currencies[0];

  const filteredCurrencies = useMemo(() => {
    if (!search) return currencies;
    const lower = search.toLowerCase();
    return currencies.filter(
      (c) =>
        c.code.toLowerCase().includes(lower) ||
        c.name.toLowerCase().includes(lower) ||
        c.symbol.includes(search)
    );
  }, [search]);

  return (
    <div className="space-y-2">
      <Label>
        {label} {optional && "(optional)"}
      </Label>
      <div className="flex gap-2">
        {/* Currency Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-24 justify-between px-2"
            >
              <span className="truncate">
                {selectedCurrency.symbol} {selectedCurrency.code}
              </span>
              <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 z-50" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search currencies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredCurrencies.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground text-center">
                  No currency found
                </p>
              ) : (
                filteredCurrencies.map((c) => (
                  <button
                    key={c.code}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                      currency === c.code && "bg-accent"
                    )}
                    onClick={() => {
                      onCurrencyChange(c.code);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <span className="w-8 font-medium">{c.symbol}</span>
                    <span className="flex-1 text-left">
                      {c.code} - {c.name}
                    </span>
                    {currency === c.code && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Amount Input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {selectedCurrency.symbol}
          </span>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="pl-8"
            min="0"
            step="0.01"
          />
        </div>
      </div>
    </div>
  );
}
