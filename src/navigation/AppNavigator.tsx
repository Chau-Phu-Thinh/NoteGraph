import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '../theme/tokens';

import NotesListScreen from '../screens/NotesListScreen';
import NoteEditorScreen from '../screens/NoteEditorScreen';
import SearchScreen from '../screens/SearchScreen';
import TaskScreen from '../screens/TaskScreen';
import GraphViewScreen from '../screens/GraphViewScreen';

import type { Note } from '../types';

// Stack param types
export type RootStackParamList = {
  NotesList: undefined;
  NoteEditor: { noteId?: string; mode: 'create' | 'edit' | 'view' };
  Search: undefined;
  TaskScreen: undefined;
  GraphView: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator();

// Custom Drawer Content — no avatar, back arrow to close
function CustomDrawerContent({ navigation }: any) {
  const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index]?.name;

  const menuItems = [
    { name: 'All Notes', icon: 'note-multiple-outline', screen: 'NotesStack' },
    { name: 'Tasks', icon: 'checkbox-marked-circle-outline', screen: 'TasksStack' },
    { name: 'Graph View', icon: 'graph-outline', screen: 'GraphStack' },
  ];

  return (
    <View style={drawerStyles.container}>
      <View style={drawerStyles.header}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => navigation.closeDrawer()}
          style={drawerStyles.closeButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={drawerStyles.menuList}>
        {menuItems.map((item) => {
          const isActive = currentRoute === item.screen;
          return (
            <TouchableOpacity
              key={item.name}
              style={[drawerStyles.menuItem, isActive && drawerStyles.menuItemActive]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={22}
                color={isActive ? '#FFFFFF' : Colors.textPrimary}
              />
              <Text style={[drawerStyles.menuText, isActive && drawerStyles.menuTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Notes Stack
function NotesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="NotesList" component={NotesListScreen} />
      <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
    </Stack.Navigator>
  );
}

// Tasks Stack
function TasksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="TaskScreen" component={TaskScreen} />
    </Stack.Navigator>
  );
}

// Graph Stack
function GraphStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="GraphView" component={GraphViewScreen} />
      <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: Colors.surface,
            width: 280,
          },
          swipeEdgeWidth: 50,
        }}
      >
        <Drawer.Screen name="NotesStack" component={NotesStack} />
        <Drawer.Screen name="TasksStack" component={TasksStack} />
        <Drawer.Screen name="GraphStack" component={GraphStack} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

const drawerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuList: {
    paddingHorizontal: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: 4,
    minHeight: 48,
  },
  menuItemActive: {
    backgroundColor: Colors.primary,
  },
  menuText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
    fontWeight: '500',
  },
  menuTextActive: {
    color: '#FFFFFF',
  },
});
