package com.talky.ptt

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TalkyNativeBridge(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TalkyNativeBridge"

    @ReactMethod
    fun startForegroundService(promise: Promise) {
        try {
            val intent = Intent(reactContext, TalkyForegroundService::class.java).apply {
                action = TalkyForegroundService.ACTION_START
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FOREGROUND_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopForegroundService(promise: Promise) {
        try {
            val intent = Intent(reactContext, TalkyForegroundService::class.java).apply {
                action = TalkyForegroundService.ACTION_STOP
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                val packageName = reactContext.packageName

                if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(packageName)) {
                    try {
                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = Uri.parse("package:$packageName")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        reactContext.startActivity(intent)
                    } catch (e: Exception) {
                        try {
                            val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            reactContext.startActivity(fallbackIntent)
                        } catch (f: Exception) {
                            // Suppress
                        }
                    }
                    promise.resolve(false)
                } else {
                    promise.resolve(true)
                }
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setAudioRouting(route: String, promise: Promise) {
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            if (audioManager == null) {
                promise.reject("AUDIO_MANAGER_NULL", "AudioManager not available")
                return
            }

            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION

            when (route.lowercase()) {
                "speaker" -> {
                    audioManager.isSpeakerphoneOn = true
                    audioManager.stopBluetoothSco()
                    audioManager.isBluetoothScoOn = false
                }
                "earpiece" -> {
                    audioManager.isSpeakerphoneOn = false
                    audioManager.stopBluetoothSco()
                    audioManager.isBluetoothScoOn = false
                }
                "bluetooth" -> {
                    audioManager.isSpeakerphoneOn = false
                    audioManager.startBluetoothSco()
                    audioManager.isBluetoothScoOn = true
                }
                else -> {
                    audioManager.isSpeakerphoneOn = true
                }
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AUDIO_ROUTING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getFCMToken(promise: Promise) {
        try {
            com.google.firebase.messaging.FirebaseMessaging.getInstance().token
                .addOnCompleteListener { task ->
                    if (task.isSuccessful && task.result != null) {
                        val token = task.result
                        val prefs = reactContext.getSharedPreferences(TalkyFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
                        prefs.edit().putString(TalkyFirebaseMessagingService.KEY_FCM_TOKEN, token).apply()
                        promise.resolve(token)
                    } else {
                        val prefs = reactContext.getSharedPreferences(TalkyFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
                        val cached = prefs.getString(TalkyFirebaseMessagingService.KEY_FCM_TOKEN, null)
                        promise.resolve(cached)
                    }
                }
        } catch (e: Exception) {
            val prefs = reactContext.getSharedPreferences(TalkyFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
            val cached = prefs.getString(TalkyFirebaseMessagingService.KEY_FCM_TOKEN, null)
            promise.resolve(cached)
        }
    }
}
