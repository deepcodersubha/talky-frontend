#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TalkyPushToTalkBridge, NSObject)

RCT_EXTERN_METHOD(joinPTTChannel:(NSString *)pairingId
                  channelName:(NSString *)channelName
                  displayName:(NSString *)displayName
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(leavePTTChannel:(NSString *)pairingId
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(reportSpeakerState:(NSString *)speakerName
                  isSpeaking:(BOOL)isSpeaking
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(configureAudioSession:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
