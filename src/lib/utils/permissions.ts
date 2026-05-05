import {
  checkAccessibilityPermission,
  checkMicrophonePermission,
} from "tauri-plugin-macos-permissions-api";

export const verifyAccessibilityPermission = async (): Promise<boolean> => {
  return checkAccessibilityPermission();
};

export const checkMacOSPermissionState = async () => {
  const [accessibilityGranted, microphoneGranted] = await Promise.all([
    verifyAccessibilityPermission(),
    checkMicrophonePermission(),
  ]);

  return {
    accessibilityGranted,
    microphoneGranted,
  };
};
