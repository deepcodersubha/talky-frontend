import Foundation
import React

@objc(TalkyPushToTalkBridge)
public class TalkyPushToTalkBridge: NSObject {

    @objc public static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc(joinPTTChannel:channelName:displayName:resolver:rejecter:)
    public func joinPTTChannel(
        pairingId: String,
        channelName: String,
        displayName: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        TalkyPushToTalkManager.shared.joinChannel(
            pairingId: pairingId,
            channelName: channelName,
            displayName: displayName
        ) { success, error in
            if success {
                resolver(true)
            } else {
                rejecter("JOIN_PTT_ERROR", error ?? "Failed to join PTT channel", nil)
            }
        }
    }

    @objc(leavePTTChannel:resolver:rejecter:)
    public func leavePTTChannel(
        pairingId: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        TalkyPushToTalkManager.shared.leaveChannel(pairingId: pairingId) { success, error in
            if success {
                resolver(true)
            } else {
                rejecter("LEAVE_PTT_ERROR", error ?? "Failed to leave PTT channel", nil)
            }
        }
    }

    @objc(reportSpeakerState:isSpeaking:resolver:rejecter:)
    public func reportSpeakerState(
        speakerName: String,
        isSpeaking: Bool,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        TalkyPushToTalkManager.shared.reportRemoteSpeaker(speakerName: speakerName, isSpeaking: isSpeaking)
        resolver(true)
    }

    @objc(configureAudioSession:rejecter:)
    public func configureAudioSession(
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        TalkyPushToTalkManager.shared.configureAudioSession()
        resolver(true)
    }
}
