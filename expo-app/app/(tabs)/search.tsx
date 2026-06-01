import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Icon } from "@/components/icons";
import { SearchResults } from "@/components/SearchResults";
import { SkeletonRow } from "@/components/Skeleton";
import { api } from "@/api/client";
import { theme, layout, radius } from "@/theme";
import { haptics } from "@/utils/animations";
import { consumeFreshSearch } from "./_layout";
import type { SearchResult } from "@/types";
import { useRef } from "react";

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
  const clearScale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      if (consumeFreshSearch()) {
        setQuery("");
        setResults([]);
        setError(null);
      }
    }, [])
  );

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

  const handleClear = () => {
    haptics.light();
    Animated.spring(clearScale, {
      toValue: 0.8,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(clearScale, {
        toValue: 1,
        friction: 8,
        tension: 400,
        useNativeDriver: true,
      }).start();
    });
    setQuery("");
    setResults([]);
  };

  const TopNavBar = (
    <View
      style={{
        paddingTop: insets.top + layout.space[3],
        paddingBottom: layout.space[3],
        paddingHorizontal: layout.px,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{ 
        flexDirection: "row", 
        alignItems: "center", 
        backgroundColor: theme.colors.surfaceElevated, 
        borderRadius: radius.md, 
        paddingHorizontal: layout.space[3], 
        height: 44, 
        gap: layout.space[2],
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <Icon name="search" size={18} color={theme.colors.textTertiary} />
        <TextInput
          style={{ 
            flex: 1, 
            color: theme.colors.textPrimary, 
            fontSize: 16, 
            height: "100%",
          }}
          placeholder="Search songs, albums, artists..."
          placeholderTextColor={theme.colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search"
          accessibilityRole="search"
        />
        {query.length > 0 && (
          <Pressable 
            onPress={handleClear} 
            style={{ padding: layout.space[1] }}
            hitSlop={12}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Animated.View style={{ transform: [{ scale: clearScale }] }}>
              <Icon name="x-circle" size={18} color={theme.colors.textTertiary} />
            </Animated.View>
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
          <View style={{
            width: 100,
            height: 100,
            borderRadius: radius.xl,
            backgroundColor: theme.colors.surfaceElevated,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: layout.space[5],
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <Icon name="search" size={48} color={theme.colors.textTertiary} />
          </View>
          <Text style={{ 
            color: theme.colors.textSecondary, 
            fontSize: 20, 
            fontWeight: "600",
            textAlign: "center" 
          }}>
            What do you want to listen to?
          </Text>
          <Text style={{ 
            color: theme.colors.textTertiary, 
            fontSize: 14, 
            marginTop: layout.space[2],
            textAlign: "center" 
          }}>
            Search for songs, albums, artists, or playlists
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {TopNavBar}
      {loading ? (
        <View style={{ paddingTop: layout.space[2] }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <View style={{
            width: 72,
            height: 72,
            borderRadius: radius.xl,
            backgroundColor: theme.colors.surfaceElevated,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: layout.space[4],
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <Icon name="x-circle" size={32} color={theme.colors.accent} />
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 15, textAlign: "center" }}>
            {error}
          </Text>
          <Pressable
            style={{ 
              marginTop: layout.space[4], 
              backgroundColor: theme.colors.accent, 
              paddingHorizontal: layout.space[5], 
              paddingVertical: layout.space[3], 
              borderRadius: radius.full,
              ...theme.shadows.sm,
            }}
            onPress={() => {
              haptics.light();
              setError(null);
              setLoading(true);
              api.search(debouncedQuery).then((res) => setResults(res.results)).catch((err) => setError(err.message)).finally(() => setLoading(false));
            }}
            accessibilityLabel="Retry search"
            accessibilityRole="button"
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <SearchResults results={results} query={query} />
      )}
    </View>
  );
}
