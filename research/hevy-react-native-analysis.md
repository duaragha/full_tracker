# Hevy Mobile App - React Native Technical Analysis

## Executive Summary

Hevy is a workout tracking app with 1M+ downloads that uses React Native for cross-platform development. Based on app analysis, performance characteristics, and industry patterns, this document provides a detailed technical breakdown of their likely implementation.

---

## 1. Core React Native Libraries & Packages

### Navigation Stack
- **React Navigation v6+** (most likely implementation)
  - Native Stack Navigator for iOS/Android native transitions
  - Bottom Tab Navigator for main app navigation
  - Custom gesture handlers for swipe interactions
  - Deep linking integration with workout routes

### UI Component Libraries
```javascript
// Core UI Framework (estimated)
{
  "@shopify/restyle": "^2.4.2",  // Type-safe styling system
  "react-native-reanimated": "^3.x",  // High-performance animations
  "react-native-gesture-handler": "^2.x",  // Native gesture support
  "react-native-safe-area-context": "^4.x",  // Safe area handling
  "react-native-svg": "^13.x",  // Charts and graphs
  "react-native-fast-image": "^8.x"  // Optimized image loading
}
```

### State Management
```javascript
// State architecture (likely)
{
  "@tanstack/react-query": "^4.x",  // Server state management
  "zustand": "^4.x",  // Client state (lightweight)
  "react-native-mmkv": "^2.x",  // Ultra-fast local storage
  "realm": "^11.x" or "@nozbe/watermelondb": "^0.27.x"  // Local database
}
```

### Performance & Monitoring
```javascript
{
  "@sentry/react-native": "^5.x",  // Crash reporting
  "react-native-performance": "^5.x",  // Performance monitoring
  "react-native-firebase": "^18.x",  // Analytics, push notifications
  "flipper-plugin-*": "development tools"
}
```

---

## 2. Native-Like Performance Achievements

### A. List Virtualization
```typescript
// Workout history list optimization
import { FlashList } from '@shopify/flash-list';

const WorkoutHistoryList = () => (
  <FlashList
    data={workouts}
    estimatedItemSize={120}
    renderItem={({ item }) => <WorkoutCard workout={item} />}
    getItemType={(item) => item.type}  // Recycling optimization
    drawDistance={400}
    removeClippedSubviews={true}
  />
);
```

**Key optimizations:**
- FlashList instead of FlatList (10x better performance)
- Item type separation for better recycling
- Optimistic UI updates with React Query
- Memoized components with React.memo

### B. JavaScript Thread Optimization
```typescript
// Offload heavy calculations to native thread
import { runOnUI } from 'react-native-reanimated';

const calculateOneRepMax = (weight: number, reps: number) => {
  'worklet';
  return weight * (1 + reps / 30);  // Brzycki formula
};

const stats = runOnUI(calculateOneRepMax)(225, 8);
```

### C. Native Modules
```typescript
// Custom native modules for critical paths
// iOS: Swift modules
// Android: Kotlin modules

interface CustomModules {
  DatabaseManager: {
    bulkInsertWorkouts: (workouts: Workout[]) => Promise<void>;
    queryWorkoutsByDateRange: (start: Date, end: Date) => Promise<Workout[]>;
  };
  ImageCompressor: {
    compressAndResize: (uri: string, quality: number) => Promise<string>;
  };
  TimerService: {
    startRestTimer: (duration: number) => void;
    stopRestTimer: () => void;
  };
}
```

---

## 3. Animations & Transitions Architecture

### A. Shared Element Transitions
```typescript
import { SharedElement } from 'react-native-shared-element';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';

// Workout detail expansion animation
const WorkoutCard = ({ workout, onPress }) => (
  <Pressable onPress={onPress}>
    <SharedElement id={`workout.${workout.id}.card`}>
      <View style={styles.card}>
        <SharedElement id={`workout.${workout.id}.title`}>
          <Text>{workout.name}</Text>
        </SharedElement>
      </View>
    </SharedElement>
  </Pressable>
);
```

### B. Reanimated 3 Worklets
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing
} from 'react-native-reanimated';

// Rest timer countdown animation
const RestTimerAnimation = ({ duration }) => {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(progress.value === 1 ? 1.2 : 1) }
    ],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      ['#4CAF50', '#FFC107', '#F44336']
    )
  }));

  return <Animated.View style={animatedStyle} />;
};
```

### C. Gesture-Driven Animations
```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

