import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows, Typography } from '../theme/tokens';
import { Note } from '../types';
import { truncateText } from '../utils/helpers';
import TagChip from './TagChip';

interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onLongPress?: (note: Note) => void;
  searchQuery?: string;
}

function getSnippet(text: string, query?: string, maxLength: number = 100) {
  if (!query || !text) return truncateText(text, maxLength);
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) return truncateText(text, maxLength);
  
  let start = Math.max(0, index - 30);
  let end = Math.min(text.length, start + maxLength);
  
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
}

const HighlightedText = ({ text, highlight, style, highlightStyle, numberOfLines }: any) => {
  if (!highlight || !highlight.trim()) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  // Escape special regex characters
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part: string, i: number) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text key={i} style={[style, highlightStyle]}>{part}</Text>
        ) : (
          <Text key={i} style={style}>{part}</Text>
        )
      )}
    </Text>
  );
};

export default function NoteCard({ note, onPress, onLongPress, searchQuery }: NoteCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(note)}
      onLongPress={() => onLongPress?.(note)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="file-document-outline" size={22} color={Colors.primary} />
      </View>
      <View style={styles.content}>
        <HighlightedText
          text={note.title}
          highlight={searchQuery}
          style={styles.title}
          highlightStyle={styles.highlightedText}
          numberOfLines={1}
        />
        <HighlightedText
          text={getSnippet(note.content, searchQuery, 100)}
          highlight={searchQuery}
          style={styles.preview}
          highlightStyle={styles.highlightedText}
          numberOfLines={2}
        />
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {note.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryUltralight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  preview: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  highlightedText: {
    color: Colors.tagPersonal,
    fontWeight: 'bold',
  },
});
