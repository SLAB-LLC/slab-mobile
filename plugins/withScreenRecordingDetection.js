/**
 * Config Plugin: withScreenRecordingDetection
 *
 * Adds a native Swift module to the iOS project that emits an `onCapturedChange`
 * event whenever UIScreen.isCaptured changes (screen recording starts or stops).
 * The JS layer uses this to immediately pause audio when recording is detected.
 *
 * Android: FLAG_SECURE (applied by expo-screen-capture) blanks the screen in
 * MediaProjection-based recorders and provides the primary protection.
 *
 * Uses withXcodeProject (a safe mod) instead of withDangerousMod to avoid
 * permissions issues in the EAS build environment.
 */

const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const SWIFT_MODULE = `import ExpoModulesCore
import UIKit

public class ScreenRecordingDetectorModule: Module {
  private var captureObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ScreenRecordingDetector")

    Events("onCapturedChange")

    OnCreate {
      captureObserver = NotificationCenter.default.addObserver(
        forName: UIScreen.capturedDidChangeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        guard let self = self else { return }
        self.sendEvent("onCapturedChange", [
          "isCaptured": UIScreen.main.isCaptured
        ])
      }
    }

    OnDestroy {
      if let obs = captureObserver {
        NotificationCenter.default.removeObserver(obs)
      }
    }

    AsyncFunction("isCaptured") { () -> Bool in
      return UIScreen.main.isCaptured
    }
  }
}
`;

module.exports = function withScreenRecordingDetection(config) {
  return withXcodeProject(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const projectName = config.modRequest.projectName;
    const iosDir = path.join(projectRoot, 'ios');
    const targetDir = path.join(iosDir, projectName);
    const fileName = 'ScreenRecordingDetectorModule.swift';
    const filePath = path.join(targetDir, fileName);

    // Write the Swift file into the app target directory.
    // ExpoModulesProvider.swift auto-discovers all Module subclasses in the
    // main app target, so no manual registration is needed.
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(filePath, SWIFT_MODULE);

    // Add the file to the Xcode project if it isn't there already.
    const xcodeProject = config.modResults;
    if (!xcodeProject.hasFile(`${projectName}/${fileName}`)) {
      const target = xcodeProject.getFirstTarget();
      xcodeProject.addSourceFile(
        `${projectName}/${fileName}`,
        { target: target.uuid },
        xcodeProject.getFirstTarget().uuid
      );
    }

    return config;
  });
};