// Swipe to delete workout set
const SwipeableSetRow = ({ set, onDelete }) => {
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onChange((e) => {
      translateX.value = Math.max(-100, e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX < -75) {
        runOnJS(onDelete)(set.id);
      } else {
        translateX.value = withSpring(0);
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ transform: [{ translateX }] }}>
        {/* Set content */}
      </Animated.View>
    </GestureDetector>
  );
};
```

---

## 4. Custom Components vs Libraries

### Custom Components Built
```typescript
// 1. Timer System (custom for precision)
class RestTimer {
  private interval: NodeJS.Timer;
  private startTime: number;

  start(duration: number, onTick: (remaining: number) => void) {
    this.startTime = Date.now();
    this.interval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, duration - elapsed);
      onTick(remaining);
      if (remaining === 0) this.stop();
    }, 100);
  }
}

// 2. Exercise Video Player (custom controls)
const ExerciseVideoPlayer = ({ videoUrl, onComplete }) => {
  return (
    <Video
      source={{ uri: videoUrl }}
      resizeMode="cover"
      repeat={true}
      paused={false}
      muted={true}
      style={styles.video}
      controls={false}  // Custom controls overlay
    />
  );
};

// 3. Workout Calendar (custom heat map)
const WorkoutCalendar = ({ workouts }) => {
  const heatmapData = useMemo(() =>
    generateHeatmapFromWorkouts(workouts), [workouts]
  );

  return (
    <ScrollView horizontal>
      {heatmapData.map(day => (
        <HeatmapCell key={day.date} intensity={day.intensity} />
      ))}
    </ScrollView>
  );
};

// 4. Progress Charts (react-native-svg + custom)
import { LineChart } from 'react-native-chart-kit';

const ProgressChart = ({ data }) => (
  <LineChart
    data={data}
    width={Dimensions.get('window').width - 32}
    height={220}
    chartConfig={{
      backgroundColor: '#1E1E1E',
      backgroundGradientFrom: '#1E1E1E',
      backgroundGradientTo: '#1E1E1E',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    }}
    bezier
  />
);
```

### Library Components Used
```typescript
// Bottom Sheet for exercise selection
import BottomSheet from '@gorhom/bottom-sheet';

// Date picker for workout scheduling
import DateTimePicker from '@react-native-community/datetimepicker';

// Camera for progress photos
import { Camera } from 'react-native-vision-camera';

// Haptic feedback
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
```

---

## 5. Platform-Specific Code Strategy

### File Structure
```
src/
├── components/
│   ├── Button.tsx
│   ├── Button.ios.tsx
│   ├── Button.android.tsx
├── services/
│   ├── notifications/
│   │   ├── index.ts
│   │   ├── notifications.ios.ts
│   │   ├── notifications.android.ts
├── utils/
│   ├── platform.ts
```

### Platform-Specific Implementations
```typescript
// Platform-specific UI adjustments
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.select({
      ios: 44,
      android: StatusBar.currentHeight,
    }),
    shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
    elevation: Platform.OS === 'android' ? 4 : undefined,
  }
});

// Platform-specific native modules
import { NativeModules } from 'react-native';

const { HapticFeedback } = NativeModules;

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
  if (Platform.OS === 'ios') {
    HapticFeedback.trigger(type);
  } else {
    // Android vibration pattern
    Vibration.vibrate(type === 'heavy' ? 50 : 20);
  }
};

// Conditional rendering
const HeaderButton = () => (
  Platform.OS === 'ios' ? (
    <IOSHeaderButton />
  ) : (
    <AndroidHeaderButton />
  )
);
```

### Build Configuration
```javascript
// app.json / app.config.js
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.hevy.app",
      "buildNumber": "1.0.0",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Take progress photos",
        "NSHealthShareUsageDescription": "Sync workouts to Apple Health"
      }
    },
    "android": {
      "package": "com.hevy.app",
      "versionCode": 100,
      "permissions": [
        "CAMERA",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      }
    }
  }
}
```

---

## 6. Navigation Architecture

### Navigation Structure
```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';

type RootStackParamList = {
  MainTabs: undefined;
  WorkoutSession: { workoutId: string };
  ExerciseDetail: { exerciseId: string };
  Settings: undefined;
};

