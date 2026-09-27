import musicSdk, { findMusic } from '@/utils/musicSdk'
import {
  // getOtherSource as getOtherSourceFromStore,
  // saveOtherSource as saveOtherSourceFromStore,
  getMusicUrl as getStoreMusicUrl,
  getPlayerLyric as getStoreLyric,
} from '@/utils/data'
import { langS2T, toNewMusicInfo, toOldMusicInfo } from '@/utils'
import { assertApiSupport } from '@/utils/tools'
import { updateSetting } from '@/core/common'
import settingState from '@/store/setting/state'
import { requestMsg } from '@/utils/message'
import BackgroundTimer from 'react-native-background-timer'
import { apis } from '@/utils/musicSdk/api-source'


const getOtherSourcePromises = new Map()
export const existTimeExp = /\[\d{1,2}:.*\d{1,4}\]/
const otherSourceCache = new Map<LX.Music.MusicInfo | LX.Download.ListItem, LX.Music.MusicInfoOnline[]>()

export const getOtherSource = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh = false): Promise<LX.Music.MusicInfoOnline[]> => {
  // if (!isRefresh) {
  //   const cachedInfo = await getOtherSourceFromStore(musicInfo.id)
  //   if (cachedInfo.length) return cachedInfo
  // }
  if (otherSourceCache.has(musicInfo)) return otherSourceCache.get(musicInfo)!
  let key: string
  let searchMusicInfo: {
    name: string
    singer: string
    source: string
    albumName: string
    interval: string
  }
  if ('progress' in musicInfo) {
    key = `local_${musicInfo.id}`
    searchMusicInfo = {
      name: musicInfo.metadata.musicInfo.name,
      singer: musicInfo.metadata.musicInfo.singer,
      source: musicInfo.metadata.musicInfo.source,
      albumName: musicInfo.metadata.musicInfo.meta.albumName,
      interval: musicInfo.metadata.musicInfo.interval ?? '',
    }
  } else {
    key = `${musicInfo.source}_${musicInfo.id}`
    searchMusicInfo = {
      name: musicInfo.name,
      singer: musicInfo.singer,
      source: musicInfo.source,
      albumName: musicInfo.meta.albumName,
      interval: musicInfo.interval ?? '',
    }
  }
  if (getOtherSourcePromises.has(key)) return getOtherSourcePromises.get(key)

  const promise = new Promise<LX.Music.MusicInfoOnline[]>((resolve, reject) => {
    let timeout: null | number = BackgroundTimer.setTimeout(() => {
      timeout = null
      reject(new Error('find music timeout'))
    }, 12_000)
    findMusic(searchMusicInfo).then((otherSource) => {
      if (otherSourceCache.size > 10) otherSourceCache.clear()
      const source = otherSource.map(toNewMusicInfo) as LX.Music.MusicInfoOnline[]
      otherSourceCache.set(musicInfo, source)
      resolve(source)
    }).catch(reject).finally(() => {
      if (timeout) BackgroundTimer.clearTimeout(timeout)
    })
  }).then((otherSource) => {
    // if (otherSource.length) void saveOtherSourceFromStore(musicInfo.id, otherSource)
    return otherSource
  }).finally(() => {
    if (getOtherSourcePromises.has(key)) getOtherSourcePromises.delete(key)
  })
  getOtherSourcePromises.set(key, promise)
  return promise
}


