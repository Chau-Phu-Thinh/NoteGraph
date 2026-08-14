import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Circle, Line, Text as SvgText } from 'react-native-svg';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import FilterChips from '../components/FilterChips';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import { Colors, Spacing, Radius, Typography, Shadows } from '../theme/tokens';
import { Note, NoteLink } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'GraphView'>;

interface GraphNode {
  id: string;
  title: string;
  tags?: { id: string; name: string }[];
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;

export default function GraphViewScreen({ navigation }: Props) {
  const { getAllNotesWithLinks, tags } = useApp();

  const [notes, setNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<NoteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('All');

  // Reanimated shared values for Pan & Zoom
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Fetch graph data on focus
  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllNotesWithLinks();
      setNotes(data.notes || []);
      setLinks(data.links || []);
    } catch (error) {
      console.error('Error fetching graph data:', error);
    } finally {
      setLoading(false);
    }
  }, [getAllNotesWithLinks]);

  useFocusEffect(
    useCallback(() => {
      fetchGraphData();
    }, [fetchGraphData])
  );

  // Compute tag chips list
  const chipOptions = useMemo(() => {
    const allTagNames = tags.map((t) => t.name);
    // Also include any tag name present in notes but missing from tags table
    notes.forEach((n) => {
      n.tags?.forEach((t) => {
        if (!allTagNames.includes(t.name)) {
          allTagNames.push(t.name);
        }
      });
    });
    return ['All', ...Array.from(new Set(allTagNames))];
  }, [tags, notes]);

  // Force-directed layout simulation
  const { graphNodes, validLinks } = useMemo(() => {
    if (notes.length === 0) {
      return { graphNodes: [], validLinks: [] };
    }

    const nodeMap = new Map<string, GraphNode>();
    const count = notes.length;
    const initialRadius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35;

    // 1. Initialize node positions (circle layout as starting point)
    notes.forEach((note, index) => {
      const angle = count === 1 ? 0 : (index / count) * 2 * Math.PI;
      const x = count === 1 ? CENTER_X : CENTER_X + initialRadius * Math.cos(angle);
      const y = count === 1 ? CENTER_Y : CENTER_Y + initialRadius * Math.sin(angle);

      nodeMap.set(note.id, {
        id: note.id,
        title: note.title || 'Untitled Note',
        tags: note.tags,
        x,
        y,
        vx: 0,
        vy: 0,
      });
    });

    // 2. Filter valid links (both source and target must exist)
    const valid = links.filter(
      (link) => nodeMap.has(link.source_id) && nodeMap.has(link.target_id)
    );

    const nodesArr = Array.from(nodeMap.values());

    // Run force-directed simulation if more than 1 node
    if (count > 1) {
      const iterations = 100;
      const k = Math.sqrt((CANVAS_WIDTH * CANVAS_HEIGHT) / count);
      const repulsionConst = k * k * 1.8;
      const attractionConst = 0.06;
      const gravityConst = 0.025;
      const damping = 0.85;
      const padding = 70;

      for (let iter = 0; iter < iterations; iter++) {
        // Repulsion forces between node pairs
        for (let i = 0; i < nodesArr.length; i++) {
          for (let j = i + 1; j < nodesArr.length; j++) {
            const nodeA = nodesArr[i];
            const nodeB = nodesArr[j];

            let dx = nodeA.x - nodeB.x;
            let dy = nodeA.y - nodeB.y;
            let distSq = dx * dx + dy * dy;

            if (distSq === 0) {
              dx = (Math.random() - 0.5) * 2;
              dy = (Math.random() - 0.5) * 2;
              distSq = dx * dx + dy * dy;
            }

            const dist = Math.sqrt(distSq);
            const force = repulsionConst / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            nodeA.vx += fx;
            nodeA.vy += fy;
            nodeB.vx -= fx;
            nodeB.vy -= fy;
          }
        }

        // Attraction forces along links
        for (const link of valid) {
          const source = nodeMap.get(link.source_id);
          const target = nodeMap.get(link.target_id);
          if (!source || !target) continue;

          let dx = source.x - target.x;
          let dy = source.y - target.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = dist * attractionConst;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          source.vx -= fx;
          source.vy -= fy;
          target.vx += fx;
          target.vy += fy;
        }

        // Gravity pulling toward center
        for (const node of nodesArr) {
          const dx = CENTER_X - node.x;
          const dy = CENTER_Y - node.y;
          node.vx += dx * gravityConst;
          node.vy += dy * gravityConst;
        }

        // Update positions & bound within canvas
        for (const node of nodesArr) {
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          const maxSpeed = 16;
          if (speed > maxSpeed) {
            node.vx = (node.vx / speed) * maxSpeed;
            node.vy = (node.vy / speed) * maxSpeed;
          }

          node.x += node.vx;
          node.y += node.vy;
          node.vx *= damping;
          node.vy *= damping;

          node.x = Math.max(padding, Math.min(CANVAS_WIDTH - padding, node.x));
          node.y = Math.max(padding, Math.min(CANVAS_HEIGHT - padding, node.y));
        }
      }
    }

    return { graphNodes: nodesArr, validLinks: valid };
  }, [notes, links]);

  // Fast map lookup for node matching
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graphNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graphNodes]);

  // Tag filter match logic
  const isNodeMatchingTag = useCallback(
    (node: GraphNode) => {
      if (selectedTag === 'All') return true;
      return (
        node.tags?.some(
          (t) => t.name.toLowerCase() === selectedTag.toLowerCase()
        ) ?? false
      );
    },
    [selectedTag]
  );

  const isLinkMatchingTag = useCallback(
    (link: NoteLink) => {
      if (selectedTag === 'All') return true;
      const source = nodeMap.get(link.source_id);
      const target = nodeMap.get(link.target_id);
      const sourceMatch = source ? isNodeMatchingTag(source) : false;
      const targetMatch = target ? isNodeMatchingTag(target) : false;
      return sourceMatch || targetMatch;
    },
    [selectedTag, nodeMap, isNodeMatchingTag]
  );

  // Gesture handling for pan & zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.1, Math.min(savedScale.value * e.scale, 5.0));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .minDistance(8)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Reset zoom & position
  const handleResetZoom = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    savedTranslateX.value = 0;
    translateY.value = withSpring(0);
    savedTranslateY.value = 0;
  };

  // Node tap handler -> navigate to NoteEditor in view mode
  const handleNodePress = (noteId: string) => {
    navigation.navigate('NoteEditor', { noteId, mode: 'view' });
  };

  // FAB tap handler -> create new note
  const handleFabPress = () => {
    navigation.navigate('NoteEditor', { mode: 'create' });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <Header
        title="Graph View"
        onMenuPress={() => navigation.getParent()?.dispatch(DrawerActions.openDrawer())}
      />

      {/* Tag Filter Chips */}
      {chipOptions.length > 1 && (
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollView}
          >
            <FilterChips
              chips={chipOptions}
              selected={selectedTag}
              onSelect={setSelectedTag}
            />
          </ScrollView>
        </View>
      )}

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            icon="graph-outline"
            title="No notes yet"
            subtitle="Create your first note to build an interactive note graph."
          />
        </View>
      ) : (
        <GestureHandlerRootView style={styles.graphContainer}>
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
              <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
                {/* Edges */}
                {validLinks.map((link, idx) => {
                  const source = nodeMap.get(link.source_id);
                  const target = nodeMap.get(link.target_id);
                  if (!source || !target) return null;

                  const isMatched = isLinkMatchingTag(link);
                  const strokeColor = isMatched ? '#A78BFA' : Colors.border;
                  const strokeWidth = isMatched ? 2.5 : 1.2;
                  const opacity = isMatched ? 0.8 : 0.15;

                  return (
                    <Line
                      key={`link-${link.source_id}-${link.target_id}-${idx}`}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={opacity}
                    />
                  );
                })}

                {/* Nodes */}
                {graphNodes.map((node) => {
                  const isMatched = isNodeMatchingTag(node);
                  const nodeOpacity = isMatched ? 1.0 : 0.25;
                  const circleRadius = isMatched ? 22 : 18;
                  const fill = isMatched ? Colors.primary : '#C4B5FD';
                  const stroke = isMatched ? '#EDE9FE' : '#E5E7EB';
                  const strokeWidth = isMatched ? 3 : 1;

                  const truncatedTitle =
                    node.title.length > 14
                      ? `${node.title.slice(0, 12)}...`
                      : node.title;

                  return (
                    <G
                      key={`node-${node.id}`}
                      onPress={() => handleNodePress(node.id)}
                      opacity={nodeOpacity}
                    >
                      {/* Purple Node Circle */}
                      <Circle
                        cx={node.x}
                        cy={node.y}
                        r={circleRadius}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                      />

                      {/* Note Title Label */}
                      <SvgText
                        x={node.x}
                        y={node.y + circleRadius + 15}
                        fill={isMatched ? Colors.textPrimary : Colors.textSecondary}
                        fontSize={12}
                        fontWeight={isMatched ? '600' : '400'}
                        textAnchor="middle"
                      >
                        {truncatedTitle}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </Animated.View>
          </GestureDetector>

          {/* Graph Helper Control (Reset Zoom) */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetZoom}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="aspect-ratio"
              size={20}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        </GestureHandlerRootView>
      )}

      {/* FAB */}
      <FAB onPress={handleFabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterWrapper: {
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScrollView: {
    paddingHorizontal: Spacing.screenPadding,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },
  graphContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  canvasWrapper: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.fab,
  },
});
