import { Platform, StyleSheet } from 'react-native';

const baseFont = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#071A1F', // premium koyu teal
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  // subtle background glows
  bgGlowA: {
    position: 'absolute',
    left: -120,
    top: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(34, 211, 238, 0.14)',
  },
  bgGlowB: {
    position: 'absolute',
    right: -140,
    bottom: -140,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(99, 102, 241, 0.10)',
  },

  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(34, 211, 238, 0.22)',
  },
  logo: {
    width: 260,
    height: 140,
  },

  barWrap: {
    width: '82%',
    maxWidth: 360,
    alignItems: 'center',
  },

  barOuter: {
    width: '100%',
    height: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 8,
      },
    }),
  },

  barFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: 'rgba(34, 211, 238, 0.95)',
  },

  // shiny moving highlight
  barShimmer: {
    position: 'absolute',
    top: -8,
    left: 0,
    width: 46,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ rotateZ: '18deg' }],
  },

  // tiny “premium” ticks under the bar
  barTicks: {
    width: '100%',
    height: 10,
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