export const buildLyricInfo = async(lyricInfo: MakeOptional<LX.Player.LyricInfo, 'rawlrcInfo'>): Promise<LX.Player.LyricInfo> => {
  if (!settingState.setting['player.isS2t']) {
    // @ts-expect-error
    if (lyricInfo.rawlrcInfo) return lyricInfo
    return { ...lyricInfo, rawlrcInfo: { ...lyricInfo } }
  }

  if (settingState.setting['player.isS2t']) {
    const tasks = [
      lyricInfo.lyric ? langS2T(lyricInfo.lyric) : Promise.resolve(''),
      lyricInfo.tlyric ? langS2T(lyricInfo.tlyric) : Promise.resolve(''),
      lyricInfo.rlyric ? langS2T(lyricInfo.rlyric) : Promise.resolve(''),
      lyricInfo.lxlyric ? langS2T(lyricInfo.lxlyric) : Promise.resolve(''),
    ]
    if (lyricInfo.rawlrcInfo) {
      tasks.push(lyricInfo.lyric ? langS2T(lyricInfo.lyric) : Promise.resolve(''))
      tasks.push(lyricInfo.tlyric ? langS2T(lyricInfo.tlyric) : Promise.resolve(''))
      tasks.push(lyricInfo.rlyric ? langS2T(lyricInfo.rlyric) : Promise.resolve(''))
      tasks.push(lyricInfo.lxlyric ? langS2T(lyricInfo.lxlyric) : Promise.resolve(''))
    }
    return Promise.all(tasks).then(([lyric, tlyric, rlyric, lxlyric, lyric_raw, tlyric_raw, rlyric_raw, lxlyric_raw]) => {
      const rawlrcInfo = lyric_raw ? {
        lyric: lyric_raw,
        tlyric: tlyric_raw,
        rlyric: rlyric_raw,
        lxlyric: lxlyric_raw,
      } : {
        lyric,
        tlyric,
        rlyric,
        lxlyric,
      }
      return {
        lyric,
        tlyric,
        rlyric,
        lxlyric,
        rawlrcInfo,
      }
    })
  }

  // @ts-expect-error
  return lyricInfo.rawlrcInfo ? lyricInfo : { ...lyricInfo, rawlrcInfo: { ...lyricInfo } }
}

export const getCachedLyricInfo = async(musicInfo: LX.Music.MusicInfo): Promise<LX.Player.LyricInfo | null> => {
  let lrcInfo = await getStoreLyric(musicInfo)
  // lrcInfo = {}
  if (existTimeExp.test(lrcInfo.lyric) && lrcInfo.tlyric != null) {
    // if (musicInfo.lrc.startsWith('\ufeff[id:$00000000]')) {
    //   let str = musicInfo.lrc.replace('\ufeff[id:$00000000]\n', '')
    //   commit('setLrc', { musicInfo, lyric: str, tlyric: musicInfo.tlrc, lxlyric: musicInfo.tlrc })
    // } else if (musicInfo.lrc.startsWith('[id:$00000000]')) {
    //   let str = musicInfo.lrc.replace('[id:$00000000]\n', '')
    //   commit('setLrc', { musicInfo, lyric: str, tlyric: musicInfo.tlrc, lxlyric: musicInfo.tlrc })
    // }

    // if (lrcInfo.lxlyric == null) {
    //   switch (musicInfo.source) {
    //     case 'kg':
    //     case 'kw':
    //     case 'mg':
    //       break
    //     default:
    //       return lrcInfo
    //   }
    // } else
    if (lrcInfo.rlyric == null) {
      if (!['wy', 'kg'].includes(musicInfo.source)) return lrcInfo
    } else return lrcInfo
  }
  return null
}

export const getOnlineOtherSourceMusicUrlByLocal = async(musicInfo: LX.Music.MusicInfoLocal, isRefresh: boolean): Promise<{
  url: string
  quality: LX.Quality
  isFromCache: boolean
}> => {
  if (!await global.lx.apiInitPromise[0]) throw new Error('source init failed')

  const quality = '128k'

  const cachedUrl = await getStoreMusicUrl(musicInfo, quality)
  if (cachedUrl && !isRefresh) return { url: cachedUrl, quality, isFromCache: true }

  let reqPromise
  try {
    reqPromise = apis('local').getMusicUrl(toOldMusicInfo(musicInfo), null).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }

  return reqPromise.then(({ url }: { url: string }) => {
    return { url, quality, isFromCache: false }
  })
}

