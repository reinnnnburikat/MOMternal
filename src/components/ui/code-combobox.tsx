'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, Tag, Info, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface CodeOption {
  code: string;
  name: string;
  description?: string;
  category?: string;
  [key: string]: unknown;
}

interface CodeComboboxProps {
  /** Label for the field */
  label: string;
  /** Helper text below label */
  helperText?: string;
  /** Currently selected value (full code string) */
  value: string;
  /** Called when a code is selected — receives the full option */
  onSelect: (option: CodeOption | null) => void;
  /** Called when user types (for raw text input fallback) */
  onInputChange?: (value: string) => void;
  /** All available options */
  options: CodeOption[];
  /** Search/filter function — defaults to prefix matching */
  searchFn?: (query: string, options: CodeOption[]) => CodeOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Category color map */
  categoryColors?: Record<string, string>;
  /** Show category badges in results */
  showCategory?: boolean;
  /** Description field name in option */
  descriptionField?: string;
  /** ID for the trigger button (for focus management) */
  id?: string;
  /** Show a helper icon/info */
  infoTooltip?: string;
  /** Show initial suggestions when dropdown opens (before any query) */
  showInitialSuggestions?: boolean;
  /** Make code badge extra prominent (larger, bolder) */
  prominentCode?: boolean;
}

function defaultSearch(query: string, options: CodeOption[]): CodeOption[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  const filtered = options.filter((opt) => {
    if (opt.code.toLowerCase().startsWith(q)) return true;
    if (opt.code.includes(q)) return true;
    if (opt.name.toLowerCase().includes(q)) return true;
    if (opt.description && opt.description.toLowerCase().includes(q)) return true;
    if (opt.category && opt.category.toLowerCase().includes(q)) return true;
    return false;
  });
  // Code-first sorting: results whose code starts with the query come first,
  // then results whose code contains the query, then name/description matches.
  filtered.sort((a, b) => {
    const aCodePrefix = a.code.toLowerCase().startsWith(q);
    const bCodePrefix = b.code.toLowerCase().startsWith(q);
    if (aCodePrefix && !bCodePrefix) return -1;
    if (!aCodePrefix && bCodePrefix) return 1;
    const aCodeContains = a.code.toLowerCase().includes(q);
    const bCodeContains = b.code.toLowerCase().includes(q);
    if (aCodeContains && !bCodeContains) return -1;
    if (!aCodeContains && bCodeContains) return 1;
    return 0;
  });
  return filtered.slice(0, 25);
}

export function CodeCombobox({
  label,
  helperText,
  value,
  onSelect,
  onInputChange,
  options,
  searchFn = defaultSearch,
  placeholder = 'Type code or keyword to search...',
  emptyMessage = 'No matching codes found.',
  categoryColors,
  showCategory = true,
  id,
  infoTooltip,
  showInitialSuggestions = true,
  prominentCode = false,
}: CodeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [internalQuery, setInternalQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const selectedOption = value
    ? options.find((o) => o.code === value)
    : undefined;

  const handleSelect = (option: CodeOption) => {
    onSelect(option);
    setOpen(false);
    setInternalQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    if (onInputChange) onInputChange('');
    triggerRef.current?.focus();
  };

  // Focus input when popover opens
  React.useEffect(() => {
    if (open) {
      // Small delay to let the popover render
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label
          htmlFor={id}
          className="text-sm font-medium text-foreground leading-none"
        >
          {label}
        </label>
        {infoTooltip && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            {infoTooltip}
          </span>
        )}
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`Search ${label}`}
            className={cn(
              'w-full justify-between text-left font-normal h-auto min-h-[42px] px-3 py-2',
              'border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-800',
              'bg-white dark:bg-gray-900',
              !selectedOption && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedOption ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    variant="secondary"
                    className="shrink-0 font-mono text-xs px-1.5 py-0 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  >
                    {selectedOption.code}
                  </Badge>
                  <span className="truncate text-sm text-foreground">
                    {selectedOption.name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Hash className="h-4 w-4 text-rose-400 opacity-70" />
                  <span className="text-sm">Code search</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {selectedOption && (
                <span
                  onClick={handleClear}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-1 py-0.5 rounded hover:bg-muted transition-colors"
                >
                  ✕
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false} className="rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center border-b px-3" data-slot="command-input-wrapper">
              <Hash className={cn("h-4 w-4 shrink-0", prominentCode ? "text-rose-500 opacity-80" : "opacity-40")} />
              <CommandInput
                ref={inputRef}
                placeholder={placeholder}
                value={internalQuery}
                onValueChange={(v) => {
                  setInternalQuery(v);
                  if (onInputChange) onInputChange(v);
                }}
                className="h-10 text-sm border-0 focus:ring-0"
              />
            </div>
            <CommandList className="max-h-[300px]">
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <Search className="h-5 w-5 mx-auto mb-2 opacity-30" />
                  <p>{emptyMessage}</p>
                  <p className="text-xs mt-1 opacity-60">Try typing a code number or a different keyword</p>
                </div>
              </CommandEmpty>
              {(() => {
                const hasQuery = internalQuery.length > 0;
                const results = hasQuery
                  ? searchFn(internalQuery, options)
                  : showInitialSuggestions ? options.slice(0, 15) : [];
                if (results.length === 0) return null;
                return (
                  <CommandGroup heading={hasQuery ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'Suggestions'}>
                    {results.map((option) => {
                      const isSelected = selectedOption?.code === option.code;
                      const catColor = categoryColors?.[option.category || ''];
                      return (
                        <CommandItem
                          key={option.code}
                          value={option.code}
                          onSelect={() => handleSelect(option)}
                          className={cn(
                            'flex items-start gap-2 px-3 py-2.5 cursor-pointer',
                            isSelected && 'bg-rose-50 dark:bg-rose-950/20'
                          )}
                        >
                          <div className="flex items-center gap-2 shrink-0 pt-0.5">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'font-mono justify-center bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
                                prominentCode
                                  ? 'text-xs px-2 py-0.5 min-w-[56px] font-bold tracking-tight'
                                  : 'text-[11px] px-1.5 py-0 min-w-[48px]'
                              )}
                            >
                              {option.code}
                            </Badge>
                            {isSelected && (
                              <Check className="h-4 w-4 text-rose-600 shrink-0" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug text-foreground truncate">
                              {option.name}
                            </p>
                            {option.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {option.description}
                              </p>
                            )}
                            {showCategory && option.category && (
                              <Badge
                                variant="outline"
                                className="mt-1 text-[10px] px-1.5 py-0"
                                style={catColor ? {
                                  borderColor: catColor,
                                  color: catColor,
                                  backgroundColor: `${catColor}15`,
                                } : undefined}
                              >
                                {option.category}
                              </Badge>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })()}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