type TabParamList = {
  Home: undefined;
  History: undefined;
  Progress: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => (
        <TabIcon name={route.name} focused={focused} />
      ),
      tabBarActiveTintColor: '#4CAF50',
      tabBarInactiveTintColor: '#888',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Progress" component={ProgressScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => (
  <NavigationContainer
    linking={linkingConfig}
    fallback={<LoadingScreen />}
  >
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkoutSession"
        component={WorkoutSessionScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);
```

### Navigation Performance Optimizations
```typescript
// Lazy loading screens
const HistoryScreen = lazy(() => import('./screens/History'));
const ProgressScreen = lazy(() => import('./screens/Progress'));

// Prefetch navigation data
import { useFocusEffect } from '@react-navigation/native';

const HomeScreen = () => {
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      // Prefetch likely next screen data
      queryClient.prefetchQuery(['exercises'], fetchExercises);
    }, [])
  );
};
```

---

## 7. Apple Watch & Wear OS Integration

### React Native Bridge Architecture
```typescript
// iOS Watch Connectivity
// ios/WatchConnectivity.swift
import WatchConnectivity

@objc(WatchConnectivity)
class WatchConnectivity: NSObject, WCSessionDelegate {

  @objc func startSession() {
    if WCSession.isSupported() {
      let session = WCSession.default
      session.delegate = self
      session.activate()
    }
  }

  @objc func sendWorkoutData(_ data: NSDictionary) {
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(data as! [String : Any], replyHandler: nil)
    }
  }
}

// React Native bridge
// src/services/watch/index.ts
import { NativeModules, NativeEventEmitter } from 'react-native';

const { WatchConnectivity } = NativeModules;
const watchEmitter = new NativeEventEmitter(WatchConnectivity);

export const WatchService = {
  startSession: () => WatchConnectivity.startSession(),

  sendWorkout: (workout: Workout) => {
    WatchConnectivity.sendWorkoutData({
      id: workout.id,
      name: workout.name,
      exercises: workout.exercises,
      startTime: workout.startTime,
    });
  },

  onWorkoutUpdate: (callback: (data: any) => void) => {
    return watchEmitter.addListener('workoutUpdate', callback);
  },
};
```

### Android Wear OS Integration
```kotlin
// android/app/src/main/java/com/hevy/WearModule.kt
class WearModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext),
  MessageClient.OnMessageReceivedListener {

  private var messageClient: MessageClient? = null

  @ReactMethod
  fun connectToWear() {
    messageClient = Wearable.getMessageClient(reactApplicationContext)
    messageClient?.addListener(this)
  }

  @ReactMethod
  fun sendWorkoutToWear(workout: ReadableMap) {
    val nodeClient = Wearable.getNodeClient(reactApplicationContext)
    nodeClient.connectedNodes.addOnSuccessListener { nodes ->
      nodes.forEach { node ->
        messageClient?.sendMessage(
          node.id,
          "/workout_start",
          workout.toString().toByteArray()
        )
      }
    }
  }
}
```

### Watch App Features
```typescript
// Synchronized features between phone and watch
interface WatchSyncData {
  currentWorkout: {
    id: string;
    name: string;
    currentExercise: string;
    currentSet: number;
    restTimer: number;
  };
  heartRate?: number;
  caloriesBurned?: number;
}

// Real-time sync during workout
const useWatchSync = (workoutId: string) => {
  useEffect(() => {
    const subscription = WatchService.onWorkoutUpdate((data) => {
      // Update workout state from watch input
      updateWorkoutSet(data.setId, data.reps, data.weight);
    });

    return () => subscription.remove();
  }, [workoutId]);
};
```

---

## 8. Image & Video Handling (400+ Exercise Videos)

### Video Strategy
```typescript
// Video asset management
interface VideoAsset {
  id: string;
  url: string;
  thumbnail: string;
  duration: number;
  quality: 'sd' | 'hd';
  size: number;
}

// Lazy loading with caching
import Video from 'react-native-video';
import FastImage from 'react-native-fast-image';

const ExerciseVideoLibrary = () => {
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());

  const preloadVideo = useCallback((videoId: string) => {
    // Preload only when entering exercise detail
    const videoUrl = getVideoUrl(videoId);
    // Cache in native layer
    Video.preload(videoUrl);
  }, []);

  return (
    <FlashList
      data={exercises}
      onViewableItemsChanged={({ viewableItems }) => {
        viewableItems.forEach(item => {
          preloadVideo(item.item.videoId);
        });
      }}
      renderItem={({ item }) => (
        <ExerciseCard exercise={item} onPress={() => playVideo(item)} />
      )}
    />
  );
};
```

### Video Optimization Techniques
```typescript
// 1. Multi-quality video sources
const getVideoSource = (exerciseId: string, quality: VideoQuality) => {
  const baseUrl = 'https://cdn.hevy.com/videos';
  return {
    uri: `${baseUrl}/${exerciseId}_${quality}.mp4`,
    headers: {
      'Cache-Control': 'max-age=604800', // 7 days
    },
  };
};

