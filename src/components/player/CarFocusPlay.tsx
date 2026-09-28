import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native'
import { Icon } from '@/components/common/Icon'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import Progress from '@/components/player/ProgressBar'
import { updateSetting } from '@/core/common'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useI18n } from '@/lang/i18n'
import { useBufferProgress } from '@/plugins/player'
import {
  useCurrentPlayQuality,
  useIsPlay,
  usePlayerMusicInfo,
  useProgress,
} from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { syncWakeLock } from '@/utils/keepAwake'

/**
 * 驾驶安全模式 —— 全屏专注播放界面
 *
 * 设计目标：视线离开方向盘的时间最短化。
 * - 主要控件集中在屏幕下半部（单手拇指可达范围）
 * - 触控目标 >= 76x76px，图标 >= 42px
 * - 无二级菜单、无滚动列表、无输入控件
 * - 顶部一键退出，恢复常规界面
 */

const SCREEN_HEIGHT = Dimensions.get('window').height
const COVER_SIZE = Math.round(SCREEN_HEIGHT * 0.34)

export default () => {
  const enabled = useSettingValue('common.carSafetyMode')
  const keepScreenOn = useSettingValue('common.keepScreenOn')
  const theme = useTheme()
  const t = useI18n()

  const [visible, setVisible] = useState(enabled)
  const opacity = useMemo(() => new Animated.Value(0), [])

  const musicInfo = usePlayerMusicInfo()
  const isPlay = useIsPlay()
  const quality = useCurrentPlayQuality()
  const { progress, maxPlayTime, nowPlayTimeStr, maxPlayTimeStr } = useProgress()
  const buffered = useBufferProgress()

  useEffect(() => {
    setVisible(enabled)
  }, [enabled])

  // 常亮开关变化 / 进入专注界面时同步 Wake Lock
  useEffect(() => {
    syncWakeLock()
  }, [keepScreenOn, enabled])

  const animateIn = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [opacity])

  useEffect(() => {
    if (visible) animateIn()
    else opacity.setValue(0)
  }, [visible, animateIn, opacity])

  const handleExit = useCallback(() => {
    setVisible(false)
    updateSetting({ 'common.carSafetyMode': false })
  }, [])

  if (!visible) return null

  const qualityBadge = quality ? QUALITY_SHORT[quality] ?? quality : null

  return (
    <Animated.View style={[styles.overlay, { opacity, backgroundColor: theme['c-bg'] }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topArea} />

      <View style={styles.body}>
        <View style={[styles.coverWrap, { width: COVER_SIZE, height: COVER_SIZE }]}>
          {musicInfo.pic ? (
            <Image url={musicInfo.pic} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: theme['c-primary-light-300-alpha-200'] }]}>
              <Icon name="logo" size={64} color={theme['c-500']} />
            </View>
          )}
          {qualityBadge ? (
            <View style={[styles.qualityBadge, { backgroundColor: theme['c-primary-light-400-alpha-600'] }]}>
              <Text style={[styles.qualityText, { color: theme['c-button-font'] }]}>{qualityBadge}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.titleBox}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.songName, { color: theme['c-100'] }]}>
            {musicInfo.name || t('car_focus_none')}
          </Text>
          {musicInfo.singer ? (
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.singer, { color: theme['c-500'] }]}>
              {musicInfo.singer}
            </Text>
          ) : null}
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progress}>
            <Progress progress={progress} duration={maxPlayTime} buffered={buffered} />
          </View>
          <View style={styles.times}>
            <Text style={[styles.timeText, { color: theme['c-500'] }]}>{nowPlayTimeStr}</Text>
            <Text style={[styles.timeText, { color: theme['c-500'] }]}>{maxPlayTimeStr}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <ControlButton iconName="prevMusic" onPress={() => void playPrev()} />
          <Pressable
            style={[styles.playBtn, { backgroundColor: theme['c-primary'] }]}
            onPress={togglePlay}
            hitSlop={12}
            activeOpacity={0.75}
          >
            <Icon name={isPlay ? 'pause' : 'play'} size={46} color={theme['c-button-font']} />
          </Pressable>
          <ControlButton iconName="nextMusic" onPress={() => void playNext()} />
        </View>
      </View>

      <Pressable
        style={[styles.exitBtn, { borderColor: theme['c-primary-light-400-alpha-400'] }]}
        onPress={handleExit}
        hitSlop={16}
        activeOpacity={0.6}
      >
        <Text style={[styles.exitText, { color: theme['c-100'] }]}>{t('car_focus_exit')}</Text>
      </Pressable>
    </Animated.View>
  )
}

const ControlButton = ({ iconName, onPress }: { iconName: 'prevMusic' | 'nextMusic'; onPress: () => void }) => {
  const theme = useTheme()

  return (
    <Pressable
      style={[styles.ctrlBtn, { backgroundColor: theme['c-primary-light-300-alpha-200'] }]}
      onPress={onPress}
      hitSlop={12}
      activeOpacity={0.6}
    >
      <Icon name={iconName} size={42} color={theme['c-button-font']} />
    </Pressable>
  )
}

const QUALITY_SHORT: Record<string, string> = {
  master: 'MST',
  atmos_plus: 'A+',
  atmos: 'ATM',
  hires: 'HR',
  flac24bit: '24bit',
  flac: 'FLAC',
  ape: 'APE',
  wav: 'WAV',
  '320k': '320K',
  '192k': '192K',
  '128k': '128K',
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    zIndex: 9999,
    paddingTop: 48,
    paddingBottom: 40,
  },
  topArea: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  coverWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 26,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  titleBox: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  songName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  singer: {
    fontSize: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  progressWrap: {
    width: '100%',
    marginBottom: 34,
  },
  progress: {
    height: 30,
    justifyContent: 'center',
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 46,
  },
  ctrlBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  exitBtn: {
    position: 'absolute',
    top: 52,
    left: '50%',
    transform: [{ translateX: -60 }],
    width: 120,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitText: {
    fontSize: 17,
    fontWeight: '600',
  },
})
