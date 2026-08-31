package com.talky.ptt

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class TalkyForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "talky_live_ptt_channel"
        const val NOTIFICATION_ID = 9001
        const val ACTION_START = "ACTION_START_FOREGROUND"
        const val ACTION_STOP = "ACTION_STOP_FOREGROUND"
    }

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopForegroundService()
            return START_NOT_STICKY
        }

        val notification = buildNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val serviceType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            } else {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            }
            startForeground(NOTIFICATION_ID, notification, serviceType)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        return START_STICKY
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Talky Live PTT Active")
            .setContentText("Connected to your paired partner. Audio active in background.")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Talky Walkie-Talkie Live Voice",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Keeps voice and push-to-talk audio active in the background"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "Talky::LivePTTWakeLock"
            )?.apply {
                setReferenceCounted(false)
                acquire()
            }
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
            }
        }
        wakeLock = null
    }

    private fun stopForegroundService() {
        releaseWakeLock()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    override fun onDestroy() {
        releaseWakeLock()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
