// LobbyScreen.styles.js
import { Platform, StyleSheet } from 'react-native';
import { getMonospaceFontFamily } from '../lib/ui';

const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 10 },
  default: {},
});
const baseFont = {
  fontFamily: Platform.select({
    ios: 'Gloomhaven',
    android: 'Roboto',
  }),
};
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#061f2b',
  },

  // Fullscreen gradient-ish base blocks (no image needed)
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#061f2b',
  },
  bgGlowTop: {
    position: 'absolute',
    top: -120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: 'rgba(56,189,248,0.18)',
  },
  bgGlowMid: {
    position: 'absolute',
    top: 180,
    right: -120,
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: 'rgba(34,197,94,0.14)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -160,
    left: -120,
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: 'rgba(245,158,11,0.14)',
  },

  root: {
    flex: 1,
    padding: 14,
    paddingTop: 10,
    gap: 12,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  avatarText: {
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
    fontSize: 16,
  },

  nameChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  nameText: {
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
    fontSize: 13,
  },
  subText: {
    marginTop: 4,
    fontFamily: getMonospaceFontFamily(),
    color: 'rgba(229,231,235,0.75)',
    fontSize: 11,
  },

  coinsChip: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'flex-end',
    gap: 4,
    ...shadow,
  },
  coinsLabel: {
    fontFamily: getMonospaceFontFamily(),
    color: 'rgba(229,231,235,0.75)',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  coinsValue: {
    fontFamily: getMonospaceFontFamily(),
    color: '#fbbf24',
    fontSize: 15,
    letterSpacing: 1.2,
  },

  // “Card / Panel” base
  panel: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    ...shadow,
  },
  panelInner: {
    padding: 14,
    gap: 12,
  },

  // Hero / KABO header
  heroHeader: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: 14,
    overflow: 'hidden',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
    fontSize: 22,
    letterSpacing: 2,
  },
  heroDesc: {
    ...baseFont,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: '#AFC6CC',
    textAlign: 'center',
    marginTop: 6,
  },

  // Logo badge
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(56,189,248,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
    fontSize: 18,
    letterSpacing: 1,
  },
logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0f2a33',
    borderWidth: 2,
    borderColor: '#1d4f5c',
      alignItems: 'center',
  justifyContent: 'center',

  // ✅ X ekseninde ekran ortası
  alignSelf: 'center',
  },

  // ✅ LOGO STYLE
  logoImage: {
    width: 136,
    height: 136,
  },
  // Center action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
    ...shadow,
  },
  actionBtnInner: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnTitle: {
    fontFamily: 'Sekuya-Regular',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#0A1E24',
  },
  btnSub: {
    ...baseFont,
    fontSize: 13,
    fontWeight: '400',
    color: '#08333C',
    marginTop: 2,
  },
  btnBlue: { backgroundColor: '#38bdf8' },
  btnOrange: { backgroundColor: '#f59e0b' },

  // Secondary (demo)
  wideBtn: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
    backgroundColor: '#22c55e',
    ...shadow,
  },
  wideBtnInner: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  // --- Sub screens header (back button)
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  backBtn: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(0,0,0,0.20)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...shadow,
  },
  backBtnText: {
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
    fontSize: 12,
    letterSpacing: 1,
  },
  subTitle: {
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
    fontSize: 14,
    letterSpacing: 1.6,
  },
  ghostBtn: {
    opacity: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Room list
  list: {
    gap: 10,
  },
  searchInput: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
  },
  roomItem: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  roomLeft: { gap: 4 },
  roomName: {
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
    fontSize: 13,
  },
  roomMeta: {
    fontFamily: getMonospaceFontFamily(),
    color: 'rgba(229,231,235,0.70)',
    fontSize: 11,
  },
  joinPill: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  joinPillText: {
    fontFamily: getMonospaceFontFamily(),
    color: '#061f2b',
    fontSize: 12,
    letterSpacing: 1,
  },

  emptyBox: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontFamily: getMonospaceFontFamily(),
    color: 'rgba(229,231,235,0.78)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  // Create table visual
  tableWrap: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    overflow: 'hidden',
    padding: 12,
    ...shadow,
  },
  table: {
    height: 260,
    borderRadius: 22,
    borderWidth: 6,
    borderColor: 'rgba(124, 58, 14, 0.92)',
    backgroundColor: 'rgba(8, 60, 78, 0.75)',
    position: 'relative',
    overflow: 'hidden',
  },
  tableInner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  seat: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  seatTitle: {
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
    fontSize: 11,
    letterSpacing: 1,
  },
  seatSub: {
    fontFamily: getMonospaceFontFamily(),
    color: 'rgba(229,231,235,0.65)',
    fontSize: 9,
  },
  youSeat: {
    borderColor: 'rgba(34,197,94,0.45)',
    backgroundColor: 'rgba(34,197,94,0.12)',
  },

  centerChip: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 110,
    height: 110,
    borderRadius: 999,
    transform: [{ translateX: -55 }, { translateY: -55 }],
    borderWidth: 6,
    borderColor: 'rgba(0,0,0,0.55)',
    backgroundColor: 'rgba(34,197,94,0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  centerChipText: {
    fontFamily: getMonospaceFontFamily(),
    color: '#061f2b',
    fontSize: 14,
    letterSpacing: 2,
  },

  form: { gap: 10 },
  input: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: getMonospaceFontFamily(),
    color: '#e5e7eb',
  },

  primaryBtn: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  primaryBtnText: {
    fontFamily: getMonospaceFontFamily(),
    color: '#061f2b',
    fontSize: 13,
    letterSpacing: 1.6,
  },

  hint: {
    fontFamily: getMonospaceFontFamily(),
    color: 'rgba(229,231,235,0.65)',
    fontSize: 11,
    lineHeight: 16,
  },
});