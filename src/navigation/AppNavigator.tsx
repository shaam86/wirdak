import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  CommonActions,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Text, Pressable } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '../components/Icon';
import { AdhkarDetailScreen } from '../screens/AdhkarDetailScreen';
import { AdhkarListScreen } from '../screens/AdhkarListScreen';
import { BookmarksScreen } from '../screens/BookmarksScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { HifzTouchPickerScreen } from '../screens/HifzTouchPickerScreen';
import { HifzTouchSessionScreen } from '../screens/HifzTouchSessionScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { KhatmahDetailScreen } from '../screens/KhatmahDetailScreen';
import { KhatmahListScreen } from '../screens/KhatmahListScreen';
import { KhatmahPageScreen } from '../screens/KhatmahPageScreen';
import { MushafBrowseScreen } from '../screens/MushafBrowseScreen';
import { MoreMenuScreen } from '../screens/MoreMenuScreen';
import { PrayerTimesScreen } from '../screens/PrayerTimesScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { QiblaScreen } from '../screens/QiblaScreen';
import { RemindersScreen } from '../screens/RemindersScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SurahDetailScreen } from '../screens/SurahDetailScreen';
import { SurahListScreen } from '../screens/SurahListScreen';
import { TasbihScreen } from '../screens/TasbihScreen';
import { useI18n } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import {
  AdhkarStackParamList,
  HomeStackParamList,
  MoreStackParamList,
  QuranStackParamList,
  RootTabParamList,
} from './types';

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

const Tab = createBottomTabNavigator<RootTabParamList>();
const QuranStack = createNativeStackNavigator<QuranStackParamList>();
const AdhkarStack = createNativeStackNavigator<AdhkarStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, IconName> = {
  Home: 'home',
  Adhkar: 'sun',
  Prayer: 'clock',
  Index: 'book-open',
  More: 'menu',
};

function stackScreenOptions(colors: { primary: string }, fonts: { uiBold: string }) {
  return {
    headerStyle: { backgroundColor: colors.primary },
    headerTintColor: '#fff',
    headerTitleAlign: 'center' as const,
    headerTitleStyle: { fontFamily: fonts.uiBold, fontSize: 17 },
    animation: 'slide_from_left' as const,
    contentStyle: { backgroundColor: 'transparent' },
  };
}

function HeaderBack({
  onPress,
  color = '#fff',
  label,
}: {
  onPress: () => void;
  color?: string;
  label?: string;
}) {
  const { fonts } = useTheme();
  const { t, isRTL } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 2 }}
    >
      <Icon name={isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={color} />
      <Text style={{ color, fontFamily: fonts.uiBold, fontSize: 15 }}>
        {label ?? t('common.back')}
      </Text>
    </Pressable>
  );
}

function goBackInHomeStack(
  navigation: {
    getState: () => { index: number };
    pop: () => void;
    navigate: (name: string, params?: object) => void;
  },
  fallbackScreen: 'HomeMain' | 'KhatmahList' | 'KhatmahDetail',
  fallbackParams?: { khatmahId: string }
) {
  if (navigation.getState().index > 0) {
    navigation.pop();
    return;
  }
  if (fallbackScreen === 'KhatmahDetail' && fallbackParams) {
    navigation.navigate('KhatmahDetail', fallbackParams);
    return;
  }
  navigation.navigate(fallbackScreen);
}