export const getOnlineOtherSourceLyricByLocal = async(musicInfo: LX.Music.MusicInfoLocal, isRefresh: boolean): Promise<{
  lyricInfo: LX.Music.LyricInfo
  isFromCache: boolean
}> => {
  if (!await global.lx.apiInitPromise[0]) throw new Error('source init failed')

  const lyricInfo = await getCachedLyricInfo(musicInfo)
  if (lyricInfo && !isRefresh) return { lyricInfo, isFromCache: true }

  let reqPromise
  try {
    reqPromise = apis('local').getLyric(toOldMusicInfo(musicInfo)).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }

  return reqPromise.then((lyricInfo: LX.Music.LyricInfo) => {
    return { lyricInfo, isFromCache: false }
  })
}

export const getOnlineOtherSourcePicByLocal = async(musicInfo: LX.Music.MusicInfoLocal): Promise<{
  url: string
}> => {
  if (!await global.lx.apiInitPromise[0]) throw new Error('source init failed')

  let reqPromise
  try {
    reqPromise = apis('local').getPic(toOldMusicInfo(musicInfo)).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }

  return reqPromise.then((url: string) => {
    return { url }
  })
}

/**
 * 完整音质排序（从高到低）
 * master > atmos_plus > atmos > hires > flac24bit > flac > ape > wav > 320k > 192k > 128k
 */
export const QUALITY_ORDER: readonly LX.Quality[] = [
  'master', 'atmos_plus', 'atmos', 'hires',
  'flac24bit', 'flac', 'ape', 'wav',
  '320k', '192k', '128k',
]

/**
 * 获取歌曲在当前源上可用的音质列表（歌曲有 & 源支持）
 */
export const getAvailableQualities = (musicInfo: LX.Music.MusicInfoOnline): LX.Quality[] => {
  const sourceQualitys = global.lx.qualityList[musicInfo.source] ?? []
  return QUALITY_ORDER.filter(q => musicInfo.meta._qualitys[q] && sourceQualitys.includes(q))
}

/**
 * 获取下一个更低音质（用于降级重试）
 * 返回 null 表示已无更低音质
 */
export const getNextLowerQuality = (current: LX.Quality): LX.Quality | null => {
  const idx = QUALITY_ORDER.indexOf(current)
  if (idx < 0 || idx >= QUALITY_ORDER.length - 1) return null
  return QUALITY_ORDER[idx + 1]
}

/**
 * 获取当前音质之上（含自身）的所有可用音质，从高到低
 * 用于「同或更高音质」策略
 */
export const getQualitiesAtOrAbove = (musicInfo: LX.Music.MusicInfoOnline, target: LX.Quality): LX.Quality[] => {
  const targetIdx = QUALITY_ORDER.indexOf(target)
  if (targetIdx < 0) return []
  const available = getAvailableQualities(musicInfo)
  // 从 targetIdx 开始向上（index 更小 = 更高音质）
  const result: LX.Quality[] = []
  for (let i = targetIdx; i >= 0; i--) {
    if (available.includes(QUALITY_ORDER[i])) result.push(QUALITY_ORDER[i])
  }
  return result
}

/**
 * 获取当前音质以下（不含自身）的所有可用音质，从高到低
 * 用于降级策略
 */
export const getQualitiesBelow = (musicInfo: LX.Music.MusicInfoOnline, target: LX.Quality): LX.Quality[] => {
  const targetIdx = QUALITY_ORDER.indexOf(target)
  if (targetIdx < 0 || targetIdx >= QUALITY_ORDER.length - 1) return []
  const available = getAvailableQualities(musicInfo)
  const result: LX.Quality[] = []
  for (let i = targetIdx + 1; i < QUALITY_ORDER.length; i++) {
    if (available.includes(QUALITY_ORDER[i])) result.push(QUALITY_ORDER[i])
  }
  return result
}