// 2. Adaptive quality based on connection
import NetInfo from '@react-native-community/netinfo';

const useAdaptiveVideoQuality = () => {
  const [quality, setQuality] = useState<'sd' | 'hd'>('hd');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.type === 'cellular' && state.details?.cellularGeneration === '3g') {
        setQuality('sd');
      } else {
        setQuality('hd');
      }
    });

    return unsubscribe;
  }, []);

  return quality;
};

// 3. Video caching strategy
import RNFS from 'react-native-fs';

const VideoCache = {
  cacheDir: `${RNFS.CachesDirectoryPath}/videos`,

  async downloadVideo(videoId: string, url: string): Promise<string> {
    const localPath = `${this.cacheDir}/${videoId}.mp4`;

    const exists = await RNFS.exists(localPath);
    if (exists) return localPath;

    await RNFS.downloadFile({
      fromUrl: url,
      toFile: localPath,
      background: true,
      discretionary: true,
    }).promise;

    return localPath;
  },

  async getCachedVideo(videoId: string): Promise<string | null> {
    const localPath = `${this.cacheDir}/${videoId}.mp4`;
    const exists = await RNFS.exists(localPath);
    return exists ? localPath : null;
  },

  async clearOldCache(daysOld: number = 30) {
    const files = await RNFS.readDir(this.cacheDir);
    const now = Date.now();

    for (const file of files) {
      const ageInDays = (now - file.mtime.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > daysOld) {
        await RNFS.unlink(file.path);
      }
    }
  },
};
```

### Image Handling
```typescript
// Progress photo optimization
import ImageResizer from 'react-native-image-resizer';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const ProgressPhotoService = {
  async captureProgressPhoto(): Promise<string> {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
    });

    if (!result.assets?.[0]?.uri) throw new Error('No image captured');

    // Compress and resize
    const resized = await ImageResizer.createResizedImage(
      result.assets[0].uri,
      1200,
      1200,
      'JPEG',
      80,
      0,
      undefined,
      false,
      { mode: 'contain' }
    );

    return resized.uri;
  },

  async uploadProgressPhoto(uri: string, userId: string): Promise<string> {
    const formData = new FormData();
    formData.append('photo', {
      uri,
      type: 'image/jpeg',
      name: `progress_${Date.now()}.jpg`,
    });

    const response = await fetch(`${API_URL}/users/${userId}/photos`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();
    return data.url;
  },
};

// Fast image loading with caching
const ExerciseThumbnail = ({ exerciseId }) => (
  <FastImage
    source={{
      uri: `https://cdn.hevy.com/thumbnails/${exerciseId}.jpg`,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable,
    }}
    resizeMode={FastImage.resizeMode.cover}
    style={styles.thumbnail}
  />
);
```

---

## 9. Push Notifications Implementation

### Firebase Cloud Messaging Setup
```typescript
// Firebase configuration
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

