import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { SearchResults } from "@/components/SearchResults";
import { SkeletonRow } from "@/components/Skeleton";
import { api } from "@/api/client";
import type { SearchResult } from "@/types";
import { theme } from "@/theme";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .search(debouncedQuery)
      .then((res) => setResults(res.results))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const TopNavBar = (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.surface3, borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 8 }}>
        <Icon name="search" size={16} color={theme.colors.textTertiary} />
        <TextInput
          style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 16, height: "100%" }}
          placeholder="Search songs, albums, artists..."
          placeholderTextColor={theme.colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(""); setResults([]); }} style={{ padding: 4 }}>
              <Icon name="x-circle" size={16} color={theme.colors.textTertiary} />
          </Pressable>
        )}
      </View>
    </View>
  );

  if (!query.trim()) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        {TopNavBar}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Icon name="search" size={52} color={theme.colors.textTertiary} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 18, marginTop: 16, textAlign: "center" }}>
            What do you want to listen to?
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {TopNavBar}
      {loading ? (
        <View style={{ paddingTop: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: theme.colors.accent, fontSize: 14, textAlign: "center" }}>{error}</Text>
          <Pressable
            style={{ marginTop: 16, backgroundColor: theme.colors.glass, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99 }}
            onPress={() => {
              setError(null);
              setLoading(true);
              api.search(debouncedQuery).then((res) => setResults(res.results)).catch((err) => setError(err.message)).finally(() => setLoading(false));
            }}
          >
            <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <SearchResults results={results} query={query} />
      )}
    </View>
  );
}