/**
 * 读取按曲覆盖音质表
 */
export const getQualityOverrides = (): Record<string, LX.Quality> => {
  try {
    const raw = settingState.setting['player.qualityOverrides']
    return raw && raw !== '{}' ? JSON.parse(raw) : {}
  } catch { return {} }
}

/**
 * 设置某首歌的音质覆盖（传 null 表示移除覆盖）
 */
export const setQualityOverride = (songId: string, quality: LX.Quality | null) => {
  const overrides = getQualityOverrides()
  if (quality) overrides[songId] = quality
  else delete overrides[songId]
  updateSetting({ 'player.qualityOverrides': JSON.stringify(overrides) })
}

/**
 * 获取播放音质
 * 策略：精确匹配 → 向下降级 → 向上升级 → 兜底 128k
 * 支持按歌曲覆盖音质（player.qualityOverrides，JSON 字符串存储）
 */
export const getPlayQuality = (highQuality: LX.Quality, musicInfo: LX.Music.MusicInfoOnline): LX.Quality => {
  const overrides = getQualityOverrides()
  const target = overrides[musicInfo.id] ?? highQuality
  const available = getAvailableQualities(musicInfo)

  // 精确匹配
  if (available.includes(target)) return target

  const targetIdx = QUALITY_ORDER.indexOf(target)

  // 向下降级（优先）
  for (let i = targetIdx + 1; i < QUALITY_ORDER.length; i++) {
    if (available.includes(QUALITY_ORDER[i])) return QUALITY_ORDER[i]
  }

  // 向上升级（次选）
  for (let i = targetIdx - 1; i >= 0; i--) {
    if (available.includes(QUALITY_ORDER[i])) return QUALITY_ORDER[i]
  }

  return '128k'
}

export const getOnlineOtherSourceMusicUrl = async({ musicInfos, quality, onToggleSource, isRefresh, retryedSource = [] }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  quality?: LX.Quality
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
}> => {
  if (!await global.lx.apiInitPromise[0]) throw new Error('source init failed')

  let musicInfo: LX.Music.MusicInfoOnline | null = null
  let itemQuality: LX.Quality | null = null
  // eslint-disable-next-line no-cond-assign
  while (musicInfo = (musicInfos.shift()!)) {
    if (retryedSource.includes(musicInfo.source)) continue
    retryedSource.push(musicInfo.source)
    if (!assertApiSupport(musicInfo.source)) continue
    itemQuality = quality ?? getPlayQuality(settingState.setting['player.playQuality'], musicInfo)
    if (!musicInfo.meta._qualitys[itemQuality]) continue

    console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
    onToggleSource(musicInfo)
    break
  }
  if (!musicInfo || !itemQuality) throw new Error(global.i18n.t('toggle_source_failed'))

  const cachedUrl = await getStoreMusicUrl(musicInfo, itemQuality)
  if (cachedUrl && !isRefresh) return { url: cachedUrl, musicInfo, quality: itemQuality, isFromCache: true }

  let reqPromise
  try {
    reqPromise = musicSdk[musicInfo.source].getMusicUrl(toOldMusicInfo(musicInfo), itemQuality).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }
  // retryedSource.includes(musicInfo.source)
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  return reqPromise.then(({ url, type }: { url: string, type: LX.Quality }) => {
    return { musicInfo, url, quality: type, isFromCache: false }
    // eslint-disable-next-line @typescript-eslint/promise-function-async
  }).catch((err: any) => {
    if (err.message == requestMsg.tooManyRequests) throw err
    console.log(err)
    return getOnlineOtherSourceMusicUrl({ musicInfos, quality, onToggleSource, isRefresh, retryedSource })
  })
}

/**
 * 获取在线音乐URL
 * 音质后备策略：
 *   same_source_higher - 同音源先升档 → 换源同音质 → (降级/跳过)
 *   all_sources_higher - 所有源同或更高音质 → (降级/跳过)
 *   best               - 所有源同音质 → 降级（默认）
 *   downgrade          - 直接降级到下一可用音质
 *   strict             - 仅尝试所选音质，不可用则报错
 */
