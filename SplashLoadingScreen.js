import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, SafeAreaView, View } from 'react-native';
import { styles } from './styles/SplashLoadingScreen.styles';

export default function SplashLoadingScreen({ navigation }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(0)).current;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const logoGlowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.38],
  });

  useEffect(() => {
    // Logo pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Small floating animation
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -6,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    floatLoop.start();

    // Shimmer loop (bar highlight)
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerX, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();

    // Progress fill → then navigate
    Animated.timing(progress, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width anim uses layout percentage
    }).start(({ finished }) => {
      if (!finished) return;
      // Stack'te geri dönülmesin diye replace
      navigation.replace('Lobby');
    });

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      shimmerLoop.stop();
      progress.stopAnimation();
    };
  }, [floatY, navigation, progress, pulse, shimmerX]);

  const shimmerTranslate = useMemo(() => {
    return shimmerX.interpolate({
      inputRange: [0, 1],
      outputRange: [-40, 220],
    });
  }, [shimmerX]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.bgGlowA} pointerEvents="none" />
      <View style={styles.bgGlowB} pointerEvents="none" />

      <View style={styles.root}>
        {/* Logo stack */}
        <View style={styles.logoWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.logoGlow,
              {
                opacity: logoGlowOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          />
          <Animated.View
            style={{
              transform: [{ translateY: floatY }, { scale: logoScale }],
            }}
          >
            <Image
              source={require('./assets/Cloviz Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Premium loading bar */}
        <View style={styles.barWrap}>
          <View style={styles.barOuter}>
            <Animated.View style={[styles.barFill, { width: progressWidth }]}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.barShimmer,
                  {
                    transform: [{ translateX: shimmerTranslate }],
                  },
                ]}
              />
            </Animated.View>
          </View>

          <View style={styles.barTicks} />
        </View>
      </View>
    </SafeAreaView>
  );
}
