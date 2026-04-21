/**
 * Config Plugin: withScreenRecordingDetection
 *
 * Adds a native Swift module to the iOS project that emits an `onCapturedChange`
 * event whenever UIScreen.isCaptured changes (screen recording starts or stops).
 * The JS layer uses this to immediately pause audio when recording is detected.
 *
 * Android: FLAG_SECURE (applied by expo-screen-capture) blanks the screen in
 * MediaProjection-based recorders and provides the primary protection.
 */

const { withDangerousMod } = require('@expo/config-plugins');
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
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const projectName = config.modRequest.projectName;
      const iosDir = path.join(projectRoot, 'ios');
      const targetDir = path.join(iosDir, projectName);
      const fileName = 'ScreenRecordingDetectorModule.swift';
      const filePath = path.join(targetDir, fileName);

      fs.writeFileSync(filePath, SWIFT_MODULE);

      const pbxprojPath = path.join(
        iosDir,
        `${projectName}.xcodeproj`,
        'project.pbxproj'
      );
      const pbxContents = fs.readFileSync(pbxprojPath, 'utf8');

      if (!pbxContents.includes(fileName)) {
        const xcode = require('xcode');
        const project = xcode.project(pbxprojPath);
        project.parseSync();

        const target = project.getFirstTarget();
        project.addSourceFile(
          `${projectName}/${fileName}`,
          { target: target.uuid }
        );

        fs.writeFileSync(pbxprojPath, project.writeSync());
      }

      return config;
    },
  ]);
};
