import { NativeModules, Platform } from 'react-native'
import settingState from '@/store/setting/state'
import { bootLog } from '@/utils/bootLog'

/**
 * 屏幕常亮（Wake Lock）封装
 *
 * 依赖 App 内自研的原生模块 `KeepAwake`（见 android/app/src/main/java/cn/toside/music/mobile/keepawake/），
 * 通过窗口 FLAG_KEEP_SCREEN_ON 实现，无需 WAKE_LOCK 权限。
 *
 * 这里通过 NativeModules 动态查找而非静态导入：原生模块未注册时（iOS / 未打包含该模块的包）
 * 会静默降级为 no-op，不会导致 JS 侧抛错或 App 崩溃。
 */
interface KeepAwakeModule {
  enableWakeLock?: () => void
  disableWakeLock?: () => void
}

const nativeModule = (NativeModules as Record<string, KeepAwakeModule | undefined>).KeepAwake

const isSupported = !!nativeModule && typeof nativeModule.enableWakeLock === 'function'

if (!isSupported) {
  // 仅在模块缺失时记录一次，便于排查打包/链接问题
  bootLog(`KeepAwake native module NOT available (${Platform.OS}), screen-on toggle will be a no-op`)
}

export const isKeepAwakeSupported = () => isSupported

/**
 * 按当前设置同步 Wake Lock 状态
 */
export const syncWakeLock = () => {
  if (!isSupported) return
  try {
    if (settingState.setting['common.keepScreenOn']) {
      nativeModule.enableWakeLock!()
    } else {
      nativeModule.disableWakeLock!()
    }
  } catch (err: any) {
    console.warn('[keepAwake] sync failed', err?.message ?? err)
  }
}

export const setWakeLock = (enabled: boolean) => {
  if (!isSupported) return
  try {
    enabled ? nativeModule.enableWakeLock!() : nativeModule.disableWakeLock!()
  } catch (err: any) {
    console.warn('[keepAwake] set failed', err?.message ?? err)
  }
}
