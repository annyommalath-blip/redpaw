import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Dog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DOG_BREEDS } from "@/data/dogBreeds";

interface BreedSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function BreedSelector({ value, onChange }: BreedSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredBreeds = useMemo(() => {
    if (!search) return DOG_BREEDS;
    const lower = search.toLowerCase();
    return DOG_BREEDS.filter((breed) => breed.toLowerCase().includes(lower));
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">Select a breed...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search breeds..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4">
                <Dog className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No breed found</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange(search);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  Use "{search}" as custom breed
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredBreeds.map((breed) => (
                <CommandItem
                  key={breed}
                  value={breed}
                  onSelect={() => {
                    onChange(breed);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === breed ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {breed}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
