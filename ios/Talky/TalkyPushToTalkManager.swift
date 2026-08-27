import Foundation
import AVFoundation
#if canImport(PushToTalk)
import PushToTalk
#endif

@objc(TalkyPushToTalkManager)
public class TalkyPushToTalkManager: NSObject {

    @objc public static let shared = TalkyPushToTalkManager()

    #if canImport(PushToTalk)
    private var channelManager: PTChannelManager?
    #endif

    private var activeChannelUUID: UUID?
    private var isAudioSessionActive = false

    private override init() {
        super.init()
        #if canImport(PushToTalk)
        if #available(iOS 16.0, *) {
            setupChannelManager()
        }
        #endif
    }

    #if canImport(PushToTalk)
    @available(iOS 16.0, *)
    private func setupChannelManager() {
        PTChannelManager.channelManager(delegate: self, restorable: true) { [weak self] result in
            switch result {
            case .success(let manager):
                self?.channelManager = manager
                print("[TalkyPTT] PTChannelManager initialized successfully.")
            case .failure(let error):
                print("[TalkyPTT] Failed to initialize PTChannelManager: \(error.localizedDescription)")
            }
        }
    }
    #endif

    @objc public func configureAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
            )
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            isAudioSessionActive = true
            print("[TalkyPTT] AVAudioSession configured for loudspeaker playAndRecord.")
        } catch {
            print("[TalkyPTT] Error configuring AVAudioSession: \(error.localizedDescription)")
        }
    }

    @objc public func joinChannel(
        pairingId: String,
        channelName: String,
        displayName: String,
        completion: @escaping (Bool, String?) -> Void
    ) {
        #if canImport(PushToTalk)
        if #available(iOS 16.0, *) {
            guard let manager = channelManager else {
                completion(false, "PTChannelManager not initialized")
                return
            }

            let channelUUID = UUID(uuidString: pairingId) ?? UUID()
            self.activeChannelUUID = channelUUID

            let descriptor = PTChannelDescriptor(name: displayName, image: nil)
            manager.requestJoinChannel(channelUUID: channelUUID, descriptor: descriptor)
            configureAudioSession()
            completion(true, nil)
            return
        }
        #endif

        configureAudioSession()
        completion(true, nil)
    }

    @objc public func leaveChannel(pairingId: String, completion: @escaping (Bool, String?) -> Void) {
        #if canImport(PushToTalk)
        if #available(iOS 16.0, *) {
            if let uuid = activeChannelUUID {
                channelManager?.leaveChannel(channelUUID: uuid)
                activeChannelUUID = nil
            }
        }
        #endif
        completion(true, nil)
    }

    @objc public func reportRemoteSpeaker(speakerName: String, isSpeaking: Bool) {
        #if canImport(PushToTalk)
        if #available(iOS 16.0, *) {
            guard let manager = channelManager, let channelUUID = activeChannelUUID else { return }

            if isSpeaking {
                let participant = PTParticipant(name: speakerName, image: nil)
                manager.reportRemoteParticipantJoined(channelUUID: channelUUID, participant: participant)
            } else {
                manager.reportRemoteParticipantLeft(channelUUID: channelUUID, participant: PTParticipant(name: speakerName, image: nil))
            }
        }
        #endif
    }
}

#if canImport(PushToTalk)
@available(iOS 16.0, *)
extension TalkyPushToTalkManager: PTChannelManagerDelegate {

    public func channelManager(
        _ channelManager: PTChannelManager,
        didActivate audioSession: AVAudioSession
    ) {
        print("[TalkyPTT] PTChannelManager activated system audio session.")
        isAudioSessionActive = true
    }

    public func channelManager(
        _ channelManager: PTChannelManager,
        didDeactivate audioSession: AVAudioSession
    ) {
        print("[TalkyPTT] PTChannelManager deactivated system audio session.")
        isAudioSessionActive = false
    }

    public func channelManager(
        _ channelManager: PTChannelManager,
        receivedEphemeralPushToken pushToken: Data
    ) {
        let tokenString = pushToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[TalkyPTT] Received PTT APNs Push Token: \(tokenString)")
        // Broadcast token to React Native layer to register with backend
    }

    public func channelManager(
        _ channelManager: PTChannelManager,
        incomingPushResult: PTPushResult,
        from pushSource: PTPushSource
    ) {
        print("[TalkyPTT] Incoming PTT APNs Push received.")
        configureAudioSession()
    }

    public func channelManager(
        _ channelManager: PTChannelManager,
        channelDescriptor: PTChannelDescriptor,
        activeRemoteParticipantChanged activeRemoteParticipant: PTParticipant?
    ) {
        if let participant = activeRemoteParticipant {
            print("[TalkyPTT] Active remote speaker changed to: \(participant.name)")
        }
    }
}
#endif