export const handleGetOnlineMusicUrl = async({ musicInfo, quality, onToggleSource, isRefresh, allowToggleSource }: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource: boolean
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
}> => {
  if (!await global.lx.apiInitPromise[0]) throw new Error('source init failed')

  const fallbackMode = settingState.setting['player.qualityFallback']
  const allowDowngrade = settingState.setting['player.qualityAllowDowngrade']
  const targetQuality = quality ?? getPlayQuality(settingState.setting['player.playQuality'], musicInfo)

  const tryQuality = (q: LX.Quality) => {
    let reqPromise
    try {
      reqPromise = musicSdk[musicInfo.source].getMusicUrl(toOldMusicInfo(musicInfo), q).promise
    } catch (err: any) {
      reqPromise = Promise.reject(err)
    }
    return reqPromise.then(({ url, type }: { url: string, type: LX.Quality }) => ({
      musicInfo, url, quality: type, isFromCache: false,
    }))
  }

  // 降级重试（当策略失败且允许降级时）
  const tryDowngrade = (): Promise<ReturnType<typeof handleGetOnlineMusicUrl>> | null => {
    const nextQuality = getNextLowerQuality(targetQuality)
    if (nextQuality) {
      console.log('[quality] final downgrade', targetQuality, '->', nextQuality)
      return handleGetOnlineMusicUrl({ musicInfo, quality: nextQuality, isRefresh, allowToggleSource, onToggleSource })
    }
    return null
  }

  // 跳过歌曲（当策略失败且不允许降级时）
  const skipSong = (): never => {
    const e = new Error(global.i18n.t('setting_play_quality_not_available'))
    ;(e as any).isQualitySkip = true
    throw e
  }

  return tryQuality(targetQuality).catch(async(err: any) => {
    console.log('[quality] failed at', targetQuality, '->', err.message)
    if (!allowToggleSource || err.message == requestMsg.tooManyRequests) throw err

    switch (fallbackMode) {
      case 'strict': {
        // 仅尝试所选音质：换其他源同音质，失败则报错
        onToggleSource()
        const otherSource = await getOtherSource(musicInfo)
        if (otherSource.length) {
          return getOnlineOtherSourceMusicUrl({
            musicInfos: [...otherSource], onToggleSource, quality: targetQuality,
            isRefresh, retryedSource: [musicInfo.source],
          })
        }
        throw err
      }

      case 'downgrade': {
        // 直接降级到下一音质
        const nextQuality = getNextLowerQuality(targetQuality)
        if (nextQuality) {
          console.log('[quality] downgrade', targetQuality, '->', nextQuality)
          return handleGetOnlineMusicUrl({ musicInfo, quality: nextQuality, isRefresh, allowToggleSource, onToggleSource })
        }
        throw err
      }

      case 'same_source_higher': {
        // 步骤1：同音源尝试更高音质
        const higherQualities = getQualitiesAtOrAbove(musicInfo, targetQuality)
        for (const q of higherQualities) {
          if (q === targetQuality) continue
          try {
            return await tryQuality(q)
          } catch (e: any) {
            if (e.message === requestMsg.tooManyRequests) throw e
            console.log('[quality] same_source_higher:', q, 'failed')
          }
        }

        // 步骤2：换其他源尝试同音质
        onToggleSource()
        const otherSource = await getOtherSource(musicInfo)
        if (otherSource.length) {
          try {
            return await getOnlineOtherSourceMusicUrl({
              musicInfos: [...otherSource], onToggleSource, quality: targetQuality,
              isRefresh, retryedSource: [musicInfo.source],
            })
          } catch (e: any) {
            console.log('[quality] same_source_higher: other sources failed')
          }
        }

        // 步骤3：策略失败 → 降级或跳过
        if (allowDowngrade) {
          const dg = tryDowngrade()
          if (dg) return dg
        }
        skipSong()
      }

      case 'all_sources_higher': {
        // 步骤1：尝试其他源的同音质
        onToggleSource()
        const otherSource = await getOtherSource(musicInfo)
        if (otherSource.length) {
          try {
            return await getOnlineOtherSourceMusicUrl({
              musicInfos: [...otherSource], onToggleSource, quality: targetQuality,
              isRefresh, retryedSource: [musicInfo.source],
            })
          } catch (e: any) {
            console.log('[quality] all_sources_higher: same quality failed on all sources')
          }
        }

        // 步骤2：尝试所有源的更高音质（在当前源尝试即可，因为其他源已试过同音质）
        const higherQualities = getQualitiesAtOrAbove(musicInfo, targetQuality)
        for (const q of higherQualities) {
          if (q === targetQuality) continue
          try {
            return await tryQuality(q)
          } catch (e: any) {
            if (e.message === requestMsg.tooManyRequests) throw e
            console.log('[quality] all_sources_higher:', q, 'failed')
          }
        }

        // 步骤3：策略失败 → 降级或跳过
        if (allowDowngrade) {
          const dg = tryDowngrade()
          if (dg) return dg
        }
        skipSong()
      }

      case 'best': {
        // 步骤1：尝试所有源的同音质
        onToggleSource()
        const otherSource = await getOtherSource(musicInfo)
        if (otherSource.length) {
          try {
            return await getOnlineOtherSourceMusicUrl({
              musicInfos: [...otherSource], onToggleSource, quality: targetQuality,
              isRefresh, retryedSource: [musicInfo.source],
            })
          } catch (e: any) {
            console.log('[quality] best: same quality failed on all sources')
          }
        }

        // 步骤2：全部源失败后降级
        const nextQuality = getNextLowerQuality(targetQuality)
        if (nextQuality) {
          console.log('[quality] best-mode downgrade', targetQuality, '->', nextQuality)
          return handleGetOnlineMusicUrl({ musicInfo, quality: nextQuality, isRefresh, allowToggleSource, onToggleSource })
        }
        throw err
      }

      default: {
        // 未知模式，按 best 处理
        throw err
      }
    }
  })
}