class NotificationService {
  async initialize() {
    // Request permissions
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      await this.registerDevice();
      this.setupListeners();
    }
  }

  async registerDevice() {
    const fcmToken = await messaging().getToken();
    await this.sendTokenToServer(fcmToken);

    // Handle token refresh
    messaging().onTokenRefresh(async (newToken) => {
      await this.sendTokenToServer(newToken);
    });
  }

  setupListeners() {
    // Foreground messages
    messaging().onMessage(async (remoteMessage) => {
      await this.displayNotification(remoteMessage);
    });

    // Background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      await this.handleBackgroundMessage(remoteMessage);
    });

    // Notification interaction
    messaging().onNotificationOpenedApp((remoteMessage) => {
      this.handleNotificationPress(remoteMessage);
    });

    // App opened from quit state
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          this.handleNotificationPress(remoteMessage);
        }
      });
  }

  async displayNotification(message: FirebaseMessagingTypes.RemoteMessage) {
    const channelId = await notifee.createChannel({
      id: 'workout_reminders',
      name: 'Workout Reminders',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.displayNotification({
      title: message.notification?.title,
      body: message.notification?.body,
      android: {
        channelId,
        smallIcon: 'ic_notification',
        color: '#4CAF50',
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
      },
      ios: {
        sound: 'default',
        badgeCount: 1,
      },
      data: message.data,
    });
  }

  handleNotificationPress(message: FirebaseMessagingTypes.RemoteMessage) {
    const { type, workoutId, routineId } = message.data || {};

    switch (type) {
      case 'workout_reminder':
        navigate('WorkoutSession', { workoutId });
        break;
      case 'rest_timer_complete':
        navigate('WorkoutSession', { workoutId, action: 'nextSet' });
        break;
      case 'achievement_unlocked':
        navigate('Profile', { tab: 'achievements' });
        break;
      default:
        navigate('Home');
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: { hours: number; minutes: number }
  ) {
    await notifee.createTriggerNotification(
      {
        title,
        body,
        android: {
          channelId: 'workout_reminders',
          smallIcon: 'ic_notification',
        },
        ios: {
          sound: 'default',
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: this.getNextTriggerTime(trigger.hours, trigger.minutes),
        repeatFrequency: RepeatFrequency.DAILY,
      }
    );
  }
}

export const notificationService = new NotificationService();
```

### Notification Types
```typescript
interface NotificationPayload {
  type:
    | 'workout_reminder'
    | 'rest_timer_complete'
    | 'achievement_unlocked'
    | 'friend_workout_completed'
    | 'personal_record'
    | 'streak_reminder';
  data: {
    workoutId?: string;
    exerciseId?: string;
    achievementId?: string;
    userId?: string;
  };
}

// Rest timer background notification
export const startRestTimerNotification = async (duration: number) => {
  const endTime = Date.now() + duration * 1000;

  await notifee.displayNotification({
    id: 'rest_timer',
    title: 'Rest Timer',
    body: `${duration}s remaining`,
    android: {
      channelId: 'rest_timer',
      ongoing: true,
      progress: {
        max: duration,
        current: 0,
      },
      actions: [
        {
          title: 'Skip',
          pressAction: { id: 'skip_rest' },
        },
        {
          title: 'Add 30s',
          pressAction: { id: 'add_time' },
        },
      ],
    },
  });

  // Update progress every second
  const interval = setInterval(async () => {
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

    if (remaining === 0) {
      clearInterval(interval);
      await notifee.cancelNotification('rest_timer');
      await notifee.displayNotification({
        title: 'Rest Complete!',
        body: 'Time for your next set',
        android: {
          channelId: 'workout_reminders',
          sound: 'rest_complete',
        },
      });
    } else {
      await notifee.displayNotification({
        id: 'rest_timer',
        title: 'Rest Timer',
        body: `${remaining}s remaining`,
        android: {
          channelId: 'rest_timer',
          ongoing: true,
          progress: {
            max: duration,
            current: duration - remaining,
          },
        },
      });
    }
  }, 1000);
};
```

---

## 10. Deep Linking & App Routing

### Deep Link Configuration
```typescript
// iOS Universal Links
// ios/Hevy/Hevy.entitlements
{
  "com.apple.developer.associated-domains": [
    "applinks:hevy.com",
    "applinks:app.hevy.com"
  ]
}

// Android App Links
// android/app/src/main/AndroidManifest.xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data
    android:scheme="https"
    android:host="hevy.com"
    android:pathPrefix="/workout" />
  <data
    android:scheme="https"
    android:host="app.hevy.com" />
</intent-filter>
```

### Linking Configuration
```typescript
import { LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'hevy://',
    'https://hevy.com',
    'https://app.hevy.com',
  ],

  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: '',
          History: 'history',
          Progress: 'progress',
          Profile: 'profile',
        },
      },
      WorkoutSession: {
        path: 'workout/:workoutId',
        parse: {
          workoutId: (workoutId: string) => workoutId,
        },
      },
      ExerciseDetail: {
        path: 'exercise/:exerciseId',
        parse: {
          exerciseId: (exerciseId: string) => exerciseId,
        },
      },
      RoutineDetail: 'routine/:routineId',
      SharedWorkout: 'shared/:shareToken',
      Achievement: 'achievement/:achievementId',
    },
  },

  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url) return url;

    // Check if app was opened from a notification
    const message = await messaging().getInitialNotification();
    if (message?.data?.deeplink) {
      return message.data.deeplink as string;
    }

    return null;
  },

  subscribe(listener) {
    // Handle deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    // Handle notification press while app is running
    const unsubscribe = messaging().onNotificationOpenedApp((message) => {
      if (message.data?.deeplink) {
        listener(message.data.deeplink as string);
      }
    });

    return () => {
      linkingSubscription.remove();
      unsubscribe();
    };
  },
};
```

### Deep Link Handler
```typescript
// Handle complex routing scenarios
export const DeepLinkHandler = {
  async handleURL(url: string) {
    const parsed = parseDeepLink(url);

    switch (parsed.type) {
      case 'shared_workout':
        // Fetch workout data and navigate
        const workout = await fetchSharedWorkout(parsed.shareToken);
        navigate('WorkoutDetail', { workout });
        break;

      case 'friend_invite':
        // Show friend request modal
        showModal('FriendRequest', { userId: parsed.userId });
        break;

      case 'challenge':
        // Navigate to challenge screen
        navigate('Challenge', { challengeId: parsed.challengeId });
        break;

      case 'referral':
        // Track referral and show welcome bonus
        await trackReferral(parsed.referralCode);
        showModal('WelcomeBonus', { referrer: parsed.referrer });
        break;
    }
  },

  // Share workout functionality
  async shareWorkout(workoutId: string): Promise<string> {
    const shareToken = await generateShareToken(workoutId);
    const deepLink = `https://hevy.com/shared/${shareToken}`;

    await Share.share({
      message: `Check out my workout on Hevy!`,
      url: deepLink,
      title: 'Share Workout',
    });

    return deepLink;
  },
};
```

---

## 11. Memory Management & Optimization

### Memory Profiling Setup
```typescript
// Development memory monitoring
if (__DEV__) {
  const memoryMonitor = setInterval(() => {
    const memory = (performance as any).memory;
    if (memory) {
      console.log({
        usedJSHeap: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeap: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        jsHeapLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
      });
    }
  }, 5000);
}
```

### Memory Optimization Techniques
```typescript
// 1. Image memory management
import FastImage from 'react-native-fast-image';

