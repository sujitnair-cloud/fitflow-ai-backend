import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import TimerHomeScreen from '../screens/TimerHomeScreen';
import AICoachScreen from '../screens/AICoachScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutListScreen from '../screens/WorkoutListScreen';
import WorkoutPlayerScreen from '../screens/WorkoutPlayerScreen';
import WorkoutSummaryScreen from '../screens/WorkoutSummaryScreen';
import CustomBuilderScreen from '../screens/CustomBuilderScreen';

// Auth & onboarding screens
import WelcomeScreen from '../screens/WelcomeScreen';
import AuthScreen from '../screens/AuthScreen';
import OnboardingGoalScreen from '../screens/OnboardingGoalScreen';
import OnboardingProfileScreen from '../screens/OnboardingProfileScreen';
import PARQScreen from '../screens/PARQScreen';

import { useAuthStore } from '../store/authStore';

import type { RootStackParamList } from '../types/workout';
import type { AuthStackParamList, OnboardingStackParamList } from '../types/auth';

// ── Navigators ────────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Tab = createBottomTabNavigator();

const ACTIVE_COLOR = '#6C63FF';
const INACTIVE_COLOR = '#555577';
const BG_COLOR = '#0F0F23';
const BORDER_COLOR = '#1E1E3A';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Timer: { active: 'timer', inactive: 'timer-outline' },
  'AI Coach': { active: 'sparkles', inactive: 'sparkles-outline' },
  Progress: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

// ── Auth stack (Welcome → Auth) ───────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen
        name="Auth"
        component={AuthScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </AuthStack.Navigator>
  );
}

// ── Onboarding stack (Goal → Profile → PARQ) ─────────────────────────────────

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="OnboardingGoal" component={OnboardingGoalScreen} />
      <OnboardingStack.Screen
        name="OnboardingProfile"
        component={OnboardingProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <OnboardingStack.Screen
        name="PARQ"
        component={PARQScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </OnboardingStack.Navigator>
  );
}

// ── Bottom tabs ───────────────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: BG_COLOR,
          borderTopColor: BORDER_COLOR,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: BG_COLOR, borderBottomColor: BORDER_COLOR, borderBottomWidth: 1 } as object,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Timer"
        component={TimerHomeScreen}
        options={{ headerTitle: 'Timer' }}
      />
      <Tab.Screen name="AI Coach" component={AICoachScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Main app stack (tabs + full-screen overlays) ──────────────────────────────

function MainNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />

      <RootStack.Screen
        name="WorkoutPlayer"
        component={WorkoutPlayerScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
      />

      <RootStack.Screen
        name="WorkoutSummary"
        component={WorkoutSummaryScreen}
        options={{ animation: 'fade' }}
      />

      <RootStack.Screen
        name="CustomBuilder"
        component={CustomBuilderScreen}
        options={{
          headerShown: true,
          title: 'Build Workout',
          headerStyle: { backgroundColor: BG_COLOR } as object,
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerBackTitle: 'Timer',
          animation: 'slide_from_right',
        }}
      />

      <RootStack.Screen
        name="WorkoutList"
        component={WorkoutListScreen}
        options={{
          headerShown: true,
          title: 'Workout Library',
          headerStyle: { backgroundColor: BG_COLOR } as object,
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerBackTitle: 'Timer',
          animation: 'slide_from_right',
        }}
      />
    </RootStack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { user, token, profile, hydrated, isGuest } = useAuthStore();

  const isAuthenticated = !!token && !!user;
  const isOnboarded    = profile?.onboardingComplete === true;
  // Guests skip auth AND onboarding — go straight to the main app
  const canAccessApp   = isAuthenticated || isGuest;

  return (
    <NavigationContainer>
      {!hydrated ? (
        <View style={{ flex: 1, backgroundColor: '#0F0F23', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      ) : !canAccessApp ? (
        <AuthNavigator />
      ) : !isOnboarded && !isGuest ? (
        <OnboardingNavigator />
      ) : (
        <MainNavigator />
      )}
    </NavigationContainer>
  );
}
