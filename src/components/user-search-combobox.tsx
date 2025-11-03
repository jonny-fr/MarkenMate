"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchUsers, type UserSearchResult } from "@/actions/search-users";

interface UserSearchComboboxProps {
  currentUserId: string;
  value?: string; // selected user ID
  onSelect: (userId: string, userName: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function UserSearchCombobox({
  currentUserId,
  value,
  onSelect,
  disabled,
  placeholder = "Person auswählen...",
}: UserSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    const timeoutId = setTimeout(async () => {
      try {
        const searchResults = await searchUsers(query, currentUserId);
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, currentUserId]);

  const handleSelect = (user: UserSearchResult) => {
    setSelectedUser(user);
    setQuery("");
    setResults([]);
    setShowResults(false);
    onSelect(user.id, user.name);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {selectedUser ? (
        <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
          <User className="size-4 text-muted-foreground" />
          <span className="flex-1 text-sm">{selectedUser.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <User className="absolute left-3 size-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowResults(true)}
              disabled={disabled}
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 size-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {showResults && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
              {query.length < 2 && (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Mindestens 2 Zeichen eingeben
                </div>
              )}
              {query.length >= 2 && !isSearching && results.length === 0 && (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Keine Benutzer gefunden
                </div>
              )}
              {results.length > 0 && (
                <div className="space-y-1">
                  {results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelect(user)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
