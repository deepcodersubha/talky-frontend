package com.talky.ptt

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class TalkyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "TalkyFCM"
        const val PREFS_NAME = "talky_fcm_prefs"
        const val KEY_FCM_TOKEN = "fcm_push_token"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM Registration Token: $token")
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_FCM_TOKEN, token).apply()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "FCM Message received from: ${remoteMessage.from}")

        val data = remoteMessage.data
        if (data.isNotEmpty()) {
            val type = data["type"]
            val speakerName = data["speakerDisplayName"] ?: "Friend"
            val pairingId = data["pairingId"]
            val channelName = data["agoraChannelName"]

            Log.d(TAG, "PTT Alert Data: type=$type, speaker=$speakerName, pairing=$pairingId, channel=$channelName")

            if (type == "ptt_started") {
                // Wake up device and start foreground service with audio stream
                val serviceIntent = Intent(applicationContext, TalkyForegroundService::class.java).apply {
                    action = TalkyForegroundService.ACTION_START
                    putExtra("speakerName", speakerName)
                    putExtra("pairingId", pairingId)
                    putExtra("channelName", channelName)
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    applicationContext.startForegroundService(serviceIntent)
                } else {
                    applicationContext.startService(serviceIntent)
                }
            }
        }
    }
}