function HomeNavigator() {
  const { colors, fonts } = useTheme();
  const { t } = useI18n();
  return (
    <HomeStack.Navigator
      initialRouteName="HomeMain"
      screenOptions={stackScreenOptions(colors, fonts)}
    >
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen
        name="KhatmahList"
        component={KhatmahListScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="KhatmahDetail"
        component={KhatmahDetailScreen}
        options={({ navigation }) => ({
          title: t('nav.khatmahDetail'),
          headerLeft: () => (
            <HeaderBack onPress={() => goBackInHomeStack(navigation, 'KhatmahList')} />
          ),
        })}
      />
      <HomeStack.Screen
        name="KhatmahPage"
        component={KhatmahPageScreen}
        options={({ navigation, route }) => ({
          title: t('nav.khatmahPage'),
          headerStyle: { backgroundColor: colors.sand },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text, fontFamily: fonts.uiBold },
          headerShadowVisible: false,
          headerLeft: () => (
            <HeaderBack
              color={colors.accent}
              onPress={() =>
                goBackInHomeStack(navigation, 'KhatmahDetail', {
                  khatmahId: route.params.khatmahId,
                })
              }
            />
          ),
        })}
      />
      <HomeStack.Screen
        name="Tasbih"
        component={TasbihScreen}
        options={({ navigation }) => ({
          title: t('nav.tasbih'),
          headerShown: true,
          headerLeft: () => (
            <HeaderBack
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.navigate('HomeMain');
              }}
            />
          ),
        })}
      />
      <HomeStack.Screen
        name="HifzTouchPicker"
        component={HifzTouchPickerScreen}
        options={({ navigation }) => ({
          title: t('nav.hifz'),
          headerLeft: () => (
            <HeaderBack
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.navigate('HomeMain');
              }}
            />
          ),
        })}
      />
      <HomeStack.Screen
        name="HifzTouchSession"
        component={HifzTouchSessionScreen}
        options={({ route, navigation }) => ({
          title: route.params.surahName,
          headerBackTitle: t('nav.hifz'),
          headerLeft: () => (
            <HeaderBack
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.navigate('HifzTouchPicker');
              }}
            />
          ),
        })}
      />
    </HomeStack.Navigator>
  );
}

function IndexNavigator() {
  const { colors, fonts } = useTheme();
  const { t } = useI18n();
  return (
    <QuranStack.Navigator
      initialRouteName="SurahList"
      screenOptions={stackScreenOptions(colors, fonts)}
    >
      <QuranStack.Screen name="SurahList" component={SurahListScreen} options={{ headerShown: false }} />
      <QuranStack.Screen
        name="SurahDetail"
        component={SurahDetailScreen}
        getId={({ params }) =>
          `s${params.surahNumber}-a${params.highlightAyah ?? params.startAyah ?? 0}-k${params.khatmahId ?? ''}`
        }
        options={({ route }) => ({
          title: route.params.khatmahId
            ? t('nav.khatmahWird', { name: route.params.surahName })
            : t('nav.surah', { name: route.params.surahName }),
          headerStyle: { backgroundColor: colors.sand },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text, fontFamily: fonts.uiBold, fontSize: 17 },
          headerShadowVisible: false,
        })}
      />
      <QuranStack.Screen
        name="SmartSearch"
        component={SearchScreen}
        options={{ title: t('nav.smartSearch'), headerBackTitle: t('nav.indexBack') }}
      />
      <QuranStack.Screen
        name="MushafBrowse"
        component={MushafBrowseScreen}
        options={{ title: t('nav.mushaf'), headerBackTitle: t('nav.indexBack') }}
      />
    </QuranStack.Navigator>
  );
}

function AdhkarNavigator() {
  const { colors, fonts } = useTheme();
  const { t } = useI18n();
  return (
    <AdhkarStack.Navigator screenOptions={stackScreenOptions(colors, fonts)}>
      <AdhkarStack.Screen name="AdhkarList" component={AdhkarListScreen} options={{ headerShown: false }} />
      <AdhkarStack.Screen name="AdhkarDetail" component={AdhkarDetailScreen} options={{ title: t('nav.adhkar') }} />
    </AdhkarStack.Navigator>
  );
}

type MoreNav = {
  canGoBack: () => boolean;
  goBack: () => void;
  getState: () => { index: number; routes: { name: string }[] };
  getParent: () => { navigate: (name: string, params?: object) => void } | undefined;
};

/** رجوع داخل المزيد، أو إلى الرئيسية إن فُتحت الشاشة من اختصار الرئيسية */
function goBackFromMoreScreen(navigation: MoreNav) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.getParent()?.navigate('Home', { screen: 'HomeMain' });
}

function moreScreenHeaderLeft(navigation: MoreNav) {
  return <HeaderBack onPress={() => goBackFromMoreScreen(navigation)} />;
}

