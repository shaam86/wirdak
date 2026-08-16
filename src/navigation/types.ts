import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type QuranStackParamList = {
  SurahList: undefined;
  SurahDetail: {
    surahNumber: number;
    surahName: string;
    startAyah?: number;
    autoPlay?: boolean;
    highlightAyah?: number;
    khatmahId?: string;
  };
  SmartSearch: undefined;
  MushafBrowse: { page?: number } | undefined;
};

/** الرئيسية + الختمات + المسبحة (خارج تبويب المزيد) */
export type HomeStackParamList = {
  HomeMain: undefined;
  KhatmahList: undefined;
  KhatmahDetail: { khatmahId: string };
  KhatmahPage: { khatmahId: string };
  Tasbih: undefined;
  HifzTouchPicker: undefined;
  HifzTouchSession: { surahNumber: number; surahName: string; startAyah?: number };
};

/** @deprecated استخدم HomeStackParamList */
export type WirdStackParamList = HomeStackParamList;

export type AdhkarStackParamList = {
  AdhkarList: undefined;
  AdhkarDetail: { categoryId: string; focusItemId?: string };
};

/** المزيد — بدون المسبحة حتى لا يعلق التبويب عليها */
export type MoreStackParamList = {
  MoreMenu: undefined;
  Qibla: undefined;
  AppSettings: undefined;
  Reminders: undefined;
  Bookmarks: undefined;
  Dashboard: undefined;
  Search: undefined;
  PrivacyPolicy: undefined;
};

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Adhkar: NavigatorScreenParams<AdhkarStackParamList> | undefined;
  Prayer: undefined;
  Index: NavigatorScreenParams<QuranStackParamList>;
  More: NavigatorScreenParams<MoreStackParamList> | undefined;
};

export type TabNavigation = BottomTabNavigationProp<RootTabParamList>;

export type QuranListNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<QuranStackParamList, 'SurahList'>,
  BottomTabNavigationProp<RootTabParamList>
>;

export type AdhkarListNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<AdhkarStackParamList, 'AdhkarList'>,
  BottomTabNavigationProp<RootTabParamList>
>;

export type MoreMenuNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList, 'MoreMenu'>,
  BottomTabNavigationProp<RootTabParamList>
>;