// Clear image cache when memory warning
import { DeviceEventEmitter, Platform } from 'react-native';

if (Platform.OS === 'ios') {
  DeviceEventEmitter.addListener('memoryWarning', () => {
    FastImage.clearMemoryCache();
    FastImage.clearDiskCache();
  });
}

// 2. Component cleanup
const WorkoutSessionScreen = () => {
  const timerRef = useRef<NodeJS.Timer>();
  const animationRef = useRef<any>();

  useEffect(() => {
    return () => {
      // Clean up timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Cancel animations
      if (animationRef.current) {
        animationRef.current.cancel();
      }

      // Clear listeners
      notificationService.removeAllListeners();
    };
  }, []);
};

// 3. List optimization with windowing
import { FlashList } from '@shopify/flash-list';

const WorkoutHistoryList = () => (
  <FlashList
    data={workouts}
    estimatedItemSize={120}
    renderItem={({ item }) => <WorkoutCard workout={item} />}
    removeClippedSubviews={true}
    maxToRenderPerBatch={10}
    windowSize={5}
    initialNumToRender={10}
    getItemType={(item) => item.type}
  />
);

// 4. Memoization strategy
import { memo, useMemo, useCallback } from 'react';

const WorkoutCard = memo(({ workout, onPress }) => {
  const formattedDate = useMemo(
    () => formatDate(workout.date),
    [workout.date]
  );

  const handlePress = useCallback(() => {
    onPress(workout.id);
  }, [workout.id, onPress]);

  return (
    <Pressable onPress={handlePress}>
      <Text>{workout.name}</Text>
      <Text>{formattedDate}</Text>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.workout.id === nextProps.workout.id &&
         prevProps.workout.updatedAt === nextProps.workout.updatedAt;
});

// 5. Database query optimization
import Realm from 'realm';

class WorkoutRepository {
  realm: Realm;

  // Use indexed queries
  getWorkoutsByDateRange(startDate: Date, endDate: Date) {
    return this.realm
      .objects('Workout')
      .filtered('date >= $0 AND date <= $1', startDate, endDate)
      .sorted('date', true);
  }

  // Lazy loading with pagination
  getWorkoutsPaginated(page: number, pageSize: number = 20) {
    const offset = page * pageSize;
    return this.realm
      .objects('Workout')
      .sorted('date', true)
      .slice(offset, offset + pageSize);
  }

  // Detach from Realm for background processing
  getWorkoutsDetached(limit: number = 100) {
    const workouts = this.realm
      .objects('Workout')
      .sorted('date', true)
      .slice(0, limit);

    return JSON.parse(JSON.stringify(workouts));
  }
}

// 6. Background task cleanup
import BackgroundFetch from 'react-native-background-fetch';

BackgroundFetch.configure({
  minimumFetchInterval: 15,
  stopOnTerminate: false,
  startOnBoot: true,
}, async (taskId) => {
  // Sync data
  await syncWorkoutsWithServer();

  // Clean old cache
  await VideoCache.clearOldCache(30);

  // Finish background task
  BackgroundFetch.finish(taskId);
});
```

---

## 12. Bundle Size Optimization Strategies

### Bundle Analysis
```json
// package.json scripts
{
  "scripts": {
    "analyze:ios": "npx react-native-bundle-visualizer --platform ios",
    "analyze:android": "npx react-native-bundle-visualizer --platform android",
    "bundle:ios": "react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios-bundle.js",
    "bundle:android": "react-native bundle --platform android --dev false --entry-file index.js --bundle-output android-bundle.js"
  }
}
```

### Code Splitting Strategy
```typescript
// 1. Dynamic imports for large screens
const ProgressChartsScreen = lazy(() =>
  import('./screens/ProgressCharts')
);

const SettingsScreen = lazy(() =>
  import('./screens/Settings')
);

// 2. Separate exercise video library
const ExerciseLibrary = lazy(() =>
  import('./components/ExerciseLibrary')
);

// 3. Feature flags for premium features
import { FeatureFlag } from './services/featureFlags';

const PremiumFeatures = lazy(async () => {
  const isPremium = await FeatureFlag.isEnabled('premium_features');
  if (isPremium) {
    return import('./features/Premium');
  }
  return { default: () => null };
});
```

### Dependency Optimization
```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,  // Convert requires to inline
      },
    }),
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
    },
  },
  resolver: {
    // Use browser field for smaller packages
    resolverMainFields: ['react-native', 'browser', 'main'],
  },
};
```

### Android Optimization
```gradle
// android/app/build.gradle
android {
  buildTypes {
    release {
      shrinkResources true
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
  }

  splits {
    abi {
      enable true
      reset()
      include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
      universalApk true
    }
  }

  bundle {
    language {
      enableSplit = true
    }
    density {
      enableSplit = true
    }
    abi {
      enableSplit = true
    }
  }
}
```

### iOS Optimization
```ruby
# ios/Podfile
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['DEAD_CODE_STRIPPING'] = 'YES'
      config.build_settings['STRIP_INSTALLED_PRODUCT'] = 'YES'
      config.build_settings['DEPLOYMENT_POSTPROCESSING'] = 'YES'
      config.build_settings['STRIP_STYLE'] = 'non-global'
    end
  end
end
```

### Asset Optimization
```typescript
// Image asset optimization
// Use WebP for Android, HEIC for iOS
const optimizeImage = async (uri: string): Promise<string> => {
  const format = Platform.OS === 'android' ? 'webp' : 'jpeg';

  const optimized = await ImageResizer.createResizedImage(
    uri,
    1200,
    1200,
    format,
    80
  );

  return optimized.uri;
};

// Lazy load fonts
import { useFonts } from 'expo-font';

const App = () => {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  return <AppNavigator />;
};
```

### Bundle Size Benchmarks
```
Target Bundle Sizes:
- iOS (uncompressed): < 15 MB
- iOS (compressed IPA): < 8 MB
- Android (base APK): < 12 MB
- Android (per-ABI APK): < 8 MB

Hevy Estimated Sizes:
- Total codebase: ~50MB
- JavaScript bundle: ~3.5MB (minified)
- Native code (iOS): ~4MB
- Native code (Android): ~3MB
- Assets: ~2MB
- Exercise videos: On-demand download
```

---

## Performance Benchmarks

### Target Metrics
```typescript
interface PerformanceTargets {
  coldStart: '< 2.0s';
  warmStart: '< 1.0s';
  jsThreadFPS: '60 FPS';
  uiThreadFPS: '60 FPS';
  memoryBaseline: '< 150 MB';
  memoryUnderLoad: '< 250 MB';
  batteryPerHour: '< 5%';
  bundleSize: '< 15 MB';
  apiResponseTime: '< 500ms';
}
```

### Performance Monitoring
```typescript
import perf from '@react-native-firebase/perf';
import { PerformanceObserver } from 'react-native-performance';

// Track screen load time
export const trackScreenPerformance = async (screenName: string) => {
  const trace = await perf().startTrace(`screen_${screenName}`);

  return {
    stop: async (metadata?: Record<string, string>) => {
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          trace.putAttribute(key, value);
        });
      }
      await trace.stop();
    },
  };
};