/** زر رجوع الجهاز عندما تكون الشاشة وحيدة (اختصار الرئيسية) */
function moreScreenListeners(navigation: MoreNav) {
  return {
    beforeRemove: (e: { data: { action: { type: string } }; preventDefault: () => void }) => {
      const type = e.data.action.type;
      if (type !== 'GO_BACK' && type !== 'POP') return;
      const state = navigation.getState();
      if (state.index === 0 && state.routes[0]?.name !== 'MoreMenu') {
        e.preventDefault();
        navigation.getParent()?.navigate('Home', { screen: 'HomeMain' });
      }
    },
  };
}

function MoreNavigator() {
  const { colors, fonts } = useTheme();
  const { t } = useI18n();
  return (
    <MoreStack.Navigator
      initialRouteName="MoreMenu"
      screenOptions={stackScreenOptions(colors, fonts)}
    >
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ headerShown: false }} />
      <MoreStack.Screen
        name="Qibla"
        component={QiblaScreen}
        options={({ navigation }) => ({
          title: t('nav.qibla'),
          headerLeft: () => moreScreenHeaderLeft(navigation),
        })}
        listeners={({ navigation }) => moreScreenListeners(navigation)}
      />
      <MoreStack.Screen
        name="AppSettings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          title: t('nav.settings'),
          headerLeft: () => moreScreenHeaderLeft(navigation),
        })}
        listeners={({ navigation }) => moreScreenListeners(navigation)}
      />
      <MoreStack.Screen
        name="Reminders"
        component={RemindersScreen}
        options={({ navigation }) => ({
          title: t('nav.reminders'),
          headerLeft: () => moreScreenHeaderLeft(navigation),
        })}
        listeners={({ navigation }) => moreScreenListeners(navigation)}
      />
      <MoreStack.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={({ navigation }) => ({
          title: t('nav.bookmarks'),
          headerLeft: () => moreScreenHeaderLeft(navigation),
        })}
        listeners={({ navigation }) => moreScreenListeners(navigation)}
      />
      <MoreStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          title: t('nav.dashboard'),
          headerLeft: () => moreScreenHeaderLeft(navigation),
        })}
        listeners={({ navigation }) => moreScreenListeners(navigation)}
      />
      <MoreStack.Screen
        name="Search"
        component={SearchScreen}
        options={({ navigation }) => ({
          title: t('nav.smartSearch'),
          headerLeft: () => moreScreenHeaderLeft(navigation),
        })}
        listeners={({ navigation }) => moreScreenListeners(navigation)}
      />
      <MoreStack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={({ navigation }) => ({
          title: t('nav.privacy'),
          headerLeft: () => moreScreenHeaderLeft(navigation),
        })}
        listeners={({ navigation }) => moreScreenListeners(navigation)}
      />
    </MoreStack.Navigator>
  );
}

function Tabs() {
  const { colors, isDark, fonts, scale, elderMode } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const tabHeight = (elderMode ? 72 : 64) + bottomPad;

  return (
    <Tab.Navigator
      backBehavior="none"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: scale(11),
          fontFamily: fonts.uiBold,
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: bottomPad,
          height: tabHeight,
          paddingBottom: Math.max(bottomPad - 2, 6),
          paddingTop: 6,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          elevation: 12,
          shadowColor: colors.primaryDark,
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          overflow: 'visible',
        },
        tabBarIcon: ({ focused, color }) => (
          <Icon
            name={TAB_ICONS[route.name]}
            size={22}
            color={color}
            focused={focused}
            filled={focused}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="Adhkar" component={AdhkarNavigator} options={{ title: t('tabs.adhkar') }} />
      <Tab.Screen name="Prayer" component={PrayerTimesScreen} options={{ title: t('tabs.prayer') }} />
      <Tab.Screen name="Index" component={IndexNavigator} options={{ title: t('tabs.index') }} />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{ title: t('tabs.more') }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.dispatch(
              CommonActions.navigate({
                name: 'More',
                params: {
                  state: {
                    routes: [{ name: 'MoreMenu' }],
                    index: 0,
                  },
                },
              })
            );
          },
        })}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Tabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