export const getOnlineOtherSourcePicUrl = async({ musicInfos, onToggleSource, isRefresh, retryedSource = [] }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  let musicInfo: LX.Music.MusicInfoOnline | null = null
  // eslint-disable-next-line no-cond-assign
  while (musicInfo = (musicInfos.shift()!)) {
    if (retryedSource.includes(musicInfo.source)) continue
    retryedSource.push(musicInfo.source)
    // if (!assertApiSupport(musicInfo.source)) continue
    console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
    onToggleSource(musicInfo)
    break
  }
  if (!musicInfo) throw new Error(global.i18n.t('toggle_source_failed'))

  if (musicInfo.meta.picUrl && !isRefresh) return { musicInfo, url: musicInfo.meta.picUrl, isFromCache: true }

  let reqPromise
  try {
    reqPromise = musicSdk[musicInfo.source].getPic(toOldMusicInfo(musicInfo))
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }
  // retryedSource.includes(musicInfo.source)
  return reqPromise.then((url: string) => {
    return { musicInfo, url, isFromCache: false }
    // eslint-disable-next-line @typescript-eslint/promise-function-async
  }).catch((err: any) => {
    console.log(err)
    return getOnlineOtherSourcePicUrl({ musicInfos, onToggleSource, isRefresh, retryedSource })
  })
}

/**
 * 获取在线歌曲封面
 */
