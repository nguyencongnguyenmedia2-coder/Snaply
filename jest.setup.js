/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-expo-push-token' }),
}));

jest.mock('expo-widgets', () => ({
  createWidget: jest.fn((name, _component, initialProps) => ({
    name,
    updateSnapshot: jest.fn(),
    reload: jest.fn(),
    updateTimeline: jest.fn(),
    getTimeline: jest.fn().mockResolvedValue([]),
    initialProps,
  })),
  widgetsDirectory: 'file:///mock/widgetsDirectory',
}));

jest.mock('@expo/ui/swift-ui', () => ({
  Text: 'Text',
  VStack: 'VStack',
  HStack: 'HStack',
  ZStack: 'ZStack',
  Spacer: 'Spacer',
  Image: 'Image',
}));

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  font: jest.fn(),
  foregroundStyle: jest.fn(),
  background: jest.fn(),
  cornerRadius: jest.fn(),
  padding: jest.fn(),
  widgetURL: jest.fn(),
}));

jest.mock('@expo/ui/jetpack-compose', () => ({
  Box: 'Box',
  Column: 'Column',
  Row: 'Row',
  Spacer: 'Spacer',
  Text: 'Text',
}));

jest.mock('@expo/ui/jetpack-compose/modifiers', () => ({
  background: jest.fn(),
  cornerRadius: jest.fn(),
  fillMaxSize: jest.fn(),
  fillMaxWidth: jest.fn(),
  paddingAll: jest.fn(),
}));