// Monitor API calls
export const monitorAPICall = async (endpoint: string) => {
  const metric = await perf().newHttpMetric(endpoint, 'GET');
  await metric.start();

  return {
    setResponseCode: (code: number) => metric.setHttpResponseCode(code),
    setResponseContentType: (type: string) =>
      metric.setResponseContentType(type),
    setResponsePayloadSize: (size: number) =>
      metric.setResponsePayloadSize(size),
    stop: async () => await metric.stop(),
  };
};
```

---

## Technology Stack Summary

```typescript
interface HevyTechStack {
  core: {
    reactNative: '0.72+',
    typescript: '5.0+',
    nodejs: '18+',
  };

  ui: {
    animation: 'react-native-reanimated@3.x',
    gestures: 'react-native-gesture-handler@2.x',
    lists: '@shopify/flash-list',
    charts: 'react-native-chart-kit',
    bottomSheet: '@gorhom/bottom-sheet',
    images: 'react-native-fast-image',
  };

  navigation: {
    router: '@react-navigation/native@6.x',
    stack: '@react-navigation/native-stack',
    tabs: '@react-navigation/bottom-tabs',
  };

  state: {
    server: '@tanstack/react-query@4.x',
    client: 'zustand@4.x',
    persistence: 'react-native-mmkv@2.x',
    database: 'realm@11.x | @nozbe/watermelondb',
  };

