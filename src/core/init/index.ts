import { initSetting, showPactModal } from '@/core/common'
import registerPlaybackService from '@/plugins/player/service'
import initTheme from './theme'
import initI18n from './i18n'
import initUserApi from './userApi'
import initPlayer from './player'
import dataInit from './dataInit'
import initSync from './sync'
import initCommonState from './common'
import { initDeeplink } from './deeplink'
import { setApiSource } from '@/core/apiSource'
import commonActions from '@/store/common/action'
import settingState from '@/store/setting/state'
import { checkUpdate } from '@/core/version'
import { bootLog } from '@/utils/bootLog'
import { cheatTip } from '@/utils/tools'
import { syncWakeLock } from '@/utils/keepAwake'

let isFirstPush = true
const handlePushedHomeScreen = async() => {
  await cheatTip()
  if (settingState.setting['common.isAgreePact']) {
    if (isFirstPush) {
      isFirstPush = false
      void checkUpdate()
      void initDeeplink()
    }
  } else {
    if (isFirstPush) isFirstPush = false
    showPactModal()
  }
}

let isInited = false
export default async() => {
  if (isInited) return handlePushedHomeScreen
  bootLog('Initing...')
  commonActions.setFontSize(global.lx.fontSize)
  bootLog('Font size changed.')
  const setting = await initSetting()
  bootLog('Setting inited.')
  // console.log(setting)

  // 阶段一：i18n 先行（后续模块的弹窗/日志文案依赖 global.i18n）
  await initI18n(setting)
  bootLog('I18n inited.')

  // 阶段二：主题与用户 API 互不依赖，并行初始化（原先串行，各含一次异步存储读取）
  await Promise.all([
    initTheme(setting),
    initUserApi(setting),
  ])
  bootLog('Theme & User Api inited.')

  setApiSource(setting['common.apiSource'])
  bootLog('Api inited.')

  registerPlaybackService()
  bootLog('Playback Service Registered.')
  await initPlayer(setting)
  bootLog('Player inited.')

  // 恢复「播放时保持屏幕常亮」状态（冷启动后需重新申请窗口 flag）
  syncWakeLock()

  // 阶段三：数据层与全局状态互不依赖，并行初始化
  await Promise.all([
    dataInit(setting),
    initCommonState(setting),
  ])
  bootLog('Data & Common State inited.')

  void initSync(setting)
  bootLog('Sync inited.')

  // syncSetting()

  isInited ||= true

  return handlePushedHomeScreen
}
