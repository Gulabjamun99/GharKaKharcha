import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { COLORS } from '@/utils/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: { name: string; title: string; icon: IoniconName; iconFocused: IoniconName }[] = [
  { name: 'index', title: 'Dashboard', icon: 'home-outline', iconFocused: 'home' },
  { name: 'entry', title: 'Kharcha', icon: 'add-circle-outline', iconFocused: 'add-circle' },
  { name: 'monthly', title: 'Mahina', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'yearly', title: 'Saal', icon: 'stats-chart-outline', iconFocused: 'stats-chart' },
  { name: 'export', title: 'Export', icon: 'share-outline', iconFocused: 'share' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      {TAB_CONFIG.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