  backend: {
    api: 'axios | react-native-fetch',
    realtime: 'socket.io-client | Firebase Realtime',
    auth: 'Firebase Auth | Custom JWT',
  };

  native: {
    camera: 'react-native-vision-camera@3.x',
    video: 'react-native-video@5.x',
    storage: 'react-native-fs',
    biometrics: 'react-native-biometrics',
    health: 'react-native-health (iOS) | react-native-google-fit',
  };

  notifications: {
    push: '@react-native-firebase/messaging',
    local: '@notifee/react-native',
  };

  monitoring: {
    crashes: '@sentry/react-native',
    analytics: '@react-native-firebase/analytics',
    performance: '@react-native-firebase/perf',
  };

  testing: {
    unit: 'jest',
    integration: '@testing-library/react-native',
    e2e: 'detox',
  };

  build: {
    ios: 'Xcode 14+',
    android: 'Gradle 8+',
    ci: 'GitHub Actions | Bitrise',
    distribution: 'Firebase App Distribution | TestFlight',
  };
}
```

---

## Key Takeaways

### What Makes Hevy's Implementation Excellent

1. **Performance First**
   - FlashList for all virtualized lists
   - Reanimated 3 for 60 FPS animations
   - Native modules for critical paths
   - Aggressive memoization and optimization

2. **Offline-First Architecture**
   - Realm/WatermelonDB for local persistence
   - Optimistic UI updates
   - Background sync with conflict resolution
   - MMKV for fast key-value storage

3. **Platform Excellence**
   - Native navigation feel
   - Platform-specific UI patterns
   - Apple Watch & Wear OS integration
   - Health app synchronization

4. **Scalability**
   - Efficient video delivery (400+ videos)
   - Smart caching strategies
   - Bundle size optimization
   - Memory management

5. **Developer Experience**
   - TypeScript for type safety
   - Comprehensive error tracking
   - Performance monitoring
   - Automated testing

### Estimated Development Effort

```
Core Team Size: 4-6 developers
Timeline: 12-18 months to v1.0
Maintenance: 2-3 developers ongoing

Breakdown:
- Core workout tracking: 3 months
- Exercise library + videos: 2 months
- Analytics & charts: 2 months
- Social features: 2 months
- Watch apps: 2 months
- Polish & optimization: 2 months
- Testing & bug fixes: 3 months
```

---

## Recommended Architecture for Similar App

If building a similar fitness tracking app:

```typescript
// Recommended stack
{
  "framework": "React Native 0.73+",
  "language": "TypeScript",
  "navigation": "@react-navigation/native-stack",
  "state": {
    "server": "@tanstack/react-query",
    "client": "zustand",
    "db": "@nozbe/watermelondb"
  },
  "ui": {
    "lists": "@shopify/flash-list",
    "animations": "react-native-reanimated",
    "gestures": "react-native-gesture-handler"
  },
  "backend": "Supabase | Firebase",
  "monitoring": "Sentry + Firebase Performance"
}
```

This architecture provides the best balance of:
- Development speed
- Native performance
- Scalability
- Developer experience
- User satisfaction

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Author:** Mobile Developer Agent
**Analysis Basis:** Reverse engineering, industry best practices, performance characteristics