export const handleGetOnlinePicUrl = async({ musicInfo, isRefresh, onToggleSource, allowToggleSource }: {
  musicInfo: LX.Music.MusicInfoOnline
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  allowToggleSource: boolean
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  // console.log(musicInfo.source)
  let reqPromise
  try {
    reqPromise = musicSdk[musicInfo.source].getPic(toOldMusicInfo(musicInfo))
  } catch (err) {
    reqPromise = Promise.reject(err)
  }
  return reqPromise.then((url: string) => {
    return { musicInfo, url, isFromCache: false }
  }).catch(async(err: any) => {
    console.log(err)
    if (!allowToggleSource) throw err
    onToggleSource()
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return getOtherSource(musicInfo).then(otherSource => {
      // console.log('find otherSource', otherSource.length)
      if (otherSource.length) {
        return getOnlineOtherSourcePicUrl({
          musicInfos: [...otherSource],
          onToggleSource,
          isRefresh,
          retryedSource: [musicInfo.source],
        })
      }
      throw err
    })
  })
}


export const getOnlineOtherSourceLyricInfo = async({ musicInfos, onToggleSource, isRefresh, retryedSource = [] }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
}): Promise<{
  lyricInfo: LX.Music.LyricInfo | LX.Player.LyricInfo
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  let musicInfo: LX.Music.MusicInfoOnline | null = null
  // eslint-disable-next-line no-cond-assign
  while (musicInfo = (musicInfos.shift()!)) {
    if (retryedSource.includes(musicInfo.source)) continue
    retryedSource.push(musicInfo.source)
    // if (!assertApiSupport(musicInfo.source)) continue
    console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
    onToggleSource(musicInfo)
    break
  }
  if (!musicInfo) throw new Error(global.i18n.t('toggle_source_failed'))

  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo)
    if (lyricInfo) return { musicInfo, lyricInfo, isFromCache: true }
  }

  let reqPromise
  try {
    // TODO: remove any type
    reqPromise = (musicSdk[musicInfo.source].getLyric(toOldMusicInfo(musicInfo)) as any).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }
  // retryedSource.includes(musicInfo.source)
  return reqPromise.then(async(lyricInfo: LX.Music.LyricInfo) => {
    return existTimeExp.test(lyricInfo.lyric) ? {
      lyricInfo,
      musicInfo,
      isFromCache: false,
    } : Promise.reject(new Error('failed'))
    // eslint-disable-next-line @typescript-eslint/promise-function-async
  }).catch((err: any) => {
    console.log(err)
    return getOnlineOtherSourceLyricInfo({ musicInfos, onToggleSource, isRefresh, retryedSource })
  })
}

/**
 * 获取在线歌词信息
 */
export const handleGetOnlineLyricInfo = async({ musicInfo, onToggleSource, isRefresh, allowToggleSource }: {
  musicInfo: LX.Music.MusicInfoOnline
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  allowToggleSource: boolean
}): Promise<{
  musicInfo: LX.Music.MusicInfoOnline
  lyricInfo: LX.Music.LyricInfo | LX.Player.LyricInfo
  isFromCache: boolean
}> => {
  // console.log(musicInfo.source)
  let reqPromise
  try {
    // TODO: remove any type
    reqPromise = (musicSdk[musicInfo.source].getLyric(toOldMusicInfo(musicInfo)) as any).promise
  } catch (err) {
    reqPromise = Promise.reject(err)
  }
  return reqPromise.then(async(lyricInfo: LX.Music.LyricInfo) => {
    return existTimeExp.test(lyricInfo.lyric) ? {
      musicInfo,
      lyricInfo,
      isFromCache: false,
    } : Promise.reject(new Error('failed'))
  }).catch(async(err: any) => {
    console.log(err)
    if (!allowToggleSource) throw err

    onToggleSource()
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return getOtherSource(musicInfo).then(otherSource => {
      // console.log('find otherSource', otherSource.length)
      if (otherSource.length) {
        return getOnlineOtherSourceLyricInfo({
          musicInfos: [...otherSource],
          onToggleSource,
          isRefresh,
          retryedSource: [musicInfo.source],
        })
      }
      throw err
    })
  })
}
