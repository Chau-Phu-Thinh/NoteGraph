import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import FilterChips from '../components/FilterChips';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { Colors, Spacing } from '../theme/tokens';
import { Note } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'Search'>;

type FilterType = 'ALL' | 'Titles' | 'Content';

const FILTER_CHIPS: FilterType[] = ['ALL', 'Titles', 'Content'];

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const { searchNotes } = useApp();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [results, setResults] = useState<Note[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Perform debounced search when query or selectedFilter changes
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const rawNotes = await searchNotes(trimmedQuery);
        const lowerQuery = trimmedQuery.toLowerCase();

        // Apply selected filter
        let filtered = rawNotes.filter((note) => {
          const matchesTitle = note.title.toLowerCase().includes(lowerQuery);
          const matchesContent = note.content.toLowerCase().includes(lowerQuery);

          if (selectedFilter === 'Titles') {
            return matchesTitle;
          }
          if (selectedFilter === 'Content') {
            return matchesContent;
          }
          // 'ALL'
          return matchesTitle || matchesContent;
        });

        // Sort results: Title matches first, then body matches
        filtered.sort((a, b) => {
          const aTitle = a.title.toLowerCase().includes(lowerQuery);
          const bTitle = b.title.toLowerCase().includes(lowerQuery);

          if (aTitle && !bTitle) return -1;
          if (!aTitle && bTitle) return 1;
          return 0;
        });

        setResults(filtered);
        setHasSearched(true);
      } catch (error) {
        console.error('Failed to search notes:', error);
        setResults([]);
        setHasSearched(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedFilter, searchNotes]);

  const handleNotePress = useCallback(
    (note: Note) => {
      navigation.navigate('NoteEditor', { noteId: note.id, mode: 'view' });
    },
    [navigation]
  );

  const handleFilterSelect = (chip: string) => {
    setSelectedFilter(chip as FilterType);
  };

  const handleClearSearch = () => {
    setQuery('');
  };

  const isQueryNotEmpty = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header with back arrow, purple "Search" title, no right action */}
      <Header
        title="Search"
        titleColor={Colors.primary}
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.searchSection}>
        {/* Search Bar with autofocus */}
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClear={handleClearSearch}
          placeholder="Search notes..."
          autoFocus={true}
        />

        {/* Filter Chips */}
        <View style={styles.chipsContainer}>
          <FilterChips
            chips={FILTER_CHIPS}
            selected={selectedFilter}
            onSelect={handleFilterSelect}
          />
        </View>
      </View>

      {/* Results List or Empty State */}
      {isQueryNotEmpty && hasSearched && results.length === 0 ? (
        <EmptyState
          icon="magnify-remove-outline"
          title="No notes found"
          subtitle={`No notes matched "${query.trim()}"`}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={handleNotePress} searchQuery={query} />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchSection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
  },
  chipsContainer: {
    marginTop: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xl,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
