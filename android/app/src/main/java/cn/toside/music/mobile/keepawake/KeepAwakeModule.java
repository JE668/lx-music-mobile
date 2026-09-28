package cn.toside.music.mobile.keepawake;

import android.app.Activity;
import android.view.WindowManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * 屏幕常亮（Wake Lock）原生模块
 *
 * 通过 WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON 控制窗口是否阻止屏幕休眠，
 * 不申请系统 WAKE_LOCK 权限，不影响电量调度策略，退出时主动清除。
 *
 * 对应 JS 侧封装：src/utils/keepAwake.ts（模块名 KeepAwake）
 */
public class KeepAwakeModule extends ReactContextBaseJavaModule {

  public static final String NAME = "KeepAwake";

  KeepAwakeModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void enableWakeLock() {
    final Activity activity = getCurrentActivity();
    if (activity == null) return;

    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        if (activity.isFinishing() || activity.isDestroyed()) return;
        if (activity.getWindow() != null) {
          activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
      }
    });
  }

  @ReactMethod
  public void disableWakeLock() {
    final Activity activity = getCurrentActivity();
    if (activity == null) return;

    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        if (activity.getWindow() != null) {
          activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
      }
    });
  }
}
