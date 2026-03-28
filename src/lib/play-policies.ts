export const playPolicies = {
  permissions: {
    url: 'https://developer.android.com/google/play/policies#permissions',
    dangerousPermissions: [
      'android.permission.SEND_SMS',
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_SMS',
      'android.permission.READ_CALL_LOG',
      'android.permission.WRITE_CALL_LOG',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.READ_PHONE_STATE',
    ],
    rules: {
      sms: 'SMS permissions only allowed for default SMS handlers',
      callLog: 'Call log permissions highly restricted',
      location: 'Must provide clear location usage disclosure',
    }
  },
  dataSafety: {
    url: 'https://support.google.com/googleplay/android-developer/answer/10787216',
    requirements: [
      'Disclose all data collected',
      'Explain how data is used',
      'List third-party data sharing',
      'Provide privacy policy URL',
    ]
  },
  ads: {
    url: 'https://developer.android.com/google/play/policies#ads',
    rules: [
      'No deceptive ad implementations',
      'Clear distinction between ads and content',
      'No accidental ad clicks',
      'Proper ad disclosure',
    ]
  },
  monetization: {
    url: 'https://play.google.com/about/developer-payment-policy/',
    rules: [
      'Use Google Play Billing for digital goods',
      'Clear pricing before purchase',
      'Easy refund process',
      'No hidden subscriptions',
    ]
  },
};

export function getPolicyReference(category: string): string {
  const policy = playPolicies[category as keyof typeof playPolicies];
  if (!policy) return playPolicies.permissions.url;
  return policy.url;
}
